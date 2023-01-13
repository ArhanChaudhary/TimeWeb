# budget rest api

# Abstractions
from django.shortcuts import redirect
from django.utils.translation import gettext as _
from django.http import HttpResponse, QueryDict
from django.utils import timezone
import datetime

# App stuff
from django.conf import settings
from timewebapp.models import TimewebModel
from navbar.models import SettingsModel
from timewebapp.forms import TimewebForm
from timewebapp.views import MAX_NUMBER_OF_TAGS
from navbar.forms import SettingsForm

# Formatting
from django.utils.text import Truncator
from django.forms.models import model_to_dict
import json

# Google API
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError, TransportError
from google.oauth2.credentials import Credentials
from googleapiclient.errors import HttpError
from oauthlib.oauth2.rfc6749.errors import OAuth2Error, AccessDeniedError, InvalidGrantError
from httplib2.error import ServerNotFoundError
from googleapiclient.discovery_cache.base import Cache

# Misc
from django.db import transaction
import common.utils as utils
from common.views import logger
from django.views.decorators.http import require_http_methods
from re import sub as re_sub, IGNORECASE
from math import floor
# Reminder: do NOT use decorator_from_middleware, as it is only for old-style django middlewares

# Unused but I'll keep it here just in case

# def tag_update(request):
#     old_tag_name = request.POST['old_tag_namestrip()
#     new_tag_name = request.POST['new_tag_name'].strip()
#     assignment_models = request.user.timewebmodel_set.filter(hidden=False)
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

@require_http_methods(["POST"])
def delete_assignment(request):
    assignments = request.POST.getlist('assignments[]')
    if {"false": False, None: False, "true": True}[request.POST.get("actually_delete")]:
        TimewebModel.objects.filter(pk__in=assignments, user=request.user).delete()
    else:
        now = timezone.now()
        now = now.replace(microsecond=floor(now.microsecond / 100000) * 100000)
        # Let's mark dont_hide_again True every time so we don't have to go through the headache of determining
        # Another reason to mark it as True every time is that the assignment can be marked with a star while its in the deleted view
        # but not when it was deleted and as a result dont_hide_again will be False and the assignment
        # will be immediately deleted when restored
        TimewebModel.objects.filter(pk__in=assignments, user=request.user).update(hidden=True, dont_hide_again=True, deletion_time=now)
    logger.info(f'User \"{request.user}\" deleted {len(assignments)} assignments')
    return HttpResponse(status=204)
    
@require_http_methods(["PATCH"])
def restore_assignment(request):
    data = QueryDict(request.body)
    assignments = data.getlist('assignments[]')
    TimewebModel.objects.filter(pk__in=assignments, user=request.user).update(hidden=False)
    logger.info(f'User \"{request.user}\" restored {len(assignments)} assignments')
    return HttpResponse(status=204)
    
@require_http_methods(["PATCH"])
def save_assignment(request):
    data = QueryDict(request.body)
    assignments = json.loads(data['batchRequestData'])

    with transaction.atomic():
        # Remember that `assignment` and the below query can be different lengths and is thus not reliable to loop through index
        for sm in TimewebModel.objects.filter(pk__in=map(lambda sm: sm['id'], assignments), user=request.user):
            assignment = next(i for i in assignments if i.get('id') == sm.id)

            for key, value in assignment.items():
                if key == "x":
                    # Useful reference https://blog.ganssle.io/articles/2019/11/utcnow.html
                    assignment[key] = datetime.datetime.fromtimestamp(value, timezone.utc)
                elif key == "due_time":
                    assignment[key] = datetime.time(**value)
                if isinstance(value, float):
                    assignment[key] = round(value, getattr(TimewebModel, key).field.decimal_places)
            
            # see api.change_setting for why 64baf5 doesn't work here
            model_fields = model_to_dict(sm)
            model_fields.update(assignment)
            # After poking around a bit I found out that is_valid validates foreign keys with database hits which could bump up the number of database hits to O(n)
            # aka a huge no no
            del model_fields['user']
            # do NOT setattr a primary key that would be a huge fricking mess
            del assignment['id']
            validation_form = TimewebForm(data=model_fields, request=request)
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
            return HttpResponse(gc_auth_enable(request, next_url="home", current_url="settings"), status=302)
        else:
            gc_auth_disable(request, save=True)
            return HttpResponse(status=204)

    # pretty cursed code that could possibly be improved by adding the settings model to the settings form as an instance (64baf58)
    # however this makes the data "unbound" (A bound form is a form which is passed the users input) and validation to become impossible
    # We're going to have to make it bound because we want to validate it, but that means we need to create a bounded form from an existing settings model instance
    # This is a bit of a hack, but it works for now
    model_fields = {i.name: getattr(request.user.settingsmodel, i.name) for i in SettingsModel._meta.get_fields() if not i.unique}
    if setting not in model_fields or setting in SettingsForm.Meta.exclude:
        logger.warning(f"User \"{request.user}\" tried to change a setting that doesn't exist")
        return HttpResponse(f"The setting \"{setting}\" doesn't exist.", status=400)
        
    model_fields[setting] = value
    validation_form = SettingsForm(data=model_fields)
    if not validation_form.is_valid():
        logger.warning(f"User \"{request.user}\" tried to change setting {setting} to an invalid value of {value}")
        logger.info(f"{validation_form.errors}")
        return HttpResponse(f"The setting \"{setting}\"'s value of {value} is invalid.", status=405)

    setattr(request.user.settingsmodel, setting, value)
    request.user.settingsmodel.save()
    return HttpResponse(status=204)

@require_http_methods(["POST"])
def tag_add(request):
    pk = request.POST['pk']
    sm = TimewebModel.objects.get(pk=pk, user=request.user)

    tag_names = request.POST.getlist('tag_names[]')
    tag_names = [tag_name for tag_name in tag_names if tag_name not in sm.tags]
    if len(sm.tags) + len(tag_names) > MAX_NUMBER_OF_TAGS: return HttpResponse(status=422)
    if tag_names:
        sm.tags.extend(tag_names)
        sm.save()

    logger.info(f"User \"{request.user}\" added tags \"{tag_names}\" to \"{sm.name}\"")
    return HttpResponse(status=204)

@require_http_methods(["DELETE"])
def tag_delete(request):
    data = QueryDict(request.body)

    pk = data['pk']
    sm = TimewebModel.objects.get(pk=pk, user=request.user)

    tag_names = data.getlist('tag_names[]')
    # Remove tag_names from sm.tags
    sm.tags = [tag_name for tag_name in sm.tags if tag_name not in tag_names]
    sm.save()

    logger.info(f"User \"{request.user}\" deleted tags \"{tag_names}\" from \"{sm.name}\"")
    return HttpResponse(status=204)

@require_http_methods(["POST"])
def evaluate_current_state(request):
    same_device = request.POST['device_uuid'] == request.user.settingsmodel.device_uuid
    if same_device:
        return HttpResponse(status=200)

    created_tab_after_last_api_call = int(request.POST['tab_creation_time'], 10)/1000 > request.user.settingsmodel.device_uuid_api_timestamp.timestamp()
    if created_tab_after_last_api_call:
        return HttpResponse(status=200)

    return HttpResponse(status=205)

def simplify_course_name(tag_name):
    abbreviations = [
        (r"(rec)ommendation", r"\1"),
        (r"(bio)logy", r"\1"),
        (r"(english|american) ?(literature)", r"\2"),
        (r"(lit)erature", r"\1"),
        (r"computer ?science", "CS"),
        (r"(psych)ology", r"\1"),
        (r"(stat)istics", r"\1s"),
        (r"(american )?(gov)ernment", r"\2"),
        (r"(econ)omics", r"\1"),
        (r"(chem)istry", r"\1"),
        (r"(calc)ulus", r"\1"),
        (r"honors ?([a-z]{2,}) ?([6-9]|1[0-2])(st|nd|rd|th)?( grade)?\b", r"\1 \2H"),
        (r"([a-z]{2,}) ?([6-9]|1[0-2])(st|nd|rd|th)?( grade)? ?honors", r"\1 \2H"),
        (r"([a-z]{2,}) ?honors ?([6-9]|1[0-2])(st|nd|rd|th)?( grade)?\b", r"\1 \2H"),
        (r"([6-9]|1[0-2])(st|nd|rd|th)?( grade)? ?honors ?([a-z]{2,})", r"\4 \1H"),
        (r"honors ?([6-9]|1[0-2])(st|nd|rd|th)?( grade)? ?([a-z]{2,})", r"\4 \1H"),
        (r"([6-9]|1[0-2])(st|nd|rd|th)?( grade)? ?([a-z]{2,}) ?honors", r"\4 \1H"),

        (r"(trig)onometry", r"\1"),
        (r"(digital photo)graphy", r"\1"),
        (r"(p(é|e)r)(iode?|(í|i)odo)", r"\1"),
        (r"(sem)ester", r"\1"),
    ]
    for abbreviation in abbreviations:
        tag_name = re_sub(abbreviation[0], abbreviation[1], tag_name, flags=IGNORECASE)

    def tag_name_re_subs(regexes, tag_name):
        tag_name = ' '.join(tag_name.split())
        for regex in regexes:
            pre_tag_name = re_sub(fr"(-+ *)?{regex}( *-+)?", "", tag_name, flags=IGNORECASE)
            pre_tag_name = re_sub(r"\(\)", "", pre_tag_name)
            pre_tag_name = " ".join(pre_tag_name.split())
            if not pre_tag_name or len(tag_name) < 10:
                return tag_name
            tag_name = pre_tag_name
        return tag_name

    # Don't try to include a google classroom course section because:
    # 1) it can mess up ordering of what to remove pretty badly
    # for example, if a class is named "Period 4" and the section is "2017"
    # this will simplify it to "2017"
    # I can't just assume 
    # 2) it's not really necessary, as the name is 90% of the time enough
    # information to identify the class,
    # 3) less info is anyways better to fit the assignment tag length
    tag_name = tag_name_re_subs([
        # school name
        r"msj(hs)?",

        # year

        # 2022 - 2023
        r"(?<!\d)(20\d\d( | - |-|/)20|\d\d( | - |-|/)|20\d\d( | - |-|/))\d\d(?!\d)",
        # 2022 American Lit
        r"^20\d\d(?!\d)",
        # American Lit 2022
        r"(?<!\d)20\d\d$",

        # remove period number

        # 12th grade
        r"((1|fir)st|(2|seco)nd|(3|thi)rd|([4-9]|1[0-2]|four|fif|six|seven|eigh|nin|ten|eleven|twelve)th) grade",
        # second period
        # do this above grade-5 or else 5th Period 6th Grade Math => 5th th Grade Math
        r"((1|fir)st|(2|seco)nd|(3|thi)rd|(0|[4-7]|zero|four|fif|six|seven)th) per",
        # 3rd quarter
        r"((1|fir)st|(2|seco)nd|(3|thi)rd|(4|four)th) quarter",
        # 1st sem
        r"((1|fir)st|(2|seco)nd) sem",
        # grade-5
        r"((per|grade|quarter|sem)(#| #|# | |-| -|- | - |\. | \.|\.|)|(p|q)-?)\d\d?",
        # (1st)
        r"\(((1|fir)st|(2|seco)nd|(3|thi)rd|(0|[4-7]|zero|four|fif|six|seven)th)\)",

        # Repeat these again
        r"^20\d\d(?!\d)",
        r"(?<!\d)20\d\d$",

        # remove teacher title
        r"^m(rs|r|s)\.? [a-z]+(-[a-z]+)?('s)?",
        r"(?<![a-z])m(rs|r|s)\.? [a-z]+(-[a-z]+)?$",

        # Repeat this again
        r"^20\d\d(?!\d)",
        r"(?<!\d)20\d\d$",
    ], tag_name)
    return tag_name

# Taken from https://github.com/googleapis/google-api-python-client/issues/325#issuecomment-274349841
# Probably wont be used since it is a document cache but whatever I guess it at least supressed the warning
class MemoryCache(Cache):
    _CACHE = {}

    def get(self, url):
        return MemoryCache._CACHE.get(url)

    def set(self, url, content):
        MemoryCache._CACHE[url] = content

@require_http_methods(["POST"])
def update_gc_courses(request):
    # NOTE: we cannot simply run this in create_gc_assignments after the response is sent because
    # we want to be able to alert the user if their credentials for listing courses is invalid
    credentials = Credentials.from_authorized_user_info(request.user.settingsmodel.oauth_token, settings.GC_SCOPES)
    if not credentials.valid:
        # rest this logic on create_gc_assignments, idrc if its invalid here
        return HttpResponse(status=204)
    service = build('classroom', 'v1', credentials=credentials, cache=MemoryCache())
    try:
        # .execute() also rarely leads to 503s which I expect may have been from a temporary outage
        courses = service.courses().list().execute()
    except RefreshError:
        return HttpResponse(gc_auth_enable(request, next_url="home", current_url="home"), status=302)
    # If connection to the server randomly dies (could happen locally when wifi is off)
    except ServerNotFoundError:
        return HttpResponse(status=204)
    except HttpError as e:
        if e.status_code == 429:
            # Ratelimited, don't care
            return HttpResponse(status=204)
        if e.status_code >= 500:
            # this happened one time:
            # googleapiclient.errors.HttpError: <HttpError 503 when requesting https://classroom.googleapis.com/v1/courses?alt=json returned "The service is currently unavailable.". Details: "The service is currently unavailable.">
            logger.error(e)
            return HttpResponse(status=204)
        raise e
    courses = courses.get('courses', [])
    old_courses = request.user.settingsmodel.gc_courses_cache
    new_courses = simplify_courses(courses, include_name=False)
    if len(old_courses) != len(new_courses) or any(old_course["id"] != new_course["id"] for old_course, new_course in zip(old_courses, new_courses)):
        request.user.settingsmodel.gc_courses_cache = simplify_courses(courses)
        request.user.settingsmodel.save()
        # If old contains every element in new, then we don't need to create_gc_assignments again
        # As if all the elements of new are in old, then there are new classes to import assignment from.

        # Let's look at some example test cases:

        # old_courses = [1,2,3,4]
        # new_courses [1,2,3,4,5] (you join a class)
        # In this case, create_gc_assignments again

        # old_courses = [1,2,3,4]
        # new_courses = [1,2,3] (you leave a class)
        # In this case, don't create_gc_assignments again

        # old_courses = [1,2,3,4]
        # new_courses = [1,2,5] (you leave two classes and join a new one)
        # In this case, create_gc_assignments again
        if not set(course['id'] for course in new_courses).issubset(set(course['id'] for course in old_courses)):
            return create_gc_assignments(request)
    return HttpResponse(status=204)

def simplify_courses(courses, include_name=True):
    return [{
                "id": course["id"],
                "name": simplify_course_name(course["name"]) if include_name else None,
            } for course in courses if course["courseState"] != "ARCHIVED"]

@require_http_methods(["POST"])
def create_gc_assignments(request):
    if 'token' not in request.user.settingsmodel.oauth_token: return HttpResponse(status=401)
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    credentials = Credentials.from_authorized_user_info(request.user.settingsmodel.oauth_token, settings.GC_SCOPES)
    # If there are no valid credentials available, let the user log in.
    if not credentials.valid:
        can_be_refreshed = credentials.expired and credentials.refresh_token
        if not can_be_refreshed:
            return HttpResponse(gc_auth_enable(request, next_url="home", current_url="home"), status=302)
        try:
            # Other errors can happen because of network or any other miscellaneous issues. Don't except these exceptions so they can be logged
            credentials.refresh(Request())
        except RefreshError:
            # In case users manually revoke access to their oauth scopes after authorizing
            return HttpResponse(gc_auth_enable(request, next_url="home", current_url="home"), status=302)
        # If connection to the server randomly dies (could happen locally when wifi is off)
        except TransportError:
            return HttpResponse(status=204)
        else:
            request.user.settingsmodel.oauth_token.update(json.loads(credentials.to_json()))
            request.user.settingsmodel.save()
    service = build('classroom', 'v1', credentials=credentials, cache=MemoryCache())

    def add_gc_assignments_from_response(response_id, course_coursework, exception):
        # it is possible for this function to process courses that are in the cache but archived
        # this does not matter
        if type(exception) is HttpError:
            # 403 if you are a teacher of a class
            # 404 if the cached courses are outdated and a course has been deleted
            # 429 if you are ratelimited, don't care
            if exception.status_code in (403, 404, 429):
                logger.warning(exception)
            else:
                logger.error(exception)
            return
        if not course_coursework:
            return
        complete_date_now = utils.utc_to_local(request, timezone.now())
        date_now = complete_date_now.replace(hour=0, minute=0, second=0, microsecond=0)
        course_coursework = course_coursework['courseWork']
        for assignment in course_coursework:
            # Load and interpret json data
            assignment_id = int(assignment['id'], 10)
            complete_assignment_date = assignment.get('scheduledTime', assignment['creationTime'])
            try:
                complete_assignment_date = datetime.datetime.strptime(complete_assignment_date,'%Y-%m-%dT%H:%M:%S.%fZ')
            except ValueError:
                complete_assignment_date = datetime.datetime.strptime(complete_assignment_date,'%Y-%m-%dT%H:%M:%SZ')
            complete_assignment_date = utils.utc_to_local(request, complete_assignment_date.replace(tzinfo=timezone.utc))
            assignment_date = complete_assignment_date.replace(hour=0, minute=0, second=0, microsecond=0)
            tags = []
            if 'dueDate' in assignment:
                # From https://developers.google.com/classroom/reference/rest/v1/courses.courseWork#CourseWork.FIELDS.due_time
                # "This[the due time] must be specified if dueDate is specified."

                # Assignments due at 2:31 AM UTC => assignment['dueTime'] = {'hours': 2, 'minutes': 31}
                # Assignments due at 2:00 AM UTC => assignment['dueTime'] = {'hours': 2}
                # Assignments due at 12:00 AM UTC => assignment['dueTime'] = {}
                due_time = datetime.time(assignment['dueTime'].get('hours', 0), assignment['dueTime'].get('minutes', 0))
                if request.user.settingsmodel.gc_assignments_always_midnight and due_time.hour == 23 and due_time.minute == 59:
                    due_time = datetime.time(0, 0)
                complete_x = utils.utc_to_local(request, datetime.datetime(
                    **assignment['dueDate'],
                    hour=due_time.hour,
                    minute=due_time.minute,
                    tzinfo=timezone.utc,
                ))
                if not (
                    # The due date must be after today
                    complete_x > complete_date_now and
                    # The due date must be after the assignment date 
                    complete_x > complete_assignment_date
                ):
                    continue

                x = complete_x.replace(hour=0, minute=0)
                if date_now == x:
                    tags.append("Important")
            else:
                if utils.days_between_two_dates(date_now, assignment_date) > 60:
                    continue
                due_time = None
                x = None
            name = Truncator(assignment['title'].strip()).chars(TimewebModel.name.field.max_length)
            # We don't need to worry if there if this raises a not found error because the courses we
            # request assignments from are the ones in request.user.settingsmodel.gc_courses_cache itself
            tags.insert(0, next(
                i['name'] for i in request.user.settingsmodel.gc_courses_cache
                if assignment['courseId'] == i['id']
            ))
            description = assignment.get('description', "")
            google_classroom_assignment_link = assignment.get("alternateLink")

            # Assignment is valid to be created
            new_gc_assignment_ids.add(assignment_id)
            if assignment_id in request.user.settingsmodel.added_gc_assignment_ids:
                continue

            # From create assignment
            blue_line_start = utils.days_between_two_dates(date_now, assignment_date)
            if blue_line_start < 0:
                blue_line_start = 0
            dynamic_start = blue_line_start
            gc_models_to_create.append(TimewebModel(
                # these fields can be updated from changes in the api

                # from api, can change
                name=name,
                assignment_date=assignment_date,
                x=x,
                due_time=due_time,
                description=description,
                # from app, depends on api
                blue_line_start=blue_line_start,
                dynamic_start=dynamic_start,

                # these fields cannot be updated from changes in the api

                # from api, cannot change
                google_classroom_assignment_link=google_classroom_assignment_link,
                tags=tags,
                # from app
                skew_ratio=request.user.settingsmodel.def_skew_ratio,
                min_work_time=request.user.settingsmodel.def_min_work_time,
                break_days=request.user.settingsmodel.def_break_days,
                user=request.user,
                needs_more_info=True,
                is_google_classroom_assignment=True,
                # assumptions
                unit="Minute",
                time_per_unit=1,
                funct_round=5,
                # y is missing
                y=None,
            ))

    coursework_lazy = service.courses().courseWork()
    batch = service.new_batch_http_request(callback=add_gc_assignments_from_response)
    for course in request.user.settingsmodel.gc_courses_cache:
        batch.add(coursework_lazy.list(courseId=course["id"]))

    # Rebuild added_gc_assignment_ids because assignments may have been added or deleted
    new_gc_assignment_ids = set()
    gc_models_to_create = []
    try:
        batch.execute()
    except RefreshError:
        return HttpResponse(gc_auth_enable(request, next_url="home", current_url="home"), status=302)
    # If connection to the server randomly dies (could happen locally when wifi is off)
    except ServerNotFoundError:
        return HttpResponse(status=204)
    if not gc_models_to_create: return HttpResponse(status=204)
    TimewebModel.objects.bulk_create(gc_models_to_create)
    request.user.settingsmodel.added_gc_assignment_ids = list(new_gc_assignment_ids)

    device_uuid = request.POST['device_uuid']
    request.user.settingsmodel.device_uuid = device_uuid
    request.user.settingsmodel.device_uuid_api_timestamp = timezone.now()

    request.user.settingsmodel.save()

    request.session["already_created_gc_assignments_from_frontend"] = True
    return HttpResponse(status=205)

def generate_gc_authorization_url(request, *, next_url, current_url):
    flow = Flow.from_client_config(
        settings.GC_CREDENTIALS_JSON,
        scopes=settings.GC_SCOPES
    )
    flow.redirect_uri = settings.GC_REDIRECT_URI
    # Generate URL for request to Google's OAuth 2.0 server.
    # Use kwargs to set optional request parameters.
    authorization_url, state = flow.authorization_url(
        prompt='consent',
        # Enable offline access so that you can refresh an access token without
        # re-prompting the user for permission. Recommended for web server apps.
        access_type='offline',
        # Enable incremental authorization. Recommended as a best practice.
        include_granted_scopes='true')

    request.session["gc-callback-next-url"] = next_url
    request.session["gc-callback-current-url"] = current_url
    return authorization_url

def gc_auth_enable(request, *args, **kwargs):
    return generate_gc_authorization_url(request, *args, **kwargs)

def gc_auth_disable(request, *, save=True):
    # request.user.settingsmodel.oauth_token stores the user's access and refresh tokens
    request.user.settingsmodel.oauth_token = {"refresh_token": request.user.settingsmodel.oauth_token['refresh_token']}
    if settings.DEBUG:
        # Re-add gc assignments in debug
        request.user.settingsmodel.added_gc_assignment_ids = []
    if save:
        request.user.settingsmodel.save()

@require_http_methods(["GET"])
def gc_auth_callback(request):
    # Fail it early (for debugging
    # request.session['gc-init-failed'] = True
    # return redirect("home")
    def callback_failed():
        request.session['gc-init-failed'] = True
        del request.session["gc-callback-next-url"]
        return redirect(request.session.pop("gc-callback-current-url"))
    # Callback URI
    state = request.GET.get('state')

    flow = Flow.from_client_config(
        settings.GC_CREDENTIALS_JSON,
        scopes=settings.GC_SCOPES,
        state=state
    )
    flow.redirect_uri = settings.GC_REDIRECT_URI

    # get the full URL that we are on, including all the "?param1=token&param2=key" parameters that google has sent us
    authorization_response = request.build_absolute_uri()
    # turn those parameters into a token
    try:
        flow.fetch_token(authorization_response=authorization_response)
    except (InvalidGrantError, AccessDeniedError):
        # InvalidGrantError If the user needs parental permission and then clicks cancel
        # AccessDeniedError If the user reloads (dont remember how but it has happened)
        return callback_failed()
    try:
        credentials = flow.credentials
    except ValueError:
        # ValueError at /api/gc-auth-callback
        # There is no access token for this session, did you call fetch_token?
        return callback_failed()

    try:
        # Ensure the user enabled both scopes
        service = build('classroom', 'v1', credentials=credentials, cache=MemoryCache())
        courses = service.courses().list().execute()
        service.courses().courseWork().list(courseId="easter egg!").execute()
    except (HttpError, OAuth2Error) as e:
        # If the error is an OAuth2Error, the init failed
        # If the error is an HttpError and the access code is 403, the init failed
        # If the error is an HttpError and the access code is 404, the init succeeded, as the course work execute line provides a dunder id so it can execute

        # I don't need to worry about RefreshErrors here because if permissions are revoked just before this code is ran, the api still successfully executes depsite that
        # I don't need to worry about Ratelimit errors here because such a situation would be very rare

        # Let's use type instead of isinstance because I want an exact exception class match
        if type(e) is OAuth2Error or type(e) is HttpError and e.resp.status == 403:
            # In case users deny a permission or don't input a code in the url or cancel
            return callback_failed()
    courses = courses.get('courses', [])
    request.user.settingsmodel.gc_courses_cache = simplify_courses(courses)
    # Use .update() (dict method) instead of = so the refresh token isnt overwritten
    request.user.settingsmodel.oauth_token.update(json.loads(credentials.to_json()))
    request.user.settingsmodel.save()
    logger.info(f"User {request.user} enabled google classroom API")
    del request.session["gc-callback-current-url"]
    return redirect(request.session.pop("gc-callback-next-url"))
