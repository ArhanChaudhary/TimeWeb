from django.shortcuts import render
from ratelimit.exceptions import Ratelimited
from django.http import HttpResponseForbidden, HttpResponse
from django.conf import settings
from django.contrib.sites.models import Site
from django.utils import timezone
from common.views import logger
from django.db.utils import OperationalError
from decimal import Decimal

def get_client_ip(group, request):
    if 'HTTP_CF_CONNECTING_IP' in request.META:
        return request.META['HTTP_CF_CONNECTING_IP']
    logger.warning(f"request for {request} has no CF_CONNECTING_IP, ratelimiting is defaulting to REMOTE_ADDR: {request.META['REMOTE_ADDR']}")
    return request.META['REMOTE_ADDR']

def _403_csrf(request, reason=""):
    response = render(request, "common/403_csrf.html", {"request": request})
    response.status_code = 403
    return response

def _403_or_429(request, exception=None):
    if isinstance(exception, Ratelimited):
        return HttpResponse('You are being ratelimited, try again in a few seconds or minutes.', status=429)
    return HttpResponseForbidden("Forbidden, here's a cookie 🍪 to cheer you up")

def calc_mod_days(self):
    assign_day_of_week = self.sm.assignment_date.weekday()
    red_line_start_x = self.sm.blue_line_start
    mods = [0]
    mod_counter = 0
    for mod_day in range(6):
        if str((assign_day_of_week + red_line_start_x + mod_day) % 7) in self.sm.break_days:
            mod_counter += 1
        mods.append(mod_counter)
    mods = tuple(mods)
    return mods

def days_between_two_dates(day1, day2):
    return (day1 - day2).days + ((day1 - day2).seconds >= (60*60*24) / 2)

# IMPORTANT
# Make sure these two function mirror the corresponding frontend logic
def hours_to_minutes(hours):
    return round(hours * Decimal(60))

def minutes_to_hours(minutes):
    return round(minutes / Decimal(60) * Decimal(100)) / Decimal(100)

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

def deletion_time_fix():
    """
    This function is manually invoked to ensure all deletion times are unique
    """
    from .models import User
    import datetime
    users = User.objects.all()
    for user in users:
        hidden = user.timewebmodel_set.filter(hidden=True)
        if hidden.count() <= 1: continue

        def is_unique(time):
            return user.timewebmodel_set.filter(hidden=True).filter(deletion_time=time).count() == 1
        for assignment in hidden:
            while not is_unique(assignment.deletion_time):
                assignment.deletion_time += datetime.timedelta(microseconds=100000)
                assignment.save()

try:
    current_site = Site.objects.get(domain="localhost" if (settings.DEBUG or settings.FIX_DEBUG_LOCALLY) else "timeweb.io")
except (Site.DoesNotExist, OperationalError):
    try:
        current_site = Site.objects.get(domain="example.com")
    except (Site.DoesNotExist, OperationalError):
        current_site = None
        logger.warning("You should probably configure your site model domain")
if current_site is not None:
    settings.SITE_ID = current_site.id
