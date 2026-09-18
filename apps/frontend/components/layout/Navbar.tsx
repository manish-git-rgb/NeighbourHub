"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { clearTokens } from "@/lib/auth";
import { api } from "@/lib/api";

type UserRole = "USER" | "MODERATOR" | "ADMIN";

type CurrentUser = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
};

const baseNavItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
  },
  {
    name: "Map",
    href: "/map",
  },
  {
    name: "Posts",
    href: "/posts",
  },
  {
    name: "Events",
    href: "/events",
  },
  {
    name: "Places",
    href: "/places",
  },
  {
    name: "Services",
    href: "/services",
  },
  {
    name: "Lost & Found",
    href: "/lost-found",
  },
  {
    name: "Issues",
    href: "/issues",
  },
  {
    name: "Notifications",
    href: "/notifications",
  },
  {
    name: "Profile",
    href: "/profile",
  },
];

const moderationNavItem = {
  name: "Moderation",
  href: "/moderation",
};

const adminNavItem = {
  name: "Admin",
  href: "/admin",
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [role, setRole] = useState<UserRole>("USER");

  useEffect(() => {
    let mounted = true;

    async function loadRole() {
      try {
        const response = await api.get<CurrentUser>("/users/me");

        if (!mounted) return;

        const userRole = response.data.role.toUpperCase();

        if (
          userRole === "USER" ||
          userRole === "MODERATOR" ||
          userRole === "ADMIN"
        ) {
          setRole(userRole);
        }
      } catch {
        // Keep the default USER navigation when the user cannot be loaded.
      }
    }

    loadRole();

    return () => {
      mounted = false;
    };
  }, []);

  const navItems = [...baseNavItems];

  if (role === "MODERATOR" || role === "ADMIN") {
    navItems.splice(navItems.length - 1, 0, moderationNavItem);
  }

  if (role === "ADMIN") {
    navItems.splice(navItems.length - 1, 0, adminNavItem);
  }

  function handleLogout() {
    clearTokens();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="shrink-0 text-xl font-bold text-gray-900"
        >
          NeighborHub
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
                    : "rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                }
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          Logout
        </button>
      </div>

      {/* Mobile Navigation */}
      <div className="border-t border-gray-200 bg-white px-4 py-2 lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "whitespace-nowrap rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
                    : "whitespace-nowrap rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700"
                }
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}