import { NextRequest, NextResponse } from "next/server";
import { query, run, get } from "@/lib/db";

interface ProjectRow {
  id: number;
  name: string;
  description: string;
  visibility: string;
  owner_id: number;
  owner_name: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = query<ProjectRow>(
    `SELECT p.*, u.name AS owner_name
     FROM projects p
     JOIN users u ON p.owner_id = u.id
     ORDER BY p.created_at DESC`
  );

  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description, visibility } = await request.json();

  const result = run(
    `INSERT INTO projects (name, description, visibility, owner_id)
     VALUES (?, ?, ?, ?)`,
    [name, description ?? "", visibility ?? "private", Number(userId)]
  );

  const project = get<ProjectRow>(
    `SELECT p.*, u.name AS owner_name
     FROM projects p
     JOIN users u ON p.owner_id = u.id
     WHERE p.id = ?`,
    [result.lastInsertRowid]
  );

  if (userRole === "member") {
    const admins = query<{ id: number }>(
      "SELECT id FROM users WHERE role = 'admin'"
    );
    for (const admin of admins) {
      run(
        "INSERT INTO notifications (user_id, message) VALUES (?, ?)",
        [admin.id, `New project "${name}" was created`]
      );
    }
  }

  return NextResponse.json(project, { status: 201 });
}
