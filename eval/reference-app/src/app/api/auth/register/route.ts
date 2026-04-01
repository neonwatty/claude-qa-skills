import { NextRequest, NextResponse } from "next/server";
import { run, get } from "@/lib/db";
import { signToken, setAuthCookie } from "@/lib/auth";

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: string;
}

export async function POST(request: NextRequest) {
  const { email, password, name } = await request.json();

  const existing = get<{ id: number }>(
    "SELECT id FROM users WHERE email = ?",
    [email]
  );

  if (existing) {
    return NextResponse.json(
      { error: "Email already exists" },
      { status: 409 }
    );
  }

  const result = run(
    "INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, 'member')",
    [email, password, name]
  );

  const user: UserRow = {
    id: Number(result.lastInsertRowid),
    email,
    name,
    role: "member",
  };

  const token = await signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const response = NextResponse.json({
    success: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });

  setAuthCookie(response, token);

  return response;
}
