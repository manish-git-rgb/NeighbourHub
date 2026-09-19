"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";

import Navbar from "@/components/layout/Navbar";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type PostCategory =
  | "DISCUSSION"
  | "RECOMMENDATION"
  | "EVENT"
  | "SERVICE"
  | "LOST_FOUND"
  | "ISSUE"
  | "ALERT";

type PostVisibility =
  | "PUBLIC"
  | "NEIGHBORHOOD";

type PostStatus =
  | "ACTIVE"
  | "HIDDEN"
  | "DELETED";

type Post = {
  id: number;
  user_id: number;
  category: PostCategory;
  title: string;
  content: string;
  visibility: PostVisibility;
  status: PostStatus;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
};

type Comment = {
  id: number;
  user_id: number;
  post_id: number;
  content: string;
  created_at: string;
  updated_at: string;
};

type Reaction = {
  id: number;
  user_id: number;
  post_id: number;
  reaction_type: string;
  created_at: string;
};

type CommentListResponse = {
  success: boolean;
  data: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

type ReactionListResponse = {
  success: boolean;
  data: Reaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

type CurrentUser = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
};

const reactionTypes = [
  {
    value: "LIKE",
    label: "👍 Like",
  },
  {
    value: "HELPFUL",
    label: "🙌 Helpful",
  },
  {
    value: "INTERESTING",
    label: "⭐ Interesting",
  },
];

export default function PostDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const postId = Number(params.id);

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>(
    [],
  );
  const [reactions, setReactions] = useState<Reaction[]>(
    [],
  );
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] =
    useState(false);
  const [reactionsLoading, setReactionsLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [commentText, setCommentText] = useState("");
  const [addingComment, setAddingComment] =
    useState(false);

  const [editingCommentId, setEditingCommentId] =
    useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [savingComment, setSavingComment] =
    useState(false);

  const [deletingCommentId, setDeletingCommentId] =
    useState<number | null>(null);

  const [reactionLoading, setReactionLoading] =
    useState(false);

  const [showReportForm, setShowReportForm] =
    useState(false);

  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] =
    useState("");
  const [reporting, setReporting] = useState(false);

  // ---------------------------------
  // Error helper
  // ---------------------------------

  function getErrorMessage(
    error: unknown,
    fallback: string,
  ) {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail;

      if (Array.isArray(detail)) {
        return detail
          .map((item) => item.msg)
          .join(", ");
      }

      if (typeof detail === "string") {
        return detail;
      }
    }

    return fallback;
  }

  // ---------------------------------
  // Load current user
  // ---------------------------------

  async function loadCurrentUser() {
    const token = getAccessToken();

    if (!token) {
      return;
    }

    try {
      const response =
        await api.get<CurrentUser>("/users/me");

      setCurrentUser(response.data);
    } catch {
      // The API interceptor handles expired tokens.
    }
  }

  // ---------------------------------
  // Load post
  // ---------------------------------

  async function loadPost() {
    if (!postId || Number.isNaN(postId)) {
      setError("Invalid post ID.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get<Post>(
        `/posts/${postId}`,
      );

      setPost(response.data);
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Unable to load this post.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------
  // Load comments
  // ---------------------------------

  async function loadComments() {
    if (!postId || Number.isNaN(postId)) {
      return;
    }

    try {
      setCommentsLoading(true);

      const response =
        await api.get<CommentListResponse>(
          "/comments/",
          {
            params: {
              post_id: postId,
              page: 1,
              limit: 100,
            },
          },
        );

      setComments(response.data.data);
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Unable to load comments.",
        ),
      );
    } finally {
      setCommentsLoading(false);
    }
  }

  // ---------------------------------
  // Load reactions
  // ---------------------------------

  async function loadReactions() {
    if (!postId || Number.isNaN(postId)) {
      return;
    }

    try {
      setReactionsLoading(true);

      const response =
        await api.get<ReactionListResponse>(
          "/reactions/",
          {
            params: {
              post_id: postId,
              page: 1,
              limit: 100,
            },
          },
        );

      setReactions(response.data.data);
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Unable to load reactions.",
        ),
      );
    } finally {
      setReactionsLoading(false);
    }
  }

  // ---------------------------------
  // Initial load
  // ---------------------------------

  useEffect(() => {
    loadCurrentUser();
    loadPost();
    loadComments();
    loadReactions();
  }, [postId]);

  // ---------------------------------
  // Reaction helpers
  // ---------------------------------

  function getReactionCount(
    reactionType: string,
  ) {
    return reactions.filter(
      (reaction) =>
        reaction.reaction_type === reactionType,
    ).length;
  }

  function getMyReaction() {
    if (!currentUser) {
      return null;
    }

    return (
      reactions.find(
        (reaction) =>
          reaction.user_id === currentUser.id,
      ) ?? null
    );
  }

  // ---------------------------------
  // Add reaction
  // ---------------------------------

  async function handleReaction(
    reactionType: string,
  ) {
    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    if (!currentUser) {
      setError(
        "Please log in before reacting to a post.",
      );
      return;
    }

    const myReaction = getMyReaction();

    try {
      setReactionLoading(true);
      setError("");
      setSuccess("");

      // The backend allows only one reaction per user
      // on a post.
      if (myReaction) {
        if (
          myReaction.reaction_type ===
          reactionType
        ) {
          await api.delete(
            `/reactions/${myReaction.id}`,
          );
        } else {
          // Remove the existing reaction first,
          // then create the new reaction.
          await api.delete(
            `/reactions/${myReaction.id}`,
          );

          await api.post("/reactions/", {
            post_id: postId,
            reaction_type: reactionType,
          });
        }
      } else {
        await api.post("/reactions/", {
          post_id: postId,
          reaction_type: reactionType,
        });
      }

      await loadReactions();
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Unable to update reaction.",
        ),
      );
    } finally {
      setReactionLoading(false);
    }
  }

  // ---------------------------------
  // Add comment
  // ---------------------------------

  async function handleAddComment(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    if (!commentText.trim()) {
      setError("Comment cannot be empty.");
      return;
    }

    try {
      setAddingComment(true);
      setError("");
      setSuccess("");

      await api.post("/comments/", {
        post_id: postId,
        content: commentText.trim(),
      });

      setCommentText("");

      await loadComments();

      setSuccess("Comment added successfully.");
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Unable to add comment.",
        ),
      );
    } finally {
      setAddingComment(false);
    }
  }

  // ---------------------------------
  // Start editing comment
  // ---------------------------------

  function startEditingComment(
    comment: Comment,
  ) {
    setEditingCommentId(comment.id);
    setEditingText(comment.content);
    setError("");
    setSuccess("");
  }

  // ---------------------------------
  // Cancel editing
  // ---------------------------------

  function cancelEditingComment() {
    setEditingCommentId(null);
    setEditingText("");
  }

  // ---------------------------------
  // Save comment
  // ---------------------------------

  async function handleSaveComment(
    commentId: number,
  ) {
    if (!editingText.trim()) {
      setError("Comment cannot be empty.");
      return;
    }

    try {
      setSavingComment(true);
      setError("");
      setSuccess("");

      await api.patch(
        `/comments/${commentId}`,
        {
          content: editingText.trim(),
        },
      );

      cancelEditingComment();

      await loadComments();

      setSuccess("Comment updated successfully.");
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Unable to update comment.",
        ),
      );
    } finally {
      setSavingComment(false);
    }
  }

  // ---------------------------------
  // Delete comment
  // ---------------------------------

  async function handleDeleteComment(
    commentId: number,
  ) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this comment?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingCommentId(commentId);
      setError("");
      setSuccess("");

      await api.delete(
        `/comments/${commentId}`,
      );

      await loadComments();

      setSuccess("Comment deleted successfully.");
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Unable to delete comment.",
        ),
      );
    } finally {
      setDeletingCommentId(null);
    }
  }

  // ---------------------------------
  // Report post
  // ---------------------------------

  async function handleReportPost(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    if (!reportReason.trim()) {
      setError("Please enter a report reason.");
      return;
    }

    try {
      setReporting(true);
      setError("");
      setSuccess("");

      await api.post("/moderation/", {
        post_id: postId,
        reason: reportReason.trim(),
        description:
          reportDescription.trim() || null,
      });

      setReportReason("");
      setReportDescription("");
      setShowReportForm(false);

      setSuccess(
        "Post reported successfully. The moderation team can now review it.",
      );
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Unable to report this post.",
        ),
      );
    } finally {
      setReporting(false);
    }
  }

  // ---------------------------------
  // Loading state
  // ---------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />

        <main className="mx-auto max-w-4xl px-4 py-10">
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-black" />

            <p className="mt-4 text-gray-500">
              Loading post...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ---------------------------------
  // Post not found
  // ---------------------------------

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />

        <main className="mx-auto max-w-4xl px-4 py-10">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => router.push("/posts")}
            className="mt-6 rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            ← Back to Posts
          </button>
        </main>
      </div>
    );
  }

  const myReaction = getMyReaction();

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.push("/posts")}
          className="mb-6 text-sm font-medium text-gray-600 hover:text-black hover:underline"
        >
          ← Back to Posts
        </button>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Post */}
        <article className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {post.category.replace("_", " ")}
            </span>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {post.visibility}
            </span>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {post.status}
            </span>
          </div>

          {/* Title */}
          <h1 className="mt-5 text-3xl font-bold text-gray-900">
            {post.title}
          </h1>

          {/* Author */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span>
              User #{post.user_id}
            </span>

            <span>•</span>

            <span>
              {new Date(
                post.created_at,
              ).toLocaleString()}
            </span>
          </div>

          {/* Content */}
          <div className="mt-7 whitespace-pre-wrap text-base leading-7 text-gray-700">
            {post.content}
          </div>

          {/* Location */}
          {(post.latitude !== null ||
            post.longitude !== null) && (
            <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
              <p className="font-medium text-gray-800">
                Location
              </p>

              <p className="mt-1">
                Latitude: {post.latitude ?? "—"}
              </p>

              <p>
                Longitude: {post.longitude ?? "—"}
              </p>
            </div>
          )}

          {/* Reactions */}
          <div className="mt-8 border-t pt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Reactions
              </h2>

              {reactionsLoading && (
                <span className="text-xs text-gray-400">
                  Updating...
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {reactionTypes.map(
                (reaction) => {
                  const selected =
                    myReaction?.reaction_type ===
                    reaction.value;

                  return (
                    <button
                      key={reaction.value}
                      type="button"
                      disabled={reactionLoading}
                      onClick={() =>
                        handleReaction(
                          reaction.value,
                        )
                      }
                      className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                        selected
                          ? "border-black bg-black text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <span>
                        {reaction.label}
                      </span>

                      <span className="ml-2">
                        {getReactionCount(
                          reaction.value,
                        )}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {/* Report */}
          <div className="mt-8 border-t pt-6">
            <button
              type="button"
              onClick={() =>
                setShowReportForm(
                  (previous) => !previous,
                )
              }
              className="text-sm font-medium text-red-600 hover:text-red-800 hover:underline"
            >
              🚩{" "}
              {showReportForm
                ? "Cancel report"
                : "Report this post"}
            </button>

            {showReportForm && (
              <form
                onSubmit={handleReportPost}
                className="mt-4 rounded-xl border border-red-100 bg-red-50 p-5"
              >
                <h3 className="font-semibold text-gray-900">
                  Report post
                </h3>

                <p className="mt-1 text-sm text-gray-600">
                  Tell the moderation team why you
                  are reporting this post.
                </p>

                <div className="mt-4">
                  <label
                    htmlFor="report-reason"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Reason
                  </label>

                  <input
                    id="report-reason"
                    type="text"
                    value={reportReason}
                    onChange={(event) =>
                      setReportReason(
                        event.target.value,
                      )
                    }
                    maxLength={100}
                    required
                    placeholder="e.g. Spam, harassment, inappropriate content"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-gray-200"
                  />
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="report-description"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Description
                  </label>

                  <textarea
                    id="report-description"
                    value={reportDescription}
                    onChange={(event) =>
                      setReportDescription(
                        event.target.value,
                      )
                    }
                    rows={4}
                    placeholder="Provide additional details..."
                    className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-gray-200"
                  />
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={reporting}
                    className="rounded-lg bg-red-600 px-5 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {reporting
                      ? "Submitting..."
                      : "Submit Report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </article>

        {/* Comments */}
        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Comments
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {comments.length}{" "}
                {comments.length === 1
                  ? "comment"
                  : "comments"}
              </p>
            </div>

            {commentsLoading && (
              <span className="text-xs text-gray-400">
                Loading...
              </span>
            )}
          </div>

          {/* Add comment */}
          {getAccessToken() ? (
            <form
              onSubmit={handleAddComment}
              className="mt-6"
            >
              <label
                htmlFor="comment"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Add a comment
              </label>

              <textarea
                id="comment"
                value={commentText}
                onChange={(event) =>
                  setCommentText(
                    event.target.value,
                  )
                }
                rows={4}
                placeholder="Write something..."
                className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-gray-200"
              />

              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={
                    addingComment ||
                    !commentText.trim()
                  }
                  className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {addingComment
                    ? "Adding..."
                    : "Add Comment"}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
              Please{" "}
              <button
                type="button"
                onClick={() =>
                  router.push("/login")
                }
                className="font-medium text-black underline"
              >
                log in
              </button>{" "}
              to add comments or reactions.
            </div>
          )}

          {/* Comment list */}
          <div className="mt-8 space-y-4">
            {comments.length === 0 ? (
              <div className="rounded-xl bg-gray-50 p-6 text-center">
                <p className="font-medium text-gray-800">
                  No comments yet
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Be the first to comment.
                </p>
              </div>
            ) : (
              comments.map((comment) => {
                const isOwner =
                  currentUser?.id ===
                  comment.user_id;

                const isEditing =
                  editingCommentId ===
                  comment.id;

                return (
                  <article
                    key={comment.id}
                    className="rounded-xl border border-gray-100 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm">
                        <span className="font-semibold text-gray-900">
                          User #{comment.user_id}
                        </span>

                        <span className="ml-2 text-gray-400">
                          {new Date(
                            comment.created_at,
                          ).toLocaleString()}
                        </span>
                      </div>

                      {isOwner && (
                        <div className="flex items-center gap-3">
                          {!isEditing && (
                            <button
                              type="button"
                              onClick={() =>
                                startEditingComment(
                                  comment,
                                )
                              }
                              className="text-sm font-medium text-gray-600 hover:text-black hover:underline"
                            >
                              Edit
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteComment(
                                comment.id,
                              )
                            }
                            disabled={
                              deletingCommentId ===
                              comment.id
                            }
                            className="text-sm font-medium text-red-600 hover:text-red-800 hover:underline disabled:opacity-50"
                          >
                            {deletingCommentId ===
                            comment.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="mt-4">
                        <textarea
                          value={editingText}
                          onChange={(event) =>
                            setEditingText(
                              event.target.value,
                            )
                          }
                          rows={4}
                          className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-gray-200"
                        />

                        <div className="mt-3 flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={
                              cancelEditingComment
                            }
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleSaveComment(
                                comment.id,
                              )
                            }
                            disabled={
                              savingComment ||
                              !editingText.trim()
                            }
                            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingComment
                              ? "Saving..."
                              : "Save"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 whitespace-pre-wrap text-gray-700">
                        {comment.content}
                      </p>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}