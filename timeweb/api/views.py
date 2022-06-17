# budget rest api

# Abstractions
from django.shortcuts import get_object_or_404, redirect
from django.utils.translation import ugettext as _
from django.urls import reverse
from django.http import HttpResponse, QueryDict
from django.utils import timezone
import datetime

# App stuff
from django.conf import settings
from timewebapp.models import TimewebModel
from navbar.models import SettingsModel
from timewebapp.forms import TimewebForm
from navbar.forms import SettingsForm

# Formatting
from django.utils.text import Truncator
import json

# Google API
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError
from google.oauth2.credentials import Credentials
from googleapiclient.errors import HttpError
from oauthlib.oauth2.rfc6749.errors import OAuth2Error

# Misc
from utils import days_between_two_dates, utc_to_local
from views import logger
from django.utils.decorators import decorator_from_middleware
from .middleware import APIValidationMiddleware
from django.views.decorators.http import require_http_methods

# Unused but I'll keep it here just in case

# def tag_update(request):
#     old_tag_name = request.POST['old_tag_namestrip()
#     new_tag_name = request.POST['new_tag_name'].strip()
#     assignment_models = request.user.timewebmodel_set.all()
#     for assignment in assignment_models:
#         if new_tag_name in (assignment.tags or []):
#             return HttpResponse(status=)
#     for assignment in assignment_models:
#         for i, tag in enumerate(assignment.tags or []):
#             if tag == old_tag_name:
#                 assignment.tags[i] = new_tag_name
#                 assignment.save()
#                 break
#     logger.info(f"User \"{request.user}\" updated tag \"{old_tag_name}\" to \"{new_tag_name}\"")
#     return HttpResponse(status=204)

@require_http_methods(["DELETE"])
@decorator_from_middleware(APIValidationMiddleware)
def delete_assignment(request):
    data = QueryDict(request.body)

    assignments = data.getlist('assignments[]')
    TimewebModel.objects.filter(pk__in=assignments, user=request.user).delete()
    logger.info(f'User \"{request.user}\" deleted {len(assignments)} assignments')
    return HttpResponse(status=204)
    
@require_http_methods(["PATCH"])
@decorator_from_middleware(APIValidationMiddleware)
def save_assignment(request):
    data = QueryDict(request.body)

    assignments = json.loads(data['assignments'])
    for assignment in assignments:
        sm = get_object_or_404(TimewebModel, pk=assignment['pk'])
        del assignment['pk']
        
        if request.user != sm.user:
            logger.warning(f"User \"{request.user}\" can't save an assignment that isn't theirs")
            return HttpResponse(status=404)

        for key, value in assignment.items():
            if key == "x":
                # Useful reference https://blog.ganssle.io/articles/2019/11/utcnow.html
                assignment[key] = datetime.datetime.fromtimestamp(value, timezone.utc)
            elif key == "due_time":
                assignment[key] = datetime.time(**value)
            if isinstance(value, float):
                assignment[key] = round(value, getattr(TimewebModel, key).field.decimal_places)
        
        model_fields = {i.name: getattr(sm, i.name) for i in TimewebModel._meta.get_fields() if not i.unique}
        model_fields.update(assignment)
        validation_form = TimewebForm(model_fields)
        if not validation_form.is_valid():
            assignment = {field: value for (field, value) in assignment.items() if field not in validation_form.errors}
            if not assignment: continue # It's pointless to finish the loop

        for key, value in assignment.items():
            setattr(sm, key, value)
        try:
            sm.save()
        except NameError: # Forgot why I put this here
            pass
    return HttpResponse(status=204)

@require_http_methods(["PATCH"])
@decorator_from_middleware(APIValidationMiddleware)
def change_setting(request):
    data = QueryDict(request.body)

    setting = data['setting']
    value = json.loads(data['value'])

    model_fields = {i.name: getattr(request.user.settingsmodel, i.name) for i in SettingsModel._meta.get_fields() if not i.unique}
    if setting not in model_fields:
        logger.warning(f"User \"{request.user}\" tried to change a setting that doesn't exist")
        return HttpResponse(f"The setting \"{setting}\" doesn't exist.", status=404)
        
    model_fields[setting] = value
    validation_form = SettingsForm(model_fields)
    if not validation_form.is_valid(): 
        logger.warning(f"User \"{request.user}\" tried to change setting {setting} to an invalid value of {value}")
        return HttpResponse(f"The setting \"{setting}\"'s value of {value} is invalid.", status=405)

    setattr(request.user.settingsmodel, setting, value)
    request.user.settingsmodel.save()
    return HttpResponse(status=204)

@require_http_methods(["POST"])
@decorator_from_middleware(APIValidationMiddleware)
def tag_add(request):
    pk = request.POST['pk']
    sm = get_object_or_404(TimewebModel, pk=pk)

    if request.user != sm.user:
        logger.warning(f"User \"{request.user}\" can't save an assignment that isn't theirs")
        return HttpResponse(status=404)

    tag_names = request.POST.getlist('tag_names[]')
    tag_names = [tag_name for tag_name in tag_names if tag_name not in sm.tags]
    if len(sm.tags) + len(tag_names) > settings.MAX_NUMBER_OF_TAGS: return HttpResponse(status=422)
    if tag_names:
        sm.tags.extend(tag_names)
        sm.save()

    logger.info(f"User \"{request.user}\" added tags \"{tag_names}\" to \"{sm.name}\"")
    return HttpResponse(status=204)

@require_http_methods(["DELETE"])
@decorator_from_middleware(APIValidationMiddleware)
def tag_delete(request):
    data = QueryDict(request.body)

    pk = data['pk']
    sm = get_object_or_404(TimewebModel, pk=pk)

    if request.user != sm.user:
        logger.warning(f"User \"{request.user}\" can't save an assignment that isn't theirs")
        return HttpResponse(status=404)

    tag_names = data.getlist('tag_names[]')
    # Remove tag_names from sm.tags
    old_len = len(sm.tags)
    sm.tags = [tag_name for tag_name in sm.tags if tag_name not in tag_names]
    new_len = len(sm.tags)
    if old_len != new_len:
        sm.save()

    logger.info(f"User \"{request.user}\" deleted tags \"{tag_names}\" from \"{sm.name}\"")
    return HttpResponse(status=204)

def get_gc_reauthorization_url():
    flow = Flow.from_client_secrets_file(
        settings.GC_CREDENTIALS_PATH, scopes=settings.GC_SCOPES)
    flow.redirect_uri = settings.GC_REDIRECT_URI
    # Generate URL for request to Google's OAuth 2.0 server.
    # Use kwargs to set optional request parameters.
    reauthorization_url, state = flow.authorization_url(
        # Enable offline access so that you can refresh an access token without
        # re-prompting the user for permission. Recommended for web server apps.
        access_type='offline',
        # Enable incremental authorization. Recommended as a best practice.
        include_granted_scopes='true')
    return reauthorization_url

@require_http_methods(["POST"])
@decorator_from_middleware(APIValidationMiddleware)
def create_gc_assignments(request):
    if 'token' not in request.user.settingsmodel.oauth_token: return HttpResponse(status=401)
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    credentials = Credentials.from_authorized_user_info(request.user.settingsmodel.oauth_token, settings.GC_SCOPES)
    # If there are no valid credentials available, let the user log in.
    if not credentials.valid:
        if credentials.expired and credentials.refresh_token:
            try:
                # Other errors can happen because of network or any other miscellaneous issues. Don't except these exceptions so they can be logged
                credentials.refresh(Request())
            except RefreshError:
                # In case users manually revoke access to their oauth scopes after authorizing
                if reauthorization_url := get_gc_reauthorization_url():
                    return HttpResponse(reauthorization_url, status=302)
            else:
                request.user.settingsmodel.oauth_token.update(json.loads(credentials.to_json()))
                request.user.settingsmodel.save()
        elif reauthorization_url := get_gc_reauthorization_url():
            return HttpResponse(reauthorization_url, status=302)

    date_now = utc_to_local(request, timezone.now())
    date_now = date_now.replace(hour=0, minute=0, second=0, microsecond=0)
    service = build('classroom', 'v1', credentials=credentials)

    def add_gc_assignments_from_response(response_id, course_coursework, exception):
        if type(exception) is HttpError: # HttpError for permission denied (ex if you're the teacher of a class)
            logger.warning(exception)
            return
        if not course_coursework:
            return
        course_coursework = course_coursework['courseWork']
        for assignment in course_coursework:

            # Load and interpret json data
            assignment_id = int(assignment['id'], 10)
            assignment_date = assignment.get('scheduledTime', assignment['creationTime'])
            try:
                assignment_date = datetime.datetime.strptime(assignment_date,'%Y-%m-%dT%H:%M:%S.%fZ')
            except ValueError:
                assignment_date = datetime.datetime.strptime(assignment_date,'%Y-%m-%dT%H:%M:%SZ')
            assignment_date = utc_to_local(request, assignment_date.replace(tzinfo=timezone.utc))
            assignment_date = assignment_date.replace(hour=0, minute=0, second=0, microsecond=0)
            x = assignment.get('dueDate', None)
            tags = []
            if x:
                if "hours" in assignment['dueTime']:
                    assignment['dueTime']['hour'] = assignment['dueTime'].pop('hours')
                if "minutes" in assignment['dueTime']:
                    assignment['dueTime']['minute'] = assignment['dueTime'].pop('minutes')
                x = utc_to_local(request, datetime.datetime(**x, **assignment['dueTime']).replace(tzinfo=timezone.utc))
                if x < date_now:
                    continue

                due_time = datetime.time(x.hour, x.minute)
                x = x.replace(hour=0, minute=0, second=0, microsecond=0)
                    
                if assignment_date >= x:
                    continue
                if date_now == x:
                    tags.append("Important")
            else:
                if days_between_two_dates(date_now, assignment_date) > 60:
                    continue
                due_time = None
            name = Truncator(assignment['title'].strip()).chars(TimewebModel.name.field.max_length)
            tags.insert(0, course_names[assignment['courseId']])
            description = assignment.get('description', "")
            google_classroom_assignment_link = assignment.get("alternateLink", None)

            # Have this below everything else to not include assignments with due dates before today in new_gc_assignment_ids (x < date_now)
            new_gc_assignment_ids.add(assignment_id)
            if assignment_id in set_added_gc_assignment_ids:
                continue

            # Create assignment
            blue_line_start = days_between_two_dates(date_now, assignment_date)
            if blue_line_start < 0:
                blue_line_start = 0
            dynamic_start = blue_line_start
            user = request.user
            gc_models_to_create.append(TimewebModel(
                name=name,
                assignment_date=assignment_date,
                x=x,
                due_time=due_time,
                blue_line_start=blue_line_start,
                skew_ratio=request.user.settingsmodel.def_skew_ratio,
                min_work_time=request.user.settingsmodel.def_min_work_time,
                break_days=request.user.settingsmodel.def_break_days,
                dynamic_start=dynamic_start,
                funct_round=1,
                description=description,
                google_classroom_assignment_link=google_classroom_assignment_link,
                tags=tags,
                needs_more_info=True,
                is_google_classroom_assignment=True,
                user=user,

                # Assumptions
                unit="Minute",
                time_per_unit=1,
                # y is missing
            ))
    try:
        # .execute() also rarely leads to 503s which I expect may have been from a temporary outage
        courses = service.courses().list().execute()
    except RefreshError:
        if reauthorization_url := get_gc_reauthorization_url():
            return HttpResponse(reauthorization_url, status=302)
    courses = courses.get('courses', [])
    coursework_lazy = service.courses().courseWork()
    batch = service.new_batch_http_request(callback=add_gc_assignments_from_response)

    course_names = {}
    for course in courses:
        if course['courseState'] == "ARCHIVED":
            continue
        course_names[course['id']] = course['name']
        batch.add(coursework_lazy.list(courseId=course['id']))
    # Make "in" faster
    set_added_gc_assignment_ids = set(request.user.settingsmodel.added_gc_assignment_ids)
    # Rebuild added_gc_assignment_ids because assignments may have been added or deleted
    new_gc_assignment_ids = set()
    gc_models_to_create = []
    try:
        batch.execute()
    except RefreshError:
        if reauthorization_url := get_gc_reauthorization_url():
            return HttpResponse(reauthorization_url, status=302)
    TimewebModel.objects.bulk_create(gc_models_to_create)
    if not gc_models_to_create: return HttpResponse(status=204) # or do new_gc_assignment_ids == set_added_gc_assignment_ids
    request.user.settingsmodel.added_gc_assignment_ids = list(new_gc_assignment_ids)
    request.user.settingsmodel.save()

    request.session["already_created_gc_assignments_from_frontend"] = True
    return HttpResponse(status=205)

@require_http_methods(["POST"])
@decorator_from_middleware(APIValidationMiddleware)
def gc_auth_init(request):
    # For reference:
    # If modifying these scopes, delete the file token.json.
    # SCOPES = ['https://www.googleapis.com/auth/classroom.student-submissions.me.readonly', 'https://www.googleapis.com/auth/classroom.courses.readonly']

    # creds = None
    # # The file token.json stores the user's access and refresh tokens, and is
    # # created automatically when the authorization flow completes for the first
    # # time.
    # if os.path.exists('token.json'):
    #     creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    # # If there are no (valid) credentials available, let the user log in.
    # if not creds or not creds.valid:
    #     if creds and creds.expired and creds.refresh_token:
    #         creds.refresh(Request())
    #     else:
    #         flow = InstalledAppFlow.from_client_secrets_file(
    #             'gc_api_credentials.json', SCOPES)
    #         creds = flow.run_local_server(port=0)
    #     # Save the credentials for the next run
    #     with open('token.json', 'w') as token:
    #         token.write(creds.to_json())

    # service = build('classroom', 'v1', credentials=creds)
    # courses = service.courses().list().execute().get('courses', [])
    # coursework = service.courses().courseWork()
    # for course in courses:
    #     try:
    #         course_coursework = coursework.list(courseId=course['id']).execute()['courseWork']
    #     except HttpError:
    #         pass


    # request.user.settingsmodel.oauth_token stores the user's access and refresh tokens
    if 'token' in request.user.settingsmodel.oauth_token:
        request.user.settingsmodel.oauth_token = {"refresh_token": request.user.settingsmodel.oauth_token['refresh_token']}
        if settings.DEBUG:
            # Re-add gc assignments in debug
            request.user.settingsmodel.added_gc_assignment_ids = []
        request.user.settingsmodel.save()
        logger.info(f"User {request.user} disabled google classroom API")
        return HttpResponse(status=204)
    flow = Flow.from_client_secrets_file(
        settings.GC_CREDENTIALS_PATH, scopes=settings.GC_SCOPES)
    flow.redirect_uri = settings.GC_REDIRECT_URI
    # Generate URL for request to Google's OAuth 2.0 server.
    # Use kwargs to set optional request parameters.
    reauthorization_url, state = flow.authorization_url(
        approval_prompt='force',
        # Enable offline access so that you can refresh an access token without
        # re-prompting the user for permission. Recommended for web server apps.
        access_type='offline',
        # Enable incremental authorization. Recommended as a best practice.
        include_granted_scopes='true')
    return HttpResponse(reauthorization_url, status=302)

@require_http_methods(["GET"])
@decorator_from_middleware(APIValidationMiddleware)
def gc_auth_callback(request):
    # Fail it early (for debugging
    # request.session['gc-init-failed'] = True
    # return redirect(reverse("home"))

    # Callback URI
    state = request.GET.get('state', None)

    flow = Flow.from_client_secrets_file(
        settings.GC_CREDENTIALS_PATH,
        scopes=settings.GC_SCOPES,
        state=state)
    flow.redirect_uri = settings.GC_REDIRECT_URI

    # get the full URL that we are on, including all the "?param1=token&param2=key" parameters that google has sent us
    authorization_response = request.build_absolute_uri()
    try:
        # turn those parameters into a token
        flow.fetch_token(authorization_response=authorization_response)
        # Ensure the user enabled both scopes
        service = build('classroom', 'v1', credentials=flow.credentials)
        service.courses().list().execute()
        service.courses().courseWork().list(courseId="easter egg!").execute()
    except (HttpError, OAuth2Error) as e:
        # If the error is an OAuth2Error, the init failed
        # If the error is an HttpError and the access code is 403, the init failed
        # If the error is an HttpError and the access code is 404, the init succeeded, as the course work execute line provides a dunder id so it can execute

        # I don't need to worry about RefreshErrors here because if permissions are revoked just before this code is ran, the api still successfully executes depsite that
        if isinstance(e, OAuth2Error) or isinstance(e, HttpError) and e.resp.status == 403:
            # In case users deny a permission or don't input a code in the url or cancel
            request.session['gc-init-failed'] = True
            return redirect(reverse("home"))
    credentials = flow.credentials
    # Use .update() (dict method) instead of = so the refresh token isnt overwritten
    request.user.settingsmodel.oauth_token.update(json.loads(credentials.to_json()))
    request.user.settingsmodel.save()
    logger.info(f"User {request.user} enabled google classroom API")
    return redirect("home")
