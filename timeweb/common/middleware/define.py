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
            # For a strange error; I can't call request.body or request.POST more than once in middleware
            a = request.body
            b = request.POST

            _mutable = b._mutable
            b._mutable = True
            for key, value in QueryDict(a).dict().items():
                if key not in b:
                    b[key] = value
            b._mutable = _mutable
        return self.get_response(request)
