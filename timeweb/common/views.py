from django.views import View
from django.views.generic.base import TemplateResponseMixin
from logging import getLogger

logger = getLogger('django')
logger.propagate = False

class TimewebGenericView(TemplateResponseMixin, View):
    def __init__(self):
        self.context = {}

    def get(self, request):
        return self.render_to_response(self.context)
