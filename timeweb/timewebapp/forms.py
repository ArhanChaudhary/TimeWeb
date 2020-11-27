# import form class from django 
from django import forms 
  
# import GeeksModel from models.py 
# from .models import TimewebModel 
  
# create a ModelForm 
class TimewebForm(forms.Form): 
    
    first_name = forms.CharField(max_length = 200)  
    last_name = forms.CharField(max_length = 200)  
    roll_number = forms.IntegerField(  
                     help_text = "Enter 6 digit roll number"
                     )  
    password = forms.CharField(widget = forms.PasswordInput())  


  # specify the name of model to use 
    # class Meta: 
    #     model = TimewebModel 
    #     fields = "__all__"
    #     exclude = ["img", "last_modified"]
