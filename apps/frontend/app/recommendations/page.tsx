"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import axios, { AxiosError } from "axios";

import Navbar from "@/components/layout/Navbar";
import { api } from "@/lib/api";

interface Recommendation {
  id: number;
  user_id: number;
  place_id: number;
  content: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

interface RecommendationListResponse {
  success: boolean;
  data: Recommendation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{
      detail?: string;
    }>;

    return (
      axiosError.response?.data?.detail ||
      axiosError.message ||
      "Something went wrong."
    );
  }

  return "Something went wrong.";
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function renderStars(rating: number | null): string {
  if (rating === null) {
    return "No rating";
  }

  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] =
    useState<Recommendation[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(
    null
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ---------------------------------
  // Search
  // ---------------------------------
  const [placeId, setPlaceId] = useState("");
  const [searchPlaceId, setSearchPlaceId] = useState("");

  const [page, setPage] = useState(1);
  const limit = 20;
  const [total, setTotal] = useState(0);

  // ---------------------------------
  // Create form
  // ---------------------------------
  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [createForm, setCreateForm] = useState({
    place_id: "",
    content: "",
    rating: "",
  });

  // ---------------------------------
  // Edit modal
  // ---------------------------------
  const [editingId, setEditingId] = useState<number | null>(
    null
  );

  const [editForm, setEditForm] = useState({
    content: "",
    rating: "",
  });

  const totalPages = Math.max(
    1,
    Math.ceil(total / limit)
  );

  // ---------------------------------
  // Load recommendations
  // ---------------------------------
  const loadRecommendations = useCallback(
    async (targetPage = page, targetPlaceId = searchPlaceId) => {
      if (!targetPlaceId.trim()) {
        setRecommendations([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response =
          await api.get<RecommendationListResponse>(
            "/recommendations/",
            {
              params: {
                place_id: Number(targetPlaceId),
                page: targetPage,
                limit,
              },
            }
          );

        setRecommendations(response.data.data);
        setTotal(response.data.pagination.total);
      } catch (err) {
        setError(getErrorMessage(err));
        setRecommendations([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [page, searchPlaceId]
  );

  // ---------------------------------
  // Initial page
  // ---------------------------------
  useEffect(() => {
    setLoading(false);
  }, []);

  // ---------------------------------
  // Search
  // ---------------------------------
  async function handleSearch(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const value = placeId.trim();
    const numericPlaceId = Number(value);

    if (
      !value ||
      !Number.isInteger(numericPlaceId) ||
      numericPlaceId < 1
    ) {
      setError("Please enter a valid positive Place ID.");
      return;
    }

    setSearchPlaceId(value);
    setPage(1);

    await loadRecommendations(1, value);
  }

  // ---------------------------------
  // Create
  // ---------------------------------
  async function handleCreate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const numericPlaceId = Number(
        createForm.place_id
      );

      if (
        !Number.isInteger(numericPlaceId) ||
        numericPlaceId < 1
      ) {
        setError(
          "Place ID must be a valid positive number."
        );
        setSubmitting(false);
        return;
      }

      let rating: number | null = null;

      if (createForm.rating.trim()) {
        rating = Number(createForm.rating);

        if (
          !Number.isInteger(rating) ||
          rating < 1 ||
          rating > 5
        ) {
          setError("Rating must be between 1 and 5.");
          setSubmitting(false);
          return;
        }
      }

      await api.post("/recommendations/", {
        place_id: numericPlaceId,
        content:
          createForm.content.trim() || null,
        rating,
      });

      setSuccess(
        "Recommendation created successfully."
      );

      setCreateForm({
        place_id: "",
        content: "",
        rating: "",
      });

      setShowCreateForm(false);

      // Refresh current searched place when possible.
      if (searchPlaceId.trim()) {
        await loadRecommendations(
          1,
          searchPlaceId
        );
        setPage(1);
      } else {
        setRecommendations([]);
        setTotal(0);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------
  // Start edit
  // ---------------------------------
  function startEditing(
    recommendation: Recommendation
  ) {
    setEditingId(recommendation.id);

    setEditForm({
      content: recommendation.content ?? "",
      rating:
        recommendation.rating !== null
          ? String(recommendation.rating)
          : "",
    });

    setError("");
    setSuccess("");
  }

  // ---------------------------------
  // Cancel edit
  // ---------------------------------
  function cancelEditing() {
    setEditingId(null);
    setEditForm({
      content: "",
      rating: "",
    });
  }

  // ---------------------------------
  // Update
  // ---------------------------------
  async function handleUpdate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (editingId === null) {
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      let rating: number | null = null;

      if (editForm.rating.trim()) {
        rating = Number(editForm.rating);

        if (
          !Number.isInteger(rating) ||
          rating < 1 ||
          rating > 5
        ) {
          setError("Rating must be between 1 and 5.");
          setSubmitting(false);
          return;
        }
      }

      await api.patch(
        `/recommendations/${editingId}`,
        {
          content:
            editForm.content.trim() || null,
          rating,
        }
      );

      setSuccess(
        "Recommendation updated successfully."
      );

      setEditingId(null);

      if (searchPlaceId.trim()) {
        await loadRecommendations(
          page,
          searchPlaceId
        );
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------
  // Delete
  // ---------------------------------
  async function handleDelete(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this recommendation?"
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    setError("");
    setSuccess("");

    try {
      await api.delete(`/recommendations/${id}`);

      setSuccess(
        "Recommendation deleted successfully."
      );

      const nextPage =
        recommendations.length === 1 && page > 1
          ? page - 1
          : page;

      if (nextPage !== page) {
        setPage(nextPage);
      }

      if (searchPlaceId.trim()) {
        await loadRecommendations(
          nextPage,
          searchPlaceId
        );
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  // ---------------------------------
  // Pagination
  // ---------------------------------
  async function goToPage(nextPage: number) {
    if (
      nextPage < 1 ||
      nextPage > totalPages
    ) {
      return;
    }

    setPage(nextPage);

    if (searchPlaceId.trim()) {
      await loadRecommendations(
        nextPage,
        searchPlaceId
      );
    }
  }

  // ---------------------------------
  // Clear search
  // ---------------------------------
  function clearSearch() {
    setPlaceId("");
    setSearchPlaceId("");
    setRecommendations([]);
    setTotal(0);
    setPage(1);
    setError("");
    setSuccess("");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Recommendations
            </h1>

            <p className="mt-2 max-w-2xl text-slate-600">
              Share your experience and ratings for
              places in your local community.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowCreateForm(
                (current) => !current
              );
              setError("");
              setSuccess("");
            }}
            className="rounded-lg bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800"
          >
            {showCreateForm
              ? "Close Form"
              : "+ Add Recommendation"}
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Search */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Find Recommendations
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Enter the Place ID to view recommendations
              for that place.
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="number"
              min="1"
              value={placeId}
              onChange={(event) =>
                setPlaceId(event.target.value)
              }
              placeholder="Place ID, e.g. 5"
              className="flex-1 rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
            />

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-6 py-3 font-medium text-white hover:bg-slate-800"
            >
              Search
            </button>

            <button
              type="button"
              onClick={clearSearch}
              className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
          </form>

          {searchPlaceId && (
            <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Showing recommendations for Place #
              <span className="font-semibold text-slate-900">
                {searchPlaceId}
              </span>
            </div>
          )}
        </section>

        {/* Create */}
        {showCreateForm && (
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900">
                Add Recommendation
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Recommend a place by sharing your experience
                and optionally giving it a rating.
              </p>
            </div>

            <form
              onSubmit={handleCreate}
              className="grid gap-5 md:grid-cols-2"
            >
              {/* Place ID */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Place ID
                </label>

                <input
                  type="number"
                  min="1"
                  required
                  value={createForm.place_id}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      place_id:
                        event.target.value,
                    }))
                  }
                  placeholder="Example: 5"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                />
              </div>

              {/* Rating */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Rating
                </label>

                <select
                  value={createForm.rating}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      rating:
                        event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
                >
                  <option value="">
                    No rating
                  </option>
                  <option value="1">
                    1 - Very poor
                  </option>
                  <option value="2">
                    2 - Poor
                  </option>
                  <option value="3">
                    3 - Average
                  </option>
                  <option value="4">
                    4 - Good
                  </option>
                  <option value="5">
                    5 - Excellent
                  </option>
                </select>
              </div>

              {/* Content */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Recommendation
                </label>

                <textarea
                  value={createForm.content}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      content:
                        event.target.value,
                    }))
                  }
                  rows={5}
                  placeholder="Share your experience with this place..."
                  className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex gap-3 md:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit Recommendation"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowCreateForm(false)
                  }
                  className="rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Results */}
        {!searchPlaceId ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="text-4xl">⭐</div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              Search for a place
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Enter a Place ID above to see its
              recommendations.
            </p>
          </div>
        ) : loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((value) => (
              <div
                key={value}
                className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="text-4xl">💬</div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              No recommendations yet
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Be the first to recommend this place.
            </p>
          </div>
        ) : (
          <>
            {/* Results header */}
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {recommendations.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-900">
                  {total}
                </span>{" "}
                recommendations
              </p>

              <button
                type="button"
                onClick={() =>
                  loadRecommendations(
                    page,
                    searchPlaceId
                  )
                }
                className="self-start rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:self-auto"
              >
                Refresh
              </button>
            </div>

            {/* Cards */}
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {recommendations.map(
                (recommendation) => (
                  <article
                    key={recommendation.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          Recommendation #
                          {recommendation.id}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          Place #
                          {recommendation.place_id}
                        </p>
                      </div>

                      {recommendation.rating !== null && (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                          {recommendation.rating}/5
                        </span>
                      )}
                    </div>

                    {/* Stars */}
                    {recommendation.rating !== null && (
                      <div className="mb-4 text-sm tracking-wide text-amber-500">
                        {renderStars(
                          recommendation.rating
                        )}
                      </div>
                    )}

                    {/* Content */}
                    {recommendation.content ? (
                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {recommendation.content}
                      </p>
                    ) : (
                      <p className="text-sm italic text-slate-400">
                        No written recommendation.
                      </p>
                    )}

                    {/* Metadata */}
                    <div className="mt-5 space-y-1 border-t border-slate-100 pt-4 text-xs text-slate-400">
                      <p>
                        User #{recommendation.user_id}
                      </p>

                      <p>
                        Created{" "}
                        {formatDate(
                          recommendation.created_at
                        )}
                      </p>

                      <p>
                        Updated{" "}
                        {formatDate(
                          recommendation.updated_at
                        )}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() =>
                          startEditing(
                            recommendation
                          )
                        }
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            recommendation.id
                          )
                        }
                        disabled={
                          deletingId ===
                          recommendation.id
                        }
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId ===
                        recommendation.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>

            {/* Pagination */}
            {total > 0 && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    goToPage(page - 1)
                  }
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="text-sm text-slate-600">
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() =>
                    goToPage(page + 1)
                  }
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit modal */}
      {editingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Edit Recommendation
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Recommendation #{editingId}
                </p>
              </div>

              <button
                type="button"
                onClick={cancelEditing}
                className="text-2xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleUpdate}
              className="grid gap-5"
            >
              {/* Content */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Recommendation
                </label>

                <textarea
                  rows={5}
                  value={editForm.content}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      content:
                        event.target.value,
                    }))
                  }
                  placeholder="Share your experience..."
                  className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                />
              </div>

              {/* Rating */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Rating
                </label>

                <select
                  value={editForm.rating}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      rating:
                        event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
                >
                  <option value="">
                    No rating
                  </option>
                  <option value="1">
                    1 - Very poor
                  </option>
                  <option value="2">
                    2 - Poor
                  </option>
                  <option value="3">
                    3 - Average
                  </option>
                  <option value="4">
                    4 - Good
                  </option>
                  <option value="5">
                    5 - Excellent
                  </option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-slate-900 px-5 py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Saving..."
                    : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={cancelEditing}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
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