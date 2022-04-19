# Django abstractions
from django.forms import ValidationError
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.translation import ugettext as _
from django.urls import reverse_lazy # source code uses this instead of reverse for some reason
from django.shortcuts import redirect

# App stuff
from django.conf import settings
from .forms import SettingsForm
from contact_form.views import ContactFormView as BaseContactFormView
from timewebapp.models import TimewebModel
from common.views import TimewebGenericView

# Signals
from django.utils.decorators import method_decorator
from allauth.decorators import rate_limit

# Misc
from django.contrib import messages
from requests import get as requests_get
from common.utils import logger

class SettingsView(LoginRequiredMixin, TimewebGenericView):
    template_name = "navbar/settings.html"

    def get(self,request):
        initial = {
            'def_min_work_time': request.user.settingsmodel.def_min_work_time,
            'def_skew_ratio': request.user.settingsmodel.def_skew_ratio,
            'def_break_days': request.user.settingsmodel.def_break_days,
            'def_due_time': request.user.settingsmodel.def_due_time,
            'def_funct_round_minute': request.user.settingsmodel.def_funct_round_minute,
            'ignore_ends': request.user.settingsmodel.ignore_ends,
            'animation_speed': request.user.settingsmodel.animation_speed,
            'show_priority': request.user.settingsmodel.show_priority,
            'one_graph_at_a_time': request.user.settingsmodel.one_graph_at_a_time,
            'close_graph_after_work_input': request.user.settingsmodel.close_graph_after_work_input,
            'highest_priority_color': request.user.settingsmodel.highest_priority_color,
            'lowest_priority_color': request.user.settingsmodel.lowest_priority_color,
            'assignment_sorting': request.user.settingsmodel.assignment_sorting,
            'default_dropdown_tags': request.user.settingsmodel.default_dropdown_tags,
            'background_image': request.user.settingsmodel.background_image,
            'enable_tutorial': request.user.settingsmodel.enable_tutorial,
            'horizontal_tag_position': request.user.settingsmodel.horizontal_tag_position,
            'vertical_tag_position': request.user.settingsmodel.vertical_tag_position,
            'timezone': request.user.settingsmodel.timezone,
            'restore_gc_assignments': False,
            'dark_mode': request.user.settingsmodel.dark_mode,
        }
        self.context['form'] = SettingsForm(initial=initial)

        self.context['settings_model'] = request.user.settingsmodel
        logger.info(f'User \"{request.user}\" is now viewing the settings page')
        return super().get(request)
        
    def post(self, request):
        # for parsing default due times in forms.py
        _mutable = request.POST._mutable
        request.POST._mutable = True
        self.form = SettingsForm(data=request.POST, files=request.FILES)
        request.POST._mutable = _mutable

        self.checked_background_image_clear = request.POST.get("background_image-clear")
        form_is_valid = True
        if not self.form.is_valid():
            form_is_valid = False
        elif self.form.cleaned_data.get("background_image") and self.form.cleaned_data.get("background_image").size > settings.MAX_UPLOAD_SIZE:
            self.form.add_error("background_image", ValidationError(_('This file is too big (>%(amount)d bytes)') % {'amount': settings.MAX_UPLOAD_SIZE}))
            form_is_valid = False
        if form_is_valid:
            return self.valid_form(request)
        else:
            return self.invalid_form(request)
            
    
    def valid_form(self, request):
        if request.isExampleAccount: return redirect("home")
        request.user.settingsmodel.def_min_work_time = self.form.cleaned_data.get("def_min_work_time")
        request.user.settingsmodel.def_skew_ratio = self.form.cleaned_data.get("def_skew_ratio")
        request.user.settingsmodel.def_break_days = self.form.cleaned_data.get("def_break_days")
        request.user.settingsmodel.def_due_time = self.form.cleaned_data.get("def_due_time")
        request.user.settingsmodel.def_funct_round_minute = self.form.cleaned_data.get("def_funct_round_minute")
        # Automatically reflect rounding to multiples of 5 minutes
        if request.user.settingsmodel.def_funct_round_minute:
            for assignment in request.user.timewebmodel_set.all():
                if assignment.unit and assignment.unit.lower() in ('minute', 'minutes') and assignment.funct_round != 5:
                    assignment.funct_round = 5
            TimewebModel.objects.bulk_update(request.user.timewebmodel_set.all(), ['funct_round'])
        request.user.settingsmodel.ignore_ends = self.form.cleaned_data.get("ignore_ends")
        request.user.settingsmodel.animation_speed = self.form.cleaned_data.get("animation_speed")
        request.user.settingsmodel.show_priority = self.form.cleaned_data.get("show_priority")
        request.user.settingsmodel.one_graph_at_a_time = self.form.cleaned_data.get("one_graph_at_a_time")
        request.user.settingsmodel.close_graph_after_work_input = self.form.cleaned_data.get("close_graph_after_work_input")
        request.user.settingsmodel.highest_priority_color = self.form.cleaned_data.get("highest_priority_color")
        request.user.settingsmodel.lowest_priority_color = self.form.cleaned_data.get("lowest_priority_color")
        if self.checked_background_image_clear:
            request.user.settingsmodel.background_image = None
        elif self.form.cleaned_data.get("background_image"):
            request.user.settingsmodel.background_image = self.form.cleaned_data.get("background_image")
        request.user.settingsmodel.enable_tutorial = self.form.cleaned_data.get("enable_tutorial")
        request.user.settingsmodel.horizontal_tag_position = self.form.cleaned_data.get("horizontal_tag_position")
        request.user.settingsmodel.vertical_tag_position = self.form.cleaned_data.get("vertical_tag_position")
        request.user.settingsmodel.timezone = self.form.cleaned_data.get("timezone")
        request.user.settingsmodel.default_dropdown_tags = self.form.cleaned_data.get("default_dropdown_tags")
        if self.form.cleaned_data.get("restore_gc_assignments"):
            if request.user.timewebmodel_set.all().count() > settings.MAX_NUMBER_ASSIGNMENTS:
                self.form.add_error("restore_gc_assignments", ValidationError(_('You have too many assignments (>%(amount)d assignments)') % {'amount': settings.MAX_NUMBER_ASSIGNMENTS}))
                return self.invalid_form(request)
            else:
                request.user.settingsmodel.added_gc_assignment_ids = []
        request.user.settingsmodel.dark_mode = self.form.cleaned_data.get("dark_mode")
        request.user.settingsmodel.save()
        logger.info(f'User \"{request.user}\" updated the settings page')
        return redirect("home")
    
    def invalid_form(self, request):
        self.context['form'] = self.form
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
