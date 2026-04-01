import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { get, query, run } from "@/lib/db";

interface ProjectRow {
  id: number;
  name: string;
  description: string;
  visibility: string;
  owner_id: number;
  owner_name: string;
  created_at: string;
}

interface TaskRow {
  id: number;
  title: string;
  status: string;
  priority: string;
  assignee_id: number | null;
  project_id: number;
  created_at: string;
}

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/projects/[id]">
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const project = get<ProjectRow>(
    `SELECT p.*, u.name AS owner_name
     FROM projects p
     JOIN users u ON p.owner_id = u.id
     WHERE p.id = ?`,
    [id]
  );

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const tasks = query<TaskRow>(
    "SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC",
    [id]
  );

  return NextResponse.json({ ...project, tasks });
}

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/projects/[id]">
) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (userRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await request.json();

  const existing = get<ProjectRow>(
    "SELECT * FROM projects WHERE id = ?",
    [id]
  );
  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const name = body.name ?? existing.name;
  const description = body.description ?? existing.description;
  const visibility = body.visibility ?? existing.visibility;

  run(
    "UPDATE projects SET name = ?, description = ?, visibility = ? WHERE id = ?",
    [name, description, visibility, id]
  );

  const updated = get<ProjectRow>(
    `SELECT p.*, u.name AS owner_name
     FROM projects p
     JOIN users u ON p.owner_id = u.id
     WHERE p.id = ?`,
    [id]
  );

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/projects/[id]">
) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (userRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  const existing = get<{ id: number }>(
    "SELECT id FROM projects WHERE id = ?",
    [id]
  );
  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  run("DELETE FROM projects WHERE id = ?", [id]);

  return NextResponse.json({ success: true });
}
