import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: string;
}

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (userRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = query<UserRow>(
    "SELECT id, email, name, role FROM users ORDER BY id ASC"
  );

  return NextResponse.json(users);
}
