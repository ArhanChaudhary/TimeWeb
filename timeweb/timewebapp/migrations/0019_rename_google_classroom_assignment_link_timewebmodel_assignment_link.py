# Generated by Django 4.1.7 on 2023-04-03 03:58

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('timewebapp', '0018_remove_timewebmodel_has_alerted_due_date_passed_notice'),
    ]

    operations = [
        migrations.RenameField(
            model_name='timewebmodel',
            old_name='google_classroom_assignment_link',
            new_name='assignment_link',
        ),
    ]
