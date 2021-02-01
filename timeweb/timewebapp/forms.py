# import form class from django
from django import forms

# import TimewebModel from models.py
from .models import TimewebModel

# create a ModelForm

class DateInput(forms.DateInput):
    input_type = 'date'

class TimewebForm(forms.ModelForm):

    # specify the name of model to use
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.label_suffix = ""

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
        }