# Generated by Django 3.2.14 on 2022-07-10 09:30

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('navbar', '0007_auto_20220710_0222'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='settingsmodel',
            name='swapping_animation_threshold',
        ),
        migrations.AddField(
            model_name='settingsmodel',
            name='sorting_animation_threshold',
            field=models.IntegerField(default=15, validators=[django.core.validators.MinValueValidator(0, "This setting can't be a negative number")], verbose_name='Sorting Animation Threshold'),
        ),
    ]
