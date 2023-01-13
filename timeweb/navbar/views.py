# In the future I should probably switch all my view classes to FormView

# Abstractions
from django.forms import ValidationError
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.translation import gettext as _
from django.urls import reverse_lazy, resolve
from django.shortcuts import redirect
from common.views import TimewebGenericView

# App stuff
from django.conf import settings
import api.views as api
import common.utils as utils
from common.views import CHANGELOGS
from .forms import SettingsForm
from .models import SettingsModel
from contact_form.views import ContactFormView as BaseContactFormView

# Misc
from django.utils.decorators import method_decorator
from ratelimit.decorators import ratelimit
from ratelimit.core import is_ratelimited
from django.contrib import messages
from requests import get as requests_get
from common.views import logger
from django.forms.models import model_to_dict
from copy import deepcopy

TRIGGER_DYNAMIC_MODE_RESET_FIELDS = ('loosely_enforce_minimum_work_times', )
DONT_TRIGGER_DYNAMIC_MODE_RESET_FIELDS = ('id', 'immediately_delete_completely_finished_assignments', 'def_min_work_time',
    'def_break_days', 'def_skew_ratio', 'one_graph_at_a_time', 'close_graph_after_work_input', 'show_priority', 'highest_priority_color',
    'lowest_priority_color', 'assignment_sorting', 'default_dropdown_tags', 'horizontal_tag_position', 'vertical_tag_position', 
    'appearance', 'background_image', 'animation_speed', 'enable_tutorial', 'sorting_animation_threshold', 'timezone', 'oauth_token', 
    'added_gc_assignment_ids', 'seen_latest_changelog', 'nudge_calendar', 'nudge_notifications', 'nudge_canvas', 'user',
    'gc_courses_cache', 'device_uuid', 'device_uuid_api_timestamp', 'display_working_days_left', 'background_image_text_shadow_width',
    'gc_assignments_always_midnight', )
# Make sure to change the logic comparing the old data too if a new field is expensive to equare

assert len(TRIGGER_DYNAMIC_MODE_RESET_FIELDS) + len(DONT_TRIGGER_DYNAMIC_MODE_RESET_FIELDS) == len(SettingsModel._meta.fields), "update this list"

@method_decorator(ratelimit(key=utils.get_client_ip, rate='1/s', method="POST", block=True), name='post')
@method_decorator(ratelimit(key=utils.get_client_ip, rate='20/m', method="POST", block=True), name='post')
@method_decorator(ratelimit(key=utils.get_client_ip, rate='100/h', method="POST", block=True), name='post')
class SettingsView(LoginRequiredMixin, TimewebGenericView):
    template_name = "navbar/settings.html"

    def get(self, request):
        if "form" not in self.context:
            initial = {
                'enable_gc_integration': 'token' in request.user.settingsmodel.oauth_token,
            }
            self.context['form'] = SettingsForm(initial=initial, instance=request.user.settingsmodel)
        self.context['settings_model'] = request.user.settingsmodel
        self.context['default_settings'] = model_to_dict(SettingsForm().save(commit=False),
                            exclude=[*SettingsForm.Meta.exclude, # SettingsForm already excludes these fields but saving the field to a model adds them back
                            "background_image", "id", "assignment_sorting"])

        logger.info(f'User \"{request.user}\" is now viewing the settings page')
        return super().get(request)
        
    def post(self, request):
        self.old_data = deepcopy(request.user.settingsmodel)

        # for parsing default due times in forms.py
        _mutable = request.POST._mutable
        request.POST._mutable = True
        self.form = SettingsForm(data=request.POST, files=request.FILES, instance=request.user.settingsmodel)
        request.POST._mutable = _mutable

        form_is_valid = True
        if not self.form.is_valid():
            form_is_valid = False
        elif self.form.cleaned_data.get("background_image") and self.form.cleaned_data.get("background_image").size > settings.MAX_BACKGROUND_IMAGE_UPLOAD_SIZE:
            self.form.add_error("background_image", ValidationError(_('This file is too big (>%(amount)d megabytes)') % {'amount': settings.MAX_BACKGROUND_IMAGE_UPLOAD_SIZE/1048576}))
            form_is_valid = False
        if form_is_valid:
            return self.valid_form(request)
        else:
            return self.invalid_form(request)
            
    
    def valid_form(self, request):
        if not self.form.cleaned_data.get("enable_gc_integration") and 'token' in request.user.settingsmodel.oauth_token:
            api.gc_auth_disable(request, save=False)
        if any(getattr(self.old_data, field) != getattr(self.form.instance, field) for field in TRIGGER_DYNAMIC_MODE_RESET_FIELDS):
            request.session["refresh_dynamic_mode_all"] = True
        self.form.save()
        logger.info(f'User \"{request.user}\" updated the settings page')

        if self.form.cleaned_data.get("enable_gc_integration") and not 'token' in request.user.settingsmodel.oauth_token:
            return redirect(api.gc_auth_enable(request, next_url="home", current_url="settings"))
        if self.form.cleaned_data.get("view_deleted_assignments"):
            return redirect("deleted_assignments")
        else:
            return redirect("home")
    
    def invalid_form(self, request):
        self.context['form'] = self.form
        logger.info(self.form.errors)
        # It's ok to return a 2xx from invalid form, because there is no danger of the user resubmitting because its invalid
        return self.get(request)

class ContactFormView(BaseContactFormView):
    success_url = reverse_lazy("contact_form")

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
        self.context['add_faq'] = True
        return super().get(request)

class ChangelogView(TimewebGenericView):
    template_name = "navbar/changelog.html"

    def get(self, request):
        self.context['changelogs'] = CHANGELOGS
        return super().get(request)
