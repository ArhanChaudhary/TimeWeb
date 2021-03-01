from django.urls import path
from . import views

urlpatterns = [
    path(r'', views.TimewebListView.as_view(),name='home'),
]
