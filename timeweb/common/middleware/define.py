from django.conf import settings

class DefineIsExampleAccount:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            request.isExampleAccount = request.user.email == settings.EXAMPLE_ACCOUNT_EMAIL
        return self.get_response(request)
