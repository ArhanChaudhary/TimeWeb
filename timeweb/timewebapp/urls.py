from django.urls import path
from . import views

urlpatterns = [
    path(r'<int:pk>/', views.TimewebView.as_view(),name='list'),
    path(r'', views.TimewebListView.as_view(),name='home'),
    path(r'new/', views.TimewebView.as_view(),name='new'),
]
