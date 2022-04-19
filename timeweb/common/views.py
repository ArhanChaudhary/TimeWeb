from allauth import ratelimit
from django.shortcuts import redirect
from django.contrib import messages
from django.contrib.auth import get_user_model
from django.views import View
from django.views.generic.base import TemplateResponseMixin

User = get_user_model()

def consume_or_message(request, message="You are submitting too many requests. Please wait a bit before trying again", *args, **kwargs):
    if not ratelimit.consume(request, *args, **kwargs):
        messages.error(request, message)
        return redirect(request.META['HTTP_REFERER'])
ratelimit.consume_or_429 = consume_or_message

class TimewebGenericView(TemplateResponseMixin, View):
    def __init__(self):
        self.context = {}

    def get(self, request):
        return self.render_to_response(self.context)
