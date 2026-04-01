"use client";

import { useState } from "react";

interface RoleChangerProps {
  userId: number;
  currentRole: string;
}

export default function RoleChanger({ userId, currentRole }: RoleChangerProps) {
  const [role, setRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);

  async function handleChange(newRole: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        setRole(newRole);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <select
      value={role}
      disabled={loading}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 disabled:opacity-50"
    >
      <option value="member">member</option>
      <option value="admin">admin</option>
    </select>
  );
}
