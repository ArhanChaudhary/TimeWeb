# Generated by Django 3.2.12 on 2022-03-31 07:48

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('timewebapp', '0008_alter_settingsmodel_enable_tutorial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='settingsmodel',
            name='assignment_spacing',
        ),
    ]