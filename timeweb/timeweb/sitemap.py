from django.urls import reverse
from django.contrib.sitemaps import Sitemap
import datetime

class AppSitemap(Sitemap):
    priority = 0.5
    changefreq = 'weekly'

    def items(self):
        return [
            'home',
            'account_login',
            'account_signup',
            'contact_form',
            'user_guide',
        ]

    def location(self, item):
        return reverse(item)

    def lastmod(self, item):
        return datetime.datetime(2022, 8, 25)