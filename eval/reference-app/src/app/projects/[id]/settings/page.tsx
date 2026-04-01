"use client";

import { useState, useEffect, use } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<{
    name: string;
    description: string;
    visibility: string;
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data);
        } else {
          setError("Failed to load project");
        }
      } catch {
        setError("Failed to load project");
      }
    }
    fetchProject();
  }, [id]);

  async function handleDelete() {
    setDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete project");
        setConfirmOpen(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("An unexpected error occurred");
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  if (!project && !error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
        Project Settings
      </h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {project && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Name
              </dt>
              <dd className="text-sm text-zinc-900 dark:text-zinc-100">
                {project.name}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Description
              </dt>
              <dd className="text-sm text-zinc-900 dark:text-zinc-100">
                {project.description || "No description"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Visibility
              </dt>
              <dd className="text-sm text-zinc-900 dark:text-zinc-100">
                {project.visibility}
              </dd>
            </div>
          </dl>

          <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <h3 className="text-sm font-medium text-red-600 mb-2">
              Danger Zone
            </h3>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={deleting}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Delete Project
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
        confirmLabel="Confirm Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
