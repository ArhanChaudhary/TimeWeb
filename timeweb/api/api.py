# def post(self, request):
#         return self.assignment_form_submitted(request)
#         # AJAX requests
#         if request.isExampleAccount and not settings.EDITING_EXAMPLE_ACCOUNT: return HttpResponse(status=204)

def create_gc_assignments(self, request):
    if 'token' not in request.user.settingsmodel.oauth_token: return HttpResponse(status=401)
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    credentials = Credentials.from_authorized_user_info(request.user.settingsmodel.oauth_token, settings.GC_SCOPES)
    # If there are no valid credentials available, let the user log in.
    if not credentials.valid:
        if credentials.expired and credentials.refresh_token:
            # Errors can happen in refresh because of network or any other miscellaneous issues. Don't except these exceptions so they can be logged
            credentials.refresh(Request())
            request.user.settingsmodel.oauth_token.update(json.loads(credentials.to_json()))
            request.user.settingsmodel.save()
        else:
            flow = Flow.from_client_secrets_file(
                settings.GC_CREDENTIALS_PATH, scopes=settings.GC_SCOPES)
            flow.redirect_uri = settings.GC_REDIRECT_URI
            # Generate URL for request to Google's OAuth 2.0 server.
            # Use kwargs to set optional request parameters.
            authorization_url, state = flow.authorization_url(
                # Enable offline access so that you can refresh an access token without
                # re-prompting the user for permission. Recommended for web server apps.
                access_type='offline',
                # Enable incremental authorization. Recommended as a best practice.
                include_granted_scopes='true')
            return HttpResponse(authorization_url)

    date_now = utc_to_local(request, timezone.now())
    date_now = date_now.replace(hour=0, minute=0, second=0, microsecond=0)
    service = build('classroom', 'v1', credentials=credentials)

    def add_gc_assignments_from_response(response_id, course_coursework, exception):
        if type(exception) is HttpError: # HttpError for permission denied (ex if you're the teacher of a class)
            logger.warning(exception)
            return
        if not course_coursework:
            return
        course_coursework = course_coursework['courseWork']
        for assignment in course_coursework:

            # Load and interpret json data
            assignment_id = int(assignment['id'], 10)
            assignment_date = assignment.get('scheduledTime', assignment['creationTime'])
            try:
                assignment_date = datetime.datetime.strptime(assignment_date,'%Y-%m-%dT%H:%M:%S.%fZ')
            except ValueError:
                assignment_date = datetime.datetime.strptime(assignment_date,'%Y-%m-%dT%H:%M:%SZ')
            assignment_date = utc_to_local(request, assignment_date.replace(tzinfo=timezone.utc))
            assignment_date = assignment_date.replace(hour=0, minute=0, second=0, microsecond=0)
            x = assignment.get('dueDate', None)
            tags = []
            if x:
                if "hours" in assignment['dueTime']:
                    assignment['dueTime']['hour'] = assignment['dueTime'].pop('hours')
                if "minutes" in assignment['dueTime']:
                    assignment['dueTime']['minute'] = assignment['dueTime'].pop('minutes')
                x = utc_to_local(request, datetime.datetime(**x, **assignment['dueTime']).replace(tzinfo=timezone.utc))
                if x < date_now:
                    continue

                due_time = datetime.time(x.hour, x.minute)
                x = x.replace(hour=0, minute=0, second=0, microsecond=0)
                    
                if assignment_date >= x:
                    continue
                if date_now == x:
                    tags.append("Important")
            else:
                if days_between_two_dates(date_now, assignment_date) > 60:
                    continue
                due_time = None
            name = Truncator(assignment['title'].strip()).chars(TimewebModel.name.field.max_length)
            tags.insert(0, course_names[assignment['courseId']])
            description = assignment.get('description', "")

            # Have this below everything else to not include assignments with due dates before today in new_gc_assignment_ids (x < date_now)
            new_gc_assignment_ids.add(assignment_id)
            if assignment_id in set_added_gc_assignment_ids:
                continue

            # Create assignment
            blue_line_start = days_between_two_dates(date_now, assignment_date)
            if blue_line_start < 0:
                blue_line_start = 0
            dynamic_start = blue_line_start
            user = request.user
            gc_models_to_create.append(TimewebModel(
                name=name,
                assignment_date=assignment_date,
                x=x,
                due_time=due_time,
                blue_line_start=blue_line_start,
                skew_ratio=request.user.settingsmodel.def_skew_ratio,
                min_work_time=request.user.settingsmodel.def_min_work_time,
                break_days=request.user.settingsmodel.def_break_days,
                dynamic_start=dynamic_start,
                funct_round=1,
                description=description,
                tags=tags,
                needs_more_info=True,
                is_google_classroom_assignment=True,
                user=user,

                unit="Minute"
                # y, time_per_unit, and unit are missing
            ))
    # .execute() rarely leads to 503s which I expect may have been from a temporary outage
    courses = service.courses().list().execute().get('courses', [])
    coursework_lazy = service.courses().courseWork()
    batch = service.new_batch_http_request(callback=add_gc_assignments_from_response)

    course_names = {}
    for course in courses:
        if course['courseState'] == "ARCHIVED":
            continue
        course_names[course['id']] = course['name']
        batch.add(coursework_lazy.list(courseId=course['id']))
    # Make "in" faster
    set_added_gc_assignment_ids = set(request.user.settingsmodel.added_gc_assignment_ids)
    # Rebuild added_gc_assignment_ids because assignments may have been added or deleted
    new_gc_assignment_ids = set()
    gc_models_to_create = []
    batch.execute()
    TimewebModel.objects.bulk_create(gc_models_to_create)
    if not gc_models_to_create: return HttpResponse(status=204) # or do new_gc_assignment_ids == set_added_gc_assignment_ids
    request.user.settingsmodel.added_gc_assignment_ids = list(new_gc_assignment_ids)
    request.user.settingsmodel.save()

    request.session["already_created_gc_assignments_from_frontend"] = True
    return HttpResponse(status=205)

def deleted_assignment(self, request):
    assignments = request.POST.getlist('assignments[]')
    TimewebModel.objects.filter(pk__in=assignments, user=request.user).delete()
    logger.info(f'User \"{request.user}\" deleted {len(assignments)} assignments')
    return HttpResponse(status=204)
    
def saved_assignment(self, request):
    assignments = json.loads(request.POST['assignments'])
    for assignment in assignments:
        self.sm = get_object_or_404(TimewebModel, pk=assignment['pk'])
        del assignment['pk']
        
        if request.user != self.sm.user:
            logger.warning(f"User \"{request.user}\" can't save an assignment that isn't theirs")
            return HttpResponse(status=404)

        for key, value in assignment.items():
            if key == "x":
                # Useful reference https://blog.ganssle.io/articles/2019/11/utcnow.html
                assignment[key] = datetime.datetime.fromtimestamp(value, timezone.utc)
            elif key == "due_time":
                assignment[key] = datetime.time(**value)
        
        model_fields = {i.name: getattr(self.sm, i.name) for i in TimewebModel._meta.get_fields() if not i.unique}
        model_fields.update(assignment)
        validation_form = TimewebForm(model_fields)
        if not validation_form.is_valid():
            assignment = {field: value for (field, value) in assignment.items() if field not in validation_form.errors}
            if not assignment: continue # It's pointless to finish the loop

        for key, value in assignment.items():
            setattr(self.sm, key, value)
        try:
            self.sm.save()
        except NameError: # Forgot why I put this here
            pass
    return HttpResponse(status=204)

def change_setting(self, request):
    setting = request.POST['setting']
    value = json.loads(request.POST['value'])

    model_fields = {i.name: getattr(request.user.settingsmodel, i.name) for i in SettingsModel._meta.get_fields() if not i.unique}
    if setting not in model_fields:
        logger.warning(f"User \"{request.user}\" tried to change a setting that doesn't exist")
        return HttpResponse(f"The setting \"{setting}\" doesn't exist.", status=404)
        
    model_fields[setting] = value
    validation_form = SettingsForm(model_fields)
    if not validation_form.is_valid(): 
        logger.warning(f"User \"{request.user}\" tried to change setting {setting} to an invalid value of {value}")
        return HttpResponse(f"The setting \"{setting}\"'s value of {value} is invalid.", status=405)

    setattr(request.user.settingsmodel, setting, value)
    request.user.settingsmodel.save()
    return HttpResponse(status=204)

def tag_add_or_delete(self, request, action):
    self.pk = request.POST['pk']
    self.sm = get_object_or_404(TimewebModel, pk=self.pk)

    if request.user != self.sm.user:
        logger.warning(f"User \"{request.user}\" can't save an assignment that isn't theirs")
        return HttpResponse(status=404)

    tag_names = request.POST.getlist('tag_names[]')
    if action == "tag_add":
        tag_names = [tag_name for tag_name in tag_names if tag_name not in self.sm.tags]
        if len(self.sm.tags) + len(tag_names) > settings.MAX_NUMBER_OF_TAGS: return HttpResponse("Too Many Tags!", status=405)
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
#     assignment_models = request.user.timewebmodel_set.all()
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

class GCOAuthView(LoginRequiredMixin, TimewebGenericView):

    def get(self, request):
        if request.isExampleAccount: return redirect("home")
        # Callback URI
        state = request.GET.get('state', None)

        flow = Flow.from_client_secrets_file(
            settings.GC_CREDENTIALS_PATH,
            scopes=settings.GC_SCOPES,
            state=state)
        flow.redirect_uri = settings.GC_REDIRECT_URI

        # get the full URL that we are on, including all the "?param1=token&param2=key" parameters that google has sent us
        authorization_response = request.build_absolute_uri()        
        try:
            # turn those parameters into a token
            flow.fetch_token(authorization_response=authorization_response)
            # Ensure the user enabled both scopes
            service = build('classroom', 'v1', credentials=flow.credentials)
            service.courses().list().execute()
            service.courses().courseWork().list(courseId="easter egg!").execute()
        except (HttpError, OAuth2Error) as e:
            # If the error is an OAuth2Error, the init failed
            # If the error is an HttpError and the access code is 403, the init failed
            # If the error is an HttpError and the access code is 404, the init succeeded, as the course work execute line provides a dunder id so it can execute
            if isinstance(e, OAuth2Error) or isinstance(e, HttpError) and e.resp.status == 403:
                # In case users deny a permission or don't input a code in the url or cancel
                request.session['gc-init-failed'] = True
                return redirect(reverse("home"))
        credentials = flow.credentials
        # Use .update() (dict method) instead of = so the refresh token isnt overwritten
        request.user.settingsmodel.oauth_token.update(json.loads(credentials.to_json()))
        request.user.settingsmodel.save()
        logger.info(f"User {request.user} enabled google classroom API")
        return redirect("home")

    def post(self, request):
        if request.isExampleAccount: return HttpResponse(status=204)
        # request.user.settingsmodel.oauth_token stores the user's access and refresh tokens
        if 'token' in request.user.settingsmodel.oauth_token:
            request.user.settingsmodel.oauth_token = {"refresh_token": request.user.settingsmodel.oauth_token['refresh_token']}
            if settings.DEBUG:
                # Re-add gc assignments in debug
                request.user.settingsmodel.added_gc_assignment_ids = []
            request.user.settingsmodel.save()
            logger.info(f"User {request.user} disabled google classroom API")
            return HttpResponse("Disabled gc api")
        flow = Flow.from_client_secrets_file(
            settings.GC_CREDENTIALS_PATH, scopes=settings.GC_SCOPES)
        flow.redirect_uri = settings.GC_REDIRECT_URI
        # Generate URL for request to Google's OAuth 2.0 server.
        # Use kwargs to set optional request parameters.
        authorization_url, state = flow.authorization_url(
            approval_prompt='force',
            # Enable offline access so that you can refresh an access token without
            # re-prompting the user for permission. Recommended for web server apps.
            access_type='offline',
            # Enable incremental authorization. Recommended as a best practice.
            include_granted_scopes='true')
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
        #             'gc_api_credentials.json', SCOPES)
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
