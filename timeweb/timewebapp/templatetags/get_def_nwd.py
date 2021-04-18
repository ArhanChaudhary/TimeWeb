from django.template.defaulttags import register
@register.filter
def get_def_nwd(initial):
    return list(initial.get("def_nwd"))