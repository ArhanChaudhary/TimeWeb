from django.urls import path
from . import views
from django.views.generic import TemplateView, RedirectView
from django.http import HttpResponse

urlpatterns = [
    path('', views.TimewebListView.as_view(),name='home'),
    path('settings', views.SettingsView.as_view(),name='settings'),
    path('robots.txt', lambda x: HttpResponse("User-Agent: *\nDisallow:", content_type="text/plain"), name="robots_file"),
    path('favicon.ico', RedirectView.as_view(url='/static/images/icons/favicon.ico')),
]