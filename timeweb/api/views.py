# budget rest api

# Abstractions
from django.utils.translation import gettext as _
from django.http import HttpResponse, QueryDict
from django.utils import timezone
from django.views.decorators.http import require_http_methods
from django.db import transaction
from math import floor
from common.views import logger
import datetime

# App stuff
from timewebapp.models import TimewebModel
from timewebapp.forms import TimewebForm
from navbar.models import SettingsModel
from navbar.forms import SettingsForm
from . import integrations

import json
# Reminder: do NOT use decorator_from_middleware, as it is only for old-style django middlewares

@require_http_methods(["POST"])
def delete_assignment(request):
    assignments = request.POST['assignments']
    assignments = json.loads(assignments)
    if {"false": False, None: False, "true": True}[request.POST.get("actually_delete")]:
        request.user.timewebmodel_set.filter(pk__in=assignments).delete()
    else:
        now = timezone.now()
        now = now.replace(microsecond=floor(now.microsecond / 100000) * 100000)
        # Let's mark dont_hide_again True every time so we don't have to go through the headache of determining
        # Another reason to mark it as True every time is that the assignment can be marked with a star while its in the deleted view
        # but not when it was deleted and as a result dont_hide_again will be False and the assignment
        # will be immediately deleted when restored
        with transaction.atomic():
            for assignment in request.user.timewebmodel_set.filter(pk__in=assignments):
                assignment.hidden = True
                assignment.dont_hide_again = True
                assignment.deletion_time = now
                now += datetime.timedelta(microseconds=100000)
                assignment.save()
    logger.info(f'User \"{request.user}\" deleted {len(assignments)} assignments')
    return HttpResponse(status=204)
    
@require_http_methods(["PATCH"])
def restore_assignment(request):
    data = QueryDict(request.body)
    assignments = data['assignments']
    assignments = json.loads(assignments)
    request.user.timewebmodel_set.filter(pk__in=assignments).update(hidden=False)
    logger.info(f'User \"{request.user}\" restored {len(assignments)} assignments')
    return HttpResponse(status=204)
    
@require_http_methods(["PATCH"])
def save_assignment(request):
    data = QueryDict(request.body)
    assignments = json.loads(data['batchRequestData'])

    with transaction.atomic():
        # Remember that `assignment` and the below query can be different lengths and is thus not reliable to loop through index
        for sm in request.user.timewebmodel_set.filter(pk__in=(sm['id'] for sm in assignments)):
            assignment = next(i for i in assignments if i.get('id') == sm.id)

            for key, value in assignment.items():
                if key == "x":
                    # Useful reference https://blog.ganssle.io/articles/2019/11/utcnow.html
                    assignment[key] = datetime.datetime.fromtimestamp(value, timezone.zoneinfo.ZoneInfo(request.utc_offset)).replace(tzinfo=timezone.utc)
                elif key == "due_time":
                    assignment[key] = datetime.time(**value)
                if isinstance(value, float):
                    assignment[key] = round(value, getattr(TimewebModel, key).field.decimal_places)
            
            # see api.change_setting for why 64baf5 doesn't work here
            valid_model_fields_to_change = [i.name for i in TimewebModel._meta.get_fields()
                 if not (i.unique or i.many_to_one or i.one_to_one or i.name in TimewebForm.Meta.exclude)]
            assignment = {field: value for field, value in assignment.items() if field in valid_model_fields_to_change}

            validation_model_data = {i: getattr(sm, i) for i in valid_model_fields_to_change}
            validation_model_data.update(assignment)

            validation_form = TimewebForm(data=validation_model_data, request=request)
            # Note that is_valid validates foreign keys with database hits which could bump up the number of database hits to O(n)
            # Not a problem for now because `user` is excluded in TimewebForm.Meta.exclude
            if not validation_form.is_valid():
                assignment = {field: value for field, value in assignment.items() if field not in validation_form.errors}

            if not assignment: continue
            for key, value in assignment.items():
                setattr(sm, key, validation_form.cleaned_data[key])
            sm.save()
    return HttpResponse(status=204)

@require_http_methods(["PATCH"])
def change_setting(request):
    data = QueryDict(request.body)
    setting = data['setting']
    value = json.loads(data['value'])

    if setting == "oauth_token":
        if value:
            return HttpResponse(integrations.gc_auth_enable(request, next_url="home", current_url="settings"), status=302)
        else:
            integrations.gc_auth_disable(request, save=True)
            return HttpResponse(status=204)

    # pretty cursed code that could possibly be improved by adding the settings model to the settings form as an instance (64baf58)
    # however this makes the data "unbound" (A bound form is a form which is passed the users input) and validation to become impossible
    # We're going to have to make it bound because we want to validate it, but that means we need to create a bounded form from an existing settings model instance
    # This is a bit of a hack, but it works for now
    valid_model_fields_to_change = [i.name for i in SettingsModel._meta.get_fields()
            if not (i.unique or i.many_to_one or i.one_to_one or i.name in SettingsForm.Meta.exclude)]
    validation_model_data = {i: getattr(request.user.settingsmodel, i) for i in valid_model_fields_to_change}
    if setting not in validation_model_data:
        logger.warning(f"User \"{request.user}\" tried to change a setting that doesn't exist")
        return HttpResponse(f"The setting \"{setting}\" doesn't exist.", status=400)
        
    validation_model_data[setting] = value
    validation_form = SettingsForm(data=validation_model_data)
    if not validation_form.is_valid():
        logger.warning(f"User \"{request.user}\" tried to change setting {setting} to an invalid value of {value}")
        logger.info(f"{validation_form.errors}")
        return HttpResponse(f"The setting \"{setting}\"'s value of {value} is invalid.", status=405)

    setattr(request.user.settingsmodel, setting, value)
    request.user.settingsmodel.save()
    return HttpResponse(status=204)

@require_http_methods(["POST"])
def evaluate_current_state(request):
    return HttpResponse(status=204)
