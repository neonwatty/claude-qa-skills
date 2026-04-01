import Link from "next/link";
import { requireAuth } from "@/lib/session";
import { query } from "@/lib/db";

interface ProjectRow {
  id: number;
  name: string;
  description: string;
  visibility: string;
  owner_id: number;
  created_at: string;
  task_count: number;
}

export default async function DashboardPage() {
  const user = await requireAuth();

  const projects = query<ProjectRow>(
    `SELECT p.*, COUNT(t.id) AS task_count
     FROM projects p
     LEFT JOIN tasks t ON t.project_id = p.id
     GROUP BY p.id
     ORDER BY p.created_at DESC`
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Welcome, {user.name}
          </p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            No projects yet
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Get started by creating your first project.
          </p>
          <Link
            href="/projects/new"
            className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block rounded-lg border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {project.name}
                </h3>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    project.visibility === "public"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
                  }`}
                >
                  {project.visibility}
                </span>
              </div>
              {project.description && (
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                  {project.description}
                </p>
              )}
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
                {project.task_count} {project.task_count === 1 ? "task" : "tasks"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
