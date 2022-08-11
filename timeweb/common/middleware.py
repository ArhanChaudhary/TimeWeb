from django.conf import settings
from django.urls import resolve
from ratelimit.exceptions import Ratelimited
from ratelimit.decorators import ratelimit
from ratelimit.core import is_ratelimited

class DefineIsExampleAccount:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.isExampleAccount = request.user.is_authenticated and request.user.email == settings.EXAMPLE_ACCOUNT_EMAIL
        return self.get_response(request)

class CommonRatelimit:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        resolved = resolve(request.path)
        if not (settings.DEBUG and resolved.app_name == "pwa"):
            if resolved.app_name == "api":
                group = "api"
            else:
                group = resolved._func_path
            if is_ratelimited(request, group=group, key=settings.GET_CLIENT_IP, rate=settings.DEFAULT_GLOBAL_RATELIMIT, method=ratelimit.ALL, increment=True):
                raise Ratelimited
        return self.get_response(request)