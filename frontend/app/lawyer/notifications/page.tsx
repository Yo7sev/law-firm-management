"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import NotificationBell from "@/components/lawyer/NotificationBell";

type Notification = {
  id: number;
  notification_type: string;
  notification_type_display?: string | null;
  title: string;
  message: string;
  is_read: boolean;
  read_at?: string | null;
  created_at?: string | null;
  related_case?: number | null;
  related_hearing?: number | null;
  related_task?: number | null;
  related_document?: number | null;
  related_url?: string | null;
};

type NotificationsResponse = {
  success?: boolean;
  notifications?: Notification[];
  results?: Notification[];
  count?: number;
  unread_count?: number;
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

type FilterType = "all" | "unread";

function formatNotificationType(type?: string | null) {
  if (!type) {
    return "Notification";
  }

  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDateTime(dateString?: string | null) {
  if (!dateString) {
    return "Unknown time";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatRelativeTime(dateString?: string | null) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const difference = Date.now() - date.getTime();
  const seconds = Math.floor(difference / 1000);

  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return formatDateTime(dateString);
}

function getNotificationIcon(type?: string | null) {
  switch (type) {
    case "hearing":
      return (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
          />
        </svg>
      );

    case "task":
      return (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m9 11 3 3L22 4"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
          />
        </svg>
      );

    case "payment":
      return (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <path d="M2 10h20" />
          <path d="M6 15h3" />
        </svg>
      );

    case "document":
      return (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"
          />
          <path d="M14 2v6h6" />
          <path d="M8 13h8M8 17h6" />
        </svg>
      );

    case "case":
      return (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 7h5l2 2h9v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
          />
        </svg>
      );

    default:
      return (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 21h4" />
        </svg>
      );
  }
}

function getNotificationIconClass(type?: string | null) {
  switch (type) {
    case "hearing":
      return "border-purple-900/60 bg-purple-950/40 text-purple-300";

    case "task":
      return "border-blue-900/60 bg-blue-950/40 text-blue-300";

    case "payment":
      return "border-emerald-900/60 bg-emerald-950/40 text-emerald-300";

    case "document":
      return "border-yellow-900/60 bg-yellow-950/40 text-yellow-300";

    case "case":
      return "border-cyan-900/60 bg-cyan-950/40 text-cyan-300";

    default:
      return "border-slate-700 bg-slate-900 text-slate-300";
  }
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
    return null;
  }

  const cookies = document.cookie.split("; ");

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const cookieName = cookie.slice(0, separatorIndex);

    if (cookieName === name) {
      return decodeURIComponent(cookie.slice(separatorIndex + 1));
    }
  }

  return null;
}

function normalizeNotifications(data: unknown): Notification[] {
  if (Array.isArray(data)) {
    return data as Notification[];
  }

  if (typeof data !== "object" || data === null) {
    return [];
  }

  const response = data as NotificationsResponse;

  if (Array.isArray(response.notifications)) {
    return response.notifications;
  }

  if (Array.isArray(response.results)) {
    return response.results;
  }

  return [];
}

export default function NotificationsPage() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

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

  const loadNotifications = useCallback(async () => {
    try {
      setError("");

      const response = await fetch("/api/auth/notifications", {
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

      const data: unknown = await response.json();

      setNotifications(normalizeNotifications(data));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    const fetchNotifications = async () => {
      try {
        const response = await fetch("/api/auth/notifications", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(await readApiError(response));
        }

        const data: unknown = await response.json();

        if (!cancelled) {
          setNotifications(normalizeNotifications(data));
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load notifications.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchNotifications();

    return () => {
      cancelled = true;
    };
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => !notification.is_read).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((notification) => !notification.is_read);
    }

    return notifications;
  }, [filter, notifications]);

  const markAsRead = useCallback(
    async (notification: Notification) => {
      if (notification.is_read) {
        return;
      }

      setActionLoadingId(notification.id);
      setError("");

      try {
        const csrfToken = await initializeCsrf();

        const response = await fetch(
          `/api/auth/notifications/${notification.id}/read/`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "X-CSRFToken": csrfToken,
            },
          },
        );

        if (response.status === 401) {
          router.push("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(await readApiError(response));
        }

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  is_read: true,
                  read_at: new Date().toISOString(),
                }
              : item,
          ),
        );
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to mark notification as read.",
        );
      } finally {
        setActionLoadingId(null);
      }
    },
    [initializeCsrf, router],
  );

  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0) {
      return;
    }

    setMarkingAllRead(true);
    setError("");

    try {
      const csrfToken = await initializeCsrf();

      const response = await fetch("/api/auth/notifications/read-all", {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRFToken": csrfToken,
        },
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const now = new Date().toISOString();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
          read_at: notification.read_at || now,
        })),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to mark all notifications as read.",
      );
    } finally {
      setMarkingAllRead(false);
    }
  }, [initializeCsrf, router, unreadCount]);

  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      if (!notification.is_read) {
        await markAsRead(notification);
      }

      if (notification.related_url) {
        router.push(notification.related_url);
      }
    },
    [markAsRead, router],
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-950 lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-950/40">
              LF
            </div>

            <div>
              <div className="text-sm font-semibold text-white">LawFirm</div>
              <div className="text-xs text-slate-500">Management System</div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            <Link
              href="/lawyer"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z"
                />
              </svg>
              Dashboard
            </Link>

            <Link
              href="/lawyer/clients"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                />
                <circle cx="9" cy="7" r="4" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                />
              </svg>
              Clients
            </Link>

            <Link
              href="/lawyer/cases"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 7h5l2 2h9v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                />
              </svg>
              Cases
            </Link>

            <Link
              href="/lawyer/hearings"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
                />
              </svg>
              Hearings
            </Link>

            <Link
              href="/lawyer/documents"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"
                />
                <path d="M14 2v6h6M8 13h8M8 17h6" />
              </svg>
              Documents
            </Link>

            <Link
              href="/lawyer/tasks"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m9 11 3 3L22 4"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
                />
              </svg>
              Tasks
            </Link>

            <Link
              href="/lawyer/finance"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <path d="M2 10h20M6 15h3" />
              </svg>
              Finance
            </Link>

            <Link
              href="/lawyer/notifications"
              className="flex items-center justify-between rounded-xl bg-blue-600/10 px-3 py-2.5 text-sm font-medium text-blue-300 ring-1 ring-blue-500/20"
            >
              <span className="flex items-center gap-3">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 21h4"
                  />
                </svg>
                Notifications
              </span>

              {unreadCount > 0 && (
                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 min-h-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                Lawyer Workspace
              </div>

              <h1 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                Notifications
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <NotificationBell />

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllAsRead()}
                  disabled={markingAllRead}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
                >
                  {markingAllRead ? "Marking..." : "Mark all as read"}
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6">
              <div className="text-sm font-medium text-blue-400">
                Activity Center
              </div>

              <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    Stay up to date
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                    Review hearings, tasks, payments, documents, and case
                    activity that require your attention.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Unread
                  </div>

                  <div className="mt-1 text-2xl font-semibold text-white">
                    {unreadCount}
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    filter === "all"
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  All
                  <span className="ml-2 text-xs opacity-70">
                    {notifications.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("unread")}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    filter === "unread"
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  Unread
                  <span className="ml-2 text-xs opacity-70">{unreadCount}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => void loadNotifications()}
                disabled={loading}
                className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8">
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
                    >
                      <div className="flex gap-4">
                        <div className="h-11 w-11 rounded-xl bg-slate-800" />

                        <div className="flex-1 space-y-3">
                          <div className="h-4 w-1/3 rounded bg-slate-800" />
                          <div className="h-3 w-3/4 rounded bg-slate-800" />
                          <div className="h-3 w-1/4 rounded bg-slate-800" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-400">
                  <svg
                    className="h-7 w-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 21h4"
                    />
                  </svg>
                </div>

                <h3 className="mt-4 text-base font-semibold text-white">
                  {filter === "unread"
                    ? "No unread notifications"
                    : "No notifications yet"}
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                  {filter === "unread"
                    ? "You are all caught up. New notifications will appear here when there is activity."
                    : "Notifications about cases, hearings, tasks, documents, and financial activity will appear here."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => {
                  const clickable = Boolean(notification.related_url);

                  return (
                    <div
                      key={notification.id}
                      role={clickable ? "button" : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      onClick={() => {
                        if (clickable) {
                          void handleNotificationClick(notification);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (
                          clickable &&
                          (event.key === "Enter" || event.key === " ")
                        ) {
                          event.preventDefault();
                          void handleNotificationClick(notification);
                        }
                      }}
                      className={`group rounded-2xl border p-4 transition sm:p-5 ${
                        notification.is_read
                          ? "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70"
                          : "border-blue-900/50 bg-blue-950/20 hover:border-blue-800/70 hover:bg-blue-950/30"
                      } ${clickable ? "cursor-pointer" : ""}`}
                    >
                      <div className="flex gap-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${getNotificationIconClass(
                            notification.notification_type,
                          )}`}
                        >
                          {getNotificationIcon(notification.notification_type)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3
                                  className={`text-sm font-semibold ${
                                    notification.is_read
                                      ? "text-slate-200"
                                      : "text-white"
                                  }`}
                                >
                                  {notification.title}
                                </h3>

                                {!notification.is_read && (
                                  <span className="inline-flex items-center rounded-full border border-blue-900/60 bg-blue-950/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                                    New
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-xs font-medium text-slate-500">
                                {notification.notification_type_display ||
                                  formatNotificationType(
                                    notification.notification_type,
                                  )}
                              </p>
                            </div>

                            <div className="shrink-0 text-xs text-slate-500">
                              {formatRelativeTime(notification.created_at)}
                            </div>
                          </div>

                          <p className="mt-3 text-sm leading-6 text-slate-400">
                            {notification.message}
                          </p>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="text-xs text-slate-600">
                              {formatDateTime(notification.created_at)}
                            </div>

                            <div className="flex items-center gap-2">
                              {!notification.is_read && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void markAsRead(notification);
                                  }}
                                  disabled={actionLoadingId === notification.id}
                                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {actionLoadingId === notification.id
                                    ? "Saving..."
                                    : "Mark as read"}
                                </button>
                              )}

                              {notification.related_url && (
                                <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-blue-400 transition group-hover:text-blue-300">
                                  View details
                                  <svg
                                    className="h-3.5 w-3.5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="m9 18 6-6-6-6"
                                    />
                                  </svg>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
