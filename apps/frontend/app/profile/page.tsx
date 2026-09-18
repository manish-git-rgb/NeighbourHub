"use client";

import { FormEvent, useEffect, useState } from "react";
import { AxiosError } from "axios";
import { api } from "@/lib/api";
import Navbar from "@/components/layout/Navbar";

interface User {
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

interface NeighborhoodMembership {
  id: number;
  neighborhood_id: number;
  user_id: number;
  role?: string;
  joined_at?: string;
  neighborhood?: {
    id: number;
    name: string;
  };
}

interface ErrorResponse {
  detail?: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<ErrorResponse>;

  return (
    axiosError.response?.data?.detail ||
    axiosError.message ||
    fallback
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString();
}

function normalizeRole(role: string): string {
  return role
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [bio, setBio] = useState("");

  const [neighborhoods, setNeighborhoods] = useState<
    NeighborhoodMembership[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingNeighborhoods, setLoadingNeighborhoods] =
    useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchProfile() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get<User>("/users/me");

      const currentUser = response.data;

      setUser(currentUser);

      setName(currentUser.name || "");
      setUsername(currentUser.username || "");
      setEmail(currentUser.email || "");
      setProfileImage(currentUser.profile_image || "");
      setBio(currentUser.bio || "");
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to load your profile.")
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchNeighborhoods() {
    try {
      setLoadingNeighborhoods(true);

      const response = await api.get<NeighborhoodMembership[]>(
        "/users/me/neighborhoods"
      );

      setNeighborhoods(response.data);
    } catch {
      // Neighborhood information is optional for the page.
      setNeighborhoods([]);
    } finally {
      setLoadingNeighborhoods(false);
    }
  }

  useEffect(() => {
    fetchProfile();
    fetchNeighborhoods();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload: {
        name: string;
        username: string;
        email: string;
        profile_image?: string | null;
        bio?: string | null;
      } = {
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        profile_image:
          profileImage.trim() === ""
            ? null
            : profileImage.trim(),
        bio: bio.trim() === "" ? null : bio.trim(),
      };

      const response = await api.patch<User>(
        "/users/me",
        payload
      );

      const updatedUser = response.data;

      setUser(updatedUser);

      setName(updatedUser.name || "");
      setUsername(updatedUser.username || "");
      setEmail(updatedUser.email || "");
      setProfileImage(updatedUser.profile_image || "");
      setBio(updatedUser.bio || "");

      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to update your profile.")
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 w-32 rounded bg-slate-200" />
            <div className="mt-3 h-4 w-64 rounded bg-slate-200" />

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              <div className="h-72 rounded-2xl bg-slate-200" />
              <div className="h-96 rounded-2xl bg-slate-200 lg:col-span-2" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error || "Profile could not be loaded."}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-600">
            Account settings
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            My Profile
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Manage your NeighborHub profile information.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile summary */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              {user.profile_image ? (
                <img
                  src={user.profile_image}
                  alt="Profile"
                  className="h-24 w-24 rounded-full border-4 border-slate-100 object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-3xl font-bold text-blue-700">
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}

              <h2 className="mt-4 text-xl font-bold text-slate-900">
                {user.name}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                @{user.username}
              </p>

              <span className="mt-4 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                {normalizeRole(user.role)}
              </span>
            </div>

            <div className="mt-8 space-y-4 border-t border-slate-100 pt-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  User ID
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {user.id}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Email
                </p>
                <p className="mt-1 break-all text-sm font-medium text-slate-800">
                  {user.email}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Joined
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {formatDate(user.created_at)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Last updated
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {formatDate(user.updated_at)}
                </p>
              </div>
            </div>
          </section>

          {/* Edit form */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                Edit profile
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Update the information displayed on your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Full name
                  </label>

                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Username
                  </label>

                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(event) =>
                      setUsername(event.target.value)
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="username"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="profile_image"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Profile image URL
                </label>

                <input
                  id="profile_image"
                  type="url"
                  value={profileImage}
                  onChange={(event) =>
                    setProfileImage(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="https://example.com/profile.jpg"
                />

                <p className="mt-1.5 text-xs text-slate-400">
                  Leave empty to remove the current profile image.
                </p>
              </div>

              <div>
                <label
                  htmlFor="bio"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Bio
                </label>

                <textarea
                  id="bio"
                  value={bio}
                  onChange={(event) =>
                    setBio(event.target.value)
                  }
                  rows={5}
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Tell your neighborhood a little about yourself..."
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Neighborhoods */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              My neighborhoods
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Neighborhoods associated with your account.
            </p>
          </div>

          {loadingNeighborhoods ? (
            <div className="space-y-3">
              <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : neighborhoods.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                No neighborhood memberships found.
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Your neighborhood memberships will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {neighborhoods.map((membership) => (
                <div
                  key={membership.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="font-semibold text-slate-900">
                    {membership.neighborhood?.name ||
                      `Neighborhood #${membership.neighborhood_id}`}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Neighborhood ID: {membership.neighborhood_id}
                  </p>

                  {membership.role && (
                    <span className="mt-3 inline-block rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {normalizeRole(membership.role)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}