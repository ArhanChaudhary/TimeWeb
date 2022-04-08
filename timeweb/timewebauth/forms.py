from allauth.socialaccount.forms import SignupForm as SocialaccountSignupForm, DisconnectForm as SocialaccountDisconnectForm
from django.contrib.auth import get_user_model
from allauth.account.forms import *
from django.utils.translation import ugettext_lazy as _
from django.conf import settings

User = get_user_model()

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
        self.instance_email = str(kwargs['user'])
        super().__init__(*args, **kwargs)
        self.label_suffix = ""

    def clean_email(self):
        if self.instance_email == settings.EXAMPLE_ACCOUNT_EMAIL:
            raise forms.ValidationError(_("You cannot modify the example account"))
        return super(LabeledAddEmailForm, self).clean_email()

class LabeledChangePasswordForm(ChangePasswordForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['password1'].widget.attrs["placeholder"] = ""
        self.fields['password2'].widget.attrs["placeholder"] = ""
        self.fields['oldpassword'].widget.attrs["placeholder"] = ""
        self.label_suffix = ""

    def clean(self, *args, **kwargs):
        if str(self.user) == settings.EXAMPLE_ACCOUNT_EMAIL:
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

class UsernameResetForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ("username", )
        widgets = {
            "username": forms.TextInput(),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].label = "New username"
        self.label_suffix = ""