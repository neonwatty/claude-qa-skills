---
name: auth-browse
description: This skill should be used when the user asks to "sign into Cloudflare", "browse Sentry authenticated", "open Supabase dashboard", "log into Vercel", "check auth status", "authenticate to AWS", or any request to browse an external service that requires authentication using playwright-cli. Also triggers on "sign in to <site>", "authenticate to <site>", "open <site> logged in", "browse <service> for me". Complements use-profiles (per-project roles) by providing global persistent auth for external services. Defaults to Chromium; uses real Chrome (`--tier chrome`) only for bot-protected sites.
---

# Authenticated Browsing with Playwright CLI

Browse external services (Cloudflare, Sentry, PostHog, Supabase, Vercel, GitHub, AWS, etc.) using `playwright-cli` with persistent authentication. Defaults to Playwright's bundled Chromium (works while Chrome is open); use `--tier chrome` for sites with bot detection.

## How This Differs from use-profiles

- **use-profiles**: Per-project, role-based auth (admin/user/speaker) for the project's own app, using Playwright CLI sessions
- **auth-browse**: Global, service-based auth for external dashboards (Cloudflare, Sentry, etc.) using `playwright-cli` with persistent authentication. Defaults to Chromium; uses real Chrome for bot-protected sites

Both skills can coexist. Use `use-profiles` for testing your app with different roles. Use `auth-browse` for browsing third-party services.

## Architecture

All auth state lives in `~/.playwright-cli/`:

```
~/.playwright-cli/
├── sign-in.mjs              ← Sign-in script (bundled with this skill)
├── chrome-profile/           ← Default Chrome profile (shared across all sites)
├── chrome-profile-<name>/    ← Isolated profiles (--profile flag, for multi-user)
├── sites.json                ← User-added custom site shortcuts
├── auth-cloudflare.json      ← Per-site cookie snapshots
├── auth-sentry.json
├── package.json              ← Playwright dependency
└── node_modules/
```

The persistent Chrome profile accumulates sessions from all sign-ins. When browsing with `--persistent --profile`, all sites are already authenticated.

## Setup

First-time setup requires installing the script and its dependency:

```bash
mkdir -p ~/.playwright-cli
cp <path-to-this-skill>/scripts/sign-in.mjs ~/.playwright-cli/sign-in.mjs
cp <path-to-this-skill>/scripts/cookie-analysis.mjs ~/.playwright-cli/cookie-analysis.mjs
cd ~/.playwright-cli && npm init -y && npm install playwright
```

The script path for this skill is relative to the plugin install location. Use `Glob` to find it:

```
skills/auth-browse/scripts/sign-in.mjs
```

## Workflow

### Pre-Browse Validation

Before browsing any external service, perform these checks:

### Tier Selection (RT-11)

The `login` command defaults to Playwright's bundled Chromium (`--tier chromium`), which works while the user's Chrome is open. If the login is blocked by bot detection (Cloudflare Turnstile, Google OAuth "This browser is not secure"), the user should retry with `--tier chrome`:

```
node ~/.playwright-cli/sign-in.mjs login <site> --tier chrome
```

The `--tier chrome` preference is saved per-site in `sites.json` — future logins for that site automatically use real Chrome. The user must close their personal Chrome before running `--tier chrome`.

Do not assume which sites need `--tier chrome`. Let the user discover it on first login. The script prints a hint when login appears to fail.

### Auth Freshness (RT-12)

Before loading any auth state, check whether it is still valid:

1. Run `node ~/.playwright-cli/sign-in.mjs check <site>` via Bash.
2. Look at the output. If it shows `Status: EXPIRED` or any `⚠ Auth ... EXPIRED` lines, the auth is stale.
3. If stale: inform the user and prompt for re-auth (`node ~/.playwright-cli/sign-in.mjs login <site>`) **before** attempting to browse. Do not load expired auth and navigate — it wastes time.
4. If healthy: proceed with the browsing workflow below.

### Step 1: Check existing auth

```bash
node ~/.playwright-cli/sign-in.mjs check           # all sites
node ~/.playwright-cli/sign-in.mjs check cloudflare # specific site
```

If auth is valid, skip to Step 3.

### Step 2: Sign in (if needed)

The sign-in command is **interactive** — it opens a browser for manual sign-in. This cannot be run via the Bash tool. Tell the user to run it in a separate terminal:

```
node ~/.playwright-cli/sign-in.mjs login <site>
```

The script auto-detects sign-in completion by watching the URL and saves automatically. It also accepts Enter as a manual fallback.

Do NOT use the Bash tool or `!` prefix — the command requires interactive stdin.

Built-in sites: `github`, `cloudflare`, `vercel`, `sentry`, `posthog`, `supabase`, `aws`, `netlify`, `railway`, `render`. Users can add custom sites:

```bash
node ~/.playwright-cli/sign-in.mjs add myapp https://myapp.com/login myapp.com/dashboard
```

For arbitrary URLs without adding a shortcut: `node ~/.playwright-cli/sign-in.mjs login https://example.com`

### Step 3: Browse authenticated

Choose the right tier based on the target site:

**Tier 1: `state-load` (default for most sites):**

Injects cookies into the existing headless session. Non-interfering — respects `cli.config.json` and per-repo session isolation.

```bash
playwright-cli open <url>
playwright-cli state-load ~/.playwright-cli/auth-<site>.json
playwright-cli reload
```

**Tier 2: `--persistent --profile` (when state-load fails due to bot detection):**

Uses real Chrome with persistent profile. Overrides session isolation and requires headed mode, but bypasses bot detection.

> **⚠ Chrome singleton warning:** On macOS, only one Chrome binary instance can run at a time. Using `--browser chrome` launches the real Chrome app — if the user's personal Chrome is already open, this will conflict. The Playwright CLI daemon may also leave orphaned Chrome processes that block normal Chrome usage. **Always prefer `state-load` (Tier 1).** Only use Tier 2 when Tier 1 fails, and close the session promptly afterward.

```bash
playwright-cli open <url> --headed --browser chrome --persistent --profile ~/.playwright-cli/chrome-profile
```

**When unsure**, try `state-load` first. If the site redirects to a login page or shows a bot challenge, fall back to the persistent profile approach.

### Navigating between services

Within a single `playwright-cli` session using the persistent profile, navigate freely between authenticated services:

```bash
playwright-cli goto https://sentry.io
playwright-cli goto https://dash.cloudflare.com
```

No re-authentication needed — the profile holds all sessions.

### Isolated Profiles (Multi-User)

By default all sign-ins share `~/.playwright-cli/chrome-profile/`. To maintain separate sessions (e.g., different accounts on the same service), use `--profile`:

```
node ~/.playwright-cli/sign-in.mjs login github --profile work
node ~/.playwright-cli/sign-in.mjs login github --profile personal
```

Browse with the isolated profile. Note: `state-load` uses the auth file keyed by site name, so multiple profiles on the same domain (e.g., `github --profile work` and `github --profile personal`) both write to `auth-github.json` — the second overwrites the first. For multi-user isolation on the same domain, use the persistent profile approach:

```bash
playwright-cli open https://github.com --headed --browser chrome \
  --persistent --profile ~/.playwright-cli/chrome-profile-work
```

For different sites (no multi-user conflict), `state-load` works fine:

```bash
playwright-cli open https://github.com
playwright-cli state-load ~/.playwright-cli/auth-github.json
playwright-cli reload
```

See the **capture-auth** skill for a full multi-user/QA workflow.

### Chrome Profile Lock

Only one Chrome process can use a profile at a time. If the sign-in script fails with "Chrome is already running with profile":

```bash
kill $(pgrep -f "chrome-profile")
```

Then re-run the sign-in command.

### Stale Daemon Cleanup

The Playwright CLI runs browser sessions as background daemon processes. If a session using `--browser chrome` is not closed properly, the orphaned Chrome process can block normal Chrome usage on macOS (clicking Chrome opens a blank window or does nothing).

**Symptoms:**

- Chrome won't open normally (clicking the icon does nothing or opens blank)
- `ps aux | grep "Google Chrome"` shows Chrome processes you didn't launch
- `playwright-cli list` shows sessions with no active socket

**Fix:**

```bash
# Kill all playwright-cli daemons
playwright-cli kill-all

# If Chrome is still stuck, kill orphaned Chrome processes
pkill -f "Google Chrome.*remote-debugging-port"

# Verify cleanup
playwright-cli list
```

**Prevention:** Always close Tier 2 browsing sessions when done. Prefer `state-load` (Tier 1) to avoid this entirely.

## Additional Resources

### Reference Files

- **`references/bot-detection.md`** — Detailed explanation of Google OAuth and Cloudflare Turnstile detection mechanisms, why specific Chrome flags are needed, and per-site compatibility matrix

### Scripts

- **`scripts/sign-in.mjs`** — The sign-in script to install at `~/.playwright-cli/sign-in.mjs`
