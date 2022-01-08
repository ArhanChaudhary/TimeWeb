from django.core.exceptions import RequestDataTooBig
from django.http.response import HttpResponse

class CatchRequestDataTooBig(object):
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path != "/settings":
            try:
                request.body
            except RequestDataTooBig:
                return HttpResponse("RequestDataTooBig")
        response = self.get_response(request)
        return response