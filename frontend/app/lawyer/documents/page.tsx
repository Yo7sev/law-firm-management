"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type Client = {
  id: number;
  full_name: string;
};

type Case = {
  id: number;
  case_number: string;
  title: string;
  client_id: number;
};

type LegalDocument = {
  id: number;
  title: string;
  document_type: string;
  document_type_display?: string;
  client: {
    id: number;
    full_name: string;
  };
  client_id: number;
  case: {
    id: number;
    case_number: string;
    title: string;
  } | null;
  case_id: number | null;
  file_path: string;
  original_filename: string;
  file_size: number | null;
  mime_type: string;
  description: string;
  uploaded_by: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  uploaded_by_id: number;
  created_at: string;
  updated_at: string;
};

type DocumentsResponse = {
  success: boolean;
  count?: number;
  documents: LegalDocument[];
  message?: string;
};

type ClientsResponse = {
  success: boolean;
  clients: Client[];
  message?: string;
};

type CasesResponse = {
  success: boolean;
  cases: Case[];
  message?: string;
};

type UploadUrlResponse = {
  success: boolean;
  message?: string;
  upload?: {
    bucket?: string;
    path?: string;
    signed_url?: string;
    token?: string;
    expires_in?: number;
    original_filename?: string;
    mime_type?: string;
    file_size?: number;
  };
  upload_url?: string;
  signed_url?: string;
  file_path?: string;
  path?: string;
};

type FinalizeResponse = {
  success: boolean;
  message?: string;
  document?: LegalDocument;
};

type UpdateDocumentResponse = {
  success: boolean;
  message?: string;
  document?: LegalDocument;
  errors?: Record<string, string>;
};

const documentTypes = [
  {
    value: "contract",
    label: "Contract",
  },
  {
    value: "court_document",
    label: "Court Document",
  },
  {
    value: "identification",
    label: "Identification",
  },
  {
    value: "evidence",
    label: "Evidence",
  },
  {
    value: "correspondence",
    label: "Correspondence",
  },
  {
    value: "other",
    label: "Other",
  },
];

function formatDocumentType(type: string) {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(dateString: string) {
  if (!dateString) {
    return "—";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatFileSize(bytes: number | null) {
  if (bytes === null || bytes === undefined) {
    return "Unknown size";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getDocumentTypeClass(type: string) {
  switch (type) {
    case "contract":
      return "border-blue-900/60 bg-blue-950/30 text-blue-300";

    case "court_document":
      return "border-purple-900/60 bg-purple-950/30 text-purple-300";

    case "identification":
      return "border-amber-900/60 bg-amber-950/30 text-amber-300";

    case "evidence":
      return "border-red-900/60 bg-red-950/30 text-red-300";

    case "correspondence":
      return "border-emerald-900/60 bg-emerald-950/30 text-emerald-300";

    default:
      return "border-slate-700 bg-slate-900 text-slate-400";
  }
}

function getFileExtension(filename: string) {
  if (!filename) {
    return "FILE";
  }

  const parts = filename.split(".");

  if (parts.length < 2) {
    return "FILE";
  }

  return parts[parts.length - 1].toUpperCase().slice(0, 5);
}

export default function LawyerDocumentsPage() {
  const router = useRouter();

  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<Case[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [caseFilter, setCaseFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [showUploadModal, setShowUploadModal] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadClientId, setUploadClientId] = useState("");
  const [uploadCaseId, setUploadCaseId] = useState("");
  const [uploadDocumentType, setUploadDocumentType] = useState("other");
  const [uploadDescription, setUploadDescription] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDocument, setEditingDocument] =
    useState<LegalDocument | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editClientId, setEditClientId] = useState("");
  const [editCaseId, setEditCaseId] = useState("");
  const [editDocumentType, setEditDocumentType] = useState("other");
  const [editDescription, setEditDescription] = useState("");

  const [savingEdit, setSavingEdit] = useState(false);

  async function loadDocuments() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (clientFilter) {
        params.set("client_id", clientFilter);
      }

      if (caseFilter) {
        params.set("case_id", caseFilter);
      }

      if (typeFilter) {
        params.set("document_type", typeFilter);
      }

      const queryString = params.toString();

      const response = await fetch(
        `/api/auth/documents/${queryString ? `?${queryString}` : ""}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

      if (
        response.status === 401 ||
        response.status === 403 ||
        response.redirected
      ) {
        router.push("/login");
        return;
      }

      const data: DocumentsResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load documents.");
      }

      setDocuments(data.documents || []);
    } catch (documentsError) {
      const message =
        documentsError instanceof Error
          ? documentsError.message
          : "Unable to load documents.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function loadOptions() {
    try {
      setLoadingOptions(true);

      const [clientsResponse, casesResponse] = await Promise.all([
        fetch("/api/auth/clients/", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/auth/cases/", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      if (
        clientsResponse.status === 401 ||
        clientsResponse.status === 403 ||
        casesResponse.status === 401 ||
        casesResponse.status === 403
      ) {
        router.push("/login");
        return;
      }

      const clientsData: ClientsResponse = await clientsResponse.json();
      const casesData: CasesResponse = await casesResponse.json();

      if (clientsResponse.ok && clientsData.success) {
        setClients(clientsData.clients || []);
      }

      if (casesResponse.ok && casesData.success) {
        setCases(casesData.cases || []);
      }
    } catch {
      setError(
        "Documents loaded, but clients or cases could not be loaded.",
      );
    } finally {
      setLoadingOptions(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOptions();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadDocuments();
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [search, clientFilter, caseFilter, typeFilter]);

  const availableUploadCases = useMemo(() => {
    if (!uploadClientId) {
      return cases;
    }

    return cases.filter(
      (caseItem) =>
        String(caseItem.client_id) === String(uploadClientId),
    );
  }, [cases, uploadClientId]);

  const availableEditCases = useMemo(() => {
    if (!editClientId) {
      return cases;
    }

    return cases.filter(
      (caseItem) =>
        String(caseItem.client_id) === String(editClientId),
    );
  }, [cases, editClientId]);

  function resetUploadForm() {
    setSelectedFile(null);
    setUploadTitle("");
    setUploadClientId("");
    setUploadCaseId("");
    setUploadDocumentType("other");
    setUploadDescription("");
    setUploadProgress(0);
  }

  function closeUploadModal() {
    if (uploading) {
      return;
    }

    setShowUploadModal(false);
    resetUploadForm();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);

    if (!uploadTitle) {
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  }

  function handleUploadClientChange(
    event: ChangeEvent<HTMLSelectElement>,
  ) {
    setUploadClientId(event.target.value);
    setUploadCaseId("");
  }

  function handleEditClientChange(
    event: ChangeEvent<HTMLSelectElement>,
  ) {
    setEditClientId(event.target.value);
    setEditCaseId("");
  }

  function openEditModal(documentItem: LegalDocument) {
    setEditingDocument(documentItem);

    setEditTitle(documentItem.title);
    setEditClientId(String(documentItem.client_id));
    setEditCaseId(
      documentItem.case_id ? String(documentItem.case_id) : "",
    );
    setEditDocumentType(documentItem.document_type);
    setEditDescription(documentItem.description || "");

    setError("");
    setSuccessMessage("");
    setShowEditModal(true);
  }

  function closeEditModal() {
    if (savingEdit) {
      return;
    }

    setShowEditModal(false);
    setEditingDocument(null);

    setEditTitle("");
    setEditClientId("");
    setEditCaseId("");
    setEditDocumentType("other");
    setEditDescription("");
  }

  async function uploadToSignedUrl(
    url: string,
    file: File,
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open("PUT", url);

      xhr.setRequestHeader(
        "Content-Type",
        file.type || "application/octet-stream",
      );

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round(
            (event.loaded / event.total) * 100,
          );

          setUploadProgress(percentage);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadProgress(100);
          resolve();
          return;
        }

        reject(
          new Error(
            `Supabase upload failed with status ${xhr.status}.`,
          ),
        );
      };

      xhr.onerror = () => {
        reject(
          new Error(
            "Network error occurred while uploading the file.",
          ),
        );
      };

      xhr.onabort = () => {
        reject(new Error("The upload was cancelled."));
      };

      xhr.send(file);
    });
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Please select a document to upload.");
      return;
    }

    if (!uploadTitle.trim()) {
      setError("Please enter a document title.");
      return;
    }

    if (!uploadClientId) {
      setError("Please select a client.");
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError(
        "The selected file is larger than the current 50 MB upload limit.",
      );
      return;
    }

    try {
      setUploading(true);
      setError("");
      setSuccessMessage("");
      setUploadProgress(0);

      const uploadUrlResponse = await fetch(
        "/api/auth/documents/upload-url/",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: Number(uploadClientId),
            case_id: uploadCaseId ? Number(uploadCaseId) : null,
            title: uploadTitle.trim(),
            document_type: uploadDocumentType,
            original_filename: selectedFile.name,
            file_size: selectedFile.size,
            mime_type:
              selectedFile.type || "application/octet-stream",
            description: uploadDescription.trim(),
          }),
        },
      );

      if (
        uploadUrlResponse.status === 401 ||
        uploadUrlResponse.status === 403
      ) {
        router.push("/login");
        return;
      }

      const uploadUrlData: UploadUrlResponse =
        await uploadUrlResponse.json();

      if (!uploadUrlResponse.ok || !uploadUrlData.success) {
        throw new Error(
          uploadUrlData.message ||
            "Unable to create the upload URL.",
        );
      }

      const signedUrl =
        uploadUrlData.upload?.signed_url ||
        uploadUrlData.upload_url ||
        uploadUrlData.signed_url;

      const filePath =
        uploadUrlData.upload?.path ||
        uploadUrlData.file_path ||
        uploadUrlData.path;

      if (!signedUrl) {
        throw new Error(
          "The backend did not return a signed upload URL.",
        );
      }

      if (!filePath) {
        throw new Error(
          "The backend did not return the document file path.",
        );
      }

      await uploadToSignedUrl(signedUrl, selectedFile);

      const finalizeResponse = await fetch(
        "/api/auth/documents/finalize/",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: Number(uploadClientId),
            case_id: uploadCaseId
              ? Number(uploadCaseId)
              : null,
            title: uploadTitle.trim(),
            document_type: uploadDocumentType,
            original_filename: selectedFile.name,
            file_size: selectedFile.size,
            mime_type:
              selectedFile.type || "application/octet-stream",
            description: uploadDescription.trim(),
            file_path: filePath,
          }),
        },
      );

      if (
        finalizeResponse.status === 401 ||
        finalizeResponse.status === 403
      ) {
        router.push("/login");
        return;
      }

      const finalizeData: FinalizeResponse =
        await finalizeResponse.json();

      if (!finalizeResponse.ok || !finalizeData.success) {
        throw new Error(
          finalizeData.message ||
            "The file uploaded, but the document could not be finalized.",
        );
      }

      setSuccessMessage("Document uploaded successfully.");
      setShowUploadModal(false);
      resetUploadForm();

      await loadDocuments();
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload the document.";

      setError(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleEditSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!editingDocument) {
      return;
    }

    if (!editTitle.trim()) {
      setError("Please enter a document title.");
      return;
    }

    if (!editClientId) {
      setError("Please select a client.");
      return;
    }

    try {
      setSavingEdit(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `/api/auth/documents/${editingDocument.id}/`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: editTitle.trim(),
            document_type: editDocumentType,
            client_id: Number(editClientId),
            case_id: editCaseId
              ? Number(editCaseId)
              : null,
            description: editDescription.trim(),
          }),
        },
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        router.push("/login");
        return;
      }

      const data: UpdateDocumentResponse =
        await response.json();

      if (!response.ok || !data.success) {
        const validationMessage =
          data.errors &&
          Object.values(data.errors).length > 0
            ? Object.values(data.errors)[0]
            : null;

        throw new Error(
          validationMessage ||
            data.message ||
            "Unable to update the document.",
        );
      }

      if (!data.document) {
        throw new Error(
          "The document was updated, but the server did not return the updated document.",
        );
      }

      setDocuments((currentDocuments) =>
        currentDocuments.map((item) =>
          item.id === data.document?.id
            ? data.document
            : item,
        ),
      );

      setSuccessMessage("Document updated successfully.");
      closeEditModal();
    } catch (editError) {
      const message =
        editError instanceof Error
          ? editError.message
          : "Unable to update the document.";

      setError(message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDownload(documentItem: LegalDocument) {
    try {
      setDownloadingId(documentItem.id);
      setError("");

      const response = await fetch(
        `/api/auth/documents/${documentItem.id}/download-url/`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success || !data.url) {
        throw new Error(
          data.message ||
            "Unable to create the document download URL.",
        );
      }

      const link = globalThis.document.createElement("a");

      link.href = data.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      globalThis.document.body.appendChild(link);

      link.click();
      link.remove();
    } catch (downloadError) {
      const message =
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to download the document.";

      setError(message);
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(documentItem: LegalDocument) {
    const confirmed = window.confirm(
      `Delete "${documentItem.title}"?\n\nThis will permanently remove the document from storage and the database.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(documentItem.id);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `/api/auth/documents/${documentItem.id}/`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to delete the document.",
        );
      }

      setDocuments((currentDocuments) =>
        currentDocuments.filter(
          (item) => item.id !== documentItem.id,
        ),
      );

      setSuccessMessage("Document deleted successfully.");
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete the document.";

      setError(message);
    } finally {
      setDeletingId(null);
    }
  }

  function clearFilters() {
    setSearch("");
    setClientFilter("");
    setCaseFilter("");
    setTypeFilter("");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-950 lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="flex items-center gap-3 border-b border-slate-800 px-6 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-sm font-bold text-blue-400">
                LF
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold">LawFirm</p>

                <p className="truncate text-xs text-slate-500">
                  Management System
                </p>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-6">
              <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Workspace
              </p>

              <div className="space-y-1">
                <Link
                  href="/lawyer"
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  Dashboard
                </Link>

                <Link
                  href="/lawyer#clients"
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  Clients
                </Link>

                <Link
                  href="/lawyer#cases"
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  Cases
                </Link>

                <Link
                  href="/lawyer#hearings"
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  Hearings
                </Link>

                <Link
                  href="/lawyer/documents"
                  className="block rounded-lg bg-blue-600/10 px-3 py-2.5 text-sm font-medium text-blue-400"
                >
                  Documents
                </Link>

                <Link
                  href="/lawyer#tasks"
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  Tasks
                </Link>

                <Link
                  href="/lawyer#finance"
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  Finance
                </Link>
              </div>
            </nav>

            <div className="border-t border-slate-800 p-4">
              <Link
                href="/lawyer"
                className="block rounded-lg border border-slate-800 px-3 py-2.5 text-center text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 sm:text-xs">
                Lawyer Workspace
              </p>

              <h1 className="mt-1 truncate text-lg font-semibold text-white sm:text-xl">
                Documents
              </h1>
            </div>

            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccessMessage("");
                setShowUploadModal(true);
              }}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500 sm:px-4"
            >
              <span className="hidden sm:inline">
                Upload Document
              </span>

              <span className="sm:hidden">Upload</span>
            </button>
          </header>

          <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {error && (
              <div
                role="alert"
                className="mb-5 rounded-2xl border border-red-900/60 bg-red-950/30 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-300">
                      Something went wrong
                    </p>

                    <p className="mt-1 text-sm leading-6 text-red-400/80">
                      {error}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setError("")}
                    className="self-start rounded-lg border border-red-900/60 px-3 py-2 text-xs text-red-300 transition hover:bg-red-950/50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="mb-5 rounded-2xl border border-emerald-900/60 bg-emerald-950/30 p-4"
              >
                <p className="text-sm font-medium text-emerald-300">
                  {successMessage}
                </p>
              </div>
            )}

            <div className="mb-8">
              <p className="mb-2 text-sm font-medium text-blue-400">
                Document Management
              </p>

              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Legal documents
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Store, organize, access, and manage legal
                documents associated with your clients and cases.
              </p>
            </div>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 sm:p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="xl:col-span-1">
                  <label
                    htmlFor="document-search"
                    className="mb-2 block text-xs font-medium text-slate-500"
                  >
                    Search
                  </label>

                  <input
                    id="document-search"
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Title, filename, client..."
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-blue-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="client-filter"
                    className="mb-2 block text-xs font-medium text-slate-500"
                  >
                    Client
                  </label>

                  <select
                    id="client-filter"
                    value={clientFilter}
                    onChange={(event) =>
                      setClientFilter(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-700"
                  >
                    <option value="">All clients</option>

                    {clients.map((client) => (
                      <option
                        key={client.id}
                        value={client.id}
                      >
                        {client.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="case-filter"
                    className="mb-2 block text-xs font-medium text-slate-500"
                  >
                    Case
                  </label>

                  <select
                    id="case-filter"
                    value={caseFilter}
                    onChange={(event) =>
                      setCaseFilter(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-700"
                  >
                    <option value="">All cases</option>

                    {cases.map((caseItem) => (
                      <option
                        key={caseItem.id}
                        value={caseItem.id}
                      >
                        {caseItem.case_number} —{" "}
                        {caseItem.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="type-filter"
                    className="mb-2 block text-xs font-medium text-slate-500"
                  >
                    Document type
                  </label>

                  <select
                    id="type-filter"
                    value={typeFilter}
                    onChange={(event) =>
                      setTypeFilter(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-700"
                  >
                    <option value="">All types</option>

                    {documentTypes.map((type) => (
                      <option
                        key={type.value}
                        value={type.value}
                      >
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-600">
                  {loading
                    ? "Loading documents..."
                    : `${documents.length} document${
                        documents.length === 1 ? "" : "s"
                      } found`}
                </p>

                {(search ||
                  clientFilter ||
                  caseFilter ||
                  typeFilter) && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="self-start rounded-lg border border-slate-800 px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </section>

            <section className="mt-6">
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div
                      key={item}
                      className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="h-11 w-11 rounded-xl bg-slate-800" />

                        <div className="h-5 w-16 rounded-full bg-slate-800" />
                      </div>

                      <div className="mt-5 h-4 w-3/4 rounded bg-slate-800" />

                      <div className="mt-3 h-3 w-1/2 rounded bg-slate-800" />

                      <div className="mt-5 h-3 w-full rounded bg-slate-800" />

                      <div className="mt-2 h-3 w-4/5 rounded bg-slate-800" />
                    </div>
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 px-5 py-14 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-lg font-semibold text-blue-400">
                    D
                  </div>

                  <h3 className="mt-5 text-base font-semibold text-white">
                    No documents found
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                    {search ||
                    clientFilter ||
                    caseFilter ||
                    typeFilter
                      ? "Try changing your search or filters."
                      : "Upload your first legal document to start building your document library."}
                  </p>

                  {!(
                    search ||
                    clientFilter ||
                    caseFilter ||
                    typeFilter
                  ) && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowUploadModal(true)
                      }
                      className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
                    >
                      Upload Document
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {documents.map((documentItem) => (
                    <article
                      key={documentItem.id}
                      className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition hover:border-slate-700 hover:bg-slate-900/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-[11px] font-bold text-blue-400">
                          {getFileExtension(
                            documentItem.original_filename,
                          )}
                        </div>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${getDocumentTypeClass(
                            documentItem.document_type,
                          )}`}
                        >
                          {documentItem.document_type_display ||
                            formatDocumentType(
                              documentItem.document_type,
                            )}
                        </span>
                      </div>

                      <div className="mt-5 min-w-0">
                        <h3
                          title={documentItem.title}
                          className="truncate text-base font-semibold text-white"
                        >
                          {documentItem.title}
                        </h3>

                        <p
                          title={
                            documentItem.original_filename
                          }
                          className="mt-1 truncate text-xs text-slate-600"
                        >
                          {documentItem.original_filename ||
                            "No filename"}
                        </p>
                      </div>

                      <div className="mt-5 space-y-2.5 text-xs">
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-slate-600">
                            Client
                          </span>

                          <span className="min-w-0 truncate text-right text-slate-400">
                            {documentItem.client?.full_name ||
                              "Not specified"}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-4">
                          <span className="text-slate-600">
                            Case
                          </span>

                          <span className="min-w-0 truncate text-right text-slate-400">
                            {documentItem.case
                              ? `${documentItem.case.case_number} — ${documentItem.case.title}`
                              : "Not linked"}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-4">
                          <span className="text-slate-600">
                            Size
                          </span>

                          <span className="text-right text-slate-400">
                            {formatFileSize(
                              documentItem.file_size,
                            )}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-4">
                          <span className="text-slate-600">
                            Uploaded
                          </span>

                          <span className="text-right text-slate-400">
                            {formatDate(
                              documentItem.created_at,
                            )}
                          </span>
                        </div>
                      </div>

                      {documentItem.description && (
                        <p className="mt-4 line-clamp-2 border-t border-slate-800 pt-4 text-xs leading-5 text-slate-600">
                          {documentItem.description}
                        </p>
                      )}

                      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-800 pt-4">
                        <button
                          type="button"
                          onClick={() =>
                            handleDownload(documentItem)
                          }
                          disabled={
                            downloadingId ===
                              documentItem.id ||
                            deletingId === documentItem.id
                          }
                          className="rounded-lg border border-slate-800 px-3 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {downloadingId ===
                          documentItem.id
                            ? "Opening..."
                            : "Download"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(documentItem)
                          }
                          disabled={
                            deletingId === documentItem.id
                          }
                          className="rounded-lg border border-blue-900/50 px-3 py-2.5 text-xs font-medium text-blue-400 transition hover:bg-blue-950/30 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(documentItem)
                          }
                          disabled={
                            deletingId === documentItem.id
                          }
                          className="col-span-2 rounded-lg border border-red-900/40 px-3 py-2.5 text-xs font-medium text-red-400 transition hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === documentItem.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <div className="mt-6 rounded-2xl border border-blue-900/40 bg-blue-950/20 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-300">
                    Private document storage
                  </p>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    Documents are stored in the private Supabase
                    Storage bucket. Django controls authorization
                    and generates temporary signed URLs for
                    document access.
                  </p>
                </div>

                <div className="shrink-0 rounded-full border border-emerald-900/60 bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-300">
                  Secure
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl border border-slate-800 bg-slate-950 shadow-2xl sm:max-w-2xl sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Upload document
                </h2>

                <p className="mt-1 text-xs text-slate-600">
                  Add a legal document to your workspace.
                </p>
              </div>

              <button
                type="button"
                onClick={closeUploadModal}
                disabled={uploading}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-500 transition hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close upload dialog"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleUpload}
              className="space-y-5 p-5"
            >
              <div>
                <label
                  htmlFor="document-file"
                  className="mb-2 block text-xs font-medium text-slate-400"
                >
                  Document file
                </label>

                <label
                  htmlFor="document-file"
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-5 py-8 text-center transition hover:border-blue-800 hover:bg-slate-900"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-sm font-bold text-blue-400">
                    +
                  </div>

                  {selectedFile ? (
                    <>
                      <p className="mt-4 max-w-full truncate text-sm font-medium text-white">
                        {selectedFile.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-4 text-sm font-medium text-slate-300">
                        Choose a file
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        Maximum size: 50 MB
                      </p>
                    </>
                  )}

                  <input
                    id="document-file"
                    type="file"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="sr-only"
                  />
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="upload-title"
                    className="mb-2 block text-xs font-medium text-slate-400"
                  >
                    Title
                  </label>

                  <input
                    id="upload-title"
                    type="text"
                    value={uploadTitle}
                    onChange={(event) =>
                      setUploadTitle(event.target.value)
                    }
                    placeholder="e.g. Employment Contract"
                    disabled={uploading}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-700 focus:border-blue-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="upload-type"
                    className="mb-2 block text-xs font-medium text-slate-400"
                  >
                    Document type
                  </label>

                  <select
                    id="upload-type"
                    value={uploadDocumentType}
                    onChange={(event) =>
                      setUploadDocumentType(
                        event.target.value,
                      )
                    }
                    disabled={uploading}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-700"
                  >
                    {documentTypes.map((type) => (
                      <option
                        key={type.value}
                        value={type.value}
                      >
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="upload-client"
                    className="mb-2 block text-xs font-medium text-slate-400"
                  >
                    Client
                  </label>

                  <select
                    id="upload-client"
                    value={uploadClientId}
                    onChange={handleUploadClientChange}
                    disabled={
                      uploading || loadingOptions
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-700"
                  >
                    <option value="">Select client</option>

                    {clients.map((client) => (
                      <option
                        key={client.id}
                        value={client.id}
                      >
                        {client.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="upload-case"
                    className="mb-2 block text-xs font-medium text-slate-400"
                  >
                    Case
                  </label>

                  <select
                    id="upload-case"
                    value={uploadCaseId}
                    onChange={(event) =>
                      setUploadCaseId(event.target.value)
                    }
                    disabled={
                      uploading ||
                      !uploadClientId ||
                      loadingOptions
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-700 disabled:opacity-50"
                  >
                    <option value="">
                      No case / General client document
                    </option>

                    {availableUploadCases.map((caseItem) => (
                      <option
                        key={caseItem.id}
                        value={caseItem.id}
                      >
                        {caseItem.case_number} —{" "}
                        {caseItem.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="upload-description"
                  className="mb-2 block text-xs font-medium text-slate-400"
                >
                  Description
                </label>

                <textarea
                  id="upload-description"
                  value={uploadDescription}
                  onChange={(event) =>
                    setUploadDescription(event.target.value)
                  }
                  placeholder="Optional description..."
                  rows={4}
                  disabled={uploading}
                  className="w-full resize-none rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-700 focus:border-blue-700"
                />
              </div>

              {uploading && (
                <div className="rounded-xl border border-blue-900/50 bg-blue-950/20 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-blue-300">
                      Uploading document...
                    </span>

                    <span className="text-blue-400">
                      {uploadProgress}%
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-200"
                      style={{
                        width: `${uploadProgress}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeUploadModal}
                  disabled={uploading}
                  className="rounded-lg border border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading
                    ? `Uploading ${uploadProgress}%`
                    : "Upload Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingDocument && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl border border-slate-800 bg-slate-950 shadow-2xl sm:max-w-2xl sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-white">
                  Edit document
                </h2>

                <p className="mt-1 truncate text-xs text-slate-600">
                  Update the document metadata without changing
                  the stored file.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                disabled={savingEdit}
                className="ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 text-slate-500 transition hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close edit dialog"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleEditSubmit}
              className="space-y-5 p-5"
            >
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Stored file
                </p>

                <p
                  title={editingDocument.original_filename}
                  className="mt-1 truncate text-sm text-slate-300"
                >
                  {editingDocument.original_filename ||
                    "No filename"}
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  {formatFileSize(editingDocument.file_size)} ·{" "}
                  {formatDate(editingDocument.created_at)}
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-title"
                    className="mb-2 block text-xs font-medium text-slate-400"
                  >
                    Title
                  </label>

                  <input
                    id="edit-title"
                    type="text"
                    value={editTitle}
                    onChange={(event) =>
                      setEditTitle(event.target.value)
                    }
                    placeholder="Document title"
                    disabled={savingEdit}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-700 focus:border-blue-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-type"
                    className="mb-2 block text-xs font-medium text-slate-400"
                  >
                    Document type
                  </label>

                  <select
                    id="edit-type"
                    value={editDocumentType}
                    onChange={(event) =>
                      setEditDocumentType(
                        event.target.value,
                      )
                    }
                    disabled={savingEdit}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-700"
                  >
                    {documentTypes.map((type) => (
                      <option
                        key={type.value}
                        value={type.value}
                      >
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="edit-client"
                    className="mb-2 block text-xs font-medium text-slate-400"
                  >
                    Client
                  </label>

                  <select
                    id="edit-client"
                    value={editClientId}
                    onChange={handleEditClientChange}
                    disabled={
                      savingEdit || loadingOptions
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-700"
                  >
                    <option value="">Select client</option>

                    {clients.map((client) => (
                      <option
                        key={client.id}
                        value={client.id}
                      >
                        {client.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="edit-case"
                    className="mb-2 block text-xs font-medium text-slate-400"
                  >
                    Case
                  </label>

                  <select
                    id="edit-case"
                    value={editCaseId}
                    onChange={(event) =>
                      setEditCaseId(event.target.value)
                    }
                    disabled={
                      savingEdit ||
                      !editClientId ||
                      loadingOptions
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-700 disabled:opacity-50"
                  >
                    <option value="">
                      No case / General client document
                    </option>

                    {availableEditCases.map((caseItem) => (
                      <option
                        key={caseItem.id}
                        value={caseItem.id}
                      >
                        {caseItem.case_number} —{" "}
                        {caseItem.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-description"
                  className="mb-2 block text-xs font-medium text-slate-400"
                >
                  Description
                </label>

                <textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(event) =>
                    setEditDescription(event.target.value)
                  }
                  placeholder="Optional description..."
                  rows={5}
                  disabled={savingEdit}
                  className="w-full resize-none rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-700 focus:border-blue-700"
                />
              </div>

              <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-4">
                <p className="text-xs leading-5 text-blue-300">
                  Editing metadata does not replace or re-upload
                  the physical file in Supabase Storage.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={savingEdit}
                  className="rounded-lg border border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingEdit
                    ? "Saving changes..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

