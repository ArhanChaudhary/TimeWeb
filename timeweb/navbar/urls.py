from django.urls import path
from django.views.generic import RedirectView
from . import views, forms
from common.utils import app_static_factory

app_static = app_static_factory(__package__)

urlpatterns = [
    path('settings', views.SettingsView.as_view(), name='settings'),
    path('blog', views.BlogView.as_view(), name='blog'),
    path('user-guide', views.UserguideView.as_view(), name='user_guide'),
    path('changelog', views.ChangelogView.as_view(), name='changelog'),
    path('contact', views.ContactFormView.as_view(form_class=forms.ContactForm), name='contact_form'),
    path('policies', RedirectView.as_view(url=app_static('policies/policies.html')), name='policies'),
    path('cookies', RedirectView.as_view(url=app_static('policies/cookies.html'))),
    path('disclaimer', RedirectView.as_view(url=app_static('policies/disclaimer.html'))),
    path('privacy', RedirectView.as_view(url=app_static('policies/privacy.html'))),
    path('terms', RedirectView.as_view(url=app_static('policies/terms.html'))),
    path('license', RedirectView.as_view(url="https://github.com/ArhanChaudhary/TimeWeb/blob/master/LICENSE")),
    
    path('facebook', RedirectView.as_view(url='https://facebook.com/TimeWeb-106585978849307'), name="facebook"),
    path('instagram', RedirectView.as_view(url='https://instagram.com/TimeWebApp'), name="instagram"),
    path('twitter', RedirectView.as_view(url='https://twitter.com/TimeWebOfficial'), name="twitter"),
    path('discord', RedirectView.as_view(url='https://discord.gg/fQgPXX5qpD'), name="discord"),
    path('youtube', RedirectView.as_view(url='https://youtube.com/channel/UCbd8BxiMRGDM6rwaf59vc8g'), name="youtube"),
    path('reddit', RedirectView.as_view(url='https://reddit.com/r/timeweb'), name="reddit"),
    path('github', RedirectView.as_view(url='https://github.com/ArhanChaudhary/TimeWeb'), name="github"),
]