# Generated by Django 4.1.7 on 2023-04-24 15:24

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timewebapp', '0020_rename_assignment_link_timewebmodel_external_link'),
    ]

    operations = [
        migrations.AlterField(
            model_name='timewebmodel',
            name='name',
            field=models.CharField(blank=True, max_length=200, verbose_name='Name of this Assignment'),
        ),
    ]