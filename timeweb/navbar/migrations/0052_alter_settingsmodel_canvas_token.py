# Generated by Django 4.1.9 on 2023-06-01 07:19

from django.db import migrations
import encrypted_json_fields.fields
import timewebapp.models


class Migration(migrations.Migration):

    dependencies = [
        ('navbar', '0051_settingsmodel_canvas_token'),
    ]

    operations = [
        migrations.AlterField(
            model_name='settingsmodel',
            name='canvas_token',
            field=encrypted_json_fields.fields.EncryptedJSONField(blank=True, default=timewebapp.models.empty_dict),
        ),
    ]