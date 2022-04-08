from django.template.defaulttags import register
@register.filter
def is_message_success(Message):
    return "**Success**" in Message.message