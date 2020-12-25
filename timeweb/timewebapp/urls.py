"""[summary]
"""
from django.urls import path

from . import views

urlpatterns = [
    path('<int:pk>/', views.TimewebView.as_view(),name='list'),
    path('', views.TimewebListView.as_view(),name='home'),
    path('new/', views.TimewebView.as_view(),name='new'),
    path('graph/<int:pk>/', views.TimewebGraphView.as_view(),name='graph'),
]
