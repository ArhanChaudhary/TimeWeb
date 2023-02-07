# Generated by Django 4.0.7 on 2022-11-28 10:44

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('navbar', '0021_alter_settingsmodel_assignment_sorting'),
    ]

    operations = [
        migrations.AlterField(
            model_name='settingsmodel',
            name='assignment_sorting',
            field=models.CharField(choices=[('Most Important First', 'Most Important First'), ('Least Important First', 'Least Important First'), ('Tag Name A-Z', 'Tag Name A-Z'), ('Tag Name Z-A', 'Tag Name Z-A')], default='Normal', max_length=21, verbose_name='Assignment Sorting: '),
        ),
    ]
