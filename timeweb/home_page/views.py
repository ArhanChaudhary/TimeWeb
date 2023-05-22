from common.views import TimewebGenericView
from random import shuffle

class HomePageView(TimewebGenericView):
    template_name = "home_page.html"

    def get(self, request):
        scrollers = list(map(str, range(14)))
        shuffle(scrollers)
        self.context["random_scrollers"] = scrollers
        return super().get(request)