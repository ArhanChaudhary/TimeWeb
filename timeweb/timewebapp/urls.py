from django.urls import path
from . import views
from django.views.generic import TemplateView, RedirectView

urlpatterns = [
    path('', views.TimewebListView.as_view(),name='home'),
    path('robots.txt', TemplateView.as_view(template_name="robots.txt", content_type='text/plain')),
    path('favicon.ico',RedirectView.as_view(url='/static/images/icons/favicon.ico')),
]
