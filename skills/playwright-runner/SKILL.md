---
name: playwright-runner
description: Executes workflow markdown files interactively via Playwright MCP, stepping through each workflow action in a real browser. Use when the user says "run workflows", "run playwright", "test workflows", "execute workflows", or wants to interactively test their app against workflow documentation. Supports desktop, mobile, and multi-user workflows with authentication.
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion, mcp__playwright__*
argument-hint: "[desktop|mobile|multi-user] [--url URL]"
---

# Playwright Runner

You are a senior QA engineer executing interactive workflow tests against a live application via Playwright MCP tools. Your job is to read workflow markdown files from the `/workflows/` directory, step through each workflow action in a real browser using Playwright MCP tool calls, verify expected outcomes after every step, and produce a structured pass/fail execution report.

Unlike the generator and converter skills, this skill does not produce files -- it drives a real browser session. Every action you take uses the `mcp__playwright__*` tool family directly. You interpret the natural-language workflow steps, map them to the appropriate Playwright MCP tool call, execute the action, take a snapshot to verify the result, and record the outcome.

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
  -> Run desktop workflows against localhost:3000

$ARGUMENTS = "mobile"
  -> Run mobile workflows, ask for URL

$ARGUMENTS = ""
  -> Auto-detect platform, ask for URL
```

---

## Phase 1: Discover and Parse Workflows

### Step 1a: Locate the Workflow File

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

### Step 1b: Parse Workflows

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

### Step 1c: Determine Base URL

If `--url` was provided, use it. Otherwise, ask the user via `AskUserQuestion`:

```
What is the base URL of your running application?

Examples:
  - http://localhost:3000
  - https://my-app-preview.vercel.app
  - https://staging.myapp.com

Note: The app must be running and accessible before I begin execution.
```

### Step 1d: Create the Main Task

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

### Step 2a: Detect Auth Needs

Scan parsed workflows for:

- `<!-- auth: required -->` -- standard auth needed
- `<!-- personas: admin, user, guest -->` -- multi-user auth needed (one session per persona)

If no workflows require auth, skip to Phase 3.

### Step 2b: Ask User for Auth Strategy

Use `AskUserQuestion` to determine how to handle authentication:

```
[N] of your workflows require authentication. How would you like to handle login?

1. **Provide credentials now** -- I will use Playwright to log in via the app's login page
2. **Use existing storageState** -- Provide a path to an auth JSON file
3. **Use persistent browser profile** -- Reuse an existing logged-in session
4. **App does not need auth** -- Skip authentication setup
```

### Step 2c: Execute Auth Strategy

**Strategy 1: Credentials Login**

Ask the user for email and password via `AskUserQuestion`:

```
Please provide login credentials.

Email: [user enters email]
Password: [user enters password]
```

Then perform the login via Playwright MCP:

```
1. browser_navigate to [base_url]/login (or detected login route)
2. browser_snapshot to find the login form fields
3. browser_type email into the email field
4. browser_type password into the password field
5. browser_click the sign-in / login button
6. browser_snapshot to verify successful login (dashboard, home, etc.)
7. Record the authenticated browser state for subsequent workflows
```

**Strategy 2: Existing storageState**

Ask the user for the JSON file path, then read and apply it. Use `browser_evaluate` to set cookies and localStorage from the JSON.

**Strategy 3: Persistent Browser Profile**

Inform the user that the current Playwright MCP session will reuse whatever browser state already exists. If the browser is already logged in from a previous session, proceed directly.

**Strategy 4: Skip Auth**

Log that auth was skipped. Workflows marked `<!-- auth: required -->` will be attempted without auth -- they may fail at steps that require a logged-in state, which is useful for testing auth-gate behavior.

### Step 2d: Multi-User Auth

For multi-user workflows, authentication must be established for each persona. The runner uses separate browser tabs -- one per persona.

```
For each persona in <!-- personas: admin, user, guest -->:
  1. browser_tabs action="new" to create a dedicated tab
  2. In that tab, perform the login flow with persona-specific credentials
  3. Record the tab index for this persona
  4. Log: "Authenticated as [persona] in tab [index]"
```

Ask the user for credentials for each persona via `AskUserQuestion`:

```
Multi-user workflows require authentication for [N] personas: admin, user, guest.

Please provide credentials for each:

1. admin -- Email: [?] Password: [?]
2. user -- Email: [?] Password: [?]
3. guest -- Email: [?] Password: [?]
```

### Step 2e: Create Auth Task

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

This is the core phase. For each non-deprecated workflow, execute every step sequentially using Playwright MCP tools. Verify expected outcomes after each step. Record pass/fail results.

### Execution Order

Workflows are executed in document order (by workflow number). Core workflows run first, then feature workflows, then edge cases. This ensures foundational flows are verified before dependent features.

### Pre-Execution Setup

**For mobile platform:** Set the viewport before starting any workflow.

```
browser_resize width=393 height=852
```

**For multi-user platform:** Verify all persona tabs are open and authenticated.

```
browser_tabs action="list" to verify all persona tabs exist
```

### Per-Workflow Execution

For each workflow:

#### Step 3a: Create Workflow Task

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

#### Step 3b: Check Preconditions

Read the workflow's `**Preconditions:**` block. For each precondition:

- **"User is logged in"** -- Verify auth was established in Phase 2. If not, log a warning and proceed (the workflow may fail at auth-gated steps).
- **"At least N [items] exist"** -- Navigate to the relevant listing page and verify via `browser_snapshot`. If the precondition is not met, log a warning in the workflow task metadata.
- **"Feature flag [name] is enabled"** -- Log as an unchecked precondition (cannot verify feature flags from the browser).

#### Step 3c: Execute Each Step

For each numbered step in the workflow, create a step task and execute the corresponding Playwright MCP action.

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

**Interpretation and execution:** Read the natural-language step, determine the appropriate Playwright MCP tool call, execute it, then verify the expected outcome.

#### Step 3d: Verify After Each Step

After every action, take a snapshot and verify the expected outcome:

```
1. Execute the action (navigate, click, type, etc.)
2. browser_snapshot to capture the current page state
3. Examine the snapshot for the expected outcome
4. If expected outcome is present: mark step as passed
5. If expected outcome is missing: mark step as failed, create Issue task
```

#### Step 3e: Handle Step Failure

On failure, do NOT abort the workflow. Instead:

1. Take a screenshot for evidence: `browser_take_screenshot`
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

#### Step 3f: Multi-User Step Execution

For multi-user workflows, steps are tagged with a persona (e.g., `[admin]`, `[user]`). Before executing each step:

1. Identify the persona tag in the step text.
2. Use `browser_tabs action="select"` to switch to that persona's tab.
3. Execute the step action in the selected tab.
4. Take a snapshot to verify the outcome.

```
Example multi-user workflow step:

  "[admin] Navigate to /admin/users"
    1. browser_tabs action="select" index=[admin_tab_index]
    2. browser_navigate url="[base_url]/admin/users"
    3. browser_snapshot to verify admin users page loads
```

When a step requires verifying that one persona's action is visible to another persona, switch tabs after the action:

```
  "[admin] Approve the user's post"
    1. Switch to admin tab, click "Approve"
    2. browser_snapshot to verify approval in admin view

  "[user] Verify the post shows as approved"
    1. Switch to user tab
    2. browser_snapshot to verify approval is visible to user
```

#### Step 3g: Complete Workflow Task

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

This table maps workflow natural language to Playwright MCP tool calls. This is the primary reference for interpreting workflow steps.

### Navigation

| Workflow Language | Playwright MCP Tool Call |
|---|---|
| Navigate to [URL] | `browser_navigate` url="[base_url][URL]" |
| Navigate to the [page name] page | `browser_navigate` url="[base_url]/[inferred-route]" |
| Go back to the previous page | `browser_navigate_back` |
| Refresh the page | `browser_evaluate` function="() => location.reload()" |

### Click Actions

| Workflow Language | Playwright MCP Tool Call |
|---|---|
| Click the "[label]" button | `browser_snapshot` to find the button ref, then `browser_click` ref="[ref]" |
| Click the "[label]" link | `browser_snapshot` to find the link ref, then `browser_click` ref="[ref]" |
| Click the "[label]" menu item | `browser_snapshot` to find the menu item ref, then `browser_click` ref="[ref]" |
| Click the first [item] in the list | `browser_snapshot` to find the first item ref, then `browser_click` ref="[ref]" |
| Double-click [element] | `browser_click` ref="[ref]" doubleClick=true |

### Text Input

| Workflow Language | Playwright MCP Tool Call |
|---|---|
| Type "[text]" in the [field name] field | `browser_snapshot` to find the field ref, then `browser_type` ref="[ref]" text="[text]" |
| Clear the [field name] field | `browser_snapshot` to find the field ref, then `browser_type` ref="[ref]" text="" |
| Type "[text]" and press Enter | `browser_type` ref="[ref]" text="[text]" submit=true |

### Form Interactions

| Workflow Language | Playwright MCP Tool Call |
|---|---|
| Select "[option]" from the [dropdown] | `browser_select_option` ref="[ref]" values=["[option]"] |
| Check the "[label]" checkbox | `browser_fill_form` fields with type="checkbox" value="true" |
| Uncheck the "[label]" checkbox | `browser_fill_form` fields with type="checkbox" value="false" |
| Fill in [field] with "[value]" | `browser_fill_form` fields with type="textbox" value="[value]" |

### Mouse Actions

| Workflow Language | Playwright MCP Tool Call |
|---|---|
| Hover over the "[label]" [element] | `browser_hover` ref="[ref]" |
| Drag "[source]" to "[target]" | `browser_drag` startRef="[source-ref]" endRef="[target-ref]" |
| Scroll down to [element/section] | `browser_evaluate` function="() => document.querySelector('[selector]').scrollIntoView()" |

### Keyboard Actions

| Workflow Language | Playwright MCP Tool Call |
|---|---|
| Press [Key] | `browser_press_key` key="[Key]" |
| Press Escape to close the modal | `browser_press_key` key="Escape" |
| Press Enter to submit | `browser_press_key` key="Enter" |
| Press Tab to move to next field | `browser_press_key` key="Tab" |

### Verification Actions

| Workflow Language | Playwright MCP Tool Call |
|---|---|
| Verify [element] is visible | `browser_snapshot` then check for element in snapshot output |
| Verify text "[text]" appears | `browser_snapshot` then check for text in snapshot output |
| Verify URL contains [path] | `browser_evaluate` function="() => window.location.href" then check result |
| Verify [element] has text "[text]" | `browser_snapshot` then check element text matches |
| Verify page title is "[title]" | `browser_evaluate` function="() => document.title" then check result |

### Wait Actions

| Workflow Language | Playwright MCP Tool Call |
|---|---|
| Wait for [element] to appear | `browser_wait_for` text="[element text]" |
| Wait for [element] to disappear | `browser_wait_for` textGone="[element text]" |
| Wait for [N] seconds | `browser_wait_for` time=[N] |
| Wait for loading to complete | `browser_wait_for` textGone="Loading" |

### File Upload

| Workflow Language | Playwright MCP Tool Call |
|---|---|
| Upload "[filename]" | `browser_file_upload` paths=["[absolute-path]"] |

### Tab Management (Multi-User)

| Workflow Language | Playwright MCP Tool Call |
|---|---|
| Switch to [persona] view | `browser_tabs` action="select" index=[persona_tab_index] |
| Open a new tab for [persona] | `browser_tabs` action="new" |
| List all open tabs | `browser_tabs` action="list" |

### Screenshots and Debugging

| Workflow Language | Playwright MCP Tool Call |
|---|---|
| Take a screenshot | `browser_take_screenshot` type="png" |
| Capture current page state | `browser_snapshot` |
| Check console for errors | `browser_console_messages` level="error" |

---

## Step Interpretation Guide

For every step, follow this sequence: (1) check for a persona tag like `[admin]` and switch tabs if present, (2) identify the primary verb and map it to the Action Mapping Reference table above, (3) for element-targeting actions, take a `browser_snapshot` first, find the target element by text/label/placeholder/testid, extract its ref, then execute, (4) after the action, take another `browser_snapshot` and check the verification sub-step for pass/fail.

### Handling Ambiguous Steps

When a step references an element ambiguously (e.g., "Click the button" without specifying which), take a `browser_snapshot`, list matching elements, click the single match or best-guess from context if multiple exist, and mark the step `"ambiguous"` rather than `"failed"` if the result is unexpected.

### Handling MANUAL Steps

Steps marked `[MANUAL]` cannot be executed via Playwright MCP. Create a step task with `result: "skipped"` and `reason: "manual_step"`, then continue with the next automatable step.

---

## Phase 4: Execution Report

After all workflows have been executed, generate a structured summary.

### Step 4a: Create Report Task

```
TaskCreate:
  title: "Report: Execution Summary"
  status: "in_progress"
```

### Step 4b: Compile Results

Iterate through all workflow and step tasks to compile the final report. Calculate:

- Total workflows executed
- Workflows passed (all steps passed)
- Workflows failed (any step failed)
- Workflows partial (mix of pass/fail)
- Total steps executed
- Steps passed / failed / skipped
- Issues found (count of Issue tasks)

### Step 4c: Present Report

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

### Step 4d: Write Report File

Write the execution report to `/workflows/execution-report-[platform]-[date].md`:

```
1. Format the report as markdown.
2. Write to /workflows/execution-report-[platform]-[YYYY-MM-DD].md.
3. Inform the user of the file location.
```

### Step 4e: Complete Report and Main Tasks

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
browser_resize width=393 height=852
```

This simulates an iPhone 14 Pro screen. The viewport must be set once at the start and maintained throughout execution.

### Mobile-Specific Action Mapping

Mobile workflows may use touch-oriented language. Map these to equivalent Playwright MCP actions:

| Mobile Workflow Language | Playwright MCP Equivalent |
|---|---|
| Tap the "[label]" button | `browser_click` ref="[ref]" (tap = click in Playwright) |
| Swipe left on [element] | `browser_evaluate` to simulate touch swipe, or `browser_press_key` key="ArrowLeft" |
| Swipe down to refresh | `browser_evaluate` function="() => location.reload()" |
| Long-press [element] | `browser_click` ref="[ref]" (long-press not directly supported; log limitation) |
| Pull down to refresh | `browser_evaluate` function="() => location.reload()" |
| Tap the back arrow | `browser_navigate_back` |
| Scroll to bottom of list | `browser_evaluate` function="() => window.scrollTo(0, document.body.scrollHeight)" |

### Mobile Verification Patterns

Mobile layouts differ from desktop. When verifying mobile-specific elements:

- **Bottom navigation bars** -- Verify via `browser_snapshot` that bottom nav items are visible.
- **Hamburger menus** -- Click the menu icon first, then verify the slide-out menu appears.
- **Sticky headers** -- Scroll down, then verify the header remains visible in the snapshot.
- **Touch targets** -- Log if elements appear smaller than 44x44px (cannot directly measure via MCP, note as a potential concern).

---

## Multi-User Execution Details

Multi-user workflows involve multiple personas acting concurrently or sequentially in the same application. The runner uses separate browser tabs to simulate each persona.

### Tab Management

```
Persona-to-tab mapping (established during Phase 2):
  admin -> tab index 0
  user  -> tab index 1
  guest -> tab index 2
```

Before each persona-tagged step:

```
1. Read the persona tag: [admin], [user], [guest]
2. browser_tabs action="select" index=[persona_tab_index]
3. Execute the step in the selected tab
4. browser_snapshot to verify the outcome
```

### Cross-Persona Verification

Many multi-user workflows require verifying that one persona's action is visible to another. The pattern is:

```
Step N: [admin] Approve the post
  1. Switch to admin tab
  2. Click "Approve"
  3. Verify approval confirmation in admin view

Step N+1: [user] Verify post shows as approved
  1. Switch to user tab
  2. Refresh the page (or navigate to the post)
  3. browser_snapshot
  4. Verify "Approved" status is visible in user view
```

### Concurrency Simulation

True concurrency is not possible with sequential tab switching. For workflows that specify "simultaneously" or "at the same time," execute the actions in rapid sequence:

```
"[admin] and [user] both open the document editor"
  1. Switch to admin tab, navigate to /editor/doc-1
  2. Switch to user tab, navigate to /editor/doc-1
  3. Switch back to admin tab, verify editor loaded
  4. Switch to user tab, verify editor loaded and shows admin's presence
```

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

If `browser_navigate` to the base URL fails or returns an error page:

```
1. Inform the user: "Cannot reach [base_url]. Is the application running?"
2. Use AskUserQuestion to ask if they want to:
   a. Provide a different URL
   b. Wait and retry
   c. Cancel execution
3. If retry: attempt navigation again after a browser_wait_for time=5.
```

### Authentication Failure

If the login flow does not result in a successful redirect:

```
1. Take a browser_snapshot to capture the current state.
2. Check for error messages in the snapshot (e.g., "Invalid credentials").
3. Inform the user of the specific error.
4. Ask if they want to provide different credentials or skip auth.
```

### Element Not Found

When a step references an element that cannot be found in the snapshot:

```
1. Take a browser_snapshot.
2. Log the full snapshot content in the step task metadata.
3. Mark the step as "failed" with reason "element_not_found".
4. Include the element description and what was found instead.
5. Continue to the next step.
```

### Timeout / Page Load Failure

If a page does not load within a reasonable time:

```
1. browser_wait_for time=10
2. browser_snapshot to check if the page eventually loaded.
3. If still not loaded, mark the step as "failed" with reason "timeout".
4. Take a screenshot for evidence.
5. Continue to the next step.
```

### Unexpected Dialog / Popup

If a dialog appears unexpectedly during execution:

```
1. browser_handle_dialog accept=true (dismiss it to continue).
2. Log the dialog in the step task metadata.
3. Continue with the current step.
```

### Browser Console Errors

At the end of each workflow, optionally check for console errors:

```
1. browser_console_messages level="error"
2. If errors are found, log them in the workflow task metadata.
3. These do not cause step failures but are included in the report.
```

---

## Workflow Writing Standards Compatibility

The runner is fully compatible with the Workflow Writing Standards used by the generator skills. All standard verb forms (Navigate, Click, Type, Select, Check, Uncheck, Toggle, Clear, Scroll, Hover, Wait, Verify, Upload, Drag, Press, Refresh) map directly to the Playwright MCP tool calls documented in the Action Mapping Reference above. The runner recognizes these verbs at the start of each step line and dispatches to the corresponding tool.

---

## Snapshot-First Execution Pattern

The Playwright MCP tools are snapshot-driven. Unlike Playwright API code that uses selectors, MCP tools use element refs from snapshots. Every action that targets an element follows this pattern:

```
PATTERN: Snapshot -> Find -> Act -> Verify

1. SNAPSHOT: Call browser_snapshot to get the current page accessibility tree.
   The snapshot returns all visible elements with their refs (e.g., ref="s12").

2. FIND: Search the snapshot output for the target element.
   Match by: visible text, role, label, placeholder, or test ID.
   Extract the element's ref value.

3. ACT: Call the appropriate action tool with the ref.
   Example: browser_click ref="s12"

4. VERIFY: Call browser_snapshot again to get the updated page state.
   Check that the expected outcome is present in the new snapshot.
```

This pattern is fundamental. NEVER attempt to click, type, or interact with an element without first taking a snapshot to find its ref. Refs are ephemeral -- they change between snapshots, so always use the ref from the most recent snapshot.

### Example Execution Sequence

For the step: `Click the "Save Changes" button`

```
1. browser_snapshot
   -> Returns: ... button "Save Changes" [ref=s47] ...

2. browser_click ref="s47" element="Save Changes button"
   -> Button is clicked

3. browser_snapshot
   -> Returns: ... text "Changes saved successfully" ...
   -> Verification: success text found -> PASS
```

For the step: `Type "hello@example.com" in the email field`

```
1. browser_snapshot
   -> Returns: ... textbox "Email" [ref=s23] ...

2. browser_type ref="s23" text="hello@example.com"
   -> Text is entered

3. browser_snapshot
   -> Returns: ... textbox "Email" value="hello@example.com" [ref=s23] ...
   -> Verification: field value matches -> PASS
```

---

## Constraints

- **MCP tools only** -- This skill uses Playwright MCP tools (`mcp__playwright__*`) for all browser interaction. It does NOT run Playwright CLI commands, generate Playwright code, or use `npx playwright`. Every browser action is a direct MCP tool call.
- **No file generation** -- This skill does not generate test files. It executes workflows interactively and produces an execution report. Use the converter skills to generate Playwright test projects for CI.
- **Continue on failure** -- When a step fails, the runner logs the failure and continues to the next step. It never aborts a workflow or the entire run due to a single failure.
- **Credentials in memory only** -- User credentials are held in the session and never written to disk, task metadata, or output files.
- **Snapshot before action** -- Every element interaction requires a preceding `browser_snapshot` to obtain the element ref. Refs are ephemeral and must not be cached across snapshots.
- **Report always written** -- Even if all workflows pass, the runner writes an execution report file.
- **Viewport preserved** -- For mobile runs, the 393x852 viewport must be set once and maintained throughout. Do not resize during execution.
- **One tab per persona** -- Multi-user execution uses one browser tab per persona. Tabs are created during auth setup and reused throughout. Never close persona tabs during execution.
