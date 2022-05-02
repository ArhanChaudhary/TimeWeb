from django.conf import settings
from django.contrib.sites.models import Site
from django.utils import timezone

def days_between_two_dates(day1, day2):
    return (day1 - day2).days + ((day1 - day2).seconds >= (60*60*24) / 2)

def utc_to_local(request, utctime):
    if request.user.is_authenticated and request.user.settingsmodel.timezone:
        return utctime.astimezone(request.user.settingsmodel.timezone)
    else:
        return timezone.localtime(utctime)

def app_static_factory(app_name):
    def app_static(url_path):
        return f"/static/{app_name}/{url_path}" if settings.DEBUG else f'https://storage.googleapis.com/twstatic/{app_name}/{url_path}'
    return app_static

def update_seen_latest_changelog():
    """
    This function is manually invoked so every user is notified of the latest changelog
    """
    from navbar.models import SettingsModel
    settings_models = SettingsModel.objects.all()
    for model in settings_models:
        if model.seen_latest_changelog and not model.enable_tutorial:
            model.seen_latest_changelog = False
    SettingsModel.objects.bulk_update(settings_models, ['seen_latest_changelog'])

try:
    current_site = Site.objects.get(domain="localhost" if settings.DEBUG else "timeweb.io")
except Site.DoesNotExist:
    current_site = Site.objects.get(domain="example.com")
settings.SITE_ID = current_site.id
