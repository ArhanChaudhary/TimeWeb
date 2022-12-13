from django.conf import settings
from django.http import HttpResponse
from django.core.exceptions import RequestDataTooBig
from django.urls import reverse, resolve

class APIValidationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if resolve(request.path)._func_path.startswith("api"):
            if not request.user.is_authenticated: return HttpResponse(status=401)
            if request.isExampleAccount and not settings.EDITING_EXAMPLE_ACCOUNT: return HttpResponse(status=403)
        return self.get_response(request)

# CatchRequestDataTooBig must be a global middleware so it can be ordered before PopulatePost
class CatchRequestDataTooBig:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path != reverse("settings"):
            try:
                request.body
            except RequestDataTooBig:
                return HttpResponse(status=413)
        return self.get_response(request)
