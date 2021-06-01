from django import forms
from .models import TimewebModel, SettingsModel
from django.utils.translation import ugettext_lazy as _
from colorfield.widgets import ColorWidget
class DateInput(forms.DateInput):
    input_type = 'date'

class TimewebForm(forms.ModelForm):
    class Meta:
        model = TimewebModel
        fields = "__all__"
        widgets = {
            'assignment_name': forms.TextInput(attrs={"placeholder": "Ex: Reading book, English essay, Math homework"}),
            'ad': DateInput(),
            'x': DateInput(),
            'dif_assign': forms.HiddenInput(),
            'skew_ratio': forms.HiddenInput(),
            'fixed_mode': forms.HiddenInput(),
            'dynamic_start': forms.HiddenInput(),
            'user': forms.HiddenInput(),
            'unit': forms.TextInput(attrs={"placeholder": "Ex: Chapter, Paragraph, Question"}),
            'works': forms.NumberInput(attrs={"min":"0","step":"0.01"}),
            'y': forms.NumberInput(attrs={"min":"1"}),
            'ctime': forms.NumberInput(attrs={"min":"0"}),
            'funct_round': forms.NumberInput(attrs={"min":"0"}),
            'min_work_time': forms.NumberInput(attrs={"min":"0"}),
            'mark_as_done': forms.HiddenInput(),
        }
        error_messages = {
            'assignment_name': {
                'required': _("Please enter an assignment name"),
                'max_length': _("This assignment's name is too long (>100 characters)"),
                'invalid': _("This assignment's name is invalid"),
            },
            'ad': {
                'required': _('You must enter an assignment date'),
                'invalid': _('The assignment date is out of range or invalid'),
            },
            'x': {
                'invalid': _('The due date is out of range or invalid'),
            },
            'unit': {
                'required': _("Please enter a name"),
                'max_length': _("This field's name is too long (>40 characters)"),
                'invalid': _("This field's value is invalid"),
            },
            'y': {
                'required': _("Please enter a value"),
                'max_digits': _("This field's value is too long (>15 digits)"),
                'max_decimal_places': _("This field's value has too many decimal places (>2 decimal places)"),
                'max_whole_digits': _("This field's value has too many digits before its decimal point (>13 digits)"),
            },
            'works': {
                'required': _("Please enter a value"),
                'invalid': _("This field's value is invalid"),
            },
            'ctime': {
                'required': _("Please enter a value"),
                'max_digits': _("This field's value is too long (>15 digits)"),
                'max_decimal_places': _("This field's value has too many decimal places (>2 decimal places)"),
                'max_whole_digits': _("This field's value has too many digits before its decimal point (>13 digits)"),
                'invalid': _("This field's value is invalid"),
            },
            'funct_round': {
                'max_digits': _("This field's value is too long (>15 digits)"),
                'max_decimal_places': _("This field's value has too many decimal places (>2 decimal places)"),
                'max_whole_digits': _("This field's value has too many digits before its decimal point (>13 digits)"),
                'invalid': _("This field's value is invalid"),
            },
            'min_work_time': {
                'max_digits': _('The minimum work time is too long (>15 digits)'),
                'max_decimal_places': _("The minimum work time has too many decimal places (>2 decimal places)"),
                'max_whole_digits': _("The minimum work time has too many digits before its decimal point (>13 digits)"),
                'invalid': _("The minimum work time is invalid"),
            },
        }
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.label_suffix = ""

    def clean(self):
        cleaned_data = super().clean()
        x = cleaned_data.get("x")
        ad = cleaned_data.get("ad")
        works = cleaned_data.get("works")
        y = cleaned_data.get("y")
        try:
            if works >= y >= 1:
                self.add_error("works",
                    forms.ValidationError(_("This field's value of %(value)g cannot be %(equal_to_or_greater_than)s the above field's value of %(y)g"),code='invalid',params={
                        'value':works,
                        'y':y,
                        'equal_to_or_greater_than': "equal to" if works == y else "greater than",
                    })
                )
        except:
            pass
        try:
            if x <= ad:
                self.add_error("x",
                    forms.ValidationError(_("The due date cannot be %(on_or_before)s the assignment date"),code='invalid',params={
                        'on_or_before': "on" if x == ad else "before",
                    })
                )
        except:
            pass
        return cleaned_data

class SettingsForm(forms.ModelForm):
    class Meta:
        model = SettingsModel
        fields = "__all__"
        widgets = {
            "user": forms.HiddenInput(),
            "first_login": forms.HiddenInput(),
            'def_min_work_time': forms.NumberInput(attrs={"min":"0"}),
            'warning_acceptance': forms.NumberInput(attrs={"min":"1","max":"100"}),
            'date_now': forms.HiddenInput(),
            'highest_priority_color': ColorWidget,
            'lowest_priority_color': ColorWidget,
            'def_skew_ratio': forms.NumberInput(attrs={"step":"0.1"}),
        }
        error_messages = {
            'def_min_work_time': {
                'max_digits': _('The default minimum work time is too long (>15 digits)'),
                'max_decimal_places': _("The default minimum work time has too many decimal places (>2 decimal places)"),
                'max_whole_digits': _("The default minimum work time has too many digits before its decimal point (>13 digits)"),
                'invalid': _("The default minimum work time is invalid"),
            },
            'def_skew_ratio': {
                'max_digits': _('The default skew ratio is too long (>17 digits)'),
                'max_decimal_places': _("The default skew ratio has too many decimal places (>10 decimal places)"),
                'max_whole_digits': _("The default skew ratio has too many digits before its decimal point (>7 digits)"),
                'invalid': _("The default skew ratio is invalid"),
            }
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.label_suffix = ""