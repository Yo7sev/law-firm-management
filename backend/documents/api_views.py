import json
import mimetypes
import os
import uuid

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import (
    require_GET,
    require_http_methods,
    require_POST,
)

from cases.models import Case
from clients.models import Client

from .models import Document
from .supabase_storage import (
    SupabaseStorageError,
    create_signed_download_url,
    create_signed_upload_url,
    delete_file,
)


ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/tiff",
}


MAX_FILE_SIZE = 50 * 1024 * 1024


def can_manage_documents(user):
    return (
        user.is_superuser
        or user.role
        in [
            "super_admin",
            "lawyer",
            "legal_assistant",
        ]
    )


def can_access_document(user, document):
    if user.is_superuser or user.role == "super_admin":
        return True

    if user.role == "legal_assistant":
        return True

    if user.role == "lawyer":
        if document.case_id:
            return document.case.assigned_lawyer_id == user.id

        return document.client.created_by_id == user.id

    return False


def get_visible_documents(user):
    if user.is_superuser or user.role == "super_admin":
        return Document.objects.all()

    if user.role == "lawyer":
        return Document.objects.filter(
            Q(case__assigned_lawyer=user)
            | Q(client__created_by=user)
        ).distinct()

    if user.role == "legal_assistant":
        return Document.objects.all()

    return Document.objects.none()


def serialize_document(document):
    return {
        "id": document.id,
        "title": document.title,
        "document_type": document.document_type,
        "document_type_display": document.get_document_type_display(),
        "client": {
            "id": document.client.id,
            "full_name": document.client.full_name,
        },
        "client_id": document.client_id,
        "case": (
            {
                "id": document.case.id,
                "case_number": document.case.case_number,
                "title": document.case.title,
            }
            if document.case
            else None
        ),
        "case_id": document.case_id,
        "file_path": document.file_path,
        "original_filename": document.original_filename,
        "file_size": document.file_size,
        "mime_type": document.mime_type,
        "description": document.description,
        "uploaded_by": {
            "id": document.uploaded_by.id,
            "email": document.uploaded_by.email,
            "first_name": document.uploaded_by.first_name,
            "last_name": document.uploaded_by.last_name,
        },
        "uploaded_by_id": document.uploaded_by_id,
        "created_at": document.created_at.isoformat(),
        "updated_at": document.updated_at.isoformat(),
    }


def validate_document_data(
    data,
    existing_document=None,
):
    errors = {}

    client_id = data.get(
        "client_id",
        existing_document.client_id
        if existing_document
        else None,
    )

    title = str(
        data.get(
            "title",
            existing_document.title
            if existing_document
            else "",
        )
    ).strip()

    document_type = data.get(
        "document_type",
        existing_document.document_type
        if existing_document
        else Document.DocumentType.OTHER,
    )

    case_id = data.get(
        "case_id",
        existing_document.case_id
        if existing_document
        else None,
    )

    file_path = str(
        data.get(
            "file_path",
            existing_document.file_path
            if existing_document
            else "",
        )
    ).strip()

    original_filename = str(
        data.get(
            "original_filename",
            existing_document.original_filename
            if existing_document
            else "",
        )
    ).strip()

    mime_type = str(
        data.get(
            "mime_type",
            existing_document.mime_type
            if existing_document
            else "",
        )
    ).strip()

    description = str(
        data.get(
            "description",
            existing_document.description
            if existing_document
            else "",
        )
    ).strip()

    file_size = data.get(
        "file_size",
        existing_document.file_size
        if existing_document
        else None,
    )

    if not title:
        errors["title"] = "Document title is required."

    if not client_id:
        errors["client_id"] = "Client is required."

    valid_document_types = {
        choice[0]
        for choice in Document.DocumentType.choices
    }

    if document_type not in valid_document_types:
        errors["document_type"] = "Invalid document type."

    client = None

    if client_id:
        try:
            client = Client.objects.get(
                pk=client_id,
            )
        except (
            Client.DoesNotExist,
            ValueError,
            TypeError,
        ):
            errors["client_id"] = (
                "Selected client does not exist."
            )

    case = None

    if case_id not in [
        None,
        "",
        0,
        "0",
    ]:
        try:
            case = Case.objects.select_related(
                "client",
                "assigned_lawyer",
            ).get(
                pk=case_id,
            )
        except (
            Case.DoesNotExist,
            ValueError,
            TypeError,
        ):
            errors["case_id"] = (
                "Selected case does not exist."
            )

    if (
        case
        and client
        and case.client_id != client.id
    ):
        errors["case_id"] = (
            "Selected case does not belong "
            "to the selected client."
        )

    normalized_file_size = None

    if file_size not in [
        None,
        "",
    ]:
        try:
            normalized_file_size = int(
                file_size,
            )

            if normalized_file_size < 0:
                raise ValueError
        except (
            ValueError,
            TypeError,
        ):
            errors["file_size"] = (
                "File size must be a valid positive number."
            )

    if (
        normalized_file_size is not None
        and normalized_file_size > MAX_FILE_SIZE
    ):
        errors["file_size"] = (
            "The file exceeds the current 50 MB upload limit."
        )

    if mime_type:
        if mime_type not in ALLOWED_MIME_TYPES:
            errors["mime_type"] = (
                "This file type is not allowed."
            )

    return {
        "errors": errors,
        "client": client,
        "case": case,
        "title": title,
        "document_type": document_type,
        "file_path": file_path,
        "original_filename": original_filename,
        "file_size": normalized_file_size,
        "mime_type": mime_type,
        "description": description,
    }


@login_required
@require_GET
def documents_list(request):
    user = request.user

    documents = (
        get_visible_documents(user)
        .select_related(
            "client",
            "case",
            "uploaded_by",
        )
    )

    search = request.GET.get(
        "search",
        "",
    ).strip()

    client_id = request.GET.get(
        "client_id",
        "",
    ).strip()

    case_id = request.GET.get(
        "case_id",
        "",
    ).strip()

    document_type = request.GET.get(
        "document_type",
        "",
    ).strip()

    if search:
        documents = documents.filter(
            Q(title__icontains=search)
            | Q(original_filename__icontains=search)
            | Q(description__icontains=search)
            | Q(client__full_name__icontains=search)
            | Q(case__case_number__icontains=search)
            | Q(case__title__icontains=search)
        )

    if client_id:
        documents = documents.filter(
            client_id=client_id,
        )

    if case_id:
        documents = documents.filter(
            case_id=case_id,
        )

    if document_type:
        documents = documents.filter(
            document_type=document_type,
        )

    return JsonResponse(
        {
            "success": True,
            "count": documents.count(),
            "documents": [
                serialize_document(document)
                for document in documents
            ],
        }
    )


@login_required
@csrf_exempt
@require_POST
def create_document_upload_url(request):
    user = request.user

    if not can_manage_documents(user):
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "You do not have permission "
                    "to upload documents."
                ),
            },
            status=403,
        )

    try:
        data = json.loads(
            request.body or "{}",
        )
    except json.JSONDecodeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid JSON request.",
            },
            status=400,
        )

    client_id = data.get(
        "client_id",
    )

    case_id = data.get(
        "case_id",
    )

    original_filename = str(
        data.get(
            "original_filename",
            "",
        )
    ).strip()

    mime_type = str(
        data.get(
            "mime_type",
            "",
        )
    ).strip()

    file_size = data.get(
        "file_size",
    )

    if not client_id:
        return JsonResponse(
            {
                "success": False,
                "message": "Client is required.",
                "errors": {
                    "client_id": "Client is required.",
                },
            },
            status=400,
        )

    if not original_filename:
        return JsonResponse(
            {
                "success": False,
                "message": "Original filename is required.",
                "errors": {
                    "original_filename": (
                        "Original filename is required."
                    ),
                },
            },
            status=400,
        )

    if not mime_type:
        mime_type = (
            mimetypes.guess_type(
                original_filename,
            )[0]
            or "application/octet-stream"
        )

    if mime_type not in ALLOWED_MIME_TYPES:
        return JsonResponse(
            {
                "success": False,
                "message": "This file type is not allowed.",
                "errors": {
                    "mime_type": (
                        "This file type is not allowed."
                    ),
                },
            },
            status=400,
        )

    try:
        normalized_file_size = int(
            file_size,
        )
    except (
        ValueError,
        TypeError,
    ):
        return JsonResponse(
            {
                "success": False,
                "message": "File size is required.",
                "errors": {
                    "file_size": (
                        "File size must be a valid number."
                    ),
                },
            },
            status=400,
        )

    if normalized_file_size <= 0:
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "File size must be greater than zero."
                ),
                "errors": {
                    "file_size": (
                        "File size must be greater than zero."
                    ),
                },
            },
            status=400,
        )

    if normalized_file_size > MAX_FILE_SIZE:
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "The file exceeds the current 50 MB upload limit."
                ),
                "errors": {
                    "file_size": (
                        "Maximum file size is currently 50 MB."
                    ),
                },
            },
            status=400,
        )

    try:
        client = Client.objects.get(
            pk=client_id,
        )
    except (
        Client.DoesNotExist,
        ValueError,
        TypeError,
    ):
        return JsonResponse(
            {
                "success": False,
                "message": "Selected client does not exist.",
            },
            status=400,
        )

    case = None

    if case_id not in [
        None,
        "",
        0,
        "0",
    ]:
        try:
            case = Case.objects.select_related(
                "client",
                "assigned_lawyer",
            ).get(
                pk=case_id,
            )
        except (
            Case.DoesNotExist,
            ValueError,
            TypeError,
        ):
            return JsonResponse(
                {
                    "success": False,
                    "message": (
                        "Selected case does not exist."
                    ),
                },
                status=400,
            )

        if case.client_id != client.id:
            return JsonResponse(
                {
                    "success": False,
                    "message": (
                        "Selected case does not belong "
                        "to the selected client."
                    ),
                },
                status=400,
            )

    if user.role == "lawyer":
        if case:
            if case.assigned_lawyer_id != user.id:
                return JsonResponse(
                    {
                        "success": False,
                        "message": (
                            "You do not have permission "
                            "to upload documents for this case."
                        ),
                    },
                    status=403,
                )
        elif client.created_by_id != user.id:
            return JsonResponse(
                {
                    "success": False,
                    "message": (
                        "You do not have permission "
                        "to upload documents for this client."
                    ),
                },
                status=403,
            )

    safe_filename = os.path.basename(
        original_filename,
    )

    filename_without_extension, extension = (
        os.path.splitext(
            safe_filename,
        )
    )

    cleaned_filename = "".join(
        character
        for character in filename_without_extension
        if character.isalnum()
        or character in (
            "-",
            "_",
            ".",
        )
    ).strip(
        " ._-"
    )

    if not cleaned_filename:
        cleaned_filename = "document"

    extension = extension.lower()

    unique_name = (
        f"{cleaned_filename}-"
        f"{uuid.uuid4().hex}"
        f"{extension}"
    )

    if case:
        file_path = (
            f"clients/{client.id}/"
            f"cases/{case.id}/"
            f"documents/{unique_name}"
        )
    else:
        file_path = (
            f"clients/{client.id}/"
            f"documents/{unique_name}"
        )

    try:
        response = create_signed_upload_url(
            file_path=file_path,
            upsert=False,
        )
    except SupabaseStorageError as error:
        return JsonResponse(
            {
                "success": False,
                "message": str(error),
            },
            status=500,
        )
    except Exception:
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "Unable to create a Supabase upload URL."
                ),
            },
            status=502,
        )

    signed_url = None
    token = None

    if isinstance(response, dict):
        signed_url = (
            response.get("signedUrl")
            or response.get("signed_url")
        )

        token = response.get(
            "token",
        )

        data_response = response.get(
            "data",
        )

        if isinstance(data_response, dict):
            signed_url = (
                signed_url
                or data_response.get("signedUrl")
                or data_response.get("signed_url")
            )

            token = (
                token
                or data_response.get("token")
            )

    if not signed_url and token:
        signed_url = token

    if not signed_url:
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "Supabase did not return a valid "
                    "signed upload URL."
                ),
            },
            status=502,
        )

    bucket_name = getattr(
        settings,
        "SUPABASE_STORAGE_BUCKET",
        "legal-documents",
    )

    return JsonResponse(
        {
            "success": True,
            "message": (
                "Signed upload URL created successfully."
            ),
            "upload": {
                "bucket": bucket_name,
                "path": file_path,
                "signed_url": signed_url,
                "token": token,
                "expires_in": 7200,
                "original_filename": original_filename,
                "mime_type": mime_type,
                "file_size": normalized_file_size,
            },
        }
    )


@login_required
@csrf_exempt
@require_POST
def finalize_document_upload(request):
    user = request.user

    if not can_manage_documents(user):
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "You do not have permission "
                    "to finalize document uploads."
                ),
            },
            status=403,
        )

    try:
        data = json.loads(
            request.body or "{}",
        )
    except json.JSONDecodeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid JSON request.",
            },
            status=400,
        )

    validated = validate_document_data(
        data,
    )

    if validated["errors"]:
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "Please correct the submitted data."
                ),
                "errors": validated["errors"],
            },
            status=400,
        )

    client = validated["client"]
    case = validated["case"]
    file_path = validated["file_path"]

    if not file_path:
        return JsonResponse(
            {
                "success": False,
                "message": "File path is required.",
                "errors": {
                    "file_path": "File path is required.",
                },
            },
            status=400,
        )

    expected_prefix = (
        f"clients/{client.id}/"
    )

    if not file_path.startswith(expected_prefix):
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "The file path does not belong "
                    "to the selected client."
                ),
                "errors": {
                    "file_path": (
                        "Invalid storage path."
                    ),
                },
            },
            status=400,
        )

    if case:
        expected_case_prefix = (
            f"clients/{client.id}/"
            f"cases/{case.id}/documents/"
        )

        if not file_path.startswith(
            expected_case_prefix
        ):
            return JsonResponse(
                {
                    "success": False,
                    "message": (
                        "The file path does not belong "
                        "to the selected case."
                    ),
                    "errors": {
                        "file_path": (
                            "Invalid case storage path."
                        ),
                    },
                },
                status=400,
            )
    else:
        expected_client_prefix = (
            f"clients/{client.id}/documents/"
        )

        if not file_path.startswith(
            expected_client_prefix
        ):
            return JsonResponse(
                {
                    "success": False,
                    "message": (
                        "The file path is invalid "
                        "for this client."
                    ),
                    "errors": {
                        "file_path": (
                            "Invalid client storage path."
                        ),
                    },
                },
                status=400,
            )

    if user.role == "lawyer":
        if case:
            if case.assigned_lawyer_id != user.id:
                return JsonResponse(
                    {
                        "success": False,
                        "message": (
                            "You do not have permission "
                            "to finalize a document for "
                            "this case."
                        ),
                    },
                    status=403,
                )
        elif client.created_by_id != user.id:
            return JsonResponse(
                {
                    "success": False,
                    "message": (
                        "You do not have permission "
                        "to finalize a document for "
                        "this client."
                    ),
                },
                status=403,
            )

    existing_document = Document.objects.filter(
        file_path=file_path,
    ).first()

    if existing_document:
        existing_document = (
            Document.objects.select_related(
                "client",
                "case",
                "uploaded_by",
            ).get(
                pk=existing_document.pk,
            )
        )

        return JsonResponse(
            {
                "success": True,
                "message": (
                    "This document has already been finalized."
                ),
                "document": serialize_document(
                    existing_document,
                ),
                "already_exists": True,
            }
        )

    document = Document.objects.create(
        client=client,
        case=case,
        title=validated["title"],
        document_type=validated["document_type"],
        file_path=file_path,
        original_filename=validated["original_filename"],
        file_size=validated["file_size"],
        mime_type=validated["mime_type"],
        description=validated["description"],
        uploaded_by=user,
    )

    document = (
        Document.objects.select_related(
            "client",
            "case",
            "uploaded_by",
        ).get(
            pk=document.pk,
        )
    )

    return JsonResponse(
        {
            "success": True,
            "message": (
                "Document upload finalized successfully."
            ),
            "document": serialize_document(
                document,
            ),
            "already_exists": False,
        },
        status=201,
    )


@login_required
@csrf_exempt
@require_http_methods(
    [
        "GET",
        "POST",
    ]
)
def documents_list_create(request):
    user = request.user

    if request.method == "GET":
        return documents_list(request)

    if not can_manage_documents(user):
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "You do not have permission "
                    "to create documents."
                ),
            },
            status=403,
        )

    try:
        data = json.loads(
            request.body or "{}",
        )
    except json.JSONDecodeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid JSON request.",
            },
            status=400,
        )

    validated = validate_document_data(
        data,
    )

    if validated["errors"]:
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "Please correct the submitted data."
                ),
                "errors": validated["errors"],
            },
            status=400,
        )

    document = Document.objects.create(
        client=validated["client"],
        case=validated["case"],
        title=validated["title"],
        document_type=validated["document_type"],
        file_path=validated["file_path"],
        original_filename=validated["original_filename"],
        file_size=validated["file_size"],
        mime_type=validated["mime_type"],
        description=validated["description"],
        uploaded_by=user,
    )

    document = (
        Document.objects.select_related(
            "client",
            "case",
            "uploaded_by",
        ).get(
            pk=document.pk,
        )
    )

    return JsonResponse(
        {
            "success": True,
            "message": "Document created successfully.",
            "document": serialize_document(
                document,
            ),
        },
        status=201,
    )


@login_required
@require_GET
def document_download_url(
    request,
    document_id,
):
    user = request.user

    try:
        document = (
            get_visible_documents(user)
            .select_related(
                "client",
                "case",
                "uploaded_by",
            )
            .get(
                pk=document_id,
            )
        )
    except Document.DoesNotExist:
        return JsonResponse(
            {
                "success": False,
                "message": "Document not found.",
            },
            status=404,
        )

    if not can_access_document(
        user,
        document,
    ):
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "You do not have permission "
                    "to access this document."
                ),
            },
            status=403,
        )

    if not document.file_path:
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "This document does not have "
                    "a stored file."
                ),
            },
            status=404,
        )

    try:
        response = create_signed_download_url(
            file_path=document.file_path,
            expires_in=900,
        )
    except SupabaseStorageError as error:
        return JsonResponse(
            {
                "success": False,
                "message": str(error),
            },
            status=500,
        )
    except Exception:
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "Unable to create the document "
                    "access URL."
                ),
            },
            status=502,
        )

    signed_url = None

    if isinstance(response, dict):
        signed_url = (
            response.get("signedURL")
            or response.get("signedUrl")
            or response.get("signed_url")
        )

        data_response = response.get(
            "data",
        )

        if isinstance(data_response, dict):
            signed_url = (
                signed_url
                or data_response.get("signedURL")
                or data_response.get("signedUrl")
                or data_response.get("signed_url")
            )

    if not signed_url:
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "Supabase did not return a "
                    "valid document URL."
                ),
            },
            status=502,
        )

    return JsonResponse(
        {
            "success": True,
            "url": signed_url,
            "expires_in": 900,
            "document": {
                "id": document.id,
                "title": document.title,
                "original_filename": (
                    document.original_filename
                ),
                "mime_type": document.mime_type,
            },
        }
    )


@login_required
@csrf_exempt
@require_http_methods(
    [
        "GET",
        "PUT",
        "DELETE",
    ]
)
def document_detail(
    request,
    document_id,
):
    user = request.user

    try:
        document = (
            get_visible_documents(user)
            .select_related(
                "client",
                "case",
                "uploaded_by",
            )
            .get(
                pk=document_id,
            )
        )
    except Document.DoesNotExist:
        return JsonResponse(
            {
                "success": False,
                "message": "Document not found.",
            },
            status=404,
        )

    if request.method == "GET":
        return JsonResponse(
            {
                "success": True,
                "document": serialize_document(
                    document,
                ),
            }
        )

    if not can_access_document(
        user,
        document,
    ):
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "You do not have permission "
                    "to modify this document."
                ),
            },
            status=403,
        )

    if not can_manage_documents(user):
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "You do not have permission "
                    "to modify documents."
                ),
            },
            status=403,
        )

    if request.method == "DELETE":
        file_path = document.file_path

        try:
            if file_path:
                delete_file(
                    file_path,
                )
        except Exception:
            return JsonResponse(
                {
                    "success": False,
                    "message": (
                        "The document could not be "
                        "removed from storage."
                    ),
                },
                status=502,
            )

        document.delete()

        return JsonResponse(
            {
                "success": True,
                "message": (
                    "Document deleted successfully."
                ),
            }
        )

    try:
        data = json.loads(
            request.body or "{}",
        )
    except json.JSONDecodeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid JSON request.",
            },
            status=400,
        )

    validated = validate_document_data(
        data,
        existing_document=document,
    )

    if validated["errors"]:
        return JsonResponse(
            {
                "success": False,
                "message": (
                    "Please correct the submitted data."
                ),
                "errors": validated["errors"],
            },
            status=400,
        )

    document.client = validated["client"]
    document.case = validated["case"]
    document.title = validated["title"]
    document.document_type = validated["document_type"]
    document.file_path = validated["file_path"]
    document.original_filename = validated["original_filename"]
    document.file_size = validated["file_size"]
    document.mime_type = validated["mime_type"]
    document.description = validated["description"]

    document.save()

    document = (
        Document.objects.select_related(
            "client",
            "case",
            "uploaded_by",
        ).get(
            pk=document.pk,
        )
    )

    return JsonResponse(
        {
            "success": True,
            "message": "Document updated successfully.",
            "document": serialize_document(
                document,
            ),
        }
    )

