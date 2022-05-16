# Generated by Django 3.2.13 on 2022-05-15 21:56

from decimal import Decimal
import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timewebapp', '0010_delete_settingsmodel'),
    ]

    operations = [
        migrations.AlterField(
            model_name='timewebmodel',
            name='y',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True, validators=[django.core.validators.MinValueValidator(Decimal('0.01'), "This field's value must be positive")]),
        ),
    ]