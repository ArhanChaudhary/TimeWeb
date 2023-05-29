from django.conf import settings
from django.urls import resolve
from django.http import QueryDict

from ratelimit.exceptions import Ratelimited
from ratelimit.decorators import ratelimit
from ratelimit.core import is_ratelimited

from django_minify_html.middleware import MinifyHtmlMiddleware as _MinifyHtmlMiddleware

import sys
from . import utils

DEFAULT_GLOBAL_RATELIMIT = "5/s"

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
        # https://stackoverflow.com/a/61441816/12230735
        resolved = resolve(request.path)
        app_name = sys.modules[resolved.func.__module__].__package__
        if app_name == "api":
            group = "api"
        else:
            group = resolved._func_path
        if not settings.DEBUG and not group.startswith("django") and is_ratelimited(request, group=group, key=utils.get_client_ip, rate=DEFAULT_GLOBAL_RATELIMIT, method=ratelimit.ALL, increment=True):
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