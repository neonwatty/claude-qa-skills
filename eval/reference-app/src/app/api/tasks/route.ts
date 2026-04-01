import { NextRequest, NextResponse } from "next/server";
import { query, run, get } from "@/lib/db";

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

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get("projectId");

  const tasks = query<TaskRow>(
    `SELECT t.*, u.name AS assignee_name
     FROM tasks t
     LEFT JOIN users u ON t.assignee_id = u.id
     WHERE t.project_id = ?
     ORDER BY t.created_at DESC`,
    [projectId]
  );

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, projectId, priority, assigneeId } = await request.json();

  const result = run(
    `INSERT INTO tasks (title, project_id, priority, assignee_id)
     VALUES (?, ?, ?, ?)`,
    [title, projectId, priority ?? "medium", assigneeId ?? null]
  );

  const task = get<TaskRow>(
    `SELECT t.*, u.name AS assignee_name
     FROM tasks t
     LEFT JOIN users u ON t.assignee_id = u.id
     WHERE t.id = ?`,
    [result.lastInsertRowid]
  );

  if (assigneeId && Number(assigneeId) !== Number(userId)) {
    run(
      "INSERT INTO notifications (user_id, message) VALUES (?, ?)",
      [assigneeId, `You were assigned to task "${title}"`]
    );
  }

  return NextResponse.json(task, { status: 201 });
}
