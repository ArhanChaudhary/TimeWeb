from django.http import QueryDict
from django.conf import settings

class DefineIsExampleAccount:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            request.isExampleAccount = request.user.email == settings.EXAMPLE_ACCOUNT_EMAIL
        return self.get_response(request)

class PopulatePost:
    request_body_http_methods = ('POST', 'PUT', 'PATCH', 'DELETE')

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method in self.request_body_http_methods:
            _mutable = request.POST._mutable
            request.POST._mutable = True
            for key, value in QueryDict(request.body).dict().items():
                if key not in request.POST:
                    request.POST[key] = value
            request.POST._mutable = _mutable
        return self.get_response(request)
