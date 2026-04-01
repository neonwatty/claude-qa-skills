"use client";

import { useState } from "react";

interface AddCommentFormProps {
  taskId: number;
}

export default function AddCommentForm({ taskId }: AddCommentFormProps) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, taskId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add comment");
        return;
      }

      setBody("");
      window.location.reload();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
        Add Comment
      </h3>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          rows={2}
          placeholder="Write a comment..."
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <button
          type="submit"
          disabled={loading}
          className="self-end rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}
