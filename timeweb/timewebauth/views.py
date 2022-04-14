from django.conf import settings
from timewebapp.views import TimewebGenericView, logger
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth import get_user_model
from django.shortcuts import redirect
from .forms import UsernameResetForm
from django.forms import ValidationError
from django.contrib import messages

from allauth.account.views import PasswordResetView
from allauth.decorators import ratelimit

from allauth.account.adapter import DefaultAccountAdapter
DefaultAccountAdapter.clean_username.__defaults__ = (True,) # Allows non unique usernames

User = get_user_model()

class UsernameResetView(LoginRequiredMixin, TimewebGenericView):
    template_name = "account/username-reset.html"

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
        self.user_model = User.objects.get(email=request.user.email)
        self.user_model.username = self.form.cleaned_data.get('username')
        self.user_model.save()
        logger.info(f'User \"{request.user}\" updated their username')
        return redirect("home")

    def invalid_form(self, request):
        self.context['form'] = self.form
        return super().get(request)

class MessagedPasswordResetView(PasswordResetView):
    def form_valid(self, form):
            r429 = ratelimit.consume_or_429(
                self.request,
                action="reset_password_email",
                key=form.cleaned_data["email"],
            )
            if r429:
                return r429
            form.save(self.request)
            messages.success(self.request, "Password reset e-mail has been sent.\n<p hidden>**Success**</p>")
            return super(PasswordResetView, self).form_valid(form)