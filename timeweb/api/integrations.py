# Abstractions
from django.shortcuts import redirect
from django.core.cache import cache
from django.conf import settings
from django.utils.translation import gettext as _
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_http_methods
from django.forms.models import model_to_dict

# App stuff
import common.utils as utils
import timewebapp.utils as app_utils
from timewebapp.models import TimewebModel
from timewebapp.views import EXCLUDE_FROM_ASSIGNMENT_MODELS_JSON_SCRIPT

# Common integrations stuff
import asyncio
from asgiref.sync import sync_to_async, async_to_sync
from requests.exceptions import (
    ConnectionError as ConnectionError_,
    ReadTimeout
)

# Google API
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as RefreshRequest
from google_auth_oauthlib.flow import Flow
from google.auth.exceptions import RefreshError, TransportError
from googleapiclient.discovery import build
from googleapiclient.discovery_cache.base import Cache
from googleapiclient.errors import HttpError
from google_auth_httplib2 import AuthorizedHttp
from httplib2 import Http
from httplib2.error import ServerNotFoundError
from oauthlib.oauth2.rfc6749.errors import (
    AccessDeniedError,
    InvalidGrantError,
    MismatchingStateError,
)

# Canvas API
from requests_oauthlib import OAuth2Session
from canvasapi import Canvas
from canvasapi.course import Course
from canvasapi.exceptions import InvalidAccessToken

# Misc
if settings.DEBUG:
    import time
import re
import os
import datetime
import html2text
import json
from common.views import logger
from django.utils.text import Truncator

# 
# CONSTANTS
# 

DEFAULT_INTEGRATION_REQUEST_TIMEOUT = 10

ASSIGNMENT_DATE_DAYS_CUTOFF = 30

MAX_DESCENDING_COURSEWORK_PAGE_SIZE = 15
MAX_ASCENDING_COURSEWORK_PAGE_SIZE = 35

GC_COURSEWORK_API_FIELDS = (
    "alternateLink",
    "courseId",
    "creationTime",
    "description",
    "dueDate",
    "dueTime",
    "id",
    "title",
)
GC_COURSE_API_FIELDS = (
    "name",
    "id",
)

# 
# COMMON INTEGRATION UTILITIES
# 

def generate_static_integration_fields(user):
    return {
        # from app
        "skew_ratio": user.settingsmodel.def_skew_ratio,
        "min_work_time": user.settingsmodel.def_min_work_time,
        "break_days": user.settingsmodel.def_break_days,
        "user": user,
        "needs_more_info": True,
        "is_integration_assignment": True,
        # assumptions
        "unit": "Minute",
        "time_per_unit": 1,
        "funct_round": 5,
        # y is missing
        "y": None,
    }

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
        tag_name = re.sub(abbreviation[0], abbreviation[1], tag_name, flags=re.IGNORECASE)

    def tag_name_re_subs(regexes, tag_name):
        tag_name_post_re_subs = (
            # if there is something like "a--b" or "a -b" then replace it when "a b"
            # a dash is not usually treated as a space, such as when it's used
            # in words or names, but make an exception to double or more dashes

            # this could indicate it was re subbed for a blank
            (r"(.)( -+|-+ | -+ |--+)(.)", r"\1 \3"),
            (r"\(\)", ""),
            # if the string is instead something like "a--" or "a -" or "--a" or "- a" then remove it
            (r"^-+ ?| ?-+$", ""),
            (r"^,|,$", ""),
        )
        tag_name = utils.simplify_whitespace(tag_name)
        for regex in regexes:
            pre_tag_name = re.sub(regex, "", tag_name, flags=re.IGNORECASE)
            pre_tag_name = utils.simplify_whitespace(pre_tag_name)
            for post_re_sub in tag_name_post_re_subs:
                pre_tag_name = re.sub(*post_re_sub, pre_tag_name, flags=re.IGNORECASE)
                pre_tag_name = utils.simplify_whitespace(pre_tag_name)
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
        r"(\d{2,})",
        # :)
        "31181",

        # school name
        r"msj(hs)?",

        # year

        # 2022 - 2023
        # 2022 - 023
        # 2022 - 3
        r"(?<!\d)(20)?\d\d( | - |-|/)(20)?\d?\d(?!\d)",
        # 2022 American Lit
        r"^2(\d|0\d\d)(?!\d)",
        # American Lit 2022
        r"(?<!\d)2(\d|0\d\d)$",

        # remove period number

        # 12th grade
        r"((1|fir)st|(2|seco)nd|(3|thi)rd|([4-9]|1[0-2]|four|fif|six|seven|eigh|nin|ten|eleven|twelve)th) grade",
        # second period
        # do this above grade-5 or else 5th Period 6th Grade Math => 5th th Grade Math
        r"((1|fir)st|(2|seco)nd|(3|thi)rd|(0|[4-7]|zero|four|fif|six|seven)th) per|(1st|2nd|3rd|((0|[4-7])th)|[0-7])(º|°)",
        # 3rd quarter
        r"((1|fir)st|(2|seco)nd|(3|thi)rd|(4|four)th) quarter",
        # 1st sem
        r"((1|fir)st|(2|seco)nd) sem",
        # grade-5
        r"((per|grade|quarter|sem)(#| #|# | |-| -|- | - |\. | \.|\.|)|(p|q)-?)\d\d?",
        # (1st)
        r"\(((1|fir)st|(2|seco)nd|(3|thi)rd|(0|[4-7]|zero|four|fif|six|seven)th)\)",

        # Repeat these again
        r"^2(\d|0\d\d)(?!\d)",
        r"(?<!\d)2(\d|0\d\d)$",

        # remove teacher title
        r"^m(rs|r|s)\.? [a-z]+(-[a-z]+)?('s)?",
        r"(?<![a-z])m(rs|r|s)\.? [a-z]+(-[a-z]+)?$",

        # Repeat this again
        r"^2(\d|0\d\d)(?!\d)",
        r"(?<!\d)2(\d|0\d\d)$",
    ], tag_name)
    return tag_name

# 
# GOOGLE CLASSROOM INTEGRATION
# 

# Taken from https://github.com/googleapis/google-api-python-client/issues/325#issuecomment-274349841
# Probably wont be used since it is a document cache but whatever I guess it at least supressed the warning
class MemoryCache(Cache):
    _CACHE = {}

    def get(self, url):
        return MemoryCache._CACHE.get(url)

    def set(self, url, content):
        MemoryCache._CACHE[url] = content

class TimeoutRefreshRequest(RefreshRequest):
    def __init__(self, *args, **kwargs):
        self.__timeout = kwargs.pop("timeout", None)
        super().__init__(*args, **kwargs)

    def __call__(self, *args, **kwargs):
        return super().__call__(*args, **kwargs, timeout=self.__timeout)

def format_gc_courses(courses, include_name=True):
    return [
        {
            "id": course["id"],
            "name": simplify_course_name(course["name"]) if include_name else None,
        }
        for course in courses
    ]

def generate_gc_authorization_url(request, *, next_url, current_url):
    flow = Flow.from_client_config(
        settings.GC_CREDENTIALS_JSON,
        scopes=settings.GC_SCOPES
    )
    flow.redirect_uri = settings.GC_REDIRECT_URI
    authorization_url, state = flow.authorization_url(
        prompt='consent',
        access_type='offline',
        include_granted_scopes='true'
    )

    request.session["gc-callback-next-url"] = next_url
    request.session["gc-callback-current-url"] = current_url
    request.session["gc-oauth-state"] = state
    return authorization_url

@require_http_methods(["GET"])
def gc_auth_callback(request):
    def callback_failed():
        # throw on first line to ensure 2nd doesnt run
        del request.session["gc-callback-next-url"]
        request.session['gc-init-failed'] = True
        return redirect(request.session.pop("gc-callback-current-url"))

    state = request.session.get("gc-oauth-state")
    flow = Flow.from_client_config(
        settings.GC_CREDENTIALS_JSON,
        scopes=settings.GC_SCOPES,
        state=state
    )
    flow.redirect_uri = settings.GC_REDIRECT_URI
    authorization_response = request.build_absolute_uri()

    # convert http in authorization_response to https
    # because timeweb runs on a reverse proxy, the requests seen
    # by railway are http instead of https. We need to ensure the request
    # is fully secure before bypassing the google https security checks
    # check if HTTP_X_FORWARDED_PROTO, HTTP_ORIGIN, and HTTP_CF_VISITOR are in request.META
    if os.environ.get("OAUTHLIB_INSECURE_TRANSPORT") != "1":
        # HTTP_ORIGIN isn't in request.META after the invalid credentials alert
        # let's assume it's also possible for every other header to be missing to be safe
        if (
            authorization_response.startswith("http://") and
            request.META.get("HTTP_X_FORWARDED_PROTO", "https") == "https" and
            request.META.get("HTTP_ORIGIN", "https").startswith("https") and
            json.loads(request.META.get("HTTP_CF_VISITOR", '{"scheme": "https"}'))['scheme'] == "https"
        ):
            authorization_response = "https://" + authorization_response[7:]
    try:
        authorized_token_response = flow.fetch_token(
            authorization_response=authorization_response,
            timeout=DEFAULT_INTEGRATION_REQUEST_TIMEOUT,
        )
    except (
        InvalidGrantError, # if you reuse a code
        AccessDeniedError, # enable no scopes or click cancel
        MismatchingStateError, # csrf
        ConnectionError_,
        ReadTimeout,
    ):
        return callback_failed()
    # the scope order MAY change
    # https://stackoverflow.com/questions/53176162/google-oauth-scope-changed-during-authentication-but-scope-is-same
    # Though this hasn't happened, let's be safe and ignore the order in this comparison
    if set(authorized_token_response['scope']) != set(settings.GC_SCOPES):
        # If the user didn't enable both scopes
        return callback_failed()
    credentials = flow.credentials
    service = build(
        'classroom',
        'v1',
        cache=MemoryCache(),
        http=AuthorizedHttp(
            credentials,
            http=Http(timeout=DEFAULT_INTEGRATION_REQUEST_TIMEOUT)
        )
    )
    try:
        courses = service.courses().list(
            courseStates=["ACTIVE"],
            fields=",".join(f"courses/{i}" for i in GC_COURSE_API_FIELDS)
        ).execute()
    except (
        ServerNotFoundError, # connection dies attempting to start the request
        TimeoutError, # connection dies during the request
    ):
        return callback_failed()
    courses = courses.get('courses', [])
    request.user.settingsmodel.gc_courses_cache = format_gc_courses(courses)
    # Use .update() (dict method) instead of = so the refresh token isnt overwritten
    request.user.settingsmodel.gc_token.update(json.loads(credentials.to_json()))
    request.user.settingsmodel.save(update_fields=("gc_courses_cache", "gc_token"))
    logger.info(f"User {request.user} enabled google classroom API")
    del request.session["gc-oauth-state"]
    del request.session["gc-callback-current-url"]
    return redirect(request.session.pop("gc-callback-next-url"))

def disable_gc_integration(request, *, save=True):
    flow = Flow.from_client_config(
        settings.GC_CREDENTIALS_JSON,
        scopes=settings.GC_SCOPES
    )
    try:
        flow.oauth2session.post(
            'https://oauth2.googleapis.com/revoke',
            params={'token': request.user.settingsmodel.gc_token['token']},
            headers={'content-type': 'application/x-www-form-urlencoded'},
            timeout=DEFAULT_INTEGRATION_REQUEST_TIMEOUT,
        )
    except (
        ConnectionError_,
        ReadTimeout
    ):
        pass
    request.user.settingsmodel.gc_token = {"refresh_token": request.user.settingsmodel.gc_token['refresh_token']}
    if settings.DEBUG:
        # Re-add gc assignments in debug
        request.user.settingsmodel.added_gc_assignment_ids = []
    if save:
        request.user.settingsmodel.save()

# @sync_to_async
# @require_http_methods(["GET"])
# @async_to_sync
# reminder: do not use this because thread_sensitive is True by default
async def create_gc_assignments(request):
    loop = asyncio.get_event_loop()
    credentials = Credentials.from_authorized_user_info(request.user.settingsmodel.gc_token, settings.GC_SCOPES)
    if credentials.expired:
        if settings.DEBUG:
            logger.info(f"started gc refresh request")
            t = time.perf_counter()
        try:
            # make this async so integrations can concurrently refresh
            await loop.run_in_executor(None, credentials.refresh, TimeoutRefreshRequest(timeout=DEFAULT_INTEGRATION_REQUEST_TIMEOUT))
        except RefreshError: # users manually revoke roken
            return {
                'invalid_credentials': True,
                'integration_name': 'gc',
                'reauthorization_url': generate_gc_authorization_url(request, next_url="home", current_url="home"),
                'next': 'stop',
            }
        except TransportError: # basically ConnectionError_ and TimeoutError
            return {"next": "continue"}
        else:
            if settings.DEBUG:
                logger.info(f"finished gc refresh request in {time.perf_counter() - t} seconds")
            request.user.settingsmodel.gc_token.update(json.loads(credentials.to_json()))
            await sync_to_async(request.user.settingsmodel.save)(update_fields=("gc_token", ))
    service = build(
        'classroom',
        'v1',
        cache=MemoryCache(),
        http=AuthorizedHttp(
            credentials,
            http=Http(timeout=DEFAULT_INTEGRATION_REQUEST_TIMEOUT)
        )
    )

    complete_date_now = utils.utc_to_local(request, timezone.now())
    # Note about timezones: use the local tz because date_now repesents the date at the user's location
    # This makes comparison logic work
    date_now = complete_date_now.replace(hour=0, minute=0, second=0, microsecond=0)
    def parse_response_datum_dates(assignment):
        # NOTE: scheduled assignments logically don't show up on the API
        # this implies that assignments due in the future cannot be created with the Google Classroom API
        # I am still going to assume this is possible with my validation logic and also check for "scheduledTime"
        # for forward compatibility and to be safe
        complete_assignment_date = assignment.get('scheduledTime', assignment['creationTime'])
        complete_assignment_date = utils.utc_to_local(request, datetime.datetime.fromisoformat(complete_assignment_date))
        assignment_date = complete_assignment_date.replace(hour=0, minute=0, second=0, microsecond=0)
        if 'dueDate' in assignment:
            # From https://developers.google.com/classroom/reference/rest/v1/courses.courseWork#CourseWork.FIELDS.due_time
            # "This[the due time] must be specified if dueDate is specified."

            # Assignments due at 2:31 AM UTC => assignment['dueTime'] = {'hours': 2, 'minutes': 31}
            # Assignments due at 2:00 AM UTC => assignment['dueTime'] = {'hours': 2}
            # Assignments due at 12:00 AM UTC => assignment['dueTime'] = {}
            complete_x = utils.utc_to_local(request, datetime.datetime(
                **assignment['dueDate'],
                hour=assignment['dueTime'].get('hours', 0),
                minute=assignment['dueTime'].get('minutes', 0),
                tzinfo=timezone.utc,
            ))
            # Do this after utc_to_local to ensure I am checking local time
            if (
                # is setting enabled?
                request.user.settingsmodel.gc_assignments_always_midnight and 
                # is it due at 11:59 PM?
                complete_x.hour == 23 and complete_x.minute == 59 and 
                # extra condtion #1: the google classroom assignment cannot be due later today
                # we don't want to do this as the information would then be inaccurate to the user
                complete_x.replace(hour=0, minute=0, second=0, microsecond=0) != date_now and
                # extra condtion #2: the google classroom assignment must not be due on its assignment date
                # this is applicable for assignments due in the future
                complete_x.replace(hour=0, minute=0, second=0, microsecond=0) != assignment_date
            ):
                complete_x = complete_x.replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            complete_x = None
        return (complete_assignment_date, complete_x)

    def format_response_data(*, assignment_models, response_data, order, exception):
        # it is possible for this function to process courses that are in the cache but archived
        # this does not matter
        if exception is not None:
            # 403 if you are a teacher of a class
            # 404 if the cached courses are outdated and a course has been deleted
            # 429 if you are ratelimited, don't care
            if type(exception) is HttpError and exception.status_code in (403, 404, 429):
                logger.warning(exception)
            else:
                logger.error(exception)
        if response_data in (None, {}):
            return
        # NOTE: there is no point trying to waste brain cells trying to return early if ascending order
        # response_data repeats the same assignments as in the descending order response as the loop
        # continues if an assignment has already been added
        response_data = response_data['courseWork']
        now_search_left = 0
        now_search_right = len(response_data)
        while now_search_left < now_search_right:
            mid = (now_search_left + now_search_right) // 2
            assignment = response_data[mid]
            complete_assignment_date, complete_x = parse_response_datum_dates(assignment)
            if complete_x:
                due_before_today = complete_x <= complete_date_now
            else:
                due_before_today = True
            if due_before_today and order == "desc" or not due_before_today and order == "asc":
                now_search_right = mid
            else:
                now_search_left = mid + 1
        none_search_left = 0
        none_search_right = len(response_data)
        while none_search_left < none_search_right:
            mid = (none_search_left + none_search_right) // 2
            assignment = response_data[mid]
            complete_assignment_date, complete_x = parse_response_datum_dates(assignment)
            if complete_x and order == "desc" or not complete_x and order == "asc":
                none_search_left = mid + 1
            else:
                none_search_right = mid
        # import pprint
        # pprint.pprint([i.get('dueDate') for i in response_data])
        # if order == "desc":
        #     pprint.pprint([i.get('dueDate') for i in response_data[:now_search_left]])
        #     pprint.pprint([i.get('dueDate') for i in response_data[none_search_left:]])
        # elif order == "asc":
        #     pprint.pprint([i.get('dueDate') for i in response_data[now_search_left:]])
        #     pprint.pprint([i.get('dueDate') for i in response_data[:none_search_left]])
        # breakpoint()
        if order == "desc":
            response_data = response_data[:now_search_left] + response_data[none_search_left:]
        elif order == "asc":
            response_data = response_data[now_search_left:] + response_data[:none_search_left]
        for assignment in response_data:
            assignment_id = int(assignment['id'], 10)
            if assignment_id in request.user.settingsmodel.added_gc_assignment_ids:
                continue
            complete_assignment_date, complete_x = parse_response_datum_dates(assignment)
            assignment_date = complete_assignment_date.replace(hour=0, minute=0, second=0, microsecond=0)
            tags = []
            if complete_x:
                if complete_x <= complete_assignment_date:
                    continue
                due_time = complete_x.time()
                x = complete_x.replace(hour=0, minute=0, second=0, microsecond=0)
                if date_now == x:
                    tags.append("Important")
                x_num = utils.days_between_two_dates(x, assignment_date)
            else:
                if utils.days_between_two_dates(date_now, assignment_date) > ASSIGNMENT_DATE_DAYS_CUTOFF:
                    continue
                due_time = None
                x = None
                x_num = None
            name = assignment['title']
            name = utils.simplify_whitespace(name)
            name = Truncator(name).chars(TimewebModel.name.field.max_length)
            # We don't need to worry if there if this raises a not found error because the courses we
            # request assignments from are the ones in request.user.settingsmodel.gc_courses_cache itself
            tags.insert(0, next(
                i['name'] for i in request.user.settingsmodel.gc_courses_cache
                if assignment['courseId'] == i['id']
            ))
            if description := assignment.get('description'):
                description = utils.simplify_whitespace(description)
            external_link = assignment.get("alternateLink")
            adjusted_blue_line = app_utils.adjust_blue_line(request,
                old_data=None,
                assignment_date=assignment_date,
                x_num=x_num
            )
            blue_line_start = adjusted_blue_line['blue_line_start']
            dynamic_start = blue_line_start
            # we store these in utc
            # convert at the end so it is easier to use with calculations with date_now
            if x:
                x = x.replace(tzinfo=timezone.utc)
            if assignment_date:
                assignment_date = assignment_date.replace(tzinfo=timezone.utc)
            assignment_models.append({
                # from api, can change
                "name": name,
                "assignment_date": assignment_date,
                "x": x,
                "due_time": due_time,
                "description": description,
                # from app, depends on api
                "blue_line_start": blue_line_start,
                "dynamic_start": dynamic_start,
                # from api, cannot change
                "external_link": external_link,
                "tags": tags,
            })
            # we need to save every id we come across for now because pageSize is now limited
            # TODO: find a better system that doesn't accumulate everything
            request.user.settingsmodel.added_gc_assignment_ids.append(assignment_id)
    # I have noticed that it can take up to **30 seconds** to load all assignments in especially active
    # classes, so the goal of the whole order shenanigan is to speed up loading assignments from large
    # classes while also at the same time not overlooking assignments that need to be added

    # According to https://developers.google.com/classroom/reference/rest/v1/courses.courseWork/list#body.QUERY_PARAMETERS.order_by
    # we can sort by "dueDate desc" or due date in descending order and
    # According to https://developers.google.com/classroom/reference/rest/v1/courses.courseWork/list#body.QUERY_PARAMETERS.page_size
    # we can also limit the maximum number of assignments returned
    # this is great, as now we can sort by due date in descending order to only get the assignments due after today

    # However, there is a slight limitation in the API
    # Ordering by due date descending puts assignments without due dates at the very bottom, so if we limit the number
    # of assignments its possible for them to get overlooked
    # So, we are forced to make a second request this time in ascending order to add assignments without due dates
    coursework_lazy = service.courses().courseWork()
    def get_assignment_models_from_response(*, order, page_size):
        assignment_models = []
        batch = service.new_batch_http_request(
            callback=lambda _, response_data, exception: 
                format_response_data(
                    assignment_models=assignment_models,
                    response_data=response_data,
                    order=order,
                    exception=exception,
                )
        )
        for course in request.user.settingsmodel.gc_courses_cache:
            # NOTE: we don't need to set courseWorkStates because
            # from https://developers.google.com/classroom/reference/rest/v1/courses.courseWork/list#description
            # "Course students may only view PUBLISHED course work. Course teachers and domain administrators may view all course work."
            batch.add(coursework_lazy.list(
                courseId=course["id"],
                orderBy=f"dueDate {order}",
                pageSize=page_size,
                fields=",".join(f"courseWork/{i}" for i in GC_COURSEWORK_API_FIELDS)
            ))
        if settings.DEBUG:
            logger.info(f"started gc order {order}")
            t = time.perf_counter()
        batch.execute()
        if settings.DEBUG:
            logger.info(f"finished gc order {order} in {time.perf_counter() - t}")
        return assignment_models
    concurrent_request_key = f"gc_api_request_thread_{request.user.id}"
    thread_timestamp = datetime.datetime.now().timestamp()
    cache.set(concurrent_request_key, thread_timestamp, 2 * 60)
    gc_requests = [
        loop.run_in_executor(None, lambda: get_assignment_models_from_response(**request_data))
        for request_data in (
            {"order": "desc", "page_size": MAX_DESCENDING_COURSEWORK_PAGE_SIZE},
            {"order": "asc", "page_size": MAX_ASCENDING_COURSEWORK_PAGE_SIZE},
        )
    ]
    if settings.DEBUG:
        logger.info("started gc requests")
        t = time.perf_counter()
    try:
        assignment_model_data = [
            assignment_model
            for assignment_models in asyncio.as_completed(gc_requests)
            for assignment_model in await assignment_models
        ]
    except Exception as e:
        # cancel all other requests because errors are not re-caught in a try except block
        for future in gc_requests:
            future.cancel()
        if isinstance(e, RefreshError): # user manually revokes third party app
            return {
                'invalid_credentials': True,
                'integration_name': 'gc',
                'reauthorization_url': generate_gc_authorization_url(request, next_url="home", current_url="home"),
                'next': 'stop',
            }
        elif isinstance(e, (
            ServerNotFoundError, # connection dies attempting to start the request
            TimeoutError, # connection dies during the request
        )):
            assignment_model_data = []
    else:
        if settings.DEBUG:
            logger.info(f"finished gc requests in {time.perf_counter() - t}")
    if not assignment_model_data:
        return {"next": "continue"}
    cached_timestamp = cache.get(concurrent_request_key)
    if cached_timestamp != thread_timestamp:
        # The reason why we have to prevent concurrent requests is because although
        # request.user.settingsmodel.save() is thread-safe, bulk_create runs directly
        # through the ORM is not
        # refer to the explanation in create_gc_assignments for more context
        return {"next": "stop"}
    cache.delete(concurrent_request_key)
    await sync_to_async(request.user.settingsmodel.save)(update_fields=("added_gc_assignment_ids", ))
    created = [
        TimewebModel(**assignment | generate_static_integration_fields(request.user) | { "is_gc_assignment": True })
        for assignment in assignment_model_data
    ]
    await sync_to_async(TimewebModel.objects.bulk_create)(created)
    return {
        "assignments": [model_to_dict(i, exclude=EXCLUDE_FROM_ASSIGNMENT_MODELS_JSON_SCRIPT) for i in created],
        "update_state": True,
        "next": "continue",
    }

def update_gc_courses(request):
    # NOTE: we cannot simply run this in create_gc_assignments after the response is sent because
    # we want to be able to alert the user if their credentials for listing courses is invalid
    credentials = Credentials.from_authorized_user_info(request.user.settingsmodel.gc_token, settings.GC_SCOPES)
    if credentials.expired:
        # rest this logic on create_gc_assignments, idrc if its invalid here
        return {"next": "continue"}
    service = build(
        'classroom',
        'v1',
        cache=MemoryCache(),
        http=AuthorizedHttp(
            credentials,
            http=Http(timeout=DEFAULT_INTEGRATION_REQUEST_TIMEOUT)
        )
    )
    try:
        courses = service.courses().list(courseStates=["ACTIVE"], fields=",".join(f"courses/{i}" for i in GC_COURSE_API_FIELDS)).execute()
    except (
        ServerNotFoundError, # connection dies attempting to start the request
        TimeoutError, # connection dies during the request
    ):
        return {"next": "continue"}
    except HttpError as e:
        if e.status_code >= 500:
            # this happened one time:
            # googleapiclient.errors.HttpError: <HttpError 503 when requesting https://classroom.googleapis.com/v1/courses?alt=json returned "The service is currently unavailable.". Details: "The service is currently unavailable.">
            logger.error(e)
            return {"next": "continue"}
        raise e
    courses = courses.get('courses', [])
    old_courses = request.user.settingsmodel.gc_courses_cache
    new_courses = format_gc_courses(courses, include_name=False)
    if len(old_courses) != len(new_courses) or any(old_course["id"] != new_course["id"] for old_course, new_course in zip(old_courses, new_courses)):
        # NOTE: request.user.settingsmodel is thread-safe
        # i.e if one thread calls .save while another thread is still blocked in the api request call,
        # the value of gc_courses_cache won't be affected by the .save and will still retain the original old value
        # this makes it so that we don't need to use a similar caching system to the one used in create_gc_assignments
        # as broken pipes no longer won't reload the user
        request.user.settingsmodel.gc_courses_cache = format_gc_courses(courses)
        request.user.settingsmodel.save(update_fields=("gc_courses_cache", ))
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
            return async_to_sync(create_gc_assignments)(request)
    return {"next": "continue"}

# 
# CANVAS INTEGRATION
# 

def format_canvas_courses(courses, include_name=True):
    return [
        {
            "id": course.id,
            "name": simplify_course_name(course.name) if include_name else None,
        }
        for course in courses
    ]

def canvas_instance_url(request):
    return f'http{"" if settings.DEBUG else "s"}://{request.user.settingsmodel.canvas_instance_domain}'

def generate_canvas_authorization_url(request, *, next_url, current_url):
    flow = OAuth2Session(
        client_id=settings.CANVAS_CREDENTIALS_JSON['client_id'],
        redirect_uri=settings.CANVAS_REDIRECT_URI,
        scope=settings.CANVAS_SCOPES,
    )
    authorization_url, state = flow.authorization_url(
        f'{canvas_instance_url(request)}/login/oauth2/auth',
        force_login='1',
    )
    request.session["canvas-callback-next-url"] = next_url
    request.session["canvas-callback-current-url"] = current_url
    return authorization_url

@require_http_methods(["GET"])
def canvas_auth_callback(request):
    def callback_failed():
        del request.session["canvas-callback-next-url"]
        request.session['canvas-init-failed'] = True
        return redirect(request.session.pop("canvas-callback-current-url"))

    # ... Canvas oauth flow callback

    canvas = Canvas(settings.CANVAS_URL, settings.CANVAS_TOKEN)
    try:
        courses = list(canvas.get_courses(enrollment_state='active', state=['available']))
    except ConnectionError_:
        return {"next": "continue"}
    request.user.settingsmodel.canvas_courses_cache = format_canvas_courses(courses)
    # ... update canvas token credentials
    request.user.settingsmodel.save(update_fields=("canvas_courses_cache", "canvas_token"))
    logger.info(f"User {request.user} enabled the canvas API")
    del request.session["canvas-callback-current-url"]
    return redirect(request.session.pop("canvas-callback-next-url"))

def disable_canvas_integration(request, *, save=True):
    request.user.settingsmodel.canvas_token = {"refresh_token": request.user.settingsmodel.canvas_token['refresh_token']}
    if settings.DEBUG:
        # Re-add canvas assignments in debug
        request.user.settingsmodel.added_canvas_assignment_ids = []
    if save:
        request.user.settingsmodel.save()

# @sync_to_async
# @require_http_methods(["GET"])
# @async_to_sync
# reminder: do not use this because thread_sensitive is True by default
async def create_canvas_assignments(request):
    canvas = Canvas(settings.CANVAS_URL, settings.CANVAS_TOKEN)

    # clone and run locally: https://github.com/instructure/canvas-lms
    # create developer key reference: https://community.canvaslms.com/t5/Admin-Guide/How-do-I-manage-developer-keys-for-an-account/ta-p/249
    # oauth spec reference: https://canvas.instructure.com/doc/api/file.oauth.html
    # django implementation reference: https://github.dev/Harvard-University-iCommons/django-canvas-oauth/tree/master/canvas_oauth
    loop = asyncio.get_event_loop()
    complete_date_now = utils.utc_to_local(request, timezone.now())
    date_now = complete_date_now.replace(hour=0, minute=0, second=0, microsecond=0)
    def filter_response_data_after_now(response_data):
        now_search_left = 0
        now_search_right = len(response_data)
        while now_search_left < now_search_right:
            mid = (now_search_left + now_search_right) // 2
            assignment = response_data[mid]
            try:
                complete_x = assignment.due_at_date
            except AttributeError:
                due_before_today = False
            else:
                due_before_today = complete_x <= complete_date_now
            if not due_before_today:
                now_search_right = mid
            else:
                now_search_left = mid + 1
        return response_data[now_search_left:]
    def format_response_datum(assignment):
        if assignment.id in request.user.settingsmodel.added_canvas_assignment_ids:
            return
        complete_assignment_date = utils.utc_to_local(request, assignment.unlock_at_date if assignment.unlock_at else assignment.created_at_date)
        # "lock_at_date cannot be before due_at_date"
        complete_x = utils.utc_to_local(request, assignment.due_at_date) if assignment.due_at else None
        # NOTE: canvas dates go down to the second so this replace precision is absolutely necessary
        assignment_date = complete_assignment_date.replace(hour=0, minute=0, second=0, microsecond=0)
        tags = []
        if complete_x:
            if complete_x <= complete_assignment_date:
                return
            due_time = complete_x.time()
            x = complete_x.replace(hour=0, minute=0, second=0, microsecond=0)
            if date_now == x:
                tags.append("Important")
            x_num = utils.days_between_two_dates(x, assignment_date)
        else:
            if utils.days_between_two_dates(date_now, assignment_date) > ASSIGNMENT_DATE_DAYS_CUTOFF:
                return
            due_time = None
            x = None
            x_num = None
        name = assignment.name
        name = utils.simplify_whitespace(name)
        name = Truncator(name).chars(TimewebModel.name.field.max_length)
        # We don't need to worry if there if this raises a not found error because the courses we
        # request assignments from are the ones in request.user.settingsmodel.gc_courses_cache itself
        tags.insert(0, next(
            i['name'] for i in request.user.settingsmodel.canvas_courses_cache
            if assignment.course_id == i['id']
        ))
        if description := assignment.description:
            description = utils.simplify_whitespace(html2text.html2text(description))
        external_link = assignment.html_url
        adjusted_blue_line = app_utils.adjust_blue_line(request,
            old_data=None,
            assignment_date=assignment_date,
            x_num=x_num
        )
        blue_line_start = adjusted_blue_line['blue_line_start']
        dynamic_start = blue_line_start
        # we store these in utc
        # convert at the end so it is easier to use with calculations with date_now
        if x:
            x = x.replace(tzinfo=timezone.utc)
        if assignment_date:
            assignment_date = assignment_date.replace(tzinfo=timezone.utc)
        # TODO: find a better system that doesn't accumulate everything
        request.user.settingsmodel.added_canvas_assignment_ids.append(assignment.id)
        return {
            # from api, can change
            "name": name,
            "assignment_date": assignment_date,
            "x": x,
            "due_time": due_time,
            "description": description,
            # from app, depends on api
            "blue_line_start": blue_line_start,
            "dynamic_start": dynamic_start,
            # from api, cannot change
            "external_link": external_link,
            "tags": tags,
        }
    canvas_requests = [
        loop.run_in_executor(None, lambda: list(Course(
            canvas._Canvas__requester,
            {'id': course_id['id']}
        ).get_assignments(
            order_by='due_at',
            # bucket=("undated", "upcoming", "future"), doesn't work because canvas api only supports one string parameter for bucket
        )))
        for course_id in request.user.settingsmodel.canvas_courses_cache
    ]
    if settings.DEBUG:
        logger.info("started canvas requests")
        t = time.perf_counter()
    try:
        assignment_model_data = [
            assignment_model_datum
            for response_data in asyncio.as_completed(canvas_requests)
            for response_datum in filter_response_data_after_now(await response_data)
            if (assignment_model_datum := format_response_datum(response_datum)) is not None
        ]
    except Exception as e:
        # cancel all other requests because errors are not re-caught in a try except block
        for future in canvas_requests:
            future.cancel()
        if isinstance(e, InvalidAccessToken): # manually revoke access token
            # do stuff
            pass
        # NOTE: rate limits are done per access token, not by registered app, so we will never hit them
        # read: https://community.canvaslms.com/t5/Canvas-Developers-Group/API-Rate-Limiting/ba-p/255845#toc-hId-1773472610
        elif isinstance(e, (ConnectionError_, ReadTimeout)):
            assignment_model_data = []
    else:
        if settings.DEBUG:
            logger.info(f"finished canvas requests in {time.perf_counter() - t}")
    if not assignment_model_data:
        return {"next": "continue"}
    await sync_to_async(request.user.settingsmodel.save)(update_fields=("added_canvas_assignment_ids", ))
    created = [
        TimewebModel(**assignment | generate_static_integration_fields(request.user) | { "is_canvas_assignment": True })
        for assignment in assignment_model_data
    ]
    await sync_to_async(TimewebModel.objects.bulk_create)(created)
    return {
        "assignments": [model_to_dict(i, exclude=EXCLUDE_FROM_ASSIGNMENT_MODELS_JSON_SCRIPT) for i in created],
        "update_state": True,
        "next": "continue",
    }

def update_canvas_courses(request):
    canvas = Canvas(settings.CANVAS_URL, settings.CANVAS_TOKEN)
    try:
        courses = list(canvas.get_courses(enrollment_state='active', state=['available']))
    except ConnectionError_:
        return {"next": "continue"}

    old_courses = request.user.settingsmodel.canvas_courses_cache
    new_courses = format_canvas_courses(courses, include_name=False)
    if len(old_courses) != len(new_courses) or any(old_course["id"] != new_course["id"] for old_course, new_course in zip(old_courses, new_courses)):
        request.user.settingsmodel.canvas_courses_cache = format_canvas_courses(courses)
        request.user.settingsmodel.save(update_fields=("canvas_courses_cache", ))
        if not set(course['id'] for course in new_courses).issubset(set(course['id'] for course in old_courses)):
            return async_to_sync(create_canvas_assignments)(request)
    return {"next": "continue"}

# 
# INTEGRATIONS API VIEW FUNCTIONS
# 

def merge_integration_response(ret, key, value):
    if key == 'assignments':
        ret.setdefault('assignments', []).extend(value)
    elif key == 'next' and ret.get('next') == 'stop' and value == 'continue':
        pass
    else:
        ret[key] = value

@sync_to_async
@require_http_methods(["GET"])
@async_to_sync
async def create_integration_assignments(request):
    await sync_to_async(lambda: request.user.settingsmodel)()
    if settings.DEBUG:
        t = time.perf_counter()
        logger.info("started integration requests")
    integration_tasks = []
    if 'token' in request.user.settingsmodel.gc_token:
        integration_tasks.append(create_gc_assignments(request))
    if 'token' in request.user.settingsmodel.canvas_token:
        integration_tasks.append(create_canvas_assignments(request))
    ret = {}
    for response_json in asyncio.as_completed(integration_tasks):
        for key, value in (await response_json).items():
            merge_integration_response(ret, key, value)
    if settings.DEBUG:
        logger.info(f"finished integration requests in {time.perf_counter() - t}")
    return JsonResponse(ret)

@sync_to_async
@require_http_methods(["GET"])
@async_to_sync
async def update_integration_courses(request):
    await sync_to_async(lambda: request.user.settingsmodel)()
    loop = asyncio.get_event_loop()
    integration_tasks = []
    if 'token' in request.user.settingsmodel.gc_token:
        integration_tasks.append(loop.run_in_executor(None, update_gc_courses, request))
    if 'token' in request.user.settingsmodel.canvas_token:
        integration_tasks.append(loop.run_in_executor(None, update_canvas_courses, request))
    ret = {}
    for response_json in asyncio.as_completed(integration_tasks):
        for key, value in (await response_json).items():
            merge_integration_response(ret, key, value)
    return JsonResponse(ret)
