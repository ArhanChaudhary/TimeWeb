from django.conf import settings
from django.shortcuts import redirect
from django.contrib.sites.models import Site
from django.http import HttpResponseForbidden, HttpResponse
from django.db.utils import OperationalError
from django.utils import timezone

from common.views import logger

from ratelimit.exceptions import Ratelimited

import re

def get_client_ip(group, request):
    if 'HTTP_CF_CONNECTING_IP' in request.META:
        return request.META['HTTP_CF_CONNECTING_IP']
    if not settings.DEBUG:
        logger.warning(f"request for {request} has no CF_CONNECTING_IP, ratelimiting is defaulting to REMOTE_ADDR: {request.META['REMOTE_ADDR']}")
    return request.META['REMOTE_ADDR']

def _403_csrf(request, reason=""):
    # https://stackoverflow.com/questions/8508602/check-if-request-is-ajax-in-python/67734999#67734999
    is_html_request = re.search(r'^text/html', request.META.get('HTTP_ACCEPT'))
    if not is_html_request: # is ajax
        return HttpResponse("Your login session has expired or is invalid. Please refresh the page and then try again. Here's a cookie 🍪 to cheer you up.", status=403)
    return redirect("account_login")

def _403_or_429(request, exception=None):
    if isinstance(exception, Ratelimited):
        return HttpResponse('You are being ratelimited, try again in a few seconds or minutes. Here\'s a cookie 🍪 to cheer you up.', status=429)
    return HttpResponseForbidden("Forbidden, here's a cookie 🍪 to cheer you up")

def days_between_two_dates(day1, day2):
    return (day1 - day2).days + ((day1 - day2).seconds >= (60*60*24) / 2)

def utc_to_local(request, utctime):
    assert request.utc_offset, "request must have a utc_offset"
    return utctime.astimezone(timezone.zoneinfo.ZoneInfo(request.utc_offset))

def app_static_factory(app_name):
    def app_static(url_path):
        return f"/static/{app_name}/{url_path}" if settings.DEBUG else f'https://storage.googleapis.com/twstatic/{app_name}/{url_path}'
    return app_static

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
