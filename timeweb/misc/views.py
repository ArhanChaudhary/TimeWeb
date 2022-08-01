from django.http import HttpResponse
from common.views import TimewebGenericView

class RickView(TimewebGenericView):
    def get(self, request, _):
        return HttpResponse(f"<script nonce=\"{request.csp_nonce}\">a=\"https:/\";window.location.href=a+\"/www.youtube.com/watch?v=dQw4w9WgXcQ\"</script>")

class SpookyView(TimewebGenericView):
    template_name = "misc/spooky.html"

class SusView(TimewebGenericView):
    template_name = "misc/sus.html"

class ChungusView(TimewebGenericView):
    template_name = "misc/chungus.html"

class ShantanuView(TimewebGenericView):
    template_name = "misc/shantanu.html"
