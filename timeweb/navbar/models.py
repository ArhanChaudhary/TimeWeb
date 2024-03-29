from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator

from colorfield.fields import ColorField
from multiselectfield import MultiSelectField
from multiselectfield.utils import get_max_length
from encrypted_json_fields.fields import EncryptedJSONField, EncryptedCharField

from timewebapp.models import (
    empty_list,
    empty_dict,
    create_image_path,
    WEEKDAYS,
    TimewebModel
)

from decimal import Decimal

HORIZONTAL_TAG_POSITIONS = (
    ("Left", "Left"),
    ("Middle", "Middle"),
    ("Right", "Right"),
)
MAX_HORIZONTAL_TAG_POSITIONS_LENGTH = len(max([i[0] for i in HORIZONTAL_TAG_POSITIONS], key=len))

VERTICAL_TAG_POSITIONS = (
    ("Top", "Top"),
    ("Bottom", "Bottom"),
)
MAX_VERTICAL_TAG_POSITIONS_LENGTH = len(max([i[0] for i in VERTICAL_TAG_POSITIONS], key=len))

ASSIGNMENT_SORTINGS = (
    ("Most Priority First", "Most Priority First"),
    ("Least Priority First", "Least Priority First"),
    ("Most Work Today First", "Most Work Today First"),
    ("Least Work Today First", "Least Work Today First"),
    ("Soonest Due Date First", "Soonest Due Date First"),
    ("Tag Name A-Z", "Tag Name A-Z"),
    ("Tag Name Z-A", "Tag Name Z-A")
)
MAX_ASSIGNMENT_SORTINGS_LENGTH = len(max([i[0] for i in ASSIGNMENT_SORTINGS], key=len))

BACKGROUND_IMAGE_TEXT_SHADOW_WIDTH = (
    ("none", "None"),
    ("thin", "Thin"),
    ("normal", "Normal"),
    ("thick", "Thick"),
)
MAX_BACKGROUND_IMAGE_TEXT_SHADOW_WIDTH_LENGTH = len(max([i[0] for i in BACKGROUND_IMAGE_TEXT_SHADOW_WIDTH], key=len))

ANIMATION_SPEED = (
    ("1", "Normal (1x)"),
    ("0.5", "Fast (2x)"),
    ("0", "None (No animation)"),
)
MAX_ANIMATION_SPEED_LENGTH = len(max([i[0] for i in ANIMATION_SPEED], key=len))

APPEARANCES = (
    ("automatic", "Sync with device"),
    ("light", "Light Mode"),
    ("dark", "Dark Mode"),
    ("lesser dark", "Lesser Dark Mode"),
)
MAX_APPEARANCES_LENGTH = len(max([i[0] for i in APPEARANCES], key=len))

FONTS = (
    ("opensans", "Open Sans"),
    ("montserrat", "Montserrat"),
)

MAX_FONTS_LENGTH = len(max([i[0] for i in FONTS], key=len))

MAX_CANVAS_TOKEN_LENGTH = 69

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
        max_length=get_max_length(WEEKDAYS, None),
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

    # Group "Assignment Header"
    show_priority = models.BooleanField(
        default=True,
        verbose_name=_('Display Priority'),
    )
    display_working_days_left = models.BooleanField(
        default=False,
        verbose_name=('Display Number of Working Days Left'),
    )
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

    # Group "Appearance"
    appearance = models.CharField(
        max_length=MAX_APPEARANCES_LENGTH,
        choices=APPEARANCES,
        default=_("dark"),
        verbose_name=_('Color Scheme'),
    )
    font = models.CharField(
        max_length=MAX_FONTS_LENGTH,
        choices=FONTS,
        default=_("opensans"),
        verbose_name=_('Font'),
    )
    highest_priority_color = ColorField(
        default="#e8564a",
        verbose_name=_('Highest Priority Color'),
    )
    lowest_priority_color = ColorField(
        default="#84d336",
        verbose_name=_('Lowest Priority Color'),
    )
    priority_color_borders = models.BooleanField(
        default=False,
        verbose_name=_('Priority Color Borders'),
    )
    background_image = models.ImageField(
        upload_to=create_image_path,
        null=True,
        blank=True,
        verbose_name=_('Background Image'),
    )
    background_image_text_shadow_width = models.CharField(
        max_length=MAX_BACKGROUND_IMAGE_TEXT_SHADOW_WIDTH_LENGTH,
        choices=BACKGROUND_IMAGE_TEXT_SHADOW_WIDTH,
        default=_("normal"),
        verbose_name=_('Background Image Text Shadow Width'),
    )

    # Group "Miscellaneous"
    enable_tutorial = models.BooleanField(
        default=True,
        verbose_name=_('Tutorial'),
    )
    animation_speed = models.CharField(
        max_length=MAX_ANIMATION_SPEED_LENGTH,
        choices=ANIMATION_SPEED,
        default=_("1"),
        verbose_name=_('Animation Speed'),
    )
    sorting_animation_threshold = models.IntegerField(
        default=50,
        validators=[MinValueValidator(0, _("This setting can't be a negative number"))],
        verbose_name=_('Sorting Animation Threshold'),
    )
    should_alert_due_date_incremented = models.BooleanField(
        default=True,
        verbose_name=_('Alert Soft Due Date Incremented'),
    )
    gc_assignments_always_midnight = models.BooleanField(
        default=False,
        verbose_name=_('Google Classroom 11:59 PM Due Time Fix'),
    )

    # Hidden
    assignment_sorting = models.CharField(
        max_length=MAX_ASSIGNMENT_SORTINGS_LENGTH,
        choices=ASSIGNMENT_SORTINGS,
        default=_("Most Priority First"),
        verbose_name=_('Sorting: '),
    )
    # Custom field validation in views: hardcoded enable or disable in change_setting
    # note that existing unencryped fields before this json field was changed to encrypted
    # will be compatible with the new encrypted field; that is decrypt_values on an
    # unencrypted data type will simply just return the same value courtesy of the author
    # of django-encrypted-json-fields :)
    gc_token = EncryptedJSONField(
        default=empty_dict,
        blank=True,
    )
    # Custom field validation in views: excluded in SettingsForm.Meta.exclude in change_setting
    added_gc_assignment_ids = models.JSONField(
        default=empty_list,
        blank=True,
    )
    # Custom field validation in views: excluded in SettingsForm.Meta.exclude in change_setting
    gc_courses_cache = models.JSONField(
        default=empty_list,
        blank=True,
    )
    canvas_token = EncryptedJSONField(
        default=empty_dict,
        blank=True,
    )
    added_canvas_assignment_ids = models.JSONField(
        default=empty_list,
        blank=True,
    )
    canvas_courses_cache = models.JSONField(
        default=empty_list,
        blank=True,
    )
    canvas_instance_domain = models.CharField(
        max_length=255,
        null=True,
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
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        # allow change setting form validation without a user
        null=True,
        blank=True,
    )
    example_assignment = models.OneToOneField(
        TimewebModel,
        on_delete=models.SET_NULL,
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
        default=timezone.now,
    )
    def __str__(self):
        return self.user.username
