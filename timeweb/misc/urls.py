from django.urls import path, re_path
from django.http import HttpResponse
from . import views
from django.views.generic import RedirectView
from common.utils import app_static_factory

app_static = app_static_factory(__package__)

urlpatterns = [
    path('robots.txt', lambda x: HttpResponse("# If you came from the discord gg you get a super duper secret role\n# pm me this message at Arch#5808\n# also, pls don't tell anyone as it'll ruin the fun of this small game\nUser-Agent: *\nDisallow:", content_type="text/plain"), name="robots_file"),
    path('.well-known/security.txt', lambda x: HttpResponse('''Contact: mailto:arhan.ch@gmail.com
Expires: 2023-07-27T07:00:00.000Z
Preferred-Languages: en
Canonical: https://timeweb.io/.well-known/security.txt''', content_type="text/plain"), name="security_file"),

    path('android-chrome-192x192.png', RedirectView.as_view(url=app_static('icons/android_chrome_192x192.png'))),
    path('android-chrome-512x512.png', RedirectView.as_view(url=app_static('icons/android_chrome_512x512.png'))),
    path('apple-touch-icon-precomposed.png', RedirectView.as_view(url=app_static('icons/apple_touch_icon_precomposed.png'))),
    path('apple-touch-icon.png', RedirectView.as_view(url=app_static('icons/apple_touch_icon.png'))),
    path('browserconfig.xml', RedirectView.as_view(url=app_static('icons/browserconfig.xml'))),
    path('favicon-16x16.png', RedirectView.as_view(url=app_static('icons/favicon_16x16.png'))),
    path('favicon-32x32.png', RedirectView.as_view(url=app_static('icons/favicon_32x32.png'))),
    path('favicon.ico', RedirectView.as_view(url=app_static('icons/favicon.ico'))),
    path('mstile-150x150.png', RedirectView.as_view(url=app_static('icons/mstile_150x150.png'))),
    path('safari-pinned-tab.svg', RedirectView.as_view(url=app_static('icons/safari_pinned_tab.svg'))),

    path('stackpile', RedirectView.as_view(url="https://stackpile.me"), name='stackpile'),
    path('nurse', RedirectView.as_view(url="https://contactvikram.github.io"), name='nursing ai'),
    path('spooky', views.SpookyView.as_view(), name="spooky"),
    path('sus', views.SusView.as_view(), name="sus"),
    path('mc.blogcraft.dev', lambda x: HttpResponse(status=418), name="bithub"),
    path('chungus', views.ChungusView.as_view(), name="chungus"),
    re_path(r"^(wp|wordpress)", views.RickView.as_view()),
]