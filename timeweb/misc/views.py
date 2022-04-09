from timewebapp.views import TimewebGenericView
from django.http import HttpResponse
from django.shortcuts import redirect, render

def custom_permission_denied_view(request, reason=""):
    response = render(request, "misc/403_csrf.html", {"request": request})
    response.status_code = 403
    return response

class RickView(TimewebGenericView):
    def get(self, request, _):
        return HttpResponse(f"<script nonce=\"{request.csp_nonce}\">a=\"https:/\";window.location.href=a+\"/www.youtube.com/watch?v=dQw4w9WgXcQ\"</script>")

class StackpileView(TimewebGenericView):
    def get(self, request):
        return redirect("https://stackpile.me")

class SpookyView(TimewebGenericView):
    template_name = "misc/spooky.html"
    
class SusView(TimewebGenericView):
    template_name = "misc/sus.html"

class ChungusView(TimewebGenericView):
    template_name = "misc/chungus.html"
