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

const categories: PostCategory[] = [
  "DISCUSSION",
  "RECOMMENDATION",
  "EVENT",
  "SERVICE",
  "LOST_FOUND",
  "ISSUE",
  "ALERT",
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

      setPosts(response.data.data);
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

      setPosts(response.data);
      setNearbyMode(true);
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
  // Initial load
  // ---------------------------------

  useEffect(() => {
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
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-2xl bg-white p-6 shadow-sm"
                >
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

                  <h3 className="mt-4 text-xl font-semibold text-gray-900">
                    {post.title}
                  </h3>

                  <p className="mt-3 whitespace-pre-wrap text-gray-600">
                    {post.content}
                  </p>

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
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}