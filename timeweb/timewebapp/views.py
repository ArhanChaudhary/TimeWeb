from django.shortcuts import render, get_object_or_404, redirect
from django.views import View
from .models import TimewebModel
from .forms import TimewebForm
from .__init__ import debug
import logging # import the logging library


class TimewebView(View):

    # Get an instance of a logger
    logger = logging.getLogger(__name__)

    def make_form_instance(self,request,pk):
        if pk == None:
            self.form = TimewebForm(request.POST or None, request.FILES or None)
            self.context['submit'] = 'Create'
            self.context['delete'] = 'Cancel'
            self.context['form'] = self.form
        else:
            
            # Create a form instance with the submitted data
            self.form = TimewebForm(request.POST or None, request.FILES or None,initial={
                'title':get_object_or_404(TimewebModel, pk=pk).title,
                'description':get_object_or_404(TimewebModel, pk=pk).description,
                })
            self.context['submit'] = 'Update'
            self.context['delete'] = 'Delete'
            self.context['form'] = self.form

    def get(self,request,pk=None):
        self.context = {}
        self.make_form_instance(request,pk)
        self.logger.debug(self.context)
        return render(request, "home.html", self.context)

    def post(self,request,pk=None):
        # dictionary for initial data with
        # field names as keys
        self.context = {}
        self.make_form_instance(request,pk)
        self.logger.debug(self.context)
        # check if form data is valid
        if self.form.is_valid() and 'Submitbutton' in request.POST:
            if pk == None: # Handle "new"
                # save the form data to model
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
        elif 'Deletebutton' in request.POST:
                selected_form = get_object_or_404(TimewebModel, pk=pk)
                selected_form.delete()
                self.logger.debug("Deleted")
                return redirect('../')
        else:
            self.logger.debug("Invalid Form")
            return render(request, "home.html", self.context)

class TimewebListView(View):

    # Get an instance of a logger
    logger = logging.getLogger(__name__)

    def get(self,request):
        # dictionary for initial data with
        # field names as keys
        self.context = {}
        objlis2 = TimewebModel.objects.all()
        for obj in objlis2:
            if obj.title == '':
                obj.title = 'No title'
        self.context['objlist'] = objlis2
        return render(request, "home_list.html", self.context)
    
    # def post(self,request):
    #     pass
