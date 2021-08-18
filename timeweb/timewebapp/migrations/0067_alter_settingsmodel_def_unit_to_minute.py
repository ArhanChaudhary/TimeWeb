# Generated by Django 3.2.4 on 2021-08-18 00:57

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timewebapp', '0066_settingsmodel_dark_mode'),
    ]

    operations = [
        migrations.AlterField(
            model_name='settingsmodel',
            name='def_unit_to_minute',
            field=models.BooleanField(default=False, verbose_name='Default Unit of Work to "Minute"'),
        ),
    ]
