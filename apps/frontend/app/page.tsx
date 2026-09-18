"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AxiosError } from "axios";

import Navbar from "@/components/layout/Navbar";
import { api } from "@/lib/api";

type CurrentUser = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
};

type GenericItem = {
  id: number;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  content?: string | null;
  category?: string | null;
  type?: string | null;
  status?: string | null;
  address?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  created_at?: string | null;
};

type FeedSection = {
  key: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  endpoint: string;
  items: GenericItem[];
  loading: boolean;
};

const DEFAULT_LOCATION = {
  latitude: 18.5074,
  longitude: 73.8077,
};

const RADIUS_OPTIONS = [1, 5, 10, 25, 50];

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
  const axiosError = error as AxiosError<{ detail?: string }>;

  return (
    axiosError.response?.data?.detail ||
    axiosError.message ||
    "Something went wrong."
  );
}

function displayTitle(item: GenericItem, fallback: string): string {
  return (
    item.title?.trim() ||
    item.name?.trim() ||
    item.content?.trim()?.slice(0, 80) ||
    fallback
  );
}

function displayDescription(item: GenericItem): string {
  return (
    item.description?.trim() ||
    item.content?.trim() ||
    "No description available."
  );
}

function formatDate(value?: string | null): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function getStatusClasses(status?: string | null): string {
  if (!status) {
    return "bg-slate-100 text-slate-700";
  }

  const normalized = status.toUpperCase();

  if (
    normalized === "ACTIVE" ||
    normalized === "OPEN" ||
    normalized === "FOUND"
  ) {
    return "bg-green-100 text-green-700";
  }

  if (
    normalized === "CANCELLED" ||
    normalized === "DELETED" ||
    normalized === "HIDDEN"
  ) {
    return "bg-red-100 text-red-700";
  }

  return "bg-blue-100 text-blue-700";
}

const quickActions = [
  {
    title: "Create Post",
    description: "Start a neighborhood discussion.",
    href: "/posts",
    icon: "📝",
  },
  {
    title: "Find Events",
    description: "Discover what's happening nearby.",
    href: "/events",
    icon: "📅",
  },
  {
    title: "Explore Places",
    description: "Find useful places around you.",
    href: "/places",
    icon: "📍",
  },
  {
    title: "Find Services",
    description: "Discover local service providers.",
    href: "/services",
    icon: "🛠️",
  },
  {
    title: "Lost & Found",
    description: "Report or find missing items.",
    href: "/lost-found",
    icon: "🔎",
  },
  {
    title: "Report an Issue",
    description: "Bring a neighborhood issue forward.",
    href: "/issues",
    icon: "⚠️",
  },
];

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [locationSource, setLocationSource] = useState<
    "default" | "browser"
  >("default");

  const [radius, setRadius] = useState(5);

  const [posts, setPosts] = useState<GenericItem[]>([]);
  const [events, setEvents] = useState<GenericItem[]>([]);
  const [places, setPlaces] = useState<GenericItem[]>([]);
  const [services, setServices] = useState<GenericItem[]>([]);
  const [lostFound, setLostFound] = useState<GenericItem[]>([]);
  const [issues, setIssues] = useState<GenericItem[]>([]);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [usingNearby, setUsingNearby] = useState(false);

  const [error, setError] = useState("");

  const [sectionState, setSectionState] = useState<Record<string, boolean>>(
    {}
  );

  const feedSections: FeedSection[] = useMemo(
    () => [
      {
        key: "posts",
        title: "Nearby Posts",
        description: "Recent conversations from your area.",
        icon: "📝",
        href: "/posts",
        endpoint: "/posts/",
        items: posts,
        loading: sectionState.posts ?? false,
      },
      {
        key: "events",
        title: "Nearby Events",
        description: "Things happening around your neighborhood.",
        icon: "📅",
        href: "/events",
        endpoint: "/events/",
        items: events,
        loading: sectionState.events ?? false,
      },
      {
        key: "places",
        title: "Nearby Places",
        description: "Places your community may find useful.",
        icon: "📍",
        href: "/places",
        endpoint: "/places/",
        items: places,
        loading: sectionState.places ?? false,
      },
      {
        key: "services",
        title: "Nearby Services",
        description: "Local providers and services.",
        icon: "🛠️",
        href: "/services",
        endpoint: "/services/",
        items: services,
        loading: sectionState.services ?? false,
      },
    ],
    [posts, events, places, services, sectionState]
  );

  async function loadCurrentUser() {
    try {
      setLoadingUser(true);
      setError("");

      const response = await api.get<CurrentUser>("/users/me");

      setCurrentUser(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingUser(false);
    }
  }

  async function loadNormalFeed() {
    setLoadingFeed(true);
    setError("");

    setSectionState({
      posts: true,
      events: true,
      places: true,
      services: true,
    });

    const requests = await Promise.allSettled([
      api.get("/posts/", {
        params: {
          page: 1,
          limit: 6,
        },
      }),

      api.get("/events/", {
        params: {
          page: 1,
          limit: 6,
        },
      }),

      api.get("/places/", {
        params: {
          page: 1,
          limit: 6,
        },
      }),

      api.get("/services/", {
        params: {
          page: 1,
          limit: 6,
        },
      }),
    ]);

    if (requests[0].status === "fulfilled") {
      setPosts(extractList<GenericItem>(requests[0].value.data));
    }

    if (requests[1].status === "fulfilled") {
      setEvents(extractList<GenericItem>(requests[1].value.data));
    }

    if (requests[2].status === "fulfilled") {
      setPlaces(extractList<GenericItem>(requests[2].value.data));
    }

    if (requests[3].status === "fulfilled") {
      setServices(extractList<GenericItem>(requests[3].value.data));
    }

    setSectionState({
      posts: false,
      events: false,
      places: false,
      services: false,
    });

    setLoadingFeed(false);
  }

  async function loadNearbyFeed(
    latitude = location.latitude,
    longitude = location.longitude,
    radiusKm = radius
  ) {
    setUsingNearby(true);
    setLoadingFeed(true);
    setError("");

    setSectionState({
      posts: true,
      events: true,
      places: true,
      services: true,
    });

    const params = {
      latitude,
      longitude,
      radius_km: radiusKm,
    };

    const requests = await Promise.allSettled([
      api.get("/posts/nearby", {
        params,
      }),

      api.get("/events/nearby", {
        params,
      }),

      api.get("/places/nearby", {
        params,
      }),

      api.get("/services/nearby", {
        params,
      }),
    ]);

    if (requests[0].status === "fulfilled") {
      setPosts(extractList<GenericItem>(requests[0].value.data));
    }

    if (requests[1].status === "fulfilled") {
      setEvents(extractList<GenericItem>(requests[1].value.data));
    }

    if (requests[2].status === "fulfilled") {
      setPlaces(extractList<GenericItem>(requests[2].value.data));
    }

    if (requests[3].status === "fulfilled") {
      setServices(extractList<GenericItem>(requests[3].value.data));
    }

    setSectionState({
      posts: false,
      events: false,
      places: false,
      services: false,
    });

    setLoadingFeed(false);
    setUsingNearby(true);
  }

  async function loadLostFoundAndIssues() {
    const requests = await Promise.allSettled([
      api.get("/lost-found/", {
        params: {
          page: 1,
          limit: 4,
        },
      }),

      api.get("/issues/", {
        params: {
          page: 1,
          limit: 4,
        },
      }),
    ]);

    if (requests[0].status === "fulfilled") {
      setLostFound(extractList<GenericItem>(requests[0].value.data));
    }

    if (requests[1].status === "fulfilled") {
      setIssues(extractList<GenericItem>(requests[1].value.data));
    }
  }

  useEffect(() => {
    loadCurrentUser();
    loadNormalFeed();
    loadLostFoundAndIssues();
  }, []);

  function requestBrowserLocation() {
    setError("");

    if (!navigator.geolocation) {
      setError(
        "Your browser does not support location access. Using the default location instead."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setLocation(nextLocation);
        setLocationSource("browser");

        await loadNearbyFeed(
          nextLocation.latitude,
          nextLocation.longitude,
          radius
        );
      },
      () => {
        setError(
          "Location access was not available. You can continue with the default location."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }

  async function handleRadiusChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const nextRadius = Number(event.target.value);

    setRadius(nextRadius);

    if (usingNearby) {
      await loadNearbyFeed(
        location.latitude,
        location.longitude,
        nextRadius
      );
    }
  }

  async function handleShowAll() {
    setUsingNearby(false);
    await loadNormalFeed();
  }

  async function handleUseNearby() {
    if (locationSource === "browser") {
      await loadNearbyFeed(
        location.latitude,
        location.longitude,
        radius
      );
      return;
    }

    requestBrowserLocation();
  }

  function renderFeedCard(item: GenericItem, type: string) {
    const status = item.status || item.type || item.category;

    return (
      <div
        key={`${type}-${item.id}`}
        className="rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-slate-900">
              {displayTitle(item, `${type} #${item.id}`)}
            </h3>

            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">
              {displayDescription(item)}
            </p>
          </div>

          {status && (
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusClasses(
                status
              )}`}
            >
              {status}
            </span>
          )}
        </div>

        <div className="mt-3 space-y-1 text-xs text-slate-400">
          {item.address && <p>📍 {item.address}</p>}

          {item.location && <p>📍 {item.location}</p>}

          {item.start_time && (
            <p>🕒 {formatDate(item.start_time)}</p>
          )}

          {item.created_at && (
            <p>Created {formatDate(item.created_at)}</p>
          )}
        </div>
      </div>
    );
  }

  function renderSection(section: FeedSection) {
    return (
      <section
        key={section.key}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{section.icon}</span>

              <h2 className="text-xl font-semibold text-slate-900">
                {section.title}
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              {section.description}
            </p>
          </div>

          <Link
            href={section.href}
            className="w-fit text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View all →
          </Link>
        </div>

        {section.loading ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
            Loading...
          </div>
        ) : section.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
            <p className="font-medium text-slate-700">
              Nothing to show yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Try another radius or add something to your neighborhood.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {section.items.slice(0, 6).map((item) =>
              renderFeedCard(item, section.key)
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-sm sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-center">
            <div>
              <p className="text-sm font-medium text-blue-300">
                Your local community
              </p>

              <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
                {loadingUser
                  ? "Welcome to NeighborHub"
                  : `Welcome${currentUser?.name ? `, ${currentUser.name}` : ""} 👋`}
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Discover conversations, events, places, services,
                lost &amp; found reports, and neighborhood updates around
                you.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/posts"
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Browse Posts
                </Link>

                <Link
                  href="/events"
                  className="rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Explore Events
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-medium text-slate-300">
                Your current search area
              </p>

              <p className="mt-2 text-lg font-semibold">
                {locationSource === "browser"
                  ? "Using your browser location"
                  : "Default Pune location"}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {location.latitude.toFixed(4)},{" "}
                {location.longitude.toFixed(4)}
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleUseNearby}
                  disabled={loadingFeed}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingFeed && usingNearby
                    ? "Loading nearby..."
                    : "Use my location"}
                </button>

                <button
                  type="button"
                  onClick={handleShowAll}
                  disabled={loadingFeed}
                  className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Show general feed
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Quick actions */}
        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900">
              Quick Actions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Jump directly to the things you use most.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                    {action.icon}
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-blue-600">
                      {action.title}
                    </h3>

                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Feed controls */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Discover Nearby
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Search the community using your current location and
                radius.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div>
                <label
                  htmlFor="radius"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Radius
                </label>

                <select
                  id="radius"
                  value={radius}
                  onChange={handleRadiusChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-40"
                >
                  {RADIUS_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value} km
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleUseNearby}
                disabled={loadingFeed}
                className="self-end rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {usingNearby ? "Refresh Nearby" : "Find Nearby"}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
              Latitude: {location.latitude.toFixed(4)}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
              Longitude: {location.longitude.toFixed(4)}
            </span>

            <span className="rounded-full bg-blue-50 px-3 py-1.5 font-medium text-blue-700">
              {usingNearby ? `Within ${radius} km` : "General feed"}
            </span>
          </div>
        </section>

        {/* Main feed */}
        <div className="mt-8 space-y-6">
          {feedSections.map(renderSection)}
        </div>

        {/* Lost & Found */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🔎</span>

                <h2 className="text-xl font-semibold text-slate-900">
                  Lost &amp; Found
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Recent lost and found reports.
              </p>
            </div>

            <Link
              href="/lost-found"
              className="w-fit text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all →
            </Link>
          </div>

          {lostFound.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
              <p className="font-medium text-slate-700">
                No recent reports
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Lost or found something? Add a report to help your
                neighborhood.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {lostFound.slice(0, 4).map((item) =>
                renderFeedCard(item, "lost-found")
              )}
            </div>
          )}
        </section>

        {/* Issues */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>

                <h2 className="text-xl font-semibold text-slate-900">
                  Neighborhood Issues
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Recent reports from the community.
              </p>
            </div>

            <Link
              href="/issues"
              className="w-fit text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all →
            </Link>
          </div>

          {issues.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
              <p className="font-medium text-slate-700">
                No recent issues
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Neighborhood issue reports will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {issues.slice(0, 4).map((item) =>
                renderFeedCard(item, "issues")
              )}
            </div>
          )}
        </section>

        {/* Footer area */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Make your neighborhood better
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Share useful information, discover local activities, help
            neighbors, and keep your community informed.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/posts"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Start a Discussion
            </Link>

            <Link
              href="/profile"
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              View My Profile
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}