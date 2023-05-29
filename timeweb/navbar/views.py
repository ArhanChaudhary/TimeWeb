# In the future I should probably switch all my view classes to FormView

from django.conf import settings
from django.shortcuts import redirect, reverse
from django.urls import reverse_lazy, resolve
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.decorators import method_decorator
from django.forms.models import model_to_dict
from django.contrib import messages
from django.utils.translation import gettext as _
from ratelimit.decorators import ratelimit
from ratelimit.core import is_ratelimited

import common.utils as utils
from common.views import CHANGELOGS, logger, TimewebGenericView
from timewebapp.views import ExampleAccountView
from .forms import SettingsForm
from .models import SettingsModel

import api.integrations as integrations
from contact_form.views import ContactFormView

from requests import get as requests_get

EXCLUDE_FROM_DEFAULT_SETTINGS_FIELDS = (
    # cannot be json serialized
    "background_image",
    # self explanatory
    "id",
    # handled by the frontend, is a hidden input
    "assignment_sorting",
)
# NOTE: this does not take into account SettingsForm.Meta.exlude, so don't worry if
# you see fields like gc_courses_cache here
DONT_EXCLUDE_FROM_DEFAULT_SETTINGS_FIELDS = (
    'immediately_delete_completely_finished_assignments', 'def_min_work_time',
    'def_break_days', 'def_skew_ratio', 'one_graph_at_a_time', 'close_graph_after_work_input', 'show_priority', 'highest_priority_color',
    'lowest_priority_color', 'default_dropdown_tags', 'horizontal_tag_position', 'vertical_tag_position', 'appearance', 'animation_speed',
    'enable_tutorial', 'sorting_animation_threshold', 'oauth_token', 'added_gc_assignment_ids', 'seen_latest_changelog', 
    'nudge_calendar', 'nudge_notifications', 'nudge_canvas', 'user', 'gc_courses_cache', 'device_uuid', 'device_uuid_api_timestamp',
    'display_working_days_left', 'background_image_text_shadow_width', 'gc_assignments_always_midnight', 'loosely_enforce_minimum_work_times', 
    'priority_color_borders', 'font', 'should_alert_due_date_incremented',
    'example_account',
)

assert len(EXCLUDE_FROM_DEFAULT_SETTINGS_FIELDS) + len(DONT_EXCLUDE_FROM_DEFAULT_SETTINGS_FIELDS) == len(SettingsModel._meta.fields), "update this list"
@method_decorator(ratelimit(key=utils.get_client_ip, rate='1/s', method="POST", block=True), name='post')
@method_decorator(ratelimit(key=utils.get_client_ip, rate='20/m', method="POST", block=True), name='post')
@method_decorator(ratelimit(key=utils.get_client_ip, rate='100/h', method="POST", block=True), name='post')
class SettingsView(LoginRequiredMixin, TimewebGenericView):
    template_name = "navbar/settings.html"

    def get(self, request):
        if self.user is None:
            self.user = request.user
        if "form" not in self.context:
            initial = {
                'enable_gc_integration': 'token' in self.user.settingsmodel.oauth_token,
            }
            self.context['form'] = SettingsForm(initial=initial, instance=self.user.settingsmodel)
        self.context['default_settings'] = model_to_dict(SettingsForm().save(commit=False),
                            exclude=[*SettingsForm.Meta.exclude, # SettingsForm already excludes these fields but saving the field to a model adds them back
                            *EXCLUDE_FROM_DEFAULT_SETTINGS_FIELDS])

        logger.info(f'User \"{self.user}\" is now viewing the settings page')
        return TimewebGenericView.get(self, request)
        
    def post(self, request):
        if self.user is None:
            self.user = request.user
        self.form = SettingsForm(data=request.POST, files=request.FILES, instance=self.user.settingsmodel)
        if request.path == reverse("example_settings"):
            # don't run this after is_valid because is_valid saves into the db
            if self.form.data.get("view_deleted_assignments"):
                return redirect("example_deleted_assignments")
            else:
                return redirect("example")
        if self.form.is_valid():
            return self.valid_form(request)
        else:
            return self.invalid_form(request)
    
    def valid_form(self, request):
        if not self.form.cleaned_data.get("enable_gc_integration") and 'token' in self.user.settingsmodel.oauth_token:
            integrations.gc_auth_disable(request, save=False)
        self.form.save()
        logger.info(f'User \"{self.user}\" updated the settings page')

        if self.form.cleaned_data.get("enable_gc_integration") and not 'token' in self.user.settingsmodel.oauth_token:
            return redirect(integrations.gc_auth_enable(request, next_url="home", current_url="settings"))
        if self.form.cleaned_data.get("view_deleted_assignments"):
            return redirect("deleted_assignments")
        else:
            return redirect("home")
    
    def invalid_form(self, request):
        self.context['form'] = self.form
        logger.info(self.form.errors)
        # It's ok to return a 2xx from invalid form, because there is no danger of the user resubmitting because its invalid
        return self.get(request)

# the class order matters so settingsview can override exampleaccountview
class ExampleAccountSettingsView(SettingsView, ExampleAccountView):
    pass

class SecuredFormView(ContactFormView):
    success_url = reverse_lazy("secured_contact_form")

    def post(self, request):
        if is_ratelimited(request, group=resolve(request.path)._func_path, key=utils.get_client_ip, rate='1/m', method="POST", increment=True):
            messages.error(request, "You must wait for one minute before submitting another contact form.")
            return super().get(request)
        recaptcha_token = request.POST.get('g-recaptcha-response')
        auth = requests_get(f"https://www.google.com/recaptcha/api/siteverify?secret={settings.RECAPTCHA_SECRET_KEY}&response={recaptcha_token}")
        if auth.json()['success']:
            # should 3xx: ProcessFormView.post -> ContactFormView.form_valid -> FormMixin.form_valid -> redirect
            return super().post(request)
        else:
            messages.error(request, "Your submission was not authentic. Please try again.")
            return super().get(request)

class BlogView(TimewebGenericView):
    template_name = "navbar/blog.html"

class UserguideView(TimewebGenericView):
    template_name = "navbar/user_guide.html"
    
    def get(self, request):
        self.context['default_settings'] = model_to_dict(SettingsForm().save(commit=False),
                            exclude=[*SettingsForm.Meta.exclude, # SettingsForm already excludes these fields but saving the field to a model adds them back
                            *EXCLUDE_FROM_DEFAULT_SETTINGS_FIELDS])
        self.context['add_faq'] = True
        return super().get(request)

class ChangelogView(TimewebGenericView):
    template_name = "navbar/changelog.html"

    def get(self, request):
        self.context['changelogs'] = CHANGELOGS
        return super().get(request)
