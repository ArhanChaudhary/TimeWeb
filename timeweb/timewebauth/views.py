# In the future I should probably switch all my view classes to FormView 

from django.conf import settings
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.forms import ValidationError
from django.http import HttpResponseNotAllowed
from django.contrib import messages

from allauth.account.adapter import get_adapter as get_account_adapter
from allauth.account.views import PasswordResetFromKeyView
from allauth.socialaccount import app_settings
from allauth.socialaccount.providers.base.mixins import OAuthLoginMixin

from allauth.socialaccount.views import ConnectionsView as SocialaccountConnectionsView
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.views import OAuth2LoginView, OAuth2View
from common.views import TimewebGenericView

from .forms import UsernameResetForm

from common.views import logger

class UsernameResetView(LoginRequiredMixin, TimewebGenericView):
    template_name = "account/username_reset.html"

    def get(self, request):
        initial = {
            "username": request.user.username,
        }
        self.context['form'] = UsernameResetForm(initial=initial)
        return super().get(request)

    def post(self, request):
        self.form = UsernameResetForm(data=request.POST)
        form_is_valid = True
        if not self.form.is_valid():
            form_is_valid = False
        elif request.user.email == settings.EXAMPLE_ACCOUNT_EMAIL:
            form_is_valid = False
            self.form.add_error("username", ValidationError("You cannot modify the example account"))
        if form_is_valid:
            return self.valid_form(request)
        else:
            return self.invalid_form(request)  

    def valid_form(self, request):
        request.user.username = self.form.cleaned_data.get('username')
        request.user.save()
        logger.info(f'User \"{request.user}\" updated their username')
        return redirect("home")

    def invalid_form(self, request):
        self.context['form'] = self.form
        return super().get(request)

class LabeledSocialaccountConnectionsView(SocialaccountConnectionsView):
    def form_valid(self, form):
        get_account_adapter().add_message(
            self.request,
            messages.INFO,
            "socialaccount/messages/account_disconnected.txt",
            message_context={
                "sociallogout": form.cleaned_data["account"],
            }
        )
        form.save()
        return super(SocialaccountConnectionsView, self).form_valid(form)

labeled_connections = login_required(LabeledSocialaccountConnectionsView.as_view()) # from its source code

class EmailMessageView(TimewebGenericView):
    template_name = "account/email/password_reset_key_message.html"

class OAuthLoginMixinNoGet(OAuthLoginMixin):
    def dispatch(self, request, *args, **kwargs):
        if (not app_settings.LOGIN_ON_GET) and request.method == "GET":
            return HttpResponseNotAllowed(["POST"])
        return self.login(request, *args, **kwargs)

class OAuth2LoginViewNoGet(OAuthLoginMixinNoGet, OAuth2View):
    def login(self, *args, **kwargs):
        return OAuth2LoginView.login(self, *args, **kwargs)

oauth2_login_no_get = OAuth2LoginViewNoGet.adapter_view(GoogleOAuth2Adapter)

class PasswordResetFromKeyViewNoDone(PasswordResetFromKeyView):
    success_url = reverse_lazy("account_login")

password_reset_from_key_no_done_view = PasswordResetFromKeyViewNoDone.as_view()