import { describe, it, expect } from "vitest";
import {
  profileDir,
  authFile,
  loadSites,
  validateName,
} from "../skills/auth-browse/scripts/sign-in.mjs";
import { join } from "path";

const BASE = process.env.PLAYWRIGHT_CLI_HOME;

describe("profileDir (UT-06)", () => {
  it("returns default profile for undefined", () => {
    expect(profileDir(undefined)).toBe(join(BASE, "chrome-profile"));
  });

  it('returns default profile for "default"', () => {
    expect(profileDir("default")).toBe(join(BASE, "chrome-profile"));
  });

  it("returns named profile directory", () => {
    expect(profileDir("seatify-admin")).toBe(
      join(BASE, "chrome-profile-seatify-admin"),
    );
  });

  it("rejects path traversal attempts", () => {
    expect(() => profileDir("../../etc/passwd")).toThrow(/Invalid/);
  });
});

describe("authFile (UT-07)", () => {
  it("returns correct path for site name", () => {
    expect(authFile("cloudflare")).toBe(join(BASE, "auth-cloudflare.json"));
  });

  it("sanitizes special characters", () => {
    const path = authFile("my.weird site");
    expect(path).not.toContain(" ");
    expect(path).toContain("auth-my-weird-site.json");
  });
});

describe("validateName", () => {
  it("accepts valid names", () => {
    expect(() => validateName("my-site_2", "test")).not.toThrow();
  });

  it("rejects empty string", () => {
    expect(() => validateName("", "test")).toThrow(/Invalid/);
  });

  it("rejects names with dots", () => {
    expect(() => validateName("my.site", "test")).toThrow(/Invalid/);
  });

  it("rejects names with slashes", () => {
    expect(() => validateName("../../etc", "test")).toThrow(/Invalid/);
  });

  it("rejects names with spaces", () => {
    expect(() => validateName("my site", "test")).toThrow(/Invalid/);
  });
});

describe("loadSites (UT-08, UT-09)", () => {
  it("returns all 10 default sites", () => {
    const sites = loadSites();
    expect(Object.keys(sites).length).toBeGreaterThanOrEqual(10);
    expect(sites.github).toBeDefined();
    expect(sites.cloudflare).toBeDefined();
    expect(sites.vercel).toBeDefined();
  });

  it("each default site has url and waitFor", () => {
    const sites = loadSites();
    for (const [name, config] of Object.entries(sites)) {
      expect(config.url, `${name} missing url`).toBeDefined();
      expect(config.waitFor, `${name} missing waitFor`).toBeDefined();
    }
  });
});
