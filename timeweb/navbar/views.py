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
from .forms import SettingsForm
from contact_form.views import ContactFormView as BaseContactFormView

# Misc
from django.utils.decorators import method_decorator
from ratelimit.decorators import ratelimit
from ratelimit.core import is_ratelimited
from django.contrib import messages
from requests import get as requests_get
from common.views import logger
from django.forms.models import model_to_dict

@method_decorator(ratelimit(key=settings.GET_CLIENT_IP, rate='1/s', method="POST", block=True), name='post')
@method_decorator(ratelimit(key=settings.GET_CLIENT_IP, rate='20/m', method="POST", block=True), name='post')
@method_decorator(ratelimit(key=settings.GET_CLIENT_IP, rate='100/h', method="POST", block=True), name='post')
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
        if self.form.cleaned_data.get("view_deleted_assignments"):
            request.session["view_deleted_assignments_in_app_view"] = True

        self.form.save()
        logger.info(f'User \"{request.user}\" updated the settings page')

        if self.form.cleaned_data.get("enable_gc_integration") and not 'token' in request.user.settingsmodel.oauth_token:
            return redirect(api.gc_auth_enable(request, next_url="home", current_url="settings"))
        return redirect("home")
    
    def invalid_form(self, request):
        self.context['form'] = self.form
        logger.info(self.form.errors)
        # It's ok to return a 2xx from invalid form, because there is no danger of the user resubmitting because its invalid
        return self.get(request)

class ContactFormView(BaseContactFormView):
    success_url = reverse_lazy("contact_form")

    def post(self, request):
        if is_ratelimited(request, group=resolve(request.path)._func_path, key=settings.GET_CLIENT_IP, rate='1/m', method="POST", increment=True):
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
        self.context['changelogs'] = settings.CHANGELOGS
        return super().get(request)
