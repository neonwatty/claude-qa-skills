import { Buffer } from "buffer";
import { describe, it, expect } from "vitest";
import { makeSupabaseCookieValue, makeJwt, makeCookie } from "./helpers.mjs";
import {
  decodeSupabaseCookie,
  decodeJwtExp,
  isAuthCookie,
  classifyCookies,
  EPHEMERAL,
  filterCookiesByDomain,
  analyzeCookieHealth,
  formatDelta,
} from "../skills/auth-browse/scripts/cookie-analysis.mjs";

describe("decodeSupabaseCookie (UT-01)", () => {
  it("decodes a valid base64- prefixed Supabase cookie", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const value = makeSupabaseCookieValue(futureExp);
    const session = decodeSupabaseCookie(value);
    expect(session).not.toBeNull();
    expect(session.access_token).toBeDefined();
    expect(session.refresh_token).toBe("fake-refresh-token-xyz");
    expect(session.expires_at).toBe(futureExp);
  });

  it("returns null for non-base64- values", () => {
    expect(decodeSupabaseCookie("some-random-value")).toBeNull();
    expect(decodeSupabaseCookie("")).toBeNull();
    expect(decodeSupabaseCookie("base64")).toBeNull();
  });

  it("returns null for corrupted base64 payload", () => {
    expect(decodeSupabaseCookie("base64-!!!notbase64!!!")).toBeNull();
  });
});

describe("decodeJwtExp (UT-02)", () => {
  it("extracts exp from a valid JWT", () => {
    const exp = 1713470579;
    const jwt = makeJwt({ sub: "user", exp, iat: exp - 3600 });
    expect(decodeJwtExp(jwt)).toBe(exp);
  });

  it("returns null for non-JWT strings", () => {
    expect(decodeJwtExp("not-a-jwt")).toBeNull();
    expect(decodeJwtExp("")).toBeNull();
    expect(decodeJwtExp("a.b")).toBeNull();
    expect(decodeJwtExp("a.b.c.d")).toBeNull();
  });

  it("returns null for JWT without exp claim", () => {
    const jwt = makeJwt({ sub: "user", iat: 1713470000 });
    expect(decodeJwtExp(jwt)).toBeNull();
  });

  it("returns null for corrupted base64url segments", () => {
    expect(decodeJwtExp("!!!.@@@.###")).toBeNull();
  });
});

describe("isAuthCookie (UT-04)", () => {
  it("matches auth-relevant cookie names", () => {
    const positives = [
      "sb-xxx-auth-token",
      "user_session",
      "__cf_logged_in",
      "JSESSIONID",
      "jwt-access",
      "auth_token",
      "session_id",
      "identity-v2",
      "logged_in",
    ];
    for (const name of positives) {
      expect(isAuthCookie(name), `expected "${name}" to match`).toBe(true);
    }
  });

  it("does not match analytics/tracking cookies", () => {
    const negatives = [
      "_ga",
      "ph_phc_xxx_posthog",
      "__cf_bm",
      "_fbp",
      "_gid",
      "mp_mixpanel",
      "intercom-id",
      "hubspotutk",
    ];
    for (const name of negatives) {
      expect(isAuthCookie(name), `expected "${name}" not to match`).toBe(false);
    }
  });
});

describe("classifyCookies (UT-03)", () => {
  it("classifies valid cookies", () => {
    const cookies = [makeCookie({ expires: Date.now() / 1000 + 86400 })];
    const result = classifyCookies(cookies);
    expect(result.valid).toBe(1);
    expect(result.total).toBe(1);
  });

  it("classifies browser-expired cookies", () => {
    const cookies = [makeCookie({ expires: 1577836800 })]; // 2020-01-01
    const result = classifyCookies(cookies);
    expect(result.expired).toBe(1);
  });

  it("classifies session-only cookies", () => {
    const cookies = [makeCookie({ expires: -1 })];
    const result = classifyCookies(cookies);
    expect(result.session_only).toBe(1);
  });

  it("classifies ephemeral cookies", () => {
    const cookies = [makeCookie({ name: "__cf_bm", expires: 1577836800 })];
    const result = classifyCookies(cookies);
    expect(result.ephemeral).toBe(1);
    expect(result.expired).toBe(0);
  });

  it("classifies cookies with expired JWT value", () => {
    const expiredJwt = makeJwt({ sub: "u", exp: 1577836800, iat: 1577750400 });
    const cookies = [
      makeCookie({
        name: "my-jwt",
        value: expiredJwt,
        expires: Date.now() / 1000 + 86400,
      }),
    ];
    const result = classifyCookies(cookies);
    expect(result.jwt_expired).toBe(1);
    expect(result.valid).toBe(0);
  });

  it("classifies cookies with expired Supabase session", () => {
    const pastExp = Math.floor(Date.now() / 1000) - 7200;
    const cookies = [
      makeCookie({
        name: "sb-test-auth-token",
        value: makeSupabaseCookieValue(pastExp),
        expires: Date.now() / 1000 + 86400,
      }),
    ];
    const result = classifyCookies(cookies);
    expect(result.supabase_expired).toBe(1);
    expect(result.valid).toBe(0);
  });

  it("sum of categories equals total", () => {
    const now = Date.now() / 1000;
    const cookies = [
      makeCookie({ expires: now + 86400 }),
      makeCookie({ expires: 1577836800 }),
      makeCookie({ expires: -1 }),
      makeCookie({ name: "__cf_bm" }),
      makeCookie({
        value: makeJwt({ sub: "u", exp: 1577836800, iat: 1577750400 }),
        expires: now + 86400,
      }),
      makeCookie({
        name: "sb-test-auth-token",
        value: makeSupabaseCookieValue(Math.floor(now) - 3600),
        expires: now + 86400,
      }),
    ];
    const result = classifyCookies(cookies);
    const sum =
      result.valid +
      result.expired +
      result.session_only +
      result.ephemeral +
      result.jwt_expired +
      result.supabase_expired;
    expect(sum).toBe(result.total);
    expect(result.total).toBe(6);
  });
});

describe("EPHEMERAL set (UT-05)", () => {
  it("contains known ephemeral cookie names", () => {
    expect(EPHEMERAL.has("__cf_bm")).toBe(true);
    expect(EPHEMERAL.has("__stripe_sid")).toBe(true);
    expect(EPHEMERAL.has("cf_clearance")).toBe(true);
  });

  it("does not contain auth cookies", () => {
    expect(EPHEMERAL.has("sb-xxx-auth-token")).toBe(false);
    expect(EPHEMERAL.has("session")).toBe(false);
  });

  it("classifyCookies skips ephemeral when classifying", () => {
    const cookies = [
      makeCookie({ name: "__cf_bm", expires: 1577836800 }),
      makeCookie({ name: "auth", expires: Date.now() / 1000 + 86400 }),
    ];
    const result = classifyCookies(cookies);
    expect(result.ephemeral).toBe(1);
    expect(result.valid).toBe(1);
    expect(result.expired).toBe(0);
  });
});

describe("filterCookiesByDomain (UT-11)", () => {
  it("keeps only localhost cookies for localhost target", () => {
    const cookies = [
      makeCookie({ domain: "localhost" }),
      makeCookie({ domain: ".github.com" }),
      makeCookie({ domain: ".google.com" }),
      makeCookie({ domain: ".stripe.com" }),
    ];
    const filtered = filterCookiesByDomain(cookies, "http://localhost:3000");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].domain).toBe("localhost");
  });

  it("keeps parent domain cookies for subdomain targets", () => {
    const cookies = [
      makeCookie({ domain: ".cloudflare.com" }),
      makeCookie({ domain: "dash.cloudflare.com" }),
      makeCookie({ domain: ".github.com" }),
    ];
    const filtered = filterCookiesByDomain(
      cookies,
      "https://dash.cloudflare.com",
    );
    expect(filtered).toHaveLength(2);
    expect(filtered.every((c) => c.domain.includes("cloudflare"))).toBe(true);
  });

  it("keeps OAuth provider cookies for non-localhost targets", () => {
    const cookies = [
      makeCookie({ domain: ".cloudflare.com" }),
      makeCookie({ domain: "accounts.google.com" }),
      makeCookie({ domain: ".stripe.com" }),
    ];
    const filtered = filterCookiesByDomain(
      cookies,
      "https://dash.cloudflare.com",
    );
    expect(filtered).toHaveLength(2);
    expect(filtered.some((c) => c.domain === "accounts.google.com")).toBe(true);
  });

  it("does not keep OAuth cookies for localhost targets", () => {
    const cookies = [
      makeCookie({ domain: "localhost" }),
      makeCookie({ domain: "accounts.google.com" }),
    ];
    const filtered = filterCookiesByDomain(cookies, "http://localhost:3000");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].domain).toBe("localhost");
  });

  it("returns all cookies for invalid URLs", () => {
    const cookies = [makeCookie(), makeCookie()];
    const filtered = filterCookiesByDomain(cookies, "not-a-url");
    expect(filtered).toHaveLength(2);
  });
});

describe("analyzeCookieHealth (UT-10)", () => {
  it("reports healthy for all-valid cookies", () => {
    const cookies = [
      makeCookie({ name: "auth-token", expires: Date.now() / 1000 + 86400 }),
      makeCookie({ name: "_ga", expires: Date.now() / 1000 + 86400 }),
    ];
    const health = analyzeCookieHealth(cookies);
    expect(health.status).toBe("healthy");
    expect(health.classification.valid).toBe(2);
  });

  it("reports expired for all-expired auth cookies", () => {
    const cookies = [makeCookie({ name: "auth-token", expires: 1577836800 })];
    const health = analyzeCookieHealth(cookies);
    expect(health.status).toBe("expired");
    expect(health.soonestAuthExpiry.remaining).toBeLessThan(0);
  });

  it("reports expired when JWT inside cookie is expired (not cookie shell)", () => {
    const expiredJwt = makeJwt({ sub: "u", exp: 1577836800, iat: 1577750400 });
    const cookies = [
      makeCookie({
        name: "jwt-session",
        value: expiredJwt,
        expires: Date.now() / 1000 + 86400,
      }),
    ];
    const health = analyzeCookieHealth(cookies);
    expect(health.status).toBe("expired");
    expect(health.jwtIssues.length).toBeGreaterThan(0);
  });

  it("reports expired when Supabase session.expires_at is past", () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    const cookies = [
      makeCookie({
        name: "sb-test-auth-token",
        value: makeSupabaseCookieValue(pastExp),
        expires: Date.now() / 1000 + 86400,
      }),
    ];
    const health = analyzeCookieHealth(cookies);
    expect(health.status).toBe("expired");
    expect(health.jwtIssues.length).toBeGreaterThan(0);
    expect(health.jwtIssues[0]).toMatch(/supabase/i);
  });

  it("warns when >30% session-only cookies", () => {
    const cookies = [
      makeCookie({ expires: -1 }),
      makeCookie({ expires: -1 }),
      makeCookie({ expires: -1 }),
      makeCookie({ expires: Date.now() / 1000 + 86400 }),
    ];
    const health = analyzeCookieHealth(cookies);
    expect(health.warnings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/session-only.*state-load/i),
      ]),
    );
  });

  it("warns when zero auth cookies found", () => {
    const cookies = [makeCookie({ name: "_ga" }), makeCookie({ name: "_fbp" })];
    const health = analyzeCookieHealth(cookies);
    expect(health.warnings).toEqual(
      expect.arrayContaining([expect.stringMatching(/no auth/i)]),
    );
  });

  it("reports expired when Supabase expires_at is valid but inner JWT exp is past", () => {
    const now = Math.floor(Date.now() / 1000);
    // expires_at is in the future, but the access_token JWT exp is in the past
    const jwt = makeJwt({ sub: "user", exp: now - 600, iat: now - 4200 });
    const session = JSON.stringify({
      access_token: jwt,
      refresh_token: "fake-refresh",
      expires_at: now + 3600,
      token_type: "bearer",
    });
    const value = "base64-" + Buffer.from(session).toString("base64");
    const cookies = [
      makeCookie({
        name: "sb-test-auth-token",
        value,
        expires: Date.now() / 1000 + 86400,
      }),
    ];
    const health = analyzeCookieHealth(cookies);
    expect(health.status).toBe("expired");
    expect(health.jwtIssues.length).toBeGreaterThan(0);
    expect(health.jwtIssues[0]).toMatch(/access token/i);
  });

  it("reports degraded (not healthy) when warnings present but no jwt issues", () => {
    const cookies = [makeCookie({ name: "_ga" }), makeCookie({ name: "_fbp" })];
    const health = analyzeCookieHealth(cookies);
    expect(health.status).toBe("degraded");
  });

  it("selects the soonest-expiring auth cookie across multiple", () => {
    const now = Date.now() / 1000;
    const cookies = [
      makeCookie({
        name: "auth-later",
        expires: now + 86400,
      }),
      makeCookie({
        name: "auth-sooner",
        expires: now + 3600,
      }),
    ];
    const health = analyzeCookieHealth(cookies);
    expect(health.soonestAuthExpiry.name).toBe("auth-sooner");
  });

  it("returns empty status for null input", () => {
    const health = analyzeCookieHealth(null);
    expect(health.status).toBe("empty");
    expect(health.soonestAuthExpiry).toBeNull();
    expect(health.jwtIssues).toHaveLength(0);
    expect(health.warnings).toEqual(["No cookies saved"]);
  });

  it("returns empty status for empty array", () => {
    const health = analyzeCookieHealth([]);
    expect(health.status).toBe("empty");
    expect(health.classification.total).toBe(0);
  });
});

describe("formatDelta (UT-12)", () => {
  it("formats seconds", () => {
    expect(formatDelta(0)).toBe("0s");
    expect(formatDelta(30)).toBe("30s");
    expect(formatDelta(59)).toBe("59s");
  });

  it("formats minutes", () => {
    expect(formatDelta(60)).toBe("1m");
    expect(formatDelta(90)).toBe("2m");
    expect(formatDelta(3599)).toBe("60m");
  });

  it("formats hours", () => {
    expect(formatDelta(3600)).toBe("1h");
    expect(formatDelta(7200)).toBe("2h");
    expect(formatDelta(86399)).toBe("24h");
  });

  it("formats days", () => {
    expect(formatDelta(86400)).toBe("1d");
    expect(formatDelta(172800)).toBe("2d");
  });

  it("handles negative values via Math.abs", () => {
    expect(formatDelta(-7200)).toBe("2h");
    expect(formatDelta(-30)).toBe("30s");
  });
});
