from django.views import View
from django.views.generic.base import TemplateResponseMixin

from logging import getLogger

from json import load as json_load

with open("changelogs.json", "r") as f:
    CHANGELOGS = json_load(f)

logger = getLogger('django')

class TimewebGenericView(TemplateResponseMixin, View):
    def __init__(self):
        self.context = {}

    def get(self, request):
        return self.render_to_response(self.context)
