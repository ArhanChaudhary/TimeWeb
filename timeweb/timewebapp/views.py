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
            self.context['submit'] = 'Create'
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
        return render(request, "home.html", self.context)

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
            return render(request, "home.html", self.context)

class TimewebListView(View):
    context = {}
    context['updatebuttonimage'] = "data:image/png;base64,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"
    context['deletebuttonimage'] = "https://image.flaticon.com/icons/png/128/3096/3096673.png"
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