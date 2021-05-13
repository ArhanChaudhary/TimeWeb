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
# Automatically creates settings model when user is created
from django.db.models.signals import post_save
from django.dispatch import receiver
@receiver(post_save, sender=get_user_model())
def create_settings_model(sender, instance, created, **kwargs):
    if created:
        date_now = timezone.localtime(timezone.now())
        if date_now.hour < 4:
            date_now = date_now.date() - datetime.timedelta(1)
        else:
            date_now = date_now.date()
        TimewebModel.objects.create(**{
            "assignment_name": "Reading a Book (EXAMPLE ASSIGNMENT)",
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
            "nwd": [],
            "fixed_mode": False,
            "dynamic_start": 0,
            "mark_as_done": False,
            "user": instance,
        })
        SettingsModel.objects.create(user=instance)
        logger.info(f'Created settings model for user "{instance.username}"')

MAX_NUMBER_ASSIGNMENTS = 25
logger = logging.getLogger('django')
logger.propagate = False

administrator_users = ['Arhan']
get_requests = 0
administrator_get_requests = 0
class SettingsView(LoginRequiredMixin, View):
    login_url = '/login/login/'
    redirect_field_name = 'redirect_to'

    def __init__(self):
        self.context = {}
    def get(self,request):
        settings_model = SettingsModel.objects.get(user__username=request.user)
        initial = {
            'warning_acceptance': settings_model.warning_acceptance,
            'def_min_work_time': settings_model.def_min_work_time,
            'def_skew_ratio': settings_model.def_skew_ratio,
            'def_nwd': settings_model.def_nwd,
            'def_funct_round_minute': settings_model.def_funct_round_minute,
            'ignore_ends': settings_model.ignore_ends,
            'show_progress_bar': settings_model.show_progress_bar,
            'show_info_buttons': settings_model.show_info_buttons,
            'show_past': settings_model.show_past,
            'color_priority': settings_model.color_priority,
            'text_priority': settings_model.text_priority,
        }
        self.context['form'] = SettingsForm(None, initial=initial)
        logger.info(f'User \"{request.user}\" is now viewing the settings page')
        return render(request, "settings.html", self.context)
    def post(self, request):
        self.form = SettingsForm(request.POST)
        if self.form.is_valid():
            settings_model = SettingsModel.objects.get(user__username=request.user)
            settings_model.warning_acceptance = self.form.cleaned_data.get("warning_acceptance")
            settings_model.def_min_work_time = self.form.cleaned_data.get("def_min_work_time")
            settings_model.def_skew_ratio = self.form.cleaned_data.get("def_skew_ratio")+1
            settings_model.def_nwd = self.form.cleaned_data.get("def_nwd")
            settings_model.def_funct_round_minute = self.form.cleaned_data.get("def_funct_round_minute")
            if settings_model.def_funct_round_minute:
                for model in TimewebModel.objects.filter(user__username=request.user):
                    if model.unit in ['minute', 'Minute', 'minutes', 'Minutes'] and model.funct_round != 5:
                        model.funct_round = 5
                        model.save()
            settings_model.ignore_ends = self.form.cleaned_data.get("ignore_ends")
            settings_model.show_progress_bar = self.form.cleaned_data.get("show_progress_bar")
            settings_model.show_info_buttons = self.form.cleaned_data.get("show_info_buttons")
            settings_model.show_past = self.form.cleaned_data.get("show_past")
            settings_model.color_priority = self.form.cleaned_data.get("color_priority")
            settings_model.text_priority = self.form.cleaned_data.get("text_priority")
            settings_model.save()
            logger.info(f'User \"{request.user}\" updated the settings page')
            return redirect("home")
        self.context['form'] = self.form
        return render(request, "settings.html", self.context)
class TimewebListView(LoginRequiredMixin, View):
    login_url = '/login/login/'
    redirect_field_name = 'redirect_to'

    def __init__(self):
        self.context = {}
    def make_list(self, request):
        settings_model = SettingsModel.objects.get(user__username=request.user)
        self.context['assignmentlist'] = self.objlist
        self.context['assignment_models'] = list(self.objlist.values())
        self.context['settings_model'] = model_to_dict(settings_model)
    def get(self,request):
        global get_requests, administrator_get_requests
        logger.info(f'Recieved GET from user \"{request.user}\"')
        # Get all of the user's assignments
        self.objlist = TimewebModel.objects.filter(user__username=request.user)
        self.make_list(request)
        self.context['form'] = TimewebForm(None)
        logger.info(f'User \"{request.user}\" is now viewing the home page')
        get_requests += 1
        if request.user.username in administrator_users:
            administrator_get_requests += 1
        print(f"TOTAL_GET: {get_requests}, USER_GET: {get_requests-administrator_get_requests}")
        try:
            try:
                request.session['added_assignment']
                h = render(request, "index.html", self.context)
                del request.session['added_assignment']
                return h
            except:
                request.session['reentered_assignment']
                h = render(request, "index.html", self.context)
                del request.session['reentered_assignment']
                return h
        except:
            return render(request, "index.html", self.context)

    def post(self,request):
        logger.info(f'Recieved POST from user \"{request.user}\"')
        self.objlist = TimewebModel.objects.filter(user__username=request.user)
        if 'submit-button' in request.POST:
            status = self.created_assignment(request)
            if status == 200:
                self.make_list(request)
                return render(request, "index.html", self.context)
            elif status == 302:
                return redirect(request.path_info)
        else:
            action = request.POST['action']
            if action == 'delete_assignment':
                self.deleted_assignment(request)
            elif action == 'save_assignment':
                self.saved_assignment(request)
            elif action == 'change_first_login':
                self.changed_first_login(request)
            elif action == 'update_date_now':
                self.updated_date_now(request)
            return HttpResponse(status=204)

    def created_assignment(self, request):
        pk = request.POST['submit-button']
        if pk == '':
            pk = None
            create_assignment = True
            update_assignment = False
        else:
            create_assignment = False
            update_assignment = True
        self.form = TimewebForm(request.POST)
        # Parts of the form that can only validate in views
        form_is_valid = True
        if self.objlist.exclude(pk=pk).filter(assignment_name=request.POST['assignment_name'].strip()).exists(): # Can't use "unique=True" because it doesnt work on reenter
            self.form.add_error("assignment_name",
                forms.ValidationError(_('An assignment with this name already exists'))
            )
            form_is_valid = False
        if create_assignment and self.objlist.count() > MAX_NUMBER_ASSIGNMENTS:
            self.form.add_error("assignment_name",
                forms.ValidationError(_('You have too many assignments (>%(amount)d assignments)') % {'amount': MAX_NUMBER_ASSIGNMENTS})
            )
            form_is_valid = False
        if not self.form.is_valid():
            form_is_valid = False
        if form_is_valid:
            if create_assignment: # Handle "new"
                selected_model = self.form.save(commit=False)
                selected_model.skew_ratio = SettingsModel.objects.get(user__username=request.user).def_skew_ratio
                selected_model.fixed_mode = False
                adone = d(selected_model.works)
                selected_model.user = get_user_model().objects.get(username=request.user)
            else: # Handle "update"
                # Save the form and convert it back to a model
                selected_model = get_object_or_404(TimewebModel, pk=pk)
                if request.user != selected_model.user:
                    logger.warning(f"User \"{request.user}\" cannot modify an assignment that isn't their's")
                    return HttpResponseForbidden("The assignment you are trying to modify isn't yours")
                old_data = get_object_or_404(TimewebModel, pk=pk)
                selected_model.assignment_name = self.form.cleaned_data.get("assignment_name")
                selected_model.ad = self.form.cleaned_data.get("ad")
                selected_model.x = self.form.cleaned_data.get("x")
                selected_model.unit = self.form.cleaned_data.get("unit")
                selected_model.y = self.form.cleaned_data.get("y")
                adone = d(self.form.cleaned_data.get("works"))
                selected_model.ctime = self.form.cleaned_data.get("ctime")
                selected_model.funct_round = self.form.cleaned_data.get("funct_round")
                selected_model.min_work_time = self.form.cleaned_data.get("min_work_time")
                selected_model.nwd = self.form.cleaned_data.get("nwd")
                selected_model.mark_as_done = self.form.cleaned_data.get("mark_as_done")
            date_now = timezone.localtime(timezone.now())
            if date_now.hour < 4:
                date_now = date_now.date() - datetime.timedelta(1)
            else:
                date_now = date_now.date()
            if create_assignment:
                selected_model.dif_assign = (date_now-selected_model.ad).days
                if selected_model.dif_assign < 0:
                    selected_model.dif_assign = 0
                selected_model.dynamic_start = selected_model.dif_assign
            else:
                selected_model.dif_assign = old_data.dif_assign + (old_data.ad-selected_model.ad).days
                if date_now < old_data.ad or selected_model.dif_assign < 0:
                    selected_model.dif_assign = 0
                
            if not selected_model.funct_round:
                selected_model.funct_round = 1

            if selected_model.min_work_time != None:
                selected_model.min_work_time /= selected_model.ctime

            if update_assignment:
                removed_works_start = (selected_model.ad - old_data.ad).days - old_data.dif_assign # translates x position on graph to 0 so that it can be used in accessing works
                if removed_works_start < 0:
                    removed_works_start = 0
            if selected_model.x == None:
                # y - first work = min_work_time_funct_round * x
                # x = (y - first_work) / min_work_time_funct_round
                # Solve for first work:
                # originally: works = [works[n] - works[0] + adone for n in range(removed_works_start,removed_works_end+1)]
                # so first work is when n = removed_works_start
                # first_work = works[removed_works_start] - works[0] + adone
                # first_work = old_data.works[removed_works_start] - old_data.works[0] + adone
                # y - old_data.works[removed_works_start] + old_data.works[0] - adone
                if create_assignment:
                    if selected_model.min_work_time:
                        x_num = (selected_model.y - adone)/ceil(ceil(selected_model.min_work_time/selected_model.funct_round)*selected_model.funct_round)
                    else:
                        x_num = (selected_model.y - adone)/selected_model.funct_round
                else:
                    if selected_model.min_work_time:
                        x_num = (selected_model.y - d(old_data.works[removed_works_start]) + d(old_data.works[0]) - adone)/ceil(ceil(selected_model.min_work_time/selected_model.funct_round)*selected_model.funct_round)
                    else:
                        x_num = (selected_model.y - d(old_data.works[removed_works_start]) + d(old_data.works[0]) - adone)/selected_model.funct_round
                x_num = ceil(x_num)
                if not x_num or len(selected_model.nwd) == 7:
                    x_num = 1
                elif selected_model.nwd:
                    guess_x = 7*floor(x_num/(7-len(selected_model.nwd)) - 1) - 1
                    assign_day_of_week = selected_model.ad.weekday()
                    red_line_start_x = selected_model.dif_assign

                    # set_mod_days()
                    xday = assign_day_of_week + red_line_start_x
                    mods = [0]
                    mod_counter = 0
                    for mod_day in range(6):
                        if (xday + mod_day) % 7 in selected_model.nwd:
                            mod_counter += 1
                        mods.append(mod_counter)
                    mods = tuple(mods)

                    while 1:
                        guess_x += 1
                        if guess_x - guess_x // 7 * len(selected_model.nwd) - mods[guess_x % 7] == x_num:
                            x_num = max(1, guess_x)
                            break
                # Make sure assignments arent finished by x_num
                # x_num = date_now+timedelta(x_num) - min(date_now, selected_model.ad)
                if selected_model.ad < date_now:
                    # x_num = (date_now + timedelta(x_num) - selected_model.ad).days
                    # x_num = (date_now - selected_model.ad).days + x_num
                    # x_num += (date_now - selected_model.ad).days
                    x_num += (date_now - selected_model.ad).days
                try:
                    selected_model.x = selected_model.ad + datetime.timedelta(x_num)
                except OverflowError:
                    selected_model.x = datetime.datetime.max.date()
            else:
                x_num = (selected_model.x - selected_model.ad).days
            if selected_model.min_work_time != None:
                selected_model.min_work_time *= selected_model.ctime
            if create_assignment:
                selected_model.works = [str(selected_model.works)] # Same as str(adone)
            else:
                # If the reentered assign date cuts off some of the work inputs, adjust the work inputs accordingly
                removed_works_end = len(old_data.works) - 1

                # Ensure x_num - selected_model.dif_assign isn't negative. This can't be checked earlier because selected_model.dif_assign depends on x_num, which itself depends in selected_model.dif_assign
                # breakpoint()
                # if x_num - selected_model.dif_assign < 0:
                    # selected_model.dif_assign = x_num

                end_of_works = (selected_model.x - old_data.ad).days

                # If the reentered due date cuts off some of the work inputs, remove the work input for the last day because that must complete assignment
                if removed_works_end >= end_of_works:
                    removed_works_end = end_of_works
                    if old_data.works[removed_works_end] != selected_model.y:
                        removed_works_end -= 1
                if removed_works_start <= removed_works_end and self.form.cleaned_data.get("works") != old_data.works[0]: # self.form.cleaned_data.get("works") is str(adone)
                    selected_model.works = [str(d(old_data.works[n]) - d(old_data.works[0]) + adone) for n in range(removed_works_start,removed_works_end+1)]

                # Adjust dynamic_start and fixed_start in the same manner as above
                # Add dynamic_start as a condition because if its x coordinate is 0, keep it a 0
                # If the above is false, add not old_data.dif_assign as a condition to change dynamic_start if dif_assign is 0
                # If both of them are False, then that variable doesn't change

                # If dynamic_start is x coordinate 0, then keep it at x coordinate 0
                if selected_model.dynamic_start or not old_data.dif_assign:
                    selected_model.dynamic_start += selected_model.dif_assign - old_data.dif_assign
                if selected_model.dynamic_start < 0:
                    selected_model.dynamic_start = 0
                elif selected_model.dynamic_start > x_num - 1:
                    selected_model.dynamic_start = x_num - 1
            selected_model.save()

            if create_assignment:
                request.session['added_assignment'] = selected_model.assignment_name
                logger.info(f'User \"{request.user}\" added assignment "{selected_model.assignment_name}"')
            else:
                request.session['reentered_assignment'] = selected_model.assignment_name    
                logger.info(f'User \"{request.user}\" updated assignment "{selected_model.assignment_name}"')
            return 302
        else:
            logger.info(f"User \"{request.user}\" submitted an invalid form")
            if create_assignment:
                self.context['submit'] = 'Create Assignment'
            else:
                self.context['invalid_form_pk'] = pk
                self.context['submit'] = 'Modify Assignment'
            self.context['form'] = self.form
            return 200
    
    def deleted_assignment(self, request):
        assignments = json.loads(request.POST['assignments'])
        for pk in assignments:
            selected_model = get_object_or_404(TimewebModel, pk=int(pk))
            if request.user != selected_model.user:
                logger.warning(f"User \"{request.user}\" cannot delete an assignment that isn't their's")
                return HttpResponseForbidden("The assignment you are trying to delete isn't yours")
            selected_model.delete()
            logger.info(f'User \"{request.user}\" deleted assignment "{selected_model.assignment_name}"')
        
    def saved_assignment(self, request):
        assignments = json.loads(request.POST['assignments'])
        for assignment in assignments:
            selected_model = get_object_or_404(TimewebModel, pk=assignment['pk'])
            del assignment['pk']
            for key, value in assignment.items():
                if key == "skew_ratio":
                    forbidden_log_message = f"User \"{request.user}\" cannot update the skew ratio for an assignment that isn't their's"
                    forbidden_client_message = "The assignment you are trying to update isn't yours"
                    log_message = f'User \"{request.user}\" saved skew ratio for assignment "{selected_model.assignment_name}"'             
                elif key == 'fixed_mode':
                    forbidden_log_message = f"User \"{request.user}\" cannot update the fixed mode for an assignment that isn't their's"
                    forbidden_client_message = "The assignment you are trying to update isn't yours"
                    log_message = f'User \"{request.user}\" saved fixed mode for assignment "{selected_model.assignment_name}"'
                elif key == 'works' or key == 'dynamic_start':
                    forbidden_log_message = f"User \"{request.user}\" cannot modify works for an assignment that isn't their's"
                    forbidden_client_message = "The assignment you are trying to modify work inputs isn't yours"
                    log_message = f'User \"{request.user}\" modified works for assignment "{selected_model.assignment_name}"'
                elif key == 'mark_as_done':
                    forbidden_log_message = f"User \"{request.user}\" cannot mark or unmark an assignment completed that isn't their's"
                    forbidden_client_message = "The assignment you are trying to mark or unmark as completed isn't yours"
                    log_message = f'User \"{request.user}\" marked or unmarked assignment "{selected_model.assignment_name}" as completed'
                if request.user != selected_model.user:
                    logger.warning(forbidden_log_message)
                    return HttpResponseForbidden(forbidden_client_message)
                setattr(selected_model, key, value)
                logger.info(log_message)
            try:
                selected_model.save()
            except NameError:
                pass
        
    def changed_first_login(self, request):
        settings_model = SettingsModel.objects.get(user__username=request.user)
        settings_model.first_login = request.POST['first_login'] == "true"
        settings_model.save()
        logger.info(f"User \"{request.user}\" changed their first login")

    def updated_date_now(self, request):
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
class ContactView(View):
    def get(self, request):
        return render(request, "contact.html")

class ChangelogView(View):
    def get(self, request):
        return render(request, "changelog.html")