from django.conf import settings
from django.contrib.sites.models import Site
from django.utils.deprecation import MiddlewareMixin

class AddSiteID(MiddlewareMixin):
    def process_request(self, request):
        try:
            current_site = Site.objects.get(domain=request.get_host() if settings.DEBUG else "timeweb.io")
        except Site.DoesNotExist:
            current_site = Site.objects.get(domain="example.com")

        request.current_site = current_site
        settings.SITE_ID = current_site.id