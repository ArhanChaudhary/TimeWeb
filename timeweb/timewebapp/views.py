from django.shortcuts import render 
from .forms import TimewebForm
  
# creating a home view 
def home_view(request): 
    context = {} 
    form = TimewebForm(request.POST or None, request.FILES or None) 


    # check if form data is valid 
    #if form.is_valid(): 
     #   print("saved")
      #  # save the form data to model 
       # save_data = form.save(commit=False)
        #save_data.save()
    context['form'] = form 
    return render(request, "home.html", context) 