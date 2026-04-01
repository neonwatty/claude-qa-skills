import { NextRequest, NextResponse } from "next/server";
import { get } from "@/lib/db";
import { signToken, setAuthCookie } from "@/lib/auth";

interface UserRow {
  id: number;
  email: string;
  password: string;
  name: string;
  role: string;
}

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  const user = get<UserRow>(
    "SELECT id, email, password, name, role FROM users WHERE email = ?",
    [email]
  );

  if (!user || user.password !== password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

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
