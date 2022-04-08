from django.contrib import admin
from timewebauth.models import TimewebUser
from django.contrib.auth.admin import UserAdmin

admin.site.register(TimewebUser, UserAdmin)
