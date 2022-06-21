# Abstractions
from views import TimewebGenericView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect
from django.forms import ValidationError

# App stuff
from django.conf import settings
from .forms import UsernameResetForm
from allauth.socialaccount.views import ConnectionsView as SocialaccountConnectionsView

# Misc
from views import logger
from allauth.account.adapter import DefaultAccountAdapter
from django.contrib import messages
from allauth.account.adapter import get_adapter as get_account_adapter
DefaultAccountAdapter.clean_username.__defaults__ = (True,) # Allows non unique usernames

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
    
    
connections = login_required(LabeledSocialaccountConnectionsView.as_view()) # from its source code
