# Generated by Django 3.2.7 on 2021-11-13 20:40

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timewebapp', '0086_settingsmodel_close_graph_after_work_input'),
    ]

    operations = [
        migrations.AddField(
            model_name='timewebmodel',
            name='due_time',
            field=models.TimeField(blank=True, null=True, verbose_name=''),
        ),
    ]
