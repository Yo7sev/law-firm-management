
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type Client = {
  id: number;
  full_name: string;
  national_id: string;
  phone: string;
  alternative_phone: string;
  client_type: "individual" | "company";
  email: string;
  address: string;
  date_of_birth: string | null;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  cases_count: number;
};

type RelatedCase = {
  id: number;
  case_number: string;
  title: string;
  status: string;
  priority: string;
  opening_date: string;
};

type ClientDetails = Client & {
  cases: RelatedCase[];
};

type ClientsResponse = {
  success: boolean;
  clients: Client[];
  count: number;
};

type ClientDetailsResponse = {
  success: boolean;
  client: ClientDetails;
};

type ClientForm = {
  full_name: string;
  national_id: string;
  phone: string;
  alternative_phone: string;
  client_type: "individual" | "company";
  email: string;
  address: string;
  date_of_birth: string;
  notes: string;
};

const emptyForm: ClientForm = {
  full_name: "",
  national_id: "",
  phone: "",
  alternative_phone: "",
  client_type: "individual",
  email: "",
  address: "",
  date_of_birth: "",
  notes: "",
};

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getStatusClass(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";

    case "new":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";

    case "pending":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";

    case "closed":
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";

    case "archived":
      return "bg-slate-100 text-slate-500 ring-1 ring-slate-200";

    case "high":
      return "bg-orange-50 text-orange-700 ring-1 ring-orange-200";

    case "urgent":
      return "bg-red-50 text-red-700 ring-1 ring-red-200";

    case "medium":
      return "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200";

    case "low":
      return "bg-green-50 text-green-700 ring-1 ring-green-200";

    default:
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  }
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/);

  if (words.length === 0) {
    return "CL";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export default function ClientsPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState("");
  const [clientType, setClientType] = useState<
    "all" | "individual" | "company"
  >("all");

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] =
    useState<ClientDetails | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (clientType !== "all") {
        params.set("client_type", clientType);
      }

      const queryString = params.toString();

      const response = await fetch(
        `/api/auth/clients/${queryString ? `?${queryString}` : ""}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

      if (response.status === 401 || response.status === 403) {
        router.push("/login");
        return;
      }

      const data: ClientsResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          "Unable to load clients. Please try again.",
        );
      }

      setClients(data.clients || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load clients.",
      );
    } finally {
      setLoading(false);
    }
  }, [clientType, router, search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadClients();
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [loadClients]);

  const filteredClients = useMemo(() => {
    return clients;
  }, [clients]);

  function openAddModal() {
    setEditingClient(null);
    setForm(emptyForm);
    setError("");
    setSuccessMessage("");
    setShowFormModal(true);
  }

  function openEditModal(client: Client) {
    setEditingClient(client);

    setForm({
      full_name: client.full_name,
      national_id: client.national_id,
      phone: client.phone,
      alternative_phone: client.alternative_phone || "",
      client_type: client.client_type,
      email: client.email || "",
      address: client.address || "",
      date_of_birth: client.date_of_birth || "",
      notes: client.notes || "",
    });

    setError("");
    setSuccessMessage("");
    setShowFormModal(true);
  }

  async function openDetailsModal(client: Client) {
    setError("");
    setSuccessMessage("");
    setSelectedClient(null);
    setShowDetailsModal(true);

    try {
      const response = await fetch(
        `/api/auth/clients/${client.id}/`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

      if (response.status === 401 || response.status === 403) {
        router.push("/login");
        return;
      }

      const data: ClientDetailsResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          "Unable to load client details.",
        );
      }

      setSelectedClient(data.client);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load client details.",
      );
    }
  }

  function openDeleteModal(client: Client) {
    setClientToDelete(client);
    setError("");
    setSuccessMessage("");
    setShowDeleteModal(true);
  }

  function closeFormModal() {
    if (saving) {
      return;
    }

    setShowFormModal(false);
    setEditingClient(null);
    setForm(emptyForm);
    setError("");
  }

  function closeDetailsModal() {
    setShowDetailsModal(false);
    setSelectedClient(null);
    setError("");
  }

  function closeDeleteModal() {
    if (deleting) {
      return;
    }

    setShowDeleteModal(false);
    setClientToDelete(null);
    setError("");
  }

  function handleFormChange(
    field: keyof ClientForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      if (!form.full_name.trim()) {
        throw new Error("Full name is required.");
      }

      if (!form.national_id.trim()) {
        throw new Error("National ID is required.");
      }

      if (!form.phone.trim()) {
        throw new Error("Phone number is required.");
      }

      const payload = {
        full_name: form.full_name.trim(),
        national_id: form.national_id.trim(),
        phone: form.phone.trim(),
        alternative_phone: form.alternative_phone.trim(),
        client_type: form.client_type,
        email: form.email.trim(),
        address: form.address.trim(),
        date_of_birth: form.date_of_birth || null,
        notes: form.notes.trim(),
      };

      const url = editingClient
        ? `/api/auth/clients/${editingClient.id}/`
        : "/api/auth/clients/";

      const response = await fetch(url, {
        method: editingClient ? "PUT" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401 || response.status === 403) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to save the client. Please check the information and try again.",
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
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
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
    setSuccessMessage("");

    try {
      const response = await fetch(
        `/api/auth/clients/${clientToDelete.id}/`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (response.status === 401 || response.status === 403) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to delete the client.",
        );
      }

      setShowDeleteModal(false);
      setClientToDelete(null);
      setSuccessMessage("Client deleted successfully.");

      await loadClients();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete the client.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-slate-950 text-white lg:flex lg:flex-col">
          <div className="border-b border-white/10 px-6 py-6">
            <Link
              href="/lawyer"
              className="flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-950">
                LF
              </div>

              <div>
                <p className="text-sm font-semibold">
                  LawFirm
                </p>
                <p className="text-xs text-slate-400">
                  Management System
                </p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-5">
            <Link
              href="/lawyer"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <span className="text-base">⌂</span>
              Dashboard
            </Link>

            <Link
              href="/lawyer/clients"
              className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-medium text-white"
            >
              <span className="text-base">♙</span>
              Clients
            </Link>

            <Link
              href="/lawyer#cases"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <span className="text-base">▣</span>
              Cases
            </Link>

            <Link
              href="/lawyer#hearings"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <span className="text-base">◷</span>
              Hearings
            </Link>

            <Link
              href="/lawyer#documents"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <span className="text-base">▤</span>
              Documents
            </Link>

            <Link
              href="/lawyer#tasks"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <span className="text-base">✓</span>
              Tasks
            </Link>

            <Link
              href="/lawyer#finance"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <span className="text-base">₿</span>
              Finance
            </Link>
          </nav>

          <div className="border-t border-white/10 p-4">
            <Link
              href="/lawyer"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold">
                LF
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  Lawyer Workspace
                </p>
                <p className="truncate text-xs text-slate-500">
                  Return to dashboard
                </p>
              </div>
            </Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <Link
                    href="/lawyer"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 lg:hidden"
                    aria-label="Back to dashboard"
                  >
                    ←
                  </Link>

                  <div className="min-w-0">
                    <h1 className="truncate text-lg font-semibold text-slate-900 sm:text-xl">
                      Clients
                    </h1>

                    <p className="hidden text-xs text-slate-500 sm:block">
                      Manage your law firm&apos;s clients and their
                      information.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 sm:px-4"
              >
                <span className="text-base">+</span>
                <span className="hidden sm:inline">
                  Add Client
                </span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </header>

          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {successMessage && (
              <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}

            {error && !showFormModal && !showDetailsModal && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <section className="mb-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Client Directory
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Search and manage the clients available to your
                      workspace.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative min-w-0 sm:w-72">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        ⌕
                      </span>

                      <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                          setSearch(event.target.value)
                        }
                        placeholder="Search clients..."
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                      />
                    </div>

                    <select
                      value={clientType}
                      onChange={(event) =>
                        setClientType(
                          event.target.value as
                            | "all"
                            | "individual"
                            | "company",
                        )
                      }
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    >
                      <option value="all">
                        All Clients
                      </option>
                      <option value="individual">
                        Individuals
                      </option>
                      <option value="company">
                        Companies
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {filteredClients.length}{" "}
                    {filteredClients.length === 1
                      ? "client"
                      : "clients"}
                  </p>

                  <p className="text-xs text-slate-500">
                    Client records
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div
                      key={item}
                      className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white"
                    />
                  ))}
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-500">
                    ♙
                  </div>

                  <h3 className="mt-4 text-sm font-semibold text-slate-900">
                    No clients found
                  </h3>

                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                    {search || clientType !== "all"
                      ? "Try changing your search or filter."
                      : "Start by adding your first client."}
                  </p>

                  {!search && clientType === "all" && (
                    <button
                      type="button"
                      onClick={openAddModal}
                      className="mt-5 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Add Client
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredClients.map((client) => (
                    <article
                      key={client.id}
                      className="flex min-h-56 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
                            {getInitials(client.full_name)}
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-slate-900">
                              {client.full_name}
                            </h3>

                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {client.client_type === "company"
                                ? "Company"
                                : "Individual"}
                            </p>
                          </div>
                        </div>

                        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                          {client.cases_count}{" "}
                          {client.cases_count === 1
                            ? "case"
                            : "cases"}
                        </span>
                      </div>

                      <div className="mt-5 space-y-3 text-sm">
                        <div className="flex items-start gap-3">
                          <span className="w-16 shrink-0 text-xs font-medium text-slate-400">
                            ID
                          </span>

                          <span className="break-all text-slate-700">
                            {client.national_id}
                          </span>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="w-16 shrink-0 text-xs font-medium text-slate-400">
                            Phone
                          </span>

                          <span className="break-all text-slate-700">
                            {client.phone}
                          </span>
                        </div>

                        {client.email && (
                          <div className="flex items-start gap-3">
                            <span className="w-16 shrink-0 text-xs font-medium text-slate-400">
                              Email
                            </span>

                            <span className="break-all text-slate-700">
                              {client.email}
                            </span>
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          <span className="w-16 shrink-0 text-xs font-medium text-slate-400">
                            Added
                          </span>

                          <span className="text-slate-700">
                            {formatDate(client.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={() =>
                            openDetailsModal(client)
                          }
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(client)
                          }
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openDeleteModal(client)
                          }
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {editingClient
                    ? "Edit Client"
                    : "Add Client"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Enter the client&apos;s information below.
                </p>
              </div>

              <button
                type="button"
                onClick={closeFormModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="min-h-0 overflow-y-auto"
            >
              <div className="grid gap-5 px-5 py-5 sm:grid-cols-2 sm:px-6">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">
                    {error}
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Full Name *
                  </label>

                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(event) =>
                      handleFormChange(
                        "full_name",
                        event.target.value,
                      )
                    }
                    placeholder="Enter full name"
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    National ID *
                  </label>

                  <input
                    type="text"
                    value={form.national_id}
                    onChange={(event) =>
                      handleFormChange(
                        "national_id",
                        event.target.value,
                      )
                    }
                    placeholder="Enter national ID"
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Client Type *
                  </label>

                  <select
                    value={form.client_type}
                    onChange={(event) =>
                      handleFormChange(
                        "client_type",
                        event.target.value,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="individual">
                      Individual
                    </option>
                    <option value="company">
                      Company
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Phone *
                  </label>

                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      handleFormChange(
                        "phone",
                        event.target.value,
                      )
                    }
                    placeholder="Enter phone number"
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Alternative Phone
                  </label>

                  <input
                    type="tel"
                    value={form.alternative_phone}
                    onChange={(event) =>
                      handleFormChange(
                        "alternative_phone",
                        event.target.value,
                      )
                    }
                    placeholder="Optional"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Email
                  </label>

                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      handleFormChange(
                        "email",
                        event.target.value,
                      )
                    }
                    placeholder="client@example.com"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Date of Birth
                  </label>

                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(event) =>
                      handleFormChange(
                        "date_of_birth",
                        event.target.value,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Address
                  </label>

                  <textarea
                    value={form.address}
                    onChange={(event) =>
                      handleFormChange(
                        "address",
                        event.target.value,
                      )
                    }
                    placeholder="Enter client address"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Notes
                  </label>

                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      handleFormChange(
                        "notes",
                        event.target.value,
                      )
                    }
                    placeholder="Additional notes about the client"
                    rows={4}
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={closeFormModal}
                  disabled={saving}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Client Details
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Client profile and related cases.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDetailsModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
              {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {!selectedClient ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-base font-bold text-white">
                      {getInitials(
                        selectedClient.full_name,
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {selectedClient.full_name}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {selectedClient.client_type ===
                        "company"
                          ? "Company"
                          : "Individual"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">
                      Contact Information
                    </h3>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-slate-400">
                          National ID
                        </p>
                        <p className="mt-1 break-all text-sm text-slate-800">
                          {selectedClient.national_id}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-400">
                          Phone
                        </p>
                        <p className="mt-1 break-all text-sm text-slate-800">
                          {selectedClient.phone}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-400">
                          Alternative Phone
                        </p>
                        <p className="mt-1 break-all text-sm text-slate-800">
                          {selectedClient.alternative_phone ||
                            "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-400">
                          Email
                        </p>
                        <p className="mt-1 break-all text-sm text-slate-800">
                          {selectedClient.email || "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-400">
                          Date of Birth
                        </p>
                        <p className="mt-1 text-sm text-slate-800">
                          {formatDate(
                            selectedClient.date_of_birth,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-400">
                          Added
                        </p>
                        <p className="mt-1 text-sm text-slate-800">
                          {formatDateTime(
                            selectedClient.created_at,
                          )}
                        </p>
                      </div>

                      <div className="sm:col-span-2">
                        <p className="text-xs font-medium text-slate-400">
                          Address
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                          {selectedClient.address || "—"}
                        </p>
                      </div>

                      <div className="sm:col-span-2">
                        <p className="text-xs font-medium text-slate-400">
                          Notes
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                          {selectedClient.notes || "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Related Cases
                      </h3>

                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {selectedClient.cases.length}
                      </span>
                    </div>

                    {selectedClient.cases.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
                        <p className="text-sm font-medium text-slate-700">
                          No cases found
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          This client does not have any related cases yet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedClient.cases.map(
                          (relatedCase) => (
                            <div
                              key={relatedCase.id}
                              className="rounded-xl border border-slate-200 p-4"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-500">
                                    {relatedCase.case_number}
                                  </p>

                                  <h4 className="mt-1 text-sm font-semibold text-slate-900">
                                    {relatedCase.title}
                                  </h4>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusClass(
                                      relatedCase.status,
                                    )}`}
                                  >
                                    {formatStatus(
                                      relatedCase.status,
                                    )}
                                  </span>

                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusClass(
                                      relatedCase.priority,
                                    )}`}
                                  >
                                    {formatStatus(
                                      relatedCase.priority,
                                    )}
                                  </span>
                                </div>
                              </div>

                              <p className="mt-3 text-xs text-slate-500">
                                Opened{" "}
                                {formatDate(
                                  relatedCase.opening_date,
                                )}
                              </p>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={closeDetailsModal}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-lg text-red-600">
              !
            </div>

            <h2 className="mt-4 text-base font-semibold text-slate-900">
              Delete Client
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">
                {clientToDelete.full_name}
              </span>
              ? This action cannot be undone.
            </p>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="h-11 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting
                  ? "Deleting..."
                  : "Delete Client"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

