from django.urls import path
from django.conf import settings

# account_login must be the last one so base.js can reload
# settings must be the second to last one so base.js can redirect
# settings must be here for two reasons:
# 1. so the user can use the back button in the deleted assignments view
# 2. so unsubmitted settings dont persist if the users use the back button in the assignments view
# 3. the save button and the logo are unclickable after the unload event
RELOAD_VIEWS = ('home', 'deleted_assignments', 'settings', 'account_login', )

from . import views

urlpatterns = [
    # Root urlpattern is handled in home_page app
    # if I add any views make sure to change RELOAD_VIEWS
    path('deleted-assignments/', views.TimewebView.as_view(), name='deleted_assignments'),
    path('example/', views.ExampleAccountView.as_view(), name='example'),
    path('example/deleted-assignments/', views.ExampleAccountView.as_view(), name='example_deleted_assignments'),
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
