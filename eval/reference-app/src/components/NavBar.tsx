"use client";

import { useState } from "react";
import Link from "next/link";

interface NavBarProps {
  user: {
    name: string;
    role: string;
  } | null;
}

export default function NavBar({ user }: NavBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <nav className="bg-white shadow dark:bg-zinc-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-lg font-bold text-zinc-900 dark:text-zinc-100"
            >
              TaskFlow
            </Link>
            {user && (
              <div className="hidden md:flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Dashboard
                </Link>
                {user.role === "admin" && (
                  <Link
                    href="/admin/users"
                    className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    Admin
                  </Link>
                )}
              </div>
            )}
          </div>

          {user && (
            <div className="hidden md:flex items-center gap-4">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {user.name}
              </span>
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {user.role}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-gray-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
              >
                Logout
              </button>
            </div>
          )}

          {user && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              aria-label="Toggle menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {menuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          )}
        </div>
      </div>

      {user && menuOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-700">
          <div className="space-y-1 px-4 py-3">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-700">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {user.name}
              </span>
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {user.role}
              </span>
            </div>
            <Link
              href="/dashboard"
              className="block py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </Link>
            {user.role === "admin" && (
              <Link
                href="/admin/users"
                className="block py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                onClick={() => setMenuOpen(false)}
              >
                Admin
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="block w-full text-left py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
