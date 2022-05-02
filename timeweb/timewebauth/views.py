# Abstractions
from views import TimewebGenericView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import redirect
from django.forms import ValidationError

# App stuff
from django.conf import settings
from .forms import UsernameResetForm

# Misc
from views import logger
from allauth.account.adapter import DefaultAccountAdapter
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
