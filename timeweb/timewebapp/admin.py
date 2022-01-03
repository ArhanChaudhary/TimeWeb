from django.contrib import admin
from .models import TimewebModel, SettingsModel, TimewebUser
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.decorators import user_passes_test
from django.http import Http404

# https://stackoverflow.com/questions/6779265/how-can-i-not-use-djangos-admin-login-view
def staff_or_404(u):
    if not u.is_active: return False

    if u.is_staff:
        return True
    else:
        raise Http404()

admin.site.login = user_passes_test(staff_or_404)(admin.site.login)

admin.site.register(TimewebUser, UserAdmin)
admin.site.register(TimewebModel)
admin.site.register(SettingsModel)