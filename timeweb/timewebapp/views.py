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
            self.form = TimewebForm(request.POST or None, request.FILES or None,initial={
                'title':get_object_or_404(TimewebModel, pk=pk).title,
                'description':get_object_or_404(TimewebModel, pk=pk).description,
                })
            self.context['submit'] = 'Submit'
        self.context['form'] = self.form
        self.context['pk'] = pk

    # User enters "New"
    def get(self,request,pk=None):
        
        self.make_form_instance(request,pk)
        return render(request, "new.html", self.context)

    def post(self,request,pk=None):
        self.make_form_instance(request,pk)
        if self.form.is_valid() and 'Submitbutton' in request.POST:
            if pk == None: # Handle "new"
                save_data = self.form.save(commit=False)
                save_data.save()
                self.logger.debug("Added new record")
            else: #Handle "Update"
                form_data = self.form.save(commit=False)

                save_data = get_object_or_404(TimewebModel, pk=pk)
                save_data.title = form_data.title
                save_data.description = form_data.description
                save_data.save()
                self.logger.debug("Updated")
            return redirect('../')
        else:
            self.logger.debug("Invalid Form")
            return render(request, "new.html", self.context)

class TimewebListView(View):
    context = {}
    logger = logging.getLogger(__name__)

    def make_list(self):
        objlist = TimewebModel.objects.all()
        for obj in objlist:
            if obj.title == '':
                obj.title = 'No title'
        self.context['objlist'] = objlist

    def get(self,request):
        self.make_list()
        return render(request, "list.html", self.context)
    
    # An example of request.POST after delete is pressed:
    # <QueryDict: {'title': ['yyy'], 'description': ['test'], 'Deletebutton': ['']}>
    # As you can see, the name of the submit button is passed on to request.POST
    # However, it still cannot be referanced because 'Deletebutton': [''] is not a good indication
    # So, pass in a value into the button such that the new request.POST will have Deletebutton': ['deleted'] instead
    def post(self,request):
        for key, value in request.POST.items():
            if value == "deleted":
                pk = key
                selected_form = get_object_or_404(TimewebModel, pk=pk)
                selected_form.delete()
                self.logger.debug("Deleted")
        self.make_list()
        return render(request, "list.html", self.context)

class TimewebGraphView(View):
    context = {}
    logger = logging.getLogger(__name__)

    def get(self,request,pk):
        return render(request, "graph.html", self.context)