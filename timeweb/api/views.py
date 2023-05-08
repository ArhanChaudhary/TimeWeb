# budget rest api

# Abstractions
from django.utils.translation import gettext as _
from django.http import HttpResponse, QueryDict, JsonResponse
from django.utils import timezone
from django.conf import settings
from django.views.decorators.http import require_http_methods
from django.db import transaction
from django.forms.models import model_to_dict

# App stuff
import common.utils as utils
import timewebapp.utils as app_utils
from . import integrations
from timewebapp.models import TimewebModel
from timewebapp.views import EXCLUDE_FROM_ASSIGNMENT_MODELS_JSON_SCRIPT
from timewebapp.forms import TimewebForm
from navbar.models import SettingsModel
from navbar.forms import SettingsForm
from common.views import logger

import json
import datetime
from decimal import Decimal
from math import ceil, floor
from copy import deepcopy
from urlextract import URLExtract

extractor = URLExtract(extract_localhost=False)
# https://github.com/lipoja/URLExtract/issues/13#issuecomment-467635302
extractor._stop_chars_left |= {"-", ":", ",", "."}
extractor._stop_chars_right |= {",", "."}
# Reminder: do NOT use decorator_from_middleware, as it is only for old-style django middlewares

# Make sure to change the logic comparing the old data too if a new field is expensive to equare
TRIGGER_DYNAMIC_MODE_RESET_FIELDS = ("assignment_date", "x", "due_time", "blue_line_start", "y", "min_work_time", "time_per_unit",
                                        "works", "funct_round", "break_days", "skew_ratio", "fixed_mode", "dynamic_start", "hidden")
DONT_TRIGGER_DYNAMIC_MODE_RESET_FIELDS = ("id", "name", "soft", "unit", "description", "tags", "is_google_classroom_assignment",
                                        "external_link", "alert_due_date_incremented", "dont_hide_again",
                                        "deletion_time", "user", "needs_more_info")
assert len(TRIGGER_DYNAMIC_MODE_RESET_FIELDS) + len(DONT_TRIGGER_DYNAMIC_MODE_RESET_FIELDS) == len(TimewebModel._meta.fields), "update this list"

@require_http_methods(["POST"])
def submit_assignment(request):
    id_ = request.POST['id']
    edited_assignment = bool(id_)
    created_assignment = not edited_assignment

    submitted_form = TimewebForm(data=request.POST, request=request)

    if not submitted_form.is_valid():
        logger.info(f"User \"{request.user}\" submitted an invalid form")
        return JsonResponse({
            "valid": False,
            "errors": submitted_form.errors,
        })

    if created_assignment:
        sm = submitted_form.save(commit=False)
        old_data = None

        # Set defaults
        sm.skew_ratio = request.user.settingsmodel.def_skew_ratio
        first_work = Decimal(sm.works[0])
        sm.user = request.user
    else:
        assert edited_assignment
        sm = request.user.timewebmodel_set.get(pk=id_)
        old_data = deepcopy(sm)

        # TODO: I ideally want to use a TimewebForm with an instance kwarg, see 64baf58
        # Excluded: id, blue_line_start, skew_ratio, works, fixed_mode, dynamic_start, tags, alert_due_date_incremented, dont_hide_again

        sm.name = submitted_form.cleaned_data.get("name")
        sm.assignment_date = submitted_form.cleaned_data.get("assignment_date")
        sm.x = submitted_form.cleaned_data.get("x")
        sm.due_time = submitted_form.cleaned_data.get("due_time")
        sm.soft = submitted_form.cleaned_data.get("soft")
        sm.unit = submitted_form.cleaned_data.get("unit")
        sm.y = submitted_form.cleaned_data.get("y")
        first_work = Decimal(submitted_form.cleaned_data.get("works")[0])
        sm.time_per_unit = submitted_form.cleaned_data.get("time_per_unit")
        sm.description = submitted_form.cleaned_data.get("description")
        sm.funct_round = submitted_form.cleaned_data.get("funct_round")
        sm.min_work_time = submitted_form.cleaned_data.get("min_work_time")
        sm.break_days = submitted_form.cleaned_data.get("break_days")

        if old_data.assignment_date:
            old_data.assignment_date = old_data.assignment_date.replace(tzinfo=timezone.zoneinfo.ZoneInfo(request.utc_offset))
        if old_data.x:
            old_data.x = old_data.x.replace(tzinfo=timezone.zoneinfo.ZoneInfo(request.utc_offset))
    for field in TimewebForm.Meta.ADD_CHECKBOX_WIDGET_FIELDS:
        try:
            if field in ("x", "y"):
                pass
            elif field == "funct_round":
                '''
                step size transform decision matrix
                +------+--------+--------+----------------+-------+
                |      |        |        | step size unit |       |
                +------+--------+--------+----------------+-------+
                |      |        | minute | hour           | other |
                +------+--------+--------+----------------+-------+
                |      | minute | pass   | *60            | NA    |
                +------+--------+--------+----------------+-------+
                | unit | hour   | /60    | pass           | NA    |
                +------+--------+--------+----------------+-------+
                |      | other  | NA     | NA             | pass  |
                +------+--------+--------+----------------+-------+
                '''
                if sm.unit.lower() in ('hour', 'hours') and not submitted_form.cleaned_data.get(f"{field}-widget-checkbox"):
                    setattr(sm, field, app_utils.minutes_to_hours(getattr(sm, field)))
                elif sm.unit.lower() in ('minute', 'minutes') and submitted_form.cleaned_data.get(f"{field}-widget-checkbox"):
                    setattr(sm, field, app_utils.hours_to_minutes(getattr(sm, field)))
            elif field == "works":
                # NOTE: changing just funct_round unit should not affect the rest of works
                # so it is safe to do this and not include it as a condition where works is
                # redefined if unit changes from minute to hour or vice versa
                if sm.unit.lower() in ('hour', 'hours') and not submitted_form.cleaned_data.get(f"{field}-widget-checkbox"):
                    first_work = app_utils.minutes_to_hours(first_work)
                elif sm.unit.lower() in ('minute', 'minutes') and submitted_form.cleaned_data.get(f"{field}-widget-checkbox"):
                    first_work = app_utils.hours_to_minutes(first_work)
            elif field in ("min_work_time", "time_per_unit"):
                if submitted_form.cleaned_data.get(f"{field}-widget-checkbox"):
                    setattr(sm, field, app_utils.hours_to_minutes(getattr(sm, field)))
                if field in ("min_work_time", ):
                    setattr(sm, field, app_utils.safe_conversion(getattr(sm, field), 1 / sm.time_per_unit))
        except TypeError:
            pass

    # We don't actually need to do any further checking if x or y were predicted because of the frontend's validation
    if (
        sm.assignment_date is None or sm.time_per_unit is None or
        sm.x is None and sm.y is None or
        # if x is empty and y was not predicted (y is a value)
        request.POST.get('x') == "" and 'y' in request.POST or 
        # if y is empty and x was not predicted (x is a value)
        request.POST.get('y') == "" and 'x' in request.POST
    ):
        sm.needs_more_info = True
        sm.works = [str(first_work)]
    else:
        sm.needs_more_info = False
        date_now = utils.utc_to_local(request, timezone.now())
        date_now = date_now.replace(hour=0, minute=0, second=0, microsecond=0)
        if settings.EDITING_EXAMPLE_ACCOUNT:
            # Example account date (for below logic purposes)
            original_date_now = date_now
            date_now = utils.utc_to_local(request, datetime.datetime(2021, 5, 3, tzinfo=timezone.utc))
            sm.assignment_date -= original_date_now - date_now
            sm.x -= original_date_now - date_now
        min_work_time_funct_round = ceil(sm.min_work_time / sm.funct_round) * sm.funct_round if sm.min_work_time else sm.funct_round
        # NOTE: (sm.x is None and sm.y is None) is impossible
        if sm.x is None:
            if created_assignment or old_data.needs_more_info:
                adjusted_blue_line_partial = app_utils.adjust_blue_line(request,
                    old_data=old_data,
                    assignment_date=sm.assignment_date,
                    x_num=None
                )
                mods = app_utils.calc_mod_days(
                    assignment_date=sm.assignment_date,
                    blue_line_start=adjusted_blue_line_partial['blue_line_start'],
                    break_days=sm.break_days
                )
                new_first_work = first_work
            else:
                assert edited_assignment
                adjusted_blue_line_partial = app_utils.adjust_blue_line(request,
                    old_data=old_data,
                    assignment_date=sm.assignment_date,
                    x_num=None
                )
                mods = app_utils.calc_mod_days(
                    assignment_date=sm.assignment_date,
                    blue_line_start=old_data.blue_line_start,
                    break_days=sm.break_days
                )
                removed_works_start = adjusted_blue_line_partial['removed_works_start']
                removed_works_end = adjusted_blue_line_partial['removed_works_end']
                actual_len_works = removed_works_end + 1 - removed_works_start
                len_works = actual_len_works - 1
                if len_works >= 0:
                    # ctime * (y - new_first_work) = min_work_time_funct_round * x
                    # x = ctime * (y - new_first_work) / min_work_time_funct_round
                    # Solve for new_first_work:
                    # works = [old_data.works[n] - old_data.works[0] + first_work for n in range(removed_works_start,removed_works_end+1)]
                    # new_first_work is when n = removed_works_start
                    # new_first_work = old_data.works[removed_works_start] - old_data.works[0] + first_work
                    new_first_work = Decimal(old_data.works[removed_works_start]) - Decimal(old_data.works[0]) + first_work
                else:
                    new_first_work = first_work
            # the prediction for y is ceiled so also ceil the prediction for the due date for consistency
            work_day_count = ceil((sm.y - new_first_work) / min_work_time_funct_round)

            if not work_day_count or len(sm.break_days) == 7:
                x_num = 1
            elif sm.break_days:
                # Terrible implementation of inversing calcModDays

                # For reference, look at this:
                # x    0 1 2 3 4 5 6 7 | 8 9 10 11 12 13 14 | 15 16 17 18 19 20 21
                # f(x) 0 0 0 0 0 0 3 6 | 6 6 6  6  6  9  12 | 12 12 15
                # The goal is to find the week before the value and guess and check each day of the next week for the first value that results in x (without not working days)
                # Pretend x = 5 from the above example, which represents the number of days the user will work or x (without not working days)
                # For every week in this example, the user works 2 days
                # So, find how many 2 days fit into x = 5 and multiply that number by 7 

                # Since we want to find the week before the value, round x down to the nearest (7 - len_nwd), or 2 in this example
                # that would simplify it to be 7*floor(x/(7-len_nwd))*(7-len_nwd)/(7-len_nwd)
                # 7*floor(x/(7-len_nwd))
                
                # I subtract one at the end of the assignment for the for loop
                # And I subtract one in the middle of the equation to fix a wrong week bug that isn't worth fixing
                guess_x = 7 * floor(work_day_count / (7 - len(sm.break_days)) - 1) - 1
                while 1:
                    guess_x += 1
                    # logic stolen from Assignment.funct
                    if guess_x - (guess_x // 7 * len(sm.break_days) + mods[guess_x % 7]) == work_day_count:
                        x_num = max(1, guess_x)
                        break
            else:
                x_num = work_day_count
            # Make sure assignments arent finished by x_num
            # x_num = date_now+timedelta(x_num) - min(date_now, sm.assignment_date)
            if sm.assignment_date < date_now:
                # x_num = (date_now + timedelta(x_num) - sm.assignment_date).days
                # x_num = (date_now - sm.assignment_date).days + x_num
                # x_num += (date_now - sm.assignment_date).days
                x_num += utils.days_between_two_dates(date_now, sm.assignment_date)
                # There is no need to modify blue_line_start by this addition because it is adjusted earlier
                # To see why this is the case, let's think about this abstractly.
                # We are adding x_num to the due date, and the due date is after the assignment date and,
                # deductively, after the x position of the start of the blue line. Since we are only adding
                # to the end of the assignment, away from all of these affect variables, this addition should,
                #  in theory, not affect blue_line_start.
            try:
                sm.x = sm.assignment_date + datetime.timedelta(x_num)
            except OverflowError:
                sm.x = datetime.datetime.max - datetime.timedelta(10) # -10 to prevent overflow errors
                sm.x = sm.x.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.zoneinfo.ZoneInfo(request.utc_offset))
                x_num = utils.days_between_two_dates(sm.x, sm.assignment_date)
        else:
            x_num = utils.days_between_two_dates(sm.x, sm.assignment_date)
        if sm.due_time and (sm.due_time.hour or sm.due_time.minute):
            complete_x_num = Decimal(x_num) + Decimal(sm.due_time.hour * 60 + sm.due_time.minute) / Decimal(24 * 60)
            x_num += 1
        else:
            complete_x_num = x_num
        adjusted_blue_line = app_utils.adjust_blue_line(request,
            old_data=old_data,
            assignment_date=sm.assignment_date,
            x_num=x_num
        )
        sm.blue_line_start = adjusted_blue_line['blue_line_start']
        if sm.y is None:
            mods = app_utils.calc_mod_days(
                assignment_date=sm.assignment_date,
                blue_line_start=sm.blue_line_start,
                break_days=sm.break_days
            )
            # logic stolen from parabola.js:

            # let x1 = this.sa.complete_x - this.red_line_start_x,
            # x1 -= Math.floor((this.sa.x - this.red_line_start_x) / 7) * this.sa.break_days.length + mods[(this.sa.x - this.red_line_start_x) % 7];
            # if (this.sa.break_days.includes((this.assign_day_of_week + Math.floor(this.sa.complete_x)) % 7)) {
            #     x1 = Math.ceil(x1);
            # }

            complete_work_day_count = complete_x_num - sm.blue_line_start
            complete_work_day_count -= floor((x_num - sm.blue_line_start) / 7) * len(sm.break_days) + mods[(x_num - sm.blue_line_start) % 7]
            # first +1 for js
            if str((sm.assignment_date.weekday()+1 + floor(complete_x_num)) % 7) in sm.break_days:
                complete_work_day_count = ceil(complete_work_day_count)
            # we need to ceil (the prediction for due date is ceiled so also ceil the prediction for y for consistency) 
            # to the nearest funct_round in the case of fractional values of complete_work_day_count that may not
            # multiply to a multiple of funct_round
            sm.y = sm.funct_round * ceil((min_work_time_funct_round * complete_work_day_count) / sm.funct_round) + first_work
            # if min work time is for example 1 hour and work_day_count is 7 days, the user would ideally want to see
            # unit as "hour" and y as 7 hours instead of "minute" and 420 minutes
            if sm.unit.lower() in ('minute', 'minutes') and app_utils.should_convert_to_hours(sm.y):
                # so far all in the scope of minutes to define new_min_work_time_funct_round
                new_unit = "Minute"
                new_y = sm.y
                new_time_per_unit = Decimal(3600)
                new_funct_round = Decimal(30)
                new_min_work_time = sm.min_work_time

                new_min_work_time_funct_round = ceil(new_min_work_time / new_funct_round) * new_funct_round if new_min_work_time else new_funct_round
                if new_min_work_time_funct_round <= min_work_time_funct_round:
                    # Now convert to scope of hours
                    new_unit = "Hour"
                    new_y = app_utils.minutes_to_hours(new_y)
                    new_time_per_unit = app_utils.minutes_to_hours(new_time_per_unit)
                    new_funct_round = app_utils.minutes_to_hours(new_funct_round)
                    new_min_work_time = app_utils.minutes_to_hours(new_min_work_time)
                    sm.unit = new_unit
                    sm.y = new_y
                    sm.time_per_unit = new_time_per_unit
                    sm.funct_round = new_funct_round
                    sm.min_work_time = new_min_work_time
                
                # In case I need a reference:

                # # we need to simulate the logic that happens when you first change the unit from minute to hour on
                # # the frontend

                # # if (!["hour", undefined].includes(that.old_unit_value)) {
                # #     $("#funct_round-widget-checkbox").prop("checked", false);
                # #     $("#id_funct_round").val(30);
                # # }
                # # $("#id_time_per_unit").val(1);
                # # $("#time_per_unit-widget-checkbox").prop("checked", true);
                # new_funct_round = Decimal(30)
                # new_time_per_unit = Decimal(1)
                # # now to simulate the big conversion for loop:
                # # time_per_unit changes,
                # new_time_per_unit = app_utils.hours_to_minutes(new_time_per_unit)
                # # x doesn't change
                # # y doesn't change
                # # min_work_time changes,
                # # Undo the 1 / sm.time_per_unit, true original min work time in minutes
                # sm.min_work_time = sm.min_work_time * sm.time_per_unit # (change this to be safe conversion)
                # # Redo that but with new_time_per_unit, new min work time in terms of time_per_unit
                # sm.min_work_time = sm.min_work_time / new_time_per_unit
                # # works doesn't change
                # new_funct_round = app_utils.minutes_to_hours(new_funct_round)

                # current_min_work_time_funct_round_minutes = min_work_time_funct_round * sm.time_per_unit # (change this to be safe conversion)
                # new_min_work_time_funct_round = ceil(sm.min_work_time / new_funct_round) * new_funct_round if sm.min_work_time else new_funct_round
                # new_min_work_time_funct_round_minutes = new_min_work_time_funct_round * new_time_per_unit
                
        if created_assignment or old_data.needs_more_info or adjusted_blue_line['capped_at_x_num']:
            sm.dynamic_start = sm.blue_line_start
            sm.works = [str(first_work)]
        else:
            assert edited_assignment
            sm.dynamic_start += utils.days_between_two_dates(old_data.assignment_date, sm.assignment_date)
            if sm.dynamic_start < 0:
                sm.dynamic_start = 0
            # Should we include the dynamic_start >= x_num check?
            # Let's see if this is possible

            # if this runs, then sm.blue_line_start >= x_num is false
            # so blue_line_start < x_num

            # We also know that dynamic_start >= blue_line_start

            # Combining these, the following inequality is true at this point:
            # dynamic_start >= blue_line_start < x_num, which does not imply dynamic_start >= x_num is false
            elif sm.dynamic_start >= x_num:
                sm.dynamic_start = x_num - 1
            removed_works_start = adjusted_blue_line['removed_works_start']
            removed_works_end = adjusted_blue_line['removed_works_end']
            actual_len_works = removed_works_end + 1 - removed_works_start
            len_works = actual_len_works - 1
            if len_works >= 0:
                unit_changed_from_hour_to_minute = old_data.unit.lower() in ('hour', 'hours') and sm.unit.lower() in ('minute', 'minutes')
                unit_changed_from_minute_to_hour = old_data.unit.lower() in ('minute', 'minutes') and sm.unit.lower() in ('hour', 'hours')
                # app_utils.minutes_to_hours and app_utils.hours_to_minutes are not needed because i want this to be an accurate conversion
                if unit_changed_from_hour_to_minute:
                    old_data.works = [str(app_utils.hours_to_minutes(Decimal(i))) for i in old_data.works]
                elif unit_changed_from_minute_to_hour:
                    old_data.works = [str(app_utils.minutes_to_hours(Decimal(i))) for i in old_data.works]
                # If the edited assign date cuts off some of the work inputs, adjust the work inputs accordingly
                works_displacement = Decimal(old_data.works[0]) - first_work
                if not (
                    # All of these need to be true to skip redfining sm.works:
                    works_displacement == 0 and
                    removed_works_start == 0 and
                    removed_works_end + 1 == len(old_data.works) and
                    not unit_changed_from_hour_to_minute and
                    not unit_changed_from_minute_to_hour
                ):
                    sm.works = [str(Decimal(old_data.works[n]) - works_displacement) for n in range(removed_works_start, removed_works_end + 1)]
            else:
                # If the assignment or due date cuts off every work input
                sm.works = [str(first_work)]
                actual_len_works = 1
                len_works = actual_len_works - 1
            if Decimal(sm.works[len_works]) >= sm.y:
                # ensures assignments don't immediately delete after editing a y value
                # less than the last work input
                sm.dont_hide_again = True

    # This could be too annoying; don't do this

    # # Reset skew ratio if the red line x axis (x - (blue_line_start + leN_works)) or y axis (y - red_line_start_y)
    # # dynamic_start, blue_line_start (both from red_line_start_y), x, works, or y needs to be different
    # if (updated_assignment and (
    #         old_data.x != sm.x or 
    #         old_data.y != sm.y or 
    #         old_data.works != sm.works or
    #         old_data.blue_line_start != sm.blue_line_start or 
    #         old_data.dynamic_start != sm.dynamic_start
    # )):
    #     sm.skew_ratio = request.user.settingsmodel.def_skew_ratio

    if sm.assignment_date:
        sm.assignment_date = sm.assignment_date.replace(tzinfo=timezone.utc)
    if sm.x:
        sm.x = sm.x.replace(tzinfo=timezone.utc)

    # ap cs may have .java homework which are counted as links
    banned_endings = ("java", )

    is_user_assignment = not sm.is_google_classroom_assignment
    description_link = next((
        url for url in extractor.gen_urls(sm.description or '')
        if all(not url.endswith("." + ending) for ending in banned_endings)
    ), None)
    description_has_link = description_link is not None
    description_has_changed = created_assignment or sm.description != old_data.description
    
    if is_user_assignment and description_has_link and description_has_changed:
        sm.description = sm.description.replace(description_link, '')
        sm.description = submitted_form.fields['description'].clean(sm.description)
        sm.external_link = description_link

    sm.save()
    if created_assignment:
        logger.info(f'User \"{request.user}\" created assignment "{sm.name}"')
        refresh_dynamic_mode = None
    else:
        logger.info(f'User \"{request.user}\" updated assignment "{sm.name}"')
        refresh_dynamic_mode = False
        for field in TRIGGER_DYNAMIC_MODE_RESET_FIELDS:
            # this includes fields from TimewebForm.Meta.exclude
            # keep it like this because form_valid may internally and manually change these fields
            if field == "works" and getattr(old_data, field)[0] != getattr(sm, field)[0] or getattr(old_data, field) != getattr(sm, field):
                refresh_dynamic_mode = True
                break
    return JsonResponse({
        'valid': True,
        'edited_assignment': edited_assignment,
        'refresh_dynamic_mode': refresh_dynamic_mode,
        'assignments': [model_to_dict(sm, exclude=EXCLUDE_FROM_ASSIGNMENT_MODELS_JSON_SCRIPT)],
    })


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
