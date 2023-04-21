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
CONDITIONALLY_EXCLUDE_FROM_STATE_EVALUATION = (
    # having create_gc_assignments in this list used to run the risk of having the
    # "your assignments are outdated" alert to run (see bb9dac2) 
    # Though this is not rigorously tested, evaluating state for create_gc_assignments
    # *should* not ever product this same undesired alert because state is only
    # being updated when absolutely necessary (creating assignments)
    # it can be thought of as a normal api call that updates state, just a bit
    # delayed
    "create_gc_assignments", )
EXCLUDE_FROM_UPDATING_STATE = ("evaluate_changed_state", "update_gc_courses", "gc_auth_callback", )
assert len(INCLUDE_IN_STATE_EVALUATION) + len(CONDITIONALLY_EXCLUDE_FROM_STATE_EVALUATION) + len(EXCLUDE_FROM_UPDATING_STATE) == len(urlpatterns), "update this"