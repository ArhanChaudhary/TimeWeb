from django.urls import path
from . import views
from django.views.generic import TemplateView

urlpatterns = [
    path(r'', views.TimewebListView.as_view(),name='home'),
    path('robots.txt', TemplateView.as_view(template_name="robots.txt", content_type='text/plain')),
]
