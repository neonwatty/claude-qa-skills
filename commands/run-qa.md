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

### Step 2a: Check for Existing Manifest

Look for `/workflows/qa-manifest.json` at the project root.

**If it exists**, read it and present a summary to the user:

```
Found existing QA manifest with [N] screens (last updated [date]).

1. Use this manifest as-is
2. Re-discover and rebuild the manifest
3. Edit the existing manifest (add/remove screens)
```

If the user chooses option 1, skip to Phase 3.

### Step 2b: Scan the Codebase for Routes

Use Glob and Grep to find every route definition. Adapt the search patterns to the detected framework:

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
Exclude: pages/api/**, pages/_app.*, pages/_document.*
Extract route from file path: pages/dashboard/index.tsx → /dashboard
```

**Remix (file-based routing):**
```
Glob: app/routes/**/*.{tsx,jsx,ts,js}
Extract route from filename: app/routes/dashboard.settings.tsx → /dashboard/settings
Note: Remix uses dots as path separators, $ for dynamic segments
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
- Next.js App Router: check `middleware.{ts,js}` at project root for `config.matcher` patterns that define protected routes
- Generic: look for `requireAuth`, `isAuthenticated`, `getServerSession`, `auth()`, protected route wrappers, auth HOCs

### Step 2c: Scan Existing Workflows

Read all workflow files in `/workflows/`:
- `desktop-workflows.md`
- `mobile-workflows.md`
- `multi-user-workflows.md`

For each workflow step, extract the URL/screen it references. Build a map of which screens are covered by which workflow steps.

### Step 2d: Merge and Deduplicate

Combine codebase routes and workflow-referenced screens into a single list. For each screen:

```json
{
  "url": "/dashboard",
  "name": "Dashboard",
  "auth_required": true,
  "source_file": "app/dashboard/page.tsx",
  "discovered_from": ["codebase", "workflow"],
  "workflow_refs": ["WF01-Step3", "WF05-Step1"],
  "notes": ""
}
```

Flag screens that appear in the codebase but are NOT referenced in any workflow — these are coverage gaps.

### Step 2e: Present Manifest to User for Confirmation

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

### Step 2f: Save the Manifest

Write the confirmed manifest to `/workflows/qa-manifest.json`:

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
      "workflow_refs": ["WF01-Step3", "WF05-Step1"]
    }
  ]
}
```

This file should be committed to the repo so future QA runs can reuse or update it.

---

## Phase 3: Pre-Flight Checks

Before dispatching agents, verify everything is ready.

### Step 3a: Base URL

If `--url` was provided, use it. Otherwise, ask the user:

```
What is the base URL of the running app?
(e.g., http://localhost:3000, https://staging.example.com)
```

### Step 3b: Authentication Profiles

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

### Step 3c: Confirm Agent Selection

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

---

## Phase 4: Dispatch Agents

For each screen in the manifest, spawn the selected agent(s) using the Agent tool. This is the mechanical execution phase — every screen in the manifest gets audited, no exceptions.

### Dispatch Strategy

**For smoke-tester:** Dispatch one agent per workflow (not per screen), since the smoke tester follows workflow steps sequentially. If a screen appears in multiple workflows, it gets tested in each.

**For ux-auditor:** Dispatch one agent per screen. Each agent gets the screen URL, name, and any context from the manifest (auth required, related workflows).

**For adversarial-breaker:** Dispatch one agent per logical flow or feature area. Group related screens together (e.g., the entire settings flow, the entire checkout flow) so the agent can test sequences and state transitions.

### Agent Spawn Templates

For each dispatch, use the Agent tool with the appropriate prompt pattern below. The profile assignment is resolved — pass the specific profile name (from Phase 3b) to each agent so it does not need to make its own selection decision.

**Smoke-tester template** (dispatched per workflow):

```
You are operating as the smoke-tester QA agent.

Workflow file: [path to workflow file, e.g., /workflows/desktop-workflows.md]
Auth required: [yes/no]
Auth profile to use: [exact profile name, e.g., "admin"]
Auth profile path: .playwright/profiles/[profile-name].json

To load the auth profile, read the storageState file and run:

  async (page) => {
    const state = <contents of .playwright/profiles/[profile-name].json>;
    await page.context().addCookies(state.cookies);
    return 'Profile loaded: [profile-name]';
  }

After loading, verify auth by navigating to [base_url]. If you are
redirected to [loginUrl from profiles.json], the session has expired —
report this and stop.

[Include the full system prompt from the agent definition]

Base URL: [base_url]

Begin your audit now. Parse the workflow file and execute each step
sequentially. Return your findings in the output format specified in
your system prompt.
```

**UX-auditor and adversarial-breaker template** (dispatched per screen or per flow):

```
You are operating as the [agent-name] QA agent.

Target: [screen name] at [base_url][url_path]
Auth required: [yes/no]
Auth profile to use: [exact profile name, e.g., "admin"]
Auth profile path: .playwright/profiles/[profile-name].json
Related workflows: [workflow refs, if any]

To load the auth profile, read the storageState file and run:

  async (page) => {
    const state = <contents of .playwright/profiles/[profile-name].json>;
    await page.context().addCookies(state.cookies);
    return 'Profile loaded: [profile-name]';
  }

After loading, navigate to [full_url]. If you are redirected to
[loginUrl from profiles.json], the session has expired — report this
and stop.

[Include the full system prompt from the agent definition]

Base URL: [base_url]
Screen URL: [full_url]

Begin your audit now. When complete, return your findings in the output
format specified in your system prompt.
```

For the **adversarial-breaker**, if the user selected "all" profiles in Phase 3b, dispatch the agent with ALL profile names and instruct it to test with each profile as well as unauthenticated:

```
Auth profiles to test:
- admin: .playwright/profiles/admin.json
- user: .playwright/profiles/user.json
- (unauthenticated): do not load any profile

Test auth boundaries by switching between these profiles and the
unauthenticated state. Check whether admin-only screens are accessible
with the "user" profile or unauthenticated.
```

### Parallel Dispatch

Spawn agents in parallel where possible to maximize throughput. Group dispatches into batches — spawn up to 3 agents concurrently, wait for results, then spawn the next batch. This prevents overwhelming the browser.

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

### Step 5a: Aggregate Results

Merge all agent outputs into a structured report organized by screen, then by agent.

### Step 5b: Write the Report

Write the report to `/workflows/qa-report.md`:

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

### Step 5c: Present Summary to User

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

Full report: /workflows/qa-report.md

Would you like me to start fixing the critical and high findings?
```
