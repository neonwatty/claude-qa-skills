import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  "eval-reference-app-secret-key-do-not-use-in-production"
);

const COOKIE_NAME = "auth_token";

interface TokenPayload {
  userId: number;
  email: string;
  role: string;
}

async function verifyTokenInProxy(
  token: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      userId: payload.userId as number,
      email: payload.email as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

/** Paths that require admin role */
function isAdminPath(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return true;
  if (pathname === "/invite") return true;

  // Match /projects/[id]/edit and /projects/[id]/settings
  const projectEditOrSettings = /^\/projects\/[^/]+\/(edit|settings)$/;
  if (projectEditOrSettings.test(pathname)) return true;

  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read the auth cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // If no token, redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Verify the token
  const user = await verifyTokenInProxy(token);

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only path check
  if (isAdminPath(pathname) && user.role !== "admin") {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Pass user info via request headers so pages can read them without re-verifying
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", String(user.userId));
  requestHeaders.set("x-user-email", user.email);
  requestHeaders.set("x-user-role", user.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next (Next.js internals)
     * - favicon.ico
     * - /api/auth/login
     * - /api/auth/register
     * - /login
     * - /register
     */
    "/((?!_next|favicon\\.ico|api/auth/login|api/auth/register|login|register).*)",
  ],
};
