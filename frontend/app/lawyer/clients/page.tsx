"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Client = {
  id: number;
  full_name: string;
  national_id: string;
  client_type: string;
  phone: string;
  alternative_phone?: string | null;
  email?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

type RelatedCase = {
  id: number;
  case_number: string;
  title: string;
  status: string;
  priority: string;
};

type ClientDetails = Client & {
  related_cases?: RelatedCase[];
};

type ClientsResponse = {
  success?: boolean;
  clients?: Client[];
  count?: number;
  message?: string;
  error?: string;
};

type ClientDetailsResponse = {
  success?: boolean;
  client?: ClientDetails;
  message?: string;
  error?: string;
};

type ApiErrorResponse = {
  message?: string;
  detail?: string;
  error?: string;
};

type CsrfResponse = {
  success?: boolean;
  csrfToken?: string;
  message?: string;
};

type ClientForm = {
  full_name: string;
  national_id: string;
  client_type: string;
  phone: string;
  alternative_phone: string;
  email: string;
  date_of_birth: string;
  address: string;
  notes: string;
};

const emptyForm: ClientForm = {
  full_name: "",
  national_id: "",
  client_type: "individual",
  phone: "",
  alternative_phone: "",
  email: "",
  date_of_birth: "",
  address: "",
  notes: "",
};

const clientTypes = [
  {
    value: "individual",
    label: "Individual",
  },
  {
    value: "company",
    label: "Company",
  },
  {
    value: "organization",
    label: "Organization",
  },
];

function formatDate(dateString?: string | null) {
  if (!dateString) {
    return "—";
  }

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(dateString?: string | null) {
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

function formatStatus(status?: string | null) {
  if (!status) {
    return "—";
  }

  return status
    .replace(/\_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getStatusClass(status?: string | null) {
  switch (status) {
    case "active":
      return "border-emerald-900/60 bg-emerald-950/30 text-emerald-300";

    case "pending":
      return "border-yellow-900/60 bg-yellow-950/30 text-yellow-300";

    case "closed":
      return "border-slate-700 bg-slate-900 text-slate-400";

    case "archived":
      return "border-slate-700 bg-slate-900 text-slate-500";

    default:
      return "border-blue-900/60 bg-blue-950/30 text-blue-300";
  }
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return "CL";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

async function readApiError(response: Response) {
  try {
    const data: ApiErrorResponse = await response.json();

    return (
      data.message ||
      data.detail ||
      data.error ||
      `Request failed with status ${response.status}.`
    );
  } catch {
    return `Request failed with status ${response.status}.`;
  }
}

function getCookieValue(name: string) {
  if (typeof document === "undefined") {
    return "";
  }

  const cookies = document.cookie.split("; ");

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const cookieName = cookie.slice(0, separatorIndex);
    const cookieValue = cookie.slice(separatorIndex + 1);

    if (cookieName === name) {
      return decodeURIComponent(cookieValue);
    }
  }

  return "";
}

export default function ClientsPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const [search, setSearch] = useState("");
  const [clientTypeFilter, setClientTypeFilter] = useState("all");

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientDetails | null>(
    null,
  );
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const [detailsLoading, setDetailsLoading] = useState(false);

  const [form, setForm] = useState(emptyForm);

  const initializeCsrf = useCallback(async (): Promise<string> => {
    const response = await fetch("/api/auth/csrf/", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (response.status === 401) {
      router.push("/login");

      throw new Error("Your session has expired. Please log in again.");
    }

    if (!response.ok) {
      throw new Error(await readApiError(response));
    }

    const data: CsrfResponse = await response.json();

    if (!data.success || !data.csrfToken) {
      throw new Error(
        data.message || "Unable to initialize the security token.",
      );
    }

    const cookieToken = getCookieValue("csrftoken");

    if (cookieToken) {
      return cookieToken;
    }

    return data.csrfToken;
  }, [router]);

  const loadClients = useCallback(async () => {
    const response = await fetch("/api/auth/clients/", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (response.status === 401) {
      router.push("/login");
      return;
    }

    if (!response.ok) {
      throw new Error(await readApiError(response));
    }

    const data: ClientsResponse = await response.json();

    if (data.success === false) {
      throw new Error(data.message || data.error || "Unable to load clients.");
    }

    setClients(Array.isArray(data.clients) ? data.clients : []);
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function initializePage() {
      try {
        const response = await fetch("/api/auth/clients/", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (cancelled) {
          return;
        }

        if (response.status === 401) {
          router.push("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(await readApiError(response));
        }

        const data: ClientsResponse = await response.json();

        if (data.success === false) {
          throw new Error(
            data.message || data.error || "Unable to load clients.",
          );
        }

        if (!cancelled) {
          setClients(Array.isArray(data.clients) ? data.clients : []);
          setLoading(false);
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load clients.",
        );

        setLoading(false);
      }
    }

    void initializePage();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const filteredClients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesType =
        clientTypeFilter === "all" || client.client_type === clientTypeFilter;

      if (!matchesType) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        client.full_name,
        client.national_id,
        client.phone,
        client.alternative_phone || "",
        client.email || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [clients, clientTypeFilter, search]);

  function openCreateModal() {
    setEditingClient(null);
    setForm(emptyForm);
    setError("");
    setSuccessMessage("");
    setShowFormModal(true);
  }

  function openEditModal(client: Client) {
    setEditingClient(client);

    setForm({
      full_name: client.full_name || "",
      national_id: client.national_id || "",
      client_type: client.client_type || "individual",
      phone: client.phone || "",
      alternative_phone: client.alternative_phone || "",
      email: client.email || "",
      date_of_birth: client.date_of_birth || "",
      address: client.address || "",
      notes: client.notes || "",
    });

    setError("");
    setSuccessMessage("");
    setShowFormModal(true);
  }

  function closeFormModal() {
    if (saving) {
      return;
    }

    setShowFormModal(false);
    setEditingClient(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const csrfToken = await initializeCsrf();

      const payload = {
        full_name: form.full_name.trim(),
        national_id: form.national_id.trim(),
        client_type: form.client_type,
        phone: form.phone.trim(),
        alternative_phone: form.alternative_phone.trim() || null,
        email: form.email.trim() || null,
        date_of_birth: form.date_of_birth || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      };

      const url = editingClient
        ? `/api/auth/clients/${editingClient.id}/`
        : "/api/auth/clients/";

      const response = await fetch(url, {
        method: editingClient ? "PUT" : "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const data: ClientsResponse = await response.json();

      if (data.success === false) {
        throw new Error(
          data.message || data.error || "Unable to save the client.",
        );
      }

      setShowFormModal(false);
      setEditingClient(null);
      setForm(emptyForm);

      setSuccessMessage(
        editingClient
          ? "Client updated successfully."
          : "Client added successfully.",
      );

      await loadClients();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save the client.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!clientToDelete) {
      return;
    }

    setDeleting(true);
    setError("");
    setDeleteError("");
    setSuccessMessage("");

    try {
      const csrfToken = await initializeCsrf();

      const response = await fetch(`/api/auth/clients/${clientToDelete.id}/`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-CSRFToken": csrfToken,
          "X-CSRF-Token": csrfToken,
        },
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (response.status === 409) {
        const message = await readApiError(response);

        setDeleteError(message);
        return;
      }

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const data: ClientsResponse = await response.json();

      if (data.success === false) {
        throw new Error(
          data.message || data.error || "Unable to delete the client.",
        );
      }

      setShowDeleteModal(false);
      setClientToDelete(null);
      setDeleteError("");
      setSuccessMessage("Client deleted successfully.");

      await loadClients();
    } catch (deleteError) {
      setDeleteError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete the client.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function openDetails(client: Client) {
    setSelectedClient(null);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/auth/clients/${client.id}/`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const data: ClientDetailsResponse = await response.json();

      if (data.success === false) {
        throw new Error(
          data.message || data.error || "Unable to load client details.",
        );
      }

      if (!data.client) {
        throw new Error("The server did not return client details.");
      }

      setSelectedClient(data.client);
    } catch (detailsError) {
      setError(
        detailsError instanceof Error
          ? detailsError.message
          : "Unable to load client details.",
      );
      setShowDetailsModal(false);
    } finally {
      setDetailsLoading(false);
    }
  }

  function closeDetailsModal() {
    if (detailsLoading) {
      return;
    }

    setShowDetailsModal(false);
    setSelectedClient(null);
  }

  function openDeleteModal(client: Client) {
    setClientToDelete(client);
    setShowDeleteModal(true);
    setError("");
    setDeleteError("");
    setSuccessMessage("");
  }

  function closeDeleteModal() {
    if (deleting) {
      return;
    }

    setShowDeleteModal(false);
    setClientToDelete(null);
    setDeleteError("");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-950 lg:block">
          <div className="flex h-full flex-col">
            <div className="flex h-20 items-center border-b border-slate-800 px-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold">
                LF
              </div>

              <div className="ml-3 min-w-0">
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
                  href="/lawyer/clients"
                  className="block rounded-lg bg-blue-600/10 px-3 py-2.5 text-sm font-medium text-blue-400"
                >
                  Clients
                </Link>

                <Link
                  href="/lawyer/cases"
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  Cases
                </Link>

                <Link
                  href="/lawyer/hearings"
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  Hearings
                </Link>

                <Link
                  href="/lawyer/documents"
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  Documents
                </Link>

                <Link
                  href="/lawyer/tasks"
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
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 sm:text-xs">
                Lawyer Workspace
              </p>

              <h1 className="mt-1 truncate text-lg font-semibold sm:text-xl">
                Clients
              </h1>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              + Add Client
            </button>
          </header>

          <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {error && (
              <div
                role="alert"
                className="mb-6 rounded-2xl border border-red-900/60 bg-red-950/30 p-4"
              >
                <p className="text-sm font-medium text-red-300">
                  Something went wrong
                </p>

                <p className="mt-1 text-sm text-red-400/80">{error}</p>
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="mb-6 rounded-2xl border border-emerald-900/60 bg-emerald-950/30 p-4"
              >
                <p className="text-sm font-medium text-emerald-300">
                  {successMessage}
                </p>
              </div>
            )}

            <div className="mb-8">
              <p className="mb-2 text-sm font-medium text-blue-400">
                Client Management
              </p>

              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Manage your clients
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Create, review, update, and manage client information connected
                to your legal cases.
              </p>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <p className="text-sm text-slate-500">Total Clients</p>

                <p className="mt-2 text-3xl font-semibold">
                  {loading ? "—" : clients.length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <p className="text-sm text-slate-500">Individuals</p>

                <p className="mt-2 text-3xl font-semibold">
                  {loading
                    ? "—"
                    : clients.filter(
                        (client) => client.client_type === "individual",
                      ).length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <p className="text-sm text-slate-500">Organizations</p>

                <p className="mt-2 text-3xl font-semibold">
                  {loading
                    ? "—"
                    : clients.filter(
                        (client) =>
                          client.client_type === "company" ||
                          client.client_type === "organization",
                      ).length}
                </p>
              </div>
            </div>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/40">
              <div className="border-b border-slate-800 p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex-1">
                    <label htmlFor="client-search" className="sr-only">
                      Search clients
                    </label>

                    <input
                      id="client-search"
                      name="search"
                      type="search"
                      autoComplete="off"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by name, national ID, phone, or email..."
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-700"
                    />
                  </div>

                  <div className="w-full lg:w-56">
                    <label htmlFor="client-type-filter" className="sr-only">
                      Filter by client type
                    </label>

                    <select
                      id="client-type-filter"
                      name="client_type_filter"
                      value={clientTypeFilter}
                      onChange={(event) =>
                        setClientTypeFilter(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-700"
                    >
                      <option value="all">All client types</option>

                      {clientTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-left">
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Client
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Contact
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Type
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Added
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-12 text-center text-sm text-slate-500"
                        >
                          Loading clients...
                        </td>
                      </tr>
                    ) : filteredClients.length ? (
                      filteredClients.map((client) => (
                        <tr
                          key={client.id}
                          className="border-b border-slate-800/70 transition hover:bg-slate-900/60"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xs font-semibold text-blue-400">
                                {getInitials(client.full_name)}
                              </div>

                              <div>
                                <p className="text-sm font-semibold">
                                  {client.full_name}
                                </p>

                                <p className="mt-1 text-xs text-slate-600">
                                  ID: {client.national_id || "Not provided"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm text-slate-300">
                              {client.phone || "No phone"}
                            </p>

                            <p className="mt-1 text-xs text-slate-600">
                              {client.email || "No email"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full border border-blue-900/60 bg-blue-950/30 px-2.5 py-1 text-[11px] font-medium text-blue-300">
                              {formatStatus(client.client_type)}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-500">
                            {formatDateTime(client.created_at)}
                          </td>

                          <td className="px-5 py-4">
                            <Link
                              href={`/lawyer/clients/${client.id}`}
                              className="group flex w-fit items-center gap-3 rounded-xl -m-2 p-2 transition hover:bg-slate-800/60"
                              aria-label={`Open ${client.full_name} profile`}
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xs font-semibold text-blue-400 transition group-hover:border-blue-600 group-hover:bg-blue-950/30">
                                {getInitials(client.full_name)}
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-white transition group-hover:text-blue-400">
                                  {client.full_name}
                                </p>

                                <p className="mt-1 text-xs text-slate-600">
                                  ID: {client.national_id || "Not provided"}
                                </p>

                                <p className="mt-1 text-[11px] text-slate-600 opacity-0 transition group-hover:opacity-100">
                                  Open client profile →
                                </p>
                              </div>
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-5 py-16 text-center">
                          <p className="text-sm font-semibold text-slate-300">
                            No clients found
                          </p>

                          <p className="mt-2 text-sm text-slate-600">
                            Add a client or change your search filters.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </div>

      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingClient ? "Edit Client" : "Add Client"}
                </h2>

                <p className="mt-1 text-xs text-slate-600">
                  Enter the client information.
                </p>
              </div>

              <button
                type="button"
                onClick={closeFormModal}
                disabled={saving}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-900 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="client-full-name"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Full Name
                  </label>

                  <input
                    id="client-full-name"
                    name="full_name"
                    type="text"
                    autoComplete="name"
                    required
                    value={form.full_name}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        full_name: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="client-national-id"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    National ID
                  </label>

                  <input
                    id="client-national-id"
                    name="national_id"
                    type="text"
                    autoComplete="off"
                    required
                    value={form.national_id}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        national_id: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="client-type"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Client Type
                  </label>

                  <select
                    id="client-type"
                    name="client_type"
                    required
                    value={form.client_type}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        client_type: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-blue-700"
                  >
                    {clientTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="client-phone"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Phone
                  </label>

                  <input
                    id="client-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={form.phone}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        phone: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="client-alternative-phone"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Alternative Phone
                  </label>

                  <input
                    id="client-alternative-phone"
                    name="alternative_phone"
                    type="tel"
                    autoComplete="tel"
                    value={form.alternative_phone}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        alternative_phone: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="client-email"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Email
                  </label>

                  <input
                    id="client-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        email: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="client-date-of-birth"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Date of Birth
                  </label>

                  <input
                    id="client-date-of-birth"
                    name="date_of_birth"
                    type="date"
                    autoComplete="bday"
                    value={form.date_of_birth}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        date_of_birth: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-blue-700"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="client-address"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Address
                  </label>

                  <textarea
                    id="client-address"
                    name="address"
                    autoComplete="street-address"
                    rows={3}
                    value={form.address}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        address: event.target.value,
                      })
                    }
                    className="w-full resize-none rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-blue-700"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="client-notes"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Notes
                  </label>

                  <textarea
                    id="client-notes"
                    name="notes"
                    rows={4}
                    value={form.notes}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        notes: event.target.value,
                      })
                    }
                    className="w-full resize-none rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-5">
                <button
                  type="button"
                  onClick={closeFormModal}
                  disabled={saving}
                  className="rounded-lg border border-slate-800 px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingClient
                      ? "Save Changes"
                      : "Add Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <h2 className="text-lg font-semibold">Client Details</h2>

              <button
                type="button"
                onClick={closeDetailsModal}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-900 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5">
              {detailsLoading ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  Loading client details...
                </p>
              ) : selectedClient ? (
                <div className="space-y-5">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                    <h3 className="text-xl font-semibold">
                      {selectedClient.full_name}
                    </h3>

                    <p className="mt-1 text-sm text-blue-400">
                      {formatStatus(selectedClient.client_type)}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-600">National ID</p>

                      <p className="mt-1 text-sm text-slate-300">
                        {selectedClient.national_id || "Not provided"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-600">Phone</p>

                      <p className="mt-1 text-sm text-slate-300">
                        {selectedClient.phone || "Not provided"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-600">Email</p>

                      <p className="mt-1 break-all text-sm text-slate-300">
                        {selectedClient.email || "Not provided"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-600">Date of Birth</p>

                      <p className="mt-1 text-sm text-slate-300">
                        {formatDate(selectedClient.date_of_birth)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600">Address</p>

                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                      {selectedClient.address || "No address provided."}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600">Notes</p>

                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                      {selectedClient.notes || "No notes available."}
                    </p>
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-semibold">Related Cases</p>

                    {selectedClient.related_cases?.length ? (
                      <div className="space-y-2">
                        {selectedClient.related_cases.map((caseItem) => (
                          <div
                            key={caseItem.id}
                            className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
                          >
                            <p className="text-xs text-blue-400">
                              {caseItem.case_number}
                            </p>

                            <p className="mt-1 text-sm font-medium">
                              {caseItem.title}
                            </p>

                            <div className="mt-2 flex gap-2">
                              <span
                                className={`rounded-full border px-2 py-1 text-[10px] ${getStatusClass(
                                  caseItem.status,
                                )}`}
                              >
                                {formatStatus(caseItem.status)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600">
                        No related cases found.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-slate-500">
                  Unable to load client information.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-red-900/60 bg-red-950/30">
              <span className="text-xl text-red-400">!</span>
            </div>

            <h2 className="mt-4 text-lg font-semibold">
              {deleteError ? "Client cannot be deleted" : "Delete client?"}
            </h2>

            {deleteError ? (
              <>
                <div className="mt-4 rounded-xl border border-amber-900/60 bg-amber-950/20 p-4">
                  <p className="text-sm leading-6 text-amber-300">
                    {deleteError}
                  </p>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-500">
                  The client has been kept safely in the system. This protects
                  documents and other legal records associated with the client.
                </p>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    disabled={deleting}
                    className="rounded-lg border border-slate-800 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  You are about to delete{" "}
                  <span className="font-medium text-slate-300">
                    {clientToDelete.full_name}
                  </span>
                  . This action cannot be undone.
                </p>

                <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/20 p-4">
                  <p className="text-xs leading-5 text-red-300/80">
                    Clients with protected legal records cannot be deleted.
                    Documents, cases, and other related records may depend on
                    this client.
                  </p>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    disabled={deleting}
                    className="rounded-lg border border-slate-800 px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold hover:bg-red-500 disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Delete Client"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
