# Generated by Django 4.0.7 on 2022-12-31 03:20

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('navbar', '0031_alter_settingsmodel_device_uuid_api_timestamp'),
    ]

    operations = [
        migrations.AddField(
            model_name='settingsmodel',
            name='display_working_days_left',
            field=models.BooleanField(default=False, verbose_name='Display Working Days Left'),
        ),
    ]