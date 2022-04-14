from django.views.defaults import page_not_found
from django.urls import path
from . import views

urlpatterns = [
    path('accounts/logout', page_not_found),
    path("password/reset/", views.MessagedPasswordResetView.as_view(), name="account_reset_password"),
    path('username/reset', views.UsernameResetView.as_view(), name='reset_username'),
]