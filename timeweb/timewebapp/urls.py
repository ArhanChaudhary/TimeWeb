"""[summary]
"""
from django.urls import path
from django.views.generic import RedirectView
from django.conf.urls import url

from . import views

urlpatterns = [
    path(r'<int:pk>/', views.TimewebView.as_view(),name='list'),
    path(r'', views.TimewebListView.as_view(),name='home'),
    path(r'new/', views.TimewebView.as_view(),name='new'),
    path(r'graph/<int:pk>/', views.TimewebGraphView.as_view(),name='graph'),
    url(r'^favicon\.ico$',RedirectView.as_view(url='/static/favicon.ico')),
]
