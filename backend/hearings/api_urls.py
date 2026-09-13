from django.urls import path

from . import api_views


urlpatterns = [
    path(
        "",
        api_views.hearings_list_create,
        name="hearings-list-create",
    ),
    path(
        "<int:hearing_id>/",
        api_views.hearing_detail,
        name="hearing-detail",
    ),
]