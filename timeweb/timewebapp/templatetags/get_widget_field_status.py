from django.template.defaulttags import register
@register.filter
def get_widget_field_status(form, field_name):
    return form[f'{field_name}-widget-checkbox'].value()
