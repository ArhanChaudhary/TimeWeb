# Generated by Django 4.0.7 on 2022-12-16 21:59

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('navbar', '0029_settingsmodel_device_uuid_save_time'),
    ]

    operations = [
        migrations.RenameField(
            model_name='settingsmodel',
            old_name='device_uuid_save_time',
            new_name='device_uuid_api_timestamp',
        ),
    ]
