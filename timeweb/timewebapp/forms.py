from django import forms
from .models import TimewebModel
from django.utils.translation import ugettext_lazy as _
from django.utils import timezone
from datetime import timedelta
class DateInput(forms.DateInput):
    input_type = 'date'

class TimewebForm(forms.ModelForm):
    class Meta:
        model = TimewebModel
        fields = "__all__"
        widgets = {
            'ad': DateInput(),
            'x': DateInput(attrs={'min': (timezone.localtime(timezone.now()).date()+timedelta(1)).strftime("%Y-%m-%d"),}),
            'dif_assign': forms.HiddenInput(),
            'skew_ratio': forms.HiddenInput(),
            'fixed_mode': forms.HiddenInput(),
            'dynamic_start': forms.HiddenInput(),
            'total_mode': forms.HiddenInput(),
            'remainder_mode': forms.HiddenInput(),
            'user': forms.HiddenInput(),
            'works': forms.NumberInput(attrs={"min":"0","oninput":"validity.valid||(value='');","step":"0.01","value":"0.00"}),
            'y': forms.NumberInput(attrs={"min":"1","oninput":"validity.valid||(value='');"}),
            'ctime': forms.NumberInput(attrs={"min":"0","oninput":"validity.valid||(value='');"}),
            'funct_round': forms.NumberInput(attrs={"min":"0","oninput":"validity.valid||(value='');"}),
            'min_work_time': forms.NumberInput(attrs={"min":"0","oninput":"validity.valid||(value='');"}),
        }
        error_messages = {
            'file_sel': {
                'required': _("This assignment's name cannot be a space"),
                'max_length': _("This assignment's name is too long (>100 characters)"),
            },
            'ad': {
                'required': _('You must enter an assignment date'),
                'invalid': _('This date is out of range or invalid'),
            },
            'x': {
                'invalid': _('This date is out of range or invalid'),
            },
            'unit': {
                'required': _("This assignment's name cannot be a space"),
                'max_length': _('This field is too long (>40 characters)'),
            },
            'y': {
                'max_digits': _('This value is too big (>15 digits)'),
                'max_decimal_places': _('This value cannot have more than 2 decimal places'),
            },
            'ctime': {
                'max_digits': _('This value is too big (>15 digits)'),
                'max_decimal_places': _('This value cannot have more than 2 decimal places'),
            },
            'funct_round': {
                'max_digits': _('The grouping value is too big (>15 digits)'),
                'max_decimal_places': _('The grouping value cannot have more than 2 decimal places'),
            },
            'min_work_time': {
                'max_digits': _('The minimum work time is too big (>15 digits)'),
                'max_decimal_places': _('The minimum work time cannot have more than 2 decimal places'),
            },
        }
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.label_suffix = ""
    
    # Override form.is_valid in views
    def clean(self):
        cleaned_data = super().clean()
        x = cleaned_data.get("x")
        ad = cleaned_data.get("ad")
        works = cleaned_data.get("works")
        y = cleaned_data.get("y")
        file_sel = cleaned_data.get("file_sel")
        if None not in [works,y] and works >= y >= 1:
            self.add_error("works",
                forms.ValidationError(_("This field's value of %(value)g cannot be %(equal_to_or_greater_than)s %(y)g"),code='invalid',params={
                    'value':works,
                    'y':y,
                    'equal_to_or_greater_than': "equal to" if works == y else "greater than",
                })
            )
        if None not in [x,ad] and x <= ad:
            self.add_error("x",
                forms.ValidationError(_("The due date cannot be %(on_or_before)s the assignment date"),code='invalid',params={
                    'on_or_before': "on" if x == ad else "before",
                })
            )
        return cleaned_data