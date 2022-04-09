from django.urls import path, re_path
from django.http import HttpResponse
from . import views

urlpatterns = [
    path('robots.txt', lambda x: HttpResponse("# If you came from the discord gg you get a super duper secret role\n# pm me this message at Arch#5808\n# also, pls don't tell anyone as it'll ruin the fun of this small game\nUser-Agent: *\nDisallow:", content_type="text/plain"), name="robots_file"),
    path('.well-known/security.txt', lambda x: HttpResponse('''Contact: mailto:arhan.ch@gmail.com
Expires: 2023-07-27T07:00:00.000Z
Preferred-Languages: en
Canonical: https://timeweb.io/.well-known/security.txt''', content_type="text/plain"), name="security_file"),

    path('stackpile', views.StackpileView.as_view(), name='stackpile'),
    path('spooky', views.SpookyView.as_view(), name="spooky"),
    path('sus', views.SusView.as_view(), name="sus"),
    path('mc.blogcraft.dev', lambda x: HttpResponse(status=418), name="bithub"),
    path('chungus', views.ChungusView.as_view(), name="chungus"),
    re_path(r"^(wp|wordpress)", views.RickView.as_view()),
]