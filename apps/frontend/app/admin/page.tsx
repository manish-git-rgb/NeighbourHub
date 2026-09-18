"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import Navbar from "@/components/layout/Navbar";
import {api} from "@/lib/api";

type UserRole = "USER" | "MODERATOR" | "ADMIN";

interface CurrentUser {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
}

interface AdminUser {
  id: number;
  name: string;
  username: string;
  email: string;
  profile_image: string | null;
  bio: string | null;
  role: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
}

interface AdminUserListResponse {
  success: boolean;
  data: AdminUser[];
  pagination: Pagination;
}

interface RoleUpdateResponse {
  success: boolean;
  message: string;
  data: AdminUser;
}

const ROLES: UserRole[] = ["USER", "MODERATOR", "ADMIN"];

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "Something went wrong."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function formatRole(role: string): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function AdminPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
  });

  const [roleFilter, setRoleFilter] = useState<string>("");

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);

  const [pendingRole, setPendingRole] = useState<UserRole>("USER");
  const [updatingRole, setUpdatingRole] = useState(false);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const totalPages = useMemo(() => {
    if (pagination.total === 0) return 1;

    return Math.ceil(pagination.total / pagination.limit);
  }, [pagination.total, pagination.limit]);

  const loadCurrentUser = async () => {
    try {
      setLoadingUser(true);
      setError("");

      const response = await api.get<CurrentUser>("/users/me");

      const user = response.data;
      setCurrentUser(user);

      if (user.role !== "ADMIN") {
        router.replace("/dashboard");
        return;
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingUser(false);
    }
  };

  const loadUsers = async (page = pagination.page, role = roleFilter) => {
    try {
      setLoadingUsers(true);
      setError("");

      const params: Record<string, string | number> = {
        page,
        limit: pagination.limit,
      };

      if (role) {
        params.role = role;
      }

      const response = await api.get<AdminUserListResponse>(
        "/admin/users",
        { params }
      );

      setUsers(response.data.data);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser?.role === "ADMIN") {
      loadUsers(1, roleFilter);
    }
  }, [currentUser, roleFilter]);

  const handleRefresh = async () => {
    setSuccess("");
    await loadUsers(pagination.page, roleFilter);
  };

  const handleRoleFilterChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setRoleFilter(event.target.value);
  };

  const handlePreviousPage = () => {
    if (pagination.page <= 1 || loadingUsers) return;

    loadUsers(pagination.page - 1, roleFilter);
  };

  const handleNextPage = () => {
    if (pagination.page >= totalPages || loadingUsers) return;

    loadUsers(pagination.page + 1, roleFilter);
  };

  const openUserDetails = async (userId: number) => {
    try {
      setSelectedUser(null);
      setSelectedUserLoading(true);
      setError("");
      setSuccess("");

      const response = await api.get<AdminUser>(
        `/admin/users/${userId}`
      );

      setSelectedUser(response.data);
      setPendingRole(
        ROLES.includes(response.data.role as UserRole)
          ? (response.data.role as UserRole)
          : "USER"
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSelectedUserLoading(false);
    }
  };

  const closeUserDetails = () => {
    if (updatingRole) return;

    setSelectedUser(null);
    setSelectedUserLoading(false);
  };

  const handleRoleUpdate = async () => {
    if (!selectedUser) return;

    if (!ROLES.includes(pendingRole)) {
      setError("Please select a valid role.");
      return;
    }

    try {
      setUpdatingRole(true);
      setError("");
      setSuccess("");

      const response = await api.patch<RoleUpdateResponse>(
        `/admin/users/${selectedUser.id}/role`,
        {
          role: pendingRole,
        }
      );

      setSelectedUser(response.data.data);

      setUsers((previousUsers) =>
        previousUsers.map((user) =>
          user.id === response.data.data.id
            ? response.data.data
            : user
        )
      );

      setSuccess(response.data.message);

      await loadUsers(pagination.page, roleFilter);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingRole(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-gray-600">Checking admin access...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <h1 className="text-xl font-semibold text-red-700">
              Access denied
            </h1>

            <p className="mt-2 text-sm text-red-600">
              You do not have permission to access the admin dashboard.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">
                Administrator
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
                Admin Dashboard
              </h1>

              <p className="mt-2 text-sm text-gray-600">
                Manage NeighborHub users and their platform roles.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loadingUsers}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingUsers ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Notifications */}
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

        {/* Summary cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Total users
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {pagination.total}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Total accounts returned by the admin API
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Users on this page
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {users.length}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Current filtered page
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Current admin
            </p>

            <p className="mt-2 truncate text-lg font-semibold text-gray-900">
              {currentUser.username}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Role: {formatRole(currentUser.role)}
            </p>
          </div>
        </div>

        {/* User management */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* Section header */}
          <div className="border-b border-gray-200 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  User Management
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  View users and update their platform roles.
                </p>
              </div>

              <div className="w-full lg:w-56">
                <label
                  htmlFor="role-filter"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Filter by role
                </label>

                <select
                  id="role-filter"
                  value={roleFilter}
                  onChange={handleRoleFilterChange}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All roles</option>
                  <option value="USER">User</option>
                  <option value="MODERATOR">Moderator</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
          </div>

          {/* Loading */}
          {loadingUsers && (
            <div className="p-8 text-center text-sm text-gray-500">
              Loading users...
            </div>
          )}

          {/* Empty */}
          {!loadingUsers && users.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-lg font-medium text-gray-900">
                No users found
              </p>

              <p className="mt-1 text-sm text-gray-500">
                No users match the current role filter.
              </p>
            </div>
          )}

          {/* Desktop table */}
          {!loadingUsers && users.length > 0 && (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        User
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Email
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Role
                      </th>

                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 bg-white">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.name}
                            </p>

                            <p className="text-sm text-gray-500">
                              @{user.username}
                            </p>

                            <p className="mt-0.5 text-xs text-gray-400">
                              ID: {user.id}
                            </p>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                          {user.email}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              user.role === "ADMIN"
                                ? "bg-purple-100 text-purple-700"
                                : user.role === "MODERATOR"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {formatRole(user.role)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openUserDetails(user.id)}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                          >
                            View / Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y divide-gray-200 md:hidden">
                {users.map((user) => (
                  <div key={user.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">
                          {user.name}
                        </p>

                        <p className="mt-0.5 truncate text-sm text-gray-500">
                          @{user.username}
                        </p>

                        <p className="mt-1 break-all text-sm text-gray-600">
                          {user.email}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          User ID: {user.id}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                          user.role === "ADMIN"
                            ? "bg-purple-100 text-purple-700"
                            : user.role === "MODERATOR"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {formatRole(user.role)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openUserDetails(user.id)}
                      className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      View / Manage
                    </button>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  Page {pagination.page} of {totalPages}
                  {" • "}
                  {pagination.total} total users
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePreviousPage}
                    disabled={pagination.page <= 1 || loadingUsers}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={handleNextPage}
                    disabled={
                      pagination.page >= totalPages || loadingUsers
                    }
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {/* User details modal */}
      {(selectedUserLoading || selectedUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {selectedUserLoading ? (
              <div className="p-10 text-center text-sm text-gray-500">
                Loading user details...
              </div>
            ) : selectedUser ? (
              <>
                {/* Modal header */}
                <div className="flex items-start justify-between border-b border-gray-200 p-5 sm:p-6">
                  <div>
                    <p className="text-sm font-medium text-blue-600">
                      User #{selectedUser.id}
                    </p>

                    <h3 className="mt-1 text-xl font-semibold text-gray-900">
                      {selectedUser.name}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      @{selectedUser.username}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeUserDetails}
                    disabled={updatingRole}
                    className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-5 p-5 sm:p-6">
                  {/* User info */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Email
                        </p>
                        <p className="mt-1 break-all text-sm text-gray-900">
                          {selectedUser.email}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Profile image
                        </p>
                        <p className="mt-1 break-all text-sm text-gray-900">
                          {selectedUser.profile_image || "Not provided"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Bio
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                          {selectedUser.bio || "No bio provided"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Current role
                        </p>

                        <span
                          className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            selectedUser.role === "ADMIN"
                              ? "bg-purple-100 text-purple-700"
                              : selectedUser.role === "MODERATOR"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {formatRole(selectedUser.role)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Role management */}
                  <div>
                    <label
                      htmlFor="user-role"
                      className="mb-2 block text-sm font-semibold text-gray-900"
                    >
                      Change role
                    </label>

                    <select
                      id="user-role"
                      value={pendingRole}
                      onChange={(event) =>
                        setPendingRole(event.target.value as UserRole)
                      }
                      disabled={updatingRole}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {formatRole(role)}
                        </option>
                      ))}
                    </select>

                    <p className="mt-2 text-xs text-gray-500">
                      Available roles: USER, MODERATOR, ADMIN.
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeUserDetails}
                      disabled={updatingRole}
                      className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Close
                    </button>

                    <button
                      type="button"
                      onClick={handleRoleUpdate}
                      disabled={updatingRole}
                      className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updatingRole ? "Updating..." : "Update Role"}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}