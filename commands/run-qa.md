---
description: Discover all screens, confirm the manifest with the user, then dispatch QA agents to every screen
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent, AskUserQuestion
argument-hint: "[smoke|ux|adversarial|performance|mobile|all] [--url URL] [--screenshots]"
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
| `performance` | performance-profiler only |
| `mobile` | mobile-ux-auditor only |
| `all` | All five agents |
| _(none)_ | Ask the user which agent(s) to run |

### URL Flag

`--url URL` sets the base URL of the running application. If not provided, ask the user via `AskUserQuestion` in Phase 3.

### Screenshots Flag

`--screenshots` enables before/after screenshot capture. When set, ux-auditor and mobile-ux-auditor agents will call `playwright-cli -s={session} screenshot` for each screen and save images to `./qa-reports/screenshots/{persona}-{screen}-{timestamp}.png`. The orchestrator creates the `./qa-reports/screenshots/` directory before dispatching agents. Screenshots are referenced in the Phase 6 comparison report when a previous run exists.

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
For performance-profiler: [admin / user / viewer]
For mobile-ux-auditor: [admin / user / viewer]
For adversarial-breaker: [admin / user / viewer, or "all" to test each role]

Default: Use "[first profile name]" for smoke, UX, performance, and mobile, "all" for adversarial.
Accept defaults? (yes / customize)
```

When computing defaults, use the first profile from the discovered list — do not hardcode "user". If a profile named "user" exists, prefer it; otherwise fall back to the first available profile.

The adversarial-breaker benefits from testing with multiple profiles (and unauthenticated) to find auth boundary issues. The smoke-tester, ux-auditor, performance-profiler, and mobile-ux-auditor typically need one consistent profile.

Record the profile assignment — it will be passed to each agent in the dispatch template.

**Session validation** — before dispatching, verify that each assigned profile's session is still active. For each unique profile in the assignment, use a temporary CLI session:

```
playwright-cli -s=qa-preflight open "[base_url]"
playwright-cli -s=qa-preflight state-load ".playwright/profiles/[profile-name].json"
playwright-cli -s=qa-preflight goto "[base_url]"
playwright-cli -s=qa-preflight snapshot
```

Check if the session is still valid:
   a. If the browser was redirected to the profile's `loginUrl` (check `Page URL` in snapshot output), the session has expired
   b. If the final URL is on a different domain (OAuth provider redirect), the session has expired
   c. If login-related elements are visible in the snapshot (sign-in forms, "Log in" buttons), the session has expired

After checking all profiles, close the preflight session:
```
playwright-cli -s=qa-preflight close
```

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
2. ux-auditor — Obsessive UX rubric on each screen (10 categories, binary scorecard)
3. adversarial-breaker — Try to break each flow (deepest)
4. performance-profiler — Measure Web Vitals, bundle size, code patterns (report-only)
5. mobile-ux-auditor — Mobile UX audit at 393x852 viewport (10 categories, iOS + web)
6. All five — Full QA suite

Select one or more (e.g., "1 and 2", or "all"):
```

### Step 4: Create Screenshot Directory (if --screenshots)

If `--screenshots` was passed, create the screenshot output directory:

```bash
mkdir -p ./qa-reports/screenshots
```

This directory is passed to ux-auditor and mobile-ux-auditor agents in their spawn templates.

### Step 5: Validate Manifest for Dispatch

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

Spawn the selected agent(s) using the Agent tool. Every screen in the manifest gets audited, no exceptions.

### Dispatch Strategy

The default strategy is **1 agent per persona**, not 1 agent per screen. Each persona agent receives the full screen list and processes screens sequentially within a single dispatch. This dramatically reduces overhead — a 35-screen app with 3 personas dispatches 3 agents instead of 105, completing in ~43 minutes total instead of hours.

**For smoke-tester:** Dispatch one agent per workflow (not per screen), since the smoke tester follows workflow steps sequentially. If a screen appears in multiple workflows, it gets tested in each. For coverage-gap screens (in manifest but not in any workflow), dispatch an additional smoke-tester agent with a simple instruction: "Navigate to [example_url], verify the page loads without errors (no 500, no blank page, no redirect loop), and report pass/fail."

**Smoke-tester coverage-gap template** (dispatched per uncovered screen):

```
You are operating as the smoke-tester QA agent for a coverage-gap screen
(no workflow exists for this page).

Target: [screen name] at [base_url][example_url]
Auth required: [yes/no]
Auth profile to use: [exact profile name, e.g., "admin"]
Auth profile path: .playwright/profiles/[profile-name].json

To load the auth profile:

  playwright-cli -s={session} state-load ".playwright/profiles/[profile-name].json"

Session name: qa-smoke-gap

There is no workflow file for this screen. Perform a basic smoke check:

1. playwright-cli -s=qa-smoke-gap goto "[base_url][example_url]"
2. Verify the page loads (no HTTP 500, no blank page, no infinite redirect)
3. playwright-cli -s=qa-smoke-gap snapshot — confirm content is rendered
4. playwright-cli -s=qa-smoke-gap console error — check for JS errors
5. If auth is required, verify you are not redirected to a login page

Report: PASS if the page loads normally, FAIL with details if any
check fails.
```

**For ux-auditor:** Dispatch ONE agent for all screens (not per-screen). The agent receives the full screen list from the manifest and audits each screen sequentially, loading auth once and switching between screens. This enables cross-screen consistency checks within a single agent context.

**For performance-profiler:** Dispatch ONE agent for all routes (not per-screen). The agent receives the full route list and profiles each sequentially, then runs a single static analysis pass across the codebase.

**For mobile-ux-auditor:** Dispatch ONE agent for all screens (same as ux-auditor). The agent receives the full screen list, sets 393x852 viewport once, and audits each screen sequentially.

**For adversarial-breaker:** Dispatch ONE agent for all flows. The agent receives the full screen list grouped by feature area and tests sequences, state transitions, and auth boundaries across all screens.

**Summary of dispatch counts:**

| Persona | Dispatch Count | Scope |
|---------|---------------|-------|
| smoke-tester | 1 per workflow + 1 per coverage-gap screen | Workflow-driven |
| ux-auditor | **1 total** | All screens sequentially |
| mobile-ux-auditor | **1 total** | All screens at 393x852 |
| performance-profiler | **1 total** | All routes + static analysis |
| adversarial-breaker | **1 total** | All flows + auth boundaries |

For a typical 35-screen app, running `all` dispatches ~5-7 agents total (depending on workflow count), not 105+. This completes in roughly 40-50 minutes.

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

Session name: qa-smoke
Open your session: playwright-cli -s=qa-smoke open "[base_url]"
Close when done: playwright-cli -s=qa-smoke close

Workflow file: [path to workflow file, e.g., ./workflows/desktop-workflows.md]
Auth required: [yes/no]
Auth profile to use: [exact profile name, e.g., "admin"]
Auth profile path: .playwright/profiles/[profile-name].json

To load the auth profile:

  playwright-cli -s={session} state-load ".playwright/profiles/[profile-name].json"

After loading, verify auth:
  playwright-cli -s={session} goto "[base_url]"
  playwright-cli -s={session} snapshot
If the snapshot shows login UI or the URL is [loginUrl], the session
has expired — report this and stop.

[AGENT SYSTEM PROMPT — insert the body content of the agent definition file here, excluding YAML frontmatter]

Base URL: [base_url]

Begin your audit now. Parse the workflow file and execute each step
sequentially. Return your findings in the output format specified in
your system prompt.
```

**UX-auditor template** (dispatched ONCE for all screens):

Use `example_url` from the manifest (not the raw `url` with dynamic segments) so the agent receives navigable paths.

```
You are operating as the ux-auditor QA agent.

Session name: qa-ux
Open your session: playwright-cli -s=qa-ux open "[base_url]"
Close when done: playwright-cli -s=qa-ux close

Target screens (audit ALL sequentially):
[For each screen in manifest, list:]
  - [screen name]: [base_url][example_url] (auth: [yes/no], workflows: [refs])

Auth profile to use: [exact profile name, e.g., "admin"]
Auth profile path: .playwright/profiles/[profile-name].json

To load the auth profile:

  playwright-cli -s={session} state-load ".playwright/profiles/[profile-name].json"

After loading, verify auth:
  playwright-cli -s={session} goto "[base_url]"
  playwright-cli -s={session} snapshot
If the snapshot shows login UI or the URL is [loginUrl], the session
has expired — report this and stop.

[AGENT SYSTEM PROMPT — insert the body content of agents/ux-auditor.md here, excluding YAML frontmatter]

Base URL: [base_url]

Screenshots: [yes/no — set to yes if --screenshots flag was passed]
Screenshot directory: ./qa-reports/screenshots/

Audit each screen in the target list sequentially. For each screen:
1. playwright-cli -s=qa-ux goto "[screen URL]"
2. If screenshots enabled, run playwright-cli -s=qa-ux screenshot
   and copy to ./qa-reports/screenshots/ux-auditor-{screen-slug}-{timestamp}.png
3. Apply the full 10-category rubric
4. Record findings before moving to the next screen

After all screens are complete, add a Cross-Screen Consistency section
comparing patterns across all inspected screens. Return your findings
in the output format specified in your system prompt.
```

**Adversarial-breaker template** (dispatched ONCE for all flows):

```
You are operating as the adversarial-breaker QA agent.

Session name: qa-adversarial
Open your session: playwright-cli -s=qa-adversarial open "[base_url]"
Close when done: playwright-cli -s=qa-adversarial close

Target screens (attack ALL sequentially, grouped by flow):
[For each screen in manifest, list:]
  - [screen name]: [base_url][example_url] (auth: [yes/no], workflows: [refs])

Auth profile to use: [exact profile name, e.g., "admin"]
Auth profile path: .playwright/profiles/[profile-name].json

To load the auth profile:

  playwright-cli -s={session} state-load ".playwright/profiles/[profile-name].json"

After loading, verify auth:
  playwright-cli -s={session} goto "[base_url]"
  playwright-cli -s={session} snapshot
If the snapshot shows login UI or the URL is the loginUrl, the session
has expired — report this and stop.

[AGENT SYSTEM PROMPT — insert the body content of agents/adversarial-breaker.md here, excluding YAML frontmatter]

Base URL: [base_url]

Group screens by feature area (e.g., auth flow, settings flow, checkout
flow) and attack each group sequentially. Test sequences, state
transitions, and edge cases across related screens. Return your
findings in the output format specified in your system prompt.
```

For the **adversarial-breaker**, if the user selected "all" profiles in Phase 3, Step 2, append to the template:

```
Auth profiles to test:
- admin: .playwright/profiles/admin.json
- user: .playwright/profiles/user.json
- (unauthenticated): do not load any profile

Test auth boundaries by switching between these profiles and the
unauthenticated state. Check whether admin-only screens are accessible
with the "user" profile or unauthenticated.
```

**Performance-profiler template** (dispatched ONCE for all routes, not per-screen):

For performance-profiler: dispatch one agent for ALL routes (not per-screen). The agent profiles each route sequentially and also runs a single static analysis pass across the codebase.

```
You are operating as the performance-profiler QA agent.

Session name: qa-perf
Open your session: playwright-cli -s=qa-perf open "[base_url]"
Close when done: playwright-cli -s=qa-perf close

Target routes: [list all routes from manifest with example_urls]
Auth required: [yes/no]
Auth profile to use: [exact profile name]
Auth profile path: .playwright/profiles/[profile-name].json

To load the auth profile:

  playwright-cli -s={session} state-load ".playwright/profiles/[profile-name].json"

After loading, verify auth by navigating to [base_url]. If redirected to login, the session has expired — report this and stop.

[AGENT SYSTEM PROMPT — insert the body content of agents/performance-profiler.md here, excluding YAML frontmatter]

Base URL: [base_url]

Begin your audit now. Profile each route, run static analysis, and return your findings in the output format specified in your system prompt.
```

**Mobile-ux-auditor template** (dispatched ONCE for all screens):

```
You are operating as the mobile-ux-auditor QA agent.

Session name: qa-mobile
Open your session: playwright-cli -s=qa-mobile open "[base_url]"
Close when done: playwright-cli -s=qa-mobile close

Target screens (audit ALL sequentially at 393x852):
[For each screen in manifest, list:]
  - [screen name]: [base_url][example_url] (auth: [yes/no], workflows: [refs])

Auth profile to use: [exact profile name]
Auth profile path: .playwright/profiles/[profile-name].json

To load the auth profile:

  playwright-cli -s={session} state-load ".playwright/profiles/[profile-name].json"

IMPORTANT: Set mobile viewport before inspection:
  playwright-cli -s=qa-mobile resize 393 852

After loading, verify auth:
  playwright-cli -s={session} goto "[base_url]"
  playwright-cli -s={session} snapshot
If the snapshot shows login UI or the URL is the loginUrl, the session
has expired — report this and stop.

[AGENT SYSTEM PROMPT — insert the body content of agents/mobile-ux-auditor.md here, excluding YAML frontmatter]

Base URL: [base_url]

Screenshots: [yes/no — set to yes if --screenshots flag was passed]
Screenshot directory: ./qa-reports/screenshots/

Audit each screen in the target list sequentially at 393x852 viewport.
For each screen:
1. playwright-cli -s=qa-mobile goto "[screen URL]"
2. If screenshots enabled, run playwright-cli -s=qa-mobile screenshot
   and copy to ./qa-reports/screenshots/mobile-ux-auditor-{screen-slug}-{timestamp}.png
3. Apply the full 10-category mobile rubric
4. Record findings before moving to the next screen

After all screens are complete, add a Cross-Screen Consistency section
comparing mobile-specific patterns. Return your findings in the output
format specified in your system prompt.
```

### Parallel Dispatch

Spawn agents **in parallel**. Each agent uses its own named `playwright-cli` session (e.g., `-s=qa-smoke`, `-s=qa-ux`, `-s=qa-mobile`), so sessions are fully isolated — no shared browser state, no interference between agents.

Batch multiple Agent tool calls in the same response turn to run agents concurrently. Each agent:
1. **Opens its own session** — `playwright-cli -s={session} open "[base_url]"`
2. **Loads its own auth profile** — `playwright-cli -s={session} state-load ".playwright/profiles/[profile].json"`
3. **Operates independently** — navigates, snapshots, clicks without affecting other sessions
4. **Closes its session** when done — `playwright-cli -s={session} close`

No browser state clearing is needed between agents — each session is born clean.

After all agents complete:
1. **Save results** to `./workflows/qa-report-partial.json` (see Incremental Results below)
2. **Log results** (see Progress Tracking below)
3. **Cleanup** — `playwright-cli close-all` as a safety net

For a typical 35-screen app running `all`, this dispatches 5 agents concurrently and completes in roughly 8-12 minutes instead of 40-50 minutes sequential.

### Incremental Results

After each agent completes, write its results to `./workflows/qa-report-partial.json`:

```json
{
  "run_id": "[ISO timestamp of run start]",
  "agents_selected": ["smoke-tester"],
  "base_url": "http://localhost:3000",
  "completed": [
    {
      "dispatch_id": 1,
      "agent": "smoke-tester",
      "target": "desktop-workflows.md",
      "status": "completed",
      "summary": "12/12 steps passed",
      "findings": "[full agent output]"
    }
  ],
  "remaining": ["WF02", "screen:/settings", "..."]
}
```

On resume (if the user re-runs `/run-qa` and a `qa-report-partial.json` exists):

```
Found a partial QA run from [timestamp] with [N] of [M] dispatches completed.

1. Resume from where it stopped (skip [N] completed dispatches)
2. Start a fresh run (discard partial results)
```

If the user resumes, load the completed results and skip those dispatches. Append new results to the same file.

### Progress Tracking

After each agent completes, log its result:

```
✓ [workflow-name] — smoke-tester: 12/12 steps passed
✓ [screen-name] — ux-auditor: 2 major, 5 minor findings
✓ [screen-name] — mobile-ux-auditor: 1 major, 3 minor findings
✓ [all-routes] — performance-profiler: 8/13 checks passed, 3 flagged
✓ [flow-name] — adversarial-breaker: 1 critical, 3 high findings
```

Track overall progress: `[completed] / [total] dispatches completed`. Each persona is a single dispatch (except smoke-tester which dispatches per workflow). A typical `all` run has ~5-7 total dispatches.

---

## Phase 5: Unified Report

After all agents complete, collect their findings into a single unified report.

### Step 1: Aggregate Results

Merge all agent outputs into a structured report organized by screen, then by agent.

### Step 2: Write the Report

Ensure `./workflows/` exists, then write the report to a timestamped file: `./workflows/qa-report-YYYY-MM-DD-HHMMSS.md` (e.g., `qa-report-2026-04-01-143022.md`). This prevents subsequent runs from overwriting previous results. Also create or update a symlink-like reference: write the filename to `./workflows/qa-report-latest.md` as a redirect so other tools can find the most recent report.

Report format:

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

| Screen | Smoke | UX (X/75) | Mobile (X/56) | Perf | Adversarial |
|--------|-------|-----------|---------------|------|-------------|
| /dashboard | ✓ Pass | 62/75, 2 minor | 48/56, 1 minor | 10/13 | 1 high |
| /settings | ✓ Pass | 58/75, 1 major | 45/56, 2 minor | 11/13 | — |
| /login | ✓ Pass | 70/75 | 52/56 | 13/13 | 1 critical |
| ... | | | | | |

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

## Smoke Test Results
(pass/fail per step)

## UX Audit Results
(scorecard X/75 + graded rubric per screen, 10 categories)

## Mobile UX Audit Results
(scorecard X/56 + graded rubric per screen, 10 mobile categories)

## Performance Results
(scorecard X/13 + per-route metrics table + flagged findings)

## Adversarial Results
(findings with severity)

> Only sections for dispatched personas appear in the report.

## Screen Details

### /dashboard
#### Smoke Test — PASS (12/12 steps)
#### UX Audit
[Full rubric output from ux-auditor]
#### Mobile UX Audit
[Full rubric output from mobile-ux-auditor]
#### Performance Profile
[Per-route metrics from performance-profiler]
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

Full report: ./workflows/qa-report-[timestamp].md

Would you like me to start fixing the critical and high findings?
```

After presenting the summary:
1. Delete `./workflows/qa-report-partial.json` if it exists — the partial results have been merged into the final report and are no longer needed.
2. Run `playwright-cli close-all` to clean up any remaining browser sessions.

---

## Phase 6: Comparison Report (Auto-Generated)

This phase runs automatically when a previous QA report exists. It generates an HTML before/after comparison report for visual diffing.

### Step 1: Detect Previous Run

Search for previous reports in `./workflows/`:

```bash
ls -t ./workflows/qa-report-*.md | head -2
```

If only one report exists (the current run), skip Phase 6. If two or more exist, use the second-most-recent as the "before" report and the current run as the "after" report.

### Step 2: Parse Reports

Extract from both reports:
- Per-persona total scores (e.g., UX: 62/75, Mobile: 48/56)
- Per-screen per-category scores
- Finding counts by severity
- Screen-level grades per category

### Step 3: Generate HTML Comparison Report

Write `./qa-reports/comparison-report.html` with the following structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QA Comparison — [App Name]</title>
  <style>
    :root {
      --green: #22c55e; --red: #ef4444; --yellow: #eab308;
      --bg: #0f172a; --surface: #1e293b; --text: #e2e8f0;
      --border: #334155; --muted: #94a3b8;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: var(--bg); color: var(--text); padding: 2rem; }
    .header { text-align: center; margin-bottom: 2rem; }
    .header h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .header .dates { color: var(--muted); font-size: 0.875rem; }

    /* Score delta cards */
    .delta-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                   gap: 1rem; margin-bottom: 2rem; }
    .delta-card { background: var(--surface); border-radius: 12px; padding: 1.25rem;
                  border: 1px solid var(--border); }
    .delta-card .persona { font-size: 0.75rem; text-transform: uppercase;
                           letter-spacing: 0.05em; color: var(--muted); }
    .delta-card .scores { display: flex; align-items: center; gap: 0.75rem;
                          margin-top: 0.5rem; }
    .delta-card .before { font-size: 1.25rem; color: var(--muted);
                          text-decoration: line-through; }
    .delta-card .arrow { color: var(--muted); }
    .delta-card .after { font-size: 1.5rem; font-weight: 700; }
    .delta-card .delta { font-size: 0.875rem; font-weight: 600; margin-top: 0.25rem; }
    .delta.positive { color: var(--green); }
    .delta.negative { color: var(--red); }
    .delta.neutral { color: var(--yellow); }

    /* Filter toggles */
    .filters { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
    .filters button { padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--border);
                      background: var(--surface); color: var(--text); cursor: pointer;
                      font-size: 0.875rem; }
    .filters button.active { background: #3b82f6; border-color: #3b82f6; }

    /* Category breakdown table */
    .breakdown { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
    .breakdown th, .breakdown td { padding: 0.75rem 1rem; text-align: left;
                                    border-bottom: 1px solid var(--border); }
    .breakdown th { font-size: 0.75rem; text-transform: uppercase;
                    color: var(--muted); }
    .breakdown .improved { color: var(--green); }
    .breakdown .regressed { color: var(--red); }
    .breakdown .unchanged { color: var(--muted); }

    /* Screen cards */
    .screen-card { background: var(--surface); border-radius: 12px;
                   border: 1px solid var(--border); margin-bottom: 1rem;
                   overflow: hidden; }
    .screen-card summary { padding: 1rem 1.25rem; cursor: pointer;
                           display: flex; justify-content: space-between;
                           align-items: center; }
    .screen-card summary .title { font-weight: 600; }
    .screen-card summary .tags { display: flex; gap: 0.5rem; }
    .screen-card .tag { font-size: 0.7rem; padding: 0.2rem 0.5rem;
                        border-radius: 4px; }
    .tag.fix-ux { background: #1e3a5f; color: #60a5fa; }
    .tag.fix-mobile { background: #1e3a2f; color: #4ade80; }
    .tag.fix-perf { background: #3a2f1e; color: #fbbf24; }
    .tag.fix-security { background: #3a1e1e; color: #f87171; }
    .screen-card .content { padding: 1.25rem; border-top: 1px solid var(--border); }

    /* Screenshot comparison */
    .screenshot-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
                          margin-top: 1rem; }
    .screenshot-compare img { width: 100%; border-radius: 8px;
                              border: 1px solid var(--border); }
    .screenshot-compare .label { font-size: 0.75rem; color: var(--muted);
                                 text-align: center; margin-top: 0.25rem; }

    /* Hidden by filter */
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>QA Comparison Report</h1>
    <div class="dates">
      <span>Before: [before-date]</span> &mdash;
      <span>After: [after-date]</span>
    </div>
  </div>

  <!-- Score delta cards (before → after per persona) -->
  <div class="delta-cards">
    <!-- Repeat for each persona that was run -->
    <div class="delta-card">
      <div class="persona">UX Auditor</div>
      <div class="scores">
        <span class="before">[before-score]/[total]</span>
        <span class="arrow">&rarr;</span>
        <span class="after">[after-score]/[total]</span>
      </div>
      <div class="delta [positive|negative|neutral]">[+N|-N|0] ([+X%|-X%])</div>
    </div>
    <!-- ... mobile-ux-auditor, performance-profiler, adversarial-breaker, smoke-tester -->
  </div>

  <!-- Filter toggles -->
  <div class="filters">
    <button class="active" data-filter="all">All</button>
    <button data-filter="desktop">Desktop</button>
    <button data-filter="mobile">Mobile</button>
  </div>

  <!-- Category-level breakdown table -->
  <table class="breakdown">
    <thead>
      <tr>
        <th>Category</th>
        <th>Before</th>
        <th>After</th>
        <th>Delta</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <!-- Repeat for each category across all personas -->
      <tr>
        <td>[Category Name]</td>
        <td>[before-score]</td>
        <td>[after-score]</td>
        <td class="[improved|regressed|unchanged]">[+N|-N|0]</td>
        <td>[improved|regressed|unchanged]</td>
      </tr>
    </tbody>
  </table>

  <!-- Expandable screen cards with fix-type tags -->
  <!-- Repeat for each screen -->
  <details class="screen-card" data-type="[desktop|mobile|both]">
    <summary>
      <span class="title">[Screen Name] — [URL]</span>
      <span class="tags">
        <!-- Tag by fix type: which persona found issues -->
        <span class="tag fix-ux">UX</span>
        <span class="tag fix-mobile">Mobile</span>
      </span>
    </summary>
    <div class="content">
      <!-- Per-persona score delta for this screen -->
      <p>UX: [before] &rarr; [after] ([delta])</p>
      <p>Mobile: [before] &rarr; [after] ([delta])</p>

      <!-- Side-by-side screenshot comparison (if --screenshots was used) -->
      <div class="screenshot-compare">
        <div>
          <img src="screenshots/ux-auditor-[screen]-[before-timestamp].png"
               alt="Before — desktop" />
          <div class="label">Before (Desktop)</div>
        </div>
        <div>
          <img src="screenshots/ux-auditor-[screen]-[after-timestamp].png"
               alt="After — desktop" />
          <div class="label">After (Desktop)</div>
        </div>
      </div>
      <div class="screenshot-compare">
        <div>
          <img src="screenshots/mobile-ux-auditor-[screen]-[before-timestamp].png"
               alt="Before — mobile" />
          <div class="label">Before (Mobile)</div>
        </div>
        <div>
          <img src="screenshots/mobile-ux-auditor-[screen]-[after-timestamp].png"
               alt="After — mobile" />
          <div class="label">After (Mobile)</div>
        </div>
      </div>

      <!-- Findings delta -->
      <h4>Fixed</h4>
      <ul><!-- Findings in before but not in after --></ul>
      <h4>New Issues</h4>
      <ul><!-- Findings in after but not in before --></ul>
      <h4>Unchanged</h4>
      <ul><!-- Findings in both --></ul>
    </div>
  </details>

  <script>
    // Filter toggle logic
    document.querySelectorAll('.filters button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filters button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        document.querySelectorAll('.screen-card').forEach(card => {
          if (filter === 'all') {
            card.classList.remove('hidden');
          } else {
            const type = card.dataset.type;
            card.classList.toggle('hidden', type !== filter && type !== 'both');
          }
        });
      });
    });
  </script>
</body>
</html>
```

### Step 4: Present Comparison Summary

After generating the comparison report:

```
## Comparison Report Generated

Compared [before-date] → [after-date] across [N] screens.

Score changes:
- UX Auditor: [before]/[total] → [after]/[total] ([delta])
- Mobile UX: [before]/[total] → [after]/[total] ([delta])
- Performance: [before]/[total] → [after]/[total] ([delta])

[N] findings fixed, [N] new issues, [N] unchanged.

Report: ./qa-reports/comparison-report.html
Open in browser to view side-by-side screenshots and expandable screen cards.
```

### Notes

- The comparison report is self-contained HTML with inline CSS and JS — no external dependencies
- Screenshot comparison requires `--screenshots` to have been used in both the before and after runs
- Screen cards are tagged by fix type (UX, Mobile, Perf, Security) based on which persona's findings changed
- The `data-type` attribute on screen cards enables desktop/mobile filtering
- If no screenshots exist, the screenshot comparison sections are omitted
