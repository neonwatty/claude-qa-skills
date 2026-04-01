import Link from "next/link";
import { requireAuth } from "@/lib/session";
import { get, query } from "@/lib/db";
import StatusBadge from "@/components/StatusBadge";
import AddCommentForm from "@/components/AddCommentForm";
import TaskStatusChanger from "@/components/TaskStatusChanger";

interface TaskRow {
  id: number;
  title: string;
  status: string;
  priority: string;
  assignee_id: number | null;
  assignee_name: string | null;
  project_id: number;
  project_name: string;
  created_at: string;
}

interface CommentRow {
  id: number;
  body: string;
  author_id: number;
  author_name: string;
  task_id: number;
  created_at: string;
}

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  const task = get<TaskRow>(
    `SELECT t.*, u.name AS assignee_name, p.name AS project_name
     FROM tasks t
     LEFT JOIN users u ON t.assignee_id = u.id
     JOIN projects p ON t.project_id = p.id
     WHERE t.id = ?`,
    [id]
  );

  if (!task) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Task not found
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

  const comments = query<CommentRow>(
    `SELECT c.*, u.name AS author_name
     FROM comments c
     JOIN users u ON c.author_id = u.id
     WHERE c.task_id = ?
     ORDER BY c.created_at ASC`,
    [id]
  );

  const canChangeStatus =
    user.role === "admin" || user.userId === task.assignee_id;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-4">
        <Link
          href={`/projects/${task.project_id}`}
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          {task.project_name}
        </Link>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {task.title}
            </h1>
            <div className="mt-2 flex items-center gap-3">
              <StatusBadge status={task.status} />
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  task.priority === "high"
                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    : task.priority === "medium"
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                }`}
              >
                {task.priority}
              </span>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <div>
            <dt className="font-medium text-zinc-500 dark:text-zinc-400">
              Assignee
            </dt>
            <dd className="text-zinc-900 dark:text-zinc-100">
              {task.assignee_name || "Unassigned"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-500 dark:text-zinc-400">
              Project
            </dt>
            <dd>
              <Link
                href={`/projects/${task.project_id}`}
                className="text-blue-600 hover:text-blue-500"
              >
                {task.project_name}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-500 dark:text-zinc-400">
              Created
            </dt>
            <dd className="text-zinc-900 dark:text-zinc-100">
              {task.created_at}
            </dd>
          </div>
        </dl>

        {canChangeStatus && (
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <TaskStatusChanger taskId={task.id} currentStatus={task.status} />
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Comments
        </h2>

        {comments.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No comments yet
          </p>
        ) : (
          <ul className="space-y-4">
            {comments.map((comment) => (
              <li
                key={comment.id}
                className="border-b border-zinc-100 pb-3 last:border-0 dark:border-zinc-800"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {comment.author_name}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {comment.created_at}
                  </span>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {comment.body}
                </p>
              </li>
            ))}
          </ul>
        )}

        <AddCommentForm taskId={task.id} />
      </div>
    </div>
  );
}
