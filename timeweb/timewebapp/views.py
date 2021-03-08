from django.shortcuts import render, get_object_or_404, redirect
from django.utils.translation import ugettext as _
from django.views import View
from django.utils import timezone
from django.contrib.auth.mixins import LoginRequiredMixin
from .models import TimewebModel
from django.contrib.auth import get_user_model
from .forms import TimewebForm
import logging
from django import forms
from datetime import timedelta
from decimal import Decimal as d
from math import ceil
MAX_NUMBER_ASSIGNMENTS = 25
class TimewebListView(LoginRequiredMixin, View):
    login_url = '/login/login/'
    redirect_field_name = 'redirect_to'
    
    logger = logging.getLogger(__name__)
    def __init__(self):
        self.context = {}
    def make_list(self, request):
        self.context['objlist'] = self.objlist.order_by("?")
        self.context['data'] = [[50, "25.00", 1, (), "5.00", True, True, True, False, 0]] + [list(vars(obj).values())[2:] for obj in self.objlist]
    def get(self,request):
        self.objlist = TimewebModel.objects.filter(user__username=request.user)
        self.make_list(request)
        self.context['form'] = TimewebForm(None)
        try:
            try:
                request.session['added_assignment']
                h = render(request, "main.html", self.context)
                del request.session['added_assignment']
                return h
            except:
                request.session['reentered_assignment']
                h = render(request, "main.html", self.context)
                del request.session['reentered_assignment']
                return h
        except:
            return render(request, "main.html", self.context)
    
    def form_invalid(self):
        if self.created_new_assignment:
            self.context['submit'] = 'Create Assignment'
        else:
            self.context['invalid_form_pk'] = self.pk
            self.context['submit'] = 'Modify Assignment'
    # An example of request.POST after delete is pressed:
    # <QueryDict: {'title': ['yyy'], 'description': ['test'], 'delete-button': ['']}>
    # As you can see, the name of the submit button is passed on to request.POST
    # However, it still cannot be referanced because 'delete-button': [''] is not a good indication
    # So, pass in a value into the button such that the new request.POST will have delete-button': [obj.pk] instead
    def post(self,request):
        self.objlist = TimewebModel.objects.filter(user__username=request.user)
        if 'submit-button' in request.POST:
            self.pk = request.POST['submit-button']
            if self.pk == '':
                self.pk = None
                self.created_new_assignment = True
            else:
                self.created_new_assignment = False
            if self.created_new_assignment:
                self.form = TimewebForm(request.POST or None)
            else:
                self.selectedform = get_object_or_404(TimewebModel, pk=self.pk) # User data from modelform
                # Create a form instance from user data
                initial = {
                    'file_sel':self.selectedform.file_sel,
                    'ad':self.selectedform.ad,
                    'x':self.selectedform.x,
                    'unit':self.selectedform.unit,
                    'y':self.selectedform.y,
                    'works':self.selectedform.works[0],
                    'ctime':self.selectedform.ctime,
                    'nwd':self.selectedform.nwd,
                }
                if self.selectedform.funct_round != 1:
                    initial['funct_round'] = self.selectedform.funct_round
                if self.selectedform.min_work_time*self.selectedform.ctime:
                    initial['min_work_time'] = round(self.selectedform.min_work_time*self.selectedform.ctime,2) # Decimal module mutiplication adds siginficant figures
                self.form = TimewebForm(request.POST or None,initial=initial)
            if self.form.is_valid():
                if self.created_new_assignment: # Handle "new"
                    save_data = self.form.save(commit=False)
                    save_data.dif_assign = 0
                    save_data.skew_ratio = 1 # Change to def_skew_ratio
                    save_data.fixed_mode = False
                    save_data.remainder_mode = False
                    adone = d(str(save_data.works))
                    save_data.user = get_user_model().objects.get(username=request.user)
                    print([save_data.min_work_time])
                else: #Handle "Update"
                    # Save the form and convert it back to a model
                    old_data = get_object_or_404(TimewebModel, pk=self.pk)
                    form_data = self.form.save(commit=False)
                    save_data = get_object_or_404(TimewebModel, pk=self.pk)
                    save_data.file_sel = form_data.file_sel
                    save_data.ad = form_data.ad
                    save_data.x = form_data.x
                    save_data.unit = form_data.unit
                    save_data.y = form_data.y
                    adone = d(str(form_data.works))
                    save_data.skew_ratio = form_data.skew_ratio
                    save_data.ctime = form_data.ctime
                    save_data.funct_round = form_data.funct_round
                    save_data.min_work_time = form_data.min_work_time
                    save_data.nwd = form_data.nwd
                    save_data.fixed_mode = form_data.fixed_mode
                    save_data.remainder_mode = form_data.remainder_mode

                # Parts of the form that can only validate in views
                # Can't use "unique=True" because it doesnt work on reenter
                if any(save_data.file_sel == obj.file_sel for obj in self.objlist.exclude(pk=self.pk)):
                    self.form.add_error("file_sel",
                        forms.ValidationError(_('An assignment with this name already exists'))
                    )
                    self.form_invalid()
                    self.logger.debug("Name not unique")
                elif self.objlist.count() > MAX_NUMBER_ASSIGNMENTS:
                    self.form.add_error("file_sel",
                        forms.ValidationError(_('You have too many assignments (>%(amount)d assignments)') % {'amount': MAX_NUMBER_ASSIGNMENTS})
                    )
                    self.form_invalid()
                    self.logger.debug("Too many assignments")
                else:
                    date_now = timezone.localtime(timezone.now()).date()
                    if save_data.ad == date_now:
                        save_data.dynamic_start = 0 # May not be needed
                    else:
                        if self.created_new_assignment:
                            if date_now >= save_data.ad:
                                save_data.dif_assign = (date_now-save_data.ad).days
                            save_data.dynamic_start = save_data.dif_assign
                        else:
                            if date_now < old_data.ad or old_data.dif_assign + (old_data.ad-save_data.ad).days < 0:
                                save_data.dif_assign = 0
                            else:
                                save_data.dif_assign = old_data.dif_assign + (old_data.ad-save_data.ad).days
                        
                    if not save_data.funct_round:
                        save_data.funct_round = 1

                    if save_data.min_work_time:
                        save_data.min_work_time /= save_data.ctime
                    else:
                        save_data.min_work_time = 0

                    if not self.created_new_assignment:
                        removed_works_start = (save_data.ad - old_data.ad).days - save_data.dif_assign
                        if removed_works_start < 0:
                            removed_works_start = 0
                    if save_data.x == None:
                        # y - first work = min_work_time_funct_round * x
                        # x = (y - first_work) / min_work_time_funct_round
                        # Solve for first work:
                        # originally: works = [works[n] - works[0] + adone for n in range(removed_works_start,removed_works_end+1)]
                        # so first work is when n = removed_works_start
                        # first_work = works[removed_works_start] - works[0] + adone
                        # first_work = old_data.works[removed_works_start] - old_data.works[0] + adone
                        # y - old_data.works[removed_works_start] + old_data.works[0] - adone
                        if self.created_new_assignment:
                            if save_data.min_work_time:
                                x_num = (save_data.y - adone)/ceil(ceil(save_data.min_work_time/save_data.funct_round)*save_data.funct_round)
                            else:
                                x_num = (save_data.y - adone)/save_data.funct_round
                        else:
                            if save_data.min_work_time:
                                x_num = (save_data.y - old_data.works[removed_works_start] + old_data.works[0] - adone)/ceil(ceil(save_data.min_work_time/save_data.funct_round)*save_data.funct_round)
                            else:
                                x_num = (save_data.y - old_data.works[removed_works_start] + old_data.works[0] - adone)/save_data.funct_round
                        x_num = int(x_num)
                        if save_data.nwd:
                            if len_nwd == 7:
                                x_num = 1
                            else:
                                guess_x = 7*floor(x_num/(7-len_nwd) - 1) - 1
                                assign_day_of_week = save_data.ad.weekday()
                                red_line_start_x = save_data.dif_assign

                                # set_mod_days()
                                xday = assign_day_of_week + red_line_start_x
                                mods = [0]
                                mod_counter = 0
                                for mod_day in range(6):
                                    if (xday + mod_day) % 7 in nwd:
                                        mod_counter += 1
                                    mods.append(mod_counter)
                                mods = tuple(mods)

                                while 1:
                                    guess_x += 1
                                    if guess_x - guess_x // 7 * len_nwd - mods[guess_x % 7] == ceil(x):
                                        x_num = guess_x
                                        break
                    else:
                        x_num = (save_data.x - save_data.ad).days
                    if self.created_new_assignment:
                        # Defines the work inputs
                        # adone serves as the 0th or the starting work value of the assignment
                        save_data.works = [str(save_data.works)] # Same as str(adone)
                    else:
                        # If the reentered assign date cuts off some of the work inputs, adjust the work inputs accordingly
                        
                        removed_works_end = len(old_data.works) - 1

                        # If the reentered due date cuts off some of the work inputs, remove the work input for the last day because that must complete assignment
                        if removed_works_end >= x_num - save_data.dif_assign:
                            removed_works_end = x_num - save_data.dif_assign
                            if old_data.works[removed_works_end] != save_data.y:
                                removed_works_end -= 1
                        if removed_works_start <= removed_works_end and form_data.works != old_data.works[0]: # form_data.works[0] is adone
                            save_data.works = [str(d(old_data.works[n]) - d(old_data.works[0]) + adone) for n in range(removed_works_start,removed_works_end+1)]

                        # Adjust dynamic_start and fixed_start in the same manner as above
                        # Add dynamic_start as a condition because if its x coordinate is 0, keep it a 0
                        # If the above is false, add not old_data.dif_assign as a condition to change dynamic_start if dif_assign is 0
                        # If both of them are False, then that variable doesn't change

                        # If dynamic_start is x coordinate 0, then keep it at x coordinate 0
                        if save_data.dynamic_start or not old_data.dif_assign:
                            save_data.dynamic_start += save_data.dif_assign - old_data.dif_assign
                        if save_data.dynamic_start < 0:
                            save_data.dynamic_start = 0
                        
                    if not self.created_new_assignment and save_data.dynamic_start > x_num - 1:
                        save_data.dynamic_start = x_num - 1
                    save_data.x = save_data.ad + timedelta(x_num)
                    save_data.save()

                    if self.created_new_assignment:
                        request.session['added_assignment'] = save_data.file_sel
                    else:
                        request.session['reentered_assignment'] = save_data.file_sel
                        
                    self.logger.debug("Updated/Added Model")
                    self.make_list(request)
                    return redirect(request.path_info)
            else:
                self.form_invalid()
                self.logger.debug("Invalid Form")
            self.context['form'] = self.form
        else:
            for key, value in request.POST.items():
                if key == "deleted":
                    selected_model = get_object_or_404(TimewebModel, pk=value)
                    selected_model.delete()
                    self.logger.debug("Deleted")
                    break
                elif key == "skew_ratio":
                    selected_model = get_object_or_404(TimewebModel, pk=request.POST['pk'])
                    selected_model.skew_ratio = value
                    selected_model.save()
                    self.logger.debug("Skew ratio saved")
                    break
        self.make_list(request)
        return render(request, "main.html", self.context)