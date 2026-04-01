import Link from "next/link";
import { requireAuth } from "@/lib/session";
import { get, query } from "@/lib/db";
import StatusBadge from "@/components/StatusBadge";
import AddTaskForm from "@/components/AddTaskForm";

interface ProjectRow {
  id: number;
  name: string;
  description: string;
  visibility: string;
  owner_id: number;
  created_at: string;
}

interface TaskRow {
  id: number;
  title: string;
  status: string;
  priority: string;
  assignee_id: number | null;
  assignee_name: string | null;
  project_id: number;
  created_at: string;
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  const project = get<ProjectRow>("SELECT * FROM projects WHERE id = ?", [id]);

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Project not found
        </h1>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-500"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const tasks = query<TaskRow>(
    `SELECT t.*, u.name AS assignee_name
     FROM tasks t
     LEFT JOIN users u ON t.assignee_id = u.id
     WHERE t.project_id = ?
     ORDER BY t.created_at DESC`,
    [id]
  );

  const isAdmin = user.role === "admin";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {project.name}
            </h1>
            {project.description && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {project.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                project.visibility === "public"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
              }`}
            >
              {project.visibility}
            </span>
            {isAdmin && (
              <>
                <Link
                  href={`/projects/${project.id}/edit`}
                  className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-gray-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                >
                  Edit
                </Link>
                <Link
                  href={`/projects/${project.id}/settings`}
                  className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-gray-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                >
                  Settings
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Tasks
        </h2>

        {tasks.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No tasks yet
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {tasks.map((task) => (
              <li key={task.id} className="py-3">
                <Link
                  href={`/tasks/${task.id}`}
                  className="flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 -mx-2 px-2 py-1 rounded"
                >
                  <div className="flex items-center gap-3">
                    <StatusBadge status={task.status} />
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ${
                        task.priority === "high"
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          : task.priority === "medium"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {task.priority}
                    </span>
                    {task.assignee_name && (
                      <span>{task.assignee_name}</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <AddTaskForm projectId={project.id} />
      </div>
    </div>
  );
}
