from django import forms
from .models import TimewebModel
from django.utils.translation import ugettext_lazy as _
class DateInput(forms.DateInput):
    input_type = 'date'

class TimewebForm(forms.ModelForm):

    class Meta:
        model = TimewebModel
        fields = "__all__"
        widgets = {
            'ad': DateInput(),
            'x': DateInput(),
            'dif_assign': forms.HiddenInput(),
            'skew_ratio': forms.HiddenInput(),
            'fixed_mode': forms.HiddenInput(),
            'dynamic_start': forms.HiddenInput(),
            'total_mode': forms.HiddenInput(),
            'remainder_mode': forms.HiddenInput(),
            'user': forms.HiddenInput(),
        }
    
    def __init__(self, *args, **kwargs):
        self.label_suffix = ""
        super().__init__(*args, **kwargs)
    
    # Override form.is_valid in views
    def clean(self):
        cleaned_data = super().clean()
        x = cleaned_data.get("x")
        ad = cleaned_data.get("ad")
        works = cleaned_data.get("works")
        y = cleaned_data.get("y")
        file_sel = cleaned_data.get("file_sel")
        if works >= y >= 0:
            self.add_error("works",
                forms.ValidationError(_("This field's value of %(value)g cannot be " + ("equal to" if works == y else "greater than") + " %(y)g"),code='invalid',params={
                    'value':works,
                    'y':y,
                })
            )
        if x <= ad:
            self.add_error("x",
                forms.ValidationError(_("The due date cannot be " + ("on" if x == ad else "before") + " the assignment date"),code='invalid')
            )
        return cleaned_data