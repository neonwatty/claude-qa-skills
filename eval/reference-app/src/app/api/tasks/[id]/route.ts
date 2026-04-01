import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { get, query, run } from "@/lib/db";

interface TaskRow {
  id: number;
  title: string;
  status: string;
  priority: string;
  assignee_id: number | null;
  project_id: number;
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

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/tasks/[id]">
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const task = get<TaskRow>("SELECT * FROM tasks WHERE id = ?", [id]);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const comments = query<CommentRow>(
    `SELECT c.*, u.name AS author_name
     FROM comments c
     JOIN users u ON c.author_id = u.id
     WHERE c.task_id = ?
     ORDER BY c.created_at ASC`,
    [id]
  );

  return NextResponse.json({ ...task, comments });
}

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/tasks/[id]">
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json();

  const existing = get<TaskRow>("SELECT * FROM tasks WHERE id = ?", [id]);
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const title = body.title ?? existing.title;
  const status = body.status ?? existing.status;
  const priority = body.priority ?? existing.priority;
  const assigneeId = body.assigneeId !== undefined ? body.assigneeId : existing.assignee_id;

  run(
    "UPDATE tasks SET title = ?, status = ?, priority = ?, assignee_id = ? WHERE id = ?",
    [title, status, priority, assigneeId, id]
  );

  if (
    body.assigneeId !== undefined &&
    body.assigneeId !== existing.assignee_id &&
    body.assigneeId !== null
  ) {
    run(
      "INSERT INTO notifications (user_id, message) VALUES (?, ?)",
      [body.assigneeId, `You were assigned to task "${title}"`]
    );
  }

  const updated = get<TaskRow>("SELECT * FROM tasks WHERE id = ?", [id]);

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/tasks/[id]">
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const existing = get<{ id: number }>("SELECT id FROM tasks WHERE id = ?", [id]);
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  run("DELETE FROM tasks WHERE id = ?", [id]);

  return NextResponse.json({ success: true });
}
