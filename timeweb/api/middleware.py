from django.conf import settings
from django.http import HttpResponse

class APIValidationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.user.is_authenticated: return HttpResponse(status=401)
        if request.isExampleAccount and not settings.EDITING_EXAMPLE_ACCOUNT: return HttpResponse(status=403)
        return self.get_response(request)