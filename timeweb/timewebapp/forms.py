# import the standard Django Forms 
# from built-in library 
#from django import forms  
    
# creating a form   
#class InputForm(forms.Form):  
 #   
  #  first_name = forms.CharField(max_length = 200)  
   # last_name = forms.CharField(max_length = 200)  
    #roll_number = forms.IntegerField(  
 #                    help_text = "Enter 6 digit roll number"
  #                   )  
   # password = forms.CharField(widget = forms.PasswordInput()) 
# import form class from django 
from django import forms 

# creating a django form
class GeeksForm(forms.Form): 
    title = forms.CharField(widget = forms.Textarea,required=False) 
    description = forms.CharField(widget = forms.CheckboxInput,required=False) 
    views = forms.IntegerField(widget = forms.TextInput,required=False) 
    date = forms.DateField(required=False,widget = forms.SelectDateWidget) 