# In the future I should probably switch all my view classes to FormView

from django.shortcuts import reverse
from django.conf import settings
from django.contrib.auth.mixins import LoginRequiredMixin
from django.forms.models import model_to_dict
from django.contrib.auth import logout, login
from django.http import QueryDict
from django.utils.decorators import method_decorator
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from django.utils.translation import gettext as _
from ratelimit.decorators import ratelimit

from .models import TimewebModel
from navbar.models import SettingsModel
from common.models import User
from common.views import logger, CHANGELOGS, TimewebGenericView
import common.utils as utils

import datetime

MAX_TAG_LENGTH = 100
MAX_NUMBER_OF_TAGS = 5
EXAMPLE_ASSIGNMENT = {
    "name": "Read a Book",
    "x": 20, # Not the db value of x, in this case is just the number of days in the assignment
    "unit": "Chapter",
    "y": 25,
    "blue_line_start": 0,
    "skew_ratio": 1,
    "time_per_unit": 20,
    "funct_round": 1,
    "min_work_time": 2,
    "break_days": [],
    "dynamic_start": 0,
}
# needs to be down here due to circular imports
from .forms import TimewebForm
from navbar.forms import SettingsForm
DELETED_ASSIGNMENTS_PER_PAGE = 50

INCLUDE_IN_SETTINGS_MODEL_JSON_SCRIPT = (
    'immediately_delete_completely_finished_assignments', 'def_min_work_time', 'def_break_days',
    'def_skew_ratio', 'loosely_enforce_minimum_work_times', 'one_graph_at_a_time',
    'close_graph_after_work_input', 'show_priority', 'highest_priority_color', 'lowest_priority_color',
    'assignment_sorting', 'default_dropdown_tags', 'display_working_days_left',
    'horizontal_tag_position', 'vertical_tag_position', 'animation_speed',  'enable_tutorial',
    'sorting_animation_threshold', 'seen_latest_changelog', 'should_alert_due_date_incremented',
)
EXCLUDE_FROM_SETTINGS_MODEL_JSON_SCRIPT = (
    "oauth_token", "added_gc_assignment_ids", "user", "background_image", "id", "nudge_calendar",
    "nudge_notifications", "nudge_canvas", "device_uuid", "device_uuid_api_timestamp",
    "gc_courses_cache", "gc_assignments_always_midnight", "background_image_text_shadow_width",
    "appearance", "priority_color_borders", "font"
)

assert len(INCLUDE_IN_SETTINGS_MODEL_JSON_SCRIPT) + len(EXCLUDE_FROM_SETTINGS_MODEL_JSON_SCRIPT) == len(SettingsModel._meta.fields), "update this list"

EXCLUDE_FROM_ASSIGNMENT_MODELS_JSON_SCRIPT = (
    "user", "hidden",
)
INCLUDE_IN_ASSIGNMENT_MODELS_JSON_SCRIPT = (
    "assignment_date", "x", "due_time", "blue_line_start", "y", "min_work_time", "time_per_unit",
    "works", "funct_round", "break_days", "skew_ratio", "fixed_mode", "dynamic_start", "id", "name",
    "soft", "unit", "description", "tags", "is_google_classroom_assignment",
    "alert_due_date_incremented", "dont_hide_again", "deletion_time", "needs_more_info",
    "external_link",
)

assert len(INCLUDE_IN_ASSIGNMENT_MODELS_JSON_SCRIPT) + len(EXCLUDE_FROM_ASSIGNMENT_MODELS_JSON_SCRIPT) == len(TimewebModel._meta.fields), "update this list"

def create_example_assignment(instance):
    date_now = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    TimewebModel.objects.create(**EXAMPLE_ASSIGNMENT | {
        "assignment_date": date_now,
        "x": date_now + datetime.timedelta(EXAMPLE_ASSIGNMENT["x"]),
        "user": instance,
    })

@receiver(post_save, sender=User)
def create_settings_model_and_example(sender, instance, created, **kwargs):
    if not created: return
    # ensure this is UTC for assignment_date and x
    # The front end adjusts the assignment and due date, so we don't need to worry about this being accurate
    create_example_assignment(instance)
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

        self.context['settings_model_as_json'] = model_to_dict(request.user.settingsmodel, exclude=EXCLUDE_FROM_SETTINGS_MODEL_JSON_SCRIPT)
        self.context['settings_model_as_json']['gc_integration_enabled'] = 'token' in request.user.settingsmodel.oauth_token

        if not request.user.settingsmodel.seen_latest_changelog:
            self.context['latest_changelog'] = CHANGELOGS[0]

    def get(self, request):
        if request.path == reverse("deleted_assignments"):
            self.add_user_models_to_context(request, view_hidden=True)
            self.context["view_deleted_assignments_in_app_view"] = True
        else:
            self.add_user_models_to_context(request, view_hidden=False)
            self.context['settings_form'] = SettingsForm(initial={ # unbound form
                'assignment_sorting': request.user.settingsmodel.assignment_sorting,
            })

            # adds ".animate-in" or ".animate-color" to the assignment whose form was submitted
            if request.session.get("just_created_assignment_id"):
                self.context['just_created_assignment_id'] = request.session.pop("just_created_assignment_id")
            elif request.session.get("just_updated_assignment_id"):
                self.context['just_updated_assignment_id'] = request.session.pop("just_updated_assignment_id")
            if request.session.get("refresh_dynamic_mode"):
                self.context['refresh_dynamic_mode'] = request.session.pop("refresh_dynamic_mode")








            # REMOVE!!!!!!





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