from django.urls import path
from . import forms, views
from django.views.defaults import page_not_found

urlpatterns = [
    path('', views.SecuredFormView.as_view(form_class=forms.ContactForm), name='secured_contact_form'),
    path('sent/', page_not_found, {'exception': Exception()}),
]