import { beforeEach, describe, it, expect } from "vitest";
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";
import { makeSiteConfig } from "./helpers.mjs";
import {
  resolveTier,
  saveSiteTier,
  loadSites,
} from "../skills/auth-browse/scripts/sign-in.mjs";

describe("resolveTier (UT-13)", () => {
  it("returns 'chromium' when no tier specified anywhere", () => {
    expect(
      resolveTier({ cliTier: undefined, siteConfig: makeSiteConfig() }),
    ).toBe("chromium");
  });

  it("returns site config tier when no CLI flag", () => {
    expect(
      resolveTier({
        cliTier: undefined,
        siteConfig: makeSiteConfig({ tier: "chrome" }),
      }),
    ).toBe("chrome");
  });

  it("CLI flag overrides site config tier", () => {
    expect(
      resolveTier({
        cliTier: "chromium",
        siteConfig: makeSiteConfig({ tier: "chrome" }),
      }),
    ).toBe("chromium");
  });

  it("CLI flag overrides default when site has no tier", () => {
    expect(
      resolveTier({ cliTier: "chrome", siteConfig: makeSiteConfig() }),
    ).toBe("chrome");
  });

  it("rejects invalid tier values", () => {
    expect(() =>
      resolveTier({ cliTier: "firefox", siteConfig: makeSiteConfig() }),
    ).toThrow(/Invalid tier/);
  });

  it("ignores invalid tier in site config, falls back to default", () => {
    expect(
      resolveTier({
        cliTier: undefined,
        siteConfig: makeSiteConfig({ tier: "firefox" }),
      }),
    ).toBe("chromium");
  });
});

const SITES_DIR = process.env.PLAYWRIGHT_CLI_HOME;
const SITES_FILE = join(SITES_DIR, "sites.json");

beforeEach(() => {
  mkdirSync(SITES_DIR, { recursive: true });
  if (existsSync(SITES_FILE)) {
    unlinkSync(SITES_FILE);
  }
});

describe("loadSites merge behavior", () => {
  it("merges partial custom entry with built-in site, preserving url and waitFor", () => {
    // Write only a tier override for a built-in site (no url/waitFor)
    const custom = { supabase: { tier: "chrome" } };
    writeFileSync(SITES_FILE, JSON.stringify(custom, null, 2) + "\n");

    const sites = loadSites();
    expect(sites.supabase.tier).toBe("chrome");
    expect(sites.supabase.url).toBeDefined();
    expect(sites.supabase.waitFor).toBeDefined();
  });

  it("lets a custom entry override a built-in site url", () => {
    const custom = { github: { url: "https://github.enterprise.com" } };
    writeFileSync(SITES_FILE, JSON.stringify(custom, null, 2) + "\n");

    const sites = loadSites();
    expect(sites.github.url).toBe("https://github.enterprise.com");
    expect(sites.github.waitFor).toBeDefined();
  });

  it("returns a custom-only site with no built-in counterpart", () => {
    const custom = {
      "my-app": { url: "https://my-app.com", waitFor: "/home" },
    };
    writeFileSync(SITES_FILE, JSON.stringify(custom, null, 2) + "\n");

    const sites = loadSites();
    expect(sites["my-app"].url).toBe("https://my-app.com");
    expect(sites["my-app"].waitFor).toBe("/home");
  });
});

describe("saveSiteTier (UT-14)", () => {
  it("writes tier to sites.json for an existing custom site", () => {
    const testSites = {
      "test-tier-site": { url: "https://example.com", waitFor: "/dash" },
    };
    writeFileSync(SITES_FILE, JSON.stringify(testSites, null, 2) + "\n");

    saveSiteTier("test-tier-site", "chrome");

    // Verify raw JSON preserves existing fields (not masked by loadSites merge)
    const raw = JSON.parse(readFileSync(SITES_FILE, "utf-8"));
    expect(raw["test-tier-site"].tier).toBe("chrome");
    expect(raw["test-tier-site"].url).toBe("https://example.com");
    expect(raw["test-tier-site"].waitFor).toBe("/dash");

    // Also verify via loadSites for the full roundtrip
    const sites = loadSites();
    expect(sites["test-tier-site"].tier).toBe("chrome");
  });

  it("creates entry in sites.json for a built-in site", () => {
    writeFileSync(SITES_FILE, "{}\n");

    saveSiteTier("__test-builtin", "chrome");

    const raw = JSON.parse(readFileSync(SITES_FILE, "utf-8"));
    expect(raw["__test-builtin"]).toEqual({ tier: "chrome" });
  });

  it("refuses to overwrite corrupted sites.json", () => {
    const original = {
      "my-app": { url: "https://my-app.com", waitFor: "/home" },
    };
    writeFileSync(SITES_FILE, JSON.stringify(original, null, 2) + "\n");

    // Corrupt the file
    writeFileSync(SITES_FILE, "{ invalid json }}}");

    saveSiteTier("my-app", "chrome");

    // File should still be corrupted — saveSiteTier must not overwrite
    const raw = readFileSync(SITES_FILE, "utf-8");
    expect(raw).toBe("{ invalid json }}}");
  });
});
