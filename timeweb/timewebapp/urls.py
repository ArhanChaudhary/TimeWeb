"""[summary]
"""
from django.urls import path

from . import views

urlpatterns = [
    path('<int:pk>/', views.home_view,name='home'),
    path('', views.list_view,name='lists'),
    path('new/', views.home_view,name='new'),
]
