# import the standard Django Model
# from built-in library
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from multiselectfield import MultiSelectField
WEEKDAYS = (("1","Monday"),
                ("2","Tuesday"),
                ("3","Wednesday"),
                ("4","Thursday"),
                ("5","Friday"),
                ("6","Saturday"),
                ("0","Sunday"))

def default_works():
    return 0
# print(weekday_field.fields)
# declare a new model with a name "TimewebModel"
class TimewebModel(models.Model):
    
    # fields of the model
    file_sel = models.CharField(
        max_length=100,
        verbose_name='Enter the Name of this Assignment',
    )
    ad = models.DateField(
        null=True,
        verbose_name='Enter the Assignment Date',
    )
    x = models.DateField(
        null=True,
        verbose_name='Enter the Due Date',
    )
    unit = models.CharField(
        max_length=40,
        default="Minute",
        verbose_name='Enter the Name of each Unit of Work',
    )
    y = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(1.00)],
        verbose_name='Enter the Total amount of Units',
    )
    works = models.JSONField(
        default=default_works,
        verbose_name='Enter the Total amount of Units already Completed',
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
        validators=[MinValueValidator(0.00)],
        verbose_name='Enter the Estimated amount of Time in Minutes to complete each Unit of Work',
    )
    funct_round = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0.00)],
        blank=True,
        null=True,
        verbose_name='Enter the Grouping Value',
    )
    min_work_time = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0.00)],
        blank=True,
        null=True,
        verbose_name='Enter the Minimum Work Time per Day',
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
        blank=True,
    )
    # renames the instances of the model
    # with their title name
    def __str__(self):
        return self.file_sel

