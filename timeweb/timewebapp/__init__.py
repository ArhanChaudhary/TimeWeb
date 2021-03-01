from django.forms.fields import Field
from django.utils.translation import gettext_lazy as _
Field.default_error_messages['required'] = _('This field cannot be a space')