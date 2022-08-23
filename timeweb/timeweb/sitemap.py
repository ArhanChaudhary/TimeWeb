from django.urls import reverse
from django.contrib.sitemaps import Sitemap
import datetime

class AppSitemap(Sitemap):
    priority = 0.5
    changefreq = 'monthly'

    def items(self):
        return [
            'home',
            'account_login',
            'account_signup',
            'contact_form',
            'blog',
            'user_guide',
        ]

    def location(self, item):
        return reverse(item)

    def lastmod(self, item):
        return datetime.datetime(2022, 8, 23, 10, 8, 37, 271486, tzinfo=datetime.timezone.utc)