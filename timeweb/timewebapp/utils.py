from django.utils import timezone

import common.utils as utils

from decimal import Decimal

def calc_mod_days(*, assignment_date, blue_line_start, break_days):
    # Note to future self: I have rigorously tested the inclusion of +1 and it is needed
    assign_day_of_week = assignment_date.weekday() + 1 # js moment
    red_line_start_x = blue_line_start
    mods = [0]
    mod_counter = 0
    for mod_day in range(6):
        if str((assign_day_of_week + red_line_start_x + mod_day) % 7) in break_days:
            mod_counter += 1
        mods.append(mod_counter)
    mods = tuple(mods)
    return mods

# IMPORTANT
# Make sure these five function mirror the corresponding frontend logic
def hours_to_minutes(hours, safe=True):
    if safe:
        return safe_conversion(hours, 60)
    return Decimal(hours) * 60

def minutes_to_hours(minutes, safe=True):
    if safe:
        return safe_conversion(minutes, Decimal(1) / Decimal(60))
    return Decimal(minutes) / 60

def should_convert_to_hours(minutes):
    as_hours = minutes_to_hours(minutes)
    return as_hours >= 1 and as_hours % Decimal("0.5") == 0

def should_convert_to_minutes(hours):
    as_minutes = hours_to_minutes(hours)
    return not (as_minutes >= 60 and as_minutes % 30 == 0)

def safe_conversion(value, factor):
    value = Decimal(value)
    factor = Decimal(factor)
    if factor < 1 or factor == 1:
        ret = round(value * factor * 100) / 100;
    elif factor > 1:
        ret = round(value * factor)
    return Decimal(ret)

def update_seen_latest_changelog():
    """
    This function is manually invoked so every user is notified of the latest changelog
    """
    from navbar.models import SettingsModel
    settings_models = SettingsModel.objects.all()
    for model in settings_models:
        if model.seen_latest_changelog and not model.enable_tutorial:
            model.seen_latest_changelog = False
    SettingsModel.objects.bulk_update(settings_models, ['seen_latest_changelog'])

def deletion_time_fix():
    """
    This function is manually invoked to ensure all deletion times are unique
    """
    from django.db import transaction
    from common.models import User
    import datetime
    with transaction.atomic():
        users = User.objects.all()
        for user in users:
            hidden = user.timewebmodel_set.filter(hidden=True)
            if hidden.count() <= 1: continue

            def is_unique(time):
                return user.timewebmodel_set.filter(hidden=True).filter(deletion_time=time).count() == 1
            for assignment in hidden:
                while not is_unique(assignment.deletion_time):
                    print("Fixing", assignment)
                    assignment.deletion_time += datetime.timedelta(microseconds=100000)
                    assignment.save()

def update_gc_courses_cache():
    """
    This function is manually invoked to update every user's gc_courses_cache
    """
    from django.db import transaction
    from api.integrations import (
        MemoryCache,
        format_gc_courses,
        settings,
        Credentials,
        RefreshError,
        RefreshRequest,
        build,
        logger,
        json,
        GC_COURSE_API_FIELDS
    )
    from navbar.models import SettingsModel
    with transaction.atomic():
        for s in SettingsModel.objects.exclude(gc_token={}):
            if 'token' not in s.gc_token:
                continue
            credentials = Credentials.from_authorized_user_info(s.gc_token, settings.GC_SCOPES)
            try:
                if credentials.expired:
                    print("Refreshing token for", s.user.username)
                    can_be_refreshed = credentials.expired and credentials.refresh_token
                    if not can_be_refreshed:
                        raise RefreshError
                    credentials.refresh(RefreshRequest())
                    print("Finished refreshing token for", s.user.username)
                    s.gc_token.update(json.loads(credentials.to_json()))
                service = build('classroom', 'v1', credentials=credentials, cache=MemoryCache())
                print("Fetching courses for", s.user.username)
                courses = service.courses().list(courseStates=["ACTIVE"], fields=",".join(f"courses/{i}" for i in GC_COURSE_API_FIELDS)).execute()
                print("Finished fetching courses for", s.user.username)
            except Exception as e:
                logger.error("Error with token: %s", e)
            else:
                courses = courses.get('courses', [])
                s.gc_courses_cache = format_gc_courses(courses)
                s.save()
    print("\nSuccess\n")
    for s in SettingsModel.objects.exclude(gc_courses_cache=[]):
        print(f"{s.user.username}: {s.gc_courses_cache}\n")

def update_canvas_courses_cache():
    """
    This function is manually invoked to update every user's canvas_courses_cache
    """
    from django.db import transaction
    from api.integrations import (
        OAuth2Session,
        settings,
        datetime,
        Canvas,
        logger,
        format_canvas_courses
    )
    from navbar.models import SettingsModel
    with transaction.atomic():
        for s in SettingsModel.objects.exclude(canvas_token={}):
            try:
                if (
                    datetime.datetime.now(tz=timezone.utc).timestamp() >= s.canvas_token['expires_at']
                ):
                    print("Refreshing token for", s.user.username)
                    flow = OAuth2Session()
                    authorized_token_response = flow.refresh_token(
                        f'http{"" if settings.DEBUG else "s"}://{s.canvas_instance_domain}/login/oauth2/token',
                        client_id=settings.CANVAS_CREDENTIALS_JSON['client_id'],
                        client_secret=settings.CANVAS_CREDENTIALS_JSON['client_secret'],
                        refresh_token=s.canvas_token['refresh_token'],
                    )
                    print("Finished refreshing token for", s.user.username)
                    s.canvas_token['token'] = authorized_token_response['access_token']
                    s.canvas_token['expires_at'] = authorized_token_response['expires_at']
                canvas = Canvas(
                    f'http{"" if settings.DEBUG else "s"}://{s.canvas_instance_domain}',
                    s.canvas_token['token'],
                )
                print("Fetching courses for", s.user.username)
                courses = list(canvas.get_courses(enrollment_state='active', state=['available']))
                print("Finished fetching courses for", s.user.username)
            except Exception as e:
                logger.error("Error with token: %s", e)
            else:
                s.canvas_courses_cache = format_canvas_courses(courses)
                s.save()
    print("\nSuccess\n")
    for s in SettingsModel.objects.exclude(canvas_courses_cache=[]):
        print(f"{s.user.username}: {s.canvas_courses_cache}\n")

def adjust_blue_line(request, *, old_data, assignment_date, x_num):
    assert assignment_date is not None
    date_now = utils.utc_to_local(request, timezone.now())
    date_now = date_now.replace(hour=0, minute=0, second=0, microsecond=0)
    ideal_blue_line_start = utils.days_between_two_dates(date_now, assignment_date)
    if old_data is None or old_data.needs_more_info:
        blue_line_start = ideal_blue_line_start
    else:
        old_x_num = utils.days_between_two_dates(old_data.x, old_data.assignment_date)
        if old_data.due_time and (old_data.due_time.hour or old_data.due_time.minute):
            old_x_num += 1
        old_ideal_blue_line_start = utils.days_between_two_dates(date_now, old_data.assignment_date)
        old_blue_line_start = old_data.blue_line_start
        if (
            # if blue_line_start < 0 then blue_line_start is 0
            
            # Note: this action does NOT affect works, even if it may be
            # more mathematically logical to do so

            # For context, what is happening here is blue_line_start is being
            # forced back to today for an assignment that used to have an
            # assignment date in the future. This should in theory affect
            # works by clearing it, as every day is now offset. But practically,
            # users are unlike to actually want this to happen.
            # 1) they probably don't care about the offset
            # 2) it would be extremely frustrating to have their work inputs cleared
            # 3) they might have assigned in the future in the first place by typo or testing
            old_ideal_blue_line_start < 0 and
            not ideal_blue_line_start < 0
        ):
            blue_line_start = ideal_blue_line_start
        elif x_num is None:
            # if x_num isn't there then just ignore the old x_num condition lol
            # TODO: this is deffo going to cause bugs in the future but idrc rn :DDD
            blue_line_start = old_blue_line_start + utils.days_between_two_dates(old_data.assignment_date, assignment_date)
        elif (
            # if self.blue_line_start >= x_num then blue_line_start is 0
            old_ideal_blue_line_start >= old_x_num and 
            not ideal_blue_line_start >= x_num
        ):
            blue_line_start = ideal_blue_line_start
        else:
            blue_line_start = old_blue_line_start + utils.days_between_two_dates(old_data.assignment_date, assignment_date)
    if blue_line_start < 0:
        blue_line_start = 0
    if x_num is None:
        capped_at_x_num = None
    elif capped_at_x_num := blue_line_start >= x_num:
        blue_line_start = 0
    if old_data is None or old_data.needs_more_info or capped_at_x_num:
        removed_works_start = None
        removed_works_end = None
    else:
        removed_works_start = max(0, blue_line_start - old_blue_line_start)
        removed_works_end = len(old_data.works) - 1
        actual_len_works = removed_works_end + 1 - removed_works_start
        len_works = actual_len_works - 1
        # If the edited due date cuts off some of the work inputs
        if x_num is not None and len_works + blue_line_start > x_num:
            # (removed_works_end + 1 - removed_works_start) - 1 + self.sm.blue_line_start > x_num
            # removed_works_end - removed_works_start + self.sm.blue_line_start > x_num
            # removed_works_end > x_num + removed_works_start - self.sm.blue_line_start
            removed_works_end = x_num + removed_works_start - blue_line_start
    ret = {
        'blue_line_start': blue_line_start,
        'removed_works_start': removed_works_start,
        'removed_works_end': removed_works_end,
        'capped_at_x_num': capped_at_x_num,
    }
    ret = {k: v for k, v in ret.items() if v is not None}
    return ret
