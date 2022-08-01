from django.shortcuts import render
from ratelimit.exceptions import Ratelimited
from django.http import HttpResponseForbidden, HttpResponse

def _403_csrf(request, reason=""):
    response = render(request, "misc/403_csrf.html", {"request": request})
    response.status_code = 403
    return response

def _403_or_429(request, exception=None):
    if isinstance(exception, Ratelimited):
        return HttpResponse('You are being ratelimited, try again in a few seconds or minutes.', status=429)
    return HttpResponseForbidden("Forbidden, here's a cookie 🍪 to cheer you up")