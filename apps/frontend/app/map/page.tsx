"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";

import Navbar from "@/components/layout/Navbar";
import { api } from "@/lib/api";

const NeighborMap = dynamic(
  () => import("@/components/map/NeighborMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-150 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-sm text-slate-500">
        Loading map...
      </div>
    ),
  }
);

type RawItem = {
  id: number;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  content?: string | null;
  status?: string | null;
  category?: string | null;
  type?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type MapItem = {
  id: number;
  type: string;
  title: string;
  description?: string | null;
  status?: string | null;
  latitude: number;
  longitude: number;
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

function getTitle(item: RawItem, fallback: string): string {
  return (
    item.title?.trim() ||
    item.name?.trim() ||
    item.content?.trim()?.slice(0, 80) ||
    fallback
  );
}

function normalizeItems(
  items: RawItem[],
  type: string
): MapItem[] {
  return items
    .filter(
      (item) =>
        typeof item.latitude === "number" &&
        typeof item.longitude === "number"
    )
    .map((item) => ({
      id: item.id,
      type,
      title: getTitle(item, `${type} #${item.id}`),
      description: item.description || item.content || null,
      status: item.status || item.category || item.type || null,
      latitude: item.latitude as number,
      longitude: item.longitude as number,
    }));
}

export default function MapPage() {
  const [latitude, setLatitude] = useState(
    DEFAULT_LOCATION.latitude
  );
  const [longitude, setLongitude] = useState(
    DEFAULT_LOCATION.longitude
  );

  const [radius, setRadius] = useState(5);

  const [items, setItems] = useState<MapItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);

  const [error, setError] = useState("");

  const [activeTypes, setActiveTypes] = useState<string[]>([
    "POST",
    "EVENT",
    "PLACE",
    "SERVICE",
  ]);

  async function loadNearby(
    nextLatitude = latitude,
    nextLongitude = longitude,
    nextRadius = radius
  ) {
    setLoading(true);
    setError("");

    const params = {
      latitude: nextLatitude,
      longitude: nextLongitude,
      radius_km: nextRadius,
    };

    const results = await Promise.allSettled([
      api.get("/posts/nearby", { params }),
      api.get("/events/nearby", { params }),
      api.get("/places/nearby", { params }),
      api.get("/services/nearby", { params }),
    ]);

    const combined: MapItem[] = [];

    if (results[0].status === "fulfilled") {
      combined.push(
        ...normalizeItems(
          extractList<RawItem>(results[0].value.data),
          "POST"
        )
      );
    }

    if (results[1].status === "fulfilled") {
      combined.push(
        ...normalizeItems(
          extractList<RawItem>(results[1].value.data),
          "EVENT"
        )
      );
    }

    if (results[2].status === "fulfilled") {
      combined.push(
        ...normalizeItems(
          extractList<RawItem>(results[2].value.data),
          "PLACE"
        )
      );
    }

    if (results[3].status === "fulfilled") {
      combined.push(
        ...normalizeItems(
          extractList<RawItem>(results[3].value.data),
          "SERVICE"
        )
      );
    }

    const allFailed = results.every(
      (result) => result.status === "rejected"
    );

    if (allFailed) {
      setError("Unable to load nearby community data.");
    }

    setItems(combined);
    setLoading(false);
  }

  useEffect(() => {
    loadNearby();

    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requestLocation() {
    setError("");

    if (!navigator.geolocation) {
      setError(
        "Your browser does not support location access."
      );
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLatitude = position.coords.latitude;
        const nextLongitude = position.coords.longitude;

        setLatitude(nextLatitude);
        setLongitude(nextLongitude);

        await loadNearby(
          nextLatitude,
          nextLongitude,
          radius
        );

        setLocationLoading(false);
      },
      () => {
        setError(
          "Location access was not available. Continuing with the default location."
        );

        setLocationLoading(false);
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

    await loadNearby(
      latitude,
      longitude,
      nextRadius
    );
  }

  function toggleType(type: string) {
    setActiveTypes((previous) =>
      previous.includes(type)
        ? previous.filter((value) => value !== type)
        : [...previous, type]
    );
  }

  const visibleItems = useMemo(
    () =>
      items.filter((item) =>
        activeTypes.includes(item.type)
      ),
    [items, activeTypes]
  );

  const counts = useMemo(
    () => ({
      POST: items.filter((item) => item.type === "POST").length,
      EVENT: items.filter((item) => item.type === "EVENT").length,
      PLACE: items.filter((item) => item.type === "PLACE").length,
      SERVICE: items.filter((item) => item.type === "SERVICE").length,
    }),
    [items]
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <p className="text-sm font-medium text-blue-600">
            Hyperlocal discovery
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Community Map
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Explore nearby posts, events, places, and services
            on the map.
          </p>
        </div>

        {/* Controls */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Search area
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {latitude.toFixed(5)}, {longitude.toFixed(5)}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div>
                  <label
                    htmlFor="map-radius"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Radius
                  </label>

                  <select
                    id="map-radius"
                    value={radius}
                    onChange={handleRadiusChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 sm:w-36"
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
                  onClick={requestLocation}
                  disabled={locationLoading}
                  className="self-end rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {locationLoading
                    ? "Locating..."
                    : "Use my location"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    loadNearby(
                      latitude,
                      longitude,
                      radius
                    )
                  }
                  disabled={loading}
                  className="self-end rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Loading..." : "Refresh"}
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {[
                ["POST", "Posts"],
                ["EVENT", "Events"],
                ["PLACE", "Places"],
                ["SERVICE", "Services"],
              ].map(([type, label]) => {
                const active = activeTypes.includes(type);

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-slate-900 text-white"
                        : "border border-slate-300 bg-white text-slate-600"
                    }`}
                  >
                    {label}
                    {" • "}
                    {counts[type as keyof typeof counts]}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Map */}
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          {loading && items.length === 0 ? (
            <div className="flex h-150 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
              Loading nearby data...
            </div>
          ) : (
            <NeighborMap
              latitude={latitude}
              longitude={longitude}
              radiusKm={radius}
              items={visibleItems}
            />
          )}
        </section>

        {/* Summary */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Posts
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {counts.POST}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Events
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {counts.EVENT}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Places
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {counts.PLACE}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Services
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {counts.SERVICE}
            </p>
          </div>
        </section>

        {/* Empty state */}
        {!loading && visibleItems.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h2 className="font-semibold text-slate-900">
              No mapped items found
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Try increasing the radius or enabling more
              categories.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}