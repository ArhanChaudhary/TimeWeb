from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.utils.translation import gettext_lazy as _
from django.utils import timezone as _timezone
from colorfield.fields import ColorField
from multiselectfield import MultiSelectField
from timezone_field import TimeZoneField
from timewebapp.models import empty_list, empty_dict, create_image_path, WEEKDAYS

HORIZONTAL_TAG_POSITIONS = (
    ("Left", "Left"),
    ("Middle", "Middle"),
    ("Right", "Right"),
)
MAX_HORIZONTAL_TAG_POSITIONS_LENGTH = len(max([i[1] for i in HORIZONTAL_TAG_POSITIONS], key=len))

VERTICAL_TAG_POSITIONS = (
    ("Top", "Top"),
    ("Bottom", "Bottom"),
)
MAX_VERTICAL_TAG_POSITIONS_LENGTH = len(max([i[1] for i in VERTICAL_TAG_POSITIONS], key=len))

ASSIGNMENT_SORTINGS = (
    ("Most Priority First", "Most Priority First"),
    ("Least Priority First", "Least Priority First"),
    ("Most Work Today First", "Most Work Today First"),
    ("Least Work Today First", "Least Work Today First"),
    ("Soonest Due Date First", "Soonest Due Date First"),
    ("Tag Name A-Z", "Tag Name A-Z"),
    ("Tag Name Z-A", "Tag Name Z-A")
)
MAX_ASSIGNMENT_SORTINGS_LENGTH = len(max([i[1] for i in ASSIGNMENT_SORTINGS], key=len))

ANIMATION_SPEED = (
    ("1", "Normal (1x)"),
    ("0.5", "Fast (2x)"),
    ("0", "None (No animation)"),
)
MAX_ANIMATION_SPEED_LENGTH = len(max([i[1] for i in ANIMATION_SPEED], key=len))

APPEARANCES = (
    ("automatic", "Sync with device"),
    ("light", "Light Mode"),
    ("dark", "Dark Mode"),
    ("lesser dark", "Lesser Dark Mode"),
)
MAX_APPEARANCES_LENGTH = len(max([i[1] for i in APPEARANCES], key=len))

class SettingsModel(models.Model):

    # Group "Assignment Deletion"
    immediately_delete_completely_finished_assignments = models.BooleanField(
        default=False,
        verbose_name=_('Immediately Delete Completely Finished Assignments'),
    )

    # Group "Assignment Form"
    def_min_work_time = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"), _("This setting can't be a negative number"))],
        default=15,
        blank=True,
        null=True,
        verbose_name=_('Default Minimum Daily Work Time'),
    )
    def_break_days = MultiSelectField(
        choices=WEEKDAYS,
        blank=True,
        null=True,
        verbose_name=_('Default Work Days'),
    )

    # Group "Assignment Graph"
    def_skew_ratio = models.DecimalField(
        max_digits=17,
        decimal_places=10,
        default=1,
        verbose_name=_('Default Curvature'),
    )
    loosely_enforce_minimum_work_times = models.BooleanField(
        default=False,
        verbose_name=_('Loosely Enforce Minimum Work Times'),
    )
    one_graph_at_a_time = models.BooleanField(
        default=False,
        verbose_name=_('Allow Only One Open Graph at a Time'),
    )
    close_graph_after_work_input = models.BooleanField(
        default=False,
        verbose_name=_('Close Graph After Submitting Work Input'),
    )

    # Group "Assignment Priority"
    show_priority = models.BooleanField(
        default=True,
        verbose_name=_('Show Priority'),
    )
    highest_priority_color = ColorField(
        default="#e8564a",
        verbose_name=_('Highest Priority Color'),
    )
    lowest_priority_color = ColorField(
        default="#84d336",
        verbose_name=_('Lowest Priority Color'),
    )
    assignment_sorting = models.CharField(
        max_length=MAX_ASSIGNMENT_SORTINGS_LENGTH,
        choices=ASSIGNMENT_SORTINGS,
        default=("Normal"),
        verbose_name=_('Assignment Sorting: '),
    )
    
    # Group "Assignment Header"
    default_dropdown_tags = models.JSONField(
        default=empty_list,
        blank=True,
        verbose_name=_('Default Dropdown Tags'),
    )
    horizontal_tag_position = models.CharField(
        max_length=MAX_HORIZONTAL_TAG_POSITIONS_LENGTH,
        choices=HORIZONTAL_TAG_POSITIONS,
        default=_("Middle"),
        verbose_name=_('Horizontal Assignment Tag Position'),
    )
    vertical_tag_position = models.CharField(
        max_length=MAX_VERTICAL_TAG_POSITIONS_LENGTH,
        choices=VERTICAL_TAG_POSITIONS,
        default=_("Top"),
        verbose_name=_('Vertical Assignment Tag Position'),
    )

    # Group "Personalize"
    appearance = models.CharField(
        max_length=MAX_APPEARANCES_LENGTH,
        choices=APPEARANCES,
        default=_("automatic"),
        verbose_name=_('Appearance'),
    )
    background_image = models.ImageField(
        upload_to=create_image_path,
        null=True,
        blank=True,
        verbose_name=_('Background Image'),
    )
    animation_speed = models.CharField(
        max_length=MAX_ANIMATION_SPEED_LENGTH,
        choices=ANIMATION_SPEED,
        default=_("1"),
        verbose_name=_('Animation Speed'),
    )

    # Group "Miscellaneous"
    enable_tutorial = models.BooleanField(
        default=True,
        verbose_name=_('Tutorial'),
    )
    sorting_animation_threshold = models.IntegerField(
        default=50,
        validators=[MinValueValidator(0, _("This setting can't be a negative number"))],
        verbose_name=_('Sorting Animation Threshold'),
    )
    timezone = TimeZoneField(
        null=True,
        blank=True,
    )

    # Hidden
    oauth_token = models.JSONField(
        default=empty_dict,
        blank=True,
    )
    added_gc_assignment_ids = models.JSONField(
        default=empty_list,
        blank=True,
    )
    gc_courses_cache = models.JSONField(
        default=empty_list,
        blank=True,
    )
    seen_latest_changelog = models.BooleanField(
        default=True,
    )
    nudge_calendar = models.BooleanField(
        default=False,
    )
    nudge_notifications = models.BooleanField(
        default=False,
    )
    nudge_canvas = models.BooleanField(
        default=False,
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        # allow change setting form validation without a user
        null=True,
        blank=True,
    )
    device_uuid = models.CharField(
        max_length=8,
        null=True,
        blank=True,
    )
    device_uuid_api_timestamp = models.DateTimeField(
        null=True,
        blank=True,
        default=_timezone.now,
    )
    def __str__(self):
        return self.user.username
