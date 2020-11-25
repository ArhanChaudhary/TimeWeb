from django.shortcuts import render 
from .forms import GeeksForm 
  
# Create your views here. 
def home_view(request): 
    context ={} 
    context['form']= GeeksForm() 
    return render(request, "home.html", context) 