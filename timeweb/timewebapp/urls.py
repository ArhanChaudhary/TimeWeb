from django.urls import path, re_path
from . import views
from django.views.generic import RedirectView
from django.http import HttpResponse

urlpatterns = [
    path('', views.TimewebView.as_view(),name='home'),
    path('settings', views.SettingsView.as_view(),name='settings'),
    path('contact', views.ContactView.as_view(),name='contact'),
    path('changelog', views.ChangelogView.as_view(),name='changelog'),
    path('robots.txt', lambda x: HttpResponse("# If you came from the discord gg you get a super duper secret role\n# pm me this message at Arch#5808\n# also, pls don't tell anyone as it'll ruin the fun of this small game\nUser-Agent: *\nDisallow:", content_type="text/plain"), name="robots_file"),
    path('favicon.ico', RedirectView.as_view(url='/static/images/icons/favicon.ico')),

    path('hotdogs', views.hotdogsView.as_view(),name='hotdogs'),
    path("doov", views.doovView.as_view(), name='doov'),
    re_path(r"^wp", RedirectView.as_view(url='/static/misc/rick.html')),
    re_path(r"^wordpress", RedirectView.as_view(url='/static/misc/rick.html')),
]