import { Buffer } from "buffer";

/** Build a JWT with a known payload. Signature is fake — only the payload matters for testing. */
export function makeJwt(payload) {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.fake-signature`;
}

/** Build a Supabase-style `base64-<session JSON>` cookie value. */
export function makeSupabaseCookieValue(expiresAt, email = "test@example.com") {
  const jwt = makeJwt({
    sub: "user-123",
    email,
    role: "authenticated",
    exp: expiresAt,
    iat: expiresAt - 3600,
  });
  const session = JSON.stringify({
    access_token: jwt,
    refresh_token: "fake-refresh-token-xyz",
    expires_at: expiresAt,
    token_type: "bearer",
  });
  return "base64-" + Buffer.from(session).toString("base64");
}

/** Build a cookie object with sensible defaults. Override any field via `overrides`. */
export function makeCookie(overrides = {}) {
  return {
    name: "test-cookie",
    value: "test-value",
    domain: "localhost",
    path: "/",
    expires: Date.now() / 1000 + 86400,
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
    ...overrides,
  };
}

/** Build a minimal site config object. Override any field via `overrides`. */
export function makeSiteConfig(overrides = {}) {
  return {
    url: "https://example.com/login",
    waitFor: "/dashboard",
    ...overrides,
  };
}
