from django.conf import settings
from storage3.types import CreateSignedUploadUrlOptions
from supabase import Client, create_client


class SupabaseStorageError(Exception):
    pass


def get_supabase_client() -> Client:
    supabase_url = getattr(
        settings,
        "SUPABASE_URL",
        "",
    )

    service_role_key = getattr(
        settings,
        "SUPABASE_SERVICE_ROLE_KEY",
        "",
    )

    if not supabase_url:
        raise SupabaseStorageError(
            "SUPABASE_URL is not configured."
        )

    if not service_role_key:
        raise SupabaseStorageError(
            "SUPABASE_SERVICE_ROLE_KEY is not configured."
        )

    return create_client(
        supabase_url,
        service_role_key,
    )


def get_bucket_name() -> str:
    bucket_name = getattr(
        settings,
        "SUPABASE_STORAGE_BUCKET",
        "legal-documents",
    )

    if not bucket_name:
        raise SupabaseStorageError(
            "SUPABASE_STORAGE_BUCKET is not configured."
        )

    return bucket_name


def create_signed_upload_url(
    file_path: str,
    upsert: bool = False,
):
    if not file_path:
        raise SupabaseStorageError(
            "File path is required."
        )

    supabase = get_supabase_client()
    bucket_name = get_bucket_name()

    options = CreateSignedUploadUrlOptions(
        upsert="true" if upsert else "false",
    )

    response = supabase.storage.from_(
        bucket_name
    ).create_signed_upload_url(
        file_path,
        options,
    )

    return response


def create_signed_download_url(
    file_path: str,
    expires_in: int = 300,
):
    if not file_path:
        raise SupabaseStorageError(
            "File path is required."
        )

    if expires_in <= 0:
        raise SupabaseStorageError(
            "Expiration time must be greater than zero."
        )

    supabase = get_supabase_client()
    bucket_name = get_bucket_name()

    response = supabase.storage.from_(
        bucket_name
    ).create_signed_url(
        file_path,
        expires_in,
    )

    return response


def delete_file(file_path: str):
    if not file_path:
        return

    supabase = get_supabase_client()
    bucket_name = get_bucket_name()

    response = supabase.storage.from_(
        bucket_name
    ).remove(
        [file_path],
    )

    return response