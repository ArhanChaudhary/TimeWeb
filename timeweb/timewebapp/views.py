# THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED

# Abstractions
from django.shortcuts import get_object_or_404, redirect
from django.utils.translation import ugettext as _
from django.urls import reverse
from django.http import HttpResponse
from django.contrib.auth import logout, login
from django.forms import ValidationError
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils import timezone
import datetime
from math import ceil, floor
from decimal import Decimal

# App stuff
from django.conf import settings
from common.views import User, TimewebGenericView
from .models import TimewebModel
from navbar.models import SettingsModel
from .forms import TimewebForm
from navbar.forms import SettingsForm

# Signals
from django.db.models.signals import post_save
from django.dispatch import receiver

# Formatting
from django.forms.models import model_to_dict
from django.utils.text import Truncator
import json

# Google API
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.errors import HttpError
from oauthlib.oauth2.rfc6749.errors import OAuth2Error

# Misc
from common.utils import logger, days_between_two_dates, utc_to_local

@receiver(post_save, sender=User)
def create_settings_model_and_example(sender, instance, created, **kwargs):
    if created:
        # The front end adjusts the assignment and due date, so we don't need to worry about using utc_to_local instead of localtime
        date_now = timezone.localtime(timezone.now())
        date_now = date_now.replace(hour=0, minute=0, second=0, microsecond=0)
        TimewebModel.objects.create(**settings.EXAMPLE_ASSIGNMENT_JSON | {
            "assignment_date": date_now,
            "x": date_now + datetime.timedelta(settings.EXAMPLE_ASSIGNMENT_JSON["x"]),
            "user": instance,
        })
        SettingsModel.objects.create(user=instance)
        logger.info(f'Created settings model for user "{instance.username}"')
        if settings.DEBUG:
            instance.is_staff = True
            from django.contrib.auth.models import Permission
            permissions = Permission.objects.all()
            for permission in permissions:
                instance.user_permissions.add(permission)
            instance.save()

class TimewebView(LoginRequiredMixin, TimewebGenericView):
    template_name = 'timewebapp/app.html'

    def add_user_models_to_context(self, request):
        self.context['assignment_models'] = request.user.timewebmodel_set.all()
        self.context['settings_model'] = request.user.settingsmodel
        self.context['assignment_models_as_json'] = list(request.user.timewebmodel_set.all().values())
        self.context['settings_model_as_json'] = model_to_dict(request.user.settingsmodel)

        del self.context['settings_model_as_json']['background_image'] # background_image isnt json serializable
        self.context['settings_model_as_json']['timezone'] = str(self.context['settings_model_as_json']['timezone'] or '') # timezone isnt json serializable

        if not request.user.settingsmodel.seen_latest_changelog:
            self.context['latest_changelog'] = settings.CHANGELOGS[0]

        if not request.session.get("already_created_gc_assignments_from_frontend", False):
            self.context['creating_gc_assignments_from_frontend'] = 'token' in request.user.settingsmodel.oauth_token
        else:
            del request.session["already_created_gc_assignments_from_frontend"]

    def get(self, request):        
        utc_now = timezone.now()
        local_now = utc_to_local(request, utc_now)
        local_last_login = utc_to_local(request, request.user.last_login)
        if local_last_login.day != local_now.day:
            # Only notify if the date has changed until 4 AM the next day after the last login
            if local_now.hour < 4 and local_now.day - local_last_login.day == 1:
                self.context['NOTIFY_DATE_CHANGED'] = True
            for assignment in request.user.timewebmodel_set.all():
                if assignment.mark_as_done:
                    assignment.mark_as_done = False
            TimewebModel.objects.bulk_update(request.user.timewebmodel_set.all(), ['mark_as_done'])
        request.user.last_login = utc_now
        request.user.save()
        self.add_user_models_to_context(request)
        self.context['form'] = TimewebForm(None)
        self.context['settings_form'] = SettingsForm({
            'assignment_sorting': request.user.settingsmodel.assignment_sorting,
        })

        # adds "#animate-in" or "#animate-color" to the assignment whose form was submitted
        if request.session.get("just_created_assignment_id"):
            self.context['just_created_assignment_id'] = request.session.get("just_created_assignment_id")
            del request.session["just_created_assignment_id"]
        elif request.session.get("just_updated_assignment_id"):
            self.context['just_updated_assignment_id'] = request.session.get("just_updated_assignment_id")
            del request.session["just_updated_assignment_id"]

        if request.session.get("gc-api-init-failed", False):
            del request.session["gc-api-init-failed"]
            self.context["GC_API_INIT_FAILED"] = True
        logger.info(f'User \"{request.user}\" is now viewing the home page')
        return super().get(request)

    def post(self, request):
        if 'submit-button' in request.POST: return self.assignment_form_submitted(request)
        # AJAX requests
        if request.isExampleAccount and not settings.EDITING_EXAMPLE_ACCOUNT: return HttpResponse(status=204)

        action = request.POST['action']
        if action == 'delete_assignment':
            return self.deleted_assignment(request)
        elif action == 'save_assignment':
            return self.saved_assignment(request)
        elif action == 'change_setting':
            return self.change_setting(request)
        elif action == 'create_gc_assignments':
            if 'token' in request.user.settingsmodel.oauth_token:
                return self.create_gc_assignments(request)
            else:
                return HttpResponse(status=401)
        elif action == "tag_add" or action == "tag_delete":
            return self.tag_add_or_delete(request, action)
        return HttpResponse("Method not found.", status=404)

    def assignment_form_submitted(self, request):
        # The frontend adds the assignment's pk as the "value" attribute to the submit button
        self.pk = request.POST['submit-button']
        if self.pk == '':
            self.pk = None
            self.created_assignment = True
            self.updated_assignment = False
        else:
            self.created_assignment = False
            self.updated_assignment = True
        
        # for parsing due times in forms.py
        _mutable = request.POST._mutable
        request.POST._mutable = True
        self.form = TimewebForm(data=request.POST, files=request.FILES)
        request.POST._mutable = _mutable

        # Parts of the form that can only validate in views
        form_is_valid = True
        if request.isExampleAccount and not settings.EDITING_EXAMPLE_ACCOUNT:
            self.form.add_error("name", ValidationError(_("You can't %(create_or_edit)s assignments in the example account") % {'create_or_edit': 'create' if self.created_assignment else 'edit'}))
            form_is_valid = False
        elif self.created_assignment and request.user.timewebmodel_set.all().count() > settings.MAX_NUMBER_ASSIGNMENTS:
            self.form.add_error("name", ValidationError(_('You have too many assignments (>%(amount)d assignments)') % {'amount': settings.MAX_NUMBER_ASSIGNMENTS}))
            form_is_valid = False
        if not self.form.is_valid():
            form_is_valid = False

        if form_is_valid:
            return self.valid_form(request)
        else:
            return self.invalid_form(request)

    def valid_form(self, request):
        if self.created_assignment:
            self.sm = self.form.save(commit=False)
            if not self.sm.unit:
                self.sm.unit = "Minute"
            # Set defaults
            self.sm.skew_ratio = request.user.settingsmodel.def_skew_ratio
            # first_work is works[0]
            # Convert this to a decimal object because it can be a float
            first_work = Decimal(str(self.sm.works))
            self.sm.user = request.user
        elif self.updated_assignment:
            self.sm = get_object_or_404(TimewebModel, pk=self.pk)
            if request.user != self.sm.user:
                logger.warning(f"User \"{request.user}\" can't edit an assignment that isn't their's")
                return HttpResponse(status=404)
                
            # old_data is needed for readjustments
            old_data = get_object_or_404(TimewebModel, pk=self.pk)

            self.sm.name = self.form.cleaned_data.get("name")
            self.sm.assignment_date = self.form.cleaned_data.get("assignment_date")
            if self.sm.assignment_date:
                self.sm.assignment_date = self.sm.assignment_date.replace(hour=0, minute=0, second=0, microsecond=0)
            self.sm.x = self.form.cleaned_data.get("x")
            if self.sm.x:
                self.sm.x = self.sm.x.replace(hour=0, minute=0, second=0, microsecond=0)
            self.sm.due_time = self.form.cleaned_data.get("due_time")
            self.sm.soft = self.form.cleaned_data.get("soft")
            self.sm.unit = self.form.cleaned_data.get("unit") or "Minute"
            self.sm.y = self.form.cleaned_data.get("y")
            first_work = Decimal(str(self.form.cleaned_data.get("works") or 0))
            self.sm.time_per_unit = self.form.cleaned_data.get("time_per_unit")
            self.sm.description = self.form.cleaned_data.get("description")
            self.sm.funct_round = self.form.cleaned_data.get("funct_round")
            self.sm.min_work_time = self.form.cleaned_data.get("min_work_time")
            self.sm.break_days = self.form.cleaned_data.get("break_days")
        if not self.sm.assignment_date or not self.sm.unit or not self.sm.y or not self.sm.time_per_unit or not self.sm.funct_round:
            # Works might become an int instead of a list but it doesnt really matter since it isnt being used
            # However, the form doesn't repopulate on edit assignment because it calls works[0]. So, make works a list
            self.sm.works = [str(first_work)]
            self.sm.needs_more_info = True
        else:
            date_now = utc_to_local(request, timezone.now())
            date_now = date_now.replace(hour=0, minute=0, second=0, microsecond=0)
            if settings.EDITING_EXAMPLE_ACCOUNT:
                # Example account date (for below logic purposes)
                original_date_now = date_now
                date_now = utc_to_local(request, datetime.datetime(2021, 5, 3).replace(tzinfo=timezone.utc))
                self.sm.assignment_date -= original_date_now - date_now
                self.sm.x -= original_date_now - date_now
            if self.created_assignment or self.sm.needs_more_info:
                self.sm.blue_line_start = days_between_two_dates(date_now, self.sm.assignment_date)
                if self.sm.blue_line_start < 0 or settings.EDITING_EXAMPLE_ACCOUNT:
                    self.sm.blue_line_start = 0
                self.sm.dynamic_start = self.sm.blue_line_start
            else:
                self.sm.blue_line_start = old_data.blue_line_start + days_between_two_dates(old_data.assignment_date, self.sm.assignment_date)
                if date_now < old_data.assignment_date or self.sm.blue_line_start < 0 or settings.EDITING_EXAMPLE_ACCOUNT:
                    self.sm.blue_line_start = 0
                removed_works_start = days_between_two_dates(self.sm.assignment_date, old_data.assignment_date) - old_data.blue_line_start # translates x position 0 so that it can be used to accessing works
                if removed_works_start < 0:
                    removed_works_start = 0

            if self.sm.x == None:
                # ctime * (y - new_first_work) = min_work_time_funct_round * x
                # x = ctime * (y - new_first_work) / min_work_time_funct_round
                # Solve for new_first_work:
                # reference: works = [old_data.works[n] - old_data.works[0] + first_work for n in range(removed_works_start,removed_works_end+1)]
                # new_first_work is when n = removed_works_start
                # new_first_work = old_data.works[removed_works_start] - old_data.works[0] + first_work
                min_work_time_funct_round = ceil(self.sm.min_work_time / self.sm.funct_round) * self.sm.funct_round if self.sm.min_work_time else self.sm.funct_round
                if self.created_assignment or self.sm.needs_more_info:
                    new_first_work = first_work
                elif self.updated_assignment:
                    new_first_work = Decimal(old_data.works[removed_works_start]) - Decimal(old_data.works[0]) + first_work
                x_num = ceil(self.sm.time_per_unit * (self.sm.y - new_first_work) / min_work_time_funct_round)
                if self.sm.blue_line_start >= x_num:
                    self.sm.blue_line_start = 0
                    # dynamic_start is capped later on if not created_assignment (i think that's why i did this)
                    # might rewrite
                    if self.created_assignment or self.sm.needs_more_info:
                        self.sm.dynamic_start = 0
                if not x_num or len(self.sm.break_days) == 7:
                    x_num = 1
                elif self.sm.break_days:
                    guess_x = 7*floor(x_num/(7-len(self.sm.break_days)) - 1) - 1
                    assign_day_of_week = self.sm.assignment_date.weekday()
                    red_line_start_x = self.sm.blue_line_start

                    # Terrible implementation of inversing calcModDays
                    xday = assign_day_of_week + red_line_start_x
                    mods = [0]
                    mod_counter = 0
                    for mod_day in range(6):
                        if (xday + mod_day) % 7 in self.sm.break_days:
                            mod_counter += 1
                        mods.append(mod_counter)
                    mods = tuple(mods)

                    while 1:
                        guess_x += 1
                        if guess_x - guess_x // 7 * len(self.sm.break_days) - mods[guess_x % 7] == x_num:
                            x_num = max(1, guess_x)
                            break
                # Make sure assignments arent finished by x_num
                # x_num = date_now+timedelta(x_num) - min(date_now, self.sm.assignment_date)
                if self.sm.assignment_date < date_now:
                    # x_num = (date_now + timedelta(x_num) - self.sm.assignment_date).days
                    # x_num = (date_now - self.sm.assignment_date).days + x_num
                    # x_num += (date_now - self.sm.assignment_date).days
                    x_num += days_between_two_dates(date_now, self.sm.assignment_date)
                try:
                    self.sm.x = self.sm.assignment_date + datetime.timedelta(x_num)
                except OverflowError:
                    self.sm.x = datetime.datetime.max - datetime.timedelta(10) # -10 to prevent overflow errors
                    self.sm.x = self.sm.x.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
                if self.sm.due_time and (self.sm.due_time.hour or self.sm.due_time.minute):
                    x_num += 1
            else:
                x_num = days_between_two_dates(self.sm.x, self.sm.assignment_date)
                if self.sm.due_time and (self.sm.due_time.hour or self.sm.due_time.minute):
                    x_num += 1
                if self.sm.blue_line_start >= x_num:
                    self.sm.blue_line_start = 0
                    if self.created_assignment or self.sm.needs_more_info:
                        self.sm.dynamic_start = 0
            if self.sm.needs_more_info or self.created_assignment:
                self.sm.works = [str(first_work)]
            elif self.updated_assignment:
                # If the edited assign date cuts off some of the work inputs, adjust the work inputs accordingly
                removed_works_end = len(old_data.works) - 1
                old_x_num = days_between_two_dates(self.sm.x, old_data.assignment_date)
                if self.sm.due_time and (self.sm.due_time.hour or self.sm.due_time.minute):
                    old_x_num += 1
                end_of_works = old_x_num - self.sm.blue_line_start

                # If the edited due date cuts off some of the work inputs
                if removed_works_end > end_of_works:
                    removed_works_end = end_of_works
                if removed_works_start <= removed_works_end:
                    works_displacement = Decimal(old_data.works[0]) - first_work
                    self.sm.works = [str(Decimal(old_data.works[n]) - works_displacement) for n in range(removed_works_start,removed_works_end+1)]
                else:
                    # If the assignment or due date cuts off every work input
                    self.sm.works = [str(first_work)]
                
                self.sm.dynamic_start += self.sm.blue_line_start - old_data.blue_line_start
                if self.sm.dynamic_start < 0:
                    self.sm.dynamic_start = 0
                elif self.sm.dynamic_start > x_num - 1:
                    self.sm.dynamic_start = x_num - 1
            self.sm.needs_more_info = False

        # This could be too annoying; don't do this

        # # Reset skew ratio if the red line x axis (x - (blue_line_start + leN_works)) or y axis (y - red_line_start_y)
        # # dynamic_start, blue_line_start (both from red_line_start_y), x, works, or y needs to be different
        # if (self.updated_assignment and (
        #         old_data.x != self.sm.x or 
        #         old_data.y != self.sm.y or 
        #         old_data.works != self.sm.works or
        #         old_data.blue_line_start != self.sm.blue_line_start or 
        #         old_data.dynamic_start != self.sm.dynamic_start
        # )):
        #     self.sm.skew_ratio = request.user.settingsmodel.def_skew_ratio

        self.sm.save()
        if self.created_assignment:
            logger.info(f'User \"{request.user}\" created assignment "{self.sm.name}"')
            request.session["just_created_assignment_id"] = self.sm.pk
        elif self.updated_assignment:
            logger.info(f'User \"{request.user}\" updated assignment "{self.sm.name}"')
            request.session['just_updated_assignment_id'] = self.sm.pk
        return redirect(request.path_info)
        
    def invalid_form(self, request):
        logger.info(f"User \"{request.user}\" submitted an invalid form")
        if self.created_assignment:
            self.context['submit'] = 'Create Assignment'
        elif self.updated_assignment:
            self.context['invalid_form_pk'] = self.pk
            self.context['submit'] = 'Edit Assignment'
        self.context['form'] = self.form
        self.add_user_models_to_context(request)
        return super().get(request)
 
    def create_gc_assignments(self, request):
        # The file token.json stores the user's access and refresh tokens, and is
        # created automatically when the authorization flow completes for the first
        # time.
        credentials = Credentials.from_authorized_user_info(request.user.settingsmodel.oauth_token, settings.GC_SCOPES)
        # If there are no valid credentials available, let the user log in.
        if not credentials.valid:
            if credentials.expired and credentials.refresh_token:
                # Errors can happen in refresh because of network or any other miscellaneous issues. Don't except these exceptions so they can be logged
                credentials.refresh(Request())
                request.user.settingsmodel.oauth_token.update(json.loads(credentials.to_json()))
                request.user.settingsmodel.save()
            else:
                flow = Flow.from_client_secrets_file(
                    settings.GC_CREDENTIALS_PATH, scopes=settings.GC_SCOPES)
                flow.redirect_uri = settings.GC_REDIRECT_URI
                # Generate URL for request to Google's OAuth 2.0 server.
                # Use kwargs to set optional request parameters.
                authorization_url, state = flow.authorization_url(
                    # Enable offline access so that you can refresh an access token without
                    # re-prompting the user for permission. Recommended for web server apps.
                    access_type='offline',
                    # Enable incremental authorization. Recommended as a best practice.
                    include_granted_scopes='true')
                return HttpResponse(authorization_url)

        date_now = utc_to_local(request, timezone.now())
        date_now = date_now.replace(hour=0, minute=0, second=0, microsecond=0)
        service = build('classroom', 'v1', credentials=credentials)

        def add_gc_assignments_from_response(response_id, course_coursework, exception):
            if type(exception) is HttpError: # HttpError for permission denied (ex if you're the teacher of a class)
                logger.warn(exception)
                return
            if not course_coursework:
                return
            course_coursework = course_coursework['courseWork']
            for assignment in course_coursework:

                # Load and interpret json data
                assignment_id = int(assignment['id'], 10)
                assignment_date = assignment.get('scheduledTime', assignment['creationTime'])
                try:
                    assignment_date = datetime.datetime.strptime(assignment_date,'%Y-%m-%dT%H:%M:%S.%fZ')
                except ValueError:
                    assignment_date = datetime.datetime.strptime(assignment_date,'%Y-%m-%dT%H:%M:%SZ')
                assignment_date = utc_to_local(request, assignment_date.replace(tzinfo=timezone.utc))
                assignment_date = assignment_date.replace(hour=0, minute=0, second=0, microsecond=0)
                x = assignment.get('dueDate', None)
                tags = []
                if x:
                    if "hours" in assignment['dueTime']:
                        assignment['dueTime']['hour'] = assignment['dueTime'].pop('hours')
                    if "minutes" in assignment['dueTime']:
                        assignment['dueTime']['minute'] = assignment['dueTime'].pop('minutes')
                    x = utc_to_local(request, datetime.datetime(**x, **assignment['dueTime']).replace(tzinfo=timezone.utc))
                    if x < date_now:
                        continue

                    due_time = datetime.time(x.hour, x.minute)
                    x = x.replace(hour=0, minute=0, second=0, microsecond=0)
                        
                    if assignment_date >= x:
                        continue
                    if date_now == x:
                        tags.append("Important")
                else:
                    if days_between_two_dates(date_now, assignment_date) > 60:
                        continue
                    due_time = None
                name = Truncator(assignment['title']).chars(TimewebModel.name.field.max_length).strip()
                tags.insert(0, course_names[assignment['courseId']])
                description = assignment.get('description', "")

                # Have this below everything else to not include assignments with due dates before today in new_gc_assignment_ids (x < date_now)
                new_gc_assignment_ids.add(assignment_id)
                if assignment_id in set_added_gc_assignment_ids:
                    continue

                # Create assignment
                blue_line_start = days_between_two_dates(date_now, assignment_date)
                if blue_line_start < 0:
                    blue_line_start = 0
                dynamic_start = blue_line_start
                user = request.user
                gc_models_to_create.append(TimewebModel(
                    name=name,
                    assignment_date=assignment_date,
                    x=x,
                    due_time=due_time,
                    blue_line_start=blue_line_start,
                    skew_ratio=request.user.settingsmodel.def_skew_ratio,
                    min_work_time=request.user.settingsmodel.def_min_work_time,
                    break_days=request.user.settingsmodel.def_break_days,
                    dynamic_start=dynamic_start,
                    funct_round=1,
                    description=description,
                    tags=tags,
                    needs_more_info=True,
                    is_google_classroom_assignment=True,
                    user=user,

                    unit="Minute"
                    # y, time_per_unit, and unit are missing
                ))
        # .execute() rarely leads to 503s which I expect may have been from a temporary outage
        courses = service.courses().list().execute().get('courses', [])
        coursework_lazy = service.courses().courseWork()
        batch = service.new_batch_http_request(callback=add_gc_assignments_from_response)

        course_names = {}
        for course in courses:
            if course['courseState'] == "ARCHIVED":
                continue
            course_names[course['id']] = course['name']
            batch.add(coursework_lazy.list(courseId=course['id']))
        # Make "in" faster
        set_added_gc_assignment_ids = set(request.user.settingsmodel.added_gc_assignment_ids)
        # Rebuild added_gc_assignment_ids because assignments may have been added or deleted
        new_gc_assignment_ids = set()
        gc_models_to_create = []
        batch.execute()
        TimewebModel.objects.bulk_create(gc_models_to_create)
        if not gc_models_to_create: return HttpResponse(status=204) # or do new_gc_assignment_ids == set_added_gc_assignment_ids
        request.user.settingsmodel.added_gc_assignment_ids = list(new_gc_assignment_ids)
        request.user.settingsmodel.save()

        request.session["already_created_gc_assignments_from_frontend"] = True
        return HttpResponse(status=205)

    def deleted_assignment(self, request):
        assignments = request.POST.getlist('assignments[]')
        TimewebModel.objects.filter(pk__in=assignments, user=request.user).delete()
        logger.info(f'User \"{request.user}\" deleted {len(assignments)} assignments')
        return HttpResponse(status=204)
        
    def saved_assignment(self, request):
        assignments = json.loads(request.POST['assignments'])
        for assignment in assignments:
            self.sm = get_object_or_404(TimewebModel, pk=assignment['pk'])
            del assignment['pk']
            
            if request.user != self.sm.user:
                logger.warning(f"User \"{request.user}\" can't save an assignment that isn't theirs")
                return HttpResponse(status=404)

            for key, value in assignment.items():
                if key == "x":
                    # Useful reference https://blog.ganssle.io/articles/2019/11/utcnow.html
                    assignment[key] = datetime.datetime.fromtimestamp(value, timezone.utc)
                elif key == "due_time":
                    assignment[key] = datetime.time(**value)
            
            model_fields = {i.name: getattr(self.sm, i.name) for i in TimewebModel._meta.get_fields() if not i.unique}
            model_fields.update(assignment)
            validation_form = TimewebForm(model_fields)
            if not validation_form.is_valid():
                assignment = {field: value for (field, value) in assignment.items() if field not in validation_form.errors}
                if not assignment: continue # It's pointless to finish the loop

            for key, value in assignment.items():
                setattr(self.sm, key, value)
            try:
                self.sm.save()
            except NameError: # Forgot why I put this here
                pass
        return HttpResponse(status=204)

    def change_setting(self, request):
        setting = request.POST['setting']
        value = json.loads(request.POST['value'])

        model_fields = {i.name: getattr(request.user.settingsmodel, i.name) for i in SettingsModel._meta.get_fields() if not i.unique}
        if setting not in model_fields:
            logger.warning(f"User \"{request.user}\" tried to change a setting that doesn't exist")
            return HttpResponse(f"The setting \"{setting}\" doesn't exist.", status=404)
            
        model_fields[setting] = value
        validation_form = SettingsForm(model_fields)
        if not validation_form.is_valid(): 
            logger.warn(f"User \"{request.user}\" tried to change setting {setting} to an invalid value of {value}")
            return HttpResponse(f"The setting \"{setting}\"'s value of {value} is invalid.", status=405)

        setattr(request.user.settingsmodel, setting, value)
        request.user.settingsmodel.save()
        return HttpResponse(status=204)

    def tag_add_or_delete(self, request, action):
        self.pk = request.POST['pk']
        self.sm = get_object_or_404(TimewebModel, pk=self.pk)

        if request.user != self.sm.user:
            logger.warning(f"User \"{request.user}\" can't save an assignment that isn't theirs")
            return HttpResponse(status=404)

        tag_names = request.POST.getlist('tag_names[]')
        if action == "tag_add":
            tag_names = [tag_name for tag_name in tag_names if tag_name not in self.sm.tags]
            if len(self.sm.tags) + len(tag_names) > settings.MAX_NUMBER_OF_TAGS: return HttpResponse("Too Many Tags!", status=405)
            self.sm.tags.extend(tag_names)

        elif action == "tag_delete":
            # Remove tag_names from self.sm.tags
            self.sm.tags = [tag_name for tag_name in self.sm.tags if tag_name not in tag_names]

        self.sm.save()
        if action == "tag_add":
            logger.info(f"User \"{request.user}\" added tags \"{tag_names}\" to \"{self.sm.name}\"")
        elif action == "tag_delete":
            logger.info(f"User \"{request.user}\" deleted tags \"{tag_names}\" from \"{self.sm.name}\"")
        return HttpResponse(status=204)

    # Unused but I'll keep it here just in case

    # def tag_update(self, request):
    #     old_tag_name = request.POST['old_tag_namestrip()
    #     new_tag_name = request.POST['new_tag_name'].strip()
    #     assignment_models = request.user.timewebmodel_set.all()
    #     for assignment in assignment_models:
    #         if new_tag_name in (assignment.tags or []):
    #             return HttpResponse("alreadyExists")
    #     for assignment in assignment_models:
    #         for i, tag in enumerate(assignment.tags or []):
    #             if tag == old_tag_name:
    #                 assignment.tags[i] = new_tag_name
    #                 assignment.save()
    #                 break
    #     logger.info(f"User \"{request.user}\" updated tag \"{old_tag_name}\" to \"{new_tag_name}\"")
    #     return HttpResponse(status=204)

class GCOAuthView(LoginRequiredMixin, TimewebGenericView):

    def get(self, request):
        if request.isExampleAccount: return redirect("home")
        # Callback URI
        state = request.GET.get('state', None)

        flow = Flow.from_client_secrets_file(
            settings.GC_CREDENTIALS_PATH,
            scopes=settings.GC_SCOPES,
            state=state)
        flow.redirect_uri = settings.GC_REDIRECT_URI

        # get the full URL that we are on, including all the "?param1=token&param2=key" parameters that google has sent us
        authorization_response = request.build_absolute_uri()        
        try:
            # turn those parameters into a token
            flow.fetch_token(authorization_response=authorization_response)
            # Ensure the user enabled both scopes
            service = build('classroom', 'v1', credentials=flow.credentials)
            service.courses().list().execute()
            service.courses().courseWork().list(courseId="easter egg!").execute()
        except (HttpError, OAuth2Error) as e:
            # If the error is an OAuth2Error, the init failed
            # If the error is an HttpError and the access code is 403, the init failed
            # If the error is an HttpError and the access code is 404, the init succeeded, as the course work execute line provides a dunder id so it can execute
            if not isinstance(e, HttpError) or e.resp.status == 403:
                # In case users deny a permission or don't input a code in the url or cancel
                request.session['gc-api-init-failed'] = True
                return redirect(reverse("home"))
        credentials = flow.credentials
        # Use .update() (dict method) instead of = so the refresh token isnt overwritten
        request.user.settingsmodel.oauth_token.update(json.loads(credentials.to_json()))
        request.user.settingsmodel.save()
        logger.info(f"User {request.user} enabled google classroom API")
        return redirect("home")

    def post(self, request):
        if request.isExampleAccount: return HttpResponse(status=204)
        # request.user.settingsmodel.oauth_token stores the user's access and refresh tokens
        if 'token' in request.user.settingsmodel.oauth_token:
            request.user.settingsmodel.oauth_token = {"refresh_token": request.user.settingsmodel.oauth_token['refresh_token']}
            if settings.DEBUG:
                # Re-add gc assignments in debug
                request.user.settingsmodel.added_gc_assignment_ids = []
            request.user.settingsmodel.save()
            logger.info(f"User {request.user} disabled google classroom API")
            return HttpResponse("Disabled gc api")
        flow = Flow.from_client_secrets_file(
            settings.GC_CREDENTIALS_PATH, scopes=settings.GC_SCOPES)
        flow.redirect_uri = settings.GC_REDIRECT_URI
        # Generate URL for request to Google's OAuth 2.0 server.
        # Use kwargs to set optional request parameters.
        authorization_url, state = flow.authorization_url(
            approval_prompt='force',
            # Enable offline access so that you can refresh an access token without
            # re-prompting the user for permission. Recommended for web server apps.
            access_type='offline',
            # Enable incremental authorization. Recommended as a best practice.
            include_granted_scopes='true')
        return HttpResponse(authorization_url)
        # For reference:
        # If modifying these scopes, delete the file token.json.
        # SCOPES = ['https://www.googleapis.com/auth/classroom.student-submissions.me.readonly', 'https://www.googleapis.com/auth/classroom.courses.readonly']

        # creds = None
        # # The file token.json stores the user's access and refresh tokens, and is
        # # created automatically when the authorization flow completes for the first
        # # time.
        # if os.path.exists('token.json'):
        #     creds = Credentials.from_authorized_user_file('token.json', SCOPES)
        # # If there are no (valid) credentials available, let the user log in.
        # if not creds or not creds.valid:
        #     if creds and creds.expired and creds.refresh_token:
        #         creds.refresh(Request())
        #     else:
        #         flow = InstalledAppFlow.from_client_secrets_file(
        #             'gc_api_credentials.json', SCOPES)
        #         creds = flow.run_local_server(port=0)
        #     # Save the credentials for the next run
        #     with open('token.json', 'w') as token:
        #         token.write(creds.to_json())

        # service = build('classroom', 'v1', credentials=creds)
        # courses = service.courses().list().execute().get('courses', [])
        # coursework = service.courses().courseWork()
        # for course in courses:
        #     try:
        #         course_coursework = coursework.list(courseId=course['id']).execute()['courseWork']
        #     except HttpError:
        #         pass

EXAMPLE_ACCOUNT_MODEL = User.objects.get(email=settings.EXAMPLE_ACCOUNT_EMAIL)
class ExampleAccountView(TimewebView):
    def get(self, request):
        logout(request)
        login(request, EXAMPLE_ACCOUNT_MODEL, 'allauth.account.auth_backends.AuthenticationBackend')
        return redirect("home") # PRG
