import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "./auth";
import { get } from "./db";

interface FullUser {
  userId: number;
  email: string;
  role: string;
  name: string;
}

const COOKIE_NAME = "auth_token";

export async function getCurrentUser(): Promise<FullUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  // Query the database for the full user record
  const dbUser = get<{
    id: number;
    email: string;
    name: string;
    role: string;
  }>("SELECT id, email, name, role FROM users WHERE id = ?", [payload.userId]);

  if (!dbUser) return null;

  return {
    userId: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
    name: dbUser.name,
  };
}

export async function requireAuth(): Promise<FullUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin(): Promise<FullUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "admin") {
    redirect("/dashboard");
  }
  return user;
}
