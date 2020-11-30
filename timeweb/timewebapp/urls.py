"""[summary]
"""
from django.urls import path

from . import views

urlpatterns = [
    path('', views.home_view),
    path('list/', views.list_view),
]
