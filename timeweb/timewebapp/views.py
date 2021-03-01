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
import datetime
class TimewebListView(LoginRequiredMixin, View):
    login_url = '/login/login/'
    redirect_field_name = 'redirect_to'
    
    logger = logging.getLogger(__name__)
    def __init__(self):
        self.context = {}
    def make_list(self, request):
        objlist = TimewebModel.objects.filter(user__username=request.user)
        self.context['objlist'] = objlist
        self.context['data'] = [[50, 25, 1, (4,), True, True, True, False, 0]] + [list(vars(obj).values())[2:] for obj in objlist]
    def get(self,request):
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
    
    # An example of request.POST after delete is pressed:
    # <QueryDict: {'title': ['yyy'], 'description': ['test'], 'delete-button': ['']}>
    # As you can see, the name of the submit button is passed on to request.POST
    # However, it still cannot be referanced because 'delete-button': [''] is not a good indication
    # So, pass in a value into the button such that the new request.POST will have delete-button': [obj.pk] instead
    def post(self,request):
        if 'submit-button' in request.POST:
            pk = request.POST['submit-button']
            if pk == '':
                pk = None
                created_new_assignment = True
            else:
                created_new_assignment = False
            if created_new_assignment:
                self.form = TimewebForm(request.POST or None)
                # self.context['submit'] = _('Create Assignment')
            else:
                self.selectedform = get_object_or_404(TimewebModel, pk=pk) # User data from modelform
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
                # self.context['submit'] = _('Update Assignment')
                # self.context['checked_nwd'] = self.selectedform.nwd
            if self.form.is_valid():
                if created_new_assignment: # Handle "new"
                    save_data = self.form.save(commit=False)
                    save_data.dif_assign = 0
                    save_data.skew_ratio = 1 # Change to def_skew_ratio
                    save_data.fixed_mode = False
                    save_data.remainder_mode = False
                    adone = save_data.works
                    save_data.user = get_user_model().objects.get(username=request.user)
                else: #Handle "Update"
                    # Save the form and convert it back to a model
                    old_data = get_object_or_404(TimewebModel, pk=pk)
                    form_data = self.form.save(commit=False)
                    save_data = get_object_or_404(TimewebModel, pk=pk)
                    save_data.file_sel = form_data.file_sel
                    save_data.ad = form_data.ad
                    save_data.x = form_data.x
                    save_data.unit = form_data.unit
                    save_data.y = form_data.y
                    adone = form_data.works
                    save_data.skew_ratio = form_data.skew_ratio
                    save_data.ctime = form_data.ctime
                    save_data.funct_round = form_data.funct_round
                    save_data.min_work_time = form_data.min_work_time
                    save_data.nwd = form_data.nwd
                    save_data.fixed_mode = form_data.fixed_mode
                    save_data.remainder_mode = form_data.remainder_mode

                # Can't use "unique=True" because it doesnt work on reenter
                if any(save_data.file_sel == obj.file_sel for obj in TimewebModel.objects.filter(user__username=save_data.user).exclude(pk=pk)):
                    self.form.add_error("file_sel",
                        forms.ValidationError(_('An assignment with this name already exists'))
                    )
                    self.logger.debug("Name not unique")
                    if not created_new_assignment:
                        # Reference to the invalid assignment pk if invalid
                        self.context['invalid_form_pk'] = pk
                else:
                    date_now = timezone.localtime(timezone.now()).date()
                    if save_data.ad == date_now:
                        save_data.dynamic_start = 0 # May not be needed
                    else:
                        if created_new_assignment:
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

                    x_num = (save_data.x - save_data.ad).days
                    if created_new_assignment:
                        save_data.works = [adone]
                    else:
                        removed_works_start = (save_data.ad - old_data.ad).days - save_data.dif_assign
                        if removed_works_start < 0:
                            removed_works_start = 0
                        removed_works_end = len(save_data.works) - 1

                        # If the reentered due date cuts off some of the work inputs, remove the work input for the last day because that must complete assignment
                        if removed_works_end >= x_num - save_data.dif_assign:# and x != None:
                            #                                                           ^^^









                            removed_works_end = x_num - save_data.dif_assign
                            if save_data.works[removed_works_end] != save_data.y:
                                removed_works_end -= 1
                            
                        if removed_works_start <= removed_works_end:
                            save_data.works = [save_data.works[n] - save_data.works[0] + adone for n in range(removed_works_start,removed_works_end+1)]
                        if save_data.dynamic_start or not old_data.dif_assign:
                            save_data.dynamic_start += save_data.dif_assign - old_data.dif_assign
                        if save_data.dynamic_start < 0:
                            save_data.dynamic_start = 0
                    if not created_new_assignment and save_data.dynamic_start > x_num - 1:
                        save_data.dynamic_start = x_num - 1
                    save_data.save()

                    if created_new_assignment:
                        request.session['added_assignment'] = save_data.file_sel
                    else:
                        request.session['reentered_assignment'] = save_data.file_sel
                        
                    self.logger.debug("Updated/Added Model")
                    self.make_list(request)
                    return redirect(request.path_info)
            else:
                if not created_new_assignment:
                    self.context['invalid_form_pk'] = pk
                self.logger.debug("Invalid Form")
            self.context['form'] = self.form
        else:
            for key, value in request.POST.items():
                if key == "deleted":
                    pk = value
                    selected_model = get_object_or_404(TimewebModel, pk=pk)
                    selected_model.delete()
                    self.logger.debug("Deleted")
                elif key == "skew_ratio":
                    pk = request.POST['pk']
                    selected_model = get_object_or_404(TimewebModel, pk=pk)
                    selected_model.skew_ratio = value
                    selected_model.save()
                    self.logger.debug("Skew ratio saved")
        self.make_list(request)
        return render(request, "main.html", self.context)