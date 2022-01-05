from django.template.defaulttags import register
@register.filter
def str_sociallogin(sociallogin):
    if not sociallogin: return ""
    return sociallogin.email_addresses[0].email