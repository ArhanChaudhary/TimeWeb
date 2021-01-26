# import the standard Django Model
# from built-in library
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

# declare a new model with a name "TimewebModel"
class TimewebModel(models.Model):
    class Weekdays(models.TextChoices):
        SUN = '0',"SUNDAY"
        MON = '1',"MONDAY"
        TUE = '2',"TUESDAY"
        WED = '3',"WEDNESDAY"
        THU = '4',"THURSDAY"
        FRI = '5',"FRIDAY"
        SAT = '6',"SATURDAY"
    # fields of the model
    file_sel = models.CharField(
        max_length=40,
        verbose_name='Name: '
    )
    ad = models.DateField(
        null=True,
    )
    x = models.DateField(
        null=True,
    )
    unit = models.CharField(
        max_length=40,
        blank=True,
        default="Minute",
    )
    y = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(1.00)],
    )
    adone = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0.00)]
    )
    dif_assign = models.IntegerField(
        blank=True,
        null=True,
    )
    skew_ratio = models.DecimalField(
        max_digits=15,
        decimal_places=3,
        default=1,
    )
    ctime = models.IntegerField(
        validators=[MinValueValidator(1)],
    )
    funct_round = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0.00)],
        blank=True,
        null=True,
    )
    min_work_time = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0.00)],
        blank=True,
        null=True,
    )
    nwd = models.CharField(
        max_length=2,
        choices=Weekdays.choices,
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
    total_mode = models.BooleanField(
        default=False,
        blank=True,
    )
    remainder_mode = models.BooleanField(
        default=False,
        blank=True,
    )
    # renames the instances of the model
    # with their title name
    def __str__(self):
        return self.file_sel

