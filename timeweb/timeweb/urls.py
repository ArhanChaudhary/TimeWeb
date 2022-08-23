"""timeweb URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path,include
from django.contrib.sitemaps.views import sitemap
from .sitemap import AppSitemap

import os
admin_url = os.environ.get("ADMINURL", "admin/")
urlpatterns = [
    path(admin_url, admin.site.urls),
    path('accounts/', include('allauth.urls')),
    path('contact/', include('contact_form.urls')),
    path('', include('home_page.urls')),
    path('', include('timewebapp.urls')),
    path('api/', include('api.urls')),
    path('accounts/', include('timewebauth.urls')),
    path('', include('navbar.urls')),
    path('', include('misc.urls')),
    path('', include('pwa.urls')),
    path('sitemap.xml', sitemap, {'sitemaps': {"app": AppSitemap}},
     name='django.contrib.sitemaps.views.sitemap')
]

handler403 = 'common.utils._403_or_429'
