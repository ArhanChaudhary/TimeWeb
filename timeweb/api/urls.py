from django.urls import path
from . import views, integrations

urlpatterns = [
    path("delete-assignment/", views.delete_assignment, name="delete_assignment"),
    path("restore-assignment/", views.restore_assignment, name="restore_assignment"),
    path("save-assignment/", views.save_assignment, name="save_assignment"),
    path("change-setting/", views.change_setting, name="change_setting"),
    path("evaluate-current-state/", views.evaluate_current_state, name="evaluate_changed_state"),
    path("create-gc-assignments/", integrations.create_gc_assignments, name="create_gc_assignments"),
    path("update-gc-courses/", integrations.update_gc_courses, name="update_gc_courses"),
    path("gc-auth-callback/", integrations.gc_auth_callback, name="gc_auth_callback"),
]
INCLUDE_IN_STATE_EVALUATION = ("delete_assignment", "restore_assignment", "save_assignment", 
    "change_setting", )
CONDITIONALLY_EXCLUDE_FROM_STATE_EVALUATION = ("create_gc_assignments", )
EXCLUDE_FROM_UPDATING_STATE = ("evaluate_changed_state", "update_gc_courses", "gc_auth_callback", )
assert len(INCLUDE_IN_STATE_EVALUATION) + len(CONDITIONALLY_EXCLUDE_FROM_STATE_EVALUATION) + len(EXCLUDE_FROM_UPDATING_STATE) == len(urlpatterns), "update this"