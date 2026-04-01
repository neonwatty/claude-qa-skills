"use client";

import { useState } from "react";

interface MarkReadButtonProps {
  notificationId: number;
}

export default function MarkReadButton({
  notificationId,
}: MarkReadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notificationId, read: 1 }),
      });

      if (res.ok) {
        setDone(true);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <span className="text-xs text-green-600 dark:text-green-400">Read</span>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-md bg-gray-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-gray-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50"
    >
      {loading ? "..." : "Mark as read"}
    </button>
  );
}
