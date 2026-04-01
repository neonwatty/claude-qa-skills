---
description: Create or refresh Playwright authentication profiles for the current project
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_run_code, mcp__playwright__browser_close
---

# Setup Playwright Authentication Profiles

Set up persistent Playwright `storageState` authentication profiles for the current project. This enables authenticated browser automation without logging in every session.

## Step 1: Check MCP Configuration

Verify that a Playwright MCP server is configured. Check the project's `.mcp.json` and the user's global MCP config (`~/.claude/settings.json`) for a Playwright MCP server entry.

If no Playwright MCP server is configured, guide the user to add one:

```json
{
  "playwright": {
    "command": "npx",
    "args": ["-y", "@playwright/mcp@latest"]
  }
}
```

This format is for project-level `.mcp.json` files. For global config in `~/.claude/settings.json`, use the `"mcpServers": { ... }` wrapper instead.

The Playwright MCP server runs in headed mode by default, which is required for the interactive login flow.

## Step 2: Check for Existing Profiles

Check if `.playwright/profiles.json` already exists in the project root.

**If it exists:** Read it and present the existing profiles to the user. Ask whether they want to:
- Refresh specific existing profiles (ask which ones)
- Add new profiles
- Refresh all profiles

Then skip to the appropriate step below.

**If it does not exist:** Proceed to Step 3 for fresh setup.

## Step 3: Define Profiles

Ask the user the following questions, one at a time:

1. **What user roles/profiles do you need?** (e.g., "admin, planner, speaker" or just "user")
2. **What is the login URL?** Ask per-profile if they might differ, but often all roles share the same login page.
3. **Optional: brief description for each role** (e.g., "Full admin permissions" or "Can only view assigned decks"). If the user skips this, generate reasonable descriptions based on the role names.

For projects spanning multiple apps, suggest using descriptive prefixed names (e.g., `admin-panel-admin`, `storefront-buyer`).

**Profile name validation:** Profile names are used as filenames, so enforce these rules:
- Lowercase alphanumeric characters and hyphens only (regex: `^[a-z0-9][a-z0-9-]*$`)
- No spaces, slashes, dots, or special characters
- Not empty, not longer than 50 characters

If the user provides names that violate these rules, suggest a corrected version (e.g., "Admin User" → "admin-user").

## Step 4: Write Configuration

Create the directory structure:

```
.playwright/
  profiles.json
  profiles/
```

Write `.playwright/profiles.json` with the profile definitions. Format:

```json
{
  "profiles": {
    "role-name": {
      "loginUrl": "https://example.com/login",
      "description": "Role description",
      "createdAt": "2026-03-31T12:00:00Z"
    }
  }
}
```

Set `createdAt` to the current ISO 8601 timestamp when creating or refreshing a profile. This helps detect potentially expired sessions — if a profile was created more than 7 days ago, warn the user that it may need refreshing.

## Step 5: Update .gitignore

Check if `.gitignore` exists at the project root.

- If it exists, check whether `.playwright/profiles/` is already listed. If not, append it.
- If `.gitignore` does not exist, create one with `.playwright/profiles/` as the first entry.

This prevents storageState files (which contain session cookies and tokens) from being committed to git.

## Step 6: Interactive Authentication Loop

For each profile, one at a time:

1. **Announce:** Tell the user which role to log in as. For example:
   > "I'm opening the browser to the login page. Please log in as the **admin** user. Tell me when you're done."

2. **Navigate:** Use `browser_navigate` to open the profile's `loginUrl` in Playwright. The browser runs in headed mode by default so the user can see and interact with it.

3. **Wait:** Ask the user to complete the login manually. This handles all auth methods — username/password, Google OAuth, 2FA, etc. Wait for the user to confirm they are logged in.

4. **Capture:** Use `browser_run_code` to capture the storage state:

   ```javascript
   async (page) => {
     return await page.context().storageState();
   }
   ```

   This returns a JSON object containing all cookies, localStorage, and sessionStorage. Save the returned JSON to `.playwright/profiles/<role-name>.json` using the Write tool.

5. **Confirm:** Tell the user the profile was saved successfully.

6. **Next:** Clear all cookies and localStorage for the next login. Use `browser_run_code`:

   ```javascript
   async (page) => {
     await page.context().clearCookies();
     await page.evaluate(() => localStorage.clear());
     return 'Session cleared for next profile';
   }
   ```

   Then navigate to the next profile's `loginUrl`. Reuse the same browser instance — do not call `browser_close` between profiles.

If the user wants to cancel mid-loop, save whatever profiles have been completed so far — they are still usable.

After ALL profiles are captured, close the browser with `browser_close`.

## Step 7: Update CLAUDE.md

After all profiles are saved, update the project's `CLAUDE.md`:

**If CLAUDE.md exists and already has a "## Playwright Profiles" section:** Replace that entire section with the updated version below.

**If CLAUDE.md exists but has no Playwright Profiles section:** Append the section below.

**If CLAUDE.md does not exist:** Create it with just this section.

Section content (adapt profile names and descriptions to match what was configured):

```markdown
## Playwright Profiles
Authenticated browser profiles are available at `.playwright/profiles/`.
Available profiles:
- role-name: Role description
Config: `.playwright/profiles.json`
To load a profile, use `browser_run_code` to restore cookies via `addCookies()` and localStorage via `page.evaluate()` from the profile JSON file.
Run `/setup-profiles` to create new profiles or refresh expired sessions.
```

## Step 8: Summary

Present a summary of what was set up:
- Number of profiles created
- List of profile names and descriptions
- Reminder that profiles can be refreshed with `/setup-profiles`
- Note that storageState files are gitignored and will need to be recreated on new machines
