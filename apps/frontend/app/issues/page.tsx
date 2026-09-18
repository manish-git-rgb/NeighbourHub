"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";

import Navbar from "@/components/layout/Navbar";
import {api} from "@/lib/api";

type IssueReport = {
  id: number;
  user_id: number;
  neighborhood_id: number | null;
  title: string;
  description: string;
  category: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
  distance_km?: number;
};

type CurrentUser = {
  id: number;
  role: string;
};

type IssueForm = {
  neighborhood_id: string;
  title: string;
  description: string;
  category: string;
  latitude: string;
  longitude: string;
};

function extractList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray((payload as { data: unknown }).data)
  ) {
    return (payload as { data: T[] }).data;
  }

  return [];
}

function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{
    detail?: string;
  }>;

  return (
    axiosError.response?.data?.detail ||
    axiosError.message ||
    "Something went wrong."
  );
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<IssueReport[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [keyword, setKeyword] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterNeighborhood, setFilterNeighborhood] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [radius, setRadius] = useState("5");
  const [nearbyMode, setNearbyMode] = useState(false);

  const [form, setForm] = useState<IssueForm>({
    neighborhood_id: "",
    title: "",
    description: "",
    category: "",
    latitude: "",
    longitude: "",
  });

  const [editingIssue, setEditingIssue] = useState<IssueReport | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / 20)),
    [total]
  );

  const isStaff =
    currentUser?.role === "ADMIN" || currentUser?.role === "MODERATOR";

  async function loadCurrentUser() {
    try {
      const response = await api.get("/users/me");
      setCurrentUser(response.data);
    } catch {
      setCurrentUser(null);
    }
  }

  async function loadIssues(targetPage = page) {
    setLoading(true);
    setError("");

    try {
      if (nearbyMode) {
        if (!navigator.geolocation) {
          throw new Error(
            "Geolocation is not supported by your browser."
          );
        }

        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          }
        );

        const response = await api.get("/issues/nearby", {
          params: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            radius_km: Number(radius),
            limit: 100,
          },
        });

        setIssues(extractList<IssueReport>(response.data));
        setTotal(extractList<IssueReport>(response.data).length);
        return;
      }

      const response = await api.get("/issues/", {
        params: {
          page: targetPage,
          limit: 20,
          category: filterCategory || undefined,
          status: filterStatus || undefined,
          keyword: keyword.trim() || undefined,
          neighborhood_id: filterNeighborhood
            ? Number(filterNeighborhood)
            : undefined,
        },
      });

      const payload = response.data;

      setIssues(extractList<IssueReport>(payload));
      setTotal(payload?.pagination?.total ?? 0);
    } catch (err) {
      if (
        err instanceof GeolocationPositionError ||
        (err instanceof Error &&
          err.message.includes("Geolocation"))
      ) {
        setError(
          "Location access is required for nearby issue search. Please allow location access and try again."
        );
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCurrentUser();
    loadIssues(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function useCurrentLocation() {
    setError("");

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));

        setSuccess("Current location added to the issue.");
      },
      () => {
        setError(
          "Unable to access your location. Please allow location access."
        );
      }
    );
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/issues/", {
        neighborhood_id: form.neighborhood_id
          ? Number(form.neighborhood_id)
          : null,
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        latitude: form.latitude
          ? Number(form.latitude)
          : null,
        longitude: form.longitude
          ? Number(form.longitude)
          : null,
      });

      setSuccess("Issue report created successfully.");

      setForm({
        neighborhood_id: "",
        title: "",
        description: "",
        category: "",
        latitude: "",
        longitude: "",
      });

      setNearbyMode(false);
      setPage(1);

      await loadIssues(1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(issue: IssueReport) {
    setEditingIssue(issue);
    setError("");
    setSuccess("");
  }

  function canManageIssue(issue: IssueReport) {
    if (!currentUser) return false;

    return currentUser.id === issue.user_id || isStaff;
  }

  function canEditIssue(issue: IssueReport) {
    return currentUser?.id === issue.user_id || isStaff;
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingIssue) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const isOwner = currentUser?.id === editingIssue.user_id;

      const payload: Record<string, unknown> = {
        status: editingIssue.status,
      };

      if (isOwner) {
        payload.neighborhood_id = editingIssue.neighborhood_id;
        payload.title = editingIssue.title.trim();
        payload.description = editingIssue.description.trim();
        payload.category = editingIssue.category.trim();
        payload.latitude = editingIssue.latitude;
        payload.longitude = editingIssue.longitude;
      }

      await api.patch(`/issues/${editingIssue.id}`, payload);

      setSuccess("Issue report updated successfully.");
      setEditingIssue(null);

      await loadIssues(page);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this issue report?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/issues/${id}`);

      setSuccess("Issue report deleted successfully.");

      const nextPage = issues.length === 1 && page > 1 ? page - 1 : page;

      if (nextPage !== page) {
        setPage(nextPage);
      }

      await loadIssues(nextPage);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function getStatusClass(status: string) {
    switch (status) {
      case "OPEN":
        return "bg-red-50 text-red-700";
      case "IN_PROGRESS":
        return "bg-amber-50 text-amber-700";
      case "RESOLVED":
        return "bg-green-50 text-green-700";
      case "REJECTED":
        return "bg-slate-100 text-slate-700";
      default:
        return "bg-blue-50 text-blue-700";
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Issue Reports
          </h1>

          <p className="mt-2 text-slate-600">
            Report neighborhood problems such as damaged roads, street
            lights, garbage, drainage, or other local issues.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            {success}
          </div>
        )}

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Report an Issue
          </h2>

          <form onSubmit={handleCreate} className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Title
              </label>

              <input
                required
                maxLength={200}
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="e.g. Street light not working"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Category
              </label>

              <input
                required
                maxLength={50}
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                placeholder="e.g. STREET_LIGHT"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Description
              </label>

              <textarea
                required
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={4}
                placeholder="Describe the issue..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Neighborhood ID
              </label>

              <input
                type="number"
                min={1}
                value={form.neighborhood_id}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    neighborhood_id: e.target.value,
                  }))
                }
                placeholder="Optional"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Location
              </label>

              <button
                type="button"
                onClick={useCurrentLocation}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Use My Current Location
              </button>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Latitude
              </label>

              <input
                type="number"
                step="any"
                min={-90}
                max={90}
                value={form.latitude}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    latitude: e.target.value,
                  }))
                }
                placeholder="Optional"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Longitude
              </label>

              <input
                type="number"
                step="any"
                min={-180}
                max={180}
                value={form.longitude}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    longitude: e.target.value,
                  }))
                }
                placeholder="Optional"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-slate-900 px-5 py-2.5 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Issue"}
              </button>
            </div>
          </form>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Find Issues
            </h2>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setNearbyMode(false);
                  setPage(1);
                  loadIssues(1);
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  !nearbyMode
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 text-slate-700"
                }`}
              >
                All Issues
              </button>

              <button
                onClick={() => {
                  setNearbyMode(true);
                  loadIssues(1);
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  nearbyMode
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 text-slate-700"
                }`}
              >
                Nearby
              </button>
            </div>
          </div>

          {!nearbyMode ? (
            <div className="grid gap-4 md:grid-cols-5">
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search..."
                className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
              />

              <input
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                placeholder="Category..."
                className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
              />

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
              >
                <option value="">All Statuses</option>
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>

              <input
                type="number"
                min={1}
                value={filterNeighborhood}
                onChange={(e) => setFilterNeighborhood(e.target.value)}
                placeholder="Neighborhood ID"
                className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
              />

              <button
                onClick={() => {
                  setPage(1);
                  loadIssues(1);
                }}
                className="rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white hover:bg-slate-800"
              >
                Search
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-600">
                Search issues around your current location
              </span>

              <select
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="1">1 km</option>
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="25">25 km</option>
                <option value="50">50 km</option>
              </select>

              <button
                onClick={() => loadIssues(1)}
                className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white"
              >
                Search Nearby
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Loading issues...
          </div>
        ) : issues.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <h3 className="text-lg font-semibold text-slate-900">
              No issues found
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Try different filters or report a new issue.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {issue.title}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Issue #{issue.id}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                        issue.status
                      )}`}
                    >
                      {issue.status}
                    </span>
                  </div>

                  <p className="mb-4 text-sm leading-6 text-slate-600">
                    {issue.description}
                  </p>

                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium text-slate-800">
                        Category:
                      </span>{" "}
                      <span className="text-slate-600">
                        {issue.category}
                      </span>
                    </p>

                    {issue.neighborhood_id !== null && (
                      <p>
                        <span className="font-medium text-slate-800">
                          Neighborhood:
                        </span>{" "}
                        <span className="text-slate-600">
                          #{issue.neighborhood_id}
                        </span>
                      </p>
                    )}

                    {issue.latitude !== null &&
                      issue.longitude !== null && (
                        <p>
                          <span className="font-medium text-slate-800">
                            Location:
                          </span>{" "}
                          <span className="text-slate-600">
                            {issue.latitude.toFixed(5)},{" "}
                            {issue.longitude.toFixed(5)}
                          </span>
                        </p>
                      )}

                    {typeof issue.distance_km === "number" && (
                      <p>
                        <span className="font-medium text-slate-800">
                          Distance:
                        </span>{" "}
                        <span className="text-slate-600">
                          {issue.distance_km.toFixed(2)} km
                        </span>
                      </p>
                    )}

                    <p className="text-xs text-slate-400">
                      Reported{" "}
                      {new Date(issue.created_at).toLocaleString()}
                    </p>
                  </div>

                  {canManageIssue(issue) && (
                    <div className="mt-5 flex gap-2">
                      {canEditIssue(issue) && (
                        <button
                          onClick={() => startEditing(issue)}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Update
                        </button>
                      )}

                      {currentUser?.id === issue.user_id && (
                        <button
                          onClick={() => handleDelete(issue.id)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!nearbyMode && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  disabled={page <= 1}
                  onClick={() => {
                    const nextPage = page - 1;
                    setPage(nextPage);
                    loadIssues(nextPage);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="text-sm text-slate-600">
                  Page {page} of {totalPages}
                </span>

                <button
                  disabled={page >= totalPages}
                  onClick={() => {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    loadIssues(nextPage);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {editingIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Update Issue
                </h2>

                {!(
                  currentUser?.id === editingIssue.user_id
                ) && (
                  <p className="mt-1 text-sm text-slate-500">
                    Staff accounts can update the issue status.
                  </p>
                )}
              </div>

              <button
                onClick={() => setEditingIssue(null)}
                className="text-2xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdate} className="grid gap-5">
              {currentUser?.id === editingIssue.user_id && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Title
                    </label>

                    <input
                      required
                      maxLength={200}
                      value={editingIssue.title}
                      onChange={(e) =>
                        setEditingIssue((prev) =>
                          prev
                            ? {
                                ...prev,
                                title: e.target.value,
                              }
                            : prev
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Description
                    </label>

                    <textarea
                      required
                      rows={4}
                      value={editingIssue.description}
                      onChange={(e) =>
                        setEditingIssue((prev) =>
                          prev
                            ? {
                                ...prev,
                                description: e.target.value,
                              }
                            : prev
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Category
                    </label>

                    <input
                      required
                      maxLength={50}
                      value={editingIssue.category}
                      onChange={(e) =>
                        setEditingIssue((prev) =>
                          prev
                            ? {
                                ...prev,
                                category: e.target.value,
                              }
                            : prev
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Neighborhood ID
                    </label>

                    <input
                      type="number"
                      min={1}
                      value={editingIssue.neighborhood_id ?? ""}
                      onChange={(e) =>
                        setEditingIssue((prev) =>
                          prev
                            ? {
                                ...prev,
                                neighborhood_id: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              }
                            : prev
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Latitude
                      </label>

                      <input
                        type="number"
                        step="any"
                        min={-90}
                        max={90}
                        value={editingIssue.latitude ?? ""}
                        onChange={(e) =>
                          setEditingIssue((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  latitude: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                }
                              : prev
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Longitude
                      </label>

                      <input
                        type="number"
                        step="any"
                        min={-180}
                        max={180}
                        value={editingIssue.longitude ?? ""}
                        onChange={(e) =>
                          setEditingIssue((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  longitude: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                }
                              : prev
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Status
                </label>

                <select
                  value={editingIssue.status}
                  onChange={(e) =>
                    setEditingIssue((prev) =>
                      prev
                        ? {
                            ...prev,
                            status: e.target.value,
                          }
                        : prev
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-slate-900 px-5 py-2.5 font-medium text-white disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={() => setEditingIssue(null)}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}