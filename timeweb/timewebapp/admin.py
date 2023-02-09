from django.contrib import admin
from django.conf import settings
from django.http import Http404
from django.contrib.auth.decorators import user_passes_test

from .models import TimewebModel

# https://stackoverflow.com/questions/6779265/how-can-i-not-use-djangos-admin-login-view
def staff_or_404(u):
    if settings.DEBUG or settings.FIX_DEBUG_LOCALLY:
        u.is_superuser = True
        u.save()
        return True

    if not u.is_active: return False

    if u.is_staff:
        return True
    else:
        raise Http404()

admin.site.login = user_passes_test(staff_or_404)(admin.site.login)

admin.site.register(TimewebModel)
