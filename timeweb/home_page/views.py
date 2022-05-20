from django.shortcuts import render
from django.views import View
from views import TimewebGenericView

class HomePageView(TimewebGenericView):
    template_name = "home_page.html"