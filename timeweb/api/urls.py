from django.urls import path
from . import views

urlpatterns = [
    path("delete-assignment/", views.delete_assignment, name="delete_assignment"),
    path("restore-assignment/", views.restore_assignment, name="restore_assignment"),
    path("save-assignment/", views.save_assignment, name="save_assignment"),
    path("change-setting/", views.change_setting, name="change_setting"),
    path("evaluate-current-state/", views.evaluate_current_state, name="evaluate_changed_state"),
    path("create-gc-assignments/", views.create_gc_assignments, name="create_gc_assignments"),
    path("update-gc-courses/", views.update_gc_courses, name="create_gc_assignments"),
    path("gc-auth-callback/", views.gc_auth_callback, name="gc_auth_callback"),
]
INCLUDE_IN_STATE_EVALUATION = ("delete_assignment", "restore_assignment", "save_assignment", 
    "change_setting", )
EXCLUDE_FROM_UPDATING_STATE = ("evaluate_changed_state", "create_gc_assignments", "update_gc_courses", 
    "gc_auth_callback", )
assert len(INCLUDE_IN_STATE_EVALUATION) + len(EXCLUDE_FROM_UPDATING_STATE) == len(urlpatterns), "update this"