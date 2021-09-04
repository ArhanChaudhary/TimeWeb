from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import ugettext_lazy as _
from multiselectfield import MultiSelectField
from django.conf import settings
from colorfield.fields import ColorField
from decimal import Decimal

WEEKDAYS = (
    ("1",_("Monday")),
    ("2",_("Tuesday")),
    ("3",_("Wednesday")),
    ("4",_("Thursday")),
    ("5",_("Friday")),
    ("6",_("Saturday")),
    ("0",_("Sunday")),
)
TAG_POSITIONS = (
    ("Left", "Left"),
    ("Middle", "Middle"),
    ("Right", "Right"),
)
MAX_TAG_POSITIONS_LENGTH = len(max([i[0] for i in TAG_POSITIONS], key=len))
def default_works():
    return 0
def empty_list():
    return []
def empty_dict():
    return {}
def create_image_path(instance, filename):
    return f"images/{instance.user.username}/{filename}"
class TimewebModel(models.Model):
    name = models.CharField(
        max_length=200,
        verbose_name=_('Name of this Assignment'),
    )
    assignment_date = models.DateTimeField(
        null=True,
        verbose_name=_('Date Assigned'),
    )
    x = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Due Date'),
    )
    unit = models.CharField(
        max_length=40,
        verbose_name=_('Name of each Unit of Work'),
    )
    y = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(1,_("This field's value can't be less than %(limit_value)s"))],
    )
    works = models.JSONField(
        default=empty_list,
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
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"),_("This field's value must be positive"))],
    )
    description = models.TextField(
        null=True,
        blank=True,
        verbose_name=_('Assignment Description'),
    )
    funct_round = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"),_("This field's value must be positive"))],
        default=1,
        blank=True,
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
        blank=True,
        null=True,
        verbose_name=_('Default Minimum Daily Work Time in Minutes'),
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
        verbose_name=_('Default Skew Ratio'),
    )
    ignore_ends = models.BooleanField(
        default=False,
        verbose_name=_('Ignore Minimum Work Time Ends'),
    )
    show_progress_bar = models.BooleanField(
        default=False,
        verbose_name=_('Show Graph Progress Bar'),
    )

    # Group "Assignment Priority"
    highest_priority_color = ColorField(
        default="#e25b50",
        verbose_name=_('Highest Priority Color'),
    )
    lowest_priority_color = ColorField(
        default="#84c841",
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
    
    # Group "Personalize"
    tag_position = models.CharField(
        max_length=MAX_TAG_POSITIONS_LENGTH,
        choices=TAG_POSITIONS,
        default=_("Middle"),
        verbose_name=_('Assignment Tag Position'),
    )
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
    
    # No group
    enable_tutorial = models.BooleanField(
        default=True,
        verbose_name=_('Enable Tutorial'),
    )

    oauth_token = models.JSONField(
        default=empty_dict,
        blank=True,
    )
    added_gc_assignment_ids = models.JSONField(
        default=empty_list,
        blank=True,
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    def __str__(self):
        return self.user.username
