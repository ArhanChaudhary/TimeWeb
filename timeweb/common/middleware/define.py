import re
from django.http import QueryDict
class PopulatePost:
    request_body_http_methods = ('POST', 'PUT', 'PATCH', 'DELETE')

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method in self.request_body_http_methods:
            _mutable = request.POST._mutable
            request.POST._mutable = True
            request.POST.update(QueryDict(request.body))
            request.POST._mutable = _mutable
        return self.get_response(request)
