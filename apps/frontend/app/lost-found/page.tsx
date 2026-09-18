"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AxiosError } from "axios";

import Navbar from "@/components/layout/Navbar";
import {api} from "@/lib/api";

type LostFoundItem = {
  id: number;
  post_id: number;
  type: string;
  item_name: string;
  description: string | null;
  last_seen_location: string | null;
  contact_info: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type LostFoundForm = {
  post_id: string;
  type: string;
  item_name: string;
  description: string;
  last_seen_location: string;
  contact_info: string;
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

export default function LostFoundPage() {
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [availablePosts, setAvailablePosts] = useState<
    { id: number; title?: string; content?: string }[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [keyword, setKeyword] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [form, setForm] = useState<LostFoundForm>({
    post_id: "",
    type: "LOST",
    item_name: "",
    description: "",
    last_seen_location: "",
    contact_info: "",
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    type: "LOST",
    item_name: "",
    description: "",
    last_seen_location: "",
    contact_info: "",
    status: "",
  });

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / 20)),
    [total]
  );

  async function loadItems(targetPage = page) {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/lost-found/", {
        params: {
          page: targetPage,
          limit: 20,
          keyword: keyword.trim() || undefined,
          item_type: filterType || undefined,
          item_status: filterStatus || undefined,
        },
      });

      const payload = response.data;

      setItems(extractList<LostFoundItem>(payload));
      setTotal(payload?.pagination?.total ?? 0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadLostFoundPosts() {
    setPostsLoading(true);

    try {
      const response = await api.get("/posts/", {
        params: {
          page: 1,
          limit: 100,
          category: "LOST_FOUND",
        },
      });

      const posts = extractList<{
        id: number;
        title?: string;
        content?: string;
      }>(response.data);

      setAvailablePosts(posts);
    } catch {
      setAvailablePosts([]);
    } finally {
      setPostsLoading(false);
    }
  }

  useEffect(() => {
    loadItems(1);
    loadLostFoundPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/lost-found/", {
        post_id: Number(form.post_id),
        type: form.type,
        item_name: form.item_name.trim(),
        description: form.description.trim() || null,
        last_seen_location: form.last_seen_location.trim() || null,
        contact_info: form.contact_info.trim() || null,
      });

      setSuccess("Lost & Found item created successfully.");

      setForm({
        post_id: "",
        type: "LOST",
        item_name: "",
        description: "",
        last_seen_location: "",
        contact_info: "",
      });

      await loadItems(1);
      await loadLostFoundPosts();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(item: LostFoundItem) {
    setEditingId(item.id);

    setEditForm({
      type: item.type,
      item_name: item.item_name,
      description: item.description ?? "",
      last_seen_location: item.last_seen_location ?? "",
      contact_info: item.contact_info ?? "",
      status: item.status,
    });

    setError("");
    setSuccess("");
  }

  function cancelEditing() {
    setEditingId(null);
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingId) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/lost-found/${editingId}`, {
        type: editForm.type,
        item_name: editForm.item_name.trim(),
        description: editForm.description.trim() || null,
        last_seen_location:
          editForm.last_seen_location.trim() || null,
        contact_info: editForm.contact_info.trim() || null,
        status: editForm.status.trim() || null,
      });

      setSuccess("Lost & Found item updated successfully.");
      setEditingId(null);

      await loadItems(page);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this Lost & Found item?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/lost-found/${id}`);

      setSuccess("Lost & Found item deleted successfully.");

      const nextPage = items.length === 1 && page > 1 ? page - 1 : page;

      if (nextPage !== page) {
        setPage(nextPage);
      }

      await loadItems(nextPage);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Lost &amp; Found
          </h1>

          <p className="mt-2 text-slate-600">
            Report lost or found items and help your neighborhood reconnect
            them with their owners.
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
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Create Lost &amp; Found Report
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                A LOST_FOUND post must already exist in Posts.
              </p>
            </div>

            <Link
              href="/posts"
              className="inline-flex w-fit rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Create a Post
            </Link>
          </div>

          <form onSubmit={handleCreate} className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Related Post
              </label>

              <select
                required
                value={form.post_id}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    post_id: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
              >
                <option value="">
                  {postsLoading
                    ? "Loading LOST_FOUND posts..."
                    : "Select a LOST_FOUND post"}
                </option>

                {availablePosts.map((post) => (
                  <option key={post.id} value={post.id}>
                    #{post.id} {post.title || post.content?.slice(0, 60) || ""}
                  </option>
                ))}
              </select>

              {!postsLoading && availablePosts.length === 0 && (
                <p className="mt-2 text-xs text-amber-600">
                  No LOST_FOUND posts found. Create one from Posts first.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Type
              </label>

              <select
                value={form.type}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    type: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
              >
                <option value="LOST">LOST</option>
                <option value="FOUND">FOUND</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Item Name
              </label>

              <input
                required
                maxLength={200}
                value={form.item_name}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    item_name: e.target.value,
                  }))
                }
                placeholder="e.g. Black wallet"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Last Seen Location
              </label>

              <input
                maxLength={300}
                value={form.last_seen_location}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    last_seen_location: e.target.value,
                  }))
                }
                placeholder="e.g. Near main gate"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Contact Information
              </label>

              <input
                maxLength={300}
                value={form.contact_info}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    contact_info: e.target.value,
                  }))
                }
                placeholder="Phone / email / preferred contact"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Description
              </label>

              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
                placeholder="Describe the item..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting || !form.post_id}
                className="rounded-lg bg-slate-900 px-5 py-2.5 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Report"}
              </button>
            </div>
          </form>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-4">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by keyword..."
              className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
            />

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
            >
              <option value="">All Types</option>
              <option value="LOST">LOST</option>
              <option value="FOUND">FOUND</option>
            </select>

            <input
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              placeholder="Status filter..."
              className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
            />

            <button
              onClick={() => {
                setPage(1);
                loadItems(1);
              }}
              className="rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white hover:bg-slate-800"
            >
              Search
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Loading Lost &amp; Found items...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <h3 className="text-lg font-semibold text-slate-900">
              No items found
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Try changing the filters or create a new report.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {item.item_name}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Report #{item.id} · Post #{item.post_id}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {item.type}
                      </span>

                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {item.description && (
                    <p className="mb-4 text-sm leading-6 text-slate-600">
                      {item.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm">
                    {item.last_seen_location && (
                      <p>
                        <span className="font-medium text-slate-800">
                          Location:
                        </span>{" "}
                        <span className="text-slate-600">
                          {item.last_seen_location}
                        </span>
                      </p>
                    )}

                    {item.contact_info && (
                      <p>
                        <span className="font-medium text-slate-800">
                          Contact:
                        </span>{" "}
                        <span className="text-slate-600">
                          {item.contact_info}
                        </span>
                      </p>
                    )}

                    <p className="text-xs text-slate-400">
                      Created{" "}
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={() => startEditing(item)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                disabled={page <= 1}
                onClick={() => {
                  const nextPage = page - 1;
                  setPage(nextPage);
                  loadItems(nextPage);
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
                  loadItems(nextPage);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {editingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                Edit Lost &amp; Found Report
              </h2>

              <button
                onClick={cancelEditing}
                className="text-2xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdate} className="grid gap-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Type
                </label>

                <select
                  value={editForm.type}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      type: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                >
                  <option value="LOST">LOST</option>
                  <option value="FOUND">FOUND</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Item Name
                </label>

                <input
                  required
                  maxLength={200}
                  value={editForm.item_name}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      item_name: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Description
                </label>

                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Last Seen Location
                </label>

                <input
                  maxLength={300}
                  value={editForm.last_seen_location}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      last_seen_location: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Contact Information
                </label>

                <input
                  maxLength={300}
                  value={editForm.contact_info}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      contact_info: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Status
                </label>

                <input
                  maxLength={20}
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  placeholder="Enter the status used by your backend"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
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
                  onClick={cancelEditing}
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