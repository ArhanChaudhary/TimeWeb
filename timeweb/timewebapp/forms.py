from django import forms
from .models import TimewebModel
from django.utils.translation import gettext_lazy as _
import datetime
from django.conf import settings
import common.utils as utils

class TimewebForm(forms.ModelForm):

    class Meta:
        model = TimewebModel
        fields = "__all__"
        # time_per_unit should be first because of logic in views.py
        ADD_CHECKBOX_WIDGET_FIELDS = ["time_per_unit", "y", "x", "min_work_time","works", "funct_round"]
        widgets = {
            'name': forms.TextInput(attrs={"placeholder": "Ex: Reading book, English essay, Math homework"}),
            'due_time': forms.HiddenInput(),
            'soft': forms.HiddenInput(),
            'blue_line_start': forms.HiddenInput(),
            'skew_ratio': forms.HiddenInput(),
            'fixed_mode': forms.HiddenInput(),
            'dynamic_start': forms.HiddenInput(),
            'needs_more_info': forms.HiddenInput(),
            'is_google_classroom_assignment': forms.HiddenInput(),
            'tags': forms.HiddenInput(),
            'user': forms.HiddenInput(),
            'unit': forms.TextInput(attrs={"placeholder": "Ex: Chapter, Paragraph, Question", "class": "dont-mark-invalid-if-empty"}),
            'works': forms.NumberInput(attrs={"min":"0","step":"0.01"}),
            # break_days also has dont-mark-invalid-if-empty just not here
            'y': forms.NumberInput(attrs={"min":"0"}),
            'time_per_unit': forms.NumberInput(attrs={"min":"0"}),
            'description': forms.Textarea(attrs={"rows": "1", "class": "dont-mark-invalid-if-empty"}),
            'funct_round': forms.NumberInput(attrs={"min":"0"}),
            'min_work_time': forms.NumberInput(attrs={"min":"0"}),
            'has_alerted_due_date_passed_notice': forms.HiddenInput(),
            'google_classroom_assignment_link': forms.HiddenInput(),
            'alert_due_date_incremented': forms.HiddenInput(),
            'hidden': forms.HiddenInput(),
            'dont_hide_again': forms.HiddenInput(),
            'deletion_time': forms.HiddenInput(),
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
                'invalid': _("The step size is invalid"),
            },
            'min_work_time': {
                'max_digits': _("This field can only have %(n)d digits before and %(n2)d digits after its decimal point") % {"n": TimewebModel.min_work_time.field.max_digits - TimewebModel.min_work_time.field.decimal_places, "n2": TimewebModel.min_work_time.field.decimal_places},
                'max_decimal_places': _("The minimum work time has too many decimal places (>%(n)d decimal places)") % {"n": TimewebModel.min_work_time.field.decimal_places},
                'max_whole_digits': _("The minimum work time has too many digits before its decimal point (>%(n)d digits)") % {"n": TimewebModel.min_work_time.field.max_digits - TimewebModel.min_work_time.field.decimal_places},
                'invalid': _("The minimum work time is invalid"),
            },
        }
    def __init__(self, *args, **kwargs):

        # form instances from update field validation vs from form submission is different
        # Parse ones from form submissions correctly
        if isinstance(kwargs.get('data', {}).get('x'), str) and 'due_time' not in kwargs['data'] and kwargs['data']['x']:
            kwargs['data']['due_time'] = kwargs['data']['x'].split(" ", 1)[1]
            kwargs['data']['due_time'] = datetime.datetime.strptime(kwargs['data']['due_time'], '%I:%M %p').time()
            kwargs['data']['due_time'] = kwargs['data']['due_time'].strftime('%H:%M')

            kwargs['data']['x'] = kwargs['data']['x'].split(" ", 1)[0]

        self.request = kwargs.pop('request')
        super().__init__(*args, **kwargs)
        assert not self.is_bound or 'data' in kwargs, 'pls specify the data kwarg for readibility'
        for field_name in TimewebForm.Meta.ADD_CHECKBOX_WIDGET_FIELDS:
            self.fields[f"{field_name}-widget-checkbox"] = forms.BooleanField(widget=forms.HiddenInput(), required=False)
        self.label_suffix = ""

    def clean_name(self):
        name = self.cleaned_data['name']
        if name == "":
            raise forms.ValidationError(_("You can't have a blank name"))
        if self.request.isExampleAccount and not settings.EDITING_EXAMPLE_ACCOUNT:
            raise forms.ValidationError(_("You can't create nor edit assignments in the example account"))
        return name

    def clean(self):
        # A useful reference on how to correctly use form validation: https://stackoverflow.com/a/31729820/12230735
        cleaned_data = super().clean()

        normalize_works = 1
        normalize_y = 1
        comparing_time = False
        if cleaned_data['y-widget-checkbox']:
            normalize_y = 60
            comparing_time = True
        if cleaned_data['works-widget-checkbox']:
            normalize_works = 60
            comparing_time = True

        y = cleaned_data.get("y")
        works = cleaned_data.get("works")
        x = cleaned_data.get("x")
        assignment_date = cleaned_data.get("assignment_date")
        if isinstance(works, list):
            len_works = len(works) - 1
            blue_line_start = cleaned_data.get("blue_line_start")
            x_num = utils.days_between_two_dates(x, assignment_date)
            if blue_line_start + len_works > x_num:
                # Don't actually do this bc we need to raise an error for it to be excluded from save_assignment

                # [-n:] removes the last n items for n >= 1
                # We want to remove the amount of work inputs that are past the due date
                # cleaned_data['works'] = works[:-(blue_line_start + len_works - x_num)]

                # Also note if it somehow gets stuck in a place where work inputs are after the due date, we are
                # ok, even with this check. While they won't get deleted server side, they will client side, and
                # the user will eventually delete work inputs until before the due date and skip this error
                self.add_error("works", forms.ValidationError("You have too many work inputs"))
        elif works != None and y != None and works * normalize_works >= y * normalize_y >= 1:
            self.add_error("works",
                forms.ValidationError(_("This field's value of %(value)s can't be %(equal_to_or_greater_than)s the previous field's value of %(y)s"),code='invalid',params={
                    'value': f"{works}{({1: 'm', 60: 'h'}[normalize_works] if comparing_time else '')}",
                    'y': f"{y}{({1: 'm', 60: 'h'}[normalize_y] if comparing_time else '')}",
                    'equal_to_or_greater_than': "equal to" if works == y else "greater than",
                })
            )
            self.add_error("y", forms.ValidationError(""))

        # if x or assignment date is none, the assignment needs more info
        due_time = cleaned_data.get("due_time") or datetime.time(0, 0)
        if x != None and assignment_date != None:
            complete_due_date = x + datetime.timedelta(hours=due_time.hour, minutes=due_time.minute)
            if complete_due_date <= assignment_date:
                self.add_error("x",
                    forms.ValidationError(_("The due date can't be%(before)sthe assignment date"),code='invalid',params={
                        'before': " " if complete_due_date == assignment_date else " before "
                    })
                )
                self.add_error("assignment_date", forms.ValidationError(""))
        return cleaned_data
