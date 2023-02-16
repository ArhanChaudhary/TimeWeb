# Generated by Django 4.1.7 on 2023-02-16 12:43

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('navbar', '0040_remove_settingsmodel_timezone'),
    ]

    operations = [
        migrations.AlterField(
            model_name='settingsmodel',
            name='appearance',
            field=models.CharField(choices=[('automatic', 'Sync with device'), ('light', 'Light Mode'), ('dark', 'Dark Mode'), ('lesser dark', 'Lesser Dark Mode')], default='dark', max_length=11, verbose_name='Appearance'),
        ),
    ]
