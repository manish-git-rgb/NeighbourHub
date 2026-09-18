"use client";

import { useCallback, useEffect, useState } from "react";
import { AxiosError } from "axios";
import { api } from "@/lib/api";
import Navbar from "@/components/layout/Navbar";

interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationListResponse {
  success: boolean;
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

type ReadFilter = "all" | "unread" | "read";

function getErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ detail?: string }>;

  return (
    axiosError.response?.data?.detail ||
    axiosError.message ||
    fallback
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString();
}

function formatType(type: string): string {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<ReadFilter>("all");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params: {
        page: number;
        limit: number;
        is_read?: boolean;
      } = {
        page: 1,
        limit: 20,
      };

      if (filter === "unread") {
        params.is_read = false;
      }

      if (filter === "read") {
        params.is_read = true;
      }

      const response = await api.get<NotificationListResponse>(
        "/notifications/",
        {
          params,
        }
      );

      setNotifications(response.data.data);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to load notifications.")
      );
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function markAsRead(notificationId: number) {
    try {
      setActionLoading(notificationId);
      setError("");
      setMessage("");

      await api.patch(
        `/notifications/${notificationId}/read`
      );

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );

      setMessage("Notification marked as read.");
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to mark the notification as read."
        )
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteNotification(notificationId: number) {
    try {
      setActionLoading(notificationId);
      setError("");
      setMessage("");

      await api.delete(
        `/notifications/${notificationId}`
      );

      setNotifications((current) =>
        current.filter(
          (notification) => notification.id !== notificationId
        )
      );

      setPagination((current) => ({
        ...current,
        total: Math.max(0, current.total - 1),
      }));

      setMessage("Notification deleted.");
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to delete the notification."
        )
      );
    } finally {
      setActionLoading(null);
    }
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">
              Community updates
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Notifications
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Stay updated about events, issue reports, moderation
              actions, and other activity.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchNotifications}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Summary */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Notifications shown</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {notifications.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Unread shown</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {unreadCount}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All
            </button>

            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                filter === "unread"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Unread
            </button>

            <button
              type="button"
              onClick={() => setFilter("read")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                filter === "read"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Read
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="h-4 w-32 rounded bg-slate-200" />
                <div className="mt-4 h-5 w-2/3 rounded bg-slate-200" />
                <div className="mt-3 h-4 w-full rounded bg-slate-200" />
                <div className="mt-2 h-4 w-4/5 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && notifications.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
              🔔
            </div>

            <h2 className="text-lg font-semibold text-slate-900">
              No notifications
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {filter === "unread"
                ? "You have no unread notifications."
                : filter === "read"
                  ? "You have no read notifications."
                  : "You're all caught up."}
            </p>
          </div>
        )}

        {/* Notification list */}
        {!loading && notifications.length > 0 && (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                  notification.is_read
                    ? "border-slate-200"
                    : "border-blue-200 bg-blue-50/40"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!notification.is_read && (
                        <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">
                          NEW
                        </span>
                      )}

                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {formatType(notification.type)}
                      </span>

                      <span className="text-xs text-slate-400">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>

                    <h2 className="mt-3 text-lg font-semibold text-slate-900">
                      {notification.title}
                    </h2>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {notification.message}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {!notification.is_read && (
                      <button
                        type="button"
                        onClick={() =>
                          markAsRead(notification.id)
                        }
                        disabled={
                          actionLoading === notification.id
                        }
                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading === notification.id
                          ? "Working..."
                          : "Mark read"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        deleteNotification(notification.id)
                      }
                      disabled={
                        actionLoading === notification.id
                      }
                      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination information */}
        {!loading && notifications.length > 0 && (
          <div className="mt-6 text-center text-sm text-slate-500">
            Showing {notifications.length} of {pagination.total}{" "}
            notification{pagination.total === 1 ? "" : "s"}
          </div>
        )}
      </main>
    </div>
  );
}