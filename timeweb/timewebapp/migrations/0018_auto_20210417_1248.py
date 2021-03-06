# Generated by Django 3.1.8 on 2021-04-17 19:48

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timewebapp', '0017_remove_settingsmodel_first_visit'),
    ]

    operations = [
        migrations.AlterField(
            model_name='settingsmodel',
            name='warning_acceptance',
            field=models.IntegerField(default=50, validators=[django.core.validators.MinValueValidator(1, "This field's value must be an integer from 1 to 100"), django.core.validators.MaxValueValidator(100, "This field's value must be an integer from 1 to 100")], verbose_name='Warning Threshold'),
        ),
    ]
