from django.conf import settings
from django.http import HttpResponse, QueryDict
from django.core.exceptions import RequestDataTooBig
from django.urls import resolve
from django.utils import timezone
from .urls import EXCLUDE_FROM_UPDATING_STATE

class APIValidationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        resolved = resolve(request.path)
        if not resolved._func_path.startswith("api"):
            return self.get_response(request)
        if not request.user.is_authenticated:
            return HttpResponse(status=401)
        if request.isExampleAccount and not settings.EDITING_EXAMPLE_ACCOUNT:
            return HttpResponse(status=403)
        if resolved.url_name in EXCLUDE_FROM_UPDATING_STATE:
            return self.get_response(request)

        res = self.get_response(request)
        if request.method == "POST":
            device_uuid = request.POST['device_uuid']
        elif request.method in ("DELETE", "PATCH"):
            device_uuid = QueryDict(request.body)['device_uuid']
        request.user.settingsmodel.device_uuid = device_uuid
        request.user.settingsmodel.device_uuid_api_timestamp = timezone.now()
        request.user.settingsmodel.save()
        return res

# CatchRequestDataTooBig must be a global middleware so it can be ordered before PopulatePost
class CatchRequestDataTooBig:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if resolve(request.path).url_name != "settings":
            try:
                request.body
            except RequestDataTooBig:
                return HttpResponse(status=413)
        return self.get_response(request)
