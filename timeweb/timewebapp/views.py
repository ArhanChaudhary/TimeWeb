# THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED

# In the future I should probably switch all my view classes to FormView

# Abstractions
from django.shortcuts import get_object_or_404, redirect
from django.utils.translation import gettext as _
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

# Misc
from django.forms.models import model_to_dict
from utils import days_between_two_dates, utc_to_local
from views import logger

@receiver(post_save, sender=User)
def create_settings_model_and_example(sender, instance, created, **kwargs):
    if created:
        # The front end adjusts the assignment and due date, so we don't need to worry about using utc_to_local instead of localtime
        date_now = timezone.localtime(timezone.now())
        date_now = date_now.replace(hour=0, minute=0, second=0, microsecond=0)
        TimewebModel.objects.create(**settings.EXAMPLE_ASSIGNMENT | {
            "assignment_date": date_now,
            "x": date_now + datetime.timedelta(settings.EXAMPLE_ASSIGNMENT["x"]),
            "user": instance,
        })
        SettingsModel.objects.create(user=instance)
        logger.info(f'Created settings model for user "{instance.username}"')

def append_default_context(request):
    context = {
        "EXAMPLE_ACCOUNT_EMAIL": settings.EXAMPLE_ACCOUNT_EMAIL,
        "EXAMPLE_ASSIGNMENT_NAME": settings.EXAMPLE_ASSIGNMENT["name"],
        "MAX_NUMBER_OF_TAGS": settings.MAX_NUMBER_OF_TAGS,
        "EDITING_EXAMPLE_ACCOUNT": settings.EDITING_EXAMPLE_ACCOUNT,
        "DEBUG": settings.DEBUG,
        "ADD_CHECKBOX_WIDGET_FIELDS": TimewebForm.Meta.ADD_CHECKBOX_WIDGET_FIELDS,
    }
    if request.session.pop("gc-init-failed", None):
        context["GC_API_INIT_FAILED"] = True
    return context

class TimewebView(LoginRequiredMixin, TimewebGenericView):
    template_name = 'timewebapp/app.html'

    def add_user_models_to_context(self, request):
        # kinda cursed but saves an entire sql query
        # we have to force request.user.timewebmodel_set.all() to non lazily evaluate or else it executes once to seralize it
        # and another in the html
        timewebmodels = list(request.user.timewebmodel_set.all())
        self.context['assignment_models'] = timewebmodels
        self.context['assignment_models_as_json'] = list(map(lambda i: model_to_dict(i, exclude=["google_classroom_assignment_link", "user"]), timewebmodels))

        self.context['settings_model'] = request.user.settingsmodel
        self.context['settings_model_as_json'] = model_to_dict(request.user.settingsmodel, exclude=[
            "oauth_token", "added_gc_assignment_ids", "user", "background_image", "id"]) # Don't use *SettingsForm.Meta.exclude because this isn't a form
        self.context['settings_model_as_json']['gc_integration_enabled'] = 'token' in request.user.settingsmodel.oauth_token
        self.context['settings_model_as_json']['timezone'] = str(self.context['settings_model_as_json']['timezone'] or '') # timezone isnt json serializable

        if not request.user.settingsmodel.seen_latest_changelog:
            self.context['latest_changelog'] = settings.CHANGELOGS[0]

        if not request.session.pop("already_created_gc_assignments_from_frontend", None):
            self.context['CREATING_GC_ASSIGNMENTS_FROM_FRONTEND'] = 'token' in request.user.settingsmodel.oauth_token

    def get(self, request):
        self.add_user_models_to_context(request)
        self.context['form'] = TimewebForm()
        self.context['settings_form'] = SettingsForm(initial={ # unbound form
            'assignment_sorting': request.user.settingsmodel.assignment_sorting,
        })

        # adds "#animate-in" or "#animate-color" to the assignment whose form was submitted
        if request.session.get("just_created_assignment_id"):
            self.context['just_created_assignment_id'] = request.session.pop("just_created_assignment_id")
        elif request.session.get("just_updated_assignment_id"):
            self.context['just_updated_assignment_id'] = request.session.pop("just_updated_assignment_id")

        if invalid_form_context := request.session.pop('invalid_form_context', None):
            form = TimewebForm(data=invalid_form_context['form'])
            assert not form.is_valid(), form.data
            for field in form.errors:
                form[field].field.widget.attrs['class'] = form[field].field.widget.attrs.get('class', "") + 'invalid'

            invalid_form_context['form'] = form
            self.context.update(invalid_form_context)
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
        self.form = TimewebForm(data=request.POST)
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

            # Set defaults
            self.sm.skew_ratio = request.user.settingsmodel.def_skew_ratio
            # first_work is works[0]
            # Convert this to a decimal object because it can be a float
            first_work = Decimal(str(self.sm.works or 0))
            self.sm.user = request.user
        elif self.updated_assignment:
            self.sm = get_object_or_404(TimewebModel, pk=self.pk)
            if request.user != self.sm.user:
                logger.warning(f"User \"{request.user}\" can't edit an assignment that isn't their's")
                return HttpResponse(status=404)
                
            # old_data is needed for readjustments
            old_data = get_object_or_404(TimewebModel, pk=self.pk)

            # TODO: I ideally want to use a TimewebForm with an instance kwarg, see 64baf58

            self.sm.name = self.form.cleaned_data.get("name")
            self.sm.assignment_date = self.form.cleaned_data.get("assignment_date")
            if self.sm.assignment_date:
                self.sm.assignment_date = self.sm.assignment_date.replace(hour=0, minute=0, second=0, microsecond=0)
            self.sm.x = self.form.cleaned_data.get("x")
            if self.sm.x:
                self.sm.x = self.sm.x.replace(hour=0, minute=0, second=0, microsecond=0)
            self.sm.due_time = self.form.cleaned_data.get("due_time")
            self.sm.soft = self.form.cleaned_data.get("soft")
            self.sm.unit = self.form.cleaned_data.get("unit")
            self.sm.y = self.form.cleaned_data.get("y")
            try:
                if self.sm.y < 1:
                    # I remember some graph code completely crashing when y is less than 1. Cap it at one for safety
                    self.sm.y = 1
            except TypeError:
                pass
            first_work = Decimal(str(self.form.cleaned_data.get("works") or 0))
            self.sm.time_per_unit = self.form.cleaned_data.get("time_per_unit")
            self.sm.description = self.form.cleaned_data.get("description")
            self.sm.funct_round = self.form.cleaned_data.get("funct_round") or Decimal("1")
            self.sm.min_work_time = self.form.cleaned_data.get("min_work_time")
            self.sm.break_days = self.form.cleaned_data.get("break_days")
        if not self.sm.unit:
            if self.form.cleaned_data.get(f"y-widget-checkbox"):
                self.sm.unit = "Hour"
            else:
                self.sm.unit = "Minute"

        if self.sm.unit.lower() in ("minute", "minutes"):
            self.sm.time_per_unit = Decimal("1")
            self.sm.funct_round = Decimal("5")
        elif self.sm.unit.lower() in ("hour", "hours"):
            self.sm.time_per_unit = Decimal("60")
            # Nothing prevents funct_round from staying at 5 so let's interfere
            if (self.updated_assignment # old_data isn't defined for created assignments
                and old_data.unit.lower() in ("minute", "minutes")
                # No need to check if the old data's time_per_unit is 1 or funct_round is 5
                # Because those are already true if the old data's unit is minute

                # checks if the user hasn't changed the step size from what it was before
                # TODO: some way to detect if the user manually enters a funct_round of 5
                # the current system sets their step size to 1 in this case which makes
                # no sense to the user
                and self.sm.funct_round == Decimal("5")
            ):
                self.sm.funct_round = Decimal("1")

        for field in TimewebForm.Meta.ADD_CHECKBOX_WIDGET_FIELDS:
            if field == "y": continue
            try:
                setattr(self.sm, field, getattr(self.sm, field) * (
                    60 if self.form.cleaned_data.get(f"{field}-widget-checkbox") else 1
                ))
            except TypeError:
                pass

        # We don't actually need to do any further checking if x or y were predicted because of the frontend's validation
        if self.sm.assignment_date is None or self.sm.time_per_unit is None or \
            self.sm.x is None and self.sm.y is None:
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
                removed_works_start = -self.sm.blue_line_start # translates x position 0 so that it can be used to accessing works
                removed_works_end = len(old_data.works) - 1
                if self.sm.blue_line_start < 0 or settings.EDITING_EXAMPLE_ACCOUNT:
                    self.sm.blue_line_start = 0
                if removed_works_start < 0:
                    removed_works_start = 0

            min_work_time_funct_round = ceil(self.sm.min_work_time / self.sm.funct_round) * self.sm.funct_round if self.sm.min_work_time else self.sm.funct_round
            if self.sm.x == None:
                if self.sm.y == None:
                    # won't ever run because it will be marked as needs more info earlier
                    pass
                else:
                    # The purpose of this part of the code is to take into account the adjusted assignment date
                    # and make it look like the graph smoothly "chops off" previous work inputs
                    # some mathy legacy reference:

                    # ctime * (y - new_first_work) = min_work_time_funct_round * x
                    # x = ctime * (y - new_first_work) / min_work_time_funct_round
                    # Solve for new_first_work:
                    # works = [old_data.works[n] - old_data.works[0] + first_work for n in range(removed_works_start,removed_works_end+1)]
                    # new_first_work is when n = removed_works_start
                    # new_first_work = old_data.works[removed_works_start] - old_data.works[0] + first_work

                    # There could very possibly be a bug with the last expression, removed_works_start <= removed_works_end
                    # This is a condition from the below code that redefines works
                    # However it does not take into account capping removed_works_end at end_of_works
                    # However, end_of_works is dependent on x, creating a deadlock
                    # This requires too much thinking to fix, so I'm just going to leave it as is and pray this is satisfactory enough
                    if self.created_assignment or self.sm.needs_more_info or not removed_works_start <= removed_works_end:
                        new_first_work = first_work
                    elif self.updated_assignment:
                        new_first_work = Decimal(old_data.works[removed_works_start]) - Decimal(old_data.works[0]) + first_work
                    # the prediction for y is ceiled so also ceil the prediction for the due date for consistency
                    x_num = ceil(self.sm.time_per_unit * (self.sm.y - new_first_work) / min_work_time_funct_round)

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
            else:
                x_num = days_between_two_dates(self.sm.x, self.sm.assignment_date)
                if self.sm.y == None:
                    complete_x_num = Decimal(x_num) + Decimal(self.sm.due_time.hour * 60 + self.sm.due_time.minute) / Decimal(24 * 60)
                    # the prediction for due date is ceiled so also ceil the prediction for y for consistency
                    self.sm.y = ceil(min_work_time_funct_round / self.sm.time_per_unit * complete_x_num)
                else:
                    # we already have x_num and y and we don't need to do any further processing
                    pass
            if self.sm.due_time and (self.sm.due_time.hour or self.sm.due_time.minute):
                x_num += 1

            if self.sm.blue_line_start >= x_num:
                self.sm.blue_line_start = 0
                # dynamic_start is capped later on if not created_assignment (i think that's why i did this)
                # might rewrite
                if self.created_assignment or self.sm.needs_more_info:
                    self.sm.dynamic_start = 0

            if self.sm.needs_more_info or self.created_assignment:
                self.sm.works = [str(first_work)]
            elif self.updated_assignment:
                old_x_num = days_between_two_dates(self.sm.x, old_data.assignment_date)
                if self.sm.due_time and (self.sm.due_time.hour or self.sm.due_time.minute):
                    old_x_num += 1
                end_of_works = old_x_num - self.sm.blue_line_start

                # If the edited due date cuts off some of the work inputs
                if removed_works_end > end_of_works:
                    removed_works_end = end_of_works
                if removed_works_start <= removed_works_end:
                    # If the edited assign date cuts off some of the work inputs, adjust the work inputs accordingly
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

        # field value is set to "Predicted" and field is disabled in crud.js
        # We can't do both of those in the backend because setting the field value doesn't work for disabled fields

        # adds an auxillary class .disabled-field to determine whether or not the field was predicted in the submission
        self.context['x_was_predicted'] = 'x' not in request.POST
        self.context['y_was_predicted'] = 'y' not in request.POST
        if self.created_assignment:
            self.context['submit'] = 'Create Assignment'
        elif self.updated_assignment:
            self.context['invalid_form_pk'] = self.pk
            self.context['submit'] = 'Edit Assignment'
        self.context['form'] = self.form.data # TimewebForm is not json serializable
        request.session['invalid_form_context'] = self.context
        return redirect(request.path_info)

EXAMPLE_ACCOUNT_MODEL = User.objects.get(email=settings.EXAMPLE_ACCOUNT_EMAIL)
class ExampleAccountView(View):
    def get(self, request):
        if request.user.is_authenticated:
            logout(request)
        login(request, EXAMPLE_ACCOUNT_MODEL, 'allauth.account.auth_backends.AuthenticationBackend')
        return redirect("home")
