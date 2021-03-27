from django.shortcuts import render, get_object_or_404, redirect
from django.utils.translation import ugettext as _
from django.views import View
from django.utils import timezone
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import HttpResponseForbidden
from .models import TimewebModel
from django.contrib.auth import get_user_model
from .forms import TimewebForm
import logging
from django import forms
from datetime import timedelta
from decimal import Decimal as d
from math import ceil, floor
MAX_NUMBER_ASSIGNMENTS = 25
logger = logging.getLogger('django')
logger.propagate = False
class TimewebListView(LoginRequiredMixin, View):
    login_url = '/login/login/'
    redirect_field_name = 'redirect_to'

    def __init__(self):
        self.context = {}
    def make_list(self, request):
        self.context['objlist'] = self.objlist
        self.context['data'] = [[50, "25.00", 1, (), "5.00", True, True, True, False, 0]] + [list(vars(obj).values())[2:] for obj in self.objlist]
    def get(self,request):
        logger.info(f'Recieved GET from user {request.user}')
        self.objlist = TimewebModel.objects.filter(user__username=request.user)
        self.make_list(request)
        self.context['form'] = TimewebForm(None)
        logger.info(f'User {request.user} is now viewing the home page')
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

    # An example of request.POST after delete is pressed:
    # <QueryDict: {'title': ['yyy'], 'description': ['test'], 'delete-button': ['']}>
    # As you can see, the name of the submit button is passed on to request.POST
    # However, it still cannot be referanced because 'delete-button': [''] is not a good indication
    # So, pass in a value into the button such that the new request.POST will have delete-button': [obj.pk] instead
    def post(self,request):
        logger.info(f'Recieved POST from user {request.user}')
        self.objlist = TimewebModel.objects.filter(user__username=request.user)
        if 'submit-button' in request.POST:
            pk = request.POST['submit-button']
            if pk == '':
                pk = None
                create_assignment = True
                update_assignment = False
            else:
                create_assignment = False
                update_assignment = True
            if create_assignment:
                self.form = TimewebForm(request.POST)
            else:
                selected_model = get_object_or_404(TimewebModel, pk=pk) # Corresponding model
                # Ensure the user didn't change the html pk value to delete other users' assignments
                if request.user != selected_model.user:
                    logger.warning(f"User {request.user} cannot modify an assignment that isn't theirs")
                    return HttpResponseForbidden("The assignment you are trying to modify isn't yours")
                # Create a form instance from user data
                initial = {
                    'file_sel':selected_model.file_sel,
                    'ad':selected_model.ad,
                    'x':selected_model.x,
                    'unit':selected_model.unit,
                    'y':selected_model.y,
                    'works':selected_model.works[0],
                    'ctime':selected_model.ctime,
                    'nwd':selected_model.nwd,
                }
                if selected_model.funct_round != 1:
                    initial['funct_round'] = selected_model.funct_round
                if selected_model.min_work_time*selected_model.ctime:
                    initial['min_work_time'] = selected_model.min_work_time*selected_model.ctime
                self.form = TimewebForm(request.POST,initial=initial)

            # Parts of the form that can only validate in views
            form_is_valid = True
            if self.objlist.exclude(pk=pk).filter(file_sel=request.POST['file_sel'].strip()).exists(): # Can't use "unique=True" because it doesnt work on reenter
                self.form.add_error("file_sel",
                    forms.ValidationError(_('An assignment with this name already exists'))
                )
                form_is_valid = False
            if self.objlist.count() > MAX_NUMBER_ASSIGNMENTS:
                self.form.add_error("file_sel",
                    forms.ValidationError(_('You have too many assignments (>%(amount)d assignments)') % {'amount': MAX_NUMBER_ASSIGNMENTS})
                )
                form_is_valid = False
            if not self.form.is_valid():
                form_is_valid = False

            if form_is_valid:
                if create_assignment: # Handle "new"
                    selected_model = self.form.save(commit=False)
                    selected_model.skew_ratio = d("1") # Change to def_skew_ratio
                    selected_model.fixed_mode = False
                    selected_model.remainder_mode = False
                    adone = d(str(selected_model.works))
                    selected_model.user = get_user_model().objects.get(username=request.user)
                else: # Handle "update"
                    # Save the form and convert it back to a model
                    old_data = get_object_or_404(TimewebModel, pk=pk)
                    form_data = self.form.save(commit=False)
                    selected_model.file_sel = form_data.file_sel
                    selected_model.ad = form_data.ad
                    selected_model.x = form_data.x
                    selected_model.unit = form_data.unit
                    selected_model.y = form_data.y
                    adone = d(str(form_data.works))
                    selected_model.skew_ratio = form_data.skew_ratio
                    selected_model.ctime = form_data.ctime
                    selected_model.funct_round = form_data.funct_round
                    selected_model.min_work_time = form_data.min_work_time
                    selected_model.nwd = form_data.nwd
                    selected_model.fixed_mode = form_data.fixed_mode
                    selected_model.remainder_mode = form_data.remainder_mode
                date_now = timezone.localtime(timezone.now()).date()
                if create_assignment:
                    if date_now >= selected_model.ad:
                        selected_model.dif_assign = (date_now-selected_model.ad).days
                    else:  
                        selected_model.dif_assign = 0
                    selected_model.dynamic_start = selected_model.dif_assign
                else:
                    if date_now < old_data.ad or old_data.dif_assign + (old_data.ad-selected_model.ad).days < 0:
                        selected_model.dif_assign = 0
                    else:
                        selected_model.dif_assign = old_data.dif_assign + (old_data.ad-selected_model.ad).days
                    
                if not selected_model.funct_round:
                    selected_model.funct_round = 1

                if selected_model.min_work_time:
                    selected_model.min_work_time /= selected_model.ctime
                else:
                    selected_model.min_work_time = 0

                if update_assignment:
                    removed_works_start = (selected_model.ad - old_data.ad).days - selected_model.dif_assign
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
                    x_num = floor(x_num)
                    if selected_model.nwd:
                        if len_nwd == 7:
                            x_num = 1
                        else:
                            guess_x = 7*floor(x_num/(7-len_nwd) - 1) - 1
                            assign_day_of_week = selected_model.ad.weekday()
                            red_line_start_x = selected_model.dif_assign

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
                                if guess_x - guess_x // 7 * len_nwd - mods[guess_x % 7] == x_num:
                                    x_num = guess_x
                                    break
                    elif not x_num:
                        # x can sometimes be zero
                        x_num = 1
                else:
                    x_num = (selected_model.x - selected_model.ad).days
                if create_assignment:
                    selected_model.works = [str(selected_model.works)] # Same as str(adone)
                else:
                    # If the reentered assign date cuts off some of the work inputs, adjust the work inputs accordingly

                    removed_works_end = len(old_data.works) - 1

                    # If the reentered due date cuts off some of the work inputs, remove the work input for the last day because that must complete assignment
                    if removed_works_end >= x_num - selected_model.dif_assign:
                        removed_works_end = x_num - selected_model.dif_assign
                        if old_data.works[removed_works_end] != selected_model.y:
                            removed_works_end -= 1
                    if removed_works_start <= removed_works_end and form_data.works != old_data.works[0]: # form_data.works[0] is adone
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
                    
                if update_assignment and selected_model.dynamic_start > x_num - 1:
                    selected_model.dynamic_start = x_num - 1
                selected_model.x = selected_model.ad + timedelta(x_num)
                selected_model.save()

                if create_assignment:
                    request.session['added_assignment'] = selected_model.file_sel
                    logger.info(f'User {request.user} added model "{selected_model.file_sel}"')
                else:
                    request.session['reentered_assignment'] = selected_model.file_sel    
                    logger.info(f'User {request.user} updated model "{selected_model.file_sel}"')
                self.make_list(request)
                return redirect(request.path_info)
            else:
                logger.info(f"User {request.user} submitted an invalid form")
                if create_assignment:
                    self.context['submit'] = 'Create Assignment'
                else:
                    self.context['invalid_form_pk'] = pk
                    self.context['submit'] = 'Modify Assignment'
            self.context['form'] = self.form
        else:
            for key, value in request.POST.items():
                if key == "deleted":
                    selected_model = get_object_or_404(TimewebModel, pk=value)
                    if request.user != selected_model.user:
                        logger.warning(f"User {request.user} cannot delete an assignment that isn't their's")
                        return HttpResponseForbidden("The assignment you are trying to delete isn't yours")
                    selected_model.delete()
                    logger.info(f'User {request.user} deleted assignment "{selected_model.file_sel}"')
                elif key == "skew_ratio":
                    selected_model = get_object_or_404(TimewebModel, pk=request.POST['pk'])
                    if request.user != selected_model.user:
                        logger.warning(f"User {request.user} cannot update the skew ratio for an assignment that isn't their's")
                        return HttpResponseForbidden("The assignment you are trying to update isn't yours")
                    selected_model.skew_ratio = value
                    selected_model.save()
                    logger.info(f'User {request.user} saved skew ratio for assignment "{selected_model.file_sel}"')
                elif key == "remainder_mode":
                    selected_model = get_object_or_404(TimewebModel, pk=request.POST['pk'])
                    if request.user != selected_model.user:
                        logger.warning(f"User {request.user} cannot update the remainder mode for an assignment that isn't their's")
                        return HttpResponseForbidden("The assignment you are trying to update isn't yours")
                    selected_model.remainder_mode = value == "true"
                    selected_model.save()
                    logger.info(f'User {request.user} saved remainder mode for assignment "{selected_model.file_sel}"')
        self.make_list(request)
        return render(request, "index.html", self.context)