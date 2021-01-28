# import the standard Django Model
# from built-in library
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from multiselectfield import MultiSelectField

WEEKDAYS = ((0, "Sunday"),
                (1,"Monday"),
                (2,"Tuesday"),
                (3,"Wednesday"),
                (4,"Thursday"),
                (5,"Friday"),
                (6,"Saturday"))

def default_works():
    return 0
# print(weekday_field.fields)
# declare a new model with a name "TimewebModel"
class TimewebModel(models.Model):
    
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
        default="Minute",
    )
    y = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(1.00)],
    )
    works = models.JSONField(
        default=default_works,
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
    )
    funct_round = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
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
    # nwd = models.CharField(
    #     max_length=2,
    #     choices=WEEKDAYS,
    #     blank=True,
    #     null=True,
    # )
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

