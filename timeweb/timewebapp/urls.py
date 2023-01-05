from django.urls import path
from django.conf import settings

RELOAD_VIEWS = ('home', 'deleted_assignments', 'account_login', ) # account_login must be the last one so base.js can reload
KEEP_EXAMPLE_ACCOUNT_LOGGED_IN_VIEWS = ("home", "example", "settings", "deleted_assignments",
    "user_guide", "account_change_password", "reset_username", "account_email", 
    "socialaccount_connections", "serviceworker")

from . import views

urlpatterns = [
    # if I add any views make sure to change RELOAD_VIEWS
    path('', views.TimewebView.as_view(),name='home'),
    path('deleted-assignments/', views.TimewebView.as_view(), name='deleted_assignments'),
    path('example/', views.ExampleAccountView.as_view(), name='example'),
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
