"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
};

type Client = {
  id: number;
  full_name: string;
  national_id: string;
  phone: string;
  client_type: string;
};

type CaseType = {
  id: number;
  name: string;
  description: string;
};

type AssignedLawyer = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
} | null;

type LegalCase = {
  id: number;
  case_number: string;
  title: string;
  client: {
    id: number;
    full_name: string;
  };
  client_id: number;
  case_type: {
    id: number;
    name: string;
  } | null;
  case_type_id: number | null;
  status: string;
  status_display: string;
  priority: string;
  priority_display: string;
  court: string;
  court_number: string;
  judge: string;
  opposing_party: string;
  opposing_lawyer: string;
  description: string;
  opening_date: string;
  closing_date: string | null;
  assigned_lawyer: AssignedLawyer;
  assigned_lawyer_id: number | null;
  created_at: string;
  updated_at: string;
};

type CaseForm = {
  case_number: string;
  title: string;
  client_id: string;
  case_type_id: string;
  status: string;
  priority: string;
  court: string;
  court_number: string;
  judge: string;
  opposing_party: string;
  opposing_lawyer: string;
  description: string;
  opening_date: string;
  closing_date: string;
};

const emptyForm: CaseForm = {
  case_number: "",
  title: "",
  client_id: "",
  case_type_id: "",
  status: "new",
  priority: "medium",
  court: "",
  court_number: "",
  judge: "",
  opposing_party: "",
  opposing_lawyer: "",
  description: "",
  opening_date: new Date().toISOString().split("T")[0],
  closing_date: "",
};

const statusOptions = [
  { value: "new", label: "New" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

function getInitials(firstName: string, lastName: string, email: string) {
  const first = firstName?.trim()?.charAt(0) || "";
  const last = lastName?.trim()?.charAt(0) || "";

  if (first || last) {
    return `${first}${last}`.toUpperCase();
  }

  return email.charAt(0).toUpperCase();
}

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusClasses(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20";
    case "pending":
      return "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20";
    case "closed":
      return "bg-slate-500/10 text-slate-300 ring-1 ring-slate-500/20";
    case "archived":
      return "bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20";
    default:
      return "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20";
  }
}

function getPriorityClasses(priority: string) {
  switch (priority) {
    case "urgent":
      return "bg-red-500/10 text-red-400 ring-1 ring-red-500/20";
    case "high":
      return "bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20";
    case "low":
      return "bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20";
    default:
      return "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20";
  }
}

export default function CasesPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [caseTypes, setCaseTypes] = useState<CaseType[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [caseTypeFilter, setCaseTypeFilter] = useState("");

  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editingCase, setEditingCase] = useState<LegalCase | null>(null);
  const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);
  const [form, setForm] = useState<CaseForm>(emptyForm);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const loadUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me/", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!data.authenticated) {
        router.push("/login");
        return;
      }

      setUser(data.user);
    } catch {
      setError("Unable to load your account information.");
    }
  }, [router]);

  const loadCases = useCallback(async () => {
    try {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (statusFilter) {
        params.set("status", statusFilter);
      }

      if (priorityFilter) {
        params.set("priority", priorityFilter);
      }

      if (caseTypeFilter) {
        params.set("case_type_id", caseTypeFilter);
      }

      const query = params.toString();

      const response = await fetch(
        `/api/auth/cases/${query ? `?${query}` : ""}`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load cases.");
      }

      setCases(data.cases || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load cases.",
      );
    }
  }, [caseTypeFilter, priorityFilter, router, search, statusFilter]);

  const loadClients = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/clients/", {
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load clients.");
      }

      setClients(data.clients || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load clients.",
      );
    }
  }, [router]);

  const loadCaseTypes = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/cases/types/", {
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load case types.");
      }

      setCaseTypes(data.case_types || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load case types.",
      );
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function initializePage() {
      await Promise.all([
        loadUser(),
        loadClients(),
        loadCaseTypes(),
        loadCases(),
      ]);

      if (!cancelled) {
        setLoading(false);
      }
    }

    initializePage();

    return () => {
      cancelled = true;
    };
  }, [loadCases, loadCaseTypes, loadClients, loadUser]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadCases();
    }, 300);

    return () => clearTimeout(timeout);
  }, [loadCases]);

  const visibleCases = useMemo(() => cases, [cases]);

  const activeCasesCount = useMemo(
    () => cases.filter((legalCase) => legalCase.status === "active").length,
    [cases],
  );

  const pendingCasesCount = useMemo(
    () => cases.filter((legalCase) => legalCase.status === "pending").length,
    [cases],
  );

  const urgentCasesCount = useMemo(
    () => cases.filter((legalCase) => legalCase.priority === "urgent").length,
    [cases],
  );

  function openCreateModal() {
    setEditingCase(null);
    setSelectedCase(null);

    setForm({
      ...emptyForm,
      opening_date: new Date().toISOString().split("T")[0],
    });

    setFormErrors({});
    setError("");
    setSuccess("");
    setShowFormModal(true);
  }

  function openEditModal(legalCase: LegalCase) {
    setEditingCase(legalCase);
    setSelectedCase(null);

    setForm({
      case_number: legalCase.case_number,
      title: legalCase.title,
      client_id: String(legalCase.client_id),
      case_type_id: legalCase.case_type_id
        ? String(legalCase.case_type_id)
        : "",
      status: legalCase.status,
      priority: legalCase.priority,
      court: legalCase.court,
      court_number: legalCase.court_number,
      judge: legalCase.judge,
      opposing_party: legalCase.opposing_party,
      opposing_lawyer: legalCase.opposing_lawyer,
      description: legalCase.description,
      opening_date: legalCase.opening_date,
      closing_date: legalCase.closing_date || "",
    });

    setFormErrors({});
    setError("");
    setSuccess("");
    setShowFormModal(true);
  }

  function openViewModal(legalCase: LegalCase) {
    setSelectedCase(legalCase);
    setShowViewModal(true);
  }

  function openDeleteModal(legalCase: LegalCase) {
    setSelectedCase(legalCase);
    setShowDeleteModal(true);
  }

  function closeFormModal() {
    if (saving) {
      return;
    }

    setShowFormModal(false);
    setEditingCase(null);
    setFormErrors({});
  }

  function updateForm(field: keyof CaseForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (formErrors[field]) {
      setFormErrors((current) => ({
        ...current,
        [field]: "",
      }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");
    setFormErrors({});

    const payload = {
      case_number: form.case_number.trim(),
      title: form.title.trim(),
      client_id: Number(form.client_id),
      case_type_id: form.case_type_id ? Number(form.case_type_id) : null,
      status: form.status,
      priority: form.priority,
      court: form.court.trim(),
      court_number: form.court_number.trim(),
      judge: form.judge.trim(),
      opposing_party: form.opposing_party.trim(),
      opposing_lawyer: form.opposing_lawyer.trim(),
      description: form.description.trim(),
      opening_date: form.opening_date,
      closing_date: form.closing_date || null,
    };

    try {
      const url = editingCase
        ? `/api/auth/cases/${editingCase.id}/`
        : "/api/auth/cases/";

      const response = await fetch(url, {
        method: editingCase ? "PUT" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setFormErrors(data.errors);
        }

        throw new Error(
          data.message ||
            "Unable to save the case. Please check the information.",
        );
      }

      setShowFormModal(false);
      setEditingCase(null);
      setForm(emptyForm);

      setSuccess(
        editingCase
          ? "Case updated successfully."
          : "Case created successfully.",
      );

      await loadCases();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save the case.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedCase) {
      return;
    }

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/auth/cases/${selectedCase.id}/`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete the case.");
      }

      setShowDeleteModal(false);
      setSelectedCase(null);
      setSuccess("Case deleted successfully.");

      await loadCases();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete the case.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout/", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      router.push("/login");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-950 lg:flex lg:flex-col">
          <div className="flex h-20 items-center border-b border-slate-800 px-6">
            <Link href="/lawyer" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-950">
                LF
              </div>

              <div>
                <p className="text-sm font-semibold text-white">LawFirm</p>

                <p className="text-xs text-slate-500">Management System</p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            <Link
              href="/lawyer"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              <span>⌂</span>
              Dashboard
            </Link>

            <Link
              href="/lawyer/clients"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              <span>♙</span>
              Clients
            </Link>

            <Link
              href="/lawyer/cases"
              className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950"
            >
              <span>▣</span>
              Cases
            </Link>

            <Link
              href="/lawyer#hearings"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              <span>◷</span>
              Hearings
            </Link>

            <Link
              href="/lawyer#documents"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              <span>□</span>
              Documents
            </Link>

            <Link
              href="/lawyer#tasks"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              <span>✓</span>
              Tasks
            </Link>

            <Link
              href="/lawyer#finance"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              <span>$</span>
              Finance
            </Link>
          </nav>

          <div className="border-t border-slate-800 p-4">
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-900 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">
                {user
                  ? getInitials(user.first_name, user.last_name, user.email)
                  : "U"}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {user?.first_name || user?.email || "User"}
                </p>

                <p className="truncate text-xs text-slate-500">
                  {user?.role || "Lawyer"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-xl px-4 py-2.5 text-left text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
            >
              Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="border-b border-slate-800 bg-slate-950/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div>
                <Link
                  href="/lawyer"
                  className="text-xs text-slate-500 transition hover:text-slate-300 lg:hidden"
                >
                  ← Dashboard
                </Link>

                <h1 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                  Cases
                </h1>

                <p className="mt-1 hidden text-sm text-slate-500 sm:block">
                  Manage your firm&apos;s legal cases and case information.
                </p>
              </div>

              <button
                type="button"
                onClick={openCreateModal}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                <span className="text-lg leading-none">+</span>

                <span className="hidden sm:inline">New Case</span>

                <span className="sm:hidden">New</span>
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
            {error && (
              <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <p>{error}</p>

                <button
                  type="button"
                  onClick={() => setError("")}
                  className="shrink-0 text-red-300 hover:text-white"
                  aria-label="Dismiss error"
                >
                  ×
                </button>
              </div>
            )}

            {success && (
              <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                <p>{success}</p>

                <button
                  type="button"
                  onClick={() => setSuccess("")}
                  className="shrink-0 text-emerald-300 hover:text-white"
                  aria-label="Dismiss success message"
                >
                  ×
                </button>
              </div>
            )}

            <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Total Cases
                </p>

                <p className="mt-2 text-2xl font-semibold text-white">
                  {cases.length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Active
                </p>

                <p className="mt-2 text-2xl font-semibold text-emerald-400">
                  {activeCasesCount}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Pending
                </p>

                <p className="mt-2 text-2xl font-semibold text-amber-400">
                  {pendingCasesCount}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Urgent
                </p>

                <p className="mt-2 text-2xl font-semibold text-red-400">
                  {urgentCasesCount}
                </p>
              </div>
            </section>

            <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_200px]">
                <div className="relative">
                  <label htmlFor="case-search" className="sr-only">
                    Search cases
                  </label>

                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    ⌕
                  </span>

                  <input
                    id="case-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search case number, title, client, court..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-10 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-slate-500"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-slate-500"
                  aria-label="Filter by status"
                >
                  <option value="">All statuses</option>

                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-slate-500"
                  aria-label="Filter by priority"
                >
                  <option value="">All priorities</option>

                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={caseTypeFilter}
                  onChange={(event) => setCaseTypeFilter(event.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-slate-500"
                  aria-label="Filter by case type"
                >
                  <option value="">All case types</option>

                  {caseTypes.map((caseType) => (
                    <option key={caseType.id} value={caseType.id}>
                      {caseType.name}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section>
              {loading ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-white" />

                  <p className="mt-4 text-sm text-slate-500">
                    Loading cases...
                  </p>
                </div>
              ) : visibleCases.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-xl text-slate-400">
                    ▣
                  </div>

                  <h2 className="mt-5 text-lg font-semibold text-white">
                    No cases found
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                    {search || statusFilter || priorityFilter || caseTypeFilter
                      ? "Try changing your search or filters."
                      : "Create your first legal case to start managing your case records."}
                  </p>

                  {!(
                    search ||
                    statusFilter ||
                    priorityFilter ||
                    caseTypeFilter
                  ) && (
                    <button
                      type="button"
                      onClick={openCreateModal}
                      className="mt-6 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-200"
                    >
                      Create First Case
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 lg:block">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1000px]">
                        <thead>
                          <tr className="border-b border-slate-800 text-left">
                            <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                              Case
                            </th>

                            <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                              Client
                            </th>

                            <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                              Status
                            </th>

                            <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                              Priority
                            </th>

                            <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                              Court
                            </th>

                            <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                              Opening Date
                            </th>

                            <th className="px-5 py-4 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                              Actions
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-800">
                          {visibleCases.map((legalCase) => (
                            <tr
                              key={legalCase.id}
                              className="transition hover:bg-slate-900"
                            >
                              <td className="px-5 py-4">
                                <button
                                  type="button"
                                  onClick={() => openViewModal(legalCase)}
                                  className="text-left"
                                >
                                  <p className="text-sm font-semibold text-white hover:text-slate-300">
                                    {legalCase.case_number}
                                  </p>

                                  <p className="mt-1 max-w-[260px] truncate text-xs text-slate-500">
                                    {legalCase.title}
                                  </p>
                                </button>
                              </td>

                              <td className="px-5 py-4">
                                <Link
                                  href={`/lawyer/clients/${legalCase.client_id}`}
                                  className="text-sm text-slate-300 transition hover:text-white hover:underline"
                                >
                                  {legalCase.client.full_name}
                                </Link>

                                <p className="mt-1 text-xs text-slate-600">
                                  {legalCase.case_type?.name || "No case type"}
                                </p>
                              </td>

                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                                    legalCase.status,
                                  )}`}
                                >
                                  {legalCase.status_display}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getPriorityClasses(
                                    legalCase.priority,
                                  )}`}
                                >
                                  {legalCase.priority_display}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <p className="max-w-[180px] truncate text-sm text-slate-300">
                                  {legalCase.court || "—"}
                                </p>

                                {legalCase.court_number && (
                                  <p className="mt-1 text-xs text-slate-600">
                                    No. {legalCase.court_number}
                                  </p>
                                )}
                              </td>

                              <td className="px-5 py-4 text-sm text-slate-400">
                                {formatDate(legalCase.opening_date)}
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openViewModal(legalCase)}
                                    className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
                                  >
                                    View
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openEditModal(legalCase)}
                                    className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openDeleteModal(legalCase)}
                                    className="rounded-lg px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-3 lg:hidden">
                    {visibleCases.map((legalCase) => (
                      <article
                        key={legalCase.id}
                        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => openViewModal(legalCase)}
                            className="min-w-0 text-left"
                          >
                            <p className="text-sm font-semibold text-white">
                              {legalCase.case_number}
                            </p>

                            <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                              {legalCase.title}
                            </p>
                          </button>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                              legalCase.status,
                            )}`}
                          >
                            {legalCase.status_display}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-600">
                              Client
                            </p>

                            <Link
                              href={`/lawyer/clients/${legalCase.client_id}`}
                              className="mt-1 block truncate text-sm text-slate-300 transition hover:text-white hover:underline"
                            >
                              {legalCase.client.full_name}
                            </Link>
                          </div>

                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-600">
                              Priority
                            </p>

                            <span
                              className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getPriorityClasses(
                                legalCase.priority,
                              )}`}
                            >
                              {legalCase.priority_display}
                            </span>
                          </div>

                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-600">
                              Court
                            </p>

                            <p className="mt-1 truncate text-sm text-slate-300">
                              {legalCase.court || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-600">
                              Opening Date
                            </p>

                            <p className="mt-1 text-sm text-slate-300">
                              {formatDate(legalCase.opening_date)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2 border-t border-slate-800 pt-4">
                          <button
                            type="button"
                            onClick={() => openViewModal(legalCase)}
                            className="flex-1 rounded-lg bg-slate-800 px-3 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(legalCase)}
                            className="flex-1 rounded-lg bg-slate-800 px-3 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeleteModal(legalCase)}
                            className="flex-1 rounded-lg bg-red-500/10 px-3 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/20"
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        </main>
      </div>

      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-slate-800 bg-slate-950 shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editingCase ? "Edit Case" : "Create New Case"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {editingCase
                    ? "Update the legal case information below."
                    : "Enter the legal case information below."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeFormModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-500 hover:bg-slate-800 hover:text-white"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Basic Information
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Core information used to identify the case.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="case_number"
                        className="mb-2 block text-xs font-medium text-slate-400"
                      >
                        Case Number *
                      </label>

                      <input
                        id="case_number"
                        type="text"
                        value={form.case_number}
                        onChange={(event) =>
                          updateForm("case_number", event.target.value)
                        }
                        placeholder="e.g. 2026/001"
                        className={`w-full rounded-xl border bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-slate-500 ${
                          formErrors.case_number
                            ? "border-red-500/60"
                            : "border-slate-700"
                        }`}
                      />

                      {formErrors.case_number && (
                        <p className="mt-1.5 text-xs text-red-400">
                          {formErrors.case_number}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="title"
                        className="mb-2 block text-xs font-medium text-slate-400"
                      >
                        Case Title *
                      </label>

                      <input
                        id="title"
                        type="text"
                        value={form.title}
                        onChange={(event) =>
                          updateForm("title", event.target.value)
                        }
                        placeholder="Enter case title"
                        className={`w-full rounded-xl border bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-slate-500 ${
                          formErrors.title
                            ? "border-red-500/60"
                            : "border-slate-700"
                        }`}
                      />

                      {formErrors.title && (
                        <p className="mt-1.5 text-xs text-red-400">
                          {formErrors.title}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="client_id"
                        className="mb-2 block text-xs font-medium text-slate-400"
                      >
                        Client *
                      </label>

                      <select
                        id="client_id"
                        value={form.client_id}
                        onChange={(event) =>
                          updateForm("client_id", event.target.value)
                        }
                        className={`w-full rounded-xl border bg-slate-900 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-slate-500 ${
                          formErrors.client_id
                            ? "border-red-500/60"
                            : "border-slate-700"
                        }`}
                      >
                        <option value="">Select a client</option>

                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.full_name} — {client.national_id}
                          </option>
                        ))}
                      </select>

                      {formErrors.client_id && (
                        <p className="mt-1.5 text-xs text-red-400">
                          {formErrors.client_id}
                        </p>
                      )}

                      {clients.length === 0 && (
                        <p className="mt-1.5 text-xs text-amber-400">
                          No clients are available. Create a client first.
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="case_type_id"
                        className="mb-2 block text-xs font-medium text-slate-400"
                      >
                        Case Type
                      </label>

                      <select
                        id="case_type_id"
                        value={form.case_type_id}
                        onChange={(event) =>
                          updateForm("case_type_id", event.target.value)
                        }
                        className={`w-full rounded-xl border bg-slate-900 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-slate-500 ${
                          formErrors.case_type_id
                            ? "border-red-500/60"
                            : "border-slate-700"
                        }`}
                      >
                        <option value="">Select case type</option>

                        {caseTypes.map((caseType) => (
                          <option key={caseType.id} value={caseType.id}>
                            {caseType.name}
                          </option>
                        ))}
                      </select>

                      {formErrors.case_type_id && (
                        <p className="mt-1.5 text-xs text-red-400">
                          {formErrors.case_type_id}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="status"
                        className="mb-2 block text-xs font-medium text-slate-400"
                      >
                        Status
                      </label>

                      <select
                        id="status"
                        value={form.status}
                        onChange={(event) =>
                          updateForm("status", event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-slate-500"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="priority"
                        className="mb-2 block text-xs font-medium text-slate-400"
                      >
                        Priority
                      </label>

                      <select
                        id="priority"
                        value={form.priority}
                        onChange={(event) =>
                          updateForm("priority", event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-slate-500"
                      >
                        {priorityOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-6">
                    <h3 className="text-sm font-semibold text-white">
                      Court Information
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Court and judicial information related to this case.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="court"
                        className="mb-2 block text-xs font-medium text-slate-400"
                      >
                        Court
                      </label>

                      <input
                        id="court"
                        type="text"
                        value={form.court}
                        onChange={(event) =>
                          updateForm("court", event.target.value)
                        }
                        placeholder="e.g. Amman Court of First Instance"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-slate-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="court_number"
                        className="mb-2 block text-xs font-medium text-slate-400"
                      >
                        Court / Case Number
                      </label>

                      <input
                        id="court_number"
                        type="text"
                        value={form.court_number}
                        onChange={(event) =>
                          updateForm("court_number", event.target.value)
                        }
                        placeholder="Enter court number"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-slate-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="judge"
                        className="mb-2 block text-xs font-medium text-slate-400"
                      >
                        Judge
                      </label>

                      <input
                        id="judge"
                        type="text"
                        value={form.judge}
                        onChange={(event) =>
                          updateForm("judge", event.target.value)
                        }
                        placeholder="Judge name"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-slate-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="opposing_party"
                        className="mb-2 block text-xs font-medium text-slate-400"
                      >
                        Opposing Party
                      </label>

                      <input
                        id="opposing_party"
                        type="text"
                        value={form.opposing_party}
                        onChange={(event) =>
                          updateForm("opposing_party", event.target.value)
                        }
                        placeholder="Opposing party name"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-slate-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="opposing_lawyer"
                        className="mb-2 block text-xs font-medium text-slate-400"
                      >
                        Opposing Lawyer
                      </label>

                      <input
                        id="opposing_lawyer"
                        type="text"
                        value={form.opposing_lawyer}
                        onChange={(event) =>
                          updateForm("opposing_lawyer", event.target.value)
                        }
                        placeholder="Opposing lawyer name"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-slate-500"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-6">
                    <h3 className="text-sm font-semibold text-white">
                      Dates & Assignment
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Record when the case was opened and, if applicable,
                      closed.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="opening_date"
                        className="mb-2 block text-xs font-medium text-slate-400"
                      >
                        Opening Date *
                      </label>

                      <input
                        id="opening_date"
                        type="date"
                        value={form.opening_date}
                        onChange={(event) =>
                          updateForm("opening_date", event.target.value)
                        }
                        className={`w-full rounded-xl border bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-slate-500 ${
                          formErrors.opening_date
                            ? "border-red-500/60"
                            : "border-slate-700"
                        }`}
                      />

                      {formErrors.opening_date && (
                        <p className="mt-1.5 text-xs text-red-400">
                          {formErrors.opening_date}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="closing_date"
                        className="mb-2 block text-xs font-medium text-slate-400"
                      >
                        Closing Date
                      </label>

                      <input
                        id="closing_date"
                        type="date"
                        value={form.closing_date}
                        onChange={(event) =>
                          updateForm("closing_date", event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-slate-500"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Assigned Lawyer
                    </p>

                    <p className="mt-2 text-sm text-slate-200">
                      {editingCase?.assigned_lawyer
                        ? `${editingCase.assigned_lawyer.first_name} ${editingCase.assigned_lawyer.last_name}`.trim() ||
                          editingCase.assigned_lawyer.email
                        : user?.first_name || user?.email || "Current user"}
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      New cases created by a lawyer are automatically assigned
                      to the current lawyer.
                    </p>
                  </div>

                  <div className="border-t border-slate-800 pt-6">
                    <h3 className="text-sm font-semibold text-white">
                      Description
                    </h3>

                    <textarea
                      id="description"
                      value={form.description}
                      onChange={(event) =>
                        updateForm("description", event.target.value)
                      }
                      rows={5}
                      placeholder="Enter a description or summary of the case..."
                      className="mt-4 w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-800 bg-slate-950 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={closeFormModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || clients.length === 0}
                  className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingCase
                      ? "Save Changes"
                      : "Create Case"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && selectedCase && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-slate-800 bg-slate-950 shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-white">
                    {selectedCase.case_number}
                  </h2>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                      selectedCase.status,
                    )}`}
                  >
                    {selectedCase.status_display}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-400">
                  {selectedCase.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl text-slate-500 hover:bg-slate-800 hover:text-white"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    Client
                  </p>

                  <p className="mt-2 text-sm font-medium text-white">
                    {selectedCase.client.full_name}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    Case Type
                  </p>

                  <p className="mt-2 text-sm font-medium text-white">
                    {selectedCase.case_type?.name || "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    Priority
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getPriorityClasses(
                      selectedCase.priority,
                    )}`}
                  >
                    {selectedCase.priority_display}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    Assigned Lawyer
                  </p>

                  <p className="mt-2 text-sm font-medium text-white">
                    {selectedCase.assigned_lawyer
                      ? `${selectedCase.assigned_lawyer.first_name} ${selectedCase.assigned_lawyer.last_name}`.trim() ||
                        selectedCase.assigned_lawyer.email
                      : "Unassigned"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    Court
                  </p>

                  <p className="mt-2 text-sm text-slate-300">
                    {selectedCase.court || "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    Court Number
                  </p>

                  <p className="mt-2 text-sm text-slate-300">
                    {selectedCase.court_number || "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    Judge
                  </p>

                  <p className="mt-2 text-sm text-slate-300">
                    {selectedCase.judge || "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    Opening Date
                  </p>

                  <p className="mt-2 text-sm text-slate-300">
                    {formatDate(selectedCase.opening_date)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    Closing Date
                  </p>

                  <p className="mt-2 text-sm text-slate-300">
                    {formatDate(selectedCase.closing_date)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    Opposing Party
                  </p>

                  <p className="mt-2 text-sm text-slate-300">
                    {selectedCase.opposing_party || "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    Opposing Lawyer
                  </p>

                  <p className="mt-2 text-sm text-slate-300">
                    {selectedCase.opposing_lawyer || "—"}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-600">
                  Description
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {selectedCase.description || "No description provided."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-900"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  openEditModal(selectedCase);
                }}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-200"
              >
                Edit Case
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-xl text-red-400">
              !
            </div>

            <h2 className="mt-5 text-lg font-semibold text-white">
              Delete Case?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              You are about to delete case{" "}
              <span className="font-medium text-slate-300">
                {selectedCase.case_number}
              </span>
              . This action cannot be undone.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedCase(null);
                }}
                disabled={deleting}
                className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-900 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Case"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
