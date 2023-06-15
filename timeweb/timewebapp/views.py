# In the future I should probably switch all my view classes to FormView

from django.shortcuts import reverse
from django.conf import settings
from django.contrib.auth.mixins import LoginRequiredMixin
from django.forms.models import model_to_dict
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
DELETED_ASSIGNMENTS_PER_PAGE = 50
try:
    EXAMPLE_ACCOUNT_MODEL = User.objects.get(email=settings.EXAMPLE_ACCOUNT_EMAIL)
except:
    EXAMPLE_ACCOUNT_MODEL = None

# needs to be down here due to circular imports
from .forms import TimewebForm
from navbar.forms import SettingsForm

INCLUDE_IN_SETTINGS_MODEL_JSON_SCRIPT = (
    'immediately_delete_completely_finished_assignments', 'def_min_work_time', 'def_break_days',
    'def_skew_ratio', 'loosely_enforce_minimum_work_times', 'one_graph_at_a_time',
    'close_graph_after_work_input', 'show_priority', 'highest_priority_color', 'lowest_priority_color',
    'assignment_sorting', 'default_dropdown_tags', 'display_working_days_left',
    'horizontal_tag_position', 'vertical_tag_position', 'animation_speed',  'enable_tutorial',
    'sorting_animation_threshold', 'seen_latest_changelog', 'should_alert_due_date_incremented',
    'example_assignment',
)
EXCLUDE_FROM_SETTINGS_MODEL_JSON_SCRIPT = (
    "gc_token", "added_gc_assignment_ids", "user", "background_image", "id", "nudge_calendar",
    "nudge_notifications", "device_uuid", "device_uuid_api_timestamp",
    "gc_courses_cache", "gc_assignments_always_midnight", "background_image_text_shadow_width",
    "appearance", "priority_color_borders", "font", "canvas_token", "added_canvas_assignment_ids",
    "canvas_courses_cache", "canvas_instance_domain",
)

assert len(INCLUDE_IN_SETTINGS_MODEL_JSON_SCRIPT) + len(EXCLUDE_FROM_SETTINGS_MODEL_JSON_SCRIPT) == len(SettingsModel._meta.fields), "update this list"

EXCLUDE_FROM_ASSIGNMENT_MODELS_JSON_SCRIPT = (
    "user", "hidden",
)
INCLUDE_IN_ASSIGNMENT_MODELS_JSON_SCRIPT = (
    "assignment_date", "x", "due_time", "blue_line_start", "y", "min_work_time", "time_per_unit",
    "works", "funct_round", "break_days", "skew_ratio", "fixed_mode", "dynamic_start", "id", "name",
    "soft", "unit", "description", "tags", "is_gc_assignment",
    "alert_due_date_incremented", "dont_hide_again", "deletion_time", "needs_more_info",
    "external_link", "is_integration_assignment", "is_canvas_assignment",
)

assert len(INCLUDE_IN_ASSIGNMENT_MODELS_JSON_SCRIPT) + len(EXCLUDE_FROM_ASSIGNMENT_MODELS_JSON_SCRIPT) == len(TimewebModel._meta.fields), "update this list"

@receiver(post_save, sender=User)
def create_user_settings_model(sender, instance, created, **kwargs):
    if not created:
        return
    SettingsModel.objects.create(user=instance)

def append_default_context(request):
    context = {
        "EXAMPLE_ACCOUNT_EMAIL": settings.EXAMPLE_ACCOUNT_EMAIL,
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
        # we have to force user.timewebmodel_set.all() to non lazily evaluate or else it executes once to seralize it
        # and another in the html
        if view_hidden:
            timewebmodels = list(self.user.timewebmodel_set.filter(hidden=True).order_by("-deletion_time"))
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
            timewebmodels = list(self.user.timewebmodel_set.filter(hidden=False))
            if self.user.settingsmodel.enable_tutorial:
                date_now = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
                example_assignment = TimewebModel(
                    name="Read a Book",
                    assignment_date=date_now,
                    x=date_now + datetime.timedelta(20),
                    unit="Chapter",
                    y=25,
                    blue_line_start=0,
                    skew_ratio=1,
                    time_per_unit=20,
                    funct_round=1,
                    min_work_time=2,
                    break_days=[],
                    dynamic_start=0,
                    user=self.user,
                )
                example_assignment.save()
                timewebmodels.append(example_assignment)
                if self.user.settingsmodel.example_assignment != example_assignment:
                    self.user.settingsmodel.example_assignment = example_assignment
                    self.user.settingsmodel.save()
        self.context['assignment_models'] = timewebmodels
        self.context['assignment_models_as_json'] = [model_to_dict(i, exclude=EXCLUDE_FROM_ASSIGNMENT_MODELS_JSON_SCRIPT) for i in timewebmodels]

        self.context['settings_model_as_json'] = model_to_dict(self.user.settingsmodel, exclude=EXCLUDE_FROM_SETTINGS_MODEL_JSON_SCRIPT)
        self.context['settings_model_as_json']['gc_integration_enabled'] = 'token' in self.user.settingsmodel.gc_token

        if not self.user.settingsmodel.seen_latest_changelog:
            self.context['latest_changelog'] = CHANGELOGS[0]

    def get(self, request):
        if self.user is None:
            self.user = request.user
        if request.path in (reverse("deleted_assignments"), reverse("example_deleted_assignments")):
            self.add_user_models_to_context(request, view_hidden=True)
            self.context["VIEWING_DELETED_ASSIGNMENTS"] = True
        else:
            self.add_user_models_to_context(request, view_hidden=False)
            self.context['settings_form'] = SettingsForm(initial={ # unbound form
                'assignment_sorting': self.user.settingsmodel.assignment_sorting,
            })
        self.context['form'] = TimewebForm(request=request)
        logger.info(f'User \"{self.user}\" is now viewing the home page')
        return super().get(request)

class ExampleAccountView(TimewebView):
    # Ignore LoginRequiredMixin
    def __init__(self):
        super(ExampleAccountView, self).__init__()
        self.user = EXAMPLE_ACCOUNT_MODEL
        self.context['user'] = self.user

    def dispatch(self, *args, **kwargs):
        return super(LoginRequiredMixin, self).dispatch(*args, **kwargs)

# needs to be down here due to circular imports
from .urls import RELOAD_VIEWS