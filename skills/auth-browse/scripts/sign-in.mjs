#!/usr/bin/env node

/**
 * Persistent browser sign-in script for external services.
 *
 * Defaults to Playwright's bundled Chromium (works while Chrome is open).
 * Use --tier chrome for sites with bot detection (Google OAuth, Cloudflare).
 * Auth state accumulates in a browser profile at ~/.playwright-cli/.
 * Use --profile <name> for isolated profiles (multi-user/QA).
 *
 * Usage:
 *   node sign-in.mjs login <site|url> [--profile <name>] [--tier chromium|chrome]
 *   node sign-in.mjs check [site]        Check saved auth expiry
 *   node sign-in.mjs list                List preconfigured sites
 *   node sign-in.mjs add <name> <url> [waitFor]  Add a new site shortcut
 *   node sign-in.mjs help                Show help
 *
 * Requires: npm install playwright (in the same directory or globally)
 */

/**
 * @typedef {{ url: string, waitFor: string, tier?: string }} SiteConfig
 * `waitFor` is a URL substring that indicates successful sign-in.
 * It must NOT match the login URL itself — use a post-login path
 * (e.g., '/dashboard', '/organizations') to avoid false auto-detect.
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  realpathSync,
  readdirSync,
} from "fs";
import { join, basename } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import {
  analyzeCookieHealth,
  filterCookiesByDomain,
  formatDelta,
} from "./cookie-analysis.mjs";

// ── Config ──────────────────────────────────────────────────────────
const BASE_DIR =
  process.env.PLAYWRIGHT_CLI_HOME || join(homedir(), ".playwright-cli");
const PROFILE_DIR = join(BASE_DIR, "chrome-profile");
const SITES_FILE = join(BASE_DIR, "sites.json");

// Default Chrome path per platform
const CHROME_PATHS = {
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  linux: "/usr/bin/google-chrome",
  win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
};
if (!(process.platform in CHROME_PATHS)) {
  console.error(
    `Warning: unsupported platform "${process.platform}", defaulting to macOS Chrome path.`,
  );
}
const CHROME_PATH = CHROME_PATHS[process.platform] || CHROME_PATHS.darwin;

// ── Tier constants ───────────────────────────────────────────────────
const VALID_TIERS = new Set(["chromium", "chrome"]);
const DEFAULT_TIER = "chromium";

// ── Sites config ────────────────────────────────────────────────────

// Built-in site shortcuts. waitFor patterns must NOT match the login URL.
const DEFAULT_SITES = {
  github: { url: "https://github.com/login", waitFor: "github.com/dashboard" },
  cloudflare: {
    url: "https://dash.cloudflare.com/",
    waitFor: "dash.cloudflare.com/home",
  },
  vercel: { url: "https://vercel.com/login", waitFor: "vercel.com/~" },
  sentry: {
    url: "https://sentry.io/auth/login/",
    waitFor: "sentry.io/organizations",
  },
  posthog: { url: "https://us.posthog.com/", waitFor: "/project" },
  supabase: { url: "https://supabase.com/dashboard", waitFor: "/projects" },
  aws: { url: "https://console.aws.amazon.com/", waitFor: "console/home" },
  netlify: { url: "https://app.netlify.com/", waitFor: "/sites" },
  railway: { url: "https://railway.com/login", waitFor: "railway.com/project" },
  render: { url: "https://dashboard.render.com/", waitFor: "/services" },
};

function loadSites() {
  const sites = { ...DEFAULT_SITES };
  if (existsSync(SITES_FILE)) {
    try {
      const custom = JSON.parse(readFileSync(SITES_FILE, "utf-8"));
      for (const [name, cfg] of Object.entries(custom)) {
        sites[name] = { ...sites[name], ...cfg };
      }
    } catch (err) {
      console.error(
        `Warning: could not load ${SITES_FILE}, using defaults: ${err.message}`,
      );
    }
  }
  return sites;
}

function validateName(value, label) {
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new Error(
      `Invalid ${label} "${value}". Use only letters, numbers, hyphens, and underscores.`,
    );
  }
}

function saveSite(name, url, waitFor) {
  validateName(name, "site name");

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    console.error(`Invalid URL: "${url}"`);
    process.exit(1);
  }

  let custom = {};
  if (existsSync(SITES_FILE)) {
    try {
      custom = JSON.parse(readFileSync(SITES_FILE, "utf-8"));
    } catch (err) {
      console.error(
        `Warning: could not parse ${SITES_FILE}, starting fresh: ${err.message}`,
      );
      custom = {};
    }
  }
  custom[name] = { url, waitFor: waitFor || parsed.hostname };
  mkdirSync(BASE_DIR, { recursive: true });
  try {
    writeFileSync(SITES_FILE, JSON.stringify(custom, null, 2) + "\n");
  } catch (err) {
    console.error(`Failed to write ${SITES_FILE}: ${err.message}`);
    process.exit(1);
  }
}

function authFile(site) {
  const safe = site.replace(/[^a-zA-Z0-9_-]/g, "-");
  return join(BASE_DIR, `auth-${safe}.json`);
}

// ── Profile management ──────────────────────────────────────────────

function profileDir(profileName) {
  if (!profileName || profileName === "default") return PROFILE_DIR;
  validateName(profileName, "profile name");
  return join(BASE_DIR, `chrome-profile-${profileName}`);
}

// ── Shared browser launch ───────────────────────────────────────────

function checkChromeRunning() {
  if (process.platform !== "darwin" && process.platform !== "linux") return;
  try {
    const result = execFileSync("pgrep", ["-f", "Google Chrome"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const pids = result.trim().split("\n").filter(Boolean);
    if (pids.length > 0) {
      console.error(
        "\n⛔ Chrome is already running (PIDs: " + pids.join(", ") + ").",
      );
      console.error(
        "   Launching a second Chrome instance can corrupt your browser's session state",
      );
      console.error("   (including Google sign-in across all tabs).");
      console.error(
        "\n   To fix: quit Chrome first, then re-run this command.",
      );
      console.error("   Or run: kill " + pids.join(" ") + "\n");
      process.exit(1);
    }
  } catch (err) {
    // pgrep exits 1 when no processes match — that's the happy path.
    if (err.status === 1) return;
    // Any other error (pgrep not installed, permissions, etc.) means
    // the check could not run. Warn so the user knows the safety net is off.
    console.error(
      `Warning: could not check for running Chrome (${err.code ?? err.message}). ` +
        `Proceeding — ensure Chrome is not already open to avoid profile corruption.`,
    );
  }
}

function checkProfileLock(dir) {
  const lockPath = join(dir, "SingletonLock");
  // Chrome creates SingletonLock as a dangling symlink (hostname-pid).
  // existsSync follows symlinks and returns false for dangling ones, so use lstatSync.
  let lockExists = false;
  try {
    lstatSync(lockPath);
    lockExists = true;
  } catch {
    // No lock file — safe to proceed
  }
  if (lockExists) {
    console.error(`\n⛔ Profile directory is locked: ${dir}`);
    console.error("   Another browser process is using this profile.");
    console.error(
      `   Run: rm "${lockPath}" (if no browser process is running)`,
    );
    process.exit(1);
  }
}

async function launchBrowser(profileName, tier = DEFAULT_TIER) {
  if (tier === "chrome") {
    checkChromeRunning();
  }
  const { chromium } = await import("playwright");
  const dir = profileDir(profileName);
  checkProfileLock(dir);
  mkdirSync(dir, { recursive: true });

  if (tier === "chrome") {
    if (!existsSync(CHROME_PATH)) {
      console.error(`Chrome not found at: ${CHROME_PATH}`);
      console.error(
        "Install Google Chrome or edit CHROME_PATHS in this script.",
      );
      process.exit(1);
    }
  }

  const launchOptions =
    tier === "chrome"
      ? {
          executablePath: CHROME_PATH,
          headless: false,
          ignoreDefaultArgs: ["--enable-automation"],
          args: ["--disable-blink-features=AutomationControlled"],
        }
      : {
          headless: false,
        };

  console.log(
    `  Using ${tier === "chrome" ? "real Chrome" : "Playwright Chromium"}`,
  );

  try {
    return await chromium.launchPersistentContext(dir, launchOptions);
  } catch (err) {
    const browser = tier === "chrome" ? "Chrome" : "Chromium";
    if (
      err.message.includes("existing browser session") ||
      err.message.includes("Target page, context or browser has been closed")
    ) {
      console.error(
        `${browser} is already running with profile "${profileName || "default"}".`,
      );
      console.error(`Close it or run: kill $(pgrep -f "${basename(dir)}")`);
    } else {
      console.error(`Failed to launch ${browser}: ${err.message}`);
    }
    process.exit(1);
  }
}

// ── Auto-detect sign-in completion ──────────────────────────────────

async function waitForSignIn(
  page,
  waitForPattern,
  startUrl,
  timeoutMs = 120_000,
) {
  let stdinHandler;

  const result = await Promise.race([
    // Auto-detect: poll URL for the waitFor pattern
    (async () => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        let url;
        try {
          url = page.url();
        } catch {
          return "closed";
        }
        // Only match after navigating away from the starting URL
        if (url !== startUrl && url.includes(waitForPattern)) {
          // Small delay to let cookies settle after redirect
          await new Promise((r) => setTimeout(r, 2000));
          return "auto";
        }
        await new Promise((r) => setTimeout(r, 500));
      }
      return "timeout";
    })(),
    // Manual: user presses Enter
    new Promise((resolve) => {
      stdinHandler = () => resolve("manual");
      process.stdin.on("data", stdinHandler);
    }),
  ]);

  // Clean up stdin listener from the losing branch
  if (stdinHandler) {
    process.stdin.removeListener("data", stdinHandler);
  }
  if (result !== "manual") {
    process.stdin.unref();
  }

  return result;
}

// ── Shared login logic ──────────────────────────────────────────────

async function performLogin({
  url,
  outFile,
  siteName,
  waitForPattern,
  profileName,
  tier,
}) {
  console.log(`\n🔐 Signing into: ${siteName} (${url})`);
  if (profileName && profileName !== "default") {
    console.log(
      `   ${tier === "chrome" ? "Chrome" : "Browser"} profile: chrome-profile-${profileName}`,
    );
  }
  console.log(`   Auth will be saved to: ${outFile}\n`);

  const context = await launchBrowser(profileName, tier);
  const profileHint = profileName
    ? `chrome-profile-${profileName}`
    : "chrome-profile";

  // Ensure cleanup on Ctrl+C
  const cleanup = async () => {
    console.log("\nInterrupted — closing browser...");
    try {
      await context.close();
    } catch (err) {
      console.error(`Warning: could not close browser cleanly: ${err.message}`);
      console.error(`You may need to run: kill $(pgrep -f "${profileHint}")`);
    }
    process.exit(130);
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Helper to clean up and exit on error
  const bail = async (code = 1) => {
    process.removeListener("SIGINT", cleanup);
    process.removeListener("SIGTERM", cleanup);
    await context.close().catch(() => {});
    process.exit(code);
  };

  const page = context.pages()[0] || (await context.newPage());

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
  } catch (err) {
    console.error(`Failed to navigate to ${url}: ${err.message}`);
    await bail();
  }

  const startUrl = page.url();

  if (waitForPattern) {
    console.log("Sign in using the browser window.");
    console.log("Auth state will save automatically when sign-in is detected.");
    console.log("Or press Enter manually to save at any time.\n");

    const result = await waitForSignIn(page, waitForPattern, startUrl);

    if (result === "closed") {
      console.log("Browser was closed. No auth state saved.");
      await bail();
    } else if (result === "timeout") {
      console.log(
        "⚠ Timed out waiting for sign-in. Saving current state anyway.",
      );
    } else if (result === "auto") {
      console.log("✓ Sign-in detected automatically.");
    } else {
      console.log("✓ Manual save triggered.");
    }
  } else {
    console.log("Sign in using the browser window.");
    console.log("Press Enter here to save auth state.\n");

    await new Promise((resolve) => {
      process.stdin.once("data", resolve);
    });
    console.log("✓ Manual save triggered.");
  }

  try {
    await context.storageState({ path: outFile });
  } catch (err) {
    console.error(`Failed to save auth state: ${err.message}`);
    await bail();
  }

  // Filter cookies to only the target domain (removes cross-contamination)
  let filteredState;
  try {
    const rawState = JSON.parse(readFileSync(outFile, "utf-8"));
    const originalCount = rawState.cookies.length;
    rawState.cookies = filterCookiesByDomain(rawState.cookies, url);
    if (rawState.cookies.length < originalCount) {
      console.log(
        `  Filtered cookies: ${originalCount} → ${rawState.cookies.length} (removed ${originalCount - rawState.cookies.length} unrelated domains)`,
      );
    }
    filteredState = rawState;
    try {
      writeFileSync(outFile, JSON.stringify(rawState, null, 2) + "\n");
    } catch (writeErr) {
      console.error(
        `Warning: could not save filtered cookies: ${writeErr.message}`,
      );
      console.error(
        "Auth was saved but may contain cookies from unrelated domains.",
      );
    }
  } catch (err) {
    console.error(`Warning: could not filter cookies: ${err.message}`);
    console.error(
      "Auth was saved but may contain cookies from unrelated domains.",
    );
  }

  console.log(`Auth state saved to ${outFile}`);

  try {
    const state = filteredState ?? JSON.parse(readFileSync(outFile, "utf-8"));
    printCookieSummary(state, siteName);
  } catch (err) {
    console.error(
      `Warning: could not read saved auth for summary: ${err.message} (auth was saved successfully).`,
    );
  }

  process.removeListener("SIGINT", cleanup);
  process.removeListener("SIGTERM", cleanup);
  await context.close().catch(() => {});
  process.exit(0);
}

// ── Commands ────────────────────────────────────────────────────────

async function login(siteName, profileName, cliTier) {
  const sites = loadSites();
  const site = sites[siteName];
  if (!site) {
    console.error(`Unknown site: ${siteName}`);
    console.error(`Available: ${Object.keys(sites).join(", ")}, or pass a URL`);
    process.exit(1);
  }

  const tier = resolveTier({ cliTier, siteConfig: site });

  // Persist tier preference when explicitly set via --tier
  if (cliTier) {
    saveSiteTier(siteName, tier);
  }

  await performLogin({
    url: site.url,
    outFile: authFile(siteName),
    siteName,
    waitForPattern: site.waitFor,
    profileName,
    tier,
  });
}

async function loginUrl(url, profileName, cliTier) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    console.error(`Invalid URL: "${url}"`);
    process.exit(1);
  }

  const hostname = parsed.hostname.replace(/\./g, "-");
  const sites = loadSites();
  const existingSiteConfig = sites[hostname] || {};
  const tier = resolveTier({ cliTier, siteConfig: existingSiteConfig });

  // Persist tier preference when explicitly set via --tier
  if (cliTier) {
    saveSiteTier(hostname, tier);
  }

  await performLogin({
    url,
    outFile: authFile(hostname),
    siteName: hostname,
    waitForPattern: null, // No auto-detect for arbitrary URLs
    profileName,
    tier,
  });
}

function check(siteName) {
  const sites = loadSites();
  if (siteName) {
    checkSite(siteName);
    return;
  }

  // Check known sites + discover auth files from URL-based logins
  const checked = new Set();
  let found = false;

  // Known sites first
  for (const site of Object.keys(sites)) {
    const file = authFile(site);
    if (existsSync(file)) {
      found = true;
      checked.add(basename(file));
      checkSite(site);
      console.log("");
    }
  }

  // Discover auth-*.json files not covered by known sites
  if (existsSync(BASE_DIR)) {
    for (const file of readdirSync(BASE_DIR)) {
      if (
        file.startsWith("auth-") &&
        file.endsWith(".json") &&
        !checked.has(file)
      ) {
        found = true;
        const name = file.replace(/^auth-/, "").replace(/\.json$/, "");
        checkSite(name);
        console.log("");
      }
    }
  }

  if (!found) {
    console.log("No saved auth states found.");
    console.log("Run: node sign-in.mjs login <site>");
    console.log(`Available: ${Object.keys(sites).join(", ")}`);
  }
}

function checkSite(siteName) {
  const file = authFile(siteName);

  if (!existsSync(file)) {
    console.log(`${siteName}: no saved auth (${file} not found)`);
    return;
  }

  try {
    const state = JSON.parse(readFileSync(file, "utf-8"));
    printCookieSummary(state, siteName);
  } catch (err) {
    console.log(`  ${siteName}: corrupted auth file (${err.message})`);
  }
}

function printCookieSummary(state, siteName) {
  const cookies = state.cookies || [];
  const health = analyzeCookieHealth(cookies);

  if (health.status === "empty") {
    console.log(`  ${siteName}: no cookies saved`);
    return;
  }

  const c = health.classification;
  console.log(
    `  ${siteName}: ${c.total} cookies (${c.valid} valid, ${c.expired} expired, ${c.session_only} session-only, ${c.ephemeral} ephemeral)`,
  );

  for (const issue of health.jwtIssues) {
    console.log(`  ⚠ ${issue}`);
  }

  if (health.soonestAuthExpiry) {
    const r = health.soonestAuthExpiry.remaining;
    if (r <= 0) {
      console.log(
        `  ⚠ Auth "${health.soonestAuthExpiry.name}" EXPIRED ${formatDelta(-r)} ago`,
      );
      console.log(`    Re-run: node sign-in.mjs login ${siteName}`);
    } else if (r < 3600) {
      console.log(
        `  ⚠ Auth "${health.soonestAuthExpiry.name}" expires in ${formatDelta(r)}`,
      );
    } else {
      console.log(
        `  ✓ Auth "${health.soonestAuthExpiry.name}" valid for ${formatDelta(r)}`,
      );
    }
  }

  for (const w of health.warnings) {
    console.log(`  ℹ ${w}`);
  }

  if (health.status === "expired") {
    console.log(`  ❌ Status: EXPIRED — re-authenticate before use`);
    console.log(
      `  Tip: if sign-in was blocked by bot detection, retry with: node sign-in.mjs login ${siteName} --tier chrome`,
    );
  } else if (health.status === "degraded") {
    console.log(`  ⚠ Status: DEGRADED — see warnings above`);
  } else {
    console.log(`  ✓ Status: HEALTHY`);
  }
}

function printHelp() {
  const sites = loadSites();
  console.log(`
Persistent browser sign-in for external services.

Defaults to Playwright's bundled Chromium (works while Chrome is open).
Use --tier chrome for sites with bot detection (Google OAuth, Cloudflare).
Auth state accumulates in a browser profile at ~/.playwright-cli/.
Set PLAYWRIGHT_CLI_HOME to use a different auth directory.

Usage: node sign-in.mjs <command> [args]

Commands:
  login <site> [--profile <name>] [--tier chromium|chrome]   Sign in and save auth state
  login <url>  [--profile <name>] [--tier chromium|chrome]   Sign into an arbitrary URL
  check [site]                       Check expiry status of saved auth states
  list                               List available site shortcuts
  add <name> <url> [waitFor]         Add a custom site shortcut
  help                               Show this help

Options:
  --profile <name>    Use an isolated Chrome profile (chrome-profile-<name>).
                      Useful for multiple accounts on the same domain
                      (e.g., admin vs planner on the same app).
                      Without this flag, uses the shared default profile.

  --tier <value>      Browser to use for sign-in:
                      "chromium" (default) — Playwright's bundled Chromium.
                        Works while your Chrome is open. Best for most sites.
                      "chrome" — real Google Chrome with bot-detection bypass.
                        Often needed for Cloudflare, Google OAuth, AWS. Chrome must
                        be closed first. Preference is saved per-site.

Sites: ${Object.keys(sites).join(", ")}

Examples:
  node sign-in.mjs login cloudflare
  node sign-in.mjs login https://console.aws.amazon.com
  node sign-in.mjs check
  node sign-in.mjs add myapp https://myapp.com/login myapp.com/dashboard

  # Multi-user / QA profiles
  node sign-in.mjs login seatify-admin --profile seatify-admin
  node sign-in.mjs login seatify-planner --profile seatify-planner

  # Bot-protected site (saves preference for future logins)
  node sign-in.mjs login cloudflare --tier chrome

After signing in, browse authenticated with playwright-cli:
  playwright-cli open <url> --headed --browser chrome \\
    --persistent --profile ~/.playwright-cli/chrome-profile

  # With an isolated profile:
  playwright-cli open <url> --headed --browser chrome \\
    --persistent --profile ~/.playwright-cli/chrome-profile-seatify-admin

Profile & auth files: ~/.playwright-cli/
`);
}

// ── Tier resolution ─────────────────────────────────────────────────

function resolveTier({ cliTier, siteConfig }) {
  if (cliTier !== undefined) {
    if (!VALID_TIERS.has(cliTier)) {
      throw new Error(
        `Invalid tier "${cliTier}". Must be "chromium" or "chrome".`,
      );
    }
    return cliTier;
  }
  if (siteConfig.tier) {
    if (VALID_TIERS.has(siteConfig.tier)) {
      return siteConfig.tier;
    }
    console.error(
      `Warning: invalid tier "${siteConfig.tier}" in site config, falling back to "${DEFAULT_TIER}".`,
    );
  }
  return DEFAULT_TIER;
}

function saveSiteTier(name, tier) {
  let custom = {};
  if (existsSync(SITES_FILE)) {
    try {
      custom = JSON.parse(readFileSync(SITES_FILE, "utf-8"));
    } catch (err) {
      console.error(`\n⚠ ${SITES_FILE} contains invalid JSON: ${err.message}`);
      console.error(
        `  Refusing to overwrite — fix the file manually or delete it to start fresh.`,
      );
      console.error(`  Your --tier preference was NOT saved.`);
      return;
    }
  }
  if (!custom[name]) {
    custom[name] = {};
  }
  custom[name].tier = tier;
  try {
    mkdirSync(BASE_DIR, { recursive: true });
    writeFileSync(SITES_FILE, JSON.stringify(custom, null, 2) + "\n");
  } catch (err) {
    console.error(
      `\n⚠ Failed to save tier preference to ${SITES_FILE}: ${err.message}`,
    );
    console.error(
      `  Your --tier ${tier} choice will NOT be remembered for future logins.`,
    );
  }
}

// ── Exports (for testing) ──────────────────────────────────────────
export {
  profileDir,
  authFile,
  loadSites,
  validateName,
  formatDelta,
  resolveTier,
  saveSiteTier,
};

// ── CLI entrypoint ─────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);

function isCliEntrypoint() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(__filename);
  } catch {
    return process.argv[1] === __filename;
  }
}

if (isCliEntrypoint()) {
  const rawArgs = process.argv.slice(2);

  // Extract --profile <name> and --tier <chrome|chromium> from anywhere in the args
  let cliProfile;
  let cliTier;
  const args = [];
  for (let i = 0; i < rawArgs.length; i++) {
    if (rawArgs[i] === "--profile") {
      if (i + 1 >= rawArgs.length) {
        console.error("Error: --profile requires a name argument.");
        process.exit(1);
      }
      cliProfile = rawArgs[++i];
    } else if (rawArgs[i] === "--tier") {
      if (i + 1 >= rawArgs.length) {
        console.error("Error: --tier requires a value (chromium or chrome).");
        process.exit(1);
      }
      cliTier = rawArgs[++i];
      if (!VALID_TIERS.has(cliTier)) {
        console.error(
          `Error: invalid --tier value "${cliTier}". Must be "chromium" or "chrome".`,
        );
        process.exit(1);
      }
    } else {
      args.push(rawArgs[i]);
    }
  }

  const command = args[0] || "help";

  if (cliTier && command !== "login") {
    console.error(`Warning: --tier is only used with the "login" command.`);
  }

  try {
    switch (command) {
      case "login": {
        const target = args[1];
        if (!target) {
          console.error(
            "Usage: sign-in.mjs login <site|url> [--profile <name>] [--tier chromium|chrome]",
          );
          process.exit(1);
        }
        if (target.startsWith("http")) {
          await loginUrl(target, cliProfile, cliTier);
        } else {
          await login(target, cliProfile, cliTier);
        }
        break;
      }
      case "check":
        check(args[1]);
        break;
      case "list": {
        const sites = loadSites();
        console.log("Available sites:");
        for (const [name, site] of Object.entries(sites)) {
          console.log(`  ${name.padEnd(15)} ${site.url}`);
        }
        break;
      }
      case "add": {
        const [, name, url, waitFor] = args;
        if (!name || !url) {
          console.error("Usage: sign-in.mjs add <name> <url> [waitFor]");
          process.exit(1);
        }
        saveSite(name, url, waitFor);
        console.log(`Added site shortcut: ${name} → ${url}`);
        break;
      }
      case "help":
      default:
        printHelp();
        break;
    }
  } catch (err) {
    console.error(`Fatal error: ${err.message}`);
    process.exit(1);
  }
}
