"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import axios from "axios";
import Link from "next/link";

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

type ReactionType =
  | "LIKE"
  | "HELPFUL"
  | "INTERESTING";

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

type PostListResponse = {
  success: boolean;
  data: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

type Reaction = {
  id: number;
  user_id: number;
  post_id: number;
  reaction_type: ReactionType;
  created_at: string;
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

type Comment = {
  id: number;
  user_id: number;
  post_id: number;
  content: string;
  created_at: string;
  updated_at: string;
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

type User = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
};

const categories: PostCategory[] = [
  "DISCUSSION",
  "RECOMMENDATION",
  "EVENT",
  "SERVICE",
  "LOST_FOUND",
  "ISSUE",
  "ALERT",
];

const reactionTypes: {
  type: ReactionType;
  label: string;
  icon: string;
}[] = [
  {
    type: "LIKE",
    label: "Like",
    icon: "👍",
  },
  {
    type: "HELPFUL",
    label: "Helpful",
    icon: "🙌",
  },
  {
    type: "INTERESTING",
    label: "Interesting",
    icon: "⭐",
  },
];

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [locationLoading, setLocationLoading] =
    useState(false);

  const [error, setError] = useState("");

  const [keyword, setKeyword] = useState("");
  const [category, setCategory] =
    useState<PostCategory | "">("");

  const [nearbyMode, setNearbyMode] =
    useState(false);

  const [radius, setRadius] = useState("5");

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [newCategory, setNewCategory] =
    useState<PostCategory>("DISCUSSION");

  const [visibility, setVisibility] =
    useState<PostVisibility>("NEIGHBORHOOD");

  const [latitude, setLatitude] =
    useState("18.5074");

  const [longitude, setLongitude] =
    useState("73.8077");

  // ---------------------------------
  // Current user
  // ---------------------------------

  const [currentUser, setCurrentUser] =
    useState<User | null>(null);

  // ---------------------------------
  // Reactions
  // ---------------------------------

  const [reactions, setReactions] =
    useState<Record<number, Reaction[]>>({});

  const [reactionLoading, setReactionLoading] =
    useState<Record<number, boolean>>({});

  // ---------------------------------
  // Comments
  // ---------------------------------

  const [comments, setComments] =
    useState<Record<number, Comment[]>>({});

  const [commentCounts, setCommentCounts] =
    useState<Record<number, number>>({});

  const [commentsLoading, setCommentsLoading] =
    useState<Record<number, boolean>>({});

  const [commentSubmitting, setCommentSubmitting] =
    useState<Record<number, boolean>>({});

  const [commentText, setCommentText] =
    useState<Record<number, string>>({});

  const [editingCommentId, setEditingCommentId] =
    useState<number | null>(null);

  const [editingCommentText, setEditingCommentText] =
    useState("");

  const [commentActionLoading, setCommentActionLoading] =
    useState<Record<number, boolean>>({});

  const [expandedComments, setExpandedComments] =
    useState<Record<number, boolean>>({});

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
        await api.get<User>("/users/me");

      setCurrentUser(response.data);
    } catch {
      // The API interceptor handles authentication failures.
    }
  }

  // ---------------------------------
  // Load all posts
  // ---------------------------------

  async function loadPosts() {
    try {
      setLoading(true);
      setError("");
      setNearbyMode(false);

      const response =
        await api.get<PostListResponse>(
          "/posts/",
          {
            params: {
              page: 1,
              limit: 20,
              ...(keyword.trim()
                ? {
                    keyword: keyword.trim(),
                  }
                : {}),
              ...(category
                ? {
                    category,
                  }
                : {}),
            },
          },
        );

      const loadedPosts = response.data.data;

      setPosts(loadedPosts);

      await loadEngagement(loadedPosts);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.detail ||
            "Unable to load posts.",
        );
      } else {
        setError("Unable to load posts.");
      }
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------
  // Load nearby posts
  // ---------------------------------

  async function loadNearbyPosts(
    latitudeValue: number,
    longitudeValue: number,
  ) {
    try {
      setLoading(true);
      setLocationLoading(true);
      setError("");

      const response =
        await api.get<Post[]>(
          "/posts/nearby",
          {
            params: {
              latitude: latitudeValue,
              longitude: longitudeValue,
              radius_km: Number(radius),
              page: 1,
              limit: 20,
              ...(category
                ? {
                    category,
                  }
                : {}),
              ...(keyword.trim()
                ? {
                    keyword: keyword.trim(),
                  }
                : {}),
            },
          },
        );

      const loadedPosts = response.data;

      setPosts(loadedPosts);
      setNearbyMode(true);

      await loadEngagement(loadedPosts);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.detail ||
            "Unable to load nearby posts.",
        );
      } else {
        setError(
          "Unable to load nearby posts.",
        );
      }
    } finally {
      setLoading(false);
      setLocationLoading(false);
    }
  }

  // ---------------------------------
  // Load reactions + comment counts
  // ---------------------------------

  async function loadEngagement(
    loadedPosts: Post[],
  ) {
    if (loadedPosts.length === 0) {
      setReactions({});
      setCommentCounts({});
      return;
    }

    const reactionResults =
      await Promise.all(
        loadedPosts.map(async (post) => {
          try {
            const response =
              await api.get<ReactionListResponse>(
                "/reactions/",
                {
                  params: {
                    post_id: post.id,
                    page: 1,
                    limit: 100,
                  },
                },
              );

            return {
              postId: post.id,
              reactions: response.data.data,
            };
          } catch {
            return {
              postId: post.id,
              reactions: [],
            };
          }
        }),
      );

    const reactionMap: Record<
      number,
      Reaction[]
    > = {};

    reactionResults.forEach((item) => {
      reactionMap[item.postId] =
        item.reactions;
    });

    setReactions(reactionMap);

    const commentResults =
      await Promise.all(
        loadedPosts.map(async (post) => {
          try {
            const response =
              await api.get<CommentListResponse>(
                "/comments/",
                {
                  params: {
                    post_id: post.id,
                    page: 1,
                    limit: 100,
                  },
                },
              );

            return {
              postId: post.id,
              comments: response.data.data,
              total:
                response.data.pagination.total,
            };
          } catch {
            return {
              postId: post.id,
              comments: [],
              total: 0,
            };
          }
        }),
      );

    const commentMap: Record<
      number,
      Comment[]
    > = {};

    const countMap: Record<
      number,
      number
    > = {};

    commentResults.forEach((item) => {
      commentMap[item.postId] =
        item.comments;

      countMap[item.postId] =
        item.total;
    });

    setComments(commentMap);
    setCommentCounts(countMap);
  }

  // ---------------------------------
  // Initial load
  // ---------------------------------

  useEffect(() => {
    loadCurrentUser();
    loadPosts();
  }, []);

  // ---------------------------------
  // Search
  // ---------------------------------

  async function handleSearch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (nearbyMode) {
      handleNearbyPosts();
      return;
    }

    await loadPosts();
  }

  // ---------------------------------
  // Find nearby posts
  // ---------------------------------

  function handleNearbyPosts() {
    if (!navigator.geolocation) {
      setError(
        "Geolocation is not supported by this browser.",
      );
      return;
    }

    setLocationLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await loadNearbyPosts(
          position.coords.latitude,
          position.coords.longitude,
        );
      },
      () => {
        setError(
          "Location permission was denied. Please allow location access and try again.",
        );
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  }

  // ---------------------------------
  // Create post
  // ---------------------------------

  async function handleCreatePost(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getAccessToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setCreating(true);
      setError("");

      await api.post("/posts/", {
        category: newCategory,
        title: title.trim(),
        content: content.trim(),
        visibility,
        latitude: Number(latitude),
        longitude: Number(longitude),
      });

      setTitle("");
      setContent("");
      setNewCategory("DISCUSSION");
      setVisibility("NEIGHBORHOOD");

      setShowCreateForm(false);

      await loadPosts();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail =
          error.response?.data?.detail;

        if (Array.isArray(detail)) {
          setError(
            detail
              .map((item) => item.msg)
              .join(", "),
          );
        } else {
          setError(
            detail ||
              "Unable to create the post.",
          );
        }
      } else {
        setError(
          "Unable to create the post.",
        );
      }
    } finally {
      setCreating(false);
    }
  }

  // ---------------------------------
  // Reaction helpers
  // ---------------------------------

  function getPostReactions(
    postId: number,
  ) {
    return reactions[postId] || [];
  }

  function getReactionCount(
    postId: number,
    reactionType: ReactionType,
  ) {
    return getPostReactions(postId).filter(
      (reaction) =>
        reaction.reaction_type ===
        reactionType,
    ).length;
  }

  function getMyReaction(
    postId: number,
  ) {
    if (!currentUser) {
      return undefined;
    }

    return getPostReactions(postId).find(
      (reaction) =>
        reaction.user_id ===
        currentUser.id,
    );
  }

  // ---------------------------------
  // Add reaction
  // ---------------------------------

  async function handleAddReaction(
    postId: number,
    reactionType: ReactionType,
  ) {
    const token = getAccessToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    const existingReaction =
      getMyReaction(postId);

    if (existingReaction) {
      return;
    }

    try {
      setReactionLoading((previous) => ({
        ...previous,
        [postId]: true,
      }));

      const response =
        await api.post<Reaction>(
          "/reactions/",
          {
            post_id: postId,
            reaction_type:
              reactionType,
          },
        );

      setReactions((previous) => ({
        ...previous,
        [postId]: [
          ...(previous[postId] || []),
          response.data,
        ],
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.detail ||
            "Unable to add reaction.",
        );
      } else {
        setError(
          "Unable to add reaction.",
        );
      }
    } finally {
      setReactionLoading((previous) => ({
        ...previous,
        [postId]: false,
      }));
    }
  }

  // ---------------------------------
  // Delete reaction
  // ---------------------------------

  async function handleDeleteReaction(
    postId: number,
  ) {
    const myReaction =
      getMyReaction(postId);

    if (!myReaction) {
      return;
    }

    try {
      setReactionLoading((previous) => ({
        ...previous,
        [postId]: true,
      }));

      await api.delete(
        `/reactions/${myReaction.id}`,
      );

      setReactions((previous) => ({
        ...previous,
        [postId]: (
          previous[postId] || []
        ).filter(
          (reaction) =>
            reaction.id !==
            myReaction.id,
        ),
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.detail ||
            "Unable to remove reaction.",
        );
      } else {
        setError(
          "Unable to remove reaction.",
        );
      }
    } finally {
      setReactionLoading((previous) => ({
        ...previous,
        [postId]: false,
      }));
    }
  }

  // ---------------------------------
  // Load comments for a post
  // ---------------------------------

  async function loadComments(
    postId: number,
  ) {
    try {
      setCommentsLoading((previous) => ({
        ...previous,
        [postId]: true,
      }));

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

      setComments((previous) => ({
        ...previous,
        [postId]: response.data.data,
      }));

      setCommentCounts((previous) => ({
        ...previous,
        [postId]:
          response.data.pagination.total,
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.detail ||
            "Unable to load comments.",
        );
      } else {
        setError(
          "Unable to load comments.",
        );
      }
    } finally {
      setCommentsLoading((previous) => ({
        ...previous,
        [postId]: false,
      }));
    }
  }

  // ---------------------------------
  // Toggle comments
  // ---------------------------------

  async function handleToggleComments(
    postId: number,
  ) {
    const isOpen =
      expandedComments[postId];

    setExpandedComments((previous) => ({
      ...previous,
      [postId]: !isOpen,
    }));

    if (!isOpen) {
      await loadComments(postId);
    }
  }

  // ---------------------------------
  // Add comment
  // ---------------------------------

  async function handleAddComment(
    postId: number,
  ) {
    const token = getAccessToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    const text =
      commentText[postId]?.trim() || "";

    if (!text) {
      return;
    }

    try {
      setCommentSubmitting((previous) => ({
        ...previous,
        [postId]: true,
      }));

      setError("");

      const response =
        await api.post<Comment>(
          "/comments/",
          {
            post_id: postId,
            content: text,
          },
        );

      setComments((previous) => ({
        ...previous,
        [postId]: [
          ...(previous[postId] || []),
          response.data,
        ],
      }));

      setCommentCounts((previous) => ({
        ...previous,
        [postId]:
          (previous[postId] || 0) + 1,
      }));

      setCommentText((previous) => ({
        ...previous,
        [postId]: "",
      }));

      setExpandedComments((previous) => ({
        ...previous,
        [postId]: true,
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.detail ||
            "Unable to add comment.",
        );
      } else {
        setError(
          "Unable to add comment.",
        );
      }
    } finally {
      setCommentSubmitting((previous) => ({
        ...previous,
        [postId]: false,
      }));
    }
  }

  // ---------------------------------
  // Edit comment
  // ---------------------------------

  function startEditingComment(
    comment: Comment,
  ) {
    setEditingCommentId(comment.id);
    setEditingCommentText(
      comment.content,
    );
  }

  function cancelEditingComment() {
    setEditingCommentId(null);
    setEditingCommentText("");
  }

  async function handleUpdateComment(
    comment: Comment,
  ) {
    const text =
      editingCommentText.trim();

    if (!text) {
      return;
    }

    try {
      setCommentActionLoading(
        (previous) => ({
          ...previous,
          [comment.id]: true,
        }),
      );

      const response =
        await api.patch<Comment>(
          `/comments/${comment.id}`,
          {
            content: text,
          },
        );

      setComments((previous) => ({
        ...previous,
        [comment.post_id]: (
          previous[comment.post_id] ||
          []
        ).map((item) =>
          item.id === comment.id
            ? response.data
            : item,
        ),
      }));

      cancelEditingComment();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.detail ||
            "Unable to update comment.",
        );
      } else {
        setError(
          "Unable to update comment.",
        );
      }
    } finally {
      setCommentActionLoading(
        (previous) => ({
          ...previous,
          [comment.id]: false,
        }),
      );
    }
  }

  // ---------------------------------
  // Delete comment
  // ---------------------------------

  async function handleDeleteComment(
    comment: Comment,
  ) {
    const confirmed =
      window.confirm(
        "Delete this comment?",
      );

    if (!confirmed) {
      return;
    }

    try {
      setCommentActionLoading(
        (previous) => ({
          ...previous,
          [comment.id]: true,
        }),
      );

      await api.delete(
        `/comments/${comment.id}`,
      );

      setComments((previous) => ({
        ...previous,
        [comment.post_id]: (
          previous[comment.post_id] ||
          []
        ).filter(
          (item) =>
            item.id !== comment.id,
        ),
      }));

      setCommentCounts((previous) => ({
        ...previous,
        [comment.post_id]: Math.max(
          0,
          (previous[comment.post_id] ||
            0) - 1,
        ),
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.detail ||
            "Unable to delete comment.",
        );
      } else {
        setError(
          "Unable to delete comment.",
        );
      }
    } finally {
      setCommentActionLoading(
        (previous) => ({
          ...previous,
          [comment.id]: false,
        }),
      );
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        {/* Header */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">
              NeighborHub community
            </p>

            <h1 className="mt-1 text-3xl font-bold text-gray-900">
              Community Posts
            </h1>

            <p className="mt-2 text-gray-500">
              See what your neighborhood is
              talking about.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowCreateForm(
                (previous) => !previous,
              )
            }
            className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            {showCreateForm
              ? "Close"
              : "Create Post"}
          </button>
        </section>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}

            <button
              type="button"
              onClick={() => setError("")}
              className="ml-3 font-medium underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Create Post */}
        {showCreateForm && (
          <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              Create a post
            </h2>

            <form
              onSubmit={handleCreatePost}
              className="mt-5 space-y-5"
            >
              <div>
                <label
                  htmlFor="post-title"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Title
                </label>

                <input
                  id="post-title"
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  maxLength={200}
                  required
                  placeholder="What's happening?"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <div>
                <label
                  htmlFor="post-content"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Content
                </label>

                <textarea
                  id="post-content"
                  value={content}
                  onChange={(event) =>
                    setContent(event.target.value)
                  }
                  maxLength={5000}
                  required
                  rows={5}
                  placeholder="Share something with your neighbors..."
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="new-category"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Category
                  </label>

                  <select
                    id="new-category"
                    value={newCategory}
                    onChange={(event) =>
                      setNewCategory(
                        event.target
                          .value as PostCategory,
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
                  >
                    {categories.map(
                      (item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item.replace(
                            "_",
                            " ",
                          )}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="visibility"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Visibility
                  </label>

                  <select
                    id="visibility"
                    value={visibility}
                    onChange={(event) =>
                      setVisibility(
                        event.target
                          .value as PostVisibility,
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
                  >
                    <option value="NEIGHBORHOOD">
                      Neighborhood
                    </option>

                    <option value="PUBLIC">
                      Public
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="latitude"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Latitude
                  </label>

                  <input
                    id="latitude"
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    value={latitude}
                    onChange={(event) =>
                      setLatitude(
                        event.target.value,
                      )
                    }
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label
                    htmlFor="longitude"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Longitude
                  </label>

                  <input
                    id="longitude"
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    value={longitude}
                    onChange={(event) =>
                      setLongitude(
                        event.target.value,
                      )
                    }
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-black px-5 py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating
                    ? "Creating..."
                    : "Publish Post"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Search + Nearby */}
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <form
            onSubmit={handleSearch}
            className="grid gap-3 md:grid-cols-[1fr_220px_auto]"
          >
            <input
              value={keyword}
              onChange={(event) =>
                setKeyword(event.target.value)
              }
              placeholder="Search posts..."
              className="rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-gray-200"
            />

            <select
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target
                    .value as PostCategory | "",
                )
              }
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
            >
              <option value="">
                All categories
              </option>

              {categories.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item.replace("_", " ")}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-lg bg-black px-5 py-3 font-medium text-white transition hover:bg-gray-800"
            >
              Search
            </button>
          </form>

          <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-gray-700">
                Nearby radius
              </span>

              <select
                value={radius}
                onChange={(event) =>
                  setRadius(event.target.value)
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              >
                <option value="1">1 km</option>
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="25">25 km</option>
                <option value="50">50 km</option>
              </select>

              <button
                type="button"
                onClick={handleNearbyPosts}
                disabled={locationLoading}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {locationLoading
                  ? "Finding nearby..."
                  : "📍 Find posts near me"}
              </button>
            </div>

            {nearbyMode && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  Showing nearby posts
                </span>

                <button
                  type="button"
                  onClick={loadPosts}
                  className="text-sm font-medium text-gray-700 hover:text-black hover:underline"
                >
                  Show all posts
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Posts */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {nearbyMode
                ? "Posts near you"
                : "Latest posts"}
            </h2>

            <span className="text-sm text-gray-500">
              {posts.length} shown
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-black" />

              <p className="mt-4 text-gray-500">
                Loading posts...
              </p>
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <h3 className="font-semibold text-gray-900">
                No posts found
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Try another search or create the
                first post.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => {
                const postReactions =
                  getPostReactions(post.id);

                const myReaction =
                  getMyReaction(post.id);

                const postComments =
                  comments[post.id] || [];

                return (
                  <article
                    key={post.id}
                    className="rounded-2xl bg-white p-6 shadow-sm"
                  >
                    {/* Post metadata */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {post.category.replace(
                          "_",
                          " ",
                        )}
                      </span>

                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {post.visibility}
                      </span>

                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {post.status}
                      </span>
                    </div>

                    {/* Post content */}
                    <h3 className="mt-4 text-xl font-semibold text-gray-900">
                      {post.title}
                    </h3>

                    <p className="mt-3 whitespace-pre-wrap text-gray-600">
                      {post.content}
                    </p>

                    {/* Reactions */}
                    <div className="mt-6 border-t border-gray-100 pt-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {reactionTypes.map(
                          (reaction) => {
                            const count =
                              getReactionCount(
                                post.id,
                                reaction.type,
                              );

                            const isMine =
                              myReaction?.reaction_type ===
                              reaction.type;

                            const hasAnyReaction =
                              Boolean(
                                myReaction,
                              );

                            return (
                              <button
                                key={
                                  reaction.type
                                }
                                type="button"
                                disabled={
                                  reactionLoading[
                                    post.id
                                  ] ||
                                  (hasAnyReaction &&
                                    !isMine)
                                }
                                onClick={() =>
                                  isMine
                                    ? handleDeleteReaction(
                                        post.id,
                                      )
                                    : handleAddReaction(
                                        post.id,
                                        reaction.type,
                                      )
                                }
                                className={`rounded-lg border px-3 py-2 text-sm transition ${
                                  isMine
                                    ? "border-black bg-black text-white"
                                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                                } ${
                                  hasAnyReaction &&
                                  !isMine
                                    ? "cursor-not-allowed opacity-50"
                                    : ""
                                } disabled:cursor-not-allowed`}
                              >
                                <span>
                                  {
                                    reaction.icon
                                  }
                                </span>{" "}
                                {
                                  reaction.label
                                }

                                {count > 0 && (
                                  <span className="ml-1 font-semibold">
                                    {count}
                                  </span>
                                )}
                              </button>
                            );
                          },
                        )}

                        {myReaction && (
                          <span className="ml-1 text-xs text-gray-500">
                            Click your reaction
                            again to remove it.
                          </span>
                        )}
                      </div>

                      {postReactions.length >
                        0 && (
                        <p className="mt-2 text-xs text-gray-400">
                          {
                            postReactions.length
                          }{" "}
                          total reaction
                          {postReactions.length !==
                          1
                            ? "s"
                            : ""}
                        </p>
                      )}
                    </div>

                    {/* Comment button */}
                    <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-4">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleComments(
                            post.id,
                          )
                        }
                        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                      >
                        💬{" "}
                        {expandedComments[
                          post.id
                        ]
                          ? "Hide comments"
                          : "View comments"}

                        {commentCounts[
                          post.id
                        ] !== undefined && (
                          <span className="ml-1">
                            (
                            {
                              commentCounts[
                                post.id
                              ]
                            }
                            )
                          </span>
                        )}
                      </button>

                      <Link
                        href={`/posts/${post.id}`}
                        className="text-sm font-medium text-gray-700 hover:text-black hover:underline"
                      >
                        View post
                      </Link>
                    </div>

                    {/* Comments */}
                    {expandedComments[
                      post.id
                    ] && (
                      <div className="mt-4 rounded-xl bg-gray-50 p-4">
                        <h4 className="font-semibold text-gray-900">
                          Comments
                        </h4>

                        {/* Add comment */}
                        <div className="mt-4">
                          <textarea
                            value={
                              commentText[
                                post.id
                              ] || ""
                            }
                            onChange={(event) =>
                              setCommentText(
                                (previous) => ({
                                  ...previous,
                                  [post.id]:
                                    event.target
                                      .value,
                                }),
                              )
                            }
                            rows={3}
                            maxLength={5000}
                            placeholder="Write a comment..."
                            className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-gray-200"
                          />

                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                handleAddComment(
                                  post.id,
                                )
                              }
                              disabled={
                                commentSubmitting[
                                  post.id
                                ] ||
                                !(
                                  commentText[
                                    post.id
                                  ] || ""
                                ).trim()
                              }
                              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {commentSubmitting[
                                post.id
                              ]
                                ? "Posting..."
                                : "Add comment"}
                            </button>
                          </div>
                        </div>

                        {/* Comments loading */}
                        {commentsLoading[
                          post.id
                        ] ? (
                          <div className="py-6 text-center">
                            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-gray-200 border-t-black" />

                            <p className="mt-2 text-sm text-gray-500">
                              Loading comments...
                            </p>
                          </div>
                        ) : postComments.length ===
                          0 ? (
                          <div className="mt-5 rounded-lg border border-gray-200 bg-white p-5 text-center">
                            <p className="text-sm text-gray-500">
                              No comments yet.
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                              Be the first to
                              comment.
                            </p>
                          </div>
                        ) : (
                          <div className="mt-5 space-y-3">
                            {postComments.map(
                              (comment) => {
                                const isOwner =
                                  currentUser?.id ===
                                  comment.user_id;

                                const isEditing =
                                  editingCommentId ===
                                  comment.id;

                                return (
                                  <div
                                    key={
                                      comment.id
                                    }
                                    className="rounded-lg border border-gray-200 bg-white p-4"
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">
                                          User #
                                          {
                                            comment.user_id
                                          }
                                        </p>

                                        <p className="mt-1 text-xs text-gray-400">
                                          {new Date(
                                            comment.created_at,
                                          ).toLocaleString()}
                                        </p>
                                      </div>

                                      {isOwner &&
                                        !isEditing && (
                                          <div className="flex gap-2">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                startEditingComment(
                                                  comment,
                                                )
                                              }
                                              className="text-xs font-medium text-gray-600 hover:text-black hover:underline"
                                            >
                                              Edit
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleDeleteComment(
                                                  comment,
                                                )
                                              }
                                              disabled={
                                                commentActionLoading[
                                                  comment.id
                                                ]
                                              }
                                              className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                                            >
                                              {commentActionLoading[
                                                comment.id
                                              ]
                                                ? "Deleting..."
                                                : "Delete"}
                                            </button>
                                          </div>
                                        )}
                                    </div>

                                    {isEditing ? (
                                      <div className="mt-3">
                                        <textarea
                                          value={
                                            editingCommentText
                                          }
                                          onChange={(
                                            event,
                                          ) =>
                                            setEditingCommentText(
                                              event
                                                .target
                                                .value,
                                            )
                                          }
                                          rows={3}
                                          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black focus:ring-2 focus:ring-gray-200"
                                        />

                                        <div className="mt-2 flex justify-end gap-2">
                                          <button
                                            type="button"
                                            onClick={
                                              cancelEditingComment
                                            }
                                            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
                                          >
                                            Cancel
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleUpdateComment(
                                                comment,
                                              )
                                            }
                                            disabled={
                                              commentActionLoading[
                                                comment.id
                                              ] ||
                                              !editingCommentText.trim()
                                            }
                                            className="rounded-lg bg-black px-3 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            {commentActionLoading[
                                              comment.id
                                            ]
                                              ? "Saving..."
                                              : "Save"}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
                                        {
                                          comment.content
                                        }
                                      </p>
                                    )}
                                  </div>
                                );
                              },
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm text-gray-400">
                      <span>
                        User #{post.user_id}
                      </span>

                      <span>
                        {new Date(
                          post.created_at,
                        ).toLocaleString()}
                      </span>

                      <Link
                        href={`/posts/${post.id}`}
                        className="font-medium text-gray-700 hover:text-black hover:underline"
                      >
                        View post
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}