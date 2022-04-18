from django.conf import settings
from django.contrib.sites.models import Site

try:
    current_site = Site.objects.get(domain="localhost" if settings.DEBUG else "timeweb.io")
except Site.DoesNotExist:
    current_site = Site.objects.get(domain="example.com")

class AddSiteID:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.current_site = current_site
        settings.SITE_ID = current_site.id
        return self.get_response(request)