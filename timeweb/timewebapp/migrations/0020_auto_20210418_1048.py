# Generated by Django 3.1.8 on 2021-04-18 17:48

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timewebapp', '0019_auto_20210417_1302'),
    ]

    operations = [
        migrations.AlterField(
            model_name='settingsmodel',
            name='show_progress_bar',
            field=models.BooleanField(default=False, verbose_name='Show Graph Progress Bar'),
        ),
    ]
