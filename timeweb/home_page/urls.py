from django.urls import path
from . import views
from timewebapp.views import TimewebView

def resolve(request):
    if request.user.is_authenticated:
        view_class = TimewebView
    else:
        view_class = views.HomePageView
    return view_class.as_view()(request)

urlpatterns = [
    path('', resolve, name='home'),
]