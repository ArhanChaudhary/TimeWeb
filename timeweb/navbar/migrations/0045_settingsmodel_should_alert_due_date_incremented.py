# Generated by Django 4.1.7 on 2023-03-09 08:40

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('navbar', '0044_settingsmodel_font'),
    ]

    operations = [
        migrations.AddField(
            model_name='settingsmodel',
            name='should_alert_due_date_incremented',
            field=models.BooleanField(default=True, verbose_name='Alert Due Date Incremented'),
        ),
    ]
