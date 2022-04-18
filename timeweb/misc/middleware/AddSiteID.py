from django.conf import settings
from django.contrib.sites.models import Site
from django.utils.deprecation import MiddlewareMixin

try:
    current_site = Site.objects.get(domain="localhost" if settings.DEBUG else "timeweb.io")
except Site.DoesNotExist:
    current_site = Site.objects.get(domain="example.com")

class AddSiteID(MiddlewareMixin):
    def process_request(self, request):
        request.current_site = current_site
        settings.SITE_ID = current_site.id