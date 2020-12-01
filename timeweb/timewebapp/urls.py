"""[summary]
"""
from django.urls import path

from . import views

urlpatterns = [
    path('', views.home_view),
    path('lists/', views.list_view,name='lists'),
    path('lists/<int:pk>', views.detail_view,name='details'),
]
