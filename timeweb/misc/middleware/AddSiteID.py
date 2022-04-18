from django.conf import settings
from django.contrib.sites.models import Site

class AddSiteID:
    def __init__(self, get_response):
        self.get_response = get_response
        try:
            self.current_site = Site.objects.get(domain="localhost" if settings.DEBUG else "timeweb.io")
        except Site.DoesNotExist:
            self.current_site = Site.objects.get(domain="example.com")
        settings.SITE_ID = self.current_site.id

    def __call__(self, request):
        request.current_site = self.current_site
        return self.get_response(request)