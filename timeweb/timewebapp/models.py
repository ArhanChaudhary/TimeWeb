from django.db import models
from django.core.validators import MinValueValidator
from django.utils.translation import gettext_lazy as _
from multiselectfield import MultiSelectField
from django.conf import settings
from decimal import Decimal
import secrets
import datetime
import pathlib

WEEKDAYS = (
    ("1",_("Mon")),
    ("2",_("Tue")),
    ("3",_("Wed")),
    ("4",_("Thu")),
    ("5",_("Fri")),
    ("6",_("Sat")),
    ("0",_("Sun")),
)
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
    return f"backgrounds/{secrets.token_urlsafe(32)}{pathlib.Path(filename).suffix}"

class TimewebModel(models.Model):
    name = models.CharField(
        max_length=200,
        verbose_name=_('Name of this Assignment'),
    )
    # EVEN THOUGH assignment_date and x are both dates always with times at midnight
    # let's still use a DateTimeField
    # DateTimeField simplifies a lot of timezone handling logic
    # and also ensures every date object is timezone aware and is a datetime.datetime instance
    # so comparing them is easier (datetime.date doesn't have __gt__ etc. with datetime.datetime)
    assignment_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Date Assigned'),
    )
    # Soft must be before in the assignment form for positioning
    soft = models.BooleanField(
        default=False,
    )
    x = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Due Date'),
    )
    due_time = models.TimeField(
        null=True,
        blank=True,
    )
    y = models.DecimalField(
        null=True,
        blank=True,
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"),_("This field's value must be positive"))],
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
    description = models.TextField(
        null=True,
        blank=True,
        verbose_name=_('Assignment Description'),
    )
    unit = models.CharField(
        null=True,
        blank=True,
        max_length=40,
        verbose_name=_('Name of each Unit of Work'),
    )
    time_per_unit = models.DecimalField(
        blank=True,
        null=True,
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"),_("This field's value must be positive"))],
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
        validators=[MinValueValidator(Decimal("0"),_("The minimum work time must be positive or zero"))],
        blank=True,
        null=True,
        verbose_name=_('Minimum Daily Work Time'),
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
    google_classroom_assignment_link = models.URLField(
        null=True,
        blank=True,
    )
    has_alerted_due_date_passed_notice = models.BooleanField(
        default=False,
    )
    alert_due_date_incremented = models.BooleanField(
        default=False,
    )
    hidden = models.BooleanField(
        default=False,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        # allow save assignment form validation without a user
        null=True,
        blank=True,
    )
    def __str__(self):
        return self.name
