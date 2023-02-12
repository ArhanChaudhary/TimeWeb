"""
Utility for auto importing models into shell
Use with python -i shell_context.py
"""
import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", 'timeweb.settings')
django.setup()
from django.apps import apps
for _class in apps.get_models():
    if _class.__name__.startswith("Historical"): 
        continue
    globals()[_class.__name__] = _class
from django.contrib.auth import get_user_model
u = get_user_model()
t = TimewebModel
s = SettingsModel
from django.conf import settings