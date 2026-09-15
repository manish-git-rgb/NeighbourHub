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

type EventStatus =
  | "ACTIVE"
  | "CANCELLED"
  | "COMPLETED";

type EventItem = {
  id: number;
  user_id: number;
  title: string;
  description: string;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  start_time: string;
  end_time: string | null;
  status: EventStatus;
  neighborhood_id: number | null;
  created_at: string;
  updated_at: string;
};

type NearbyEvent = EventItem & {
  distance_km: number;
};

type EventListResponse = {
  success: boolean;
  data: EventItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

type RSVP = {
  id: number;
  event_id: number;
  user_id: number;
  created_at: string;
};

const eventStatuses: EventStatus[] = [
  "ACTIVE",
  "CANCELLED",
  "COMPLETED",
];

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function toLocalInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");
  const hours = String(
    date.getHours(),
  ).padStart(2, "0");
  const minutes = String(
    date.getMinutes(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [locationLoading, setLocationLoading] =
    useState(false);

  const [error, setError] = useState("");

  const [keyword, setKeyword] = useState("");
  const [eventStatus, setEventStatus] =
    useState<EventStatus | "">("");

  const [startDate, setStartDate] =
    useState("");
  const [endDate, setEndDate] =
    useState("");

  const [nearbyMode, setNearbyMode] =
    useState(false);
  const [radius, setRadius] =
    useState("5");

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");
  const [locationName, setLocationName] =
    useState("");

  const [latitude, setLatitude] =
    useState("18.5074");
  const [longitude, setLongitude] =
    useState("73.8077");

  const [neighborhoodId, setNeighborhoodId] =
    useState("");

  const [eventStartTime, setEventStartTime] =
    useState(() =>
      toLocalInputValue(
        new Date(
          Date.now() +
            24 * 60 * 60 * 1000,
        ),
      ),
    );

  const [eventEndTime, setEventEndTime] =
    useState("");

  const [attendees, setAttendees] =
    useState<Record<number, RSVP[]>>({});

  const [attendeesLoading, setAttendeesLoading] =
    useState<number | null>(null);

  // ---------------------------------
  // Load all events
  // ---------------------------------

  async function loadEvents() {
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

      if (eventStatus) {
        params.status = eventStatus;
      }

      if (startDate) {
        params.start_date = new Date(
          startDate,
        ).toISOString();
      }

      if (endDate) {
        params.end_date = new Date(
          endDate,
        ).toISOString();
      }

      const response =
        await api.get<EventListResponse>(
          "/events/",
          { params },
        );

      setEvents(response.data.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.detail ||
            "Unable to load events.",
        );
      } else {
        setError(
          "Unable to load events.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------
  // Initial load
  // ---------------------------------

  useEffect(() => {
    loadEvents();
  }, []);

  // ---------------------------------
  // Search / filter
  // ---------------------------------

  async function handleSearch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    await loadEvents();
  }

  // ---------------------------------
  // Find nearby events
  // ---------------------------------

  async function loadNearbyEvents(
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

      if (eventStatus) {
        params.status = eventStatus;
      }

      const response =
        await api.get<NearbyEvent[]>(
          "/events/nearby",
          { params },
        );

      setEvents(response.data);
      setNearbyMode(true);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.detail ||
            "Unable to load nearby events.",
        );
      } else {
        setError(
          "Unable to load nearby events.",
        );
      }
    } finally {
      setLoading(false);
      setLocationLoading(false);
    }
  }

  function handleNearbyEvents() {
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
        await loadNearbyEvents(
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
  // Create event
  // ---------------------------------

  async function handleCreateEvent(
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

      const payload: {
        title: string;
        description: string;
        location_name: string;
        latitude: number;
        longitude: number;
        neighborhood_id?: number;
        start_time: string;
        end_time?: string;
      } = {
        title: title.trim(),
        description: description.trim(),
        location_name: locationName.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        start_time: new Date(
          eventStartTime,
        ).toISOString(),
      };

      if (neighborhoodId.trim()) {
        payload.neighborhood_id =
          Number(neighborhoodId);
      }

      if (eventEndTime) {
        payload.end_time = new Date(
          eventEndTime,
        ).toISOString();
      }

      await api.post(
        "/events/",
        payload,
      );

      setTitle("");
      setDescription("");
      setLocationName("");
      setNeighborhoodId("");
      setLatitude("18.5074");
      setLongitude("73.8077");
      setEventStartTime(
        toLocalInputValue(
          new Date(
            Date.now() +
              24 * 60 * 60 * 1000,
          ),
        ),
      );
      setEventEndTime("");

      setShowCreateForm(false);

      await loadEvents();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail =
          error.response?.data?.detail;

        if (Array.isArray(detail)) {
          setError(
            detail
              .map(
                (item) =>
                  item.msg,
              )
              .join(", "),
          );
        } else {
          setError(
            detail ||
              "Unable to create event.",
          );
        }
      } else {
        setError(
          "Unable to create event.",
        );
      }
    } finally {
      setCreating(false);
    }
  }

  // ---------------------------------
  // RSVP
  // ---------------------------------

  async function handleRSVP(
    eventId: number,
  ) {
    const token = getAccessToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setError("");

      await api.post(
        `/events/${eventId}/rsvp`,
      );

      setError("");

      await loadEvents();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.detail ||
            "Unable to RSVP to this event.",
        );
      } else {
        setError(
          "Unable to RSVP to this event.",
        );
      }
    }
  }

  // ---------------------------------
  // Cancel RSVP
  // ---------------------------------

  async function handleCancelRSVP(
    eventId: number,
  ) {
    const token = getAccessToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setError("");

      await api.delete(
        `/events/${eventId}/rsvp`,
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.detail ||
            "Unable to cancel RSVP.",
        );
      } else {
        setError(
          "Unable to cancel RSVP.",
        );
      }
    }
  }

  // ---------------------------------
  // Get attendees
  // ---------------------------------

  async function handleViewAttendees(
    eventId: number,
  ) {
    try {
      setAttendeesLoading(eventId);
      setError("");

      const response =
        await api.get<RSVP[]>(
          `/events/${eventId}/attendees`,
        );

      setAttendees((previous) => ({
        ...previous,
        [eventId]: response.data,
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.detail ||
            "Unable to load attendees.",
        );
      } else {
        setError(
          "Unable to load attendees.",
        );
      }
    } finally {
      setAttendeesLoading(null);
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
              Events
            </h1>

            <p className="mt-2 text-gray-500">
              Discover what is happening around
              your neighborhood.
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
              : "Create Event"}
          </button>
        </section>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Create Event */}
        {showCreateForm && (
          <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              Create an event
            </h2>

            <form
              onSubmit={handleCreateEvent}
              className="mt-5 space-y-5"
            >
              <div>
                <label
                  htmlFor="event-title"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Title
                </label>

                <input
                  id="event-title"
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value,
                    )
                  }
                  minLength={1}
                  maxLength={200}
                  required
                  placeholder="Community meetup"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <div>
                <label
                  htmlFor="event-description"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Description
                </label>

                <textarea
                  id="event-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value,
                    )
                  }
                  minLength={1}
                  rows={5}
                  required
                  placeholder="Tell your neighbors about the event..."
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <div>
                <label
                  htmlFor="location-name"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Location name
                </label>

                <input
                  id="location-name"
                  type="text"
                  value={locationName}
                  onChange={(event) =>
                    setLocationName(
                      event.target.value,
                    )
                  }
                  minLength={1}
                  maxLength={200}
                  required
                  placeholder="Community hall"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="event-start"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Start time
                  </label>

                  <input
                    id="event-start"
                    type="datetime-local"
                    value={eventStartTime}
                    onChange={(event) =>
                      setEventStartTime(
                        event.target.value,
                      )
                    }
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label
                    htmlFor="event-end"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    End time
                  </label>

                  <input
                    id="event-end"
                    type="datetime-local"
                    value={eventEndTime}
                    onChange={(event) =>
                      setEventEndTime(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="event-latitude"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Latitude
                  </label>

                  <input
                    id="event-latitude"
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
                    htmlFor="event-longitude"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Longitude
                  </label>

                  <input
                    id="event-longitude"
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
                  htmlFor="neighborhood-id"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Neighborhood ID
                  <span className="ml-1 font-normal text-gray-400">
                    (optional)
                  </span>
                </label>

                <input
                  id="neighborhood-id"
                  type="number"
                  min="1"
                  value={neighborhoodId}
                  onChange={(event) =>
                    setNeighborhoodId(
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
                    ? "Creating..."
                    : "Create Event"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Search / Filters */}
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <form
            onSubmit={handleSearch}
            className="grid gap-3 lg:grid-cols-[1fr_220px_1fr_1fr_auto]"
          >
            <input
              value={keyword}
              onChange={(event) =>
                setKeyword(
                  event.target.value,
                )
              }
              placeholder="Search events..."
              className="rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-gray-200"
            />

            <select
              value={eventStatus}
              onChange={(event) =>
                setEventStatus(
                  event.target
                    .value as
                    | EventStatus
                    | "",
                )
              }
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
            >
              <option value="">
                All statuses
              </option>

              {eventStatuses.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status.replace(
                      "_",
                      " ",
                    )}
                  </option>
                ),
              )}
            </select>

            <input
              type="datetime-local"
              value={startDate}
              onChange={(event) =>
                setStartDate(
                  event.target.value,
                )
              }
              className="rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              aria-label="Start date"
            />

            <input
              type="datetime-local"
              value={endDate}
              onChange={(event) =>
                setEndDate(
                  event.target.value,
                )
              }
              className="rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              aria-label="End date"
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
                  handleNearbyEvents
                }
                disabled={
                  locationLoading
                }
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {locationLoading
                  ? "Finding nearby..."
                  : "📍 Find events near me"}
              </button>
            </div>

            {nearbyMode && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  Showing nearby events
                </span>

                <button
                  type="button"
                  onClick={
                    loadEvents
                  }
                  className="text-sm font-medium text-gray-700 hover:text-black hover:underline"
                >
                  Show all events
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Event list */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {nearbyMode
                ? "Events near you"
                : "Upcoming events"}
            </h2>

            <span className="text-sm text-gray-500">
              {events.length} shown
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-black" />

              <p className="mt-4 text-gray-500">
                Loading events...
              </p>
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <h3 className="font-semibold text-gray-900">
                No events found
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Try another search or create
                an event.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => {
                const eventAttendees =
                  attendees[event.id];

                return (
                  <article
                    key={event.id}
                    className="rounded-2xl bg-white p-6 shadow-sm"
                  >
                    {/* Status */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {event.status}
                      </span>

                      {event.neighborhood_id && (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                          Neighborhood #
                          {
                            event.neighborhood_id
                          }
                        </span>
                      )}

                      {nearbyMode &&
                        "distance_km" in
                          event && (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                            {Number(
                              (
                                event as NearbyEvent
                              ).distance_km,
                            ).toFixed(
                              2,
                            )}{" "}
                            km away
                          </span>
                        )}
                    </div>

                    {/* Title */}
                    <h3 className="mt-4 text-2xl font-semibold text-gray-900">
                      {event.title}
                    </h3>

                    {/* Description */}
                    <p className="mt-3 whitespace-pre-wrap text-gray-600">
                      {event.description}
                    </p>

                    {/* Event details */}
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-gray-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                          When
                        </p>

                        <p className="mt-1 font-medium text-gray-900">
                          {formatDate(
                            event.start_time,
                          )}
                        </p>

                        {event.end_time && (
                          <p className="mt-1 text-sm text-gray-500">
                            Until{" "}
                            {formatDate(
                              event.end_time,
                            )}
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl bg-gray-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                          Location
                        </p>

                        <p className="mt-1 font-medium text-gray-900">
                          {
                            event.location_name
                          }
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {event.latitude},{" "}
                          {event.longitude}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 flex flex-wrap gap-3 border-t border-gray-100 pt-5">
                      {event.status ===
                        "ACTIVE" && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleRSVP(
                                event.id,
                              )
                            }
                            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
                          >
                            RSVP
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleCancelRSVP(
                                event.id,
                              )
                            }
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                          >
                            Cancel RSVP
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          handleViewAttendees(
                            event.id,
                          )
                        }
                        disabled={
                          attendeesLoading ===
                          event.id
                        }
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {attendeesLoading ===
                        event.id
                          ? "Loading..."
                          : "View attendees"}
                      </button>
                    </div>

                    {/* Attendees */}
                    {eventAttendees && (
                      <div className="mt-4 rounded-xl bg-gray-50 p-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-900">
                            Attendees
                          </h4>

                          <span className="text-sm text-gray-500">
                            {
                              eventAttendees.length
                            }
                          </span>
                        </div>

                        {eventAttendees.length ===
                        0 ? (
                          <p className="mt-3 text-sm text-gray-500">
                            No attendees yet.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {eventAttendees.map(
                              (
                                attendee,
                              ) => (
                                <div
                                  key={
                                    attendee.id
                                  }
                                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2"
                                >
                                  <span className="text-sm font-medium text-gray-700">
                                    User #
                                    {
                                      attendee.user_id
                                    }
                                  </span>

                                  <span className="text-xs text-gray-400">
                                    {formatDate(
                                      attendee.created_at,
                                    )}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-gray-100 pt-4 text-sm text-gray-400">
                      <span>
                        Created by User #
                        {event.user_id}
                      </span>

                      <span>
                        {formatDate(
                          event.created_at,
                        )}
                      </span>
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