from django.db import models
from django.core.validators import MinValueValidator
from django.utils.translation import ugettext_lazy as _
from multiselectfield import MultiSelectField
from django.conf import settings
from colorfield.fields import ColorField
from decimal import Decimal
import datetime

WEEKDAYS = (
    ("1",_("Monday")),
    ("2",_("Tuesday")),
    ("3",_("Wednesday")),
    ("4",_("Thursday")),
    ("5",_("Friday")),
    ("6",_("Saturday")),
    ("0",_("Sunday")),
)
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

ASSIGNMENT_SPACINGS = (
    ("Comfy", "Comfy"),
    ("Compact", "Compact"),
)
MAX_ASSIGNMENT_SPACINGS_LENGTH = len(max([i[1] for i in ASSIGNMENT_SPACINGS], key=len))

ANIMATION_SPEED = (
    ("1", "Normal (1x)"),
    ("0.5", "Fast (2x)"),
    ("0", "None (No animation)"),
)
MAX_ANIMATION_SPEED_LENGTH = len(max([i[1] for i in ANIMATION_SPEED], key=len))

def default_works():
    return 0
def empty_list():
    return []
def list_with_zero():
    return ["0"]
def empty_dict():
    return {}
def get_midnight_time():
    return datetime.time(0, 0, 0)
def create_image_path(instance, filename):
    return f"backgrounds/{instance.user.username}/{filename}"
class TimewebModel(models.Model):
    name = models.CharField(
        max_length=200,
        verbose_name=_('Name of this Assignment'),
    )
    assignment_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Date Assigned'),
    )
    x = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Due Date'),
    )
    due_time = models.TimeField(
        null=True,
        blank=True,
        verbose_name=_(' '),
    )
    soft = models.BooleanField(
        default=False,
    )
    unit = models.CharField(
        null=True,
        blank=True,
        max_length=40,
        verbose_name=_('Name of each Unit of Work'),
    )
    y = models.DecimalField(
        null=True,
        blank=True,
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(1,_("This field's value can't be less than %(limit_value)s"))],
    )
    blue_line_start = models.IntegerField(
        blank=True,
        null=True,
    )
    skew_ratio = models.DecimalField(
        max_digits=17,
        decimal_places=10,
        blank=True,
        null=True,
    )
    time_per_unit = models.DecimalField(
        blank=True,
        null=True,
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"),_("This field's value must be positive"))],
    )
    description = models.TextField(
        null=True,
        blank=True,
        verbose_name=_('Assignment Description'),
    )
    works = models.JSONField(
        default=list_with_zero,
        blank=True,
    )
    funct_round = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"),_("This field's value must be positive"))],
        blank=True,
        null=True,
        verbose_name=_('Step Size'),
    )
    min_work_time = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"),_("The minimum work time must be positive"))],
        blank=True,
        null=True,
        verbose_name=_('Minimum Daily Work Time in Minutes'),
    )
    break_days = MultiSelectField(
        choices=WEEKDAYS,
        blank=True,
        null=True,
        verbose_name=_('Working Days'),
    )
    fixed_mode = models.BooleanField(
        default=False,
    )
    # Though this can be calculated from using the data from the other fields, I'll keep this as a field to increase client side speed (because it will need to be redefined for every loop in priority.js)
    dynamic_start = models.IntegerField(
        null=True,
        blank=True,
    )
    mark_as_done = models.BooleanField(
        default=False,
    )
    tags = models.JSONField(
        default=empty_list,
        blank=True,
    )
    needs_more_info = models.BooleanField(
        default=False,
    )
    is_google_classroom_assignment = models.BooleanField(
        default=False,
    )
    has_alerted_due_date_passed_notice = models.BooleanField(
        default=False,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    def __str__(self):
        return self.name

class SettingsModel(models.Model):

    # Group "Assignment Form"
    def_break_days = MultiSelectField(
        choices=WEEKDAYS,
        blank=True,
        null=True,
        verbose_name=_('Default Break Days'),
    )
    def_min_work_time = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"),_("The default minimum work time must be positive"))],
        default=15,
        blank=True,
        null=True,
        verbose_name=_('Default Minimum Daily Work Time in Minutes'),
    )
    def_due_time = models.TimeField(
        default=get_midnight_time,
        verbose_name=_('Default Due Time'),
    )
    def_unit_to_minute = models.BooleanField(
        default=False,
        verbose_name=_('Default Unit of Work to "Minute"'),
    )
    def_funct_round_minute = models.BooleanField(
        default=False,
        verbose_name=_('Round to Multiples of 5 Minutes'),
    )

    # Group "Assignment Graph"
    def_skew_ratio = models.DecimalField(
        max_digits=17,
        decimal_places=10,
        default=1,
        verbose_name=_('Default Curvature'),
    )
    ignore_ends = models.BooleanField(
        default=False,
        verbose_name=_('Ignore Minimum Work Time Ends'),
    )
    use_in_progress = models.BooleanField(
        default=False,
        verbose_name=_('Enter Work inputs In-Place after Today'),
    )
    one_graph_at_a_time = models.BooleanField(
        default=False,
        verbose_name=_('Allow Only one open Graph at a Time'),
    )
    close_graph_after_work_input = models.BooleanField(
        default=False,
        verbose_name=_('Close Graph After Submitting Work Input'),
    )
    show_progress_bar = models.BooleanField(
        default=True,
        verbose_name=_('Show Graph Progress Bar'),
    )

    # Group "Assignment Priority"
    reverse_sorting = models.BooleanField(
        default=False,
        verbose_name=_('Sort Assignments in Reverse'),
    )
    highest_priority_color = ColorField(
        default="#e8564a",
        verbose_name=_('Highest Priority Color'),
    )
    lowest_priority_color = ColorField(
        default="#84d336",
        verbose_name=_('Lowest Priority Color'),
    )
    color_priority = models.BooleanField(
        default=True,
        verbose_name=_('Show Priority Colors'),
    )
    text_priority = models.BooleanField(
        default=True,
        verbose_name=_('Show Priority Text'),
    )
    
    # Group "Assignment Header"
    assignment_spacing = models.CharField(
        max_length=MAX_ASSIGNMENT_SPACINGS_LENGTH,
        choices=ASSIGNMENT_SPACINGS,
        default=("Comfy"),
        verbose_name=_('Assignment Spacing'),
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

    # Group "Personalize"
    background_image = models.ImageField(
        upload_to=create_image_path,
        null=True,
        blank=True,
        verbose_name=_('Background Image'),
    )
    dark_mode = models.BooleanField(
        default=False,
        verbose_name=_('Dark Mode'),
    )
    animation_speed = models.CharField(
        max_length=MAX_ANIMATION_SPEED_LENGTH,
        choices=ANIMATION_SPEED,
        default=_("Normal"),
        verbose_name=_('Animation Speed'),
    )
    restore_gc_assignments = models.BooleanField(
        default=False,
        verbose_name=_('Restore Deleted Google Classroom Assignments'),
    )
    enable_tutorial = models.BooleanField(
        default=True,
        verbose_name=_('Enable Tutorial'),
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
    seen_latest_changelog = models.BooleanField(
        default=True,
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    def __str__(self):
        return self.user.username
