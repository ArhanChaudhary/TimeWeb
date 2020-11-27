from django.shortcuts import render 
from .forms import TimewebForm
  
# creating a home view 
def home_view(request): 

    # dictionary for initial data with  
    # field names as keys 
    context = {} 

    # add the dictionary during initialization 
    form = TimewebForm(request.POST or None, request.FILES or None) 
    context['form'] = form

    # check if form data is valid 
    if form.is_valid(): 
        print("Form Values::")
        print(request.POST)
        
        # save the form data to model 
        save_data = form.save(commit=False)
        print("---")
        print(save_data)
        print("---")

        save_data.save()
        print("Database saved")

    return render(request, "home.html", context) 