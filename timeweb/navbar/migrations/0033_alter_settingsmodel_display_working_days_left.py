# Generated by Django 4.0.7 on 2022-12-31 03:23

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('navbar', '0032_settingsmodel_display_working_days_left'),
    ]

    operations = [
        migrations.AlterField(
            model_name='settingsmodel',
            name='display_working_days_left',
            field=models.BooleanField(default=False, verbose_name='Display Number of Working Days Left'),
        ),
    ]
