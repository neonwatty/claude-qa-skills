---
name: use-profiles
description: Load saved Playwright storageState authentication profiles before browser automation. Activates when `.playwright/profiles.json` exists and browser work begins on authenticated pages. Trigger phrases include "use profile", "load profile", "browser as [role]", "authenticated browser", "logged in browser session".
---

# Using Playwright Authentication Profiles

## Purpose

Load saved Playwright `storageState` authentication profiles before browser automation work. This eliminates the need to log in manually at the start of every browser session.

## When This Applies

This skill applies when ALL of the following are true:
1. The current project has a `.playwright/profiles.json` file
2. Browser automation work is about to begin (using Playwright CLI via Bash)
3. The target page requires authentication

## Profile Discovery

Check for `.playwright/profiles.json` at the project root. Read it to discover available profiles. The file contains entries like:

```json
{
  "profiles": {
    "admin": {
      "loginUrl": "https://example.com/login",
      "description": "Full permissions",
      "createdAt": "2026-03-31T12:00:00Z"
    }
  }
}
```

Each profile has a corresponding storageState file at `.playwright/profiles/<role-name>.json`.

## Profile Selection

Determine which profile to use based on conversation context:

- If the user mentions a specific role (e.g., "test the admin dashboard", "check the speaker view"), match it to a profile name from the config.
- If the user does not specify a role and only one profile exists, use it automatically.
- If the user does not specify a role and multiple profiles exist, ask which one to use. Present the available profiles with their descriptions.

## Loading a Profile

Before navigating to any authenticated page, load the profile using `playwright-cli` via the Bash tool. The `{session}` placeholder below refers to the current named session (e.g., `runner-desktop`, `qa-ux` — set by the invoking skill or command).

1. Verify the storageState file exists at `.playwright/profiles/<role-name>.json`. If it does not exist, inform the user and suggest running `/setup-profiles` to create it.

2. Load the profile's cookies and localStorage into the browser session:

   ```
   playwright-cli -s={session} state-load ".playwright/profiles/<role-name>.json"
   ```

   This restores all cookies and per-origin localStorage from the storageState JSON — the same format used by Playwright's `storageState()`.

3. If the profile JSON contains a `sessionStorage` field (not part of standard storageState — added by `/setup-profiles`), restore it separately after navigating to the target origin:

   ```
   playwright-cli -s={session} goto "<origin>"
   ```
   Then for each sessionStorage entry:
   ```
   playwright-cli -s={session} sessionstorage-set "<name>" "<value>"
   ```

4. Navigate to the target authenticated page. Cookies are sent with the request, localStorage is already populated, and sessionStorage is restored — so server-side, client-side, and SPA auth libraries (Supabase, Firebase, Auth0) will recognize the session.

## Test Data Files & Acceptance Criteria

After loading a profile, check whether it has a `files` array and/or `acceptance` object in `profiles.json`. These are optional fields — many profiles will not have them.

### Surfacing available files

If the profile has `files`, inform the caller with a summary:

> This profile has **N** test data file(s) available:
> 1. valid-deck.pptx — Clean deck, passes all checks
> 2. profanity-deck.pptx — Profanity in notes, should flag
> 3. *(cloud)* oversized-deck.pptx — 200MB deck, tests size limit
>
> Profile acceptance criteria: upload accepted, processing completes

Mark cloud-hosted files (those with `url` instead of `path`) with *(cloud)* for clarity.

This information is surfaced but not acted on by this skill — the consumer (workflow generator, runner, agent) decides whether and how to use it.

### File path validation

For each file entry with a `path` field, verify the file exists at the given path relative to the project root. If a file is missing, warn:

> Profile "speaker" references test file "test-fixtures/valid-deck.pptx" which does not exist. The file may have been moved or deleted.

Do not fail or block on missing files — just warn. Files with `url` are not validated (they may require authentication or be on private networks).

### Acceptance criteria summary

If the profile has `acceptance`, include a human-readable summary of the configured criteria. Map the fields as follows:

| Field | Summary text |
|-------|-------------|
| `uploadAccepted: true` | upload accepted |
| `processingCompletes: true` | processing completes |
| `resultDownloadable: true` | result downloadable |
| `errorExpected: true` | error expected |
| `expectedStatus: "clear"` | expected status: "clear" |

If individual files have `acceptance` overrides, note which files override the profile defaults:

> File "corrupted.pptx" overrides profile acceptance: upload rejected, error expected

## Session Expiry Detection

After loading a profile and navigating to the target page, check whether the session is still valid using these heuristics in order:

1. **URL redirect:** If the browser is redirected to a URL matching the `loginUrl` from the profile config, the session has likely expired. Check the URL in the snapshot output's `Page URL` line.
2. **Auth-provider redirect:** If the final URL is on a different domain (e.g., `accounts.google.com`, `auth0.com`), the app redirected to an OAuth provider — the session has expired.
3. **Page content check:** Run `playwright-cli -s={session} snapshot` via Bash and look for login-related elements: sign-in forms, "Log in" / "Sign in" buttons, or "session expired" text. If the target page was expected to show authenticated content but instead shows a login UI, the session has expired.

If expiry is detected:
- Inform the user that the session for the profile appears to have expired
- Suggest running `/setup-profiles` to refresh it
- Do not attempt to log in automatically

These heuristics are best-effort. The user can always run `/setup-profiles` manually to refresh any profile.

## Missing Profiles

If `.playwright/profiles.json` exists but references profiles whose storageState files are missing (e.g., after a fresh clone), inform the user:

> "This project has Playwright profiles configured but the authentication state files are missing (they are gitignored and need to be created locally). Run `/setup-profiles` to authenticate."

## No Profile Config

If `.playwright/profiles.json` does not exist, this skill does not apply. Do not suggest creating profiles unless the user is explicitly asking about authenticated browser automation.
