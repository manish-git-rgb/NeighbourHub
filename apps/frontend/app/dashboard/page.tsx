"use client";

import { useRouter } from "next/navigation";

import {
  clearTokens,
  getAccessToken,
} from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();

  const token = getAccessToken();

  function handleLogout() {
    clearTokens();
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl bg-white p-8 shadow">
          <h1 className="text-3xl font-bold">
            NeighborHub Dashboard
          </h1>

          <p className="mt-2 text-gray-600">
            You are logged in.
          </p>

          <p className="mt-4 break-all text-xs text-gray-400">
            Token stored:{" "}
            {token ? "Yes" : "No"}
          </p>

          <button
            onClick={handleLogout}
            className="mt-6 rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800"
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}