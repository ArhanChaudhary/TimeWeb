# Generated by Django 3.1.8 on 2021-04-09 18:10

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('timewebapp', '0004_auto_20210408_1636'),
    ]

    operations = [
        migrations.RenameField(
            model_name='settingsmodel',
            old_name='def_gv_minute',
            new_name='def_funct_round_minute',
        ),
    ]
