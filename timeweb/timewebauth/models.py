from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.validators import *

class LabeledUnicodeUsernameValidator(UnicodeUsernameValidator):
    message = _("Please enter a username that only contains letters, numbers, and @/./+/-/_ characters")

class TimewebUser(AbstractUser):
    # Make sure to create own validator class for custom error messages if I decide to add future validators from django.contrib.auth.validators
    username_validator = LabeledUnicodeUsernameValidator()

    username = models.CharField(
        _('username'),
        max_length=150,
        unique=False,
        validators=[username_validator],
    )
    email = models.EmailField(_('email address'), max_length = 255, unique=True)
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email