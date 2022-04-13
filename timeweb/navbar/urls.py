from django.urls import path
from django.views.generic import RedirectView
from . import views, forms
from timewebapp.urls import get_static_url

urlpatterns = [
    path('settings', views.SettingsView.as_view(), name='settings'),
    path('blog', views.BlogView.as_view(), name='blog'),
    path('user-guide', views.UserguideView.as_view(), name='user-guide'),
    path('changelog', views.ChangelogView.as_view(), name='changelog'),
    path('contact', views.ContactFormView.as_view(form_class=forms.ContactForm), name='contact_form'),
    path('policies', RedirectView.as_view(url=get_static_url('policies/policies.html')), name='policies'),
    path('cookies', RedirectView.as_view(url=get_static_url('policies/cookies.html'))),
    path('disclaimer', RedirectView.as_view(url=get_static_url('policies/disclaimer.html'))),
    path('privacy', RedirectView.as_view(url=get_static_url('policies/privacy.html'))),
    path('terms', RedirectView.as_view(url=get_static_url('policies/terms.html'))),
    
    path('facebook', RedirectView.as_view(url='https://facebook.com/TimeWebPage'), name="facebook"),
    path('instagram', RedirectView.as_view(url='https://instagram.com/TimeWebOfficial'), name="instagram"),
    path('twitter', RedirectView.as_view(url='https://twitter.com/TimeWebOfficial'), name="twitter"),
    path('discord', RedirectView.as_view(url='https://discord.gg/fQgPXX5qpD'), name="discord"),
    path('youtube', RedirectView.as_view(url='https://youtube.com/channel/UCbd8BxiMRGDM6rwaf59vc8g'), name="youtube"),
    path('reddit', RedirectView.as_view(url='https://reddit.com/r/timeweb'), name="reddit"),
    path('github', RedirectView.as_view(url='https://github.com/ArhanChaudhary/TimeWeb'), name="github"),
]