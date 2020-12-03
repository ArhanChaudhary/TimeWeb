"""[summary]
"""
from django.urls import path

from . import views

urlpatterns = [
    path('<int:pk>/', views.TimewebView.as_view(),name='home'),
    path('', views.TimewebListView.as_view(),name='lists'),
    path('new/', views.TimewebView.as_view(),name='new'),
]
