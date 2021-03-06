# Generated by Django 3.1.8 on 2021-04-09 23:56

from decimal import Decimal
import django.core.validators
from django.db import migrations, models
import multiselectfield.db.fields


class Migration(migrations.Migration):

    dependencies = [
        ('timewebapp', '0006_auto_20210409_1320'),
    ]

    operations = [
        migrations.AlterField(
            model_name='settingsmodel',
            name='color_priority',
            field=models.BooleanField(default=True, verbose_name='Display Priority with Color'),
        ),
        migrations.AlterField(
            model_name='settingsmodel',
            name='def_funct_round_minute',
            field=models.BooleanField(default=False, verbose_name='Round to Multiples of 5 Minutes'),
        ),
        migrations.AlterField(
            model_name='settingsmodel',
            name='def_min_work_time',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True, validators=[django.core.validators.MinValueValidator(Decimal('0.01'), 'The default minimum work time must be positive')], verbose_name='Default Minimum Work Time per Day in Minutes'),
        ),
        migrations.AlterField(
            model_name='settingsmodel',
            name='def_nwd',
            field=multiselectfield.db.fields.MultiSelectField(blank=True, choices=[('1', 'Monday'), ('2', 'Tuesday'), ('3', 'Wednesday'), ('4', 'Thursday'), ('5', 'Friday'), ('6', 'Saturday'), ('0', 'Sunday')], max_length=13, null=True, verbose_name='Default Not Working Days'),
        ),
        migrations.AlterField(
            model_name='settingsmodel',
            name='def_skew_ratio',
            field=models.DecimalField(decimal_places=10, default=1, max_digits=17, verbose_name='Default Skew Ratio'),
        ),
        migrations.AlterField(
            model_name='settingsmodel',
            name='ignore_ends',
            field=models.BooleanField(default=False, verbose_name='Ignore Minimum Work Time Ends'),
        ),
        migrations.AlterField(
            model_name='settingsmodel',
            name='show_past',
            field=models.BooleanField(default=True, verbose_name='Show Past Work Inputs in Text Schedule'),
        ),
        migrations.AlterField(
            model_name='settingsmodel',
            name='text_priority',
            field=models.BooleanField(default=False, verbose_name='Display Priority with Text'),
        ),
        migrations.AlterField(
            model_name='settingsmodel',
            name='warning_acceptance',
            field=models.IntegerField(default=50, validators=[django.core.validators.MinValueValidator(1, 'This value must be an integer from 1-100'), django.core.validators.MaxValueValidator(100, 'This value must be an integer from 1-100')], verbose_name='Warning Threshold in Percent'),
        ),
    ]
