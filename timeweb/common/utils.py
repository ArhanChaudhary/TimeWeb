from logging import getLogger
from django.utils import timezone

logger = getLogger('django')
logger.propagate = False

def days_between_two_dates(day1, day2):
    return (day1 - day2).days + ((day1 - day2).seconds >= (60*60*24) / 2)

def utc_to_local(request, utctime):
    if request.user.is_authenticated and request.user.settingsmodel.timezone:
        return utctime.astimezone(request.user.settingsmodel.timezone)
    else:
        return timezone.localtime(utctime)
    
