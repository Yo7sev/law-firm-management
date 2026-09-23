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

type LegalCase = {
  id: number;
  case_number: string;
  title: string;
  client: {
    id: number;
    full_name: string;
  };
};

type Hearing = {
  id: number;
  case: {
    id: number;
    case_number: string;
    title: string;
  };
  case_id: number;
  client: {
    id: number;
    full_name: string;
  };
  hearing_date: string;
  hearing_time: string | null;
  court: string;
  judge: string;
  purpose: string;
  result: string;
  next_action: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

type HearingForm = {
  case_id: string;
  hearing_date: string;
  hearing_time: string;
  court: string;
  judge: string;
  purpose: string;
  result: string;
  next_action: string;
  notes: string;
};

const emptyForm: HearingForm = {
  case_id: "",
  hearing_date: new Date().toISOString().split("T")[0],
  hearing_time: "",
  court: "",
  judge: "",
  purpose: "",
  result: "",
  next_action: "",
  notes: "",
};

function getInitials(firstName: string, lastName: string, email: string) {
  const first = firstName?.trim()?.charAt(0) || "";
  const last = lastName?.trim()?.charAt(0) || "";

  if (first || last) {
    return `${first}${last}`.toUpperCase();
  }

  return email.charAt(0).toUpperCase();
}

function parseDate(date: string) {
  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  const parsedDate = parseDate(date);

  if (!parsedDate) {
    return date;
  }

  return parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatLongDate(date: string) {
  const parsedDate = parseDate(date);

  if (!parsedDate) {
    return date;
  }

  return parsedDate.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(time: string | null) {
  if (!time) {
    return "Time not specified";
  }

  const [hours, minutes] = time.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time;
  }

  const date = new Date();

  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function isToday(date: string) {
  const parsedDate = parseDate(date);

  if (!parsedDate) {
    return false;
  }

  const today = new Date();

  return (
    parsedDate.getFullYear() === today.getFullYear() &&
    parsedDate.getMonth() === today.getMonth() &&
    parsedDate.getDate() === today.getDate()
  );
}

function isTomorrow(date: string) {
  const parsedDate = parseDate(date);

  if (!parsedDate) {
    return false;
  }

  const tomorrow = new Date();

  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    parsedDate.getFullYear() === tomorrow.getFullYear() &&
    parsedDate.getMonth() === tomorrow.getMonth() &&
    parsedDate.getDate() === tomorrow.getDate()
  );
}

function getDateLabel(date: string) {
  if (isToday(date)) {
    return "Today";
  }

  if (isTomorrow(date)) {
    return "Tomorrow";
  }

  return formatDate(date);
}

function getDayNumber(date: string) {
  const parsedDate = parseDate(date);

  if (!parsedDate) {
    return "—";
  }

  return parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
  });
}

function getMonthShort(date: string) {
  const parsedDate = parseDate(date);

  if (!parsedDate) {
    return "";
  }

  return parsedDate.toLocaleDateString("en-GB", {
    month: "short",
  });
}

export default function HearingsPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [cases, setCases] = useState<LegalCase[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [caseFilter, setCaseFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editingHearing, setEditingHearing] = useState<Hearing | null>(null);

  const [selectedHearing, setSelectedHearing] = useState<Hearing | null>(null);

  const [form, setForm] = useState<HearingForm>(emptyForm);

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
      const response = await fetch("/api/auth/cases/", {
        credentials: "include",
        cache: "no-store",
      });

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
  }, [router]);

  const loadHearings = useCallback(async () => {
    try {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (caseFilter) {
        params.set("case_id", caseFilter);
      }

      if (dateFrom) {
        params.set("date_from", dateFrom);
      }

      if (dateTo) {
        params.set("date_to", dateTo);
      }

      const query = params.toString();

      const response = await fetch(
        `/api/auth/hearings/${query ? `?${query}` : ""}`,
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
        throw new Error(data.message || "Unable to load hearings.");
      }

      setHearings(data.hearings || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load hearings.",
      );
    }
  }, [caseFilter, dateFrom, dateTo, router, search]);

  useEffect(() => {
    let cancelled = false;

    async function initializePage() {
      await Promise.all([loadUser(), loadCases(), loadHearings()]);

      if (!cancelled) {
        setLoading(false);
      }
    }

    initializePage();

    return () => {
      cancelled = true;
    };
  }, [loadCases, loadHearings, loadUser]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadHearings();
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [loadHearings]);

  const upcomingHearings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return [...hearings]
      .filter((hearing) => {
        const date = parseDate(hearing.hearing_date);

        return date && date >= today;
      })
      .sort((a, b) => {
        const dateA = parseDate(a.hearing_date);

        const dateB = parseDate(b.hearing_date);

        if (!dateA || !dateB) {
          return 0;
        }

        const timeA = a.hearing_time || "23:59";

        const timeB = b.hearing_time || "23:59";

        return `${a.hearing_date}T${timeA}`.localeCompare(
          `${b.hearing_date}T${timeB}`,
        );
      })
      .slice(0, 5);
  }, [hearings]);

  const todayCount = useMemo(
    () => hearings.filter((hearing) => isToday(hearing.hearing_date)).length,
    [hearings],
  );

  const upcomingCount = useMemo(
    () => upcomingHearings.length,
    [upcomingHearings],
  );

  const unscheduledTimeCount = useMemo(
    () => hearings.filter((hearing) => !hearing.hearing_time).length,
    [hearings],
  );

  function openCreateModal() {
    setEditingHearing(null);
    setSelectedHearing(null);
    setForm({
      ...emptyForm,
      hearing_date: new Date().toISOString().split("T")[0],
    });
    setFormErrors({});
    setError("");
    setSuccess("");
    setShowFormModal(true);
  }

  function openEditModal(hearing: Hearing) {
    setEditingHearing(hearing);
    setSelectedHearing(null);

    setForm({
      case_id: String(hearing.case_id),
      hearing_date: hearing.hearing_date,
      hearing_time: hearing.hearing_time || "",
      court: hearing.court,
      judge: hearing.judge,
      purpose: hearing.purpose,
      result: hearing.result,
      next_action: hearing.next_action,
      notes: hearing.notes,
    });

    setFormErrors({});
    setError("");
    setSuccess("");
    setShowFormModal(true);
  }

  function openViewModal(hearing: Hearing) {
    setSelectedHearing(hearing);
    setShowViewModal(true);
  }

  function openDeleteModal(hearing: Hearing) {
    setSelectedHearing(hearing);
    setShowDeleteModal(true);
  }

  function closeFormModal() {
    if (saving) {
      return;
    }

    setShowFormModal(false);
    setEditingHearing(null);
    setFormErrors({});
  }

  function updateForm(field: keyof HearingForm, value: string) {
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

  function clearFilters() {
    setSearch("");
    setCaseFilter("");
    setDateFrom("");
    setDateTo("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");
    setFormErrors({});

    const payload = {
      case_id: Number(form.case_id),
      hearing_date: form.hearing_date,
      hearing_time: form.hearing_time || null,
      court: form.court.trim(),
      judge: form.judge.trim(),
      purpose: form.purpose.trim(),
      result: form.result.trim(),
      next_action: form.next_action.trim(),
      notes: form.notes.trim(),
    };

    try {
      const url = editingHearing
        ? `/api/auth/hearings/${editingHearing.id}/`
        : "/api/auth/hearings/";

      const response = await fetch(url, {
        method: editingHearing ? "PUT" : "POST",
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

        throw new Error(data.message || "Unable to save the hearing.");
      }

      setShowFormModal(false);
      setEditingHearing(null);
      setForm(emptyForm);

      setSuccess(
        editingHearing
          ? "Hearing updated successfully."
          : "Hearing created successfully.",
      );

      await loadHearings();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save the hearing.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedHearing) {
      return;
    }

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/auth/hearings/${selectedHearing.id}/`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete the hearing.");
      }

      setShowDeleteModal(false);
      setSelectedHearing(null);
      setSuccess("Hearing deleted successfully.");

      await loadHearings();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete the hearing.",
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
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              <span>▣</span>
              Cases
            </Link>

            <Link
              href="/lawyer/hearings"
              className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950"
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
                  Hearings
                </h1>

                <p className="mt-1 hidden text-sm text-slate-500 sm:block">
                  Track court hearings, outcomes, and next actions.
                </p>
              </div>

              <button
                type="button"
                onClick={openCreateModal}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                <span className="text-lg leading-none">+</span>

                <span className="hidden sm:inline">New Hearing</span>

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
                  Total
                </p>

                <p className="mt-2 text-2xl font-semibold text-white">
                  {hearings.length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Today
                </p>

                <p className="mt-2 text-2xl font-semibold text-blue-400">
                  {todayCount}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Upcoming
                </p>

                <p className="mt-2 text-2xl font-semibold text-emerald-400">
                  {upcomingCount}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  No Time Set
                </p>

                <p className="mt-2 text-2xl font-semibold text-amber-400">
                  {unscheduledTimeCount}
                </p>
              </div>
            </section>

            <section className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    Upcoming Hearings
                  </h2>

                  <p className="mt-1 text-xs text-slate-600">
                    Your next scheduled court appearances.
                  </p>
                </div>

                {upcomingHearings.length > 0 && (
                  <span className="text-xs text-slate-600">
                    Next {upcomingHearings.length}
                  </span>
                )}
              </div>

              {upcomingHearings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-lg text-slate-400">
                    ◷
                  </div>

                  <p className="mt-4 text-sm font-medium text-white">
                    No upcoming hearings
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    Upcoming hearings will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {upcomingHearings.map((hearing) => (
                    <button
                      key={hearing.id}
                      type="button"
                      onClick={() => openViewModal(hearing)}
                      className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left transition hover:border-slate-700 hover:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-800">
                          <span className="text-lg font-semibold leading-none text-white">
                            {getDayNumber(hearing.hearing_date)}
                          </span>

                          <span className="mt-1 text-[10px] uppercase text-slate-500">
                            {getMonthShort(hearing.hearing_date)}
                          </span>
                        </div>

                        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-400">
                          {getDateLabel(hearing.hearing_date)}
                        </span>
                      </div>

                      <p className="mt-4 truncate text-xs font-medium text-slate-500">
                        {hearing.case.case_number}
                      </p>

                      <p className="mt-1 line-clamp-2 text-sm font-semibold text-white">
                        {hearing.purpose}
                      </p>

                      <p className="mt-3 truncate text-xs text-slate-500">
                        {hearing.court || "Court not specified"}
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        {formatTime(hearing.hearing_time)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_170px_170px_auto]">
                <div className="relative">
                  <label htmlFor="hearing-search" className="sr-only">
                    Search hearings
                  </label>

                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    ⌕
                  </span>

                  <input
                    id="hearing-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search case, client, court, judge, purpose..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-10 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-slate-500"
                  />
                </div>

                <select
                  value={caseFilter}
                  onChange={(event) => setCaseFilter(event.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-slate-500"
                  aria-label="Filter by case"
                >
                  <option value="">All cases</option>

                  {cases.map((legalCase) => (
                    <option key={legalCase.id} value={legalCase.id}>
                      {legalCase.case_number} — {legalCase.title}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-slate-500"
                  aria-label="Date from"
                />

                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-slate-500"
                  aria-label="Date to"
                />

                {(search || caseFilter || dateFrom || dateTo) && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
            </section>

            <section>
              {loading ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-white" />

                  <p className="mt-4 text-sm text-slate-500">
                    Loading hearings...
                  </p>
                </div>
              ) : hearings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-xl text-slate-400">
                    ◷
                  </div>

                  <h2 className="mt-5 text-lg font-semibold text-white">
                    No hearings found
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                    {search || caseFilter || dateFrom || dateTo
                      ? "Try changing your search or filters."
                      : "Create your first hearing to start tracking court appearances."}
                  </p>

                  {!(search || caseFilter || dateFrom || dateTo) && (
                    <button
                      type="button"
                      onClick={openCreateModal}
                      className="mt-6 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-200"
                    >
                      Create First Hearing
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 lg:block">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1050px]">
                        <thead>
                          <tr className="border-b border-slate-800 text-left">
                            <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                              Date & Time
                            </th>

                            <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                              Case
                            </th>

                            <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                              Purpose
                            </th>

                            <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                              Court
                            </th>

                            <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                              Judge
                            </th>

                            <th className="px-5 py-4 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                              Actions
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-800">
                          {hearings.map((hearing) => (
                            <tr
                              key={hearing.id}
                              className="transition hover:bg-slate-900"
                            >
                              <td className="px-5 py-4">
                                <button
                                  type="button"
                                  onClick={() => openViewModal(hearing)}
                                  className="text-left"
                                >
                                  <p className="text-sm font-semibold text-white">
                                    {getDateLabel(hearing.hearing_date)}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {formatTime(hearing.hearing_time)}
                                  </p>
                                </button>
                              </td>

                              <td className="px-5 py-4">
                                <p className="text-sm font-semibold text-white">
                                  {hearing.case.case_number}
                                </p>

                                <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">
                                  {hearing.case.title}
                                </p>

                                <p className="mt-1 max-w-[220px] truncate text-xs text-slate-600">
                                  {hearing.client.full_name}
                                </p>
                              </td>

                              <td className="px-5 py-4">
                                <p className="max-w-[220px] text-sm text-slate-300">
                                  {hearing.purpose}
                                </p>
                              </td>

                              <td className="px-5 py-4">
                                <p className="max-w-[180px] truncate text-sm text-slate-300">
                                  {hearing.court || "—"}
                                </p>
                              </td>

                              <td className="px-5 py-4">
                                <p className="max-w-[180px] truncate text-sm text-slate-300">
                                  {hearing.judge || "—"}
                                </p>
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openViewModal(hearing)}
                                    className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
                                  >
                                    View
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openEditModal(hearing)}
                                    className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openDeleteModal(hearing)}
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
                    {hearings.map((hearing) => (
                      <article
                        key={hearing.id}
                        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-800">
                            <span className="text-lg font-semibold leading-none text-white">
                              {getDayNumber(hearing.hearing_date)}
                            </span>

                            <span className="mt-1 text-[10px] uppercase text-slate-500">
                              {getMonthShort(hearing.hearing_date)}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => openViewModal(hearing)}
                              className="text-left"
                            >
                              <p className="text-sm font-semibold text-white">
                                {hearing.case.case_number}
                              </p>

                              <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                                {hearing.purpose}
                              </p>
                            </button>

                            <p className="mt-2 text-xs text-slate-500">
                              {getDateLabel(hearing.hearing_date)} ·{" "}
                              {formatTime(hearing.hearing_time)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-600">
                              Client
                            </p>

                            <p className="mt-1 truncate text-sm text-slate-300">
                              {hearing.client.full_name}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-600">
                              Court
                            </p>

                            <p className="mt-1 truncate text-sm text-slate-300">
                              {hearing.court || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-600">
                              Judge
                            </p>

                            <p className="mt-1 truncate text-sm text-slate-300">
                              {hearing.judge || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-600">
                              Case
                            </p>

                            <p className="mt-1 truncate text-sm text-slate-300">
                              {hearing.case.case_number}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2 border-t border-slate-800 pt-4">
                          <button
                            type="button"
                            onClick={() => openViewModal(hearing)}
                            className="flex-1 rounded-lg bg-slate-800 px-3 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(hearing)}
                            className="flex-1 rounded-lg bg-slate-800 px-3 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeleteModal(hearing)}
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
          <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-slate-800 bg-slate-950 shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editingHearing ? "Edit Hearing" : "Create New Hearing"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {editingHearing
                    ? "Update the hearing information below."
                    : "Record a new court hearing."}
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
                      Hearing Information
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Connect the hearing to a case and set its date and time.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="case_id"
                        className="mb-2 block text-xs font-medium text-slate-400"
                      >
                        Case *
                      </label>

                      <select
                        id="case_id"
                        value={form.case_id}
                        onChange={(event) =>
                          updateForm("case_id", event.target.value)
                        }
                        className={`w-full rounded-xl border bg-slate-900 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-slate-500 ${
                          formErrors.case_id
                            ? "border-red-500/60"
                            : "border-slate-700"
                        }`}
                      >
                        <option value="">Select a case</option>

                        {cases.map((legalCase) => (
                          <option key={legalCase.id} value={legalCase.id}>
                            {legalCase.case_number} — {legalCase.title} —{" "}
                            {legalCase.client.full_name}
                          </option>
                        ))}
                      </select>

                      {formErrors.case_id && (
                        <p className="mt-1.5 text-xs text-red-400">
                          {formErrors.case_id}
                        </p>
                      )}

                      {cases.length === 0 && (
                        <p className="mt-1.5 text-xs text-amber-400">
                          No cases are available. Create a case first.
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="hearing_date"
                        className="mb-2 block text-xs font-medium text-slate-400"
                      >
                        Hearing Date *
                      </label>

                      <input
                        id="hearing_date"
                        type="date"
                        value={form.hearing_date}
                        onChange={(event) =>
                          updateForm("hearing_date", event.target.value)
                        }
                        className={`w-full rounded-xl border bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-slate-500 ${
                          formErrors.hearing_date
                            ? "border-red-500/60"
                            : "border-slate-700"
                        }`}
                      />

                      {formErrors.hearing_date && (
                        <p className="mt-1.5 text-xs text-red-400">
                          {formErrors.hearing_date}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="hearing_time"
                        className="mb-2 block text-xs font-medium text-slate-400"
                      >
                        Hearing Time
                      </label>

                      <input
                        id="hearing_time"
                        type="time"
                        value={form.hearing_time}
                        onChange={(event) =>
                          updateForm("hearing_time", event.target.value)
                        }
                        className={`w-full rounded-xl border bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-slate-500 ${
                          formErrors.hearing_time
                            ? "border-red-500/60"
                            : "border-slate-700"
                        }`}
                      />

                      {formErrors.hearing_time && (
                        <p className="mt-1.5 text-xs text-red-400">
                          {formErrors.hearing_time}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-6">
                    <h3 className="text-sm font-semibold text-white">
                      Court Information
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Record the court and judge handling the hearing.
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

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="purpose"
                        className="mb-2 block text-xs font-medium text-slate-400"
                      >
                        Hearing Purpose *
                      </label>

                      <input
                        id="purpose"
                        type="text"
                        value={form.purpose}
                        onChange={(event) =>
                          updateForm("purpose", event.target.value)
                        }
                        placeholder="e.g. First hearing, pleading, evidence review..."
                        className={`w-full rounded-xl border bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-slate-500 ${
                          formErrors.purpose
                            ? "border-red-500/60"
                            : "border-slate-700"
                        }`}
                      />

                      {formErrors.purpose && (
                        <p className="mt-1.5 text-xs text-red-400">
                          {formErrors.purpose}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-6">
                    <h3 className="text-sm font-semibold text-white">
                      Outcome & Next Action
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Update these fields after the hearing takes place.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="result"
                        className="mb-2 block text-xs font-medium text-slate-400"
                      >
                        Result
                      </label>

                      <textarea
                        id="result"
                        value={form.result}
                        onChange={(event) =>
                          updateForm("result", event.target.value)
                        }
                        rows={4}
                        placeholder="Record what happened during the hearing..."
                        className="w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-slate-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="next_action"
                        className="mb-2 block text-xs font-medium text-slate-400"
                      >
                        Next Action
                      </label>

                      <textarea
                        id="next_action"
                        value={form.next_action}
                        onChange={(event) =>
                          updateForm("next_action", event.target.value)
                        }
                        rows={3}
                        placeholder="What needs to happen next?"
                        className="w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-slate-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="notes"
                        className="mb-2 block text-xs font-medium text-slate-400"
                      >
                        Notes
                      </label>

                      <textarea
                        id="notes"
                        value={form.notes}
                        onChange={(event) =>
                          updateForm("notes", event.target.value)
                        }
                        rows={4}
                        placeholder="Additional notes..."
                        className="w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-slate-500"
                      />
                    </div>
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
                  disabled={saving || cases.length === 0}
                  className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingHearing
                      ? "Save Changes"
                      : "Create Hearing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && selectedHearing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-slate-800 bg-slate-950 shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                  {selectedHearing.case.case_number}
                </p>

                <h2 className="mt-1 text-lg font-semibold text-white">
                  {selectedHearing.purpose}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedHearing.client.full_name}
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
              <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-slate-800">
                    <span className="text-xl font-semibold text-white">
                      {getDayNumber(selectedHearing.hearing_date)}
                    </span>

                    <span className="text-xs uppercase text-slate-500">
                      {getMonthShort(selectedHearing.hearing_date)}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      {getDateLabel(selectedHearing.hearing_date)}
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      {formatLongDate(selectedHearing.hearing_date)}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {formatTime(selectedHearing.hearing_time)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    Case
                  </p>

                  <p className="mt-2 text-sm font-medium text-white">
                    {selectedHearing.case.case_number}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {selectedHearing.case.title}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    Client
                  </p>

                  <p className="mt-2 text-sm font-medium text-white">
                    {selectedHearing.client.full_name}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    Court
                  </p>

                  <p className="mt-2 text-sm text-slate-300">
                    {selectedHearing.court || "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    Judge
                  </p>

                  <p className="mt-2 text-sm text-slate-300">
                    {selectedHearing.judge || "—"}
                  </p>
                </div>

                <div className="sm:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    Purpose
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {selectedHearing.purpose}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    Result
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                    {selectedHearing.result || "No result recorded yet."}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    Next Action
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                    {selectedHearing.next_action || "No next action recorded."}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    Notes
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                    {selectedHearing.notes || "No notes recorded."}
                  </p>
                </div>
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
                  openEditModal(selectedHearing);
                }}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-200"
              >
                Edit Hearing
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && selectedHearing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-xl text-red-400">
              !
            </div>

            <h2 className="mt-5 text-lg font-semibold text-white">
              Delete Hearing?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              You are about to delete the hearing for{" "}
              <span className="font-medium text-slate-300">
                {selectedHearing.case.case_number}
              </span>{" "}
              scheduled for{" "}
              <span className="font-medium text-slate-300">
                {formatDate(selectedHearing.hearing_date)}
              </span>
              . This action cannot be undone.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedHearing(null);
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
                {deleting ? "Deleting..." : "Delete Hearing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
