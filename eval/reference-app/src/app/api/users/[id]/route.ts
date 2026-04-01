import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: string;
}

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/users/[id]">
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

  const existing = get<UserRow>(
    "SELECT id, email, name, role FROM users WHERE id = ?",
    [id]
  );
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const name = body.name ?? existing.name;
  const role = body.role ?? existing.role;

  run("UPDATE users SET name = ?, role = ? WHERE id = ?", [name, role, id]);

  const updated = get<UserRow>(
    "SELECT id, email, name, role FROM users WHERE id = ?",
    [id]
  );

  return NextResponse.json(updated);
}
