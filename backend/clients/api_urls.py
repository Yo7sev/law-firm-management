from django.urls import path

from . import api_views
from . import client_profile_api


urlpatterns = [
    path(
        "",
        api_views.clients_list_create,
        name="clients-list-create",
    ),
    path(
        "<int:client_id>/",
        api_views.client_detail,
        name="client-detail",
    ),
    path(
        "<int:client_id>/profile/",
        client_profile_api.client_profile,
        name="client-profile",
    ),
]