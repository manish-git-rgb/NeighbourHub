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

interface ModerationCase {
  id: number;
  reporter_id: number;
  post_id: number | null;
  comment_id: number | null;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ModerationListResponse {
  success: boolean;
  data: ModerationCase[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

interface CurrentUser {
  id: number;
  name: string;
  username: string;
  email: string;
  profile_image: string | null;
  bio: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

const MODERATOR_ROLES = ["MODERATOR", "ADMIN"];

const STATUS_OPTIONS = [
  "OPEN",
  "IN_REVIEW",
  "RESOLVED",
  "DISMISSED",
];

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

function statusClass(status: string): string {
  switch (status.toUpperCase()) {
    case "OPEN":
      return "bg-red-50 text-red-700";
    case "IN_REVIEW":
      return "bg-amber-50 text-amber-700";
    case "RESOLVED":
      return "bg-green-50 text-green-700";
    case "DISMISSED":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function ModerationPage() {
  // ---------------------------------
  // Current user
  // ---------------------------------
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [userLoading, setUserLoading] = useState(true);

  // ---------------------------------
  // Moderation cases
  // ---------------------------------
  const [cases, setCases] = useState<ModerationCase[]>([]);

  const [casesLoading, setCasesLoading] =
    useState(false);

  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const limit = 20;

  const [caseStatusFilter, setCaseStatusFilter] =
    useState("");

  // ---------------------------------
  // UI state
  // ---------------------------------
  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [selectedCase, setSelectedCase] =
    useState<ModerationCase | null>(null);

  const [updatingId, setUpdatingId] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ---------------------------------
  // Create form
  // ---------------------------------
  const [createForm, setCreateForm] = useState({
    post_id: "",
    comment_id: "",
    reason: "",
    description: "",
  });

  // ---------------------------------
  // Load current user
  // ---------------------------------
  useEffect(() => {
    async function loadCurrentUser() {
      try {
        setUserLoading(true);
        setError("");

        const response =
          await api.get<CurrentUser>("/users/me");

        setCurrentUser(response.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setUserLoading(false);
      }
    }

    loadCurrentUser();
  }, []);

  // ---------------------------------
  // Role helper
  // ---------------------------------
  const isModerator = Boolean(
    currentUser &&
      MODERATOR_ROLES.includes(
        currentUser.role.toUpperCase()
      )
  );

  // ---------------------------------
  // Load moderation cases
  // ---------------------------------
  const loadCases = useCallback(
    async (targetPage = page) => {
      if (!isModerator) {
        setCases([]);
        setTotal(0);
        return;
      }

      try {
        setCasesLoading(true);
        setError("");

        const response =
          await api.get<ModerationListResponse>(
            "/moderation/",
            {
              params: {
                page: targetPage,
                limit,
                status:
                  caseStatusFilter || undefined,
              },
            }
          );

        setCases(response.data.data);
        setTotal(
          response.data.pagination.total
        );
      } catch (err) {
        setError(getErrorMessage(err));
        setCases([]);
        setTotal(0);
      } finally {
        setCasesLoading(false);
      }
    },
    [
      caseStatusFilter,
      isModerator,
      page,
    ]
  );

  // ---------------------------------
  // Load cases after user is known
  // ---------------------------------
  useEffect(() => {
    if (!userLoading && isModerator) {
      loadCases(1);
    }
  }, [
    userLoading,
    isModerator,
    loadCases,
  ]);

  // ---------------------------------
  // Create moderation report
  // ---------------------------------
  async function handleCreate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const postId = createForm.post_id.trim();
    const commentId =
      createForm.comment_id.trim();

    let parsedPostId: number | null = null;
    let parsedCommentId: number | null = null;

    if (postId) {
      parsedPostId = Number(postId);

      if (
        !Number.isInteger(parsedPostId) ||
        parsedPostId < 1
      ) {
        setError(
          "Post ID must be a valid positive number."
        );
        return;
      }
    }

    if (commentId) {
      parsedCommentId = Number(commentId);

      if (
        !Number.isInteger(parsedCommentId) ||
        parsedCommentId < 1
      ) {
        setError(
          "Comment ID must be a valid positive number."
        );
        return;
      }
    }

    if (!createForm.reason.trim()) {
      setError("Reason is required.");
      return;
    }

    setUpdatingId(-1);

    try {
      await api.post("/moderation/", {
        post_id: parsedPostId,
        comment_id: parsedCommentId,
        reason: createForm.reason.trim(),
        description:
          createForm.description.trim() || null,
      });

      setSuccess(
        "Moderation report submitted successfully."
      );

      setCreateForm({
        post_id: "",
        comment_id: "",
        reason: "",
        description: "",
      });

      setShowCreateForm(false);

      if (isModerator) {
        await loadCases(1);
        setPage(1);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  }

  // ---------------------------------
  // Update moderation status
  // ---------------------------------
  async function handleStatusUpdate(
    caseId: number,
    newStatus: string
  ) {
    setUpdatingId(caseId);
    setError("");
    setSuccess("");

    try {
      await api.patch(
        `/moderation/${caseId}`,
        {
          status: newStatus,
        }
      );

      setSuccess(
        `Moderation case #${caseId} updated successfully.`
      );

      await loadCases(page);

      if (selectedCase?.id === caseId) {
        setSelectedCase(null);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  }

  // ---------------------------------
  // Pagination
  // ---------------------------------
  const totalPages = Math.max(
    1,
    Math.ceil(total / limit)
  );

  async function goToPage(nextPage: number) {
    if (
      nextPage < 1 ||
      nextPage > totalPages
    ) {
      return;
    }

    setPage(nextPage);
    await loadCases(nextPage);
  }

  // ---------------------------------
  // Clear filter
  // ---------------------------------
  async function clearStatusFilter() {
    setCaseStatusFilter("");
    setPage(1);

    if (isModerator) {
      try {
        setCasesLoading(true);
        setError("");

        const response =
          await api.get<ModerationListResponse>(
            "/moderation/",
            {
              params: {
                page: 1,
                limit,
              },
            }
          );

        setCases(response.data.data);
        setTotal(
          response.data.pagination.total
        );
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setCasesLoading(false);
      }
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Moderation
            </h1>

            <p className="mt-2 max-w-2xl text-slate-600">
              Report inappropriate community content
              and help keep NeighborHub useful and safe.
            </p>
          </div>

          {!userLoading && (
            <div className="rounded-lg bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-slate-200">
              <span className="text-slate-500">
                Current role:
              </span>{" "}
              <span className="font-semibold text-slate-900">
                {currentUser?.role || "Unknown"}
              </span>
            </div>
          )}
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

        {/* Create report */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Report Content
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Submit a moderation report for a post or
                comment.
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
              className="rounded-lg bg-slate-900 px-5 py-2.5 font-medium text-white hover:bg-slate-800"
            >
              {showCreateForm
                ? "Close Form"
                : "+ Report Content"}
            </button>
          </div>

          {showCreateForm && (
            <div className="border-t border-slate-100 p-6">
              <form
                onSubmit={handleCreate}
                className="grid gap-5 md:grid-cols-2"
              >
                {/* Post ID */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Post ID
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={createForm.post_id}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        post_id:
                          event.target.value,
                      }))
                    }
                    placeholder="Optional"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                  />
                </div>

                {/* Comment ID */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Comment ID
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={createForm.comment_id}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        comment_id:
                          event.target.value,
                      }))
                    }
                    placeholder="Optional"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                  />
                </div>

                {/* Reason */}
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Reason
                  </label>

                  <input
                    required
                    maxLength={100}
                    value={createForm.reason}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        reason:
                          event.target.value,
                      }))
                    }
                    placeholder="e.g. Spam, harassment, misleading content"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Description
                  </label>

                  <textarea
                    rows={5}
                    value={createForm.description}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        description:
                          event.target.value,
                      }))
                    }
                    placeholder="Provide additional context..."
                    className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                  />
                </div>

                <div className="flex gap-3 md:col-span-2">
                  <button
                    type="submit"
                    disabled={updatingId === -1}
                    className="rounded-lg bg-slate-900 px-5 py-2.5 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updatingId === -1
                      ? "Submitting..."
                      : "Submit Report"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowCreateForm(false)
                    }
                    className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>

              <p className="mt-4 text-xs text-slate-400">
                Provide the relevant Post ID or Comment ID
                from the content you want to report.
              </p>
            </div>
          )}
        </section>

        {/* Moderator panel */}
        {!userLoading && isModerator && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Panel header */}
            <div className="border-b border-slate-100 p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Moderation Queue
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Review and update reported content.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <select
                    value={caseStatusFilter}
                    onChange={async (event) => {
                      const value =
                        event.target.value;

                      setCaseStatusFilter(value);
                      setPage(1);

                      try {
                        setCasesLoading(true);
                        setError("");

                        const response =
                          await api.get<ModerationListResponse>(
                            "/moderation/",
                            {
                              params: {
                                page: 1,
                                limit,
                                status:
                                  value ||
                                  undefined,
                              },
                            }
                          );

                        setCases(
                          response.data.data
                        );

                        setTotal(
                          response.data
                            .pagination.total
                        );
                      } catch (err) {
                        setError(
                          getErrorMessage(err)
                        );
                      } finally {
                        setCasesLoading(false);
                      }
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none"
                  >
                    <option value="">
                      All Statuses
                    </option>

                    {STATUS_OPTIONS.map(
                      (statusValue) => (
                        <option
                          key={statusValue}
                          value={statusValue}
                        >
                          {statusValue}
                        </option>
                      )
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={() =>
                      loadCases(page)
                    }
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={clearStatusFilter}
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Queue body */}
            <div className="p-6">
              {casesLoading ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map(
                    (value) => (
                      <div
                        key={value}
                        className="h-64 animate-pulse rounded-xl bg-slate-100"
                      />
                    )
                  )}
                </div>
              ) : cases.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
                  <div className="text-4xl">
                    ✅
                  </div>

                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    No moderation cases found
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    The moderation queue is empty for
                    the selected filter.
                  </p>
                </div>
              ) : (
                <>
                  {/* Summary */}
                  <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-600">
                      Showing{" "}
                      <span className="font-semibold text-slate-900">
                        {cases.length}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-slate-900">
                        {total}
                      </span>{" "}
                      cases
                    </p>
                  </div>

                  {/* Cases */}
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {cases.map((moderationCase) => (
                      <article
                        key={moderationCase.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-5"
                      >
                        {/* Header */}
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              Case #
                              {moderationCase.id}
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              Reporter #
                              {
                                moderationCase.reporter_id
                              }
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                              moderationCase.status
                            )}`}
                          >
                            {moderationCase.status}
                          </span>
                        </div>

                        {/* Target */}
                        <div className="mb-4 rounded-lg bg-white p-3 ring-1 ring-slate-200">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Reported Content
                          </p>

                          <div className="mt-2 space-y-1 text-sm text-slate-700">
                            <p>
                              <span className="font-medium">
                                Post:
                              </span>{" "}
                              {moderationCase.post_id !==
                              null
                                ? `#${moderationCase.post_id}`
                                : "None"}
                            </p>

                            <p>
                              <span className="font-medium">
                                Comment:
                              </span>{" "}
                              {moderationCase.comment_id !==
                              null
                                ? `#${moderationCase.comment_id}`
                                : "None"}
                            </p>
                          </div>
                        </div>

                        {/* Reason */}
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Reason
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {moderationCase.reason}
                          </p>
                        </div>

                        {/* Description */}
                        {moderationCase.description && (
                          <div className="mt-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Description
                            </p>

                            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                              {
                                moderationCase.description
                              }
                            </p>
                          </div>
                        )}

                        {/* Dates */}
                        <div className="mt-5 space-y-1 border-t border-slate-200 pt-4 text-xs text-slate-400">
                          <p>
                            Created{" "}
                            {formatDate(
                              moderationCase.created_at
                            )}
                          </p>

                          <p>
                            Updated{" "}
                            {formatDate(
                              moderationCase.updated_at
                            )}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedCase(
                                moderationCase
                              )
                            }
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            View Details
                          </button>

                          <select
                            value=""
                            disabled={
                              updatingId ===
                              moderationCase.id
                            }
                            onChange={(event) => {
                              const value =
                                event.target.value;

                              if (value) {
                                handleStatusUpdate(
                                  moderationCase.id,
                                  value
                                );
                              }
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                          >
                            <option value="">
                              Change Status
                            </option>

                            {STATUS_OPTIONS.map(
                              (statusValue) => (
                                <option
                                  key={statusValue}
                                  value={statusValue}
                                >
                                  {statusValue}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      </article>
                    ))}
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
                        disabled={
                          page >= totalPages
                        }
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
          </section>
        )}

        {/* Normal user information */}
        {!userLoading && !isModerator && (
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
            <h2 className="font-semibold text-blue-900">
              Community Reporting
            </h2>

            <p className="mt-2 text-sm leading-6 text-blue-800">
              Your submitted moderation reports are
              reviewed by moderators or administrators.
              The moderation queue is only available to
              those roles.
            </p>
          </section>
        )}
      </div>

      {/* Details modal */}
      {selectedCase !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Moderation Case #
                  {selectedCase.id}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Full case details
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedCase(null)
                }
                className="text-2xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                <span className="text-sm font-medium text-slate-600">
                  Status
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                    selectedCase.status
                  )}`}
                >
                  {selectedCase.status}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Reporter ID
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    #{selectedCase.reporter_id}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Case ID
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    #{selectedCase.id}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Post ID
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {selectedCase.post_id !== null
                      ? `#${selectedCase.post_id}`
                      : "None"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Comment ID
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {selectedCase.comment_id !==
                    null
                      ? `#${selectedCase.comment_id}`
                      : "None"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Reason
                </p>

                <p className="mt-2 text-base font-medium text-slate-900">
                  {selectedCase.reason}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Description
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {selectedCase.description ||
                    "No additional description provided."}
                </p>
              </div>

              <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Created
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    {formatDate(
                      selectedCase.created_at
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Updated
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    {formatDate(
                      selectedCase.updated_at
                    )}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Update Status
                </label>

                <select
                  value={selectedCase.status}
                  disabled={
                    updatingId ===
                    selectedCase.id
                  }
                  onChange={(event) => {
                    const value =
                      event.target.value;

                    if (
                      value !==
                      selectedCase.status
                    ) {
                      handleStatusUpdate(
                        selectedCase.id,
                        value
                      );

                      setSelectedCase(
                        (current) =>
                          current
                            ? {
                                ...current,
                                status: value,
                              }
                            : current
                      );
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none"
                >
                  {STATUS_OPTIONS.map(
                    (statusValue) => (
                      <option
                        key={statusValue}
                        value={statusValue}
                      >
                        {statusValue}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setSelectedCase(null)
                }
                className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}