from django.conf import settings
from django.http import HttpResponse, QueryDict
from django.urls import resolve
from django.core.exceptions import RequestDataTooBig
from django.utils import timezone

from .urls import EXCLUDE_FROM_UPDATING_STATE, CONDITIONALLY_EXCLUDE_FROM_STATE_EVALUATION

import json

class APIValidationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        resolved = resolve(request.path)
        if not resolved._func_path.startswith("api"):
            return self.get_response(request)
        if not request.user.is_authenticated:
            return HttpResponse(status=401)
        if request.isExampleAccount and not settings.EDITING_EXAMPLE_ACCOUNT:
            return HttpResponse(status=403)
        
        if request.method in ("POST", "DELETE", "PATCH"):
            if request.method == "POST":
                body = request.POST
            else:
                body = QueryDict(request.body)
            device_uuid = body['device_uuid']
            tab_creation_time = body['tab_creation_time']
            same_device = device_uuid == request.user.settingsmodel.device_uuid
            created_tab_after_last_api_call = int(tab_creation_time)/1000 > request.user.settingsmodel.device_uuid_api_timestamp.timestamp()
            should_reload = not same_device and not created_tab_after_last_api_call
            if should_reload:
                # don't update device_uuid and device_uuid_api_timestamp
                # this would mean we are communicating to the database that
                # this invalid and outdated request was a valid api call
                # that servers as the most recent api call
                return HttpResponse(status=409)

        res = self.get_response(request)
        if (
            resolved.url_name in EXCLUDE_FROM_UPDATING_STATE or
            resolved.url_name in CONDITIONALLY_EXCLUDE_FROM_STATE_EVALUATION and not json.loads(res.content.decode('utf-8') or '{}').get('update_state')
        ):
            return res
        # update SET_NULL from example_assignment and added_gc_assignment_ids and etc
        # https://www.youtube.com/watch?v=RY_2gElt3SA <-- what's happening
        # refresh everything for forward compatibility
        request.user.settingsmodel.refresh_from_db()
        request.user.settingsmodel.device_uuid = device_uuid
        request.user.settingsmodel.device_uuid_api_timestamp = timezone.now()
        request.user.settingsmodel.save()
        return res

# CatchRequestDataTooBig must be a global middleware so it can be ordered before PopulatePost
class CatchRequestDataTooBig:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if resolve(request.path).url_name != "settings":
            try:
                request.body
            except RequestDataTooBig:
                return HttpResponse(status=413)
        return self.get_response(request)
