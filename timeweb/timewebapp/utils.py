from decimal import Decimal
import common.utils as utils
from django.utils import timezone

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
# Make sure these three function mirror the corresponding frontend logic
hours_to_minutes = lambda hours: safe_conversion(hours, 60)
minutes_to_hours = lambda minutes: safe_conversion(minutes, 1/60)
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
    from .models import User
    import datetime
    users = User.objects.all()
    for user in users:
        hidden = user.timewebmodel_set.filter(hidden=True)
        if hidden.count() <= 1: continue

        def is_unique(time):
            return user.timewebmodel_set.filter(hidden=True).filter(deletion_time=time).count() == 1
        for assignment in hidden:
            while not is_unique(assignment.deletion_time):
                assignment.deletion_time += datetime.timedelta(microseconds=100000)
                assignment.save()

def adjust_blue_line(request, *, old_data, assignment_date, x_num, needs_more_info, blue_line_start):
    assert assignment_date is not None
    date_now = utils.utc_to_local(request, timezone.now())
    date_now = date_now.replace(hour=0, minute=0, second=0, microsecond=0)
    ideal_blue_line_start = utils.days_between_two_dates(date_now, assignment_date)
    if old_data is None or needs_more_info:
        blue_line_start = ideal_blue_line_start
    else:
        old_x_num = utils.days_between_two_dates(old_data.x, old_data.assignment_date)
        if old_data.due_time and (old_data.due_time.hour or old_data.due_time.minute):
            old_x_num += 1
        old_ideal_blue_line_start = utils.days_between_two_dates(date_now, old_data.assignment_date)
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
            blue_line_start = blue_line_start + utils.days_between_two_dates(old_data.assignment_date, assignment_date)
        elif (
            # if self.blue_line_start >= x_num then blue_line_start is 0
            old_ideal_blue_line_start >= old_x_num and 
            not ideal_blue_line_start >= x_num
        ):
            blue_line_start = ideal_blue_line_start
        else:
            blue_line_start = blue_line_start + utils.days_between_two_dates(old_data.assignment_date, assignment_date)
    if blue_line_start < 0:
        removed_works_start = -blue_line_start # translates x position 0 so that it can be used to accessing works
        blue_line_start = 0
    else:
        removed_works_start = 0
    # TODO: do I need to account for when x_num is None?
    if x_num is None:
        capped_at_x_num = None
    else:
        capped_at_x_num = blue_line_start >= x_num
        if capped_at_x_num:
            blue_line_start = 0
    
    # NOTE: these conditions are derived from the if statement criteria from older commits on how to reach
    # removed_works_end
    if needs_more_info or old_data is None or capped_at_x_num:
        removed_works_end = None
    else:
        removed_works_end = len(old_data.works) - 1
        actual_len_works = removed_works_end + 1 - removed_works_start
        len_works = actual_len_works - 1
        # If the edited due date cuts off some of the work inputs
        # TODO: do I need to account for when x_num is None?
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
