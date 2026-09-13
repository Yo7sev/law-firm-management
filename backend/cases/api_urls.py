from django.urls import path

from . import api_views


urlpatterns = [
    path(
        "",
        api_views.cases_list_create,
        name="cases-list-create",
    ),
    path(
        "types/",
        api_views.case_types_list,
        name="case-types-list",
    ),
    path(
        "<int:case_id>/",
        api_views.case_detail,
        name="case-detail",
    ),
]

