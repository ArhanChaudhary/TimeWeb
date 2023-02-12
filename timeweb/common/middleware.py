from django.conf import settings
from django.urls import resolve
from django.http import QueryDict
from django.contrib.auth import logout

from ratelimit.exceptions import Ratelimited
from ratelimit.decorators import ratelimit
from ratelimit.core import is_ratelimited

from timewebapp.urls import KEEP_EXAMPLE_ACCOUNT_LOGGED_IN_VIEWS
from django_minify_html.middleware import MinifyHtmlMiddleware as _MinifyHtmlMiddleware

from . import utils

DEFAULT_GLOBAL_RATELIMIT = "5/s"
class LogoutExampleAccount:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if resolve(request.path_info).url_name not in KEEP_EXAMPLE_ACCOUNT_LOGGED_IN_VIEWS and request.user.is_authenticated and request.user.email == settings.EXAMPLE_ACCOUNT_EMAIL:
            logout(request)
        return self.get_response(request)

class DefineIsExampleAccount:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.isExampleAccount = request.user.is_authenticated and request.user.email == settings.EXAMPLE_ACCOUNT_EMAIL
        return self.get_response(request)

class DefineUTCOffset:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "POST":
            request.utc_offset = request.POST.get("utc_offset")
        elif request.method in ("DELETE", "PATCH"):
            request.utc_offset = QueryDict(request.body).get("utc_offset")
        return self.get_response(request)

class CommonRatelimit:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        resolved = resolve(request.path)
        # mostly static urls if the url app name is ""
        # (do not block things like /favicon.ico)
        if resolved.app_name != "":
            if resolved.app_name == "api":
                group = "api"
            else:
                group = resolved._func_path
            if is_ratelimited(request, group=group, key=utils.get_client_ip, rate=DEFAULT_GLOBAL_RATELIMIT, method=ratelimit.ALL, increment=True):
                raise Ratelimited
        return self.get_response(request)

class MinifyHTMLMiddleware(_MinifyHtmlMiddleware):
    # Custom args for SEO optimization
    minify_args = {
        "do_not_minify_doctype": True,
        "ensure_spec_compliant_unquoted_attribute_values": True,
        "keep_closing_tags": True,
        "keep_html_and_head_opening_tags": True,
        "minify_css": True,
        "minify_js": True,
    }