# Generated by Django 4.1.9 on 2023-05-31 07:04

from django.db import migrations
import encrypted_json_fields.fields


class Migration(migrations.Migration):

    dependencies = [
        ('navbar', '0050_alter_settingsmodel_example_assignment'),
    ]

    operations = [
        migrations.AddField(
            model_name='settingsmodel',
            name='canvas_token',
            field=encrypted_json_fields.fields.EncryptedCharField(blank=True, null=True),
        ),
    ]
