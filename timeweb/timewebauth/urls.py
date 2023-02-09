from django.views.defaults import page_not_found
from django.urls import path, re_path
from django.conf import settings

from allauth.account.views import LogoutView
from . import views

urlpatterns = [
    # Redirect to login instead of password/reset/key/done/ after a successful password reset
    re_path(r"^password/reset/key/(?P<uidb36>[0-9A-Za-z]+)-(?P<key>.+)/$", views.password_reset_from_key_no_done_view, name="account_reset_password_from_key"),
    path("password/reset/key/done/", page_not_found, {'exception': Exception()}),
    # Remove the original allauth templates
    path('logout/', LogoutView.as_view(http_method_names=['post']), name='account_logout'),
    path('google/login/', views.oauth2_login_no_get, name="google_login"),
    # Slight modification to this route's view
    path("social/connections/", views.labeled_connections, name="socialaccount_connections"),
    # Own view
    path('username/reset/', views.UsernameResetView.as_view(), name='reset_username'),
]
if settings.DEBUG:
    urlpatterns.append(path('view-email-message', views.EmailMessageView.as_view(), name="view_email_message"))