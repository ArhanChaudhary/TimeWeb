from django.urls import path
from . import views

urlpatterns = [
    path("delete-assignment", views.delete_assignment, name="delete_assignment"),
    path("restore-assignment", views.restore_assignment, name="restore_assignment"),
    path("save-assignment", views.save_assignment, name="save_assignment"),
    path("change-setting", views.change_setting, name="change_setting"),
    path("tag-add", views.tag_add, name="tag_add"),
    path("tag-delete", views.tag_delete, name="tag_delete"),
    path("create-gc-assignments", views.create_gc_assignments, name="create_gc_assignments"),
    path("update-gc-courses", views.update_gc_courses, name="create_gc_assignments"),
    path("gc-auth-callback", views.gc_auth_callback, name="gc_auth_callback"),
]