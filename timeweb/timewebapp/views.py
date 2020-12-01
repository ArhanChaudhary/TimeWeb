from django.shortcuts import render, get_object_or_404
from .models import TimewebModel
from .forms import TimewebForm

def home_view(request, pk=None):

    # dictionary for initial data with
    # field names as keys
    context = {}

    if pk == None:
        form = TimewebForm(request.POST or None, request.FILES or None)
    else:
        # add the dictionary during initialization
        form = TimewebForm(request.POST or None, request.FILES or None,initial={
            'title':get_object_or_404(TimewebModel, pk=pk).title,
            'description':get_object_or_404(TimewebModel, pk=pk).description,
            })
    context['form'] = form

    # check if form data is valid
    if form.is_valid() and 'Submitbutton' in request.POST:

        if pk == None:
            # save the form data to model
            save_data = form.save(commit=False)
            save_data.save()
        else:
            form_data = form.save(commit=False)

            save_data = get_object_or_404(TimewebModel, pk=pk)
            save_data.title = form_data.title
            save_data.description = form_data.description
            save_data.save()
        print("Database saved")
    elif 'Deletebutton' in request.POST:
        if pk == None:

            # Do nothing if pk is None
            pass
        else:
            selected_form = get_object_or_404(TimewebModel, pk=pk)
            selected_form.delete()

    return render(request, "home.html", context)


def list_view(request):

    # dictionary for initial data with
    # field names as keys
    context = {}
    objlist = TimewebModel.objects.all()
    for obj in objlist:
        if obj.title == '':
            obj.title = 'No title'
    context['objlist'] = objlist
    return render(request, "home_list.html", context)
