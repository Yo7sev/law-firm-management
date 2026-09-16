"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type User = {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  approval_status: string;
};

type MeResponse = {
  authenticated: boolean;
  user: User | null;
};

type DashboardStatistics = {
  active_cases: number;
  total_clients: number;
  upcoming_hearings: number;
  pending_tasks: number;
};

type RecentCase = {
  id: number;
  case_number: string;
  title: string;
  status: string;
  priority: string;
  client: string;
  case_type: string | null;
  opening_date: string;
};

type UpcomingHearing = {
  id: number;
  case_id: number;
  case_number: string;
  case_title: string;
  client: string;
  hearing_date: string;
  hearing_time: string | null;
  court: string;
  judge: string;
  purpose: string;
};

type RecentDocument = {
  id: number;
  title: string;
  document_type: string;
  client: string;
  case: string | null;
  uploaded_by: string;
  created_at: string;
};

type DashboardResponse = {
  success: boolean;
  dashboard: {
    statistics: DashboardStatistics;
    recent_cases: RecentCase[];
    upcoming_hearings: UpcomingHearing[];
    recent_documents: RecentDocument[];
  };
  message?: string;
};

const modules = [
  {
    title: "Clients",
    description:
      "Manage clients, contact information, and relationships.",
    href: "/lawyer/clients",
    icon: "C",
  },
  {
    title: "Cases",
    description:
      "Review active cases, case details, and legal matters.",
    href: "/lawyer/cases",
    icon: "⚖",
  },
  {
    title: "Hearings",
    description:
      "Track upcoming hearings, dates, courts, and schedules.",
    href: "/hearings",
    icon: "H",
  },
  {
    title: "Documents",
    description:
      "Access and organize case-related legal documents.",
    href: "/lawyer/documents",
    icon: "D",
  },
  {
    title: "Tasks",
    description:
      "Manage assignments, deadlines, and pending work.",
    href: "/lawyer/tasks",
    icon: "T",
  },
  {
    title: "Finance",
    description:
      "Review payments, expenses, invoices, and financial activity.",
    href: "#finance",
    icon: "$",
  },
];

function formatRole(role: string) {
  return role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(dateString: string) {
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

function formatDateTime(dateString: string) {
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

function formatTime(timeString: string | null) {
  if (!timeString) {
    return "Time not specified";
  }

  const [hours, minutes] = timeString.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return timeString;
  }

  const date = new Date();

  date.setHours(hours, minutes, 0, 0);

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getPriorityClass(priority: string) {
  switch (priority) {
    case "urgent":
      return "border-red-900/60 bg-red-950/30 text-red-300";

    case "high":
      return "border-orange-900/60 bg-orange-950/30 text-orange-300";

    case "medium":
      return "border-yellow-900/60 bg-yellow-950/30 text-yellow-300";

    default:
      return "border-slate-700 bg-slate-900 text-slate-400";
  }
}

function getStatusClass(status: string) {
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

export default function LawyerDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] =
    useState<DashboardResponse["dashboard"] | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const [meResponse, dashboardResponse] =
          await Promise.all([
            fetch("/api/auth/me/", {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            }),
            fetch("/api/auth/dashboard/", {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            }),
          ]);

        if (!meResponse.ok) {
          throw new Error("Unable to load the current user.");
        }

        const meData: MeResponse = await meResponse.json();

        if (!meData.authenticated || !meData.user) {
          router.push("/login");
          return;
        }

        if (!dashboardResponse.ok) {
          if (
            dashboardResponse.status === 302 ||
            dashboardResponse.status === 401
          ) {
            router.push("/login");
            return;
          }

          throw new Error("Unable to load dashboard data.");
        }

        const dashboardData: DashboardResponse =
          await dashboardResponse.json();

        if (!dashboardData.success) {
          throw new Error(
            dashboardData.message ||
              "Unable to load dashboard data.",
          );
        }

        if (!cancelled) {
          setUser(meData.user);
          setDashboard(dashboardData.dashboard);
        }
      } catch (dashboardError) {
        if (cancelled) {
          return;
        }

        const message =
          dashboardError instanceof Error
            ? dashboardError.message
            : "Unable to load the dashboard.";

        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [router]);

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

  function openClients() {
    router.push("/lawyer/clients");
  }

  const displayName =
    user?.first_name || user?.last_name
      ? `${user.first_name} ${user.last_name}`.trim()
      : user?.email || "Lawyer";

  const initials =
    user?.first_name || user?.last_name
      ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase()
      : user?.email?.[0]?.toUpperCase() || "L";

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
                <p className="text-sm font-semibold">
                  LawFirm
                </p>

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
                  className="block rounded-lg bg-blue-600/10 px-3 py-2.5 text-sm font-medium text-blue-400"
                >
                  Dashboard
                </Link>

                <button
                  type="button"
                  onClick={openClients}
                  className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  Clients
                </button>

                <Link
                  href="/lawyer/cases"
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  Cases
                </Link>

                <Link
                  href="/hearings"
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
                  href="#finance"
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  Finance
                </Link>
              </div>
            </nav>

            <div className="border-t border-slate-800 p-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-3 w-20 rounded bg-slate-800" />
                    <div className="mt-2 h-4 w-32 rounded bg-slate-800" />
                    <div className="mt-2 h-3 w-14 rounded bg-slate-800" />
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium text-slate-300">
                      Signed in as
                    </p>

                    <p className="mt-1 truncate text-sm text-white">
                      {user?.email || "Unknown user"}
                    </p>

                    <p className="mt-1 text-xs text-blue-400">
                      {formatRole(user?.role || "lawyer")}
                    </p>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-3 w-full rounded-lg border border-slate-800 px-3 py-2.5 text-left text-sm text-slate-500 transition hover:border-red-900/50 hover:bg-red-950/20 hover:text-red-300"
              >
                Sign out
              </button>
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
                Dashboard
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden text-right md:block">
                <p className="max-w-52 truncate text-sm font-medium text-white">
                  {loading ? "Loading..." : displayName}
                </p>

                <p className="text-xs text-slate-500">
                  {formatRole(user?.role || "lawyer")}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xs font-semibold text-blue-400 sm:h-10 sm:w-10 sm:text-sm">
                {initials}
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {error && (
              <div
                role="alert"
                className="mb-6 rounded-2xl border border-red-900/60 bg-red-950/30 p-4"
              >
                <p className="text-sm font-medium text-red-300">
                  Unable to load dashboard
                </p>

                <p className="mt-1 text-sm leading-6 text-red-400/80">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-4 rounded-lg border border-red-900/60 px-3 py-2 text-sm font-medium text-red-300 transition hover:bg-red-950/50"
                >
                  Try again
                </button>
              </div>
            )}

            <div className="mb-8">
              <p className="mb-2 text-sm font-medium text-blue-400">
                {loading
                  ? "Loading your workspace..."
                  : `Welcome back, ${displayName}.`}
              </p>

              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Law firm overview
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Review your cases, clients, hearings, documents,
                and tasks from one centralized workspace.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    Active Cases
                  </p>

                  <span className="text-blue-400">⚖</span>
                </div>

                <p className="mt-3 text-3xl font-semibold">
                  {loading
                    ? "—"
                    : dashboard?.statistics.active_cases ?? 0}
                </p>

                <p className="mt-2 text-xs text-slate-600">
                  Cases currently being handled
                </p>
              </div>

              <button
                type="button"
                onClick={openClients}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-left transition hover:border-slate-700 hover:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    Clients
                  </p>

                  <span className="text-blue-400">C</span>
                </div>

                <p className="mt-3 text-3xl font-semibold">
                  {loading
                    ? "—"
                    : dashboard?.statistics.total_clients ?? 0}
                </p>

                <p className="mt-2 text-xs text-slate-600">
                  Clients connected to your workspace
                </p>
              </button>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    Upcoming Hearings
                  </p>

                  <span className="text-blue-400">H</span>
                </div>

                <p className="mt-3 text-3xl font-semibold">
                  {loading
                    ? "—"
                    : dashboard?.statistics.upcoming_hearings ?? 0}
                </p>

                <p className="mt-2 text-xs text-slate-600">
                  Scheduled future hearings
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    Pending Tasks
                  </p>

                  <span className="text-blue-400">T</span>
                </div>

                <p className="mt-3 text-3xl font-semibold">
                  {loading
                    ? "—"
                    : dashboard?.statistics.pending_tasks ?? 0}
                </p>

                <p className="mt-2 text-xs text-slate-600">
                  Tasks requiring attention
                </p>
              </div>
            </div>

            <div className="mt-10">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">
                  Workspace modules
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Access the main areas of your legal practice.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {modules.map((module) => {
                  if (module.title === "Clients") {
                    return (
                      <button
                        key={module.title}
                        type="button"
                        onClick={openClients}
                        className="group rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-left transition hover:border-slate-700 hover:bg-slate-900"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-sm font-semibold text-blue-400">
                            {module.icon}
                          </div>

                          <span className="text-slate-700 transition group-hover:text-blue-400">
                            →
                          </span>
                        </div>

                        <h3 className="mt-5 text-base font-semibold">
                          {module.title}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          {module.description}
                        </p>
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={module.title}
                      href={module.href}
                      className="group rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition hover:border-slate-700 hover:bg-slate-900"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-sm font-semibold text-blue-400">
                          {module.icon}
                        </div>

                        <span className="text-slate-700 transition group-hover:text-blue-400">
                          →
                        </span>
                      </div>

                      <h3 className="mt-5 text-base font-semibold">
                        {module.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {module.description}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="mt-10 grid gap-6 xl:grid-cols-2">
              <section
                id="cases"
                className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/40"
              >
                <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                  <div>
                    <h2 className="text-base font-semibold">
                      Recent cases
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Latest cases in your workspace
                    </p>
                  </div>

                  <Link
                    href="/lawyer/cases"
                    className="text-xs text-blue-400 transition hover:text-blue-300"
                  >
                    View all →
                  </Link>
                </div>

                <div className="p-4">
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((item) => (
                        <div
                          key={item}
                          className="animate-pulse rounded-xl border border-slate-800 p-4"
                        >
                          <div className="h-4 w-32 rounded bg-slate-800" />
                          <div className="mt-3 h-3 w-48 rounded bg-slate-800" />
                        </div>
                      ))}
                    </div>
                  ) : dashboard?.recent_cases.length ? (
                    <div className="space-y-3">
                      {dashboard.recent_cases.map((caseItem) => (
                        <Link
                          key={caseItem.id}
                          href={`/lawyer/cases?case=${caseItem.id}`}
                          className="block rounded-xl border border-slate-800 bg-slate-950/50 p-4 transition hover:border-slate-700 hover:bg-slate-900"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-blue-400">
                                {caseItem.case_number}
                              </p>

                              <h3 className="mt-1 truncate text-sm font-semibold text-white">
                                {caseItem.title}
                              </h3>

                              <p className="mt-1 text-xs text-slate-500">
                                Client: {caseItem.client}
                              </p>
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2">
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getStatusClass(
                                  caseItem.status,
                                )}`}
                              >
                                {formatStatus(caseItem.status)}
                              </span>

                              <span
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getPriorityClass(
                                  caseItem.priority,
                                )}`}
                              >
                                {formatStatus(caseItem.priority)}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
                            <span>
                              Type:{" "}
                              {caseItem.case_type || "Not specified"}
                            </span>

                            <span>
                              Opened:{" "}
                              {formatDate(caseItem.opening_date)}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-800 px-5 py-10 text-center">
                      <p className="text-sm font-medium text-slate-400">
                        No cases yet
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        Cases assigned to you will appear here.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section
                id="hearings"
                className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/40"
              >
                <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                  <div>
                    <h2 className="text-base font-semibold">
                      Upcoming hearings
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Your next scheduled hearings
                    </p>
                  </div>

                  <Link
                    href="/hearings"
                    className="text-xs text-blue-400 transition hover:text-blue-300"
                  >
                    View all →
                  </Link>
                </div>

                <div className="p-4">
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((item) => (
                        <div
                          key={item}
                          className="animate-pulse rounded-xl border border-slate-800 p-4"
                        >
                          <div className="h-4 w-40 rounded bg-slate-800" />
                          <div className="mt-3 h-3 w-56 rounded bg-slate-800" />
                        </div>
                      ))}
                    </div>
                  ) : dashboard?.upcoming_hearings.length ? (
                    <div className="space-y-3">
                      {dashboard.upcoming_hearings.map(
                        (hearing) => (
                          <div
                            key={hearing.id}
                            className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                          >
                            <div className="flex gap-4">
                              <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-blue-900/50 bg-blue-950/30 text-blue-300">
                                <span className="text-[10px] font-medium uppercase">
                                  {new Intl.DateTimeFormat(
                                    "en-US",
                                    {
                                      month: "short",
                                    },
                                  ).format(
                                    new Date(
                                      `${hearing.hearing_date}T00:00:00`,
                                    ),
                                  )}
                                </span>

                                <span className="text-base font-semibold">
                                  {new Date(
                                    `${hearing.hearing_date}T00:00:00`,
                                  ).getDate()}
                                </span>
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-blue-400">
                                  {hearing.case_number}
                                </p>

                                <h3 className="mt-1 text-sm font-semibold text-white">
                                  {hearing.purpose}
                                </h3>

                                <p className="mt-1 truncate text-xs text-slate-500">
                                  {hearing.case_title}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
                                  <span>
                                    {formatTime(
                                      hearing.hearing_time,
                                    )}
                                  </span>

                                  <span>
                                    {hearing.court ||
                                      "Court not specified"}
                                  </span>

                                  <span>
                                    Client: {hearing.client}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-800 px-5 py-10 text-center">
                      <p className="text-sm font-medium text-slate-400">
                        No upcoming hearings
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        Scheduled hearings will appear here.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <section
              id="documents"
              className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/40"
            >
              <div className="flex flex-col gap-2 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold">
                    Recent documents
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Recently uploaded legal documents
                  </p>
                </div>

                <Link
                  href="/lawyer/documents"
                  className="text-xs text-blue-400 transition hover:text-blue-300"
                >
                  View all →
                </Link>
              </div>

              <div className="p-4">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="animate-pulse rounded-xl border border-slate-800 p-4"
                      >
                        <div className="h-4 w-40 rounded bg-slate-800" />
                        <div className="mt-3 h-3 w-64 rounded bg-slate-800" />
                      </div>
                    ))}
                  </div>
                ) : dashboard?.recent_documents.length ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {dashboard.recent_documents.map(
                      (document) => (
                        <div
                          key={document.id}
                          className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {document.title}
                              </p>

                              <p className="mt-1 text-xs text-blue-400">
                                {formatStatus(
                                  document.document_type,
                                )}
                              </p>
                            </div>

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-xs text-blue-400">
                              D
                            </div>
                          </div>

                          <div className="mt-4 space-y-2 text-xs text-slate-600">
                            <p>
                              Client:{" "}
                              <span className="text-slate-500">
                                {document.client}
                              </span>
                            </p>

                            <p>
                              Case:{" "}
                              <span className="text-slate-500">
                                {document.case || "Not linked"}
                              </span>
                            </p>

                            <p>
                              Uploaded:{" "}
                              <span className="text-slate-500">
                                {formatDateTime(
                                  document.created_at,
                                )}
                              </span>
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-800 px-5 py-10 text-center">
                    <p className="text-sm font-medium text-slate-400">
                      No documents yet
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      Uploaded legal documents will appear here.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <div className="mt-6 rounded-2xl border border-blue-900/40 bg-blue-950/20 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-300">
                    Authentication connected
                  </p>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    Your Django authentication system is connected
                    to the Next.js frontend. Dashboard information
                    is now being loaded from the Django backend.
                  </p>
                </div>

                <div className="shrink-0 rounded-full border border-emerald-900/60 bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-300">
                  Connected
                </div>
              </div>
            </div>

            <div
              id="clients"
              className="h-px scroll-mt-24"
            />

            <div
              id="tasks"
              className="h-px scroll-mt-24"
            />

            <div
              id="finance"
              className="h-px scroll-mt-24"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

