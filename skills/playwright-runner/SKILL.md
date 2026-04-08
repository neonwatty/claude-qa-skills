---
name: playwright-runner
description: Executes workflow markdown files interactively via Playwright CLI, stepping through each workflow action in a real browser. Use when the user says "run workflows", "run playwright", "test workflows", "execute workflows", or wants to interactively test their app against workflow documentation. Supports desktop, mobile, and multi-user workflows with authentication.
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
argument-hint: "[desktop|mobile|multi-user] [--url URL]"
---

# Playwright Runner

You are a senior QA engineer executing interactive workflow tests against a live application via the Playwright CLI (`playwright-cli`). Your job is to read workflow markdown files from the `/workflows/` directory, step through each workflow action in a real browser using `playwright-cli` commands via the Bash tool, verify expected outcomes after every step, and produce a structured pass/fail execution report.

Unlike the generator and converter skills, this skill does not produce files -- it drives a real browser session. Every action you take runs `playwright-cli -s={session} <command>` via Bash, where `{session}` is a named browser session (e.g., `runner-desktop`, `runner-mobile`, or `runner-{persona}` for multi-user). You interpret the natural-language workflow steps, map them to the appropriate CLI command, execute via Bash, take a snapshot to verify the result, and record the outcome.

---

## Task List Integration

Task lists track execution progress, provide the user real-time visibility into which workflow and step is currently running, enable session recovery if a run is interrupted, and serve as a structured execution log that doubles as the final report.

### Task Hierarchy

Every run of this skill creates the following task tree. Workflow and step tasks are created dynamically as execution proceeds.

```
[Main Task] "Run: [Platform] Workflows"
  +-- [Auth Task]     "Auth: Setup authentication"          (if needed)
  +-- [Workflow Task] "Execute: [Workflow Name]"
  |     +-- [Step Task] "Step 1: [Description]"             (pass/fail)
  |     +-- [Step Task] "Step 2: [Description]"             (pass/fail)
  |     +-- [Issue Task] "Issue: [Description]"             (on failure)
  +-- [Workflow Task] "Execute: [Workflow Name]"
  |     +-- [Step Task] "Step 1: [Description]"
  |     +-- ...
  +-- [Report Task]   "Report: Execution Summary"
```

Step tasks record pass/fail status in their metadata. Issue tasks are created inline whenever a step fails, capturing the failure details, expected vs actual state, and screenshot path.

### Session Recovery Check

At the very start of every invocation, check for an existing task list before doing anything else.

```
1. Read the current TaskList.
2. If no task list exists -> start from Phase 1.
3. If a task list exists:
   a. Find the last task with status "completed" or "in_progress".
   b. Determine the corresponding workflow and step.
   c. Inform the user: "Resuming from [Workflow Name], Step N."
   d. Skip to that point in execution.
```

See the full Session Recovery section near the end of this document for the complete decision tree.

---

## Arguments

Parse `$ARGUMENTS` to determine execution parameters.

### Platform Filter

The first positional argument specifies which workflow platform to run:

| Argument | Workflow File | Viewport |
|----------|--------------|----------|
| `desktop` | `/workflows/desktop-workflows.md` | Default (1280x720) |
| `mobile` | `/workflows/mobile-workflows.md` | 393x852 (iPhone 14 Pro) |
| `multi-user` | `/workflows/multi-user-workflows.md` | Default (1280x720) |
| _(none)_ | Auto-detect from available files | Depends on file found |

### URL Flag

`--url URL` sets the base URL of the running application. If not provided, the runner asks the user via `AskUserQuestion`.

### Rigor Flag

`--fail-fast` runs in fail-fast mode: only verify that pages load and the happy path completes. Skip DOM assertions and detailed verification. Default (no flag) is thorough mode: full DOM assertions, viewport intersection checks, and detailed verification on every step.

| Flag | Behavior |
|------|----------|
| _(none)_ | **Thorough** — full DOM assertions + wait-for-element polling + viewport checks on every Verify step |
| `--fail-fast` | **Fail-fast** — verify pages load (status 200, key element visible), skip DOM detail checks, stop workflow on any failure |

### Auto-Detection

When no platform argument is given:

1. Use Glob to scan for `/workflows/*-workflows.md`.
2. If exactly one file exists, use it automatically.
3. If multiple files exist, ask the user via `AskUserQuestion`:

```
I found workflow files for multiple platforms:
  - desktop-workflows.md
  - mobile-workflows.md
  - multi-user-workflows.md

Which platform would you like to run?
1. Desktop
2. Mobile
3. Multi-user
4. All (run sequentially)
```

### Example Invocations

```
$ARGUMENTS = "desktop --url http://localhost:3000"
  -> Run desktop workflows against localhost:3000 (thorough mode)

$ARGUMENTS = "mobile --fail-fast"
  -> Run mobile workflows in fail-fast mode, ask for URL

$ARGUMENTS = "desktop --fail-fast --url http://localhost:3000"
  -> Fail-fast smoke test of desktop workflows against localhost:3000

$ARGUMENTS = ""
  -> Auto-detect platform, ask for URL (thorough mode)
```

---

## Phase 1: Discover and Parse Workflows

### Step 1: Locate the Workflow File

Based on the platform argument (or auto-detection), find and read the target workflow file.

```
Use Glob to find:
  - workflows/desktop-workflows.md
  - workflows/mobile-workflows.md
  - workflows/multi-user-workflows.md
```

If the target file does not exist, stop and inform the user:

```
No workflow file found at /workflows/[platform]-workflows.md.
Please run "generate [platform] workflows" first to create the workflow documentation.
```

### Step 2: Parse Workflows

Read the entire workflow file. For each workflow, extract:

1. **Workflow number** -- from the `## Workflow [N]:` heading
2. **Workflow name** -- the descriptive name after the number
3. **Auth requirement** -- from `<!-- auth: required -->` or `<!-- auth: no -->`
4. **Priority** -- from `<!-- priority: core -->`, `<!-- priority: feature -->`, or `<!-- priority: edge -->`
5. **Deprecated flag** -- from `<!-- deprecated: true -->` (skip deprecated workflows)
6. **Personas** -- from `<!-- personas: admin, user, guest -->` (multi-user only)
7. **Preconditions** -- the bullet list under `**Preconditions:**`
8. **Steps** -- each numbered step and its verification sub-steps
9. **Postconditions** -- the bullet list under `**Postconditions:**`

Skip any workflow marked `<!-- deprecated: true -->`. Log skipped workflows:

```
Parsed 25 workflows from desktop-workflows.md.
Skipped 2 deprecated: #7 (Legacy Export), #15 (Old Settings).
Executing 23 active workflows.
```

### Step 3: Determine Base URL

If `--url` was provided, use it. Otherwise, ask the user via `AskUserQuestion`:

```
What is the base URL of your running application?

Examples:
  - http://localhost:3000
  - https://my-app-preview.vercel.app
  - https://staging.myapp.com

Note: The app must be running and accessible before I begin execution.
```

### Step 4: Create the Main Task

```
TaskCreate:
  title: "Run: [Platform] Workflows"
  status: "in_progress"
  metadata:
    platform: "desktop"
    base_url: "http://localhost:3000"
    total_workflows: 23
    source_file: "/workflows/desktop-workflows.md"
```

---

## Phase 2: Authentication Setup

Check all parsed workflows for auth requirements. If any workflow has `<!-- auth: required -->`, authentication must be established before execution begins.

### Step 1: Detect Auth Needs

Scan parsed workflows for:

- `<!-- auth: required -->` -- standard auth needed
- `<!-- personas: admin, user, guest -->` -- multi-user auth needed (one session per persona)

If no workflows require auth, skip to Phase 3.

### Step 2: Check for Saved Profiles

Before asking the user for credentials, check if Playwright authentication profiles have already been set up for this project.

```
1. Check if .playwright/profiles.json exists at the project root.
2. If it exists, read it to discover available profiles.
3. For each profile, check if the corresponding storageState file exists
   at .playwright/profiles/<role-name>.json.
```

**If profiles are found with valid storageState files**, select which profile to use:

- If only one profile exists, use it automatically.
- If multiple profiles exist, present the available profiles with their descriptions and ask the user which one to use for the run:

```
I found [N] authentication profiles for this project:

1. admin — Full admin permissions
2. user — Standard user account
3. viewer — Read-only access

Which profile should I use for this workflow run?
```

Once a profile is selected, load it into the current named session:

```
playwright-cli -s={session} state-load ".playwright/profiles/<selected-profile>.json"
```

If the profile JSON contains a `sessionStorage` field, restore those entries after navigating to the origin:

```
playwright-cli -s={session} goto "<origin>"
playwright-cli -s={session} sessionstorage-set "<name>" "<value>"
```

After loading, navigate to the base URL and verify the session is still valid:

```
playwright-cli -s={session} goto "{base_url}"
playwright-cli -s={session} snapshot
```

1. If the browser is redirected to the profile's `loginUrl` (check the `Page URL` in the snapshot output), the session has expired.
2. If the final URL is on a different domain (e.g., an OAuth provider), the session has expired.
3. If login-related UI is visible in the snapshot instead of the expected page content, the session has expired.

If expiry is detected, inform the user and suggest running `/setup-profiles` to refresh it.

**Step 2.5: Load test data context**

After loading a profile, check if it has a `files` array and/or `acceptance` object in `profiles.json`. If present, store this context for use during Phase 3 execution:

- **Files list**: available test fixtures for this profile
- **Profile-level acceptance**: default verification criteria
- **Per-file overrides**: file-specific acceptance criteria that override profile defaults

This context is used automatically when the runner encounters `Upload` steps during workflow execution.

**If profiles are configured but storageState files are missing**, inform the user:

```
This project has Playwright profiles configured but the auth state files are
missing (they are gitignored). Run /setup-profiles to authenticate.
```

**If no profiles exist**, proceed to Step 3 to ask the user for an auth strategy.

### Step 3: Ask User for Auth Strategy

Use `AskUserQuestion` to determine how to handle authentication:

```
[N] of your workflows require authentication. How would you like to handle login?

1. **Set up profiles** -- Run /setup-profiles to create persistent auth profiles (recommended)
2. **Provide credentials now** -- I will use Playwright to log in via the app's login page
3. **Use existing storageState** -- Provide a path to an auth JSON file
4. **App does not need auth** -- Skip authentication setup
```

### Step 4: Execute Auth Strategy

**Strategy 1: Setup Profiles**

Inform the user to run `/setup-profiles` first, then re-invoke this skill. Profiles persist across sessions and eliminate repeated logins.

**Strategy 2: Credentials Login**

Ask the user for email and password via `AskUserQuestion`:

```
Please provide login credentials.

Email: [user enters email]
Password: [user enters password]
```

Then perform the login via Playwright CLI:

```
1. playwright-cli -s={session} goto "{base_url}/login"
2. playwright-cli -s={session} snapshot                    # find login form fields
3. playwright-cli -s={session} fill {email-ref} "{email}"
4. playwright-cli -s={session} fill {password-ref} "{password}"
5. playwright-cli -s={session} click {submit-ref}
6. playwright-cli -s={session} snapshot                    # verify successful login
7. Record the authenticated browser state for subsequent workflows
```

**Strategy 3: Existing storageState**

Ask the user for the JSON file path, then load it directly:

```
playwright-cli -s={session} state-load "{path-to-json}"
```

**Strategy 4: Skip Auth**

Log that auth was skipped. Workflows marked `<!-- auth: required -->` will be attempted without auth -- they may fail at steps that require a logged-in state, which is useful for testing auth-gate behavior.

### Step 5: Multi-User Auth

For multi-user workflows, authentication must be established for each persona. The runner uses **separate named sessions** -- one per persona (e.g., `runner-admin`, `runner-user`, `runner-guest`). This provides full isolation between personas (no shared cookies, localStorage, or navigation state).

**If profiles exist**, match each persona to a profile:

```
1. For each persona in the workflow's <!-- personas: ... --> list, attempt to match:
   a. Exact match (case-insensitive): persona "Admin" matches profile "admin"
   b. Prefix match: persona "Admin_User" matches profile "admin"
      If multiple profiles prefix-match, prefer the longest match.
      If still ambiguous, treat the persona as unmatched (let the user decide).
   c. If no match found, the persona is unmatched

**Note:** Prefix matching can produce unexpected results (e.g., a "user" profile matching persona "user-admin"). Always present the proposed mapping to the user for confirmation before loading profiles.

2. Present the mapping to the user for confirmation:

I matched your personas to saved profiles:

| Persona | Profile | Description |
|---------|---------|-------------|
| Admin   | admin   | Full admin permissions |
| Host    | host    | Event organizer account |
| Guest1  | guest   | Standard attendee |

Proceed with these mappings? (yes / adjust)
```

If all personas are matched and confirmed, open a separate named session for each persona and load its profile:

```
playwright-cli -s=runner-admin open "{base_url}"
playwright-cli -s=runner-admin state-load ".playwright/profiles/admin.json"

playwright-cli -s=runner-user open "{base_url}"
playwright-cli -s=runner-user state-load ".playwright/profiles/user.json"

playwright-cli -s=runner-guest open "{base_url}"
playwright-cli -s=runner-guest state-load ".playwright/profiles/guest.json"
```

**If some personas are unmatched:**

```
Matched profiles:
- Admin → admin (Full admin permissions)
- Host → host (Event organizer account)

No matching profile found for:
- Guest1
- Viewer

Available unmatched profiles: [list any profiles not yet assigned]

Options:
1. Run /setup-profiles to create the missing profiles (recommended)
2. Manually assign a profile to each unmatched persona
3. Provide credentials for unmatched personas
```

If the user selects option 2, present each unmatched persona with the list of available unassigned profiles and ask the user to pick one.

**If no profiles exist**, ask the user for credentials for each persona via `AskUserQuestion`:

```
Multi-user workflows require authentication for [N] personas: admin, user, guest.

You can either:
1. Run /setup-profiles to create persistent profiles for each persona (recommended)
2. Provide credentials now for each:

1. admin -- Email: [?] Password: [?]
2. user -- Email: [?] Password: [?]
3. guest -- Email: [?] Password: [?]
```

### Step 6: Create Auth Task

```
TaskCreate:
  title: "Auth: Setup authentication"
  status: "completed"
  metadata:
    strategy: "credentials"
    personas_authenticated: 1       # or N for multi-user
    login_verified: true
```

---

## Phase 3: Execute Workflows

This is the core phase. For each non-deprecated workflow, execute every step sequentially using Playwright CLI commands. Verify expected outcomes after each step. Record pass/fail results.

### Execution Order

Workflows are executed in document order (by workflow number). Core workflows run first, then feature workflows, then edge cases. This ensures foundational flows are verified before dependent features.

### Pre-Execution Setup

**For mobile platform:** Set the viewport before starting any workflow.

```
playwright-cli -s=runner-mobile resize 393 852
```

**For multi-user platform:** Verify all persona sessions are open and authenticated.

```
playwright-cli list
```

This should show one session per persona (e.g., `runner-admin`, `runner-user`, `runner-guest`), each with status `open`.

### Per-Workflow Execution

For each workflow:

#### Step 1: Create Workflow Task

```
TaskCreate:
  title: "Execute: [Workflow Name]"
  status: "in_progress"
  metadata:
    workflow_number: 3
    priority: "core"
    total_steps: 8
    steps_passed: 0
    steps_failed: 0
```

#### Step 2: Check Preconditions

Read the workflow's `**Preconditions:**` block. For each precondition:

- **"User is logged in"** -- Verify auth was established in Phase 2. If not, log a warning and proceed (the workflow may fail at auth-gated steps).
- **"At least N [items] exist"** -- Navigate to the relevant listing page and verify via `playwright-cli -s={session} snapshot`. If the precondition is not met, log a warning in the workflow task metadata.
- **"Feature flag [name] is enabled"** -- Log as an unchecked precondition (cannot verify feature flags from the browser).

#### Step 3: Execute Each Step

For each numbered step in the workflow, create a step task and execute the corresponding Playwright CLI command.

```
TaskCreate:
  title: "Step 1: Navigate to dashboard"
  status: "in_progress"
  metadata:
    workflow: 3
    step_number: 1
    action: "Navigate to /dashboard"
    expected: "Dashboard heading is visible"
```

**Interpretation and execution:** Read the natural-language step, determine the appropriate Playwright CLI command, execute it, then verify the expected outcome.

#### Step 4: Verify After Each Step

After every action, take a snapshot, visually inspect the result, AND run a DOM assertion for hard evidence.

```
1. Execute the action (navigate, click, type, etc.) via playwright-cli
2. playwright-cli -s={session} snapshot to capture the current page state
3. Examine the snapshot for the expected outcome (visual check)
4. Run a DOM assertion via eval to collect hard evidence:

   For Verify steps: identify the key element from the snapshot's accessibility
   tree (by its ref), then run eval with that ref to check:

   playwright-cli -s={session} eval "(element) => {
     if (!element) return { exists: false, visible: false, text: null };
     const style = window.getComputedStyle(element);
     const rect = element.getBoundingClientRect();
     const inViewport = rect.top < window.innerHeight && rect.bottom > 0
       && rect.left < window.innerWidth && rect.right > 0;
     return {
       exists: true,
       visible: style.display !== 'none'
         && style.visibility !== 'hidden'
         && style.opacity !== '0'
         && rect.width > 0 && rect.height > 0,
       inViewport,
       text: element.textContent?.trim().substring(0, 200) || null,
       tagName: element.tagName.toLowerCase(),
     };
   }" {ref}

5. Record BOTH the visual assessment AND the DOM result in the step task:

   TaskUpdate:
     title: "Step N: [Description]"
     status: "completed"
     metadata:
       result: "pass"
       visual: "Success toast visible in snapshot"
       dom_check: "exists=true, visible=true, text='Changes saved'"

6. If visual and DOM checks disagree:
   - Trust DOM for existence and text content (DOM is authoritative).
   - Trust visual for visibility and layout (CSS rendering, z-index
     occlusion, and overflow clipping are not captured by DOM checks).
   - Mark the step as PASS WITH DISCREPANCY and record both assessments:

   TaskUpdate:
     title: "Step N: [Description]"
     status: "completed"
     metadata:
       result: "pass_with_discrepancy"
       visual: "Element appears hidden behind modal overlay"
       dom_check: "exists=true, visible=true, text='Submit'"
       discrepancy: "DOM reports visible but visual shows occlusion by z-index"

   Do NOT auto-resolve the conflict. Flag it for human review in the
   workflow summary.

7. If both visual and DOM checks fail: mark step as failed, create Issue task.
```

**Fail-fast mode (`--fail-fast`):** When the `--fail-fast` flag is set, skip DOM assertions and detailed verification entirely. For Verify steps, take a snapshot and do a visual pass/fail check only. Do not run `playwright-cli -s={session} eval` or wait-for-element polling for Verify steps. Stop the entire run on the first step failure (no continuation). Fail-fast mode is a smoke test: does the happy path complete without errors?

**When to skip the DOM assertion (thorough mode):** For action steps that are not Verify steps (e.g., "Click the Submit button", "Type text in field"), the DOM assertion is optional. The snapshot-first execution pattern already confirms the action succeeded. DOM assertions are REQUIRED for all Verify steps in thorough mode.

**Wait-before-assert pattern:** For ALL Verify steps in thorough mode, poll the snapshot BEFORE running the DOM assertion. The CLI has no `wait_for` command, so use a polling pattern:

```bash
# Wait for expected text to appear (max 3 seconds, poll every 500ms)
for i in 1 2 3 4 5 6; do
  OUTPUT=$(playwright-cli -s={session} snapshot --raw 2>&1)
  if echo "$OUTPUT" | grep -q "{expected text}"; then break; fi
  sleep 0.5
done
```

- **Text checks:** Poll snapshot for expected text (max 3s)
- **State checks:** Poll `eval` for attribute/state (disabled, checked, aria-expanded) with 2-3s max
- **Element appearance:** Poll snapshot for element text (max 3s)
- **Text disappearance:** Poll snapshot, break when text is NOT found (invert the grep: `! grep -q`)

This is unconditional — do not try to judge whether the element is "already present" vs. "appearing." The cost is a few seconds per Verify step; the benefit is eliminating an entire class of intermittent false negatives from SPA re-renders, animations, and async data loading.

**In-viewport refinement:** The DOM assertion returns `inViewport: true/false`. Distinguish between two failure modes:

- **Never rendered** — element is not in the DOM, or has zero dimensions (`rect.width === 0 || rect.height === 0`). This is a **failure**.
- **Scrolled out of view** — element exists with non-zero dimensions but its bounding rect is outside the viewport. This is **not a failure** if the user just interacted with elements in that area (e.g., filled a long form and the confirmation appeared below the fold). Flag as a note, not a failure.

When a Verify step asserts something "is visible" or "appears," check `inViewport`. If `visible: true` but `inViewport: false`, record in evidence: `viewport_note: "element exists and is rendered but requires scrolling to view"`.

**Shadow DOM detection:** Before running DOM assertions, check if the target element is inside a Shadow DOM:

```bash
playwright-cli -s={session} eval "(element) => {
  const root = element.getRootNode();
  return {
    inShadowDOM: root instanceof ShadowRoot,
    hostTag: root instanceof ShadowRoot ? root.host.tagName.toLowerCase() : null
  };
}" {ref}
```

If `inShadowDOM` is true: flag `dom_check: "text may be inaccurate — shadow DOM element (host: <hostTag>)"` and fall back to visual verification for text content. DOM checks for existence and visibility remain valid.

**Cross-origin iframe detection:** Before running DOM assertions, check if the target element is inside a cross-origin iframe:

```bash
playwright-cli -s={session} eval "(element) => {
  let doc = element.ownerDocument;
  let inIframe = false;
  let crossOrigin = false;
  try {
    while (doc !== doc.defaultView?.parent?.document) {
      inIframe = true;
      doc = doc.defaultView.parent.document;
    }
  } catch (e) {
    crossOrigin = true;
  }
  return { inIframe, crossOrigin };
}" {ref}
```

If `crossOrigin` is true: flag `dom_check: "unavailable — cross-origin iframe context"` and fall back to visual-only verification.

### Fallback Handling Table

| Situation | Detection | Behavior |
|-----------|-----------|----------|
| Shadow DOM element | `element.getRootNode() instanceof ShadowRoot` | Flag `dom_check: "text may be inaccurate — shadow DOM element"`, fall back to visual for text |
| Cross-origin iframe | `SecurityError` walking `ownerDocument` ancestry | Flag `dom_check: "unavailable — iframe context"`, fall back to visual |
| `eval` failure (JS error, timeout, stale ref) | Caught at invocation | Fall back to visual, log failure reason in evidence metadata |
| Visual/DOM conflict | Step 4 vs step 5 disagreement | DOM wins for pass/fail; report discrepancy with both results for user review |

### Structured Evidence Log

Every Verify step in thorough mode must produce a structured evidence entry in the step task metadata:

```yaml
evidence:
  method: "dom"              # "dom" | "visual" | "both"
  fallback_used: false       # true if DOM was unavailable and visual was used instead
  fallback_reason: null      # "shadow_dom" | "cross_origin_iframe" | "evaluate_error" | null
  dom_result:
    exists: true
    visible: true
    inViewport: true
    text: "Changes saved"
  visual_result: "Success toast visible in snapshot"
  discrepancy: null          # Description if dom and visual disagree, null otherwise
```

When both DOM and visual results are available, record both. This evidence log enables the validation subagent to audit whether DOM assertions were actually attempted.

### Runner Feedback Output

When the runner encounters issues during execution that indicate problems with the source workflows (not runtime failures), write a `runner-feedback.md` file alongside the execution report. The validation subagent consults this file on subsequent validation runs.

Write to `/workflows/runner-feedback.md` when any of these are found:

| Issue Type | When Triggered | What to Record |
|-----------|----------------|----------------|
| Ambiguous selector | Step marked `"ambiguous"` — multiple elements matched | Workflow #, step #, element description, number of matches |
| Missing auth precondition | Auth-required step fails because session is not established | Workflow #, step #, what auth state was expected |
| Un-navigable step | Navigation fails (404, redirect loop, unreachable route) | Workflow #, step #, target URL, HTTP status |
| Stale element reference | Element ref from snapshot no longer valid | Workflow #, step #, element description |
| Timing-sensitive failure | Step fails intermittently (passes on retry or with longer wait) | Workflow #, step #, wait duration used |

Format:
```markdown
# Runner Feedback

> Generated by playwright-runner on [date]
> Source: [workflow file]

## Issues

### Ambiguous Selectors
- Workflow 3, Step 4: "Submit button" matched 2 elements (form submit + modal submit)

### Missing Auth
- Workflow 7, Step 1: Expected authenticated session but got redirected to /login

### Un-navigable Steps
- Workflow 12, Step 1: /admin/analytics returned 404
```

#### Step 5: Handle Step Failure

On failure, do NOT abort the workflow. Instead:

1. Take a screenshot for evidence: `playwright-cli -s={session} screenshot`
2. Create an Issue task with failure details:

```
TaskCreate:
  title: "Issue: [Brief description of failure]"
  status: "completed"
  metadata:
    workflow: 3
    step_number: 4
    action: "Click the 'Publish' button"
    expected: "Success toast appears"
    actual: "Button not found in snapshot"
    screenshot: "step-3-4-failure.png"
```

3. Attempt to continue with the next step. If the failure makes subsequent steps impossible (e.g., a navigation failure means all following steps on that page will fail), log a warning and skip remaining steps in that workflow.

#### Step 6: Multi-User Step Execution

For multi-user workflows, steps are tagged with a persona (e.g., `[admin]`, `[user]`). Before executing each step:

1. Identify the persona tag in the step text.
2. Use the persona's named session for all CLI commands.
3. Execute the step action in that session.
4. Take a snapshot to verify the outcome.

```
Example multi-user workflow step:

  "[admin] Navigate to /admin/users"
    1. playwright-cli -s=runner-admin goto "{base_url}/admin/users"
    2. playwright-cli -s=runner-admin snapshot
```

When a step requires verifying that one persona's action is visible to another persona, use the other persona's session:

```
  "[admin] Approve the user's post"
    1. playwright-cli -s=runner-admin click {approve-ref}
    2. playwright-cli -s=runner-admin snapshot    # verify approval in admin view

  "[user] Verify the post shows as approved"
    1. playwright-cli -s=runner-user reload
    2. playwright-cli -s=runner-user snapshot     # verify approval visible to user
```

No tab switching needed — each persona has its own isolated browser session.

#### Step 7: Complete Workflow Task

After all steps in a workflow have been executed:

```
TaskUpdate:
  title: "Execute: [Workflow Name]"
  status: "completed"
  metadata:
    workflow_number: 3
    total_steps: 8
    steps_passed: 7
    steps_failed: 1
    result: "partial"    # "passed" | "failed" | "partial"
```

Result values: `"passed"` if all steps passed, `"failed"` if all steps failed, `"partial"` if some passed and some failed.

---

## Action Mapping Reference

This table maps workflow natural language to Playwright CLI commands. This is the primary reference for interpreting workflow steps.

All commands below are run via the Bash tool. `{session}` is the named session (e.g., `runner-desktop`).

### Navigation

| Workflow Language | CLI Command (via Bash) |
|---|---|
| Navigate to \[URL\] | `playwright-cli -s={session} goto "{base_url}{URL}"` |
| Navigate to the [page name] page | `playwright-cli -s={session} goto "{base_url}/[inferred-route]"` |
| Go back to the previous page | `playwright-cli -s={session} go-back` |
| Refresh the page | `playwright-cli -s={session} reload` |

### Click Actions

| Workflow Language | CLI Command (via Bash) |
|---|---|
| Click the "[label]" button | `playwright-cli -s={session} snapshot` to find the button ref, then `playwright-cli -s={session} click {ref}` |
| Click the "[label]" link | `playwright-cli -s={session} snapshot` to find the link ref, then `playwright-cli -s={session} click {ref}` |
| Click the "[label]" menu item | `playwright-cli -s={session} snapshot` to find the menu item ref, then `playwright-cli -s={session} click {ref}` |
| Click the first [item] in the list | `playwright-cli -s={session} snapshot` to find the first item ref, then `playwright-cli -s={session} click {ref}` |
| Double-click [element] | `playwright-cli -s={session} dblclick {ref}` |

### Text Input

| Workflow Language | CLI Command (via Bash) |
|---|---|
| Type "[text]" in the [field name] field | `playwright-cli -s={session} snapshot` to find the field ref, then `playwright-cli -s={session} fill {ref} "[text]"` |
| Clear the [field name] field | `playwright-cli -s={session} snapshot` to find the field ref, then `playwright-cli -s={session} fill {ref} ""` |
| Type "[text]" and press Enter | `playwright-cli -s={session} fill {ref} "[text]"` then `playwright-cli -s={session} press Enter` |

### Form Interactions

| Workflow Language | CLI Command (via Bash) |
|---|---|
| Select "[option]" from the [dropdown] | `playwright-cli -s={session} select {ref} "[option]"` |
| Check the "[label]" checkbox | `playwright-cli -s={session} check {ref}` |
| Uncheck the "[label]" checkbox | `playwright-cli -s={session} uncheck {ref}` |
| Fill in [field] with "[value]" | `playwright-cli -s={session} fill {ref} "[value]"` |

### Mouse Actions

| Workflow Language | CLI Command (via Bash) |
|---|---|
| Hover over the "[label]" [element] | `playwright-cli -s={session} hover {ref}` |
| Drag "[source]" to "[target]" | `playwright-cli -s={session} drag {source-ref} {target-ref}` |
| Scroll down to [element/section] | `playwright-cli -s={session} snapshot` to find the target element ref, then `playwright-cli -s={session} eval "(element) => element.scrollIntoView({ behavior: 'smooth', block: 'center' })" {ref}` |

### Keyboard Actions

| Workflow Language | CLI Command (via Bash) |
|---|---|
| Press [Key] | `playwright-cli -s={session} press [Key]` |
| Press Escape to close the modal | `playwright-cli -s={session} press Escape` |
| Press Enter to submit | `playwright-cli -s={session} press Enter` |
| Press Tab to move to next field | `playwright-cli -s={session} press Tab` |

### Verification Actions

| Workflow Language | CLI Command (via Bash) |
|---|---|
| Verify [element] is visible | `playwright-cli -s={session} snapshot` then check for element in output |
| Verify text "[text]" appears | `playwright-cli -s={session} snapshot` then check for text in output |
| Verify URL contains [path] | `playwright-cli -s={session} eval "() => window.location.href"` then check result |
| Verify [element] has text "[text]" | `playwright-cli -s={session} snapshot` then check element text matches |
| Verify page title is "[title]" | `playwright-cli -s={session} eval "() => document.title"` then check result |

### Wait Actions

| Workflow Language | CLI Command (via Bash) |
|---|---|
| Wait for [element] to appear | Poll `playwright-cli -s={session} snapshot` in a loop (max 3s, 500ms interval), check for text |
| Wait for [element] to disappear | Poll `playwright-cli -s={session} snapshot` in a loop, check text is gone |
| Wait for [N] seconds | `sleep [N]` |
| Wait for loading to complete | Poll `playwright-cli -s={session} snapshot` in a loop, check "Loading" text is gone |

### File Upload

| Workflow Language | CLI Command (via Bash) |
|---|---|
| Upload "[filename]" | `playwright-cli -s={session} upload "[absolute-path]"` |

#### Test Data File Resolution

When executing an `Upload` step, resolve the file to upload using this priority:

1. **Workflow specifies a path**: If the Upload step names a specific file (e.g., `Upload "test-fixtures/valid-deck.pptx"`), use that path directly. Convert relative paths to absolute paths from the project root.
2. **Profile has matching file**: If the Upload step names a filename without a path (e.g., `Upload "valid-deck.pptx"`), check the loaded profile's `files` array for a matching entry by filename. If found, use its `path` or download from its `url`.
3. **Profile has files, step is generic**: If the Upload step uses a generic description (e.g., `Upload a file to the dropzone`) and the profile has `files`, present the available files to the user and ask which one to use.
4. **No profile files**: Execute the Upload step as-is — the user provides the file interactively.

#### Acceptance Criteria Verification

After an `Upload` step completes, if the loaded profile has `acceptance` criteria (and/or the selected file has overrides), automatically verify each applicable criterion:

1. **Compute effective criteria**: Shallow-merge the file-level `acceptance` (if any) over the profile-level `acceptance`:
   ```
   effective = { ...profile.acceptance, ...file.acceptance }
   ```

2. **Verify each criterion** by inspecting the current page state via snapshot:

   | Criterion | Verification Method |
   |-----------|-------------------|
   | `uploadAccepted: true` | Snapshot shows no error toast/message/validation error after upload |
   | `uploadAccepted: false` | Snapshot shows an error message or validation error |
   | `processingCompletes: true` | Poll snapshots until a processing indicator resolves to a terminal state (max 60s) |
   | `resultDownloadable: true` | Snapshot shows a download button, link, or "completed" indicator |
   | `errorExpected: true` | Snapshot shows an error message and app is still functional (not crashed) |
   | `expectedStatus: "X"` | Snapshot contains text matching "X" in a status badge/indicator area |

3. **Record results** in the execution output:

   ```
   Upload acceptance verification:
     ✓ uploadAccepted: PASS (no error message displayed)
     ✓ processingCompletes: PASS (status reached "clear" after 12s)
     ○ resultDownloadable: INCONCLUSIVE (no clear download indicator found)
   ```

   Use ✓ for PASS, ✗ for FAIL, ○ for INCONCLUSIVE (criterion could not be conclusively verified from the snapshot).

4. **Do not block on failures**: Record the result and continue execution. Acceptance verification is observational, not a gate.

### Session Management (Multi-User)

| Workflow Language | CLI Command (via Bash) |
|---|---|
| Switch to [persona] view | Use the persona's named session: `playwright-cli -s=runner-{persona} ...` |
| Open a new session for [persona] | `playwright-cli -s=runner-{persona} open "{base_url}"` |
| List all active sessions | `playwright-cli list` |

### Screenshots and Debugging

| Workflow Language | CLI Command (via Bash) |
|---|---|
| Take a screenshot | `playwright-cli -s={session} screenshot` |
| Capture current page state | `playwright-cli -s={session} snapshot` |
| Check console for errors | `playwright-cli -s={session} console error` |

---

## Step Interpretation Guide

For every step, follow this sequence: (1) check for a persona tag like `[admin]` and use that persona's named session (`runner-admin`), (2) identify the primary verb and map it to the Action Mapping Reference table above, (3) for element-targeting actions, run `playwright-cli -s={session} snapshot` first, find the target element by text/label/placeholder/testid, extract its ref, then execute, (4) after the action, run `playwright-cli -s={session} snapshot` again and check the verification sub-step for pass/fail.

### Handling Ambiguous Steps

When a step references an element ambiguously (e.g., "Click the button" without specifying which), take a snapshot via `playwright-cli -s={session} snapshot`, list matching elements, click the single match or best-guess from context if multiple exist, and mark the step `"ambiguous"` rather than `"failed"` if the result is unexpected.

### Handling MANUAL Steps

Steps marked `[MANUAL]` cannot be executed via Playwright CLI. Create a step task with `result: "skipped"` and `reason: "manual_step"`, then continue with the next automatable step.

---

## Phase 4: Execution Report

After all workflows have been executed, generate a structured summary.

### Step 1: Create Report Task

```
TaskCreate:
  title: "Report: Execution Summary"
  status: "in_progress"
```

### Step 2: Compile Results

Iterate through all workflow and step tasks to compile the final report. Calculate:

- Total workflows executed
- Workflows passed (all steps passed)
- Workflows failed (any step failed)
- Workflows partial (mix of pass/fail)
- Total steps executed
- Steps passed / failed / skipped
- Issues found (count of Issue tasks)

### Step 3: Present Report

Present the execution report to the user in this format:

```
Workflow Execution Report
=========================
Platform: [desktop/mobile/multi-user] | Base URL: [URL] | Date: [date]

Overall: [X] passed, [Y] failed, [Z] partial out of [N] workflows

Workflow Results:
  [pass] Workflow 1: User Registration (8/8 steps)
  [FAIL] Workflow 3: Create New Post (6/8 steps)
    - Step 4 FAILED: "Publish" button not found
    - Step 7 FAILED: URL did not change to /posts/

Issues: [N] total (each with expected/actual state and screenshot path)

Summary: [N] workflows, [S] steps, [P] passed, [F] failed, [M] skipped
```

**Fail-fast mode report:** When running in fail-fast mode, the report format changes:

```
Overall: [X] passed, [Y] failed, [Z] skipped (not attempted) out of [N] workflows
```

The "skipped" count represents workflows that were never started because the runner stopped on the first failure. Partial results are not possible in fail-fast mode — a workflow either passes completely or the entire run stops.

### Step 4: Write Report File

Write the execution report to `/workflows/execution-report-[platform]-[date].md`:

```
1. Format the report as markdown.
2. Write to /workflows/execution-report-[platform]-[YYYY-MM-DD].md.
3. Inform the user of the file location.
```

### Step 5: Complete Report and Main Tasks

```
TaskUpdate:
  title: "Report: Execution Summary"
  status: "completed"
  metadata:
    report_path: "/workflows/execution-report-desktop-2025-01-20.md"
    workflows_passed: 20
    workflows_failed: 2
    workflows_partial: 1
    total_steps: 142
    steps_passed: 136
    steps_failed: 4
    steps_skipped: 2
```

```
TaskUpdate:
  title: "Run: [Platform] Workflows"
  status: "completed"
  metadata:
    platform: "desktop"
    base_url: "http://localhost:3000"
    result: "partial"
    workflows_passed: 20
    workflows_failed: 2
    workflows_partial: 1
    issues_found: 3
    report_path: "/workflows/execution-report-desktop-2025-01-20.md"
```

### Final Summary

Present the user with a completion message:

```
Workflow execution complete.

Report: /workflows/execution-report-desktop-2025-01-20.md

Results: 20 passed, 2 failed, 1 partial (23 total)
Issues: 3 issues captured with screenshots

Next steps:
  - Review the execution report for failure details
  - Fix the issues identified in the report
  - Re-run with "run desktop workflows" to verify fixes
  - Convert passing workflows to CI tests with "convert desktop workflows to playwright"
```

---

## Phase 5: Session Reflection

Read `references/reflection-protocol.md` and execute it before finishing.

---

## Session Recovery

If the skill is invoked and an existing task list is found, use this decision tree to determine where to resume.

### Decision Tree

```
Check TaskList for "Run: [Platform] Workflows"

CASE 1: No task list exists
  -> Start from Phase 1

CASE 2: Auth task is "in_progress"
  -> Authentication was started but not completed
  -> Re-attempt authentication from Phase 2

CASE 3: Auth task is "completed", one or more workflow tasks exist
  -> Find the last workflow task with status "in_progress"
  -> Find the last step task within that workflow
  -> If step is "in_progress": re-attempt that step
  -> If step is "completed": move to the next step
  -> Resume execution from that point

CASE 4: All workflow tasks are "completed", no Report task
  -> All workflows have been executed
  -> Resume from Phase 4 (generate report)

CASE 5: Report task is "completed"
  -> Everything is done
  -> Show the existing report and ask if the user wants to re-run

CASE 6: Some workflow tasks are "completed", none "in_progress"
  -> Execution was interrupted between workflows
  -> Find the first workflow task with status "pending" or missing
  -> Resume from that workflow
```

### Always Inform the User When Resuming

```
I found an existing execution session for [platform] workflows.

Current state: [describe where things left off]
  - Workflows completed: [N] of [M]
  - Last workflow: [name]
  - Last step: [step description]

I will resume from [next workflow/step]. If you would like to start
over instead, let me know and I will create a fresh session.
```

---

## Mobile Execution Details

When running mobile workflows, the runner must simulate a mobile viewport and account for touch-oriented UI patterns.

### Viewport Setup

Before executing any mobile workflow step, set the viewport:

```
playwright-cli -s=runner-mobile resize 393 852
```

This simulates an iPhone 14 Pro screen. The viewport must be set once at the start and maintained throughout execution.

### Mobile-Specific Action Mapping

Mobile workflows may use touch-oriented language. Map these to equivalent Playwright CLI commands:

| Mobile Workflow Language | CLI Command (via Bash) |
|---|---|
| Tap the "[label]" button | `playwright-cli -s={session} click {ref}` (tap = click in Playwright) |
| Swipe left on [element] | `playwright-cli -s={session} eval "() => { ... }" {ref}` to simulate touch swipe, or `playwright-cli -s={session} press ArrowLeft` |
| Swipe down to refresh | `playwright-cli -s={session} reload` |
| Long-press [element] | `playwright-cli -s={session} click {ref}` (long-press not directly supported; log limitation) |
| Pull down to refresh | `playwright-cli -s={session} reload` |
| Tap the back arrow | `playwright-cli -s={session} go-back` |
| Scroll to bottom of list | `playwright-cli -s={session} eval "() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })"` |

### Mobile Verification Patterns

Mobile layouts differ from desktop. When verifying mobile-specific elements:

- **Bottom navigation bars** -- Verify via snapshot that bottom nav items are visible.
- **Hamburger menus** -- Click the menu icon first, then verify the slide-out menu appears via snapshot.
- **Sticky headers** -- Scroll down, then verify the header remains visible in the snapshot.
- **Touch targets** -- Log if elements appear smaller than 44x44px (can measure via `eval` with `getBoundingClientRect()`).

---

## Multi-User Execution Details

Multi-user workflows involve multiple personas acting concurrently or sequentially in the same application. The runner uses separate browser tabs to simulate each persona.

### Session Management

```
Persona-to-session mapping (established during Phase 2):
  admin -> runner-admin
  user  -> runner-user
  guest -> runner-guest
```

Before each persona-tagged step:

```
1. Read the persona tag: [admin], [user], [guest]
2. Use that persona's named session for all commands
3. Execute the step: playwright-cli -s=runner-{persona} <command>
4. playwright-cli -s=runner-{persona} snapshot to verify the outcome
```

### Cross-Persona Verification

Many multi-user workflows require verifying that one persona's action is visible to another. The pattern is:

```
Step N: [admin] Approve the post
  1. playwright-cli -s=runner-admin click {approve-ref}
  2. playwright-cli -s=runner-admin snapshot       # verify in admin view

Step N+1: [user] Verify post shows as approved
  1. playwright-cli -s=runner-user reload
  2. playwright-cli -s=runner-user snapshot         # verify in user view
```

No tab switching needed — each persona has its own fully isolated session.

### Concurrency Simulation

True concurrency is not possible with sequential tab switching. For workflows that specify "simultaneously" or "at the same time," execute the actions in rapid sequence:

```
"[admin] and [user] both open the document editor"
  1. playwright-cli -s=runner-admin goto "{base_url}/editor/doc-1"
  2. playwright-cli -s=runner-user goto "{base_url}/editor/doc-1"
  3. playwright-cli -s=runner-admin snapshot    # verify editor loaded
  4. playwright-cli -s=runner-user snapshot     # verify editor loaded + admin's presence
```

With separate sessions, steps 1 and 2 can even be run concurrently (via parallel Bash calls).

Log in the step metadata that true concurrency was simulated via sequential execution.

### Persona Credential Management

During Phase 2, store persona credentials in memory for the session:

```
personas = {
  admin: { email: "admin@example.com", tab_index: 0 },
  user:  { email: "user@example.com",  tab_index: 1 },
  guest: { email: "guest@example.com", tab_index: 2 }
}
```

Never write credentials to disk or include them in task metadata, reports, or output files.

---

## Error Handling

### Application Not Running

If `playwright-cli -s={session} goto` to the base URL fails or returns an error page:

```
1. Inform the user: "Cannot reach [base_url]. Is the application running?"
2. Use AskUserQuestion to ask if they want to:
   a. Provide a different URL
   b. Wait and retry
   c. Cancel execution
3. If retry: sleep 5, then attempt navigation again.
```

### Authentication Failure

If the login flow does not result in a successful redirect:

```
1. Run playwright-cli -s={session} snapshot to capture the current state.
2. Check for error messages in the snapshot (e.g., "Invalid credentials").
3. Inform the user of the specific error.
4. Ask if they want to provide different credentials or skip auth.
```

### Element Not Found

When a step references an element that cannot be found in the snapshot:

```
1. Run playwright-cli -s={session} snapshot.
2. Log the full snapshot content in the step task metadata.
3. Mark the step as "failed" with reason "element_not_found".
4. Include the element description and what was found instead.
5. Continue to the next step.
```

### Timeout / Page Load Failure

If a page does not load within a reasonable time:

```
1. sleep 10
2. playwright-cli -s={session} snapshot to check if the page eventually loaded.
3. If still not loaded, mark the step as "failed" with reason "timeout".
4. playwright-cli -s={session} screenshot for evidence.
5. Continue to the next step.
```

### Unexpected Dialog / Popup

If a dialog appears unexpectedly during execution:

```
1. playwright-cli -s={session} dialog-accept (dismiss it to continue).
2. Log the dialog in the step task metadata.
3. Continue with the current step.
```

### Browser Console Errors

At the end of each workflow, optionally check for console errors:

```
1. playwright-cli -s={session} console error
2. If errors are found, log them in the workflow task metadata.
3. These do not cause step failures but are included in the report.
```

---

## Workflow Writing Standards Compatibility

The runner is fully compatible with the Workflow Writing Standards used by the generator skills. All standard verb forms (Navigate, Click, Type, Select, Check, Uncheck, Toggle, Clear, Scroll, Hover, Wait, Verify, Upload, Drag, Press, Refresh) map directly to the `playwright-cli` commands documented in the Action Mapping Reference above. The runner recognizes these verbs at the start of each step line and dispatches to the corresponding CLI command via Bash.

---

## Snapshot-First Execution Pattern

The Playwright CLI is snapshot-driven. Unlike Playwright API code that uses CSS selectors, the CLI uses element refs from snapshots. Every action that targets an element follows this pattern:

```
PATTERN: Snapshot -> Find -> Act -> Verify

1. SNAPSHOT: Run `playwright-cli -s={session} snapshot` via Bash.
   The snapshot returns a YAML accessibility tree with all visible elements
   and their refs (e.g., ref=e12).

2. FIND: Search the snapshot output for the target element.
   Match by: visible text, role, label, placeholder, or test ID.
   Extract the element's ref value.

3. ACT: Run the appropriate CLI command with the ref via Bash.
   Example: `playwright-cli -s={session} click e12`

4. VERIFY: Run `playwright-cli -s={session} snapshot` again via Bash.
   Check that the expected outcome is present in the updated snapshot.
```

This pattern is fundamental. NEVER attempt to click, type, or interact with an element without first taking a snapshot to find its ref. Refs are ephemeral -- they change between snapshots, so always use the ref from the most recent snapshot.

### Example Execution Sequence

For the step: `Click the "Save Changes" button`

```
1. playwright-cli -s={session} snapshot
   -> Returns: ... button "Save Changes" [ref=e47] ...

2. playwright-cli -s={session} click e47
   -> Button is clicked

3. playwright-cli -s={session} snapshot
   -> Returns: ... text "Changes saved successfully" ...
   -> Verification: success text found -> PASS
```

For the step: `Type "hello@example.com" in the email field`

```
1. playwright-cli -s={session} snapshot
   -> Returns: ... textbox "Email" [ref=e23] ...

2. playwright-cli -s={session} fill e23 "hello@example.com"
   -> Text is entered

3. playwright-cli -s={session} snapshot
   -> Returns: ... textbox "Email" value="hello@example.com" [ref=e23] ...
   -> Verification: field value matches -> PASS
```

---

## Constraints

- **CLI via Bash only** -- This skill uses `playwright-cli` commands via the Bash tool for all browser interaction. Every browser action is a `playwright-cli -s={session} <command>` call. It does NOT use MCP tools, generate Playwright code, or use `npx playwright test`.
- **No file generation** -- This skill does not generate test files. It executes workflows interactively and produces an execution report. Use the converter skills to generate Playwright test projects for CI.
- **Continue on failure** -- When a step fails, the runner logs the failure and continues to the next step. It never aborts a workflow or the entire run due to a single failure.
- **Credentials in memory only** -- User credentials are held in the session and never written to disk, task metadata, or output files.
- **Snapshot before action** -- Every element interaction requires a preceding `playwright-cli -s={session} snapshot` to obtain the element ref. Refs are ephemeral and must not be cached across snapshots.
- **Report always written** -- Even if all workflows pass, the runner writes an execution report file.
- **Viewport preserved** -- For mobile runs, the 393x852 viewport must be set once and maintained throughout. Do not resize during execution.
- **One session per persona** -- Multi-user execution uses one named session per persona (e.g., `runner-admin`, `runner-user`). Sessions are opened during auth setup and reused throughout. Never close persona sessions during execution. Run `playwright-cli close-all` only after the full run completes.
