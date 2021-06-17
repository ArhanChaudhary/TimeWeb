# THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED
from django.shortcuts import render, get_object_or_404, redirect
from django.utils.translation import ugettext as _
from django.views import View
from django.utils import timezone
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import HttpResponse, HttpResponseForbidden
from .models import TimewebModel, SettingsModel
from django.contrib.auth import get_user_model
from .forms import TimewebForm, SettingsForm
import logging
from django import forms
from django.forms.models import model_to_dict
import datetime
from decimal import Decimal as d
from math import ceil, floor
import json
from google.cloud import storage
from django.views.decorators.cache import cache_control
from os.path import basename
hour_to_update = 4
example_account_name = "Example"
example_assignment_name = "Reading a Book (EXAMPLE ASSIGNMENT)"
MAX_NUMBER_ASSIGNMENTS = 25
MAX_UPLOAD_SIZE = 5242880

# Automatically creates settings model and example assignment when user is created
from django.db.models.signals import post_save
from django.dispatch import receiver
@receiver(post_save, sender=get_user_model())
def create_settings_model_and_example(sender, instance, created, **kwargs):
    if created:
        date_now = timezone.localtime(timezone.now())
        if date_now.hour < hour_to_update:
            date_now = date_now.date() - datetime.timedelta(1)
        else:
            date_now = date_now.date()
        TimewebModel.objects.create(**{
            "assignment_name": example_assignment_name,
            "ad": date_now.strftime("%Y-%m-%d"),
            "x": (date_now + datetime.timedelta(30)).strftime("%Y-%m-%d"),
            "unit": "Page",
            "y": "400.00",
            "works": ["0"],
            "dif_assign": 0,
            "skew_ratio": "1.0000000000",
            "ctime": "3.00",
            "funct_round": "1.00",
            "min_work_time": "60.00",
            "break_days": [],
            "fixed_mode": False,
            "dynamic_start": 0,
            "mark_as_done": False,
            "user": instance,
        })
        SettingsModel.objects.create(user=instance)
        logger.info(f'Created settings model for user "{instance.username}"')


def custom_permission_denied_view(request, exception=None):
    response = render(request, "403_csrf.html", {})
    response.status_code = 403
    return response

logger = logging.getLogger('django')
logger.propagate = False
def get_default_context():
    return {
        "example_account_name": example_account_name,
        "hour_to_update": hour_to_update,
        "example_assignment_name": example_assignment_name,
    }
class SettingsView(LoginRequiredMixin, View):
    login_url = '/login/login/'
    redirect_field_name = 'redirect_to'

    def __init__(self):
        self.context = get_default_context()
    def get(self,request):
        settings_model = SettingsModel.objects.get(user__username=request.user)
        initial = {
            'warning_acceptance': settings_model.warning_acceptance,
            'def_min_work_time': settings_model.def_min_work_time,
            'def_skew_ratio': settings_model.def_skew_ratio,
            'def_break_days': settings_model.def_break_days,
            'def_unit_to_minute': settings_model.def_unit_to_minute,
            'def_funct_round_minute': settings_model.def_funct_round_minute,
            'ignore_ends': settings_model.ignore_ends,
            'show_progress_bar': settings_model.show_progress_bar,
            'color_priority': settings_model.color_priority,
            'text_priority': settings_model.text_priority,
            'highest_priority_color': settings_model.highest_priority_color,
            'lowest_priority_color': settings_model.lowest_priority_color,
            'background_image': settings_model.background_image,
        }
        self.context['form'] = SettingsForm(initial=initial)
        logger.info(f'User \"{request.user}\" is now viewing the settings page')
        return render(request, "settings.html", self.context)
        
    def post(self, request):
        self.isExampleAccount = request.user.username == example_account_name
        self.form = SettingsForm(data=request.POST, files=request.FILES)
        form_is_valid = True
        if not self.form.is_valid():
            form_is_valid = False
        elif self.form.cleaned_data.get("background_image") and self.form.cleaned_data.get("background_image").size > MAX_UPLOAD_SIZE:
            self.form.add_error("background_image", forms.ValidationError(_('This file is too big (>%(amount)d bytes)') % {'amount': MAX_UPLOAD_SIZE}))
            form_is_valid = False
        if form_is_valid:
            return self.valid_form(request)
        else:
            return self.invalid_form(request)
            
    
    def valid_form(self, request):
        if self.isExampleAccount: return redirect("home")
        settings_model = SettingsModel.objects.get(user__username=request.user)
        settings_model.warning_acceptance = self.form.cleaned_data.get("warning_acceptance")
        settings_model.def_min_work_time = self.form.cleaned_data.get("def_min_work_time")
        settings_model.def_skew_ratio = self.form.cleaned_data.get("def_skew_ratio")+1 # A skew ratio entered as "0" is added to 1 and is then stored as "1". The reasoning is in parabola.js
        settings_model.def_break_days = self.form.cleaned_data.get("def_break_days")
        settings_model.def_unit_to_minute = self.form.cleaned_data.get("def_unit_to_minute")
        settings_model.def_funct_round_minute = self.form.cleaned_data.get("def_funct_round_minute")
        # Automatically reflect rounding to multiples of 5 minutes
        if settings_model.def_funct_round_minute:
            for model in TimewebModel.objects.filter(user__username=request.user):
                if model.unit in ('minute', 'Minute', 'minutes', 'Minutes') and model.funct_round != 5:
                    model.funct_round = 5
                    model.save()
        settings_model.ignore_ends = self.form.cleaned_data.get("ignore_ends")
        settings_model.show_progress_bar = self.form.cleaned_data.get("show_progress_bar")
        settings_model.color_priority = self.form.cleaned_data.get("color_priority")
        settings_model.text_priority = self.form.cleaned_data.get("text_priority")
        settings_model.highest_priority_color = self.form.cleaned_data.get("highest_priority_color")
        settings_model.lowest_priority_color = self.form.cleaned_data.get("lowest_priority_color")
        settings_model.background_image = self.form.cleaned_data.get("background_image") or None
        settings_model.save()
        logger.info(f'User \"{request.user}\" updated the settings page')
        return redirect("home")
    
    def invalid_form(self, request):
        self.context['form'] = self.form
        return render(request, "settings.html", self.context)

class TimewebView(LoginRequiredMixin, View):
    login_url = '/login/login/'
    redirect_field_name = 'redirect_to'

    def __init__(self):
        self.context = get_default_context()

    def add_user_models_to_context(self, request):
        settings_model = SettingsModel.objects.get(user__username=request.user)
        self.context['assignment_models'] = self.assignment_models
        self.context['assignment_models_as_json'] = list(self.assignment_models.values())
        self.context['settings_model_as_json'] = model_to_dict(settings_model)
        del self.context['settings_model_as_json']['background_image'] # background_image isnt json serializable
        self.context['background_image'] = settings_model.background_image
        if settings_model.background_image.name:
            self.context['background_image_name'] = basename(settings_model.background_image.name)
    def get(self,request):
        self.assignment_models = TimewebModel.objects.filter(user__username=request.user)
        self.add_user_models_to_context(request)
        self.context['form'] = TimewebForm(None)

        logger.info(f'User \"{request.user}\" is now viewing the home page')
        try:
            # self.assignment_form_submitted() adds the assignment's name to request.session['added_assignment'] if it was created or request.session['reentered_assignment'] if it was modified
            # I used sessions as a way to preserve a value during a post-get request
            # The session value is passed to index.html, which adds "#animate-in" or "#animate-color" to the assignment whose form was submitted
            # Once the response has been rendered, delete the key value to ensure that "#animate-in" and "#animate-color" is only applied once
            try:
                request.session['added_assignment']
                response = render(request, "index.html", self.context)
                del request.session['added_assignment']
                return response
            except:
                request.session['reentered_assignment']
                response = render(request, "index.html", self.context)
                del request.session['reentered_assignment']
                return response
        except:
            return render(request, "index.html", self.context)

    def post(self,request):
        self.assignment_models = TimewebModel.objects.filter(user__username=request.user)
        self.isExampleAccount = request.user.username == example_account_name
        if 'submit-button' in request.POST:
            return self.assignment_form_submitted(request)
        else:
            if self.isExampleAccount: return HttpResponse(status=204)
            action = request.POST['action']
            if action == 'delete_assignment':
                return self.deleted_assignment(request)
            elif action == 'save_assignment':
                return self.saved_assignment(request)
            elif action == 'change_first_login':
                return self.changed_first_login(request)
            elif action == 'update_date_now':
                return self.updated_date_now_and_example_assignment(request)
    
    def assignment_form_submitted(self, request):
        # The frontend adds the assignment's pk as a "value" attribute to the submit button
        self.pk = request.POST['submit-button']
        if self.pk == '':
            # If no pk was added, then the assignment was created
            self.pk = None
            self.created_assignment = True
        else:
            self.created_assignment = False
        self.form = TimewebForm(data=request.POST, files=request.FILES)

        # Parts of the form that can only validate in views
        form_is_valid = True
        if self.isExampleAccount:
            self.form.add_error("assignment_name", forms.ValidationError(_('You cannot create or modify assignments in the example account') % {'amount': MAX_NUMBER_ASSIGNMENTS}))
            form_is_valid = False
        else:
            # Ensure that the user's assignment name doesn't match with any other assignment
            # If the form was reentered, exclude itself so it doesn't match its name with itself
            # Can't use unique=True because it doesn't exclude itself
            if self.assignment_models.exclude(pk=self.pk).filter(assignment_name=request.POST['assignment_name'].strip()).exists():
                self.form.add_error("assignment_name", forms.ValidationError(_('An assignment with this name already exists')))
                form_is_valid = False
            if self.created_assignment and self.assignment_models.count() > MAX_NUMBER_ASSIGNMENTS:
                self.form.add_error("assignment_name", forms.ValidationError(_('You have too many assignments (>%(amount)d assignments)') % {'amount': MAX_NUMBER_ASSIGNMENTS}))
                form_is_valid = False
        if not self.form.is_valid():
            form_is_valid = False

        if form_is_valid:
            return self.valid_form(request)
        else:
            return self.invalid_form(request)
    def valid_form(self, request):
        if self.created_assignment:
            self.sm = self.form.save(commit=False)
            # Set defaults
            self.sm.skew_ratio = SettingsModel.objects.get(user__username=request.user).def_skew_ratio
            self.sm.fixed_mode = False
            # first_work is works[0]
            # Convert this to a decimal object because it can be a float
            first_work = d(self.sm.works)
            # Fill in foreignkey
            self.sm.user = get_user_model().objects.get(username=request.user)
        else:
            self.sm = get_object_or_404(TimewebModel, pk=self.pk)
            if request.user != self.sm.user:
                logger.warning(f"User \"{request.user}\" cannot modify an assignment that isn't their's")
                return HttpResponseForbidden("The assignment you are trying to modify isn't yours")
            if self.isExampleAccount:
                # post-get
                # Don't make this return a 204 when submitting from the example account because there are too many assignments
                return redirect(request.path_info)
            # old_data is needed for readjustments
            old_data = get_object_or_404(TimewebModel, pk=self.pk)
            # Update model values
            self.sm.assignment_name = self.form.cleaned_data.get("assignment_name")
            self.sm.ad = self.form.cleaned_data.get("ad")
            self.sm.x = self.form.cleaned_data.get("x")
            self.sm.unit = self.form.cleaned_data.get("unit")
            self.sm.y = self.form.cleaned_data.get("y")
            first_work = d(self.form.cleaned_data.get("works"))
            self.sm.ctime = self.form.cleaned_data.get("ctime")
            self.sm.funct_round = self.form.cleaned_data.get("funct_round")
            self.sm.min_work_time = self.form.cleaned_data.get("min_work_time")
            self.sm.break_days = self.form.cleaned_data.get("break_days")
            self.sm.mark_as_done = self.form.cleaned_data.get("mark_as_done")
        # Set date_now to 
        date_now = timezone.localtime(timezone.now())
        if date_now.hour < hour_to_update:
            date_now = date_now.date() - datetime.timedelta(1)
        else:
            date_now = date_now.date()
        if self.created_assignment:
            self.sm.dif_assign = (date_now-self.sm.ad).days
            if self.sm.dif_assign < 0:
                self.sm.dif_assign = 0
            self.sm.dynamic_start = self.sm.dif_assign
        else:
            self.sm.dif_assign = old_data.dif_assign + (old_data.ad-self.sm.ad).days
            if date_now < old_data.ad or self.sm.dif_assign < 0:
                self.sm.dif_assign = 0 
        if not self.sm.funct_round:
            self.sm.funct_round = 1
        if self.sm.min_work_time != None:
            self.sm.min_work_time /= self.sm.ctime
        if not self.created_assignment:
            removed_works_start = (self.sm.ad - old_data.ad).days - old_data.dif_assign # translates x position on graph to 0 so that it can be used in accessing works
            if removed_works_start < 0:
                removed_works_start = 0

        if self.sm.x == None:
            # y - first work = min_work_time_funct_round * x
            # x = (y - first_work) / min_work_time_funct_round
            # Solve for first work:
            # originally: works = [works[n] - works[0] + first_work for n in range(removed_works_start,removed_works_end+1)]
            # so first work is when n = removed_works_start
            # first_work = works[removed_works_start] - works[0] + first_work
            # first_work = old_data.works[removed_works_start] - old_data.works[0] + first_work
            # y - old_data.works[removed_works_start] + old_data.works[0] - first_work
            if self.created_assignment:
                if self.sm.min_work_time:
                    x_num = (self.sm.y - first_work)/ceil(ceil(self.sm.min_work_time/self.sm.funct_round)*self.sm.funct_round)
                else:
                    x_num = (self.sm.y - first_work)/self.sm.funct_round
            else:
                if self.sm.min_work_time:
                    x_num = (self.sm.y - d(old_data.works[removed_works_start]) + d(old_data.works[0]) - first_work)/ceil(ceil(self.sm.min_work_time/self.sm.funct_round)*self.sm.funct_round)
                else:
                    x_num = (self.sm.y - d(old_data.works[removed_works_start]) + d(old_data.works[0]) - first_work)/self.sm.funct_round
            x_num = ceil(x_num)
            if self.sm.dif_assign >= x_num:
                self.sm.dif_assign = 0
                if self.created_assignment:
                    self.sm.dynamic_start = self.sm.dif_assign
            if not x_num or len(self.sm.break_days) == 7:
                x_num = 1
            elif self.sm.break_days:
                guess_x = 7*floor(x_num/(7-len(self.sm.break_days)) - 1) - 1
                assign_day_of_week = self.sm.ad.weekday()
                red_line_start_x = self.sm.dif_assign

                # set_mod_days()
                xday = assign_day_of_week + red_line_start_x
                mods = [0]
                mod_counter = 0
                for mod_day in range(6):
                    if (xday + mod_day) % 7 in self.sm.break_days:
                        mod_counter += 1
                    mods.append(mod_counter)
                mods = tuple(mods)

                while 1:
                    guess_x += 1
                    if guess_x - guess_x // 7 * len(self.sm.break_days) - mods[guess_x % 7] == x_num:
                        x_num = max(1, guess_x)
                        break
            # Make sure assignments arent finished by x_num
            # x_num = date_now+timedelta(x_num) - min(date_now, self.sm.ad)
            if self.sm.ad < date_now:
                # x_num = (date_now + timedelta(x_num) - self.sm.ad).days
                # x_num = (date_now - self.sm.ad).days + x_num
                # x_num += (date_now - self.sm.ad).days
                x_num += (date_now - self.sm.ad).days
            try:
                self.sm.x = self.sm.ad + datetime.timedelta(x_num)
            except OverflowError:
                self.sm.x = datetime.datetime.max.date()
        else:
            x_num = (self.sm.x - self.sm.ad).days
            if self.sm.dif_assign >= x_num:
                self.sm.dif_assign = 0
                if self.created_assignment:
                    self.sm.dynamic_start = self.sm.dif_assign
        if self.sm.min_work_time != None:
            self.sm.min_work_time *= self.sm.ctime
        if self.created_assignment:
            self.sm.works = [str(self.sm.works)] # Same as str(first_work)
        else:
            # If the reentered assign date cuts off some of the work inputs, adjust the work inputs accordingly
            removed_works_end = len(old_data.works) - 1
            end_of_works = (self.sm.x - old_data.ad).days

            # If the reentered due date cuts off some of the work inputs, remove the work input for the last day because that must complete assignment
            if removed_works_end >= end_of_works:
                removed_works_end = end_of_works
                if d(old_data.works[removed_works_end]) != self.sm.y:
                    removed_works_end -= 1
            if removed_works_start <= removed_works_end and self.form.cleaned_data.get("works") != old_data.works[0]: # self.form.cleaned_data.get("works") is str(first_work)
                self.sm.works = [str(d(old_data.works[n]) - d(old_data.works[0]) + first_work) for n in range(removed_works_start,removed_works_end+1)]

            self.sm.dynamic_start += self.sm.dif_assign - old_data.dif_assign
            if self.sm.dynamic_start < 0:
                self.sm.dynamic_start = 0
            elif self.sm.dynamic_start > x_num - 1:
                self.sm.dynamic_start = x_num - 1
        self.sm.save()
        if self.created_assignment:
            request.session['added_assignment'] = self.sm.assignment_name
            logger.info(f'User \"{request.user}\" added assignment "{self.sm.assignment_name}"')
        else:
            request.session['reentered_assignment'] = self.sm.assignment_name    
            logger.info(f'User \"{request.user}\" updated assignment "{self.sm.assignment_name}"')
        # post-get
        # Don't make this return a 204 when submitting from the example account because there are too many assignments
        return redirect(request.path_info)

    def invalid_form(self, request):
        logger.info(f"User \"{request.user}\" submitted an invalid form")
        if self.created_assignment:
            self.context['submit'] = 'Create Assignment'
        else:
            self.context['invalid_form_pk'] = self.pk
            self.context['submit'] = 'Modify Assignment'
        self.context['form'] = self.form
        self.add_user_models_to_context(request)
        return render(request, "index.html", self.context)
    
    def deleted_assignment(self, request):
        assignments = json.loads(request.POST['assignments'])
        for pk in assignments:
            self.sm = get_object_or_404(TimewebModel, pk=int(pk))
            if request.user != self.sm.user:
                logger.warning(f"User \"{request.user}\" cannot delete an assignment that isn't their's")
                return HttpResponseForbidden("The assignment you are trying to delete isn't yours")
            self.sm.delete()
            logger.info(f'User \"{request.user}\" deleted assignment "{self.sm.assignment_name}"')
        return HttpResponse(status=204)
        
    def saved_assignment(self, request):
        assignments = json.loads(request.POST['assignments'])
        for assignment in assignments:
            self.sm = get_object_or_404(TimewebModel, pk=assignment['pk'])
            del assignment['pk'] # Don't loop through the assignment's pk value
            for key, value in assignment.items():
                if key == "skew_ratio":
                    log_message = f'User \"{request.user}\" saved skew ratio for assignment "{self.sm.assignment_name}"'             
                elif key == 'fixed_mode':
                    log_message = f'User \"{request.user}\" saved fixed mode for assignment "{self.sm.assignment_name}"'
                elif key == 'works' or key == 'dynamic_start':
                    log_message = f'User \"{request.user}\" modified works for assignment "{self.sm.assignment_name}"'
                elif key == 'mark_as_done':
                    log_message = f'User \"{request.user}\" marked or unmarked assignment "{self.sm.assignment_name}" as completed'
                if request.user != self.sm.user:
                    logger.warning(f"User \"{request.user}\" cannot save an assignment that isn't theirs")
                    return HttpResponseForbidden("This assignment isn't yours")
                setattr(self.sm, key, value)
                logger.info(log_message)
            try:
                self.sm.save()
            except NameError:
                pass
        return HttpResponse(status=204)
        
    def changed_first_login(self, request):
        settings_model = SettingsModel.objects.get(user__username=request.user)
        settings_model.first_login = request.POST['first_login'] == "true"
        settings_model.save()
        logger.info(f"User \"{request.user}\" changed their first login")
        return HttpResponse(status=204)

    def updated_date_now_and_example_assignment(self, request):
        settings_model = SettingsModel.objects.get(user__username=request.user)
        date_now = request.POST["date_now"]
        date_now = datetime.datetime.strptime(date_now, "%Y-%m-%d").date()
        settings_model.date_now = date_now
        settings_model.save()
        # Unmark every assignment as completed
        for assignment in TimewebModel.objects.filter(user__username=request.user):
            if assignment.mark_as_done:
                assignment.mark_as_done = False
                assignment.save()
        days_since_example_ad = int(request.POST["days_since_example_ad"], 10)
        if days_since_example_ad > 0:
            example_assignment = get_object_or_404(TimewebModel, assignment_name=example_assignment_name, user__username=request.user)
            example_assignment.ad += datetime.timedelta(days_since_example_ad)
            example_assignment.x += datetime.timedelta(days_since_example_ad)
            example_assignment.save()
        logger.info(f"User \"{request.user}\" changed their date")
        return HttpResponse(status=204)
class ImagesView(LoginRequiredMixin, View):
    login_url = '/login/login/'
    redirect_field_name = 'redirect_to'

    def __init__(self):
        self.context = get_default_context()

    # GS_CACHE_CONTROL in settings.py is supposed to set a cache but it doesnt for some reason
    @cache_control(public=True, max_age=604800)
    def get(self, request, imageUser, imageName):
        if request.user.username != imageUser:
            return HttpResponseForbidden("You do not have access to this image")
        client = storage.Client()
        bucket = client.bucket("timeweb-308201.appspot.com")
        blob = bucket.get_blob(f"images/{imageUser}/{imageName}")
        if blob:
            return HttpResponse(blob.download_as_bytes(), content_type=blob.content_type)
        else:
            return HttpResponse(status=204)
class ContactView(View):
    def __init__(self):
        self.context = get_default_context()
    def get(self, request):
        return render(request, "contact.html", self.context)

class ChangelogView(View):
    def __init__(self):
        self.context = get_default_context()
    def get(self, request):
        return render(request, "changelog.html", self.context)

class rickView(View):
    def __init__(self):
        self.context = get_default_context()
    def get(self, request, _):
        return HttpResponse(f"<script nonce=\"{request.csp_nonce}\">a=\"https:/\";window.location.href=a+\"/www.youtube.com/watch?v=dQw4w9WgXcQ\"</script>")

class stackpileView(View):
    def __init__(self):
        self.context = get_default_context()
    def get(self, request):
        return redirect("https://stackpile.me")