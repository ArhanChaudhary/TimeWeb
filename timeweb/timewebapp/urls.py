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
