# Generated by Django 4.1.9 on 2023-06-13 23:42

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('timewebapp', '0023_timewebmodel_is_canvas_assignment'),
    ]

    operations = [
        migrations.RenameField(
            model_name='timewebmodel',
            old_name='is_google_classroom_assignment',
            new_name='is_gc_assignment',
        ),
    ]
