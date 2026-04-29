---
name: capture-auth
description: This skill should be used when the user asks to "capture auth for my app", "sign into deckchecker", "save login for seatify", "add my app to playwright auth", "authenticate to my site", "set up QA user profiles", "sign in as admin", "sign in as planner", or wants to set up reusable authenticated browsing for a custom web app. Triggers on app names, custom domains, multi-user/QA auth, or any request to save auth state for a URL that is not a well-known external service. Complements auth-browse (external services) by handling the user's own apps and custom sites.
---

# Capture Web App Authentication

Save reusable authenticated browser sessions for custom web apps (the user's own projects, client apps, staging environments, etc.) using the persistent Chrome profile at `~/.playwright-cli/`.

## How This Differs from auth-browse

- **auth-browse**: Preconfigured external services (Cloudflare, Sentry, Vercel, etc.) with known `waitFor` patterns
- **capture-auth**: The user's own apps — custom URLs where the post-login URL needs to be discovered

Both use the same `~/.playwright-cli/sign-in.mjs` script and shared Chrome profile.

## Workflow

### Step 1: Gather app details

Ask the user for:

1. **A short name** for the app (e.g., `deckchecker`, `seatify-staging`, `client-portal`). Used as the identifier for future sign-ins.
2. **The login URL** (e.g., `https://deckchecker.app/login`, `https://staging.seatify.app/login`).
3. **The post-login URL pattern** (optional). This is a URL substring that appears after successful sign-in — used for auto-detect. Examples:
   - `/dashboard` — most common
   - `/home`
   - `/events`
   - The app's domain alone if login redirects to a different domain

If the user does not know the post-login URL, suggest common patterns or tell them to skip it (the script will use manual Enter instead).

### Step 2: Register the site

Run via Bash:

```bash
node ~/.playwright-cli/sign-in.mjs add <name> <login-url> <wait-for-pattern>
```

Example:

```bash
node ~/.playwright-cli/sign-in.mjs add deckchecker https://deckchecker.app/login /dashboard
```

If no `waitFor` was provided, omit the third argument — the script defaults to the hostname.

### Step 3: Sign in

Tell the user to run the sign-in command in a separate terminal:

```
node ~/.playwright-cli/sign-in.mjs login <name>
```

The script defaults to Playwright's built-in Chromium, which works while Chrome is open. Custom apps rarely have bot detection, so this is almost always fine. If the user's app uses Google OAuth for login and it gets blocked, retry with `--tier chrome` (Chrome must be closed first):

```
node ~/.playwright-cli/sign-in.mjs login <name> --tier chrome
```

This is interactive — Claude cannot run it. The user signs in manually. The script auto-detects completion using the `waitFor` pattern (defaults to the hostname when omitted from `add`). The user can also press Enter at any time to save manually.

### Step 4: Validate and test

After the user confirms sign-in is complete, validate the captured auth:

```bash
node ~/.playwright-cli/sign-in.mjs check <name>
```

Review the output:

- **Status: HEALTHY** — proceed to test browsing.
- **Status: EXPIRED** — the capture failed or the session expired before saving. Re-run sign-in.
- **Status: DEGRADED** — check the warnings. Common issues:
  - "No auth-relevant cookies found" — the app may use httpOnly cookies not captured by storageState, or sign-in wasn't completed before saving.
  - "N session-only cookies will not survive state-load" — this app needs `--persistent --profile` instead.
  - Supabase session expires in <2h — normal for Supabase, but the profile will need frequent refresh.

If the app uses Supabase (look for `sb-*-auth-token` in the check output), note the real session TTL. Supabase access tokens typically expire in 1 hour — inform the user that profiles will need refresh before each work session.

Then test browsing:

For the user's own apps (no bot detection), use `state-load` — it injects cookies into the existing headless session without interfering with per-repo session isolation or `cli.config.json` settings:

```bash
playwright-cli open <app-url>
playwright-cli state-load ~/.playwright-cli/auth-<name>.json
playwright-cli reload
playwright-cli snapshot
```

Take a snapshot to confirm the user is signed in. If the app redirects to the login page, the session may not have saved correctly — re-run sign-in.

**Only use `--persistent --profile` when `state-load` fails** (sites with bot detection like Cloudflare Turnstile or Google OAuth). Note: `--browser chrome` launches the real Chrome app and can conflict with the user's personal Chrome on macOS — close the session promptly when done.

```bash
playwright-cli open <app-url> --headed --browser chrome --persistent --profile ~/.playwright-cli/chrome-profile
```

### Step 5: Confirm and summarize

Tell the user:

- Their app is now registered as `<name>`
- Future sign-ins: `node ~/.playwright-cli/sign-in.mjs login <name>`
- To browse authenticated: just ask Claude to "open deckchecker" or "browse seatify"
- Default browsing uses `state-load` (headless, non-interfering with session isolation)
- Each site gets its own auth file (`auth-<name>.json`); multiple accounts on the same domain need distinct site names (e.g., `seatify-admin`, `seatify-planner`)

## Multi-User / QA Profiles

For apps that need multiple authenticated users (e.g., testing admin vs planner roles), use `--profile` to isolate each user's Chrome session. Without `--profile`, all sign-ins share a single Chrome profile — meaning a second sign-in to the same domain overwrites the first user's cookies.

### Step 1: Register each user as a separate site

```bash
node ~/.playwright-cli/sign-in.mjs add seatify-admin https://seatify.app/login /dashboard
node ~/.playwright-cli/sign-in.mjs add seatify-planner https://seatify.app/login /dashboard
```

### Step 2: Sign in with isolated profiles

Tell the user to run each in a separate terminal:

```
node ~/.playwright-cli/sign-in.mjs login seatify-admin --profile seatify-admin
node ~/.playwright-cli/sign-in.mjs login seatify-planner --profile seatify-planner
```

The `--profile <name>` flag creates an isolated Chrome directory at `~/.playwright-cli/chrome-profile-<name>/`. Each user's session is completely independent.

### Step 3: Browse as a specific user

Multi-user profiles on the same domain share auth files keyed by site name (e.g., `auth-seatify-admin.json`, `auth-seatify-planner.json`). Since each role has a distinct site name, `state-load` works:

```bash
playwright-cli open https://seatify.app/dashboard
playwright-cli state-load ~/.playwright-cli/auth-seatify-admin.json
playwright-cli reload
```

To switch users, load a different auth file:

```bash
playwright-cli state-load ~/.playwright-cli/auth-seatify-planner.json
playwright-cli reload
```

If `state-load` doesn't work (bot detection), fall back to the persistent profile:

```bash
playwright-cli open https://seatify.app/dashboard --headed --browser chrome \
  --persistent --profile ~/.playwright-cli/chrome-profile-seatify-admin
```

### Naming convention

Use `<app>-<role>` as both the site name and profile name: `seatify-admin`, `seatify-planner`, `deckchecker-owner`, `client-portal-reviewer`. This keeps auth files and Chrome profiles aligned.

## Handling Multiple Environments

For apps with multiple environments (production, staging, dev), register each as a separate site:

```bash
node ~/.playwright-cli/sign-in.mjs add seatify https://seatify.app/login /dashboard
node ~/.playwright-cli/sign-in.mjs add seatify-staging https://staging.seatify.app/login /dashboard
node ~/.playwright-cli/sign-in.mjs add seatify-dev http://localhost:3000/login /dashboard
```

Combine with `--profile` for multi-user across environments:

```bash
node ~/.playwright-cli/sign-in.mjs add seatify-staging-admin https://staging.seatify.app/login /dashboard
node ~/.playwright-cli/sign-in.mjs login seatify-staging-admin --profile seatify-staging-admin
```

## Common Post-Login Patterns

When helping the user determine the `waitFor` pattern, suggest these common patterns:

| Framework / Pattern    | Typical post-login URL                    |
| ---------------------- | ----------------------------------------- |
| Next.js with dashboard | `/dashboard`                              |
| SPA with hash routing  | `#/home` or `#/dashboard`                 |
| Supabase Auth redirect | `/dashboard` or the `redirectTo` path     |
| OAuth callback         | The final redirect after `/auth/callback` |
| Multi-step onboarding  | `/onboarding` or `/setup`                 |

If unsure, the user can sign in manually (Enter-based) first, then check the browser URL bar to discover the pattern. They can update the site config later with `add` (same name overwrites).

## Using Captured Auth

Once a session is captured, the user can ask Claude to browse the app naturally:

- "Open deckchecker and check the dashboard"
- "Browse seatify staging"
- "Go to the client portal"
- "Browse seatify as admin"
- "Check the planner view on seatify"

Claude should check auth status first, then browse using the two-tier approach:

### Tier 1: `state-load` (default for custom apps)

Injects cookies into the existing headless session. Non-interfering — respects `cli.config.json`, session isolation, and headless mode.

```bash
# Single-user app
playwright-cli open <url>
playwright-cli state-load ~/.playwright-cli/auth-<name>.json
playwright-cli reload

# Multi-user / QA — each role is a separate site name
playwright-cli open <url>
playwright-cli state-load ~/.playwright-cli/auth-seatify-admin.json
playwright-cli reload
```

When the user mentions a role ("as admin", "as planner"), map it to the corresponding auth file (e.g., `auth-deckchecker-admin.json`).

### Tier 2: `--persistent --profile` (bot-protected sites only)

Only needed when `state-load` fails — typically external services with Cloudflare Turnstile or Google OAuth that fingerprint the browser itself.

```bash
# Default profile
playwright-cli open <url> --headed --browser chrome \
  --persistent --profile ~/.playwright-cli/chrome-profile

# Named profile (multi-user)
playwright-cli open <url> --headed --browser chrome \
  --persistent --profile ~/.playwright-cli/chrome-profile-<name>
```

This overrides session isolation and requires headed mode. See the **auth-browse** skill for details.
