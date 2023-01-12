from django.contrib import messages
from contact_form.views import ContactForm as BaseContactForm
from django.template.loader import render_to_string
from django.utils.translation import gettext_lazy as _
from django import forms
from colorfield.widgets import ColorWidget
from .models import SettingsModel
from django.forms.widgets import ClearableFileInput
from django.utils.safestring import mark_safe

class CustomImageFieldWidget(ClearableFileInput):
    clear_checkbox_label = _('Clear current image')
    input_text = _('Change current image')
    template_name = 'navbar/widgets/clearable_file_input.html'

class SettingsForm(forms.ModelForm):
    class Meta:
        model = SettingsModel
        exclude = ("oauth_token", "added_gc_assignment_ids", "user", "gc_courses_cache", "device_uuid", "device_uuid_api_timestamp")
        extra_fields = {
            "enable_gc_integration": {
                "field": forms.BooleanField(
                    label="Google Classroom Integration",
                    help_text=mark_safe('Imports assignments from Google Classroom to TimeWeb. Some assignments are <a target="_blank" href="/user-guide#adding-google-classroom-assignments">automatically filtered</a>. If nothing happens after authorization, there aren&#x27;t any valid Google Classroom assignments to add.'),
                    required=False,
                ),
                "order": "before immediately_delete_completely_finished_assignments",
            },
            "calendar_integration": {
                "field": forms.BooleanField(
                    label="Google Calendar Integration",
                    required=False,
                    widget=forms.CheckboxInput(attrs={"class": "not-yet-implemented"}),
                    help_text="Not yet implemented.",
                ),
                "order": "after enable_gc_integration",
            },
            "notifications_integration": {
                "field": forms.BooleanField(
                    label="Notifications Integration",
                    widget=forms.CheckboxInput(attrs={"class": "not-yet-implemented"}),
                    help_text="Not yet implemented.",
                    required=False,
                ),
                "order": "after calendar_integration",
            },
            "canvas_integration": {
                "field": forms.BooleanField(
                    label="Canvas Integration",
                    help_text="Not yet implemented.",
                    widget=forms.CheckboxInput(attrs={"class": "not-yet-implemented"}),
                    required=False,
                ),
                "order": "after notifications_integration",
            },
            "view_deleted_assignments": {
                "field": forms.BooleanField(
                    label="View Deleted Assignments",
                    help_text="Refresh after viewing to go back to your unhidden assignments.",
                    required=False,
                ),
                "order": "after immediately_delete_completely_finished_assignments"
            }
        }
        widgets = {
            'def_min_work_time': forms.NumberInput(attrs={"min": "0"}),
            'highest_priority_color': ColorWidget,
            'lowest_priority_color': ColorWidget,
            'def_skew_ratio': forms.NumberInput(attrs={"step": "0.1"}),
            'assignment_sorting': forms.Select(attrs={"class": "generic-button"}),
            'default_dropdown_tags': forms.Textarea(attrs={"rows": "", "cols": ""}),
            'background_image': CustomImageFieldWidget(),
            'seen_latest_changelog': forms.HiddenInput(),
            'nudge_calendar': forms.HiddenInput(),
            'nudge_notifications': forms.HiddenInput(),
            'nudge_canvas': forms.HiddenInput(),
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
            "def_min_work_time": "Enter this value in minutes. If you typically complete longer periods of work at a time, set this to a high value (such as 60 minutes or 90 minutes).",
            "loosely_enforce_minimum_work_times": "Ignores every assignments' minimum work time on their first and last working days in exchange for making their work distributions smoother. Recommended to be turned on.",
            "show_priority": "Displays the priority percentage and color for every assignment.",
            "close_graph_after_work_input": "Automatically closes the assignment graph after submitting today's work input.",
            "one_graph_at_a_time": "Automatically closes other open assignment graphs if you try to open a different one. Useful if many open graphs feel overwhelming.",
            "default_dropdown_tags": "These will show up by default in the tag add dropdown. Separate each default tag with a comma or new line.",
            "appearance": "Lesser dark mode doesn't color your assignment titles.",
            "animation_speed": "Controls the speed of most animations.",
            "timezone": "Backend calculations use your browser's timezone. Choose your timezone here if you wish to change it.",
            "sorting_animation_threshold": "Only do the assignment sorting animation when there are this many assignments or less. Due to performance lag as the number of assignments increase, enter a higher number if your device is high-end and a lower number if your device is low-end.",
            "immediately_delete_completely_finished_assignments": "Immediately delete assignments that are completely finished by your work inputs. Ignores assignments that are marked as completely finished from their due dates passing. Deleted assignments can be recovered and restored from the deleted assignments view.",
            "background_image_text_shadow_width": "Controls the width of the shadow around text for when you have a background image. Make this thicker if the text is hard to read, and thinner if the text is too easy to read.",
            # "enable_tutorial": "You will also be given the option to enable or disable notifications after enabling this.",
        }
    def __init__(self, *args, **kwargs):
        # See explanation in TimewebForm.__init__ if i want to parse time inputs for future time field settings

        super().__init__(*args, **kwargs)
        assert not self.is_bound or 'data' in kwargs, 'pls specify the data kwarg for readibility'

        # Correct extra field order logic

        # Maps every form field to what extra field comes after it
        extra_fields_after_map = {extra_field_data['order'].split(" ")[1]: extra_field_name for extra_field_name, extra_field_data in SettingsForm.Meta.extra_fields.items()
                        if extra_field_data['order'].split(" ")[0] == "after"}
        # And before it
        extra_fields_before_map = {extra_field_data['order'].split(" ")[1]: extra_field_name for extra_field_name, extra_field_data in SettingsForm.Meta.extra_fields.items()
                        if extra_field_data['order'].split(" ")[0] == "before"}
        
        assert len(extra_fields_after_map) + len(extra_fields_before_map) == len(SettingsForm.Meta.extra_fields), "invalid order in extra_fields"

        try:
            new_keyorder = list(self.fields.keys())
            for k, v in extra_fields_after_map.items():
                new_keyorder.insert(new_keyorder.index(k) + 1, v)
            for k, v in reversed(extra_fields_before_map.items()):
                new_keyorder.insert(new_keyorder.index(k), v)
        except ValueError:
            new_keyorder = list(self.fields.keys())
            for k, v in reversed(extra_fields_before_map.items()):
                new_keyorder.insert(new_keyorder.index(k), v)
            for k, v in extra_fields_after_map.items():
                new_keyorder.insert(new_keyorder.index(k) + 1, v)
        # Rebuild the form with the new keyorder
        # Weird {"field": None} logic because the default value is still evaluated even if the key is found for .get
        self.fields = {k: self.fields.get(k, SettingsForm.Meta.extra_fields.get(k, {"field": None})["field"]) for k in new_keyorder}
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
