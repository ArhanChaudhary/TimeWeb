from django.urls import path
from . import views
from django.views.generic import RedirectView
from django.conf import settings

def get_static_url(url_path):
    return f"/static/{url_path}" if settings.DEBUG else f'https://storage.googleapis.com/twstatic/{url_path}'

urlpatterns = [
    path('', views.TimewebView.as_view(),name='home'),
    path('example', views.ExampleAccountView.as_view(), name='example'),

    path('gc-api-auth-init', views.GCOAuthView.as_view()),
    path('gc-api-auth-callback', views.GCOAuthView.as_view()),

    path('robots.txt', lambda x: HttpResponse("# If you came from the discord gg you get a super duper secret role\n# pm me this message at Arch#5808\n# also, pls don't tell anyone as it'll ruin the fun of this small game\nUser-Agent: *\nDisallow:", content_type="text/plain"), name="robots_file"),
    path('.well-known/security.txt', lambda x: HttpResponse('''Contact: mailto:arhan.ch@gmail.com
Expires: 2023-07-27T07:00:00.000Z
Preferred-Languages: en
Canonical: https://timeweb.io/.well-known/security.txt''', content_type="text/plain"), name="security_file"),
    path('android-chrome-192x192.png', RedirectView.as_view(url=get_static_url('images/icons/android-chrome-192x192.png'))),
    path('android-chrome-512x512.png', RedirectView.as_view(url=get_static_url('images/icons/android-chrome-512x512.png'))),
    path('apple-touch-icon-precomposed.png', RedirectView.as_view(url=get_static_url('images/icons/apple-touch-icon-precomposed.png'))),
    path('apple-touch-icon.png', RedirectView.as_view(url=get_static_url('images/icons/apple-touch-icon.png'))),
    path('browserconfig.xml', RedirectView.as_view(url=get_static_url('images/icons/browserconfig.xml'))),
    path('favicon-16x16.png', RedirectView.as_view(url=get_static_url('images/icons/favicon-16x16.png'))),
    path('favicon-32x32.png', RedirectView.as_view(url=get_static_url('images/icons/favicon-32x32.png'))),
    path('favicon.ico', RedirectView.as_view(url=get_static_url('images/icons/favicon.ico'))),
    path('mstile-150x150.png', RedirectView.as_view(url=get_static_url('images/icons/mstile-150x150.png'))),
    path('safari-pinned-tab.svg', RedirectView.as_view(url=get_static_url('images/icons/safari-pinned-tab.svg'))),

    path('stackpile', views.StackpileView.as_view(), name='stackpile'),
    path('spooky', views.SpookyView.as_view(), name="spooky"),
    path('sus', views.SusView.as_view(), name="sus"),
    path('mc.blogcraft.dev', lambda x: HttpResponse(status=418), name="bithub"),
    path('chungus', views.ChungusView.as_view(), name="chungus"),
    re_path(r"^(wp|wordpress)", views.RickView.as_view()),
]
if settings.DEBUG:
    from django.conf.urls.static import static
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

    # # https://stackoverflow.com/questions/69301677/script-file-is-served-from-memory-cache-when-using-service-worker-on-chrome (google's crc323c module may fix this, come back to this in v1.7.1)
    # # Run this with manage.py --nostatic
    # from django.contrib.staticfiles.views import serve
    # def custom_serve(request, path, insecure=False, **kwargs):
    #     response = serve(request, path, insecure=True)
    #     response['Cache-Control'] = 'no-store' (?) or something else
    #     return response
    # urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT, view=custom_serve)
