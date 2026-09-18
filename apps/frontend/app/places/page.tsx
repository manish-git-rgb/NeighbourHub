"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import axios from "axios";

import Navbar from "@/components/layout/Navbar";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type Place = {
  id: number;
  user_id: number;
  neighborhood_id: number | null;
  name: string;
  description: string | null;
  category: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
};

type NearbyPlace = Place & {
  distance_km: number;
};

type PlaceListResponse = {
  success: boolean;
  data: Place[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

export default function PlacesPage() {
  const [places, setPlaces] = useState<Place[]>(
    [],
  );

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [error, setError] = useState("");

  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [neighborhoodId, setNeighborhoodId] =
    useState("");

  const [nearbyMode, setNearbyMode] =
    useState(false);

  const [radius, setRadius] =
    useState("5");

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");

  const [newCategory, setNewCategory] =
    useState("");

  const [address, setAddress] =
    useState("");

  const [latitude, setLatitude] =
    useState("18.5074");

  const [longitude, setLongitude] =
    useState("73.8077");

  const [newNeighborhoodId, setNewNeighborhoodId] =
    useState("");

  // ---------------------------------
  // Load all places
  // ---------------------------------

  async function loadPlaces() {
    try {
      setLoading(true);
      setError("");
      setNearbyMode(false);

      const params: Record<
        string,
        string | number
      > = {
        page: 1,
        limit: 20,
      };

      if (keyword.trim()) {
        params.keyword = keyword.trim();
      }

      if (category.trim()) {
        params.category = category.trim();
      }

      if (neighborhoodId.trim()) {
        params.neighborhood_id =
          Number(neighborhoodId);
      }

      const response =
        await api.get<PlaceListResponse>(
          "/places/",
          { params },
        );

      setPlaces(response.data.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.detail ||
            "Unable to load places.",
        );
      } else {
        setError(
          "Unable to load places.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlaces();
  }, []);

  // ---------------------------------
  // Search
  // ---------------------------------

  async function handleSearch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    await loadPlaces();
  }

  // ---------------------------------
  // Nearby places
  // ---------------------------------

  async function loadNearbyPlaces(
    latitudeValue: number,
    longitudeValue: number,
  ) {
    try {
      setLoading(true);
      setError("");

      const params: Record<
        string,
        string | number
      > = {
        latitude: latitudeValue,
        longitude: longitudeValue,
        radius_km: Number(radius),
        page: 1,
        limit: 20,
      };

      if (keyword.trim()) {
        params.keyword = keyword.trim();
      }

      if (category.trim()) {
        params.category = category.trim();
      }

      if (neighborhoodId.trim()) {
        params.neighborhood_id =
          Number(neighborhoodId);
      }

      const response =
        await api.get<NearbyPlace[]>(
          "/places/nearby",
          { params },
        );

      setPlaces(response.data);
      setNearbyMode(true);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.detail ||
            "Unable to load nearby places.",
        );
      } else {
        setError(
          "Unable to load nearby places.",
        );
      }
    } finally {
      setLoading(false);
      setLocationLoading(false);
    }
  }

  function handleNearbyPlaces() {
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
        await loadNearbyPlaces(
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
  // Create place
  // ---------------------------------

  async function handleCreatePlace(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getAccessToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (!newCategory.trim()) {
      setError(
        "Category is required.",
      );
      return;
    }

    try {
      setCreating(true);
      setError("");

      const payload: {
        name: string;
        description?: string;
        category: string;
        address?: string;
        latitude: number;
        longitude: number;
        neighborhood_id?: number;
      } = {
        name: name.trim(),
        category: newCategory.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
      };

      if (description.trim()) {
        payload.description =
          description.trim();
      }

      if (address.trim()) {
        payload.address =
          address.trim();
      }

      if (newNeighborhoodId.trim()) {
        payload.neighborhood_id =
          Number(newNeighborhoodId);
      }

      await api.post(
        "/places/",
        payload,
      );

      setName("");
      setDescription("");
      setNewCategory("");
      setAddress("");
      setLatitude("18.5074");
      setLongitude("73.8077");
      setNewNeighborhoodId("");

      setShowCreateForm(false);

      await loadPlaces();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail =
          error.response?.data?.detail;

        if (Array.isArray(detail)) {
          setError(
            detail
              .map(
                (item) => item.msg,
              )
              .join(", "),
          );
        } else {
          setError(
            detail ||
              "Unable to create place.",
          );
        }
      } else {
        setError(
          "Unable to create place.",
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
              Discover your neighborhood
            </p>

            <h1 className="mt-1 text-3xl font-bold text-gray-900">
              Places
            </h1>

            <p className="mt-2 text-gray-500">
              Discover useful and interesting
              places around you.
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
              : "Add Place"}
          </button>
        </section>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              Add a place
            </h2>

            <form
              onSubmit={handleCreatePlace}
              className="mt-5 space-y-5"
            >
              <div>
                <label
                  htmlFor="place-name"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Place name
                </label>

                <input
                  id="place-name"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value,
                    )
                  }
                  maxLength={200}
                  required
                  placeholder="Local library"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <div>
                <label
                  htmlFor="place-category"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Category
                </label>

                <input
                  id="place-category"
                  value={newCategory}
                  onChange={(event) =>
                    setNewCategory(
                      event.target.value,
                    )
                  }
                  maxLength={50}
                  required
                  placeholder="Restaurant, park, clinic..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div>
                <label
                  htmlFor="place-description"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Description
                </label>

                <textarea
                  id="place-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value,
                    )
                  }
                  rows={4}
                  placeholder="Tell your neighbors about this place..."
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <div>
                <label
                  htmlFor="place-address"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Address
                </label>

                <input
                  id="place-address"
                  value={address}
                  onChange={(event) =>
                    setAddress(
                      event.target.value,
                    )
                  }
                  maxLength={300}
                  placeholder="Full address"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="place-latitude"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Latitude
                  </label>

                  <input
                    id="place-latitude"
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
                    htmlFor="place-longitude"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Longitude
                  </label>

                  <input
                    id="place-longitude"
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

              <div>
                <label
                  htmlFor="place-neighborhood"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Neighborhood ID
                  <span className="ml-1 font-normal text-gray-400">
                    (optional)
                  </span>
                </label>

                <input
                  id="place-neighborhood"
                  type="number"
                  min="1"
                  value={newNeighborhoodId}
                  onChange={(event) =>
                    setNewNeighborhoodId(
                      event.target.value,
                    )
                  }
                  placeholder="e.g. 1"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-black px-5 py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating
                    ? "Adding..."
                    : "Add Place"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Search */}
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <form
            onSubmit={handleSearch}
            className="grid gap-3 lg:grid-cols-[1fr_220px_180px_auto]"
          >
            <input
              value={keyword}
              onChange={(event) =>
                setKeyword(
                  event.target.value,
                )
              }
              placeholder="Search places..."
              className="rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-gray-200"
            />

            <input
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value,
                )
              }
              placeholder="Category"
              className="rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />

            <input
              type="number"
              min="1"
              value={neighborhoodId}
              onChange={(event) =>
                setNeighborhoodId(
                  event.target.value,
                )
              }
              placeholder="Neighborhood ID"
              className="rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />

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
                  setRadius(
                    event.target.value,
                  )
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              >
                <option value="1">
                  1 km
                </option>
                <option value="5">
                  5 km
                </option>
                <option value="10">
                  10 km
                </option>
                <option value="25">
                  25 km
                </option>
                <option value="50">
                  50 km
                </option>
              </select>

              <button
                type="button"
                onClick={
                  handleNearbyPlaces
                }
                disabled={
                  locationLoading
                }
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {locationLoading
                  ? "Finding nearby..."
                  : "📍 Find places near me"}
              </button>
            </div>

            {nearbyMode && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  Showing nearby places
                </span>

                <button
                  type="button"
                  onClick={loadPlaces}
                  className="text-sm font-medium text-gray-700 hover:text-black hover:underline"
                >
                  Show all places
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Places */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {nearbyMode
                ? "Places near you"
                : "Places"}
            </h2>

            <span className="text-sm text-gray-500">
              {places.length} shown
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-black" />

              <p className="mt-4 text-gray-500">
                Loading places...
              </p>
            </div>
          ) : places.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <h3 className="font-semibold text-gray-900">
                No places found
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Try another search or add a
                place.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {places.map((place) => {
                const nearbyPlace =
                  place as NearbyPlace;

                return (
                  <article
                    key={place.id}
                    className="rounded-2xl bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {place.category}
                      </span>

                      {place.neighborhood_id && (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                          Neighborhood #
                          {
                            place.neighborhood_id
                          }
                        </span>
                      )}

                      {nearbyMode &&
                        typeof nearbyPlace.distance_km ===
                          "number" && (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                            {nearbyPlace.distance_km.toFixed(
                              2,
                            )}{" "}
                            km away
                          </span>
                        )}
                    </div>

                    <h3 className="mt-4 text-xl font-semibold text-gray-900">
                      {place.name}
                    </h3>

                    {place.description && (
                      <p className="mt-2 text-gray-600">
                        {place.description}
                      </p>
                    )}

                    {place.address && (
                      <div className="mt-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                          Address
                        </p>

                        <p className="mt-1 text-gray-700">
                          {place.address}
                        </p>
                      </div>
                    )}

                    {place.latitude !==
                      null &&
                      place.longitude !==
                        null && (
                        <p className="mt-3 text-sm text-gray-400">
                          {place.latitude},{" "}
                          {place.longitude}
                        </p>
                      )}

                    <div className="mt-5 border-t border-gray-100 pt-4 text-sm text-gray-400">
                      Added by User #
                      {place.user_id}
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