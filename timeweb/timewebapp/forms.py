# import form class from django
from django import forms

# import TimewebModel from models.py
from .models import TimewebModel

# create a ModelForm


class TimewebForm(forms.ModelForm):

    # specify the name of model to use
    class Meta:
        model = TimewebModel
        fields = "__all__"
        #exclude = ["img", "last_modified"]
