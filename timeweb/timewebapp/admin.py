from django.contrib import admin
from .models import TimewebModel, SettingsModel, TimewebUser
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.decorators import login_required

admin.site.login = login_required(admin.site.login)
admin.site.register(TimewebUser, UserAdmin)
admin.site.register(TimewebModel)
admin.site.register(SettingsModel)