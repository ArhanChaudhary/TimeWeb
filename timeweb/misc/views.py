# In the future I should probably switch all my view classes to FormView

# Abstractions
from django.http import HttpResponse
from django.shortcuts import redirect, render
from views import TimewebGenericView

def custom_permission_denied_view(request, reason=""):
    response = render(request, "misc/403_csrf.html", {"request": request})
    response.status_code = 403
    return response

class RickView(TimewebGenericView):
    def get(self, request, _):
        return HttpResponse(f"<script nonce=\"{request.csp_nonce}\">a=\"https:/\";window.location.href=a+\"/www.youtube.com/watch?v=dQw4w9WgXcQ\"</script>")

class SpookyView(TimewebGenericView):
    template_name = "misc/spooky.html"
    
class SusView(TimewebGenericView):
    template_name = "misc/sus.html"

class ChungusView(TimewebGenericView):
    template_name = "misc/chungus.html"
