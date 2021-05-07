from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import ugettext_lazy as _
from multiselectfield import MultiSelectField
from django.conf import settings
from decimal import Decimal
WEEKDAYS = (
    ("1",_("Monday")),
    ("2",_("Tuesday")),
    ("3",_("Wednesday")),
    ("4",_("Thursday")),
    ("5",_("Friday")),
    ("6",_("Saturday")),
    ("0",_("Sunday"))
)
def default_works():
    return 0

class TimewebModel(models.Model):
    file_sel = models.CharField(
        max_length=100,
        verbose_name=_('Name of this Assignment'),
    )
    ad = models.DateField(
        null=True,
        verbose_name=_('Date Assigned'),
    )
    x = models.DateField(
        null=True,
        blank=True,
        verbose_name=_('Due Date'),
    )
    unit = models.CharField(
        max_length=40,
        default=_("Minute"),
        verbose_name=_('Name of each Unit of Work'),
    )
    y = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(1,_("This field's value can't be less than %(limit_value)s"))],
    )
    works = models.JSONField(
        default=default_works,
    )
    dif_assign = models.IntegerField(
        blank=True,
        null=True,
    )
    skew_ratio = models.DecimalField(
        max_digits=17,
        decimal_places=10,
        blank=True,
        null=True,
    )
    ctime = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"),_("This field's value must be positive"))],
    )
    funct_round = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"),_("This field's value must be positive"))],
        blank=True,
        null=True,
    )
    min_work_time = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"),_("The minimum work time must be positive"))],
        blank=True,
        null=True,
        verbose_name=_('Minimum Daily Work Time in Minutes'),
    )
    nwd = MultiSelectField(
        choices=WEEKDAYS,
        blank=True,
        null=True,
    )
    fixed_mode = models.BooleanField()
    dynamic_start = models.IntegerField(
        null=True,
        blank=True,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    # Return assignment name when calling instance of model
    def __str__(self):
        return self.file_sel

class SettingsModel(models.Model):
    warning_acceptance = models.IntegerField(
        default=50,
        validators=[MinValueValidator(1,_("This field's value must be an integer from 1 to 100")), MaxValueValidator(100,_("This field's value must be an integer from 1 to 100"))],
        verbose_name=_('Warning Threshold'),
    )
    def_min_work_time = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"),_("The default minimum work time must be positive"))],
        blank=True,
        null=True,
        verbose_name=_('Default Minimum Daily Work Time in Minutes'),
    )
    def_skew_ratio = models.DecimalField(
        max_digits=17,
        decimal_places=10,
        default=1,
        verbose_name=_('Default Skew Ratio'),
    )
    def_nwd = MultiSelectField(
        choices=WEEKDAYS,
        blank=True,
        null=True
    )
    def_funct_round_minute = models.BooleanField(
        default=False,
        verbose_name=_('Round to Multiples of 5 Minutes'),
    )
    ignore_ends = models.BooleanField(
        default=False,
        verbose_name=_('Ignore Minimum Work Time Ends'),
    )
    show_progress_bar = models.BooleanField(
        default=False,
        verbose_name=_('Show Graph Progress Bar'),
    )
    show_info_buttons = models.BooleanField(
        default=True,
        verbose_name=_('Show Info Buttons'),
    )
    show_past = models.BooleanField(
        default=True,
        verbose_name=_('Show Past Work Inputs in Text Schedule'),
    )
    color_priority = models.BooleanField(
        default=True,
        verbose_name=_('Display Priority with Color'),
    )
    text_priority = models.BooleanField(
        default=True,
        verbose_name=_('Display Priority with Text'),
    )
    first_login = models.BooleanField(default=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    def __str__(self):
        return self.user.username
