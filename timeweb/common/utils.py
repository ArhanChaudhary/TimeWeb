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

try:
    current_site = Site.objects.get(domain="localhost" if settings.DEBUG else "timeweb.io")
except Site.DoesNotExist:
    current_site = Site.objects.get(domain="example.com")
settings.SITE_ID = current_site.id
