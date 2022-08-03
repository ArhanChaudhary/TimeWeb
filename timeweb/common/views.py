from django.contrib.auth import get_user_model
from django.views import View
from django.views.generic.base import TemplateResponseMixin
from django.core.exceptions import AppRegistryNotReady
from logging import getLogger

logger = getLogger('django')
logger.propagate = False

try:
    User = get_user_model()
except AppRegistryNotReady:
    pass

class TimewebGenericView(TemplateResponseMixin, View):
    def __init__(self):
        self.context = {}

    def get(self, request):
        return self.render_to_response(self.context)
