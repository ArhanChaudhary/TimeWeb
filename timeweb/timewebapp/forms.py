from django import forms
from django.contrib.auth import get_user_model
from .models import TimewebModel, SettingsModel, HORIZONTAL_TAG_POSITIONS, VERTICAL_TAG_POSITIONS
from django.utils.translation import ugettext_lazy as _
from colorfield.widgets import ColorWidget
import datetime
from allauth.account.forms import LoginForm

class DateInput(forms.DateInput):
    input_type = 'date'

class TimeInput(forms.TimeInput):
    input_type = 'time'

class TimewebForm(forms.ModelForm):
    class Meta:
        model = TimewebModel
        fields = "__all__"
        widgets = {
            'namef': forms.TextInput(attrs={"placeholder": "Ex: Reading book, English essay, Math homework"}),
            'assignment_date': DateInput(),
            'x': DateInput(),
            'due_time': TimeInput(),
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
        super().__init__(*args, **kwargs)
        self.label_suffix = ""

    def clean(self):
        cleaned_data = super().clean()
        x = cleaned_data.get("x")
        due_time = cleaned_data.get("due_time") or datetime.time(0, 0)
        assignment_date = cleaned_data.get("assignment_date")
        works = cleaned_data.get("works")
        y = cleaned_data.get("y")
        if works != None and y != None and works >= y >= 1:
            self.add_error("works",
                forms.ValidationError(_("This field's value of %(value)g can't be %(equal_to_or_greater_than)s the above field's value of %(y)g"),code='invalid',params={
                    'value': works,
                    'y': y,
                    'equal_to_or_greater_than': "equal to" if works == y else "greater than",
                })
            )
        if x != None:
            complete_due_date = x + datetime.timedelta(hours=due_time.hour, minutes=due_time.minute)
        if x != None and assignment_date != None and complete_due_date <= assignment_date:
            self.add_error("x",
                forms.ValidationError(_("The due date can't be %(on_or_before)s the assignment date"),code='invalid',params={
                    'on_or_before': "on" if complete_due_date == assignment_date else "before"
                })
            )
        return cleaned_data

class SettingsForm(forms.ModelForm):
    horizontal_tag_position = forms.ChoiceField(widget=forms.Select, choices=HORIZONTAL_TAG_POSITIONS)
    vertical_tag_position = forms.ChoiceField(widget=forms.Select, choices=VERTICAL_TAG_POSITIONS)
    class Meta:
        model = SettingsModel
        fields = "__all__"
        widgets = {
            "user": forms.HiddenInput(),
            'def_min_work_time': forms.NumberInput(attrs={"min": "0"}),
            'def_due_time': forms.TimeInput(attrs={"type": "time"}),
            'date_now': forms.HiddenInput(),
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
            "def_unit_to_minute": "Sets the default unit of work to \"Minute\" for every new assignment, meaning it's divided up into units of time. Useful in case you don't know how to divide an assignment into units of work.",
            "def_funct_round_minute": "If your unit of work for any assignment is \"Minute,\" meaning it's divided up into minutes, round each day's work to the nearest multiple of 5 Minutes. Unrounded values look ugly (e.g: 17 Minutes, 49 Minutes).",
            "ignore_ends": "Ignores the minimum work time for the first and last working days of EVERY assignment with a minimum work time in exchange for making their work distributions smoother. Recommended to be enabled.",
            "show_progress_bar": "Displays a progress bar that measures how close you are to completing an assignment on every assignment's graph.",
            "reverse_sorting": "Sorts assignments in reverse order. Useful if you like completing easier assignments first and harder assignments last. Note that this isn't a true reverse. Some assignments may be still be placed at higher list positions due to other factors, such as them being due tomorrow.",
            "assignment_spacing": "Controls the height of every assignment.",
            "color_priority": "Colors every assignment based on their priority.",
            "text_priority": "Displays the priority percentage in text above the name of every assignment.",
            "close_graph_after_work_input": "Automatically closes the assignment graph after submitting today's work input.",
            "one_graph_at_a_time": "Automatically closes other open assignment graphs if you try to open a different one. Useful if many open graphs feel overwhelming.",
            "default_dropdown_tags": "These will show up by default in the tag add dropdown. Separate each default tag with a comma or new line.",
            "restore_gc_assignments": "Google Classroom assignments are normally added only once. Enabling this adds every Google Classroom assignment again in case you want them back.",
            "enable_tutorial": "You will also be given the option to enable or disable notifications after enabling this.",
        }
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.label_suffix = ""

class UsernameResetForm(forms.ModelForm):
    class Meta:
        model = get_user_model()
        fields = ("username", )
        widgets = {
            "username": forms.TextInput(attrs={"placeholder": "Username"}),
        }
        help_texts = {
            "username": "Enter your new username:",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.label_suffix = ""

class LabeledSignupForm(LoginForm):

    error_messages = {
        "account_inactive": _("This account is currently disabled, please contact the administrator"),
        "email_password_mismatch": _(
            "Your e-mail address or password is incorrect"
        ),
    }

    def __init__(self, *args, **kwargs):
        super(LabeledSignupForm, self).__init__(*args, **kwargs)

        self.fields['login'] = forms.EmailField(
            label=_("E-mail address"),
            required=True,
            widget=forms.TextInput(
                attrs={
                    "type": "email",
                    "autocomplete": "email",
                }
            ),
        )
        self.fields['password'].widget.attrs["placeholder"] = ""
        self.label_suffix = ""