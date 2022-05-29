from django.contrib import messages
from contact_form.views import ContactForm as BaseContactForm
from django.template.loader import render_to_string
from django.utils.translation import ugettext_lazy as _
from django import forms
import datetime
from colorfield.widgets import ColorWidget
from .models import SettingsModel
from django.forms.widgets import ClearableFileInput

class CustomImageFieldWidget(ClearableFileInput):
    clear_checkbox_label = _('Clear image')
    input_text = _('Change image')
    template_name = 'navbar/widgets/clearable_file_input.html'

class SettingsForm(forms.ModelForm):
    class Meta:
        model = SettingsModel
        fields = "__all__"
        widgets = {
            "user": forms.HiddenInput(),
            'def_min_work_time': forms.NumberInput(attrs={"min": "0"}),
            'oauth_token': forms.HiddenInput(),
            'highest_priority_color': ColorWidget,
            'lowest_priority_color': ColorWidget,
            'def_skew_ratio': forms.NumberInput(attrs={"step": "0.1"}),
            'assignment_sorting': forms.Select(attrs={"class": "generic-button"}),
            'default_dropdown_tags': forms.Textarea(attrs={"rows": "", "cols": ""}),
            'added_gc_assignment_ids': forms.HiddenInput(),
            'seen_latest_changelog': forms.HiddenInput(),
            'background_image': CustomImageFieldWidget(),
        }
        error_messages = {
            'def_min_work_time': {
                'max_digits': _("This field can only have %(n)d digits before and %(n2)d digits after its decimal point") % {"n": SettingsModel.def_min_work_time.field.max_digits - SettingsModel.def_min_work_time.field.decimal_places, "n2": SettingsModel.def_min_work_time.field.decimal_places},
                'max_decimal_places': _("The default minimum work time has too many decimal places (>%(n)d decimal places)") % {"n": SettingsModel.def_min_work_time.field.decimal_places},
                'max_whole_digits': _("The default minimum work time has too many digits before its decimal point (>%(n)d digits)") % {"n": SettingsModel.def_min_work_time.field.max_digits - SettingsModel.def_min_work_time.field.decimal_places},
                'invalid': _("The default minimum work time is invalid"),
            },
            'def_skew_ratio': {
                'max_digits': _("The default curvature can only have %(n)d digits before and %(n2)d digits after its decimal point") % {"n": SettingsModel.def_skew_ratio.field.max_digits - SettingsModel.def_skew_ratio.field.decimal_places, "n2": SettingsModel.def_skew_ratio.field.decimal_places},
                'max_decimal_places': _("The default curvature has too many decimal places (>%(n)d decimal places)") % {"n": SettingsModel.def_skew_ratio.field.decimal_places},
                'max_whole_digits': _("The default curvature has too many digits before its decimal point (>%(n)d digits)") % {"n": SettingsModel.def_skew_ratio.field.max_digits - SettingsModel.def_skew_ratio.field.decimal_places},
                'invalid': _("The default curvature is invalid"),
            }
        }
        help_texts = {
            "def_skew_ratio": "Set this value to 0 to make it linear.",
            "ignore_ends": "Ignores the minimum work time for the first and last working days of EVERY assignment with a minimum work time in exchange for making their work distributions smoother. Recommended to be enabled.",
            "show_priority": "Displays the priority percentage and color for every assignment.",
            "close_graph_after_work_input": "Automatically closes the assignment graph after submitting today's work input.",
            "one_graph_at_a_time": "Automatically closes other open assignment graphs if you try to open a different one. Useful if many open graphs feel overwhelming.",
            "default_dropdown_tags": "These will show up by default in the tag add dropdown. Separate each default tag with a comma or new line.",
            "animation_speed": "Controls the speed of most animations.",
            "timezone": "Backend calculations use your browser's timezone. If your browser doesn't imply your timezone, choose your timezone here.",
            "restore_gc_assignments": "Google Classroom assignments are normally added only once. Enabling this adds every Google Classroom assignment again in case you want them back.",
            # "enable_tutorial": "You will also be given the option to enable or disable notifications after enabling this.",
        }
    def __init__(self, *args, **kwargs):
        if 'data' in kwargs and 'def_due_time' in kwargs['data'] and kwargs['data']['def_due_time']:
            kwargs['data']['def_due_time'] = datetime.datetime.strptime(kwargs['data']['def_due_time'], '%I:%M %p').time()
            kwargs['data']['def_due_time'] = kwargs['data']['def_due_time'].strftime('%H:%M')

        super().__init__(*args, **kwargs)
        self.label_suffix = ""


class ContactForm(BaseContactForm):
    body = forms.CharField(widget=forms.Textarea, label=_("Ask me anything"))

    def save(self, *args, **kwargs):
        message = render_to_string(
            "contact_form/contact_e-mail_sent.txt",
            {},
            self.request
        ).strip()
        if message:
            messages.success(self.request, message)
        super().save(*args, **kwargs)
