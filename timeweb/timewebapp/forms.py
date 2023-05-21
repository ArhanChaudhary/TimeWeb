from django import forms
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .views import MAX_NUMBER_OF_TAGS, MAX_TAG_LENGTH
from .models import TimewebModel
import common.utils as utils

import datetime
from decimal import Decimal

class TimewebForm(forms.ModelForm):

    class Meta:
        model = TimewebModel
        # these are fields that cannot be saved nor validated from the frontend,
        # as they are handled and set internally
        exclude = (
            "needs_more_info",
            "is_google_classroom_assignment",
            "user",
            "external_link",
            "hidden",
            "deletion_time",
        )
        # time_per_unit should be first because of logic in views.py
        ADD_CHECKBOX_WIDGET_FIELDS = ["time_per_unit", "y", "x", "min_work_time","works", "funct_round"]
        widgets = {
            'name': forms.TextInput(attrs={"placeholder": "Ex. Book reading, Math homework, Study for test"}),
            'due_time': forms.HiddenInput(),
            'soft': forms.HiddenInput(),
            'blue_line_start': forms.HiddenInput(),
            'skew_ratio': forms.HiddenInput(),
            'fixed_mode': forms.HiddenInput(),
            'dynamic_start': forms.HiddenInput(),
            'tags': forms.HiddenInput(),
            'unit': forms.TextInput(attrs={"placeholder": "Ex: Chapter, Paragraph, Question", "class": "dont-mark-invalid-if-empty"}),
            'works': forms.NumberInput(attrs={"step": "0.01"}),
            # break_days also has dont-mark-invalid-if-empty just not here
            'description': forms.Textarea(attrs={"rows": "1", "class": "dont-mark-invalid-if-empty"}),
            'alert_due_date_incremented': forms.HiddenInput(),
            'dont_hide_again': forms.HiddenInput(),
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
    def __init__(self, data=None, *args, **kwargs):
        if data is not None:
            data = data.copy()
            if isinstance(data.get('x'), str) and 'due_time' not in data and data['x']:
                # form instances from update field validation vs from form submission is different
                # Parse ones from form submissions correctly
                data['due_time'] = data['x'].split(" ", 1)[1]
                data['due_time'] = datetime.datetime.strptime(data['due_time'], '%I:%M %p').time()
                data['due_time'] = data['due_time'].strftime('%H:%M')
                data['x'] = data['x'].split(" ", 1)[0]

        self.request = kwargs.pop('request')
        self.id = kwargs.pop('id', None)
        super().__init__(data, *args, **kwargs)
        assert not self.is_bound or data is not None, 'pls specify the data kwarg for readibility'
        for field_name in TimewebForm.Meta.ADD_CHECKBOX_WIDGET_FIELDS:
            self.fields[f"{field_name}-widget-checkbox"] = forms.BooleanField(widget=forms.HiddenInput(), required=False)
        self.label_suffix = ""

    def clean_name(self):
        name = self.cleaned_data['name']
        if name == "":
            raise forms.ValidationError(_("You can't have a blank name"))
        return name
    
    def clean_works(self):
        works = self.cleaned_data['works']
        if works is None:
            works = 0
        if isinstance(works, (int, float)):
            if works < 0:
                raise forms.ValidationError(_("This field's value must be positive or zero"))
            works = [str(works)]
        if not isinstance(works, list) or not all(isinstance(work, str) for work in works):
            raise forms.ValidationError(_("Invalid work inputs"))
        return works
    
    def clean_tags(self):
        tags = self.cleaned_data['tags']
        if tags is None:
            # to_python in JSONField.clean in save_assignment converts [] to None, but tags has a non-null constraint
            # revert it back to []

            # also works for when assignments are created (can even work with None too because of default=[] in tags)
            # (dont actually use null for save_assignment)
            return []
        if len(tags) > MAX_NUMBER_OF_TAGS:
            raise forms.ValidationError(_("You have too many tags (>%(n)dtags)") % {"n": MAX_NUMBER_OF_TAGS})
        if not (isinstance(tags, list) and all(isinstance(tag, str) for tag in tags)):
            raise forms.ValidationError(_("Invalid tags"))
        if any(len(tag) > MAX_TAG_LENGTH for tag in tags):
            raise forms.ValidationError(_("One or more of your tags are too long (>%(n)d characters)") % {"n": MAX_TAG_LENGTH})
        return tags
    
    def clean_description(self):
        description = self.cleaned_data['description']
        # for some reason textfield's empty_value is "" instead of None
        if description == "":
            description = None
        return description
    
    def clean_funct_round(self):
        funct_round = self.cleaned_data['funct_round']
        if funct_round is None:
            funct_round = Decimal(1)
        return funct_round
    
    def clean_assignment_date(self):
        assignment_date = self.cleaned_data['assignment_date']
        if assignment_date is None:
            return None
        assignment_date = assignment_date.replace(tzinfo=timezone.zoneinfo.ZoneInfo(self.request.utc_offset))
        return assignment_date
    
    def clean_x(self):
        x = self.cleaned_data['x']
        if x is None:
            return None
        x = x.replace(tzinfo=timezone.zoneinfo.ZoneInfo(self.request.utc_offset))
        return x

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
        try:
            first_work = works[0]
        except TypeError:
            first_work = None
        else:
            first_work = Decimal(first_work)
        x = cleaned_data.get("x")
        assignment_date = cleaned_data.get("assignment_date")
        blue_line_start = cleaned_data.get("blue_line_start")
        unit = cleaned_data.get("unit")
        name = cleaned_data.get("name")
        due_time = cleaned_data.get("due_time") or datetime.time(0, 0)
        if 'x' not in self.request.POST and not y:
            # x is disabled but y doesn't have a value
            self.add_error("y", forms.ValidationError("Please enter a value for the due date's prediction"))
        if 'y' not in self.request.POST and not x:
            # y is disabled but x doesn't have a value
            self.add_error("x", forms.ValidationError("Please enter a value for the other field's prediction"))
        # save_assignment from the frontend for needs more info assignments can
        # have works defined but not blue_line_start and etc
        if blue_line_start != None and x != None and assignment_date != None:
            len_works = len(works) - 1
            x_num = utils.days_between_two_dates(x, assignment_date)
            if due_time and (due_time.hour or due_time.minute):
                x_num += 1
            if blue_line_start + len_works > x_num:
                # Don't actually do this bc we need to raise an error for it to be excluded from save_assignment

                # [-n:] removes the last n items for n >= 1
                # We want to remove the amount of work inputs that are past the due date
                # cleaned_data['works'] = works[:-(blue_line_start + len_works - x_num)]

                # Also note if it somehow gets stuck in a place where work inputs are after the due date, we are
                # ok, even with this check. While they won't get deleted server side, they will client side, and
                # the user will eventually delete work inputs until before the due date and skip this error
                self.add_error("works", forms.ValidationError("You have too many work inputs"))
        elif y is not None and first_work is not None and first_work * normalize_works >= y * normalize_y >= 1:
            self.add_error("works",
                forms.ValidationError(_("This field's value of %(value)s can't be %(equal_to_or_greater_than)s the previous field's value of %(y)s"),code='invalid',params={
                    'value': f"{first_work}{({1: 'm', 60: 'h'}[normalize_works] if comparing_time else '')}",
                    'y': f"{y}{({1: 'm', 60: 'h'}[normalize_y] if comparing_time else '')}",
                    'equal_to_or_greater_than': "equal to" if first_work == y else "greater than",
                })
            )
            self.add_error("y", forms.ValidationError(""))

        # if x or assignment date is none, the assignment needs more info
        if x != None and assignment_date != None:
            complete_due_date = x + datetime.timedelta(hours=due_time.hour, minutes=due_time.minute)
            if complete_due_date <= assignment_date:
                self.add_error("x",
                    forms.ValidationError(_("The due date can't be%(before)sthe assignment date"),code='invalid',params={
                        'before': " " if complete_due_date == assignment_date else " before "
                    })
                )
                self.add_error("assignment_date", forms.ValidationError(""))
        if self.id and self.request.user.example_assignment and self.id == self.request.user.example_assignment.id and utils.utc_to_local(self.request, timezone.now()).replace(hour=0, minute=0, second=0, microsecond=0) != assignment_date:
            self.add_error("assignment_date", forms.ValidationError(_("You cannot change this field of the example assignment")))
        if unit is None:
            # NOTE: do not do this from the backend!
            # # if y was predicted, always use minute
            # if cleaned_data.get("y-widget-checkbox") and "y" in self.request.POST:

            # it messes up time_per_unit and funt_round
            # (i.e time_per_unit can be 60 and funct_roun can be 30 and unit is
            # set to minute)
            if cleaned_data.get("y-widget-checkbox"):
                cleaned_data['unit'] = "Hour"
            else:
                cleaned_data['unit'] = "Minute"
        return cleaned_data