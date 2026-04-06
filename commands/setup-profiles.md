---
description: Create or refresh Playwright authentication profiles for the current project
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
---

# Setup Playwright Authentication Profiles

Set up persistent Playwright `storageState` authentication profiles for the current project. This enables authenticated browser automation without logging in every session.

## Step 1: Check CLI Installation

Verify that `@playwright/cli` is installed by running via Bash:

```
playwright-cli --version
```

If the command is not found, guide the user to install it:

```bash
npm install -g @playwright/cli@latest
playwright-cli install
```

The `install` command initializes the workspace and detects available browsers. The CLI supports `--headed` mode, which is required for the interactive login flow.

## Step 2: Check for Existing Profiles

Check if `.playwright/profiles.json` already exists in the project root.

**If it exists:** Read it and present the existing profiles to the user, including any configured `files` and `acceptance` for each profile. For example:

> Found 2 existing profiles:
> - **speaker**: Speaker submission role (created 2026-04-06)
>   - 3 test files: valid-deck.pptx, profanity-deck.pptx, corrupted.pptx
>   - Acceptance: upload accepted, processing completes
> - **planner**: Event planner (created 2026-04-06)
>   - No test files

Ask whether they want to:
- Refresh specific existing profiles (ask which ones)
- Add new profiles
- Refresh all profiles
- Add or edit test data files for existing profiles

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
      "createdAt": "2026-03-31T12:00:00Z",
      "files": [
        {
          "path": "test-fixtures/sample-file.pdf",
          "description": "Valid file, should process successfully"
        },
        {
          "url": "https://storage.example.com/large-file.pdf",
          "description": "Large file, tests size limit",
          "acceptance": { "uploadAccepted": false, "errorExpected": true }
        }
      ],
      "acceptance": {
        "uploadAccepted": true,
        "processingCompletes": true
      }
    }
  }
}
```

The `files` and `acceptance` fields are **optional** — omit them entirely for profiles that do not involve file processing. See Step 6.5 for how these are collected.

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

2. **Open browser:** Use `playwright-cli` via Bash to open a headed browser session for the profile's `loginUrl`:

   ```
   playwright-cli -s=setup-profiles open --headed "{loginUrl}"
   ```

   The `--headed` flag opens a visible browser window so the user can see and interact with it.

3. **Wait:** Ask the user to complete the login manually. This handles all auth methods — username/password, Google OAuth, 2FA, etc. Wait for the user to confirm they are logged in.

4. **Capture:** Save the storage state (cookies + localStorage) to the profile file:

   ```
   playwright-cli -s=setup-profiles state-save ".playwright/profiles/<role-name>.json"
   ```

   Then, capture sessionStorage separately (Playwright's `storageState()` does not include it):

   ```
   playwright-cli -s=setup-profiles eval "() => JSON.stringify(Object.entries(sessionStorage).map(([name, value]) => ({name, value})))"
   ```

   Read the saved profile JSON, merge the sessionStorage data into it as a `sessionStorage` field alongside the existing `cookies` and `origins`, and write the merged file:

   ```json
   {
     "cookies": [...],
     "origins": [...],
     "sessionStorage": [
       { "name": "auth-token", "value": "..." }
     ]
   }
   ```

   If sessionStorage is empty, set `"sessionStorage": []`. Save the merged JSON to `.playwright/profiles/<role-name>.json` using the Write tool.

5. **Validate:** After saving, verify the captured state is usable. Navigate to a page that requires authentication (use the app's root URL or a known protected route) and check via snapshot that the session is recognized:

   ```
   playwright-cli -s=setup-profiles goto "{base_url}"
   playwright-cli -s=setup-profiles snapshot
   ```

   If the snapshot shows a login page or the URL redirects to the login page, warn the user that the capture may be incomplete and offer to retry.

6. **Confirm:** Tell the user the profile was saved successfully.

7. **Next:** Clear all session data for the next login:

   ```
   playwright-cli -s=setup-profiles delete-data
   ```

   Then navigate to the next profile's `loginUrl`. Reuse the same browser session — do not close between profiles:

   ```
   playwright-cli -s=setup-profiles goto "{next_loginUrl}"
   ```

If the user wants to cancel mid-loop, save whatever profiles have been completed so far — they are still usable.

After ALL profiles are captured, close the browser:

```
playwright-cli -s=setup-profiles close
```

## Step 6.5: Define Test Data Files (Optional)

After all profiles are authenticated, check whether any profiles involve file processing workflows (uploads, imports, media). For each profile, ask:

> Does the **[role-name]** role involve processing files (uploads, imports, media)? If so, I can associate test fixture files with this profile for QA workflows. Say "skip" if not applicable.

If the user skips, move to the next profile. If yes:

**Collect file entries.** For each file the user wants to add, ask:

1. **Local path or cloud URL?**
   - If local path: validate the file exists at the given path relative to the project root. If it does not exist, warn and ask the user to correct it.
   - If URL: accept as-is. The URL may point to cloud storage (S3, Supabase Storage, GCS) or any accessible endpoint.
   - A file entry has either `path` or `url`, never both.
2. **Brief description** of the file and its purpose (e.g., "Clean deck, should pass all checks" or "Corrupted file, should reject at validation").

Ask "Add another file?" after each entry. Continue until the user says no.

**Collect acceptance criteria.** After all files are defined for a profile, ask:

> What should a successful file processing run look like for this role? Select which criteria apply:
> 1. **Upload accepted** — file passes input validation (no error after upload)
> 2. **Processing completes** — pipeline reaches a terminal state (not stuck)
> 3. **Result downloadable** — output artifact available for download
> 4. **Expected status** — specific status text to match (if so, what text?)

The user selects which apply. These become the profile-level `acceptance` object. All fields are optional — omitted fields mean "don't verify this criterion."

**Per-file overrides.** If any file behaves differently from the profile norm (e.g., a corrupted file that should be rejected), ask:

> Any of these files have different expected behavior? For example, a corrupted file that should fail upload rather than succeed.

For each file with different behavior, set a file-level `acceptance` object that overrides the profile defaults. The override uses shallow merge — only the fields present at the file level replace the profile defaults:

```
Profile acceptance:  { uploadAccepted: true, processingCompletes: true }
File override:       { uploadAccepted: false, errorExpected: true }
Effective:           { uploadAccepted: false, processingCompletes: true, errorExpected: true }
```

Available override fields:

| Field | Type | Description |
|-------|------|-------------|
| `uploadAccepted` | boolean | File passes input validation |
| `processingCompletes` | boolean | Pipeline reaches a terminal state |
| `resultDownloadable` | boolean | Output artifact available for download |
| `errorExpected` | boolean | Negative test — expect graceful rejection |
| `expectedStatus` | string | App-specific terminal status to match |

Write the `files` and `acceptance` fields into `profiles.json` alongside the existing profile fields. If a profile has no files, omit both fields entirely.

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
  Test files: sample-file.pdf (valid), large-file.pdf (error case)
  Acceptance: upload accepted, processing completes
- other-role: Other role description
Config: `.playwright/profiles.json`
To load a profile, use `playwright-cli -s={session} state-load .playwright/profiles/<role>.json` to restore cookies and localStorage. Restore sessionStorage entries individually with `sessionstorage-set` if the profile includes them.
Run `/setup-profiles` to create new profiles or refresh expired sessions.
```

Only include the "Test files" and "Acceptance" lines for profiles that have `files` and/or `acceptance` configured. Omit these lines for profiles without file processing.

## Step 8: Summary

Present a summary of what was set up:
- Number of profiles created
- List of profile names and descriptions
- Reminder that profiles can be refreshed with `/setup-profiles`
- Note that storageState files are gitignored and will need to be recreated on new machines
