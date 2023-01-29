from decimal import Decimal

def calc_mod_days(self):
    # Note to future self: I have rigorously tested the inclusion of +1 and it is needed
    assign_day_of_week = self.sm.assignment_date.weekday() + 1 # js moment
    red_line_start_x = self.sm.blue_line_start
    mods = [0]
    mod_counter = 0
    for mod_day in range(6):
        if str((assign_day_of_week + red_line_start_x + mod_day) % 7) in self.sm.break_days:
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