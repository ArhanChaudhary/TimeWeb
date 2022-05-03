# THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED

# Abstractions
from django.shortcuts import get_object_or_404, redirect
from django.utils.translation import ugettext as _
from django.http import HttpResponse
from django.contrib.auth import logout, login
from django.forms import ValidationError
from django.views.generic import View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils import timezone
from views import TimewebGenericView
import datetime
from math import ceil, floor
from decimal import Decimal

# App stuff
from django.conf import settings
from views import User
from .models import TimewebModel
from navbar.models import SettingsModel
from .forms import TimewebForm
from navbar.forms import SettingsForm

# Signals
from django.db.models.signals import post_save
from django.dispatch import receiver

# Formatting
from django.forms.models import model_to_dict

# Misc
from utils import days_between_two_dates, utc_to_local
from views import logger

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
            self.context['CREATING_GC_ASSIGNMENTS_FROM_FRONTEND'] = 'token' in request.user.settingsmodel.oauth_token
        else:
            del request.session["already_created_gc_assignments_from_frontend"]

    def get(self, request):        
        utc_now = timezone.now()
        local_now = utc_to_local(request, utc_now)
        local_last_login = utc_to_local(request, request.user.last_login)
        if local_last_login.day != local_now.day:
            for assignment in request.user.timewebmodel_set.all():
                if assignment.mark_as_done:
                    assignment.mark_as_done = False
            TimewebModel.objects.bulk_update(request.user.timewebmodel_set.all(), ['mark_as_done'])
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

        if request.session.get("gc-init-failed", False):
            del request.session["gc-init-failed"]
            self.context["GC_API_INIT_FAILED"] = True
        logger.info(f'User \"{request.user}\" is now viewing the home page')
        return super().get(request)

    

    def post(self, request):
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

EXAMPLE_ACCOUNT_MODEL = User.objects.get(email=settings.EXAMPLE_ACCOUNT_EMAIL)
class ExampleAccountView(View):
    def get(self, request):
        if request.user.is_authenticated:
            logout(request)
        login(request, EXAMPLE_ACCOUNT_MODEL, 'allauth.account.auth_backends.AuthenticationBackend')
        return redirect("home") # PRG
