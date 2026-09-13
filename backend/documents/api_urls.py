from django.urls import path

from . import api_views


urlpatterns = [
    path(
        "",
        api_views.documents_list_create,
        name="documents-list-create",
    ),
    path(
        "upload-url/",
        api_views.create_document_upload_url,
        name="document-upload-url",
    ),
    path(
        "finalize/",
        api_views.finalize_document_upload,
        name="document-finalize-upload",
    ),
    path(
        "<int:document_id>/download-url/",
        api_views.document_download_url,
        name="document-download-url",
    ),
    path(
        "<int:document_id>/",
        api_views.document_detail,
        name="document-detail",
    ),
]