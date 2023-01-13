from django.urls import path
from . import forms, views

urlpatterns = [
    path('', views.SecuredFormView.as_view(form_class=forms.ContactForm), name='secured_contact_form'),
]