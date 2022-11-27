# Generated by Django 4.0.7 on 2022-10-11 00:33

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('navbar', '0019_settingsmodel_gc_courses_cache'),
    ]

    operations = [
        migrations.AlterField(
            model_name='settingsmodel',
            name='appearance',
            field=models.CharField(choices=[('automatic', 'Sync with device'), ('light', 'Light Mode'), ('dark', 'Dark Mode'), ('lesser dark', 'Lesser Dark Mode')], default='automatic', max_length=16, verbose_name='Appearance'),
        ),
    ]
