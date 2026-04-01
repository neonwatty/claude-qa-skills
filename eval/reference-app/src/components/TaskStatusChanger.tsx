"use client";

import { useState } from "react";

interface TaskStatusChangerProps {
  taskId: number;
  currentStatus: string;
}

export default function TaskStatusChanger({
  taskId,
  currentStatus,
}: TaskStatusChangerProps) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  async function handleChange(newStatus: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setStatus(newStatus);
        window.location.reload();
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="status-select"
        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        Status:
      </label>
      <select
        id="status-select"
        value={status}
        disabled={loading}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 disabled:opacity-50"
      >
        <option value="todo">Todo</option>
        <option value="in-progress">In Progress</option>
        <option value="done">Done</option>
      </select>
    </div>
  );
}
