"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { clearTokens } from "@/lib/auth";

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
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

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

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