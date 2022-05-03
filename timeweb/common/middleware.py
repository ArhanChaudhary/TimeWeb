from django.conf import settings

class DefineIsExampleAccount:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.isExampleAccount = request.user.is_authenticated and request.user.email == settings.EXAMPLE_ACCOUNT_EMAIL
        return self.get_response(request)
