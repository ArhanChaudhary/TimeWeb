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

from api.integrations import (
    disable_gc_integration,
    generate_gc_authorization_url,
    disable_canvas_integration,
    generate_canvas_authorization_url,
)
from contact_form.views import ContactFormView

import asyncio
from requests import get as requests_get
from copy import deepcopy

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
    'enable_tutorial', 'sorting_animation_threshold', 'gc_token', 'added_gc_assignment_ids', 'seen_latest_changelog', 
    'nudge_calendar', 'nudge_notifications', 'user', 'gc_courses_cache', 'device_uuid', 'device_uuid_api_timestamp',
    'display_working_days_left', 'background_image_text_shadow_width', 'gc_assignments_always_midnight', 'loosely_enforce_minimum_work_times', 
    'priority_color_borders', 'font', 'should_alert_due_date_incremented', 'example_account', "gc_token",
    'added_canvas_assignment_ids', 'canvas_courses_cache', 'canvas_instance_domain',
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
                'gc_integration': 'token' in self.user.settingsmodel.gc_token,
                'canvas_integration': 'token' in self.user.settingsmodel.canvas_token,
                'canvas_instance_domain': self.user.settingsmodel.canvas_instance_domain.replace(".instructure.com", ""),
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
        self.old_settings = deepcopy(self.user.settingsmodel)
        self.form = SettingsForm(data=request.POST, files=request.FILES, instance=self.user.settingsmodel)
        if request.path == reverse("example_settings"):
            # don't run this after is_valid because is_valid updates self.user.settingsmodel which then is later
            # saved into the db by later .save calls in other views
            if self.form.data.get("view_deleted_assignments"):
                return redirect("example_deleted_assignments")
            else:
                return redirect("example")
        if self.form.is_valid():
            return self.valid_form(request)
        else:
            return self.invalid_form(request)
    
    def valid_form(self, request):
        enabled_gc_integration = self.form.cleaned_data.get("gc_integration") and not 'token' in self.user.settingsmodel.gc_token
        disabled_gc_integration = not self.form.cleaned_data.get("gc_integration") and 'token' in self.user.settingsmodel.gc_token
        enabled_canvas_integration = self.form.cleaned_data.get("canvas_integration") and not 'token' in self.user.settingsmodel.canvas_token
        disabled_canvas_integration = not self.form.cleaned_data.get("canvas_integration") and 'token' in self.user.settingsmodel.canvas_token
        if (
            self.form.cleaned_data.get("canvas_instance_domain") != self.old_settings.canvas_instance_domain
            and self.form.cleaned_data.get("canvas_integration")
            and 'token' in self.user.settingsmodel.canvas_token
        ):
            disabled_canvas_integration = True
            enabled_canvas_integration = True
        async def disable_integrations():
            loop = asyncio.get_event_loop()
            disable_integration_tasks = []
            if disabled_gc_integration:
                disable_integration_tasks.append(loop.run_in_executor(None, lambda: disable_gc_integration(request, save=False)))
            if disabled_canvas_integration:
                disable_integration_tasks.append(loop.run_in_executor(None, lambda: disable_canvas_integration(request, save=False)))
            await asyncio.gather(*disable_integration_tasks)
        asyncio.run(disable_integrations())

        self.form.save()
        logger.info(f'User \"{self.user}\" updated the settings page')

        integration_authorization_urls = []
        if enabled_gc_integration:
            integration_authorization_urls.append(
                lambda next_url: generate_gc_authorization_url(request, next_url=next_url, current_url="settings")
            )
        if enabled_canvas_integration:
            integration_authorization_urls.append(
                lambda next_url: generate_canvas_authorization_url(request, next_url=next_url, current_url="settings")
            )
        prev_url = None
        for current_url in reversed(integration_authorization_urls):
            if prev_url is None:
                prev_url = current_url("home")
            else:
                prev_url = current_url(prev_url)
        if prev_url is not None:
            return redirect(prev_url)

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
