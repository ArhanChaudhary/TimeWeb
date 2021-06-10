from django.urls import path, re_path
from . import views
from django.views.generic import RedirectView
from django.http import HttpResponse

urlpatterns = [
    path('', views.TimewebView.as_view(),name='home'),
    path('settings', views.SettingsView.as_view(),name='settings'),
    path('contact', views.ContactView.as_view(),name='contact'),
    path('changelog', views.ChangelogView.as_view(),name='changelog'),
    path('policies', RedirectView.as_view(url='/static/policies/policies.html')),
    path('cookies', RedirectView.as_view(url='/static/policies/cookies.html')),
    path('disclaimer', RedirectView.as_view(url='/static/policies/disclaimer.html')),
    path('licenses-and-credits', RedirectView.as_view(url='/static/policies/licenses-and-credits.html')),
    path('privacy', RedirectView.as_view(url='/static/policies/privacy.html')),
    path('terms', RedirectView.as_view(url='/static/policies/terms.html')),

    path('robots.txt', lambda x: HttpResponse("# If you came from the discord gg you get a super duper secret role\n# pm me this message at Arch#5808\n# also, pls don't tell anyone as it'll ruin the fun of this small game\nUser-Agent: *\nDisallow:", content_type="text/plain"), name="robots_file"),
    path('android-chrome-192x192.png', RedirectView.as_view(url='/static/images/icons/android-chrome-192x192.png')),
    path('android-chrome-512x512.png', RedirectView.as_view(url='/static/images/icons/android-chrome-512x512.png')),
    path('apple-touch-icon-precomposed.png', RedirectView.as_view(url='/static/images/icons/apple-touch-icon-precomposed.png')),
    path('apple-touch-icon.png', RedirectView.as_view(url='/static/images/icons/apple-touch-icon.png')),
    path('browserconfig.xml', RedirectView.as_view(url='/static/images/icons/browserconfig.xml')),
    path('favicon-16x16.png', RedirectView.as_view(url='/static/images/icons/favicon-16x16.png')),
    path('favicon-32x32.png', RedirectView.as_view(url='/static/images/icons/favicon-32x32.png')),
    path('favicon.ico', RedirectView.as_view(url='/static/images/icons/favicon.ico')),
    path('mstile-150x150.png', RedirectView.as_view(url='/static/images/icons/mstile-150x150.png')),
    path('safari-pinned-tab.svg', RedirectView.as_view(url='/static/images/icons/safari-pinned-tab.svg')),

    path('hotdogs', views.hotdogsView.as_view(),name='hotdogs'),
    path('stackpile', views.stackpileView.as_view(),name='stackpile'),
    path("doov", views.doovView.as_view(), name='doov'),
    re_path(r"^(wp|wordpress)", views.rickView.as_view()),
]