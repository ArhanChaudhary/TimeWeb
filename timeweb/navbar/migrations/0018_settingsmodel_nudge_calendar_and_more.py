# Generated by Django 4.0.7 on 2022-09-15 15:05

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('navbar', '0017_alter_settingsmodel_sorting_animation_threshold'),
    ]

    operations = [
        migrations.AddField(
            model_name='settingsmodel',
            name='nudge_calendar',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='settingsmodel',
            name='nudge_canvas',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='settingsmodel',
            name='nudge_notifications',
            field=models.BooleanField(default=False),
        ),
    ]
