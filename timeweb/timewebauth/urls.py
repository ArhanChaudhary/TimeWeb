from django.views.defaults import page_not_found
from django.urls import path
import allauth.account.views as allauth_views
from . import views

urlpatterns = [
    # Redirect to login instead of password/reset/key/done/ after a successful password reset
    path("login/", allauth_views.login, name="account_reset_password_from_key_done"),
    path("password/reset/key/done/", page_not_found),
    # There is already a built-in functionality to logout in the app
    # Remove the original allauth view
    path('logout', page_not_found),
    # Slight modification to this route's view
    path("connections/", views.connections, name="socialaccount_connections"),
    # Own view
    path('username/reset', views.UsernameResetView.as_view(), name='reset_username'),
]