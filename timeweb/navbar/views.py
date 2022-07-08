# In the future I should probably switch all my view classes to FormView

# Abstractions
from django.forms import ValidationError
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.translation import ugettext as _
from django.urls import reverse_lazy # source code uses this instead of reverse for some reason
from django.shortcuts import redirect
from views import TimewebGenericView

# App stuff
from django.conf import settings
import api.views as api
from .forms import SettingsForm
from contact_form.views import ContactFormView as BaseContactFormView

# Signals
from django.utils.decorators import method_decorator
from allauth.decorators import rate_limit

# Misc
from django.contrib import messages
from requests import get as requests_get
from views import logger

class SettingsView(LoginRequiredMixin, TimewebGenericView):
    template_name = "navbar/settings.html"

    def get(self, request):
        initial = {
            'enable_gc_integration': 'token' in request.user.settingsmodel.oauth_token,
            'restore_gc_assignments': False,
        }
        self.context['form'] = SettingsForm(initial=initial, instance=request.user.settingsmodel)

        self.context['settings_model'] = request.user.settingsmodel
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
        elif self.form.cleaned_data.get("background_image") and self.form.cleaned_data.get("background_image").size > settings.MAX_UPLOAD_SIZE:
            self.form.add_error("background_image", ValidationError(_('This file is too big (>%(amount)d bytes)') % {'amount': settings.MAX_UPLOAD_SIZE}))
            form_is_valid = False
        elif request.isExampleAccount:
            self.form.add_error(None, ValidationError(_('You cannot modify the example account')))
            form_is_valid = False
        if form_is_valid:
            return self.valid_form(request)
        else:
            return self.invalid_form(request)
            
    
    def valid_form(self, request):
        if self.form.cleaned_data.get("restore_gc_assignments"):
            if request.user.timewebmodel_set.all().count() > settings.MAX_NUMBER_ASSIGNMENTS:
                self.form.add_error("restore_gc_assignments", ValidationError(_('You have too many assignments (>%(amount)d assignments)') % {'amount': settings.MAX_NUMBER_ASSIGNMENTS}))
                return self.invalid_form(request)
            self.form.instance.added_gc_assignment_ids = []
            request.session.pop("already_created_gc_assignments_from_frontend", None)
        if not self.form.cleaned_data.get("enable_gc_integration") and 'token' in request.user.settingsmodel.oauth_token:
            api.gc_auth_disable(request, save=False)

        self.form.save()
        logger.info(f'User \"{request.user}\" updated the settings page')

        if self.form.cleaned_data.get("enable_gc_integration") and not 'token' in request.user.settingsmodel.oauth_token:
            return redirect(api.gc_auth_enable(request, next_url="home", current_url="settings"))
        return redirect("home")
    
    def invalid_form(self, request):
        self.context['form'] = self.form
        logger.info(self.form.errors)
        # It's ok to return a 2xx from invalid form, because there is no danger of the user resubmitting because its invalid
        return super().get(request)

@method_decorator(rate_limit(action="contact", message="You must wait for one minute before submitting another contact form."), name="post")
class ContactFormView(BaseContactFormView):
    success_url = reverse_lazy("contact_form")

    def post(self, request):
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
