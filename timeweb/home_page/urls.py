from django.urls import path
from . import views
from timewebapp.views import TimewebView

def resolve(request):
    if request.user.is_authenticated:
        return TimewebView.as_view()(request)
    else:
        return views.HomePageView.as_view()(request)

urlpatterns = [
    path('', resolve, name='home'),
]