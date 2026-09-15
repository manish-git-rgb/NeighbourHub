"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Navbar from "@/components/layout/Navbar";

import { api } from "@/lib/api";
import {
  clearTokens,
  getAccessToken,
} from "@/lib/auth";

type User = {
  id: number;
  name: string;
  username: string;
  email: string;
  profile_image: string | null;
  bio: string | null;
  role: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [tokenExists, setTokenExists] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = getAccessToken();

      if (!token) {
        router.push("/login");
        return;
      }

      setTokenExists(true);

      try {
        const response = await api.get<User>(
          "/users/me",
        );

        setUser(response.data);
      } catch {
        clearTokens();
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

  function handleLogout() {
    clearTokens();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-black" />

          <p className="mt-4 text-sm text-gray-500">
            Loading NeighborHub...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        {/* Welcome */}
        <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Welcome back
              </p>

              <h1 className="mt-1 text-3xl font-bold text-gray-900">
                {user.name}
              </h1>

              <p className="mt-2 text-gray-500">
                @{user.username}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-fit rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </section>

        {/* User Information */}
        <section className="mt-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Your profile
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Full name
              </p>

              <p className="mt-2 font-medium text-gray-900">
                {user.name}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Username
              </p>

              <p className="mt-2 font-medium text-gray-900">
                @{user.username}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Email
              </p>

              <p className="mt-2 break-words font-medium text-gray-900">
                {user.email}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Role
              </p>

              <p className="mt-2 font-medium uppercase text-gray-900">
                {user.role}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                User ID
              </p>

              <p className="mt-2 font-medium text-gray-900">
                {user.id}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Authentication
              </p>

              <p className="mt-2 font-medium text-green-600">
                {tokenExists
                  ? "Authenticated"
                  : "Not authenticated"}
              </p>
            </div>
          </div>
        </section>

        {/* Bio */}
        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            About you
          </h2>

          <p className="mt-3 text-gray-600">
            {user.bio ||
              "You haven't added a bio yet."}
          </p>
        </section>

        {/* Quick Actions */}
        <section className="mt-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Quick actions
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => router.push("/posts")}
              className="rounded-2xl bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-lg font-semibold text-gray-900">
                Posts
              </p>

              <p className="mt-1 text-sm text-gray-500">
                See what's happening nearby.
              </p>
            </button>

            <button
              type="button"
              onClick={() => router.push("/events")}
              className="rounded-2xl bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-lg font-semibold text-gray-900">
                Events
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Discover local events.
              </p>
            </button>

            <button
              type="button"
              onClick={() => router.push("/places")}
              className="rounded-2xl bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-lg font-semibold text-gray-900">
                Places
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Explore nearby places.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/notifications")
              }
              className="rounded-2xl bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-lg font-semibold text-gray-900">
                Notifications
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Check your latest updates.
              </p>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}