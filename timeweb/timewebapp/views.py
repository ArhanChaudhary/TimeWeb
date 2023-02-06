# THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED

# In the future I should probably switch all my view classes to FormView

# Abstractions
from django.shortcuts import redirect, reverse
from django.utils.translation import gettext as _
from django.http import QueryDict
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
from . import utils as app_utils
from django.utils.decorators import method_decorator
from copy import deepcopy
from ratelimit.decorators import ratelimit

MAX_TAG_LENGTH = 100
MAX_NUMBER_OF_TAGS = 5
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
# needs to be down here due to circular imports
from .forms import TimewebForm
from navbar.forms import SettingsForm
DELETED_ASSIGNMENTS_PER_PAGE = 70
# Make sure to change the logic comparing the old data too if a new field is expensive to equare
TRIGGER_DYNAMIC_MODE_RESET_FIELDS = ("assignment_date", "x", "due_time", "blue_line_start", "y", "min_work_time", "time_per_unit",
                                        "works", "funct_round", "break_days", "skew_ratio", "fixed_mode", "dynamic_start", "hidden")
DONT_TRIGGER_DYNAMIC_MODE_RESET_FIELDS = ("id", "name", "soft", "unit", "description", "tags", "is_google_classroom_assignment",
                                        "google_classroom_assignment_link", "has_alerted_due_date_passed_notice",
                                        "alert_due_date_incremented", "dont_hide_again", "deletion_time", "user", "needs_more_info")
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

EXCLUDE_FROM_ASSIGNMENT_MODELS_JSON_SCRIPT = (
    "google_classroom_assignment_link", "user", "hidden"
)
INCLUDE_IN_ASSIGNMENT_MODELS_JSON_SCRIPT = (
    "assignment_date", "x", "due_time", "blue_line_start", "y", "min_work_time", "time_per_unit",
    "works", "funct_round", "break_days", "skew_ratio", "fixed_mode", "dynamic_start", "id", "name",
    "soft", "unit", "description", "tags", "is_google_classroom_assignment",
    "has_alerted_due_date_passed_notice", "alert_due_date_incremented", "dont_hide_again",
    "deletion_time", "needs_more_info",
)

assert len(INCLUDE_IN_ASSIGNMENT_MODELS_JSON_SCRIPT) + len(EXCLUDE_FROM_ASSIGNMENT_MODELS_JSON_SCRIPT) == len(TimewebModel._meta.fields), "update this list"

@receiver(post_save, sender=User)
def create_settings_model_and_example(sender, instance, created, **kwargs):
    if not created: return
    # ensure this is UTC for assignment_date and x
    # The front end adjusts the assignment and due date, so we don't need to worry about this being accurate
    date_now = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
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
        "RELOAD_VIEWS": [reverse(i) for i in RELOAD_VIEWS],
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
        self.context['assignment_models_as_json'] = [model_to_dict(i, exclude=EXCLUDE_FROM_ASSIGNMENT_MODELS_JSON_SCRIPT) for i in timewebmodels]

        self.context['settings_model'] = request.user.settingsmodel
        self.context['settings_model_as_json'] = model_to_dict(request.user.settingsmodel, exclude=EXCLUDE_FROM_SETTINGS_MODEL_JSON_SCRIPT)
        self.context['settings_model_as_json']['gc_integration_enabled'] = 'token' in request.user.settingsmodel.oauth_token
        self.context['settings_model_as_json']['timezone'] = str(self.context['settings_model_as_json']['timezone'] or '') # timezone isnt json serializable

        if not request.user.settingsmodel.seen_latest_changelog:
            self.context['latest_changelog'] = CHANGELOGS[0]

        if not request.session.pop("already_created_gc_assignments_from_frontend", None):
            self.context['CREATING_GC_ASSIGNMENTS_FROM_FRONTEND'] = 'token' in request.user.settingsmodel.oauth_token

    def get(self, request):
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
                parsed = QueryDict(invalid_form_context['form'])
                request.utc_offset = parsed['utc_offset']
                form = TimewebForm(data=parsed, request=request)
                assert not form.is_valid(), f"{form.data}, {form.errors}"
                for field in form.errors:
                    form[field].field.widget.attrs['class'] = form[field].field.widget.attrs.get('class', "") + ' invalid'
                # we need to undo what happens in TimewebForm.__init__ to ensure the due time is
                # included in the invalid form
                _mutable = form.data._mutable
                form.data._mutable = True
                form.data['x'] += " " + form.data['due_time']
                del form.data['due_time']
                form.data._mutable = _mutable

                invalid_form_context['form'] = form
                self.context.update(invalid_form_context)
        if 'form' not in self.context:
            self.context['form'] = TimewebForm(request=request)
        logger.info(f'User \"{request.user}\" is now viewing the home page')
        return super().get(request)

    def post(self, request):
        # The frontend adds the assignment's pk as the "value" attribute to the submit button
        self.pk = request.POST['submit-button']
        if self.pk == '':
            self.pk = None
            request.created_assignment = True
            request.updated_assignment = False
        else:
            request.created_assignment = False
            request.updated_assignment = True
        
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
        if request.created_assignment:
            self.sm = self.form.save(commit=False)
            old_data = None

            # Set defaults
            self.sm.skew_ratio = request.user.settingsmodel.def_skew_ratio
            first_work = Decimal(self.sm.works[0])
            self.sm.user = request.user
        else:
            assert request.updated_assignment
            self.sm = request.user.timewebmodel_set.get(pk=self.pk)
            old_data = deepcopy(self.sm)

            # TODO: I ideally want to use a TimewebForm with an instance kwarg, see 64baf58
            # Excluded: id, blue_line_start, skew_ratio, works, fixed_mode, dynamic_start, tags, has_alerted_due_date_passed_notice, alert_due_date_incremented, dont_hide_again

            self.sm.name = self.form.cleaned_data.get("name")
            self.sm.assignment_date = self.form.cleaned_data.get("assignment_date")
            self.sm.x = self.form.cleaned_data.get("x")
            self.sm.due_time = self.form.cleaned_data.get("due_time")
            self.sm.soft = self.form.cleaned_data.get("soft")
            self.sm.unit = self.form.cleaned_data.get("unit")
            self.sm.y = self.form.cleaned_data.get("y")
            first_work = Decimal(self.form.cleaned_data.get("works")[0])
            self.sm.time_per_unit = self.form.cleaned_data.get("time_per_unit")
            self.sm.description = self.form.cleaned_data.get("description")
            self.sm.funct_round = self.form.cleaned_data.get("funct_round")
            self.sm.min_work_time = self.form.cleaned_data.get("min_work_time")
            self.sm.break_days = self.form.cleaned_data.get("break_days")

            if old_data.assignment_date:
                old_data.assignment_date = old_data.assignment_date.replace(tzinfo=timezone.zoneinfo.ZoneInfo(request.utc_offset))
            if old_data.x:
                old_data.x = old_data.x.replace(tzinfo=timezone.zoneinfo.ZoneInfo(request.utc_offset))
        for field in TimewebForm.Meta.ADD_CHECKBOX_WIDGET_FIELDS:
            try:
                if field in ("x", "y"):
                    pass
                elif field == "funct_round":
                    '''
                    step size transform decision matrix
                    +------+--------+--------+----------------+-------+
                    |      |        |        | step size unit |       |
                    +------+--------+--------+----------------+-------+
                    |      |        | minute | hour           | other |
                    +------+--------+--------+----------------+-------+
                    |      | minute | pass   | *60            | NA    |
                    +------+--------+--------+----------------+-------+
                    | unit | hour   | /60    | pass           | NA    |
                    +------+--------+--------+----------------+-------+
                    |      | other  | NA     | NA             | pass  |
                    +------+--------+--------+----------------+-------+
                    '''
                    if self.sm.unit.lower() in ('hour', 'hours') and not self.form.cleaned_data.get(f"{field}-widget-checkbox"):
                        setattr(self.sm, field, app_utils.minutes_to_hours(getattr(self.sm, field)))
                    elif self.sm.unit.lower() in ('minute', 'minutes') and self.form.cleaned_data.get(f"{field}-widget-checkbox"):
                        setattr(self.sm, field, app_utils.hours_to_minutes(getattr(self.sm, field)))
                elif field == "works":
                    # NOTE: changing just funct_round unit should not affect the rest of works
                    # so it is safe to do this and not include it as a condition where works is
                    # redefined if unit changes from minute to hour or vice versa
                    if self.sm.unit.lower() in ('hour', 'hours') and not self.form.cleaned_data.get(f"{field}-widget-checkbox"):
                        first_work = app_utils.minutes_to_hours(first_work)
                    elif self.sm.unit.lower() in ('minute', 'minutes') and self.form.cleaned_data.get(f"{field}-widget-checkbox"):
                        first_work = app_utils.hours_to_minutes(first_work)
                elif field in ("min_work_time", "time_per_unit"):
                    if self.form.cleaned_data.get(f"{field}-widget-checkbox"):
                        setattr(self.sm, field, app_utils.hours_to_minutes(getattr(self.sm, field)))
                    if field in ("min_work_time", ):
                        setattr(self.sm, field, app_utils.safe_conversion(getattr(self.sm, field), 1 / self.sm.time_per_unit))
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
            self.sm.needs_more_info = True
            self.sm.works = [str(first_work)]
        else:
            self.sm.needs_more_info = False
            date_now = utils.utc_to_local(request, timezone.now())
            date_now = date_now.replace(hour=0, minute=0, second=0, microsecond=0)
            if settings.EDITING_EXAMPLE_ACCOUNT:
                # Example account date (for below logic purposes)
                original_date_now = date_now
                date_now = utils.utc_to_local(request, datetime.datetime(2021, 5, 3, tzinfo=timezone.utc))
                self.sm.assignment_date -= original_date_now - date_now
                self.sm.x -= original_date_now - date_now
            min_work_time_funct_round = ceil(self.sm.min_work_time / self.sm.funct_round) * self.sm.funct_round if self.sm.min_work_time else self.sm.funct_round
            # NOTE: (self.sm.x is None and self.sm.y is None) is impossible
            if self.sm.x is None:
                if request.created_assignment or old_data.needs_more_info:
                    adjusted_blue_line_partial = app_utils.adjust_blue_line(request,
                        old_data=old_data,
                        assignment_date=self.sm.assignment_date,
                        x_num=None
                    )
                    mods = app_utils.calc_mod_days(
                        assignment_date=self.sm.assignment_date,
                        blue_line_start=adjusted_blue_line_partial['blue_line_start'],
                        break_days=self.sm.break_days
                    )
                    new_first_work = first_work
                else:
                    assert request.updated_assignment
                    adjusted_blue_line_partial = app_utils.adjust_blue_line(request,
                        old_data=old_data,
                        assignment_date=self.sm.assignment_date,
                        x_num=None
                    )
                    mods = app_utils.calc_mod_days(
                        assignment_date=self.sm.assignment_date,
                        blue_line_start=old_data.blue_line_start,
                        break_days=self.sm.break_days
                    )
                    removed_works_start = adjusted_blue_line_partial['removed_works_start']
                    removed_works_end = adjusted_blue_line_partial['removed_works_end']
                    actual_len_works = removed_works_end + 1 - removed_works_start
                    len_works = actual_len_works - 1
                    if len_works >= 0:
                        # ctime * (y - new_first_work) = min_work_time_funct_round * x
                        # x = ctime * (y - new_first_work) / min_work_time_funct_round
                        # Solve for new_first_work:
                        # works = [old_data.works[n] - old_data.works[0] + first_work for n in range(removed_works_start,removed_works_end+1)]
                        # new_first_work is when n = removed_works_start
                        # new_first_work = old_data.works[removed_works_start] - old_data.works[0] + first_work
                        new_first_work = Decimal(old_data.works[removed_works_start]) - Decimal(old_data.works[0]) + first_work
                    else:
                        new_first_work = first_work
                # the prediction for y is ceiled so also ceil the prediction for the due date for consistency
                work_day_count = ceil((self.sm.y - new_first_work) / min_work_time_funct_round)

                if not work_day_count or len(self.sm.break_days) == 7:
                    x_num = 1
                elif self.sm.break_days:
                    # Terrible implementation of inversing calcModDays

                    # For reference, look at this:
                    # x    0 1 2 3 4 5 6 7 | 8 9 10 11 12 13 14 | 15 16 17 18 19 20 21
                    # f(x) 0 0 0 0 0 0 3 6 | 6 6 6  6  6  9  12 | 12 12 15
                    # The goal is to find the week before the value and guess and check each day of the next week for the first value that results in x (without not working days)
                    # Pretend x = 5 from the above example, which represents the number of days the user will work or x (without not working days)
                    # For every week in this example, the user works 2 days
                    # So, find how many 2 days fit into x = 5 and multiply that number by 7 

                    # Since we want to find the week before the value, round x down to the nearest (7 - len_nwd), or 2 in this example
                    # that would simplify it to be 7*floor(x/(7-len_nwd))*(7-len_nwd)/(7-len_nwd)
                    # 7*floor(x/(7-len_nwd))
                    
                    # I subtract one at the end of the assignment for the for loop
                    # And I subtract one in the middle of the equation to fix a wrong week bug that isn't worth fixing
                    guess_x = 7 * floor(work_day_count / (7 - len(self.sm.break_days)) - 1) - 1
                    while 1:
                        guess_x += 1
                        # logic stolen from Assignment.funct
                        if guess_x - (guess_x // 7 * len(self.sm.break_days) + mods[guess_x % 7]) == work_day_count:
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
                    self.sm.x = self.sm.x.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.zoneinfo.ZoneInfo(request.utc_offset))
                    x_num = utils.days_between_two_dates(self.sm.x, self.sm.assignment_date)
            else:
                x_num = utils.days_between_two_dates(self.sm.x, self.sm.assignment_date)
            if self.sm.due_time and (self.sm.due_time.hour or self.sm.due_time.minute):
                complete_x_num = Decimal(x_num) + Decimal(self.sm.due_time.hour * 60 + self.sm.due_time.minute) / Decimal(24 * 60)
                x_num += 1
            else:
                complete_x_num = x_num
            adjusted_blue_line = app_utils.adjust_blue_line(request,
                old_data=old_data,
                assignment_date=self.sm.assignment_date,
                x_num=x_num
            )
            self.sm.blue_line_start = adjusted_blue_line['blue_line_start']
            if self.sm.y is None:
                mods = app_utils.calc_mod_days(
                    assignment_date=self.sm.assignment_date,
                    blue_line_start=self.sm.blue_line_start,
                    break_days=self.sm.break_days
                )
                # logic stolen from parabola.js:

                # let x1 = this.sa.complete_x - this.red_line_start_x,
                # x1 -= Math.floor((this.sa.x - this.red_line_start_x) / 7) * this.sa.break_days.length + mods[(this.sa.x - this.red_line_start_x) % 7];
                # if (this.sa.break_days.includes((this.assign_day_of_week + Math.floor(this.sa.complete_x)) % 7)) {
                #     x1 = Math.ceil(x1);
                # }

                complete_work_day_count = complete_x_num - self.sm.blue_line_start
                complete_work_day_count -= floor((x_num - self.sm.blue_line_start) / 7) * len(self.sm.break_days) + mods[(x_num - self.sm.blue_line_start) % 7]
                # first +1 for js
                if str((self.sm.assignment_date.weekday()+1 + floor(complete_x_num)) % 7) in self.sm.break_days:
                    complete_work_day_count = ceil(complete_work_day_count)
                # we need to ceil (the prediction for due date is ceiled so also ceil the prediction for y for consistency) 
                # to the nearest funct_round in the case of fractional values of complete_work_day_count that may not
                # multiply to a multiple of funct_round
                self.sm.y = self.sm.funct_round * ceil((min_work_time_funct_round * complete_work_day_count) / self.sm.funct_round) + first_work
                # if min work time is for example 1 hour and work_day_count is 7 days, the user would ideally want to see
                # unit as "hour" and y as 7 hours instead of "minute" and 420 minutes
                if self.sm.unit == "Minute" and app_utils.should_convert_to_hours(self.sm.y):
                    # so far all in the scope of minutes to define new_min_work_time_funct_round
                    new_unit = "Minute"
                    new_y = self.sm.y
                    new_time_per_unit = Decimal(3600)
                    new_funct_round = Decimal(30)
                    new_min_work_time = self.sm.min_work_time

                    new_min_work_time_funct_round = ceil(self.sm.min_work_time / new_funct_round) * new_funct_round if self.sm.min_work_time else new_funct_round
                    if new_min_work_time_funct_round <= min_work_time_funct_round:
                        # Now convert to scope of hours
                        new_unit = "Hour"
                        new_y = app_utils.minutes_to_hours(new_y)
                        new_time_per_unit = app_utils.minutes_to_hours(new_time_per_unit)
                        new_funct_round = app_utils.minutes_to_hours(new_funct_round)
                        new_min_work_time = app_utils.minutes_to_hours(new_min_work_time)
                        self.sm.unit = new_unit
                        self.sm.y = new_y
                        self.sm.time_per_unit = new_time_per_unit
                        self.sm.funct_round = new_funct_round
                        self.sm.min_work_time = new_min_work_time
                    
                    # In case I need a reference:

                    # # we need to simulate the logic that happens when you first change the unit from minute to hour on
                    # # the frontend

                    # # if (!["hour", undefined].includes(that.old_unit_value)) {
                    # #     $("#funct_round-widget-checkbox").prop("checked", false);
                    # #     $("#id_funct_round").val(30);
                    # # }
                    # # $("#id_time_per_unit").val(1);
                    # # $("#time_per_unit-widget-checkbox").prop("checked", true);
                    # new_funct_round = Decimal(30)
                    # new_time_per_unit = Decimal(1)
                    # # now to simulate the big conversion for loop:
                    # # time_per_unit changes,
                    # new_time_per_unit = app_utils.hours_to_minutes(new_time_per_unit)
                    # # x doesn't change
                    # # y doesn't change
                    # # min_work_time changes,
                    # # Undo the 1 / self.sm.time_per_unit, true original min work time in minutes
                    # self.sm.min_work_time = self.sm.min_work_time * self.sm.time_per_unit
                    # # Redo that but with new_time_per_unit, new min work time in terms of time_per_unit
                    # self.sm.min_work_time = self.sm.min_work_time / new_time_per_unit
                    # # works doesn't change
                    # new_funct_round = app_utils.minutes_to_hours(new_funct_round)

                    # current_min_work_time_funct_round_minutes = min_work_time_funct_round * self.sm.time_per_unit
                    # new_min_work_time_funct_round = ceil(self.sm.min_work_time / new_funct_round) * new_funct_round if self.sm.min_work_time else new_funct_round
                    # new_min_work_time_funct_round_minutes = new_min_work_time_funct_round * new_time_per_unit
                    
            if request.created_assignment or old_data.needs_more_info or adjusted_blue_line['capped_at_x_num']:
                self.sm.dynamic_start = self.sm.blue_line_start
                self.sm.works = [str(first_work)]
            else:
                assert request.updated_assignment
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
                removed_works_start = adjusted_blue_line['removed_works_start']
                removed_works_end = adjusted_blue_line['removed_works_end']
                actual_len_works = removed_works_end + 1 - removed_works_start
                len_works = actual_len_works - 1
                if len_works >= 0:
                    unit_changed_from_hour_to_minute = old_data.unit.lower() in ('hour', 'hours') and self.sm.unit.lower() in ('minute', 'minutes')
                    unit_changed_from_minute_to_hour = old_data.unit.lower() in ('minute', 'minutes') and self.sm.unit.lower() in ('hour', 'hours')
                    # app_utils.minutes_to_hours and app_utils.hours_to_minutes are not needed because i want this to be an accurate conversion
                    if unit_changed_from_hour_to_minute:
                        old_data.works = [str(app_utils.hours_to_minutes(Decimal(i))) for i in old_data.works]
                    elif unit_changed_from_minute_to_hour:
                        old_data.works = [str(app_utils.minutes_to_hours(Decimal(i))) for i in old_data.works]
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

        # This could be too annoying; don't do this

        # # Reset skew ratio if the red line x axis (x - (blue_line_start + leN_works)) or y axis (y - red_line_start_y)
        # # dynamic_start, blue_line_start (both from red_line_start_y), x, works, or y needs to be different
        # if (request.updated_assignment and (
        #         old_data.x != self.sm.x or 
        #         old_data.y != self.sm.y or 
        #         old_data.works != self.sm.works or
        #         old_data.blue_line_start != self.sm.blue_line_start or 
        #         old_data.dynamic_start != self.sm.dynamic_start
        # )):
        #     self.sm.skew_ratio = request.user.settingsmodel.def_skew_ratio

        if self.sm.assignment_date:
            self.sm.assignment_date = self.sm.assignment_date.replace(tzinfo=timezone.utc)
        if self.sm.x:
            self.sm.x = self.sm.x.replace(tzinfo=timezone.utc)
        self.sm.save()
        if request.created_assignment:
            logger.info(f'User \"{request.user}\" created assignment "{self.sm.name}"')
            request.session["just_created_assignment_id"] = self.sm.pk
        else:
            assert request.updated_assignment
            logger.info(f'User \"{request.user}\" updated assignment "{self.sm.name}"')
            request.session['just_updated_assignment_id'] = self.sm.pk
            for field in TRIGGER_DYNAMIC_MODE_RESET_FIELDS:
                # this includes fields from TimewebForm.Meta.exclude
                # keep it like this because form_valid may internally and manually change these fields
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
        if request.created_assignment:
            self.context['submit'] = 'Create Assignment'
        else:
            assert request.updated_assignment
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