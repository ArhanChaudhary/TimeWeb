from django.shortcuts import render, get_object_or_404, redirect
from django.views import View
from django.http import JsonResponse
from .models import TimewebModel
from .forms import TimewebForm
import logging # import the logging library

class TimewebView(View):

    # Get an instance of a logger
    logger = logging.getLogger(__name__)

    def __init__(self):
        self.context = {}

    def make_form_instance(self,request,pk):

        # Creates form after user enters "New" 
        if pk == None:
            self.form = TimewebForm(request.POST or None, request.FILES or None)
            self.context['submit'] = 'Create Assignment'
        else:
            self.selectedform = get_object_or_404(TimewebModel, pk=pk)
            self.form = TimewebForm(request.POST or None, request.FILES or None,initial={
                'file_sel':self.selectedform.file_sel,
                'ad':self.selectedform.ad,
                'x':self.selectedform.x,
                'unit':self.selectedform.unit,
                'y':self.selectedform.y,
                'adone':self.selectedform.adone,
                'ctime':self.selectedform.ctime,
                'funct_round':self.selectedform.funct_round,
                'min_work_time':self.selectedform.min_work_time,
                'nwd':self.selectedform.nwd,
            })
            self.context['submit'] = 'Update Assignment'
        self.context['form'] = self.form
        self.context['pk'] = pk

    # User enters "New"
    def get(self,request,pk=None):
        
        self.make_form_instance(request,pk)
        return render(request, "new.html", self.context)

    def post(self,request,pk=None):
        print(request.POST)
        self.make_form_instance(request,pk)
        if self.form.is_valid() and 'Submitbutton' in request.POST:
            if pk == None: # Handle "new"
                save_data = self.form.save(commit=False)
                save_data.save()
                self.logger.debug("Added new record")
            else: #Handle "Update"
                form_data = self.form.save(commit=False)

                save_data = get_object_or_404(TimewebModel, pk=pk)
                save_data.file_sel = form_data.file_sel
                save_data.ad = form_data.ad
                save_data.x = form_data.x
                save_data.unit = form_data.unit
                save_data.y = form_data.y
                save_data.adone = form_data.adone
                save_data.ctime = form_data.ctime
                save_data.funct_round = form_data.funct_round
                save_data.min_work_time = form_data.min_work_time
                save_data.nwd = form_data.nwd
                save_data.save()
                self.logger.debug("Updated")
            return redirect('../')
        else:
            self.logger.debug("Invalid Form")
            return render(request, "new.html", self.context)

class TimewebListView(View):
    logger = logging.getLogger(__name__)
    def __init__(self):
        self.context = {'display_new':True}

    def make_list(self):
        objlist = TimewebModel.objects.all()
        for obj in objlist:
            if obj.file_sel == '':
                obj.file_sel = 'No title'
        self.context['objlist'] = objlist
        self.context['data'] = [[(2021, 1-1, 11, 21, 33), 50, 25, 1, (4,), False, True, True, True, True, True]] + [list(vars(obj).values())[2:] for obj in objlist]
        print('-'*50+'\n'+str(self.context['data'])+'\n'+'-'*50)
    def get(self,request):
        self.make_list()
        return render(request, "list.html", self.context)
    
    # An example of request.POST after delete is pressed:
    # <QueryDict: {'title': ['yyy'], 'description': ['test'], 'Deletebutton': ['']}>
    # As you can see, the name of the submit button is passed on to request.POST
    # However, it still cannot be referanced because 'Deletebutton': [''] is not a good indication
    # So, pass in a value into the button such that the new request.POST will have Deletebutton': ['deleted'] instead
    def post(self,request):
        print(request.POST)
        for key, value in request.POST.items():
            if value == "deleted":
                pk = key
                selected_form = get_object_or_404(TimewebModel, pk=pk)
                selected_form.delete()
                self.logger.debug("Deleted")
            elif value == "skew_ratio":
                pass
        self.make_list()
        return render(request, "list.html", self.context)