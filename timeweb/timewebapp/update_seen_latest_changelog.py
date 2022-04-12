"""
This file is manually invoked so every user is notified of the latest changelog
"""
from timewebapp.models import SettingsModel
settings_models = SettingsModel.objects.all()
for model in settings_models:
    if model.seen_latest_changelog and not model.enable_tutorial:
        model.seen_latest_changelog = False
SettingsModel.objects.bulk_update(settings_models, ['seen_latest_changelog'])