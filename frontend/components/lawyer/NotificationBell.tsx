"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type UnreadCountResponse = {
  count?: number;
  unread_count?: number;
};

type NotificationItem = {
  id: number | string;
  title?: string;
  message?: string;
  description?: string;
  created_at?: string;
  is_read?: boolean;
  read?: boolean;
};

function getUnreadCount(data: unknown): number {
  if (!data || typeof data !== "object") {
    return 0;
  }

  const value = data as UnreadCountResponse;

  if (typeof value.count === "number") {
    return Math.max(0, value.count);
  }

  if (typeof value.unread_count === "number") {
    return Math.max(0, value.unread_count);
  }

  return 0;
}

function getNotificationArray(data: unknown): NotificationItem[] {
  if (Array.isArray(data)) {
    return data as NotificationItem[];
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const value = data as {
    results?: unknown;
    notifications?: unknown;
  };

  if (Array.isArray(value.results)) {
    return value.results as NotificationItem[];
  }

  if (Array.isArray(value.notifications)) {
    return value.notifications as NotificationItem[];
  }

  return [];
}

function formatNotificationDate(date?: string) {
  if (!date) {
    return "";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/notifications/unread-count", {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const data: unknown = await response.json();

      setUnreadCount(getUnreadCount(data));
    } catch {
      // Ignore notification count errors.
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/notifications", {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const data: unknown = await response.json();

      setNotifications(getNotificationArray(data));
    } catch {
      // Ignore notification loading errors.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchInitialUnreadCount = async () => {
      try {
        const response = await fetch("/api/auth/notifications/unread-count", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data: unknown = await response.json();

        if (!cancelled) {
          setUnreadCount(getUnreadCount(data));
        }
      } catch {
        // Ignore notification count errors.
      }
    };

    void fetchInitialUnreadCount();

    const interval = window.setInterval(() => {
      void loadUnreadCount();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [loadUnreadCount]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const handleToggle = () => {
    const nextOpen = !isOpen;

    setIsOpen(nextOpen);

    if (nextOpen) {
      void loadNotifications();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread notifications`
            : "Notifications"
        }
        aria-expanded={isOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/70 text-slate-300 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 1-5.714 0A2.97 2.97 0 0 1 6.5 14.13V10a5.5 5.5 0 0 1 11 0v4.13a2.97 2.97 0 0 1-2.643 2.952ZM9.75 19.25a2.5 2.5 0 0 0 4.5 0"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-slate-950 bg-blue-600 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-[380px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Notifications
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${
                      unreadCount === 1 ? "" : "s"
                    }`
                  : "You're all caught up"}
              </p>
            </div>

            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-slate-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 0 1-6 0"
                />
              </svg>
            </span>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />

                <p className="mt-3 text-xs text-slate-500">
                  Loading notifications...
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-900">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    className="h-5 w-5 text-slate-500"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 0 1-6 0"
                    />
                  </svg>
                </div>

                <p className="mt-3 text-sm font-medium text-slate-300">
                  No notifications
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  New notifications will appear here.
                </p>
              </div>
            ) : (
              notifications.slice(0, 8).map((notification) => {
                const title =
                  notification.title ||
                  notification.description ||
                  "Notification";

                const message =
                  notification.message || notification.description || "";

                const isUnread =
                  notification.is_read === false || notification.read === false;

                return (
                  <div
                    key={notification.id}
                    className={`border-b border-slate-900 px-4 py-3 transition hover:bg-slate-900/70 ${
                      isUnread ? "bg-blue-950/10" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          isUnread ? "bg-blue-500" : "bg-slate-700"
                        }`}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-200">
                          {title}
                        </p>

                        {message && message !== title && (
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                            {message}
                          </p>
                        )}

                        {notification.created_at && (
                          <p className="mt-2 text-[11px] text-slate-600">
                            {formatNotificationDate(notification.created_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-800 p-3">
            <Link
              href="/lawyer/notifications"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
