from django.urls import path

from . import api_views


urlpatterns = [
    path(
        "",
        api_views.tasks_list_create,
        name="tasks-list-create",
    ),
    path(
        "<int:task_id>/",
        api_views.task_detail,
        name="task-detail",
    ),
]