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
from django.utils.text import Truncator
from django import forms
from django.forms.models import model_to_dict
from decimal import Decimal as d
from math import ceil, floor
from django.views.decorators.cache import cache_control
import datetime
import logging
import json
import os

from google.cloud import storage
for model in SettingsModel.objects.all():
    if model.oauth_token == []:
        model.oauth_token = {}
        model.save()
        print(model)
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.errors import HttpError
from oauthlib.oauth2.rfc6749.errors import InvalidGrantError, MissingCodeError
from django.conf import settings
User = get_user_model()

# cite later
# https://stackoverflow.com/questions/48242761/how-do-i-use-oauth2-and-refresh-tokens-with-the-google-api
GC_SCOPES = ['https://www.googleapis.com/auth/classroom.student-submissions.me.readonly', 'https://www.googleapis.com/auth/classroom.courses.readonly']
GC_CREDENTIALS_PATH = os.path.join(os.getcwd(), "gc-api-credentials.json")
if settings.DEBUG:
    GC_REDIRECT_URI = "http://localhost:8000/gc-api-auth-callback"
    #we don't have ssl on local host
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
else:
    GC_REDIRECT_URI = "https://www.timeweb.io/gc-api-auth-callback"

hour_to_update = 4
example_account_name = "Example"
example_assignment_name = "Reading a Book (EXAMPLE ASSIGNMENT)"
MAX_NUMBER_ASSIGNMENTS = 25
MAX_NUMBER_TAGS = 5
MAX_UPLOAD_SIZE = 5242880
# Automatically creates settings model and example assignment when user is created
from django.db.models.signals import post_save
from django.dispatch import receiver
@receiver(post_save, sender=User)
def create_settings_model_and_example(sender, instance, created, **kwargs):
    if created:
        date_now = timezone.localtime(timezone.now())
        date_now = date_now.replace(hour=0, minute=0, second=0, microsecond=0)
        TimewebModel.objects.create(**{
            "name": example_assignment_name,
            "assignment_date": date_now,
            "x": date_now + datetime.timedelta(30),
            "unit": "Page",
            "y": "400.00",
            "works": ["0"],
            "blue_line_start": 0,
            "skew_ratio": "1.0000000000",
            "ctime": "3.00",
            "funct_round": "1.00",
            "min_work_time": "60.00",
            "break_days": [],
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
        "max_number_tags": MAX_NUMBER_TAGS,
        "DEBUG": settings.DEBUG,
    }
class SettingsView(LoginRequiredMixin, View):
    login_url = '/login/login/'
    redirect_field_name = 'redirect_to'

    def __init__(self):
        self.context = get_default_context()
    def get(self,request):
        self.settings_model = SettingsModel.objects.get(user__username=request.user)
        initial = {
            'warning_acceptance': self.settings_model.warning_acceptance,
            'def_min_work_time': self.settings_model.def_min_work_time,
            'def_skew_ratio': self.settings_model.def_skew_ratio,
            'def_break_days': self.settings_model.def_break_days,
            'def_unit_to_minute': self.settings_model.def_unit_to_minute,
            'def_funct_round_minute': self.settings_model.def_funct_round_minute,
            'ignore_ends': self.settings_model.ignore_ends,
            'show_progress_bar': self.settings_model.show_progress_bar,
            'color_priority': self.settings_model.color_priority,
            'text_priority': self.settings_model.text_priority,
            'highest_priority_color': self.settings_model.highest_priority_color,
            'lowest_priority_color': self.settings_model.lowest_priority_color,
            'background_image': self.settings_model.background_image,
        }
        self.context['form'] = SettingsForm(initial=initial)
        logger.info(f'User \"{request.user}\" is now viewing the settings page')
        return render(request, "settings.html", self.context)
        
    def post(self, request):
        self.settings_model = SettingsModel.objects.get(user__username=request.user)
        self.isExampleAccount = request.user.username == example_account_name
        self.form = SettingsForm(data=request.POST, files=request.FILES)
        self.checked_background_image_clear = request.POST.get("background_image-clear") or False
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
        self.settings_model.warning_acceptance = self.form.cleaned_data.get("warning_acceptance")
        self.settings_model.def_min_work_time = self.form.cleaned_data.get("def_min_work_time")
        self.settings_model.def_skew_ratio = self.form.cleaned_data.get("def_skew_ratio")+1 # A skew ratio entered as 0 is stored as 1
        self.settings_model.def_break_days = self.form.cleaned_data.get("def_break_days")
        self.settings_model.def_unit_to_minute = self.form.cleaned_data.get("def_unit_to_minute")
        self.settings_model.def_funct_round_minute = self.form.cleaned_data.get("def_funct_round_minute")
        # Automatically reflect rounding to multiples of 5 minutes
        if self.settings_model.def_funct_round_minute:
            for model in TimewebModel.objects.filter(user__username=request.user):
                if model.unit in ('minute', 'Minute', 'minutes', 'Minutes') and model.funct_round != 5:
                    model.funct_round = 5
                    model.save()
        self.settings_model.ignore_ends = self.form.cleaned_data.get("ignore_ends")
        self.settings_model.show_progress_bar = self.form.cleaned_data.get("show_progress_bar")
        self.settings_model.color_priority = self.form.cleaned_data.get("color_priority")
        self.settings_model.text_priority = self.form.cleaned_data.get("text_priority")
        self.settings_model.highest_priority_color = self.form.cleaned_data.get("highest_priority_color")
        self.settings_model.lowest_priority_color = self.form.cleaned_data.get("lowest_priority_color")
        if self.checked_background_image_clear:
            self.settings_model.background_image = None
        elif self.form.cleaned_data.get("background_image"):
            self.settings_model.background_image = self.form.cleaned_data.get("background_image")
        self.settings_model.save()
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
        self.context['assignment_models'] = self.assignment_models
        self.context['assignment_models_as_json'] = list(self.assignment_models.values())
        self.context['settings_model_as_json'] = model_to_dict(self.settings_model)
        del self.context['settings_model_as_json']['background_image'] # background_image isnt json serializable
        self.context['background_image'] = self.settings_model.background_image
        if self.settings_model.background_image.name:
            self.context['background_image_name'] = os.path.basename(self.settings_model.background_image.name)
    def get(self,request):
        self.settings_model = SettingsModel.objects.get(user__username=request.user)
        if self.settings_model.oauth_token:
            redirect_url_if_creds_invalid = self.create_gc_assignments(request)
            if redirect_url_if_creds_invalid:
                return redirect(redirect_url_if_creds_invalid)
        self.assignment_models = TimewebModel.objects.filter(user__username=request.user)
        if timezone.localtime(User.objects.get(username=request.user).last_login).day != timezone.localtime(timezone.now()).day:
            for assignment in self.assignment_models:
                if assignment.mark_as_done:
                    assignment.mark_as_done = False
                    assignment.save()
        self.add_user_models_to_context(request)
        self.context['form'] = TimewebForm(None)

        logger.info(f'User \"{request.user}\" is now viewing the home page')
        try:
            # self.assignment_form_submitted() adds the assignment's name to request.session['added_assignment'] if it was created or request.session['edited_assignment'] if it was edited
            # I used sessions as a way to preserve a value during a post-get request
            # The session value is passed to index.html, which adds "#animate-in" or "#animate-color" to the assignment whose form was submitted
            # Once the response has been rendered, delete the key value to ensure that "#animate-in" and "#animate-color" is only applied once
            try:
                request.session['added_assignment']
                response = render(request, "index.html", self.context)
                del request.session['added_assignment']
                return response
            except:
                request.session['edited_assignment']
                response = render(request, "index.html", self.context)
                del request.session['edited_assignment']
                return response
        except:
            return render(request, "index.html", self.context)

    def post(self,request):
        self.assignment_models = TimewebModel.objects.filter(user__username=request.user)
        self.settings_model = SettingsModel.objects.get(user__username=request.user)
        self.isExampleAccount = request.user.username == example_account_name
        if 'submit-button' in request.POST: return self.assignment_form_submitted(request)
        # AJAX requests
        if self.isExampleAccount: return HttpResponse(status=204)
        action = request.POST['action']
        if action == 'delete_assignment':
            return self.deleted_assignment(request)
        elif action == 'save_assignment':
            return self.saved_assignment(request)
        elif action == 'finished_tutorial':
            return self.finished_tutorial(request)
        elif action == "tag_add" or action == "tag_delete":
            return self.tag_add_or_delete(request, action)
        return HttpResponse(status=204)
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
        if self.isExampleAccount:# and 0:
            self.form.add_error("name", forms.ValidationError(_('You cannot create or edit assignments in the example account') % {'amount': MAX_NUMBER_ASSIGNMENTS}))
            form_is_valid = False
        else:
            # Ensure that the user's assignment name doesn't match with any other assignment
            # Can't use unique=True because it doesn't exclude itself if its name doesnt change when edited
            if self.assignment_models.exclude(pk=self.pk).filter(name=request.POST['name'].strip()).exists():
                self.form.add_error("name", forms.ValidationError(_('An assignment with this name already exists')))
                form_is_valid = False
            if self.created_assignment and self.assignment_models.count() > MAX_NUMBER_ASSIGNMENTS:
                self.form.add_error("name", forms.ValidationError(_('You have too many assignments (>%(amount)d assignments)') % {'amount': MAX_NUMBER_ASSIGNMENTS}))
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
            self.sm.skew_ratio = self.settings_model.def_skew_ratio
            # first_work is works[0]
            # Convert this to a decimal object because it can be a float
            first_work = d(self.sm.works)
            # Fill in foreignkey
            self.sm.user = User.objects.get(username=request.user)
        else:
            self.sm = get_object_or_404(TimewebModel, pk=self.pk)
            if request.user != self.sm.user:
                logger.warning(f"User \"{request.user}\" cannot edit an assignment that isn't their's")
                return HttpResponseForbidden("The assignment you are trying to edit isn't yours")
            if self.isExampleAccount:# and 0:
                # post-get
                # Don't make this return a 204 when submitting from the example account because there are too many assignments
                return redirect(request.path_info)
            # old_data is needed for readjustments
            old_data = get_object_or_404(TimewebModel, pk=self.pk)
            # Update model values
            self.sm.name = self.form.cleaned_data.get("name")
            self.sm.assignment_date = self.form.cleaned_data.get("assignment_date")
            self.sm.assignment_date = self.sm.assignment_date.replace(hour=0, minute=0, second=0, microsecond=0)
            # self.sm.assignment_date = timezone.make_aware(self.sm.assignment_date) dont include because it's already aware
            self.sm.x = self.form.cleaned_data.get("x")
            if self.sm.x:
                self.sm.x = self.sm.x.replace(hour=0, minute=0, second=0, microsecond=0)
            # self.sm.x = timezone.make_aware(self.sm.x) dont include because it's already aware
            self.sm.unit = self.form.cleaned_data.get("unit")
            self.sm.y = self.form.cleaned_data.get("y")
            first_work = d(self.form.cleaned_data.get("works"))
            self.sm.ctime = self.form.cleaned_data.get("ctime")
            self.sm.funct_round = self.form.cleaned_data.get("funct_round")
            self.sm.min_work_time = self.form.cleaned_data.get("min_work_time")
            self.sm.break_days = self.form.cleaned_data.get("break_days")
            self.sm.mark_as_done = self.form.cleaned_data.get("mark_as_done")
        date_now = timezone.localtime(timezone.now())
        if date_now.hour < hour_to_update:
            date_now -= datetime.timedelta(1)
        date_now = date_now.replace(hour=0, minute=0, second=0, microsecond=0)
        if self.created_assignment or self.sm.needs_more_info:
            self.sm.blue_line_start = (date_now-self.sm.assignment_date).days
            if self.sm.blue_line_start < 0:
                self.sm.blue_line_start = 0
            self.sm.dynamic_start = self.sm.blue_line_start
        else:
            self.sm.blue_line_start = old_data.blue_line_start + (old_data.assignment_date-self.sm.assignment_date).days
            if date_now < old_data.assignment_date or self.sm.blue_line_start < 0:
                self.sm.blue_line_start = 0
            removed_works_start = (self.sm.assignment_date - old_data.assignment_date).days - old_data.blue_line_start # translates x position 0 so that it can be used to accessing works
            if removed_works_start < 0:
                removed_works_start = 0
        if not self.sm.funct_round:
            self.sm.funct_round = 1
        if self.sm.min_work_time != None:
            self.sm.min_work_time /= self.sm.ctime            

        if self.sm.x == None:
            # y - first work = min_work_time_funct_round * x
            # x = (y - first_work) / min_work_time_funct_round
            # Solve for first work:
            # originally: works = [works[n] - works[0] + first_work for n in range(removed_works_start,removed_works_end+1)]
            # so first work is when n = removed_works_start
            # first_work = works[removed_works_start] - works[0] + first_work
            # first_work = old_data.works[removed_works_start] - old_data.works[0] + first_work
            # y - old_data.works[removed_works_start] + old_data.works[0] - first_work
            if self.created_assignment or self.sm.needs_more_info:
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
            if self.sm.blue_line_start >= x_num:
                self.sm.blue_line_start = 0
                # dynamic_start is capped later on if not created_assignment (i think that's why i did this)
                # might rewrite
                if self.created_assignment or self.sm.needs_more_info:
                    self.sm.dynamic_start = 0
            if not x_num or len(self.sm.break_days) == 7:
                x_num = 1
            elif self.sm.break_days:
                guess_x = 7*floor(x_num/(7-len(self.sm.break_days)) - 1) - 1
                assign_day_of_week = self.sm.assignment_date.weekday()
                red_line_start_x = self.sm.blue_line_start

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
            # x_num = date_now+timedelta(x_num) - min(date_now, self.sm.assignment_date)
            if self.sm.assignment_date < date_now:
                # x_num = (date_now + timedelta(x_num) - self.sm.assignment_date).days
                # x_num = (date_now - self.sm.assignment_date).days + x_num
                # x_num += (date_now - self.sm.assignment_date).days
                x_num += (date_now - self.sm.assignment_date).days
            try:
                self.sm.x = self.sm.assignment_date + datetime.timedelta(x_num)
            except OverflowError:
                self.sm.x = datetime.datetime.max - datetime.timedelta(10) # Prevent some overflow errors
                self.sm.x = self.sm.x.replace(hour=0, minute=0, second=0, microsecond=0)
                self.sm.x = timezone.make_aware(self.sm.x)
        else:
            x_num = (self.sm.x - self.sm.assignment_date).days
            if self.sm.blue_line_start >= x_num:
                self.sm.blue_line_start = 0
                if self.created_assignment or self.sm.needs_more_info:
                    self.sm.dynamic_start = 0
        if self.sm.min_work_time != None:
            self.sm.min_work_time *= self.sm.ctime
        if self.sm.needs_more_info:
            self.sm.works = [str(first_work)]  
        elif self.created_assignment:
            self.sm.works = [str(self.sm.works)] # Same as str(first_work)
        else:
            # If the edited assign date cuts off some of the work inputs, adjust the work inputs accordingly
            removed_works_end = len(old_data.works) - 1
            end_of_works = (self.sm.x - old_data.assignment_date).days

            # If the edited due date cuts off some of the work inputs, remove the work input for the last day because that must complete assignment
            if removed_works_end >= end_of_works:
                removed_works_end = end_of_works
                if d(old_data.works[removed_works_end]) != self.sm.y:
                    removed_works_end -= 1
            if removed_works_start <= removed_works_end and self.form.cleaned_data.get("works") != old_data.works[0]: # self.form.cleaned_data.get("works") is str(first_work)
                self.sm.works = [str(d(old_data.works[n]) - d(old_data.works[0]) + first_work) for n in range(removed_works_start,removed_works_end+1)]

            self.sm.dynamic_start += self.sm.blue_line_start - old_data.blue_line_start
            if self.sm.dynamic_start < 0:
                self.sm.dynamic_start = 0
            elif self.sm.dynamic_start > x_num - 1:
                self.sm.dynamic_start = x_num - 1
        self.sm.needs_more_info = False
        self.sm.save()
        if self.created_assignment:
            request.session['added_assignment'] = self.sm.name
            logger.info(f'User \"{request.user}\" added assignment "{self.sm.name}"')
        else:
            request.session['edited_assignment'] = self.sm.name    
            logger.info(f'User \"{request.user}\" updated assignment "{self.sm.name}"')
        # post-get
        # Don't make this return a 204 when submitting from the example account because there are too many assignments
        return redirect(request.path_info)

    def invalid_form(self, request):
        logger.info(f"User \"{request.user}\" submitted an invalid form")
        if self.created_assignment:
            self.context['submit'] = 'Create Assignment'
        else:
            self.context['invalid_form_pk'] = self.pk
            self.context['submit'] = 'Edit Assignment'
        self.context['form'] = self.form
        self.add_user_models_to_context(request)
        return render(request, "index.html", self.context)
 
    def create_gc_assignments(self, request):
        # The file token.json stores the user's access and refresh tokens, and is
        # created automatically when the authorization flow completes for the first
        # time.
        SCOPES = ['https://www.googleapis.com/auth/classroom.student-submissions.me.readonly', 'https://www.googleapis.com/auth/classroom.courses.readonly']
        print(f"token (for debugging): {self.settings_model.oauth_token}")
        credentials = Credentials.from_authorized_user_info(self.settings_model.oauth_token, SCOPES)
        # If there are no valid credentials available, let the user log in.
        if not credentials.valid:
            if credentials.expired and credentials.refresh_token:
                credentials.refresh(Request())
                self.settings_model.oauth_token.update(json.loads(credentials.to_json()))
                self.settings_model.save()
            else:
                flow = Flow.from_client_secrets_file(
                    GC_CREDENTIALS_PATH, scopes=GC_SCOPES)
                flow.redirect_uri = GC_REDIRECT_URI
                # Generate URL for request to Google's OAuth 2.0 server.
                # Use kwargs to set optional request parameters.
                authorization_url, state = flow.authorization_url(
                    # Enable offline access so that you can refresh an access token without
                    # re-prompting the user for permission. Recommended for web server apps.
                    access_type='offline',
                    # Enable incremental authorization. Recommended as a best practice.
                    include_granted_scopes='true')
                return authorization_url

        date_now = timezone.localtime(timezone.now())
        if date_now.hour < hour_to_update:
            date_now -= datetime.timedelta(1)
        date_now = date_now.replace(hour=0, minute=0, second=0, microsecond=0)

        service = build('classroom', 'v1', credentials=credentials)
        courses = service.courses().list().execute().get('courses', [])
        coursework = service.courses().courseWork()

        # Make "in" faster
        set_added_gc_assignment_ids = set(self.settings_model.added_gc_assignment_ids)
        # Rebuild added_gc_assignment_ids because assignments may have been added or deleted
        new_gc_assignment_ids = set()
        gc_models_to_create = []
        for course in courses:
            try:
                course_coursework = coursework.list(courseId=course['id']).execute()['courseWork']
                for assignment in course_coursework:
                    # Load and interpret json data
                    assignment_id = int(assignment['id'], 10)
                    if assignment['workType'] == "ASSIGNMENT":
                        name = "Google Classroom Assignment: "
                    elif assignment['workType'] == "SHORT_ANSWER_QUESTION":
                        name = "Google Classroom Short Answer: "
                    elif assignment['workType'] == "MULTIPLE_CHOICE_QUESTION":
                        name = "Google Classroom Multiple Choice Question: "
                    name += assignment['title']
                    name = Truncator(name).chars(TimewebModel.name.field.max_length)
                    assignment_date = assignment.get('scheduledTime', assignment['creationTime'])
                    assignment_date = timezone.localtime(datetime.datetime.strptime(assignment_date,'%Y-%m-%dT%H:%M:%S.%fZ').replace(tzinfo=datetime.timezone.utc))
                    assignment_date = assignment_date.replace(hour=0, minute=0, second=0, microsecond=0)
                    x = assignment.get('dueDate', None)
                    if x:
                        assignment['dueTime']['hour'] = assignment['dueTime'].pop('hours')
                        if "minutes" in assignment['dueTime']:
                            assignment['dueTime']['minute'] = assignment['dueTime'].pop('minutes')
                        x = datetime.datetime(**x, **assignment['dueTime']).replace(tzinfo=datetime.timezone.utc)
                        x = timezone.localtime(x)
                        if x.hour == 11 and x.minute == 59:
                            x += datetime.timedelta(minutes=1)
                        else:
                            x = x.replace(hour=0, minute=0, second=0, microsecond=0)
                        
                        # Validation
                        if assignment_date == x:
                            x += datetime.timedelta(1)
                        elif assignment_date > x:
                            x = assignment_date + datetime.timedelta(1)
                        if x < date_now:
                            continue
                    tags = [course['name']]

                    # Have this below everything else to not include assignments with due dates before today in new_gc_assignment_ids (x < date_now)
                    new_gc_assignment_ids.add(assignment_id)
                    if assignment_id in set_added_gc_assignment_ids:
                        continue

                    # Create assignment
                    blue_line_start = (date_now-assignment_date).days
                    if blue_line_start < 0:
                        blue_line_start = 0
                    dynamic_start = blue_line_start
                    user = User.objects.get(username=request.user)
                    gc_models_to_create.append(TimewebModel(**{
                        "name": name,
                        "assignment_date": assignment_date,
                        "x": x,
                        "blue_line_start": blue_line_start,
                        "skew_ratio": self.settings_model.def_skew_ratio,
                        "min_work_time": self.settings_model.def_min_work_time,
                        "break_days": self.settings_model.def_break_days,
                        "dynamic_start": dynamic_start,
                        "tags": tags,
                        "needs_more_info": True,
                        "user": user,

                        # y, ctime, works[0], and unit are missing
                        # y and ctime need to be passed anyways because they have non-null constraints
                        "y": 1,
                        "ctime": 1,
                    }))
            except HttpError: # Permission denied
                pass
        TimewebModel.objects.bulk_create(gc_models_to_create)
        if new_gc_assignment_ids != set_added_gc_assignment_ids:
            self.settings_model.added_gc_assignment_ids = list(new_gc_assignment_ids)
            self.settings_model.save()
  
    def deleted_assignment(self, request):
        assignments = json.loads(request.POST['assignments'])
        for pk in assignments:
            self.sm = get_object_or_404(TimewebModel, pk=int(pk))
            if request.user != self.sm.user:
                logger.warning(f"User \"{request.user}\" cannot delete an assignment that isn't their's")
                return HttpResponseForbidden("The assignment you are trying to delete isn't yours")
            self.sm.delete()
            logger.info(f'User \"{request.user}\" deleted assignment "{self.sm.name}"')
        return HttpResponse(status=204)
        
    def saved_assignment(self, request):
        assignments = json.loads(request.POST['assignments'])
        for assignment in assignments:
            self.sm = get_object_or_404(TimewebModel, pk=assignment['pk'])
            del assignment['pk'] # Don't loop through the assignment's pk value
            for key, value in assignment.items():
                if key == "skew_ratio":
                    log_message = f'User \"{request.user}\" saved skew ratio for assignment "{self.sm.name}"'             
                elif key == 'fixed_mode':
                    log_message = f'User \"{request.user}\" saved fixed mode for assignment "{self.sm.name}"'
                elif key == 'works' or key == 'dynamic_start':
                    log_message = f'User \"{request.user}\" modified works for assignment "{self.sm.name}"'
                elif key == 'mark_as_done':
                    log_message = f'User \"{request.user}\" marked or unmarked assignment "{self.sm.name}" as completed'
                elif key == 'tags':
                    log_message = f'User \"{request.user}\" reordered tags for assignment "{self.sm.name}"'
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
        
    def finished_tutorial(self, request):
        self.settings_model.enable_tutorial = False
        self.settings_model.save()
        logger.info(f"User \"{request.user}\" finished their tutorial")
        return HttpResponse(status=204)
    
    def tag_add_or_delete(self, request, action):
        self.pk = request.POST['pk']
        self.sm = get_object_or_404(TimewebModel, pk=self.pk)
        if request.user != self.sm.user:
            logger.warning(f"User \"{request.user}\" cannot save add a tag to an assignment that isn't theirs")
            return HttpResponseForbidden("This assignment isn't yours")

        tag_names = request.POST.getlist('tag_names[]')
        if action == "tag_add":
            tag_names = [tag_name for tag_name in tag_names if tag_name not in self.sm.tags]
            if len(self.sm.tags) + len(tag_names) > MAX_NUMBER_TAGS: return HttpResponse("Too many tags!")
            self.sm.tags.extend(tag_names)

        elif action == "tag_delete":
            # Remove tag_names from self.sm.tags
            self.sm.tags = [tag_name for tag_name in self.sm.tags if tag_name not in tag_names]

        self.sm.save()
        if action == "tag_add":
            logger.info(f"User \"{request.user}\" added tags \"{tag_names}\" to \"{self.sm.name}\"")
        elif action == "tag_delete":
            logger.info(f"User \"{request.user}\" deleted tags \"{tag_names}\" from \"{self.sm.name}\"")
        return HttpResponse(status=204)

    # Unused but I'll keep it here just in case

    # def tag_update(self, request):
    #     old_tag_name = request.POST['old_tag_namestrip()
    #     new_tag_name = request.POST['new_tag_name'].strip()
    #     assignment_models = TimewebModel.objects.filter(user__username=request.user)
    #     for assignment in assignment_models:
    #         if new_tag_name in (assignment.tags or []):
    #             return HttpResponse("alreadyExists")
    #     for assignment in assignment_models:
    #         for i, tag in enumerate(assignment.tags or []):
    #             if tag == old_tag_name:
    #                 assignment.tags[i] = new_tag_name
    #                 assignment.save()
    #                 break
    #     logger.info(f"User \"{request.user}\" updated tag \"{old_tag_name}\" to \"{new_tag_name}\"")
    #     return HttpResponse(status=204)

class GCOAuthView(LoginRequiredMixin, View):
    login_url = '/login/login/'
    redirect_field_name = 'redirect_to'
    def get(self, request):
        self.settings_model = SettingsModel.objects.get(user__username=request.user)
        # Callback URI
        state = request.GET.get('state',None)

        flow = Flow.from_client_secrets_file(
            GC_CREDENTIALS_PATH,
            scopes=GC_SCOPES,
            state=state)
        flow.redirect_uri = GC_REDIRECT_URI

        #get the full URL that we are on, including all the "?param1=token&param2=key" parameters that google has sent us.
        authorization_response = request.build_absolute_uri()        
        try:
            #now turn those parameters into a token.
            flow.fetch_token(authorization_response=authorization_response)
        except InvalidGrantError as e:
            # In case users deny a permission
            logger.warn(f"Google classroom warning: {e}")
            return redirect("home")
        except MissingCodeError:
            return HttpResponse("Missing code in url")
        except Exception as e:
            return HttpResponse(f"An error occurred: {e}")
        credentials = flow.credentials
        # Use .update() instead of = so the refresh token isnt overwritten
        self.settings_model.oauth_token.update(json.loads(credentials.to_json()))
        self.settings_model.save()
        logger.info(f"User {request.user} enabled google classroom API")
        return redirect("home")
        
    def post(self, request):
        self.settings_model = SettingsModel.objects.get(user__username=request.user)
        self.isExampleAccount = request.user.username == example_account_name
        if self.isExampleAccount: return HttpResponse(status=204)
        # self.settings_model.oauth_token stores the user's access and refresh tokens
        if self.settings_model.oauth_token:
            self.settings_model.oauth_token = {}
            self.settings_model.added_gc_assignment_ids = []
            self.settings_model.save()
            logger.info(f"User {request.user} disabled google classroom API")
            return HttpResponse("Disabled gc api")
        flow = Flow.from_client_secrets_file(
            GC_CREDENTIALS_PATH, scopes=GC_SCOPES)
        flow.redirect_uri = GC_REDIRECT_URI
        # Generate URL for request to Google's OAuth 2.0 server.
        # Use kwargs to set optional request parameters.
        authorization_url, state = flow.authorization_url(
            # Enable offline access so that you can refresh an access token without
            # re-prompting the user for permission. Recommended for web server apps.
            access_type='offline',
            # Enable incremental authorization. Recommended as a best practice.
            include_granted_scopes='true')
        logger.info(f"User {request.user} enabled google classroom API")
        return HttpResponse(authorization_url)
        # For reference:
        # If modifying these scopes, delete the file token.json.
        # SCOPES = ['https://www.googleapis.com/auth/classroom.student-submissions.me.readonly', 'https://www.googleapis.com/auth/classroom.courses.readonly']

        # creds = None
        # # The file token.json stores the user's access and refresh tokens, and is
        # # created automatically when the authorization flow completes for the first
        # # time.
        # if os.path.exists('token.json'):
        #     creds = Credentials.from_authorized_user_file('token.json', SCOPES)
        # # If there are no (valid) credentials available, let the user log in.
        # if not creds or not creds.valid:
        #     if creds and creds.expired and creds.refresh_token:
        #         creds.refresh(Request())
        #     else:
        #         flow = InstalledAppFlow.from_client_secrets_file(
        #             'gc-api-credentials.json', SCOPES)
        #         creds = flow.run_local_server(port=0)
        #     # Save the credentials for the next run
        #     with open('token.json', 'w') as token:
        #         token.write(creds.to_json())

        # service = build('classroom', 'v1', credentials=creds)
        # courses = service.courses().list().execute().get('courses', [])
        # coursework = service.courses().courseWork()
        # for course in courses:
        #     try:
        #         course_coursework = coursework.list(courseId=course['id']).execute()['courseWork']
        #     except HttpError:
        #         pass

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