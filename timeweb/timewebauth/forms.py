from django.conf import settings
from django import forms
from django.contrib import messages
from django.utils.translation import gettext_lazy as _

from allauth.account import app_settings
from allauth.account.adapter import get_adapter
from allauth.account.utils import filter_users_by_email
from allauth.account.forms import (
    LoginForm,
    SignupForm,
    AddEmailForm,
    ChangePasswordForm,
    ResetPasswordForm,
    ResetPasswordKeyForm,
    PasswordVerificationMixin,
)
from allauth.socialaccount.forms import (
    SignupForm as SocialaccountSignupForm,
    DisconnectForm as SocialaccountDisconnectForm
)

from allauth.account.models import EmailAddress
from common.models import User

class LabeledLoginForm(LoginForm):
    error_messages = {
        "account_inactive": _("This account is currently disabled, please <a href=\"/contact\">contact us</a> for more information"),
        "email_password_mismatch": _(
            "Your e-mail address or password is incorrect"
        ),
    }

    def __init__(self, *args, **kwargs):
        super(LabeledLoginForm, self).__init__(*args, **kwargs)

        self.fields['login'] = forms.EmailField(
            label=_("E-mail address"),
            required=True,
            widget=forms.TextInput(
                attrs={
                    "type": "email",
                    "autocomplete": "email",
                    "class": "add-input-margin"
                }
            ),
        )
        self.fields['password'].widget.attrs["placeholder"] = ""
        self.label_suffix = ""

class LabeledSignupForm(SignupForm):
    username = forms.CharField(
        label=_("Username"),
        min_length=app_settings.USERNAME_MIN_LENGTH,
        widget=forms.TextInput(
            attrs={
                "autocomplete": "username",
                "class": "add-input-margin"
            }
        ),
    )
    email = forms.EmailField(
        label=_("E-mail address"),
        widget=forms.TextInput(
            attrs={
                "type": "email",
                "autocomplete": "email",
                "class": "add-input-margin"
            }
        )
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['email'].label = _("E-mail address")
        self.fields['password1'].widget.attrs["placeholder"] = ""

class LabeledAddEmailForm(AddEmailForm):
    email = forms.EmailField(
        label=_("E-mail address"),
        required=True,
        widget=forms.TextInput(
            attrs={"type": "email"}
        ),
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.label_suffix = ""

    def clean_email(self):
        # source is from super(LabeledAddEmailForm, self).clean_email()
        # This has been copied to modify the errors and add the example account validation
        value = self.cleaned_data["email"]
        value = get_adapter().clean_email(value)
        errors = {
            "this_account": _(
                "This e-mail address is already associated with your account"
            ),
            "different_account": _(
                "This e-mail address is already associated with another account"
            ),
            "max_email_addresses": _("You cannot add more than %d e-mail addresses"),
            "example_account": _("You cannot modify the example account")
        }
        users = filter_users_by_email(value)
        on_this_account = [u for u in users if u.pk == self.user.pk]
        on_diff_account = [u for u in users if u.pk != self.user.pk]
        on_example_account = self.user.email == settings.EXAMPLE_ACCOUNT_EMAIL

        if on_example_account:
            raise forms.ValidationError(errors["example_account"])
        if on_this_account:
            raise forms.ValidationError(errors["this_account"])
        if on_diff_account and app_settings.UNIQUE_EMAIL:
            raise forms.ValidationError(errors["different_account"])
        if not EmailAddress.objects.can_add_email(self.user):
            raise forms.ValidationError(
                errors["max_email_addresses"] % app_settings.MAX_EMAIL_ADDRESSES
            )
        return value

class LabeledChangePasswordForm(ChangePasswordForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['password1'].widget.attrs["placeholder"] = ""
        self.fields['password2'].widget.attrs["placeholder"] = ""
        self.fields['oldpassword'].widget.attrs["placeholder"] = ""
        self.label_suffix = ""

    def clean(self, *args, **kwargs):
        if self.user.email == settings.EXAMPLE_ACCOUNT_EMAIL:
            raise forms.ValidationError(_("You cannot modify the example account"))
        return LabeledTwoPasswordForm.clean(self)

class LabeledTwoPasswordForm(ResetPasswordKeyForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['password1'].widget.attrs["placeholder"] = ""
        self.fields['password2'].widget.attrs["placeholder"] = ""
        self.fields['password1'].widget.attrs["class"] = "add-input-margin"
        self.label_suffix = ""

    def clean(self):
        cleaned_data = super(PasswordVerificationMixin, self).clean()
        password1 = cleaned_data.get("password1")
        password2 = cleaned_data.get("password2")
        if (password1 and password2) and password1 != password2:
            self.add_error("password2", _("Your passwords don't match"))
        return cleaned_data

class LabeledResetPasswordForm(ResetPasswordForm):
    email = forms.EmailField(
        label=_("E-mail address"),
        required=True,
        widget=forms.TextInput(
            attrs={
                "type": "email",
                "autocomplete": "email",
            }
        ),
    )

    def _send_password_reset_mail(self, request, *args, **kwargs):
        super()._send_password_reset_mail(request, *args, **kwargs)
        messages.success(request, "Password reset e-mail has been sent.\n<p hidden>**Success**</p>")
    
    def clean_email(self, *args, **kwargs):
        email = super().clean_email(*args, **kwargs)
        if email == settings.EXAMPLE_ACCOUNT_EMAIL:
            raise forms.ValidationError(_("You cannot request a password reset for the example account"))
        return email

class LabeledSocialaccountDisconnectForm(SocialaccountDisconnectForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['account'].error_messages = {
            'required': _('Please select a Google account to remove'),
            'invalid_choice': _('The selected Google account is invalid'),
        }

class LabeledSocialaccountSignupForm(SocialaccountSignupForm):
    username = forms.CharField(
        label=_("Username"),
        min_length=app_settings.USERNAME_MIN_LENGTH,
        widget=forms.TextInput(
            attrs={"autocomplete": "username"}
        ),
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.label_suffix = ""
        self.fields['email'].widget = forms.HiddenInput()
    
    def clean_email(self):
        value = self.cleaned_data["email"]
        value = get_adapter().clean_email(value)
        if value and app_settings.UNIQUE_EMAIL:
            value = self.validate_unique_email(value)
        return value

class UsernameResetForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ("username", )
        widgets = {
            "username": forms.TextInput(),
        }

    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop("request")
        super().__init__(*args, **kwargs)
        self.fields['username'].label = "New username"
        self.label_suffix = ""
    
    def clean_username(self):
        if self.request.user.email == settings.EXAMPLE_ACCOUNT_EMAIL:
            raise forms.ValidationError("You cannot modify the example account")
        return self.cleaned_data["username"]