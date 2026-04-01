---
description: Discover all screens, confirm the manifest with the user, then dispatch QA agents to every screen
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent, AskUserQuestion, mcp__playwright__*
argument-hint: "[smoke|ux|adversarial|all] [--url URL]"
---

# Run QA

Orchestrate a complete QA run across the application. This command discovers every screen in the codebase and existing workflows, builds a manifest, confirms it with the user, then dispatches the selected QA agent(s) to every screen in the manifest. Nothing gets skipped.

---

## Phase 1: Parse Arguments

Parse `$ARGUMENTS` to determine:

### Agent Selection

The first positional argument selects which agent(s) to dispatch:

| Argument | Agents Dispatched |
|----------|-------------------|
| `smoke` | smoke-tester only |
| `ux` | ux-auditor only |
| `adversarial` | adversarial-breaker only |
| `all` | All three agents per screen |
| _(none)_ | Ask the user which agent(s) to run |

### URL Flag

`--url URL` sets the base URL of the running application. If not provided, ask the user via `AskUserQuestion` in Phase 3.

---

## Phase 2: Build the Screen Manifest

This phase is deterministic. Do not skip screens, do not use judgment about which screens are "important." Enumerate everything.

### Step 1: Check for Existing Manifest

Look for `./workflows/qa-manifest.json` at the project root.

**If it exists**, read it and present a summary to the user:

```
Found existing QA manifest with [N] screens (last updated [date]).

1. Use this manifest as-is
2. Re-discover and rebuild the manifest
3. Edit the existing manifest (add/remove screens)
```

If the user chooses option 1, skip to Phase 3.

### Step 2: Scan the Codebase for Routes

Use Glob and Grep to find every route definition. First detect the framework, then apply the corresponding search patterns.

**Framework detection** — Determine the project's framework by checking `package.json` dependencies:
- `"next"` → Next.js (check for `app/` directory → App Router; `pages/` directory → Pages Router; both → scan both)
- `"@remix-run/react"` → Remix
- `"react-router-dom"` → React Router
- `"@sveltejs/kit"` → SvelteKit
- If none match → use Generic fallback

**Next.js (App Router):**
```
Glob: app/**/page.{tsx,jsx,ts,js}
Glob: app/**/layout.{tsx,jsx,ts,js}
Extract route from directory path: app/dashboard/settings/page.tsx → /dashboard/settings

Path normalization:
- Strip route groups (parenthesized folders): app/(auth)/dashboard/page.tsx → /dashboard
- Flag parallel routes (@modal, @sidebar) as non-navigable — exclude from manifest
- Flag intercepting routes ((..), (..)(..)) as non-navigable — exclude from manifest
- Note dynamic segments ([id], [...slug], [[...slug]]) — these need example values for agents to test
```

**Next.js (Pages Router):**
```
Glob: pages/**/*.{tsx,jsx,ts,js}
Exclude: pages/api/**, pages/_app.*, pages/_document.*, pages/_error.*, pages/404.*, pages/500.*
Extract route from file path: pages/dashboard/index.tsx → /dashboard
```

**Remix (file-based routing):**
```
Glob: app/routes/**/*.{tsx,jsx,ts,js}
Extract route from filename: app/routes/dashboard.settings.tsx → /dashboard/settings
Note: Remix uses dots as path separators, $ for dynamic segments

Additional Remix v2 conventions:
- Pathless layout files (prefixed with _): _auth.tsx, _layout.tsx — layout wrappers, not navigable routes. Exclude from manifest.
- Index routes: dashboard._index.tsx → /dashboard (not /dashboard/_index). The _index suffix maps to the parent path.
- Escaped dots: profile\.settings.tsx → /profile.settings (literal dot in URL, not a path separator)
- Resource routes: files without a default export are API handlers, not pages. Exclude from manifest.
```

**React Router (JSX-based):**
```
Grep: <Route, createBrowserRouter, createRoutesFromElements
Grep: path: ", path=", element:
Extract route paths from route definitions
```

**SvelteKit:**
```
Glob: src/routes/**/+page.svelte
Extract route from directory path
```

**Generic fallback:**
```
Grep: /[a-z-]+(/[a-z-]+)* in router configs, navigation components, and link hrefs
```

For each discovered route, record:
- URL path
- Source file
- Whether it appears to require auth

**Auth detection** — scan for these framework-specific patterns:
- Next.js App Router: check `middleware.{ts,js}` at project root for `config.matcher` patterns that define protected routes. Also check `layout.{ts,tsx}` files for auth checks (`getServerSession`, `auth()`, `redirect`) — if a layout enforces auth, propagate `auth_required: true` to all child routes under that layout.
- Next.js Pages Router: grep inside `getServerSideProps` for `getServerSession`, `getSession`, `requireAuth`, or redirect-to-login patterns. Each page file with an auth-guarded `getServerSideProps` is auth-required.
- Generic: look for `requireAuth`, `isAuthenticated`, `getServerSession`, `auth()`, protected route wrappers, auth HOCs

### Step 3: Scan Existing Workflows

Read all workflow files in `./workflows/`:
- `desktop-workflows.md`
- `mobile-workflows.md`
- `multi-user-workflows.md`

For each workflow step, extract the URL/screen it references. Build a map of which screens are covered by which workflow steps.

### Step 4: Merge and Deduplicate

Combine codebase routes and workflow-referenced screens into a single list. For each screen:

```json
{
  "url": "/dashboard",
  "name": "Dashboard",
  "auth_required": true,
  "source_file": "app/dashboard/page.tsx",
  "discovered_from": ["codebase", "workflow"],
  "workflow_refs": ["WF01-Step3", "WF05-Step1"],
  "params": {},
  "example_url": "/dashboard",
  "notes": ""
}
```

For routes with dynamic segments, populate `params` with the segment names as keys (values left empty until the user provides them in Step 5):

```json
{
  "url": "/users/[id]/settings",
  "name": "User Settings",
  "auth_required": true,
  "source_file": "app/users/[id]/settings/page.tsx",
  "discovered_from": ["codebase"],
  "workflow_refs": [],
  "params": { "id": "" },
  "example_url": "",
  "notes": "dynamic — needs example values"
}
```

Flag screens that appear in the codebase but are NOT referenced in any workflow — these are coverage gaps.

### Step 5: Present Manifest to User for Confirmation

This is the critical step. Present the complete manifest to the user and require explicit confirmation before proceeding.

Use `AskUserQuestion` with the full screen list:

```
## QA Manifest — [N] screens discovered

### Screens from workflows + codebase ([N])
| # | URL | Auth | Source | Workflow Coverage |
|---|-----|------|--------|-------------------|
| 1 | /dashboard | Yes | Both | WF01, WF05 |
| 2 | /settings | Yes | Both | WF03 |
| 3 | /settings/notifications | Yes | Codebase only | ⚠️ No workflow |
| 4 | /login | No | Both | WF01 |
| ... | | | | |

### Dynamic Routes — need example values ([N])
These routes have dynamic segments. Provide example values so agents can navigate to real pages:
| Route | Params | Example URL |
|-------|--------|-------------|
| /users/[id]/settings | id=? | /users/___/settings |
| /posts/[...slug] | slug=? | /posts/___ |

### Coverage Gaps — routes in code but not in workflows ([N])
These screens exist in the codebase but are not covered by any workflow:
- /settings/notifications (app/settings/notifications/page.tsx)
- /admin/billing (app/admin/billing/page.tsx)

### Actions
1. **Confirm** — Run QA against all [N] screens as listed
2. **Add screens** — Add URLs not discovered automatically
3. **Remove screens** — Remove screens that shouldn't be audited (e.g., API routes, redirects)
4. **Edit** — Modify specific entries

Please confirm or adjust the manifest.
```

Iterate until the user confirms. Every add/remove/edit the user makes gets applied to the manifest.

### Step 6: Save the Manifest

Create the `./workflows/` directory if it does not already exist, then write the confirmed manifest to `./workflows/qa-manifest.json`:

```json
{
  "version": 1,
  "created": "2026-03-31T12:00:00Z",
  "base_url": "",
  "screens": [
    {
      "url": "/dashboard",
      "name": "Dashboard",
      "auth_required": true,
      "source_file": "app/dashboard/page.tsx",
      "discovered_from": ["codebase", "workflow"],
      "workflow_refs": ["WF01-Step3", "WF05-Step1"],
      "params": {},
      "example_url": "/dashboard"
    },
    {
      "url": "/users/[id]/settings",
      "name": "User Settings",
      "auth_required": true,
      "source_file": "app/users/[id]/settings/page.tsx",
      "discovered_from": ["codebase"],
      "workflow_refs": [],
      "params": { "id": "123" },
      "example_url": "/users/123/settings"
    }
  ]
}
```

This file should be committed to the repo so future QA runs can reuse or update it.

---

## Phase 3: Pre-Flight Checks

Before dispatching agents, verify everything is ready.

### Step 1: Base URL

If `--url` was provided, use it. Otherwise, ask the user:

```
What is the base URL of the running app?
(e.g., http://localhost:3000, https://staging.example.com)
```

After the base URL is determined, update the saved manifest file (`./workflows/qa-manifest.json`) with the resolved `base_url` value so future runs can reuse it.

### Step 2: Authentication Profiles

Check for `.playwright/profiles.json` at the project root.

**If profiles exist:** Read them, verify storageState files are present, and resolve which profile each agent should use. This decision happens HERE, not inside each agent.

```
Found [N] authentication profiles:

| Profile | Description | storageState |
|---------|-------------|--------------|
| admin   | Full admin permissions | ✓ Valid |
| user    | Standard user account | ✓ Valid |
| viewer  | Read-only access | ✗ Missing |
```

Then determine the profile assignment:

- If only one profile exists, assign it to all agents automatically.
- If multiple profiles exist, ask the user which profile each agent type should use:

```
Multiple profiles are available. Which profile should each agent use?

For smoke-tester: [admin / user / viewer]
For ux-auditor: [admin / user / viewer]
For adversarial-breaker: [admin / user / viewer, or "all" to test each role]

Default: Use "[first profile name]" for smoke and UX, "all" for adversarial.
Accept defaults? (yes / customize)
```

When computing defaults, use the first profile from the discovered list — do not hardcode "user". If a profile named "user" exists, prefer it; otherwise fall back to the first available profile.

The adversarial-breaker benefits from testing with multiple profiles (and unauthenticated) to find auth boundary issues. The smoke-tester and ux-auditor typically need one consistent profile.

Record the profile assignment — it will be passed to each agent in the dispatch template.

**Session validation** — before dispatching, verify that each assigned profile's session is still active. For each unique profile in the assignment:

1. Read the storageState JSON file
2. Load its cookies into a Playwright page via `browser_run_code`
3. Navigate to `[base_url]`
4. Check if the session is still valid:
   a. If the browser was redirected to the profile's `loginUrl`, the session has expired
   b. If the final URL is on a different domain (OAuth provider redirect), the session has expired
   c. Take a `browser_snapshot` — if login-related elements are visible (sign-in forms, "Log in" buttons), the session has expired

If any session has expired, warn the user immediately:

```
⚠ Profile "[name]" session has expired (redirected to login page).
Run /setup-profiles to refresh it before proceeding.
```

This pre-flight check prevents wasting agent dispatches on expired sessions.

**If profiles exist but some storageState files are missing:**

```
Profile "viewer" is configured but its auth state is missing (gitignored).
Run /setup-profiles to refresh it, or proceed without it.
```

**If profiles do not exist and auth-required screens are in the manifest:**

```
[N] screens in the manifest require authentication, but no profiles are set up.

1. Run /setup-profiles now to create auth profiles (recommended)
2. Skip auth-required screens
3. Proceed anyway (agents will run unauthenticated against all screens)
```

If the user chooses option 1, pause the QA run and let them complete profile setup. Resume when they return.

### Step 3: Confirm Agent Selection

If the agent(s) were specified via argument, confirm:

```
Ready to run [agent name(s)] against [N] screens at [base_url].
Estimated scope: [N] agent invocations.

Proceed? (yes/no)
```

If no agent was specified, ask:

```
Which QA agent(s) should I run?

1. smoke-tester — Quick pass/fail on each screen (fastest)
2. ux-auditor — Obsessive UX rubric on each screen (thorough)
3. adversarial-breaker — Try to break each flow (deepest)
4. All three — Full QA suite

Select one or more (e.g., "1 and 2", or "all"):
```

### Step 4: Validate Manifest for Dispatch

Before dispatching, verify all manifest entries are navigable:

1. For each screen in the manifest, check that `example_url` is non-empty and does not contain bracket characters (`[`, `]`)
2. If any screen fails this check, halt and prompt the user:

```
The following screens have unresolved dynamic routes:

- /users/[id]/settings — example_url is empty
- /posts/[...slug] — example_url contains brackets

Please provide example values for these routes before QA can proceed.
```

3. Do not dispatch any agents until all `example_url` values are resolved.

---

## Phase 4: Dispatch Agents

For each screen in the manifest, spawn the selected agent(s) using the Agent tool. This is the mechanical execution phase — every screen in the manifest gets audited, no exceptions.

### Dispatch Strategy

**For smoke-tester:** Dispatch one agent per workflow (not per screen), since the smoke tester follows workflow steps sequentially. If a screen appears in multiple workflows, it gets tested in each. For coverage-gap screens (in manifest but not in any workflow), dispatch an additional smoke-tester agent with a simple instruction: "Navigate to [example_url], verify the page loads without errors (no 500, no blank page, no redirect loop), and report pass/fail."

**Smoke-tester coverage-gap template** (dispatched per uncovered screen):

```
You are operating as the smoke-tester QA agent for a coverage-gap screen
(no workflow exists for this page).

Target: [screen name] at [base_url][example_url]
Auth required: [yes/no]
Auth profile to use: [exact profile name, e.g., "admin"]
Auth profile path: .playwright/profiles/[profile-name].json

To load the auth profile, read the storageState file and run:

  async (page) => {
    const state = <contents of .playwright/profiles/[profile-name].json>;
    await page.context().addCookies(state.cookies);
    if (state.origins) {
      for (const origin of state.origins) {
        if (origin.localStorage && origin.localStorage.length > 0) {
          await page.goto(origin.origin);
          await page.evaluate((items) => {
            for (const { name, value } of items) localStorage.setItem(name, value);
          }, origin.localStorage);
        }
      }
    }
    return 'Profile loaded: [profile-name]';
  }

There is no workflow file for this screen. Perform a basic smoke check:

1. Navigate to [base_url][example_url]
2. Verify the page loads (no HTTP 500, no blank page, no infinite redirect)
3. Take a browser_snapshot and confirm content is rendered
4. Check that no JavaScript errors appear in the console
5. If auth is required, verify you are not redirected to a login page

Report: PASS if the page loads normally, FAIL with details if any
check fails.
```

**For ux-auditor:** Dispatch one agent per screen. Each agent gets the screen URL, name, and any context from the manifest (auth required, related workflows).

**For adversarial-breaker:** Dispatch one agent per logical flow or feature area. Group related screens together (e.g., the entire settings flow, the entire checkout flow) so the agent can test sequences and state transitions.

### Agent Spawn Templates

For each dispatch, use the Agent tool with the appropriate prompt pattern below. The profile assignment is resolved — pass the specific profile name (from Phase 3, Step 2) to each agent so it does not need to make its own selection decision.

**Loading agent definitions** — Before dispatching any agent, read its definition file to include in the spawn prompt:

1. Use the `Read` tool to read the agent's markdown file (e.g., `agents/smoke-tester.md`)
2. Extract everything BELOW the YAML frontmatter closing `---` delimiter (skip the frontmatter itself)
3. Insert that content at the `[AGENT SYSTEM PROMPT]` marker in the spawn template below

This is required because agents dispatched via the Agent tool do not automatically receive the plugin agent's system prompt — it must be included explicitly in the spawn prompt.

**Smoke-tester template** (dispatched per workflow):

```
You are operating as the smoke-tester QA agent.

Workflow file: [path to workflow file, e.g., ./workflows/desktop-workflows.md]
Auth required: [yes/no]
Auth profile to use: [exact profile name, e.g., "admin"]
Auth profile path: .playwright/profiles/[profile-name].json

To load the auth profile, read the storageState file and run:

  async (page) => {
    const state = <contents of .playwright/profiles/[profile-name].json>;
    await page.context().addCookies(state.cookies);
    if (state.origins) {
      for (const origin of state.origins) {
        if (origin.localStorage && origin.localStorage.length > 0) {
          await page.goto(origin.origin);
          await page.evaluate((items) => {
            for (const { name, value } of items) localStorage.setItem(name, value);
          }, origin.localStorage);
        }
      }
    }
    return 'Profile loaded: [profile-name]';
  }

After loading, verify auth by navigating to [base_url]. If you are
redirected to [loginUrl from profiles.json], the session has expired —
report this and stop.

[AGENT SYSTEM PROMPT — insert the body content of the agent definition file here, excluding YAML frontmatter]

Base URL: [base_url]

Begin your audit now. Parse the workflow file and execute each step
sequentially. Return your findings in the output format specified in
your system prompt.
```

**UX-auditor and adversarial-breaker template** (dispatched per screen or per flow):

Use `example_url` from the manifest (not the raw `url` with dynamic segments) so agents receive a navigable path.

```
You are operating as the [agent-name] QA agent.

Target: [screen name] at [base_url][example_url]
Auth required: [yes/no]
Auth profile to use: [exact profile name, e.g., "admin"]
Auth profile path: .playwright/profiles/[profile-name].json
Related workflows: [workflow refs, if any]

To load the auth profile, read the storageState file and run:

  async (page) => {
    const state = <contents of .playwright/profiles/[profile-name].json>;
    await page.context().addCookies(state.cookies);
    if (state.origins) {
      for (const origin of state.origins) {
        if (origin.localStorage && origin.localStorage.length > 0) {
          await page.goto(origin.origin);
          await page.evaluate((items) => {
            for (const { name, value } of items) localStorage.setItem(name, value);
          }, origin.localStorage);
        }
      }
    }
    return 'Profile loaded: [profile-name]';
  }

After loading, navigate to [full_url]. If you are redirected to
[loginUrl from profiles.json], the session has expired — report this
and stop.

[AGENT SYSTEM PROMPT — insert the body content of the agent definition file here, excluding YAML frontmatter]

Base URL: [base_url]
Screen URL: [full_url]

Begin your audit now. When complete, return your findings in the output
format specified in your system prompt.
```

For the **adversarial-breaker**, if the user selected "all" profiles in Phase 3, Step 2, dispatch the agent with ALL profile names and instruct it to test with each profile as well as unauthenticated:

```
Auth profiles to test:
- admin: .playwright/profiles/admin.json
- user: .playwright/profiles/user.json
- (unauthenticated): do not load any profile

Test auth boundaries by switching between these profiles and the
unauthenticated state. Check whether admin-only screens are accessible
with the "user" profile or unauthenticated.
```

### Sequential Dispatch

Spawn agents **sequentially**, not in parallel. Do NOT batch multiple Agent tool calls in the same response turn. All agents share the same Playwright MCP server and browser instance — parallel dispatches would cause agents to interfere with each other's browser state (e.g., Agent A navigates to `/dashboard` while Agent B navigates to `/settings`, producing invalid snapshots).

For each dispatch:
1. **Clean browser state** — Before spawning the agent, clear all cookies, localStorage, and sessionStorage from the browser to prevent state leakage from previous agents or the pre-flight session validation:
   ```javascript
   async (page) => {
     await page.context().clearCookies();
     await page.evaluate(() => {
       localStorage.clear();
       sessionStorage.clear();
     });
     return 'Browser state cleared for next agent';
   }
   ```
   Each agent is responsible for loading its own profile from scratch.
2. **Spawn the agent** and wait for it to complete. Do not spawn the next agent until you have received and processed the current agent's result.
3. **Log its results** (see Progress Tracking below)
4. **Then spawn the next agent** — only after step 3 is complete.

This is slower than parallel dispatch but produces reliable results. If speed is critical, the user can run multiple `/run-qa` sessions in separate terminals, each with its own Playwright MCP server.

### Progress Tracking

After each agent completes, log its result:

```
✓ [workflow-name] — smoke-tester: 12/12 steps passed
✓ [screen-name] — ux-auditor: 2 major, 5 minor findings
✓ [flow-name] — adversarial-breaker: 1 critical, 3 high findings
```

Track overall progress: `[completed] / [total] dispatches completed`. Note that dispatch units differ by agent type: workflows for smoke-tester, screens for ux-auditor, and flows for adversarial-breaker.

---

## Phase 5: Unified Report

After all agents complete, collect their findings into a single unified report.

### Step 1: Aggregate Results

Merge all agent outputs into a structured report organized by screen, then by agent.

### Step 2: Write the Report

Ensure `./workflows/` exists, then write the report to `./workflows/qa-report.md`:

```markdown
# QA Report — [App Name]

**Date:** [date]
**Base URL:** [url]
**Manifest:** [N] screens
**Agents:** [list of agents run]

## Summary

| Severity | Count |
|----------|-------|
| Critical | [N] |
| High | [N] |
| Medium | [N] |
| Low | [N] |
| Pass | [N] |

## Coverage

| Screen | Smoke | UX | Adversarial |
|--------|-------|----|-------------|
| /dashboard | ✓ Pass | 2 minor | 1 high |
| /settings | ✓ Pass | 1 major | — |
| /login | ✓ Pass | Pass | 1 critical |
| ... | | | |

## Findings by Severity

### Critical
1. [Finding from adversarial-breaker on /login]

### High
1. [Finding from adversarial-breaker on /dashboard]
2. [Finding from ux-auditor on /settings]

### Medium
[...]

### Low
[...]

## Screen Details

### /dashboard
#### Smoke Test — PASS (12/12 steps)
#### UX Audit
[Full rubric output from ux-auditor]
#### Adversarial Audit
[Full findings from adversarial-breaker]

### /settings
[...]
```

### Step 3: Present Summary to User

After writing the report, present a concise summary:

```
## QA Run Complete

Audited [N] screens with [agent names].

Results:
- [N] critical findings (see report)
- [N] high findings
- [N] medium findings
- [N] low findings
- [N] screens passed all checks

Full report: ./workflows/qa-report.md

Would you like me to start fixing the critical and high findings?
```
