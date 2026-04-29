import { Buffer } from "buffer";

/**
 * Decode a Supabase `base64-<session JSON>` cookie value.
 * Returns the parsed session object if it contains a numeric `expires_at` field;
 * may also include `access_token` and `refresh_token` (not validated).
 * Returns null if the value is not a Supabase cookie or lacks `expires_at`.
 */
export function decodeSupabaseCookie(value) {
  if (typeof value !== "string" || !value.startsWith("base64-")) return null;
  try {
    const json = Buffer.from(value.slice(7), "base64").toString("utf-8");
    const session = JSON.parse(json);
    if (typeof session.expires_at !== "number") return null;
    return session;
  } catch {
    return null;
  }
}

/**
 * Decode a JWT and return the `exp` claim (Unix timestamp).
 * Returns null if the value is not a JWT or has no exp claim.
 */
export function decodeJwtExp(value) {
  if (typeof value !== "string") return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  if (!parts.every((p) => /^[A-Za-z0-9_-]+$/.test(p))) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8"),
    );
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

/** Auth-relevant cookie name pattern. */
const AUTH_PATTERN = /auth|session|token|sid|jwt|identity|logged/i;

/** Returns true if the cookie name matches auth-relevant patterns. */
export function isAuthCookie(name) {
  return AUTH_PATTERN.test(name);
}

/** Cookie names that rotate too frequently to be meaningful for expiry checks. */
export const EPHEMERAL = new Set([
  "__cf_bm",
  "__stripe_sid",
  "__stripe_mid",
  "_cfuvid",
  "cf_clearance",
  "__cflb",
]);

/**
 * Classify cookies into categories.
 * Returns { valid, expired, session_only, jwt_expired, supabase_expired, ephemeral, total }.
 */
export function classifyCookies(cookies) {
  const now = Date.now() / 1000;
  const result = {
    valid: 0,
    expired: 0,
    session_only: 0,
    jwt_expired: 0,
    supabase_expired: 0,
    ephemeral: 0,
    total: cookies.length,
  };

  for (const c of cookies) {
    if (EPHEMERAL.has(c.name)) {
      result.ephemeral++;
      continue;
    }
    if (c.expires <= 0) {
      result.session_only++;
      continue;
    }
    if (c.expires < now) {
      result.expired++;
      continue;
    }

    const supabase = decodeSupabaseCookie(c.value);
    if (supabase) {
      if (supabase.expires_at < now) {
        result.supabase_expired++;
        continue;
      }
      if (supabase.access_token) {
        const tokenExp = decodeJwtExp(supabase.access_token);
        if (tokenExp !== null && tokenExp < now) {
          result.supabase_expired++;
          continue;
        }
      }
      result.valid++;
      continue;
    }

    const jwtExp = decodeJwtExp(c.value);
    if (jwtExp !== null && jwtExp < now) {
      result.jwt_expired++;
      continue;
    }

    result.valid++;
  }

  return result;
}

/**
 * Analyze the health of an array of cookies (e.g., from a storageState file).
 * Returns { status, classification, soonestAuthExpiry, jwtIssues, warnings }.
 *
 * status: 'healthy' | 'expired' | 'degraded' | 'empty'
 */
export function analyzeCookieHealth(cookies) {
  if (!cookies || cookies.length === 0) {
    return {
      status: "empty",
      classification: classifyCookies([]),
      soonestAuthExpiry: null,
      jwtIssues: [],
      warnings: ["No cookies saved"],
    };
  }

  const classification = classifyCookies(cookies);
  const now = Date.now() / 1000;
  const jwtIssues = [];
  const warnings = [];

  const authCookies = cookies.filter(
    (c) => isAuthCookie(c.name) && !EPHEMERAL.has(c.name),
  );

  if (authCookies.length === 0) {
    warnings.push("No auth-relevant cookies found — session may not restore");
  }

  let soonestAuthExpiry = null;
  for (const c of authCookies) {
    const supabase = decodeSupabaseCookie(c.value);
    let realExp;
    if (supabase) {
      if (supabase.expires_at < now) {
        const shellMsg =
          c.expires > 0
            ? `cookie shell says ${formatDelta(c.expires - now)} remaining`
            : "session-only cookie (no browser expiry)";
        jwtIssues.push(
          `Supabase session "${c.name}" expired ${formatDelta(now - supabase.expires_at)} ago (${shellMsg})`,
        );
      } else if (supabase.access_token) {
        const tokenExp = decodeJwtExp(supabase.access_token);
        if (tokenExp !== null && tokenExp < now) {
          jwtIssues.push(
            `Supabase access token in "${c.name}" expired ${formatDelta(now - tokenExp)} ago (session.expires_at says ${formatDelta(supabase.expires_at - now)} remaining)`,
          );
        }
      }
      realExp = supabase.expires_at;
    } else {
      const jwtExp = decodeJwtExp(c.value);
      if (jwtExp !== null && jwtExp < now) {
        const shellMsg =
          c.expires > 0
            ? `cookie shell says ${formatDelta(c.expires - now)} remaining`
            : "session-only cookie (no browser expiry)";
        jwtIssues.push(
          `JWT "${c.name}" expired ${formatDelta(now - jwtExp)} ago (${shellMsg})`,
        );
      }
      realExp = jwtExp ?? (c.expires > 0 ? c.expires : null);
    }
    if (
      realExp !== null &&
      (soonestAuthExpiry === null || realExp < soonestAuthExpiry.expires)
    ) {
      soonestAuthExpiry = {
        name: c.name,
        expires: realExp,
        remaining: realExp - now,
      };
    }
  }

  if (classification.session_only > 0) {
    const pct = Math.round(
      (classification.session_only / classification.total) * 100,
    );
    if (pct > 30) {
      warnings.push(
        `${classification.session_only} session-only cookies (${pct}%) will not survive state-load — use persistent profile instead`,
      );
    }
  }

  let status;
  if (
    jwtIssues.length > 0 ||
    (soonestAuthExpiry && soonestAuthExpiry.remaining < 0)
  ) {
    status = "expired";
  } else if (warnings.length > 0) {
    status = "degraded";
  } else {
    status = "healthy";
  }

  return { status, classification, soonestAuthExpiry, jwtIssues, warnings };
}

/** Format a duration in seconds to a human-readable string (e.g., "3h", "45m"). */
export function formatDelta(seconds) {
  const abs = Math.abs(seconds);
  if (abs < 60) return `${Math.round(abs)}s`;
  if (abs < 3600) return `${Math.round(abs / 60)}m`;
  if (abs < 86400) return `${Math.round(abs / 3600)}h`;
  return `${Math.round(abs / 86400)}d`;
}

/** Google OAuth domains kept for non-localhost targets to support Google sign-in flows. */
const OAUTH_DOMAINS = ["accounts.google.com", "google.com"];

/**
 * Filter cookies to only those relevant to the target URL.
 * Keeps cookies matching the target's domain (including parent domains)
 * and Google OAuth domains (for non-localhost targets).
 */
export function filterCookiesByDomain(cookies, targetUrl) {
  let targetHost;
  try {
    targetHost = new URL(targetUrl).hostname;
  } catch {
    return cookies;
  }

  const isLocalhost = targetHost === "localhost" || targetHost === "127.0.0.1";

  return cookies.filter((c) => {
    const cd = c.domain.replace(/^\./, "");
    if (targetHost === cd || targetHost.endsWith("." + cd)) return true;
    if (
      !isLocalhost &&
      OAUTH_DOMAINS.some((d) => cd === d || cd.endsWith("." + d))
    )
      return true;
    return false;
  });
}
