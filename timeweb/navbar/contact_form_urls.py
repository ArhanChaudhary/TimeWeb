from django.urls import path
from django.views.defaults import page_not_found

from . import forms, views

urlpatterns = [
    path('', views.SecuredFormView.as_view(form_class=forms.ContactForm), name='secured_contact_form'),
    path('sent/', page_not_found, {'exception': Exception()}),
]