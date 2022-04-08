from django import forms
from .models import TimewebModel, SettingsModel
from django.contrib.auth import get_user_model
from django.contrib import messages
from django.template.loader import render_to_string
from django.utils.translation import ugettext_lazy as _
from colorfield.widgets import ColorWidget
from contact_form.views import ContactForm as BaseContactForm
import datetime

User = get_user_model()

class TimewebForm(forms.ModelForm):
    class Meta:
        model = TimewebModel
        fields = "__all__"
        widgets = {
            'name': forms.TextInput(attrs={"placeholder": "Ex: Reading book, English essay, Math homework"}),
            'due_time': forms.HiddenInput(),
            'blue_line_start': forms.HiddenInput(),
            'skew_ratio': forms.HiddenInput(),
            'fixed_mode': forms.HiddenInput(),
            'dynamic_start': forms.HiddenInput(),
            'mark_as_done': forms.HiddenInput(),
            'needs_more_info': forms.HiddenInput(),
            'is_google_classroom_assignment': forms.HiddenInput(),
            'tags': forms.HiddenInput(),
            'user': forms.HiddenInput(),
            'unit': forms.TextInput(attrs={"placeholder": "Ex: Chapter, Paragraph, Question"}),
            'works': forms.NumberInput(attrs={"min":"0","step":"0.01"}),
            'y': forms.NumberInput(attrs={"min":"1"}),
            'time_per_unit': forms.NumberInput(attrs={"min":"0"}),
            'description': forms.Textarea(attrs={"rows": "1"}),
            'funct_round': forms.NumberInput(attrs={"min":"0"}),
            'min_work_time': forms.NumberInput(attrs={"min":"0"}),
            'has_alerted_due_date_passed_notice': forms.HiddenInput(),
            'alert_due_date_incremented': forms.HiddenInput(),
        }
        error_messages = {
            'name': {
                'required': _("Please enter an assignment name"),
                'max_length': _("This assignment's name is too long (>%(n)d characters)") % {"n": TimewebModel.name.field.max_length},
                'invalid': _("This assignment's name is invalid"),
            },
            'assignment_date': {
                'invalid': _('The assignment date is out of range or invalid'),
            },
            'x': {
                'invalid': _('The due date is out of range or invalid'),
            },
            'unit': {
                'max_length': _("This field's name is too long (>%(n)d characters)") % {"n": TimewebModel.unit.field.max_length},
                'invalid': _("This field's value is invalid"),
            },
            'y': {
                'max_digits': _("This field can only have %(n)d digits before and %(n2)d digits after its decimal point") % {"n": TimewebModel.y.field.max_digits - TimewebModel.y.field.decimal_places, "n2": TimewebModel.y.field.decimal_places},
                'max_decimal_places': _("This field's value has too many decimal places (>%(n)d decimal places)") % {"n": TimewebModel.y.field.decimal_places},
                'max_whole_digits': _("This field's value has too many digits before its decimal point (>%(n)d digits)")% {"n": TimewebModel.y.field.max_digits - TimewebModel.y.field.decimal_places},
            },
            'works': {
                'invalid': _("This field's value is invalid"),
            },
            'time_per_unit': {
                'max_digits': _("This field's value is too long (>%(n)d digits)") % {"n": TimewebModel.time_per_unit.field.max_digits},
                'max_decimal_places': _("This field's value has too many decimal places (>%(n)d decimal places)") % {"n": TimewebModel.time_per_unit.field.decimal_places},
                'max_whole_digits': _("This field's value has too many digits before its decimal point (>%(n)d digits)") % {"n": TimewebModel.time_per_unit.field.max_digits - TimewebModel.time_per_unit.field.decimal_places},
                'invalid': _("This field's value is invalid"),
            },
            'funct_round': {
                'max_digits': _("This field can only have %(n)d digits before and %(n2)d digits after its decimal point") % {"n": TimewebModel.funct_round.field.max_digits - TimewebModel.funct_round.field.decimal_places, "n2": TimewebModel.funct_round.field.decimal_places},
                'max_decimal_places': _("This field's value has too many digits after its decimal point (>%(n)d digits)") % {"n": TimewebModel.funct_round.field.decimal_places},
                'max_whole_digits': _("This field's value has too many digits before its decimal point (>%(n)d digits)") % {"n": TimewebModel.funct_round.field.max_digits - TimewebModel.funct_round.field.decimal_places},
                'invalid': _("This field's value is invalid"),
            },
            'min_work_time': {
                'max_digits': _("This field can only have %(n)d digits before and %(n2)d digits after its decimal point") % {"n": TimewebModel.min_work_time.field.max_digits - TimewebModel.min_work_time.field.decimal_places, "n2": TimewebModel.min_work_time.field.decimal_places},
                'max_decimal_places': _("The minimum work time has too many decimal places (>%(n)d decimal places)") % {"n": TimewebModel.min_work_time.field.decimal_places},
                'max_whole_digits': _("The minimum work time has too many digits before its decimal point (>%(n)d digits)") % {"n": TimewebModel.min_work_time.field.max_digits - TimewebModel.min_work_time.field.decimal_places},
                'invalid': _("The minimum work time is invalid"),
            },
        }
    def __init__(self, *args, **kwargs):
        if 'data' in kwargs and 'x' in kwargs['data'] and kwargs['data']['x']:
            kwargs['data']['due_time'] = kwargs['data']['x'].split(" ", 1)[1]
            kwargs['data']['due_time'] = datetime.datetime.strptime(kwargs['data']['due_time'], '%I:%M %p').time()
            kwargs['data']['due_time'] = kwargs['data']['due_time'].strftime('%H:%M')

            kwargs['data']['x'] = kwargs['data']['x'].split(" ", 1)[0]

        super().__init__(*args, **kwargs)
        self.label_suffix = ""

    def clean(self):
        cleaned_data = super().clean()
        x = cleaned_data.get("x")
        due_time = cleaned_data.get("due_time") or datetime.time(0, 0)
        assignment_date = cleaned_data.get("assignment_date")
        works = cleaned_data.get("works")
        y = cleaned_data.get("y")
        if not isinstance(works, list) and works != None and y != None and works >= y >= 1:
            self.add_error("works",
                forms.ValidationError(_("This field's value of %(value)g can't be %(equal_to_or_greater_than)s the above field's value of %(y)g"),code='invalid',params={
                    'value': works,
                    'y': y,
                    'equal_to_or_greater_than': "equal to" if works == y else "greater than",
                })
            )
            self.add_error("y", forms.ValidationError(""))
        if x != None:
            complete_due_date = x + datetime.timedelta(hours=due_time.hour, minutes=due_time.minute)
            if complete_due_date <= assignment_date:
                self.add_error("x",
                    forms.ValidationError(_("The due date can't be%(before)sthe assignment date"),code='invalid',params={
                        'before': "" if complete_due_date == assignment_date else " before "
                    })
                )
                self.add_error("assignment_date", forms.ValidationError(""))
        return cleaned_data

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
            'default_dropdown_tags': forms.Textarea(attrs={"rows": "", "cols": ""}),
            'added_gc_assignment_ids': forms.HiddenInput(),
            'seen_latest_changelog': forms.HiddenInput(),
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
            "def_funct_round_minute": "If your unit of work for any assignment is \"Minute\", meaning it's divided up into minutes, round each day's work to the nearest multiple of 5 minutes. Unrounded values look ugly (such as 17 minutes, 49 minutes).",
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
