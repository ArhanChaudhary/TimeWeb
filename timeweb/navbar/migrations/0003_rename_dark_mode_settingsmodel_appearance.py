# Generated by Django 3.2.13 on 2022-05-04 01:38

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('navbar', '0002_remove_settingsmodel_def_funct_round_minute'),
    ]

    operations = [
        migrations.RenameField(
            model_name='settingsmodel',
            old_name='dark_mode',
            new_name='appearance',
        ),
    ]