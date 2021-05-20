from django.template.defaulttags import register
@register.filter
def get_def_break_days(initial):
    return list(initial.get("def_break_days"))