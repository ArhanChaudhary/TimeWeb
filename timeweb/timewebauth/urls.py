from django.views.defaults import page_not_found
from django.urls import path
from . import views

urlpatterns = [
    path('logout', page_not_found),
    path('username/reset', views.UsernameResetView.as_view(), name='reset_username'),
]