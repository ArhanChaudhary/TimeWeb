from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import ugettext_lazy as _
from multiselectfield import MultiSelectField
from django.conf import settings
WEEKDAYS = (("1",_("Monday")),
                ("2",_("Tuesday")),
                ("3",_("Wednesday")),
                ("4",_("Thursday")),
                ("5",_("Friday")),
                ("6",_("Saturday")),
                ("0",_("Sunday")))
def default_works():
    return 0

class TimewebModel(models.Model):
    file_sel = models.CharField(
        max_length=100,
        verbose_name=_('Enter the Name of this Assignment'),
    )
    ad = models.DateField(
        null=True,
        verbose_name=_('Enter the Assignment Date'),
    )
    x = models.DateField(
        null=True,
        blank=True,
        verbose_name=_('Enter the Due Date'),
    )
    unit = models.CharField(
        max_length=40,
        default=_("Minute"),
        verbose_name=_('Enter the Name of each Unit of Work'),
    )
    y = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(1.00,_("This value cannot be less than %(limit_value)s"))],
        verbose_name=_('Enter the Total amount of Units'),
    )
    works = models.JSONField(
        default=default_works,
        verbose_name=_('Enter the Total amount of Units already Completed'),
    )
    dif_assign = models.IntegerField(
        blank=True,
        null=True,
    )
    skew_ratio = models.TextField(
        default=1,
    )
    ctime = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0.01,_("This value must be positive"))],
        verbose_name=_('Enter the Estimated amount of Time to complete each Unit of Work in Minutes'),
    )
    funct_round = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0.01,_("The grouping value must be positive"))],
        blank=True,
        null=True,
        verbose_name=_('Enter the Grouping Value'),
    )
    min_work_time = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0.01,_("The minimum work time must be positive"))],
        blank=True,
        null=True,
        verbose_name=_('Enter the Minimum Work Time per Day in Minutes'),
    )
    nwd = MultiSelectField(
        choices=WEEKDAYS,
        blank=True,
        null=True,
    )
    fixed_mode = models.BooleanField(
        default=False,
    )
    dynamic_start = models.IntegerField(
        null=True,
        blank=True,
    )
    remainder_mode = models.BooleanField(
        default=False,
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

