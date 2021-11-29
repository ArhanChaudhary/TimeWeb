from django.template.defaulttags import register
@register.filter
def get_version_id(initial):
    return initial.split(" (")[0]