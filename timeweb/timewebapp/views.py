# THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED

# In the future I should probably switch all my view classes to FormView

# Abstractions
from django.shortcuts import redirect, reverse
from django.utils.translation import gettext as _
from django.http import HttpResponse, QueryDict
from django.contrib.auth import logout, login
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils import timezone
from common.views import TimewebGenericView
import datetime
from math import ceil, floor
from decimal import Decimal

# App stuff
from django.conf import settings
from common.models import User
from .models import TimewebModel
from navbar.models import SettingsModel
from common.views import logger, CHANGELOGS

# Signals
from django.db.models.signals import post_save
from django.dispatch import receiver

# Misc
from django.forms.models import model_to_dict
import common.utils as utils
from django.utils.decorators import method_decorator
from copy import deepcopy
from ratelimit.decorators import ratelimit

MAX_TAG_LENGTH = 100
MAX_NUMBER_OF_TAGS = 5
# needs to be down here due to circular imports
from .forms import TimewebForm
from navbar.forms import SettingsForm
DELETED_ASSIGNMENTS_PER_PAGE = 70
EXAMPLE_ASSIGNMENT = {
    "name": "Reading a Book (EXAMPLE ASSIGNMENT)",
    "x": 30, # Not the db value of x, in this case is just the number of days in the assignment
    "unit": "Page",
    "y": "400.00",
    "blue_line_start": 0,
    "skew_ratio": "1.0000000000",
    "time_per_unit": "3.00",
    "funct_round": "1.00",
    "min_work_time": "60.00",
    "break_days": [],
    "dynamic_start": 0,
    "description": "Example assignment description"
}
TRIGGER_DYNAMIC_MODE_RESET_FIELDS = ("assignment_date", "x", "due_time", "blue_line_start", "y", "min_work_time", "time_per_unit",
                                        "works", "funct_round", "break_days", "skew_ratio", "fixed_mode", "dynamic_start", "hidden")
DONT_TRIGGER_DYNAMIC_MODE_RESET_FIELDS = ("id", "name", "soft", "unit", "description", "tags", "is_google_classroom_assignment",
                                        "google_classroom_assignment_link", "has_alerted_due_date_passed_notice",
                                        "alert_due_date_incremented", "dont_hide_again", "deletion_time", "user", "needs_more_info")
# Make sure to change the logic comparing the old data too if a new field is expensive to equare
assert len(TRIGGER_DYNAMIC_MODE_RESET_FIELDS) + len(DONT_TRIGGER_DYNAMIC_MODE_RESET_FIELDS) == len(TimewebModel._meta.fields), "update this list"

INCLUDE_IN_SETTINGS_MODEL_JSON_SCRIPT = (
    'immediately_delete_completely_finished_assignments', 'def_min_work_time', 'def_break_days',
    'def_skew_ratio', 'loosely_enforce_minimum_work_times', 'one_graph_at_a_time',
    'close_graph_after_work_input', 'show_priority', 'highest_priority_color', 'lowest_priority_color',
    'assignment_sorting', 'default_dropdown_tags', 'display_working_days_left',
    'horizontal_tag_position', 'vertical_tag_position', 'animation_speed',  'enable_tutorial',
    'sorting_animation_threshold', 'timezone', 'seen_latest_changelog', 
)
EXCLUDE_FROM_SETTINGS_MODEL_JSON_SCRIPT = (
    "oauth_token", "added_gc_assignment_ids", "user", "background_image", "id", "nudge_calendar",
    "nudge_notifications", "nudge_canvas", "device_uuid", "device_uuid_api_timestamp",
    "gc_courses_cache", "gc_assignments_always_midnight", "background_image_text_shadow_width",
    "appearance", 
)

assert len(INCLUDE_IN_SETTINGS_MODEL_JSON_SCRIPT) + len(EXCLUDE_FROM_SETTINGS_MODEL_JSON_SCRIPT) == len(SettingsModel._meta.fields), "update this list"

@receiver(post_save, sender=User)
def create_settings_model_and_example(sender, instance, created, **kwargs):
    if created:
        # The front end adjusts the assignment and due date, so we don't need to worry about using utils.utc_to_local instead of localtime
        date_now = timezone.localtime(timezone.now())
        date_now = date_now.replace(hour=0, minute=0, second=0, microsecond=0)
        TimewebModel.objects.create(**EXAMPLE_ASSIGNMENT | {
            "assignment_date": date_now,
            "x": date_now + datetime.timedelta(EXAMPLE_ASSIGNMENT["x"]),
            "user": instance,
        })
        SettingsModel.objects.create(user=instance)
        logger.info(f'Created settings model for user "{instance.username}"')

def append_default_context(request):
    context = {
        "EXAMPLE_ACCOUNT_EMAIL": settings.EXAMPLE_ACCOUNT_EMAIL,
        "EXAMPLE_ASSIGNMENT_NAME": EXAMPLE_ASSIGNMENT["name"],
        "MAX_NUMBER_OF_TAGS": MAX_NUMBER_OF_TAGS,
        "EDITING_EXAMPLE_ACCOUNT": settings.EDITING_EXAMPLE_ACCOUNT,
        "DEBUG": settings.DEBUG,
        "ADD_CHECKBOX_WIDGET_FIELDS": TimewebForm.Meta.ADD_CHECKBOX_WIDGET_FIELDS,
        "RELOAD_VIEWS": list(map(lambda x: reverse(x), RELOAD_VIEWS)),
    }
    if request.session.pop("gc-init-failed", None):
        context["GC_API_INIT_FAILED"] = True
    return context

@method_decorator(ratelimit(key=utils.get_client_ip, rate='30/m', method="GET", block=True), name='get')
@method_decorator(ratelimit(key=utils.get_client_ip, rate='100/h', method="GET", block=True), name='get')
@method_decorator(ratelimit(key=utils.get_client_ip, rate='3/s', method="POST", block=True), name='post')
@method_decorator(ratelimit(key=utils.get_client_ip, rate='15/m', method="POST", block=True), name='post')
@method_decorator(ratelimit(key=utils.get_client_ip, rate='75/h', method="POST", block=True), name='post')
class TimewebView(LoginRequiredMixin, TimewebGenericView):
    template_name = 'timewebapp/app.html'

    def add_user_models_to_context(self, request, *, view_hidden):
        # kinda cursed but saves an entire sql query
        # we have to force request.user.timewebmodel_set.all() to non lazily evaluate or else it executes once to seralize it
        # and another in the html
        if view_hidden:
            timewebmodels = list(request.user.timewebmodel_set.filter(hidden=True).order_by("-deletion_time"))
            if "everything_before" in request.GET:
                everything_before = float(request.GET["everything_before"])
                everything_after = None

                deletion_time__gte_everything_before = [i for i in timewebmodels if i.deletion_time.timestamp() >= everything_before]
                deletion_time__lt_everything_before = [i for i in timewebmodels if i.deletion_time.timestamp() < everything_before]

                self.context["show_previous_page"] = len(deletion_time__gte_everything_before) > 0
                self.context["show_next_page"] = len(deletion_time__lt_everything_before) > DELETED_ASSIGNMENTS_PER_PAGE

                timewebmodels = deletion_time__lt_everything_before[:DELETED_ASSIGNMENTS_PER_PAGE]
            elif "everything_after" in request.GET:
                everything_after = float(request.GET["everything_after"])
                everything_before = None

                deletion_time__gt_everything_after = [i for i in timewebmodels if i.deletion_time.timestamp() > everything_after]
                deletion_time__lte_everything_after = [i for i in timewebmodels if i.deletion_time.timestamp() <= everything_after]

                self.context["show_previous_page"] = len(deletion_time__gt_everything_after) > DELETED_ASSIGNMENTS_PER_PAGE
                self.context["show_next_page"] = len(deletion_time__lte_everything_after) > 0

                timewebmodels = deletion_time__gt_everything_after[-DELETED_ASSIGNMENTS_PER_PAGE:]
            else:
                everything_before = None
                everything_after = None

                self.context["show_previous_page"] = False
                self.context["show_next_page"] = len(timewebmodels) > DELETED_ASSIGNMENTS_PER_PAGE

                timewebmodels = timewebmodels[:DELETED_ASSIGNMENTS_PER_PAGE]
        else:
            timewebmodels = list(request.user.timewebmodel_set.filter(hidden=False))
        self.context['assignment_models'] = timewebmodels
        self.context['assignment_models_as_json'] = list(map(lambda i: model_to_dict(i, exclude=["google_classroom_assignment_link", "user"]), timewebmodels))

        self.context['settings_model'] = request.user.settingsmodel
        self.context['settings_model_as_json'] = model_to_dict(request.user.settingsmodel, exclude=EXCLUDE_FROM_SETTINGS_MODEL_JSON_SCRIPT)
        self.context['settings_model_as_json']['gc_integration_enabled'] = 'token' in request.user.settingsmodel.oauth_token
        self.context['settings_model_as_json']['timezone'] = str(self.context['settings_model_as_json']['timezone'] or '') # timezone isnt json serializable

        if not request.user.settingsmodel.seen_latest_changelog:
            self.context['latest_changelog'] = CHANGELOGS[0]

        if not request.session.pop("already_created_gc_assignments_from_frontend", None):
            self.context['CREATING_GC_ASSIGNMENTS_FROM_FRONTEND'] = 'token' in request.user.settingsmodel.oauth_token

    def get(self, request):
        self.context['form'] = TimewebForm(request=request)
        if request.path == reverse("deleted_assignments"):
            self.add_user_models_to_context(request, view_hidden=True)
            self.context["view_deleted_assignments_in_app_view"] = True
        else:
            self.add_user_models_to_context(request, view_hidden=False)
            self.context['settings_form'] = SettingsForm(initial={ # unbound form
                'assignment_sorting': request.user.settingsmodel.assignment_sorting,
            })

            # adds "#animate-in" or "#animate-color" to the assignment whose form was submitted
            if request.session.get("just_created_assignment_id"):
                self.context['just_created_assignment_id'] = request.session.pop("just_created_assignment_id")
            elif request.session.get("just_updated_assignment_id"):
                self.context['just_updated_assignment_id'] = request.session.pop("just_updated_assignment_id")
            if request.session.get("refresh_dynamic_mode_all"):
                self.context['refresh_dynamic_mode_all'] = request.session.pop("refresh_dynamic_mode_all")
            if request.session.get("refresh_dynamic_mode"):
                self.context['refresh_dynamic_mode'] = request.session.pop("refresh_dynamic_mode")

            if invalid_form_context := request.session.pop('invalid_form_context', None):
                form = TimewebForm(data=QueryDict(invalid_form_context['form']), request=request)
                assert not form.is_valid(), f"{form.data}, {form.errors}"
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
        self.form = TimewebForm(data=request.POST, request=request)
        request.POST._mutable = _mutable

        if self.form.is_valid():
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
            self.sm = TimewebModel.objects.get(pk=self.pk, user=request.user)
            old_data = deepcopy(self.sm)

            # TODO: I ideally want to use a TimewebForm with an instance kwarg, see 64baf58

            self.sm.name = self.form.cleaned_data.get("name")
            self.sm.assignment_date = self.form.cleaned_data.get("assignment_date")
            self.sm.x = self.form.cleaned_data.get("x")
            self.sm.due_time = self.form.cleaned_data.get("due_time")
            self.sm.soft = self.form.cleaned_data.get("soft")
            self.sm.unit = self.form.cleaned_data.get("unit")
            self.sm.y = self.form.cleaned_data.get("y")
            first_work = Decimal(str(self.form.cleaned_data.get("works") or 0))
            self.sm.time_per_unit = self.form.cleaned_data.get("time_per_unit")
            self.sm.description = self.form.cleaned_data.get("description")
            self.sm.funct_round = self.form.cleaned_data.get("funct_round")
            self.sm.min_work_time = self.form.cleaned_data.get("min_work_time")
            self.sm.break_days = self.form.cleaned_data.get("break_days")
        # I dunno why I put this here but it's been here for a while
        # and i'll have this as a safety precaution
        if self.sm.assignment_date:
            self.sm.assignment_date = self.sm.assignment_date.replace(hour=0, minute=0, second=0, microsecond=0)
        if self.sm.x:
            self.sm.x = self.sm.x.replace(hour=0, minute=0, second=0, microsecond=0)
        if not self.sm.funct_round:
            self.sm.funct_round = Decimal(1)
        if not self.sm.unit:
            if self.form.cleaned_data.get(f"y-widget-checkbox"):
                self.sm.unit = "Hour"
            else:
                self.sm.unit = "Minute"

        for field in TimewebForm.Meta.ADD_CHECKBOX_WIDGET_FIELDS:
            try:
                if field in ("x", "y"):
                    pass
                elif field == "funct_round":
                    '''
                    why did i waste so much time making this

+-----------------+--------+-------------------------+--------------------------+--------------+
| decision matrix |        |                         |     funct_round unit     |              |
+-----------------+--------+-------------------------+--------------------------+--------------+
|                 |        | minute                  | hour                     | other        |
+-----------------+--------+-------------------------+--------------------------+--------------+
|                 | minute | pass                    | multiply step size by 60 | not possible |
+-----------------+--------+-------------------------+--------------------------+--------------+
| unit            | hour   | divide step size by 60  | pass                     | not possible |
+-----------------+--------+-------------------------+--------------------------+--------------+
|                 | other  | not possible            | not possible             | pass         |
+-----------------+--------+-------------------------+--------------------------+--------------+
                    '''
                    if self.sm.unit.lower() in ('hour', 'hours') and not self.form.cleaned_data.get(f"{field}-widget-checkbox"):
                        setattr(self.sm, field, utils.minutes_to_hours(getattr(self.sm, field)))
                    elif self.sm.unit.lower() in ('minute', 'minutes') and self.form.cleaned_data.get(f"{field}-widget-checkbox"):
                        setattr(self.sm, field, utils.hours_to_minutes(getattr(self.sm, field)))
                elif field == "works":
                    # NOTE: changing just funct_round unit should not affect the rest of works
                    # so it is safe to do this and not include it as a condition where works is
                    # redefined if unit changes from minute to hour or vice versa
                    if self.sm.unit.lower() in ('hour', 'hours') and not self.form.cleaned_data.get(f"{field}-widget-checkbox"):
                        first_work = utils.minutes_to_hours(first_work)
                    elif self.sm.unit.lower() in ('minute', 'minutes') and self.form.cleaned_data.get(f"{field}-widget-checkbox"):
                        first_work = utils.hours_to_minutes(first_work)
                elif field in ("min_work_time", "time_per_unit"):
                    if self.form.cleaned_data.get(f"{field}-widget-checkbox"):
                        setattr(self.sm, field, utils.hours_to_minutes(getattr(self.sm, field)))
                    if field in ("min_work_time", ):
                        setattr(self.sm, field, utils.safe_conversion(getattr(self.sm, field), 1 / self.sm.time_per_unit))
            except TypeError:
                pass

        # We don't actually need to do any further checking if x or y were predicted because of the frontend's validation
        if (
            self.sm.assignment_date is None or self.sm.time_per_unit is None or
            self.sm.x is None and self.sm.y is None or
            # if x is empty and y was not predicted (y is a value)
            request.POST.get('x') == "" and 'y' in request.POST or 
            # if y is empty and x was not predicted (x is a value)
            request.POST.get('y') == "" and 'x' in request.POST
        ):
            # Works might become an int instead of a list but it doesnt really matter since it isnt being used
            # However, the form doesn't repopulate on edit assignment because it calls works[0]. So, make works a list
            self.sm.works = [str(first_work)]
            self.sm.needs_more_info = True
        else:
            date_now = utils.utc_to_local(request, timezone.now())
            date_now = date_now.replace(hour=0, minute=0, second=0, microsecond=0)
            if settings.EDITING_EXAMPLE_ACCOUNT:
                # Example account date (for below logic purposes)
                original_date_now = date_now
                date_now = utils.utc_to_local(request, datetime.datetime(2021, 5, 3, tzinfo=timezone.utc))
                self.sm.assignment_date -= original_date_now - date_now
                self.sm.x -= original_date_now - date_now
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

                    # TODO: There could very possibly be a bug with the last expression, removed_works_start <= removed_works_end
                    # This is a condition from the below code that redefines works
                    # However it does not take into account capping removed_works_end at end_of_works
                    # However, end_of_works is dependent on x, creating a deadlock
                    # This requires too much thinking to fix, so I'm just going to leave it as is and pray this is satisfactory enough
                    if self.created_assignment or self.sm.needs_more_info or not removed_works_start <= removed_works_end:
                        new_first_work = first_work
                    elif self.updated_assignment:
                        new_first_work = Decimal(old_data.works[removed_works_start]) - Decimal(old_data.works[0]) + first_work
                    # the prediction for y is ceiled so also ceil the prediction for the due date for consistency
                    work_day_count = ceil((self.sm.y - new_first_work) / min_work_time_funct_round)

                    if not work_day_count or len(self.sm.break_days) == 7:
                        x_num = 1
                    elif self.sm.break_days:
                        mods = utils.calc_mod_days(self)

                        # Terrible implementation of inversing calcModDays
                        guess_x = 7 * floor(work_day_count / (7 - len(self.sm.break_days)) - 1) - 1
                        while 1:
                            guess_x += 1
                            if guess_x - guess_x // 7 * len(self.sm.break_days) - mods[guess_x % 7] == work_day_count:
                                x_num = max(1, guess_x)
                                break
                    else:
                        x_num = work_day_count
                    # Make sure assignments arent finished by x_num
                    # x_num = date_now+timedelta(x_num) - min(date_now, self.sm.assignment_date)
                    if self.sm.assignment_date < date_now:
                        # x_num = (date_now + timedelta(x_num) - self.sm.assignment_date).days
                        # x_num = (date_now - self.sm.assignment_date).days + x_num
                        # x_num += (date_now - self.sm.assignment_date).days
                        x_num += utils.days_between_two_dates(date_now, self.sm.assignment_date)
                        # There is no need to modify blue_line_start by this addition because it is adjusted earlier
                        # To see why this is the case, let's think about this abstractly.
                        # We are adding x_num to the due date, and the due date is after the assignment date and,
                        # deductively, after the x position of the start of the blue line. Since we are only adding
                        # to the end of the assignment, away from all of these affect variables, this addition should,
                        #  in theory, not affect blue_line_start.
                    try:
                        self.sm.x = self.sm.assignment_date + datetime.timedelta(x_num)
                    except OverflowError:
                        self.sm.x = datetime.datetime.max - datetime.timedelta(10) # -10 to prevent overflow errors
                        self.sm.x = self.sm.x.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
            else:
                x_num = utils.days_between_two_dates(self.sm.x, self.sm.assignment_date)
                if self.sm.y == None:
                    complete_x_num = Decimal(x_num) + Decimal(self.sm.due_time.hour * 60 + self.sm.due_time.minute) / Decimal(24 * 60)
                    # the prediction for due date is ceiled so also ceil the prediction for y for consistency
                    self.sm.y = ceil(min_work_time_funct_round * complete_work_day_count)
                else:
                    # we already have x_num and y and we don't need to do any further processing
                    pass
            old_x_num = utils.days_between_two_dates(old_data.x, old_data.assignment_date)
            if self.sm.due_time and (self.sm.due_time.hour or self.sm.due_time.minute):
                x_num += 1
                old_x_num += 1
            old_ideal_blue_line_start = utils.days_between_two_dates(date_now, old_data.assignment_date)
            ideal_blue_line_start = utils.days_between_two_dates(date_now, self.sm.assignment_date)
            if (self.created_assignment or self.sm.needs_more_info or 

                # if self.sm.blue_line_start >= x_num then blue_line_start is 0
                old_ideal_blue_line_start >= old_x_num and 
                not ideal_blue_line_start >= old_x_num or

                # if blue_line_start < 0 then blue_line_start is 0
                
                # Note: this action does NOT affect works, even if it may be
                # more mathematically logical to do so

                # For context, what is happening here is blue_line_start is being
                # forced back to today for an assignment that used to have an
                # assignment date in the future. This should in theory affect
                # works by clearing it, as every day is now offset. But practically,
                # users are unlike to actually want this to happen.
                # 1) they probably don't care about the offset
                # 2) it would be extremely frustrating to have their work inputs cleared
                # 3) they might have assigned in the future in the first place by typo or testing
                old_ideal_blue_line_start < 0 and
                not ideal_blue_line_start < 0
            ):
                self.sm.blue_line_start = ideal_blue_line_start
            else:
                self.sm.blue_line_start += utils.days_between_two_dates(old_data.assignment_date, self.sm.assignment_date)
            if self.sm.blue_line_start < 0:
                removed_works_start = -self.sm.blue_line_start # translates x position 0 so that it can be used to accessing works
                self.sm.blue_line_start = 0
            else:
                removed_works_start = 0
            # Defines
            # 1) self.sm.blue_line_start
            # 2) self.sm.dynamic_start
            # 3) self.sm.works
            if self.sm.blue_line_start >= x_num:
                self.sm.blue_line_start = 0
                self.sm.dynamic_start = self.sm.blue_line_start
                self.sm.works = [str(first_work)]
            elif self.sm.needs_more_info or self.created_assignment:
                self.sm.dynamic_start = self.sm.blue_line_start
                self.sm.works = [str(first_work)]
            elif self.updated_assignment:
                self.sm.dynamic_start += utils.days_between_two_dates(old_data.assignment_date, self.sm.assignment_date)
                if self.sm.dynamic_start < 0:
                    self.sm.dynamic_start = 0
                # Should we include the dynamic_start >= x_num check?
                # Let's see if this is possible

                # if this runs, then self.sm.blue_line_start >= x_num is false
                # so blue_line_start < x_num

                # We also know that dynamic_start >= blue_line_start

                # Combining these, the following inequality is true at this point:
                # dynamic_start >= blue_line_start < x_num, which does not imply dynamic_start >= x_num is false
                elif self.sm.dynamic_start >= x_num:
                    self.sm.dynamic_start = x_num - 1
                removed_works_end = len(old_data.works) - 1
                # If the edited due date cuts off some of the work inputs
                actual_len_works = removed_works_end + 1 - removed_works_start
                len_works = actual_len_works - 1
                if len_works + self.sm.blue_line_start > x_num:
                    # (removed_works_end + 1 - removed_works_start) - 1 + self.sm.blue_line_start > x_num
                    # removed_works_end - removed_works_start + self.sm.blue_line_start > x_num
                    # removed_works_end > x_num + removed_works_start - self.sm.blue_line_start
                    removed_works_end = x_num + removed_works_start - self.sm.blue_line_start
                    actual_len_works = removed_works_end + 1 - removed_works_start
                    len_works = actual_len_works - 1
                if len_works >= 0:
                    unit_changed_from_hour_to_minute = old_data.unit.lower() in ('hour', 'hours') and self.sm.unit.lower() in ('minute', 'minutes')
                    unit_changed_from_minute_to_hour = old_data.unit.lower() in ('minute', 'minutes') and self.sm.unit.lower() in ('hour', 'hours')
                    # utils.minutes_to_hours and utils.hours_to_minutes are not needed because i want this to be an accurate conversion
                    if unit_changed_from_hour_to_minute:
                        old_data.works = [str(utils.hours_to_minutes(Decimal(i))) for i in old_data.works]
                    elif unit_changed_from_minute_to_hour:
                        old_data.works = [str(utils.minutes_to_hours(Decimal(i))) for i in old_data.works]
                    # If the edited assign date cuts off some of the work inputs, adjust the work inputs accordingly
                    works_displacement = Decimal(old_data.works[0]) - first_work
                    if not (
                        # All of these need to be true to skip redfining self.sm.works:
                        works_displacement == 0 and
                        removed_works_start == 0 and
                        removed_works_end + 1 == len(old_data.works) and
                        not unit_changed_from_hour_to_minute and
                        not unit_changed_from_minute_to_hour
                    ):
                        self.sm.works = [str(Decimal(old_data.works[n]) - works_displacement) for n in range(removed_works_start, removed_works_end + 1)]
                else:
                    # If the assignment or due date cuts off every work input
                    self.sm.works = [str(first_work)]
                    actual_len_works = 1
                    len_works = actual_len_works - 1
                if Decimal(self.sm.works[len_works]) >= self.sm.y:
                    # ensures assignments don't immediately delete after editing a y value
                    # less than the last work input
                    self.sm.dont_hide_again = True
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
            for field in TRIGGER_DYNAMIC_MODE_RESET_FIELDS:
                if field == "works" and getattr(old_data, field)[0] != getattr(self.sm, field)[0] or getattr(old_data, field) != getattr(self.sm, field):
                    request.session['refresh_dynamic_mode'] = self.sm.pk
                    break
        return redirect("home")

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
        self.context['form'] = self.form.data.urlencode() # TimewebForm is not json serializable
        request.session['invalid_form_context'] = self.context
        return redirect("home")

try:
    EXAMPLE_ACCOUNT_MODEL = User.objects.get(email=settings.EXAMPLE_ACCOUNT_EMAIL)
except:
    EXAMPLE_ACCOUNT_MODEL = None
class ExampleAccountView(TimewebView):
    # Ignore LoginRequiredMixin
    def dispatch(self, *args, **kwargs):
        return super(LoginRequiredMixin, self).dispatch(*args, **kwargs)

    def get(self, request):
        if EXAMPLE_ACCOUNT_MODEL is not None:
            if request.user.is_authenticated:
                logout(request)
            login(request, EXAMPLE_ACCOUNT_MODEL, 'allauth.account.auth_backends.AuthenticationBackend')
        return super(ExampleAccountView, self).get(request)

# needs to be down here due to circular imports
from .urls import RELOAD_VIEWS