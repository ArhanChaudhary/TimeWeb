from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings
from allauth.exceptions import ImmediateHttpResponse
from django.http import HttpResponseRedirect
from django.contrib import messages
from allauth.account.adapter import get_adapter as get_account_adapter

message = "socialaccount/messages/cannot_modify_example_account.txt"

class ExampleAccountSocialLoginAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):        
        if request.user.email == settings.EXAMPLE_ACCOUNT_EMAIL:
            default_next = self.get_connect_redirect_url(
                request, sociallogin.account
            )
            next_url = sociallogin.get_redirect_url(request) or default_next
            get_account_adapter(request).add_message(
                request,
                messages.ERROR,
                message,
            )
            raise ImmediateHttpResponse(HttpResponseRedirect(next_url))