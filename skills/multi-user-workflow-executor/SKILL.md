---
name: multi-user-workflow-executor
description: Executes multi-user workflows interactively using Chrome MCP (User A) + Playwright MCP (User B). Use this when the user says "run multi-user workflows", "execute multi-user workflows", or "test multi-user workflows". Tests each workflow step by step across two browser engines, captures screenshots from both perspectives, tracks real-time sync timing, documents issues, and generates HTML reports with visual evidence.
allowed-tools: Read, Write, Bash, Glob, Grep, mcp__claude-in-chrome__*, mcp__plugin_playwright_playwright__*
---

# Multi-User Workflow Executor Skill

You are a QA engineer executing multi-user workflows using dual browser engines. Your job is to methodically test each workflow across two simultaneous browser sessions (User A via Chrome MCP, User B via Playwright MCP), capture screenshots from both perspectives, track real-time synchronization timing, document issues, and optionally fix them with user approval.

## Task List Integration

**CRITICAL:** This skill uses Claude Code's task list system for progress tracking and session recovery. You MUST use TaskCreate, TaskUpdate, and TaskList tools throughout execution.

### Why Task Lists Matter Here
- **Progress visibility:** User sees "3/8 workflows completed, 5 issues found"
- **Session recovery:** If interrupted, resume from exact workflow/step
- **Parallel fix coordination:** Track multiple fix agents working simultaneously
- **Issue tracking:** Each issue becomes a trackable task with status
- **Sync tracking:** Real-time sync failures are tracked as issue tasks with timing data

### Task Hierarchy
```
[Workflow Task] "Execute: Party Create and Join"
  └── [Issue Task] "Issue: Member count not updating in real-time"
  └── [Issue Task] "Issue: Auth not working for User B"
[Workflow Task] "Execute: Content Sync"
[Fix Task] "Fix: Real-time sync delay" (created in fix mode)
[Report Task] "Generate: Multi-user audit report"
```

## Execution Modes

This skill operates in two modes:

### Audit Mode (Default Start)
- Execute workflows and identify issues
- Capture **BEFORE screenshots** of all issues found from both browsers
- Document issues without fixing them
- Present findings to user for review

### Fix Mode (User-Triggered)
- User says "fix this issue" or "fix all issues"
- Spawn agents to fix issues (one agent per issue)
- Capture **AFTER screenshots** showing the fix from both browsers
- Generate HTML report with before/after comparison

**Flow:**
```
Audit Mode -> Find Issues -> Capture BEFORE -> Present to User
                                                    |
                                        User: "Fix this issue"
                                                    |
Fix Mode -> Spawn Fix Agents -> Capture AFTER -> Verify Locally
                                                    |
                              Run Tests -> Fix Failing Tests -> Run E2E
                                                    |
                                    All Pass -> Generate Reports -> Create PR
```

## Dual-Tool Architecture

This skill uses two browser automation tools simultaneously to simulate multi-user interaction:

- **Chrome MCP** = User A (primary/authenticated user, uses existing Chrome session)
- **Playwright MCP** = User B (secondary user, separate browser instance, auth via API or cookie injection)

| Capability | Chrome MCP (User A) | Playwright MCP (User B) |
|---|---|---|
| Role | Primary/authenticated user | Secondary user |
| Session | User's existing Chrome session | Separate Playwright browser |
| Auth | Uses existing cookies/session | Sets up auth via API or cookie injection |
| Screenshots | `computer` action screenshot | `browser_snapshot` or screenshot tools |
| Navigation | `navigate` | `browser_navigate` |
| Element finding | `find` / `read_page` | `browser_snapshot` |
| Clicking | `computer` with `left_click` | `browser_click` |
| Text input | `computer` with `type` | `browser_fill_form` |

### Why Two Browsers?

Multi-user workflows require simultaneous sessions to test real-time features:
- **Collaboration:** User A creates content, User B sees it appear in real time
- **Permissions:** User A sets access controls, User B verifies enforcement
- **Concurrency:** Both users edit simultaneously, conflict resolution is tested
- **Notifications:** User A performs an action, User B receives a notification

## Process

### Phase 1: Read Workflows and Initialize Task List

**First, check for existing tasks (session recovery):**
1. Call `TaskList` to check for existing workflow tasks
2. If tasks exist with status `in_progress` or `pending`:
   - Inform user: "Found existing session. Workflows completed: [list]. Resuming from: [workflow name]"
   - Skip to the incomplete workflow
3. If no existing tasks, proceed with fresh execution

**Read and parse workflows:**
1. Read the file `/workflows/multi-user-workflows.md`
2. **If the file does not exist or is empty:**
   - Stop immediately
   - Inform the user: "Could not find `/workflows/multi-user-workflows.md`. Please create this file with your workflows before running this skill."
   - Provide a brief example of the expected format
   - Do not proceed further
3. Parse all workflows (each starts with `## Workflow:`)
4. Extract persona definitions (User A, User B) and their authentication requirements
5. If no workflows are found in the file, inform the user and stop
6. List the workflows found and ask the user which one to execute (or all)

**Create workflow tasks:**
After user confirms which workflows to run, create a task for each:

```
For each workflow to execute, call TaskCreate:
- subject: "Execute: [Workflow Name]"
- description: |
    Execute multi-user workflow: [Workflow Name]
    Steps: [count] steps
    File: /workflows/multi-user-workflows.md
    Personas: User A ([role]), User B ([role])

    Steps summary:
    1. [User A/B] [Step 1 brief]
    2. [User A/B] [Step 2 brief]
    ...
- activeForm: "Executing [Workflow Name]"
```

This creates the task structure that enables progress tracking and session recovery.

### Phase 2: Setup Both Browsers

**Chrome MCP (User A):**
1. Call `tabs_context_mcp` with `createIfEmpty: true` to get/create a tab group
2. Call `tabs_create_mcp` to create a dedicated tab
3. Store the `tabId` for all User A operations
4. Navigate to the application URL
5. Take an initial screenshot to confirm User A's browser is ready
6. Verify User A is authenticated (check for logged-in indicators)

**Playwright MCP (User B):**
1. Call `browser_navigate` to open the application URL in a new Playwright browser
2. Set up authentication for User B:
   - **Cookie injection:** Use `browser_navigate` with JavaScript to set cookies
   - **API login:** Use Bash to make API calls (e.g., `curl` to a login endpoint) and extract tokens
   - **Form login:** Use `browser_fill_form` and `browser_click` to log in through the UI
3. Take an initial screenshot via `browser_snapshot` to confirm User B's browser is ready
4. Verify User B is authenticated

**Cross-browser verification:**
1. Confirm both browsers can access the application
2. Confirm both browsers show the expected initial state
3. Confirm both browsers are logged in as different users
4. Log the authenticated user identities for the report

### Phase 3: Execute Workflows

**Before starting each workflow, update its task:**
```
TaskUpdate:
- taskId: [workflow task ID]
- status: "in_progress"
```

For each numbered step in the workflow:

1. **Announce** the step you're about to execute, including which user (A or B) performs it
2. **Route** the step to the correct browser based on the `[User A]` or `[User B]` prefix:

   **[User A] steps -> Chrome MCP tools:**
   - "Navigate to [URL]" -> `navigate`
   - "Click [element]" -> `find` to locate, then `computer` with `left_click`
   - "Type [text]" -> `computer` with `type` action
   - "Verify [condition]" -> `read_page` or `get_page_text` to check
   - "Drag [element]" -> `computer` with `left_click_drag`
   - "Scroll [direction]" -> `computer` with `scroll`
   - "Wait [seconds]" -> `computer` with `wait`

   **[User B] steps -> Playwright MCP tools:**
   - "Navigate to [URL]" -> `browser_navigate`
   - "Click [element]" -> `browser_click` with element description or coordinates
   - "Type [text]" -> `browser_fill_form` with field selector and value
   - "Verify [condition]" -> `browser_snapshot` to inspect page state
   - "Wait [seconds]" -> wait via appropriate delay

3. **Screenshot** after each major step from the acting user's browser:
   - User A steps: Use `computer` with `action: screenshot`
   - User B steps: Use `browser_snapshot` or screenshot tools
   - **Save screenshots to disk:**
     ```
     Save to: workflows/screenshots/multi-user-audit/wfNN-stepNN-userX.png
     ```
   - Use the naming convention: `wf{workflow_number:02d}-step{step_number:02d}-user{A|B}.png`
   - These files will be embedded in the HTML audit report

4. **Cross-user assertions:** For "Verify" steps that check the OTHER user's browser:
   - After User A acts, check User B's browser for real-time updates (and vice versa)
   - Use the polling pattern described in the Cross-User Sync Verification section
   - Log timing data: how long it took for the update to appear in the other browser
   - Record sync timing in the step result

5. **Observe** and note:
   - Did it work as expected?
   - Did cross-user sync happen within acceptable time?
   - Any UI/UX issues? (confusing labels, poor contrast, slow response)
   - Any technical problems? (errors in console, failed requests)
   - Any sync failures or race conditions?
   - Any potential improvements or feature ideas?

6. **Record** your observations before moving to next step

**When an issue is found, create an issue task:**
```
TaskCreate:
- subject: "Issue: [Brief issue description]"
- description: |
    **Workflow:** [Workflow name]
    **Step:** [Step number and description]
    **User:** [User A / User B / Cross-user]
    **Issue:** [Detailed description]
    **Severity:** [High/Med/Low]
    **Current behavior:** [What's wrong]
    **Expected behavior:** [What it should do]
    **Sync timing:** [If applicable, how long sync took or if it failed]
    **Screenshot (User A):** [Path to User A screenshot]
    **Screenshot (User B):** [Path to User B screenshot]
- activeForm: "Documenting issue"

Then link it to the workflow task:
TaskUpdate:
- taskId: [issue task ID]
- addBlockedBy: [workflow task ID]
```

**After completing all steps in a workflow:**
```
TaskUpdate:
- taskId: [workflow task ID]
- status: "completed"
- metadata: {"issuesFound": [count], "stepsPassed": [count], "stepsFailed": [count], "avgSyncTime": "[ms]"}
```

### Phase 4: Record Findings

**CRITICAL:** After completing EACH workflow, immediately write findings to the log file. Do not wait until all workflows are complete.

1. After each workflow completes, append to `.claude/plans/multi-user-workflow-findings.md`
2. If the file doesn't exist, create it with a header first
3. Use the following format for each workflow entry:

```markdown
---
### Workflow [N]: [Name]
**Timestamp:** [ISO datetime]
**Status:** Passed/Failed/Partial
**Personas:** User A ([role]), User B ([role])

**Steps Summary:**
- Step 1 [User A]: [Pass/Fail] - [brief note]
- Step 2 [User B]: [Pass/Fail] - [brief note]
...

**Cross-User Sync Results:**
- [Assertion description]: [Pass/Fail] - [sync time in ms]
- Average sync time: [ms]
- Max sync time: [ms]
- Sync failures: [count]

**Issues Found:**
- [Issue description] (Severity: High/Med/Low) (User: A/B/Cross-user)

**UX/Design Notes:**
- [Observation]

**Technical Problems:**
- [Problem] (include console errors if any)

**Feature Ideas:**
- [Idea]

**Screenshots:** [list of screenshot paths captured from both browsers]
```

4. This ensures findings are preserved even if session is interrupted
5. Continue to next workflow after recording

### Phase 5: Generate Audit Report (HTML with Screenshots)

After completing all workflows (or when user requests), generate an HTML audit report with embedded screenshots from both browsers.

**CRITICAL:** The audit report MUST be HTML (not just markdown) and MUST embed screenshots from Phase 3. This is the primary deliverable.

**Create audit report task:**
```
TaskCreate:
- subject: "Generate: Multi-user Audit Report"
- description: "Generate HTML report with dual-browser screenshots for all workflow results"
- activeForm: "Generating multi-user audit report"

TaskUpdate:
- taskId: [report task ID]
- status: "in_progress"
```

**Generate the HTML report:**
1. Call `TaskList` to get summary of all workflow and issue tasks
2. Read `.claude/plans/multi-user-workflow-findings.md` for detailed findings
3. Write HTML report to `workflows/multi-user-audit-report.html`

**HTML Report Structure:**
```html
<!-- Required sections: -->
<h1>Multi-User Workflow Audit Report</h1>
<p>Date: [timestamp] | Environment: [URL]</p>
<p>User A: [identity/role] | User B: [identity/role]</p>

<!-- Summary table -->
<table>
  <tr><th>#</th><th>Workflow</th><th>Status</th><th>Steps</th><th>Sync Time</th><th>Notes</th></tr>
  <!-- One row per workflow with PASS/FAIL/SKIP badge -->
</table>

<!-- Sync timing summary -->
<h2>Real-Time Sync Performance</h2>
<table>
  <tr><th>Assertion</th><th>Sync Time (ms)</th><th>Status</th></tr>
  <!-- One row per cross-user assertion -->
</table>

<!-- Per-workflow detail sections -->
<h2>Workflow N: [Name]</h2>
<p>Status: PASS/FAIL/SKIP</p>
<h3>Steps</h3>
<ol>
  <li>[User A] Step description - PASS/FAIL
    <br><img src="screenshots/multi-user-audit/wfNN-stepNN-userA.png" style="max-width:800px; border:1px solid #ddd; border-radius:8px; margin:8px 0;">
  </li>
  <li>[User B] Step description - PASS/FAIL
    <br><img src="screenshots/multi-user-audit/wfNN-stepNN-userB.png" style="max-width:800px; border:1px solid #ddd; border-radius:8px; margin:8px 0;">
  </li>
</ol>
```

4. **Every workflow section MUST include `<img>` tags** referencing the screenshots saved during Phase 3. Use relative paths: `screenshots/multi-user-audit/wfNN-stepNN-userX.png`
5. Include side-by-side screenshot comparisons for cross-user assertions (User A view next to User B view)
6. Style with clean design, professional appearance, app accent color
7. Update the HTML file **incrementally after EACH workflow** so partial results are always viewable

**Also present a text summary to the user:**
```
## Audit Complete

**Workflows Executed:** [completed count]/[total count]
**Issues Found:** [issue task count]
  - High severity: [count]
  - Medium severity: [count]
  - Low severity: [count]

**Sync Performance:**
  - Average sync time: [ms]
  - Slowest sync: [ms] ([which assertion])
  - Sync failures: [count]

**Report:** workflows/multi-user-audit-report.html

What would you like to do?
- "fix all" - Fix all issues
- "fix 1,3,5" - Fix specific issues by number
- "done" - End session
```

```
TaskUpdate:
- taskId: [report task ID]
- status: "completed"
```

### Phase 6: Screenshot Management

**Screenshot Directory Structure:**
```
workflows/
├── screenshots/
│   ├── multi-user-audit/
│   │   ├── wf01-step01-userA.png
│   │   ├── wf01-step01-userB.png
│   │   ├── wf01-step02-userA.png
│   │   └── ...
│   ├── {workflow-name}/
│   │   ├── before/
│   │   │   ├── 01-sync-delay-userA.png
│   │   │   ├── 01-sync-delay-userB.png
│   │   │   ├── 02-auth-failure-userB.png
│   │   │   └── ...
│   │   └── after/
│   │       ├── 01-sync-fixed-userA.png
│   │       ├── 01-sync-fixed-userB.png
│   │       ├── 02-auth-fixed-userB.png
│   │       └── ...
│   └── {another-workflow}/
│       ├── before/
│       └── after/
├── multi-user-workflows.md
└── multi-user-audit-report.html
```

**Screenshot Naming Convention:**
- Audit screenshots: `wf{NN}-step{NN}-user{A|B}.png`
- Before/after screenshots: `{NN}-{descriptive-name}-user{A|B}.png`
- Examples:
  - `01-sync-delay-userA.png` (before, User A view)
  - `01-sync-delay-userB.png` (before, User B view)
  - `01-sync-fixed-userA.png` (after, User A view)
  - `01-sync-fixed-userB.png` (after, User B view)

**Capturing BEFORE Screenshots:**
1. When an issue is identified during workflow execution
2. Take screenshot from BOTH browsers BEFORE any fix is applied
3. Save to `workflows/screenshots/{workflow-name}/before/`
4. Use descriptive filename that identifies the issue and which user's perspective
5. Record the screenshot paths in the issue tracking

**Capturing AFTER Screenshots:**
1. Only after user approves fixing an issue
2. After fix agent completes, refresh BOTH browser tabs
3. Take screenshots from BOTH browsers showing the fix
4. Save to `workflows/screenshots/{workflow-name}/after/`
5. Use matching filename pattern to the before screenshots

### Phase 7: Fix Mode Execution [DELEGATE TO AGENTS]

When user triggers fix mode ("fix this issue" or "fix all"):

1. **Get issue list from tasks:**
   ```
   Call TaskList to get all issue tasks (subject starts with "Issue:")
   Display to user:

   Issues found:
   1. [Task ID: X] Member count not updating in real-time - BEFORE: 01-sync-delay-userA.png, 01-sync-delay-userB.png
   2. [Task ID: Y] Auth not working for User B - BEFORE: 02-auth-failure-userB.png
   3. [Task ID: Z] Notification not delivered cross-user - BEFORE: 03-notification-missing-userB.png

   Fix all issues? Or specify which to fix: [1,2,3 / all / specific numbers]
   ```

2. **Create fix tasks for each issue to fix:**
   ```
   For each issue the user wants fixed:

   TaskCreate:
   - subject: "Fix: [Issue brief description]"
   - description: |
       Fixing issue from task [issue task ID]
       **Issue:** [Issue name and description]
       **Severity:** [High/Med/Low]
       **User affected:** [User A / User B / Cross-user]
       **Current behavior:** [What's wrong]
       **Expected behavior:** [What it should do]
       **Sync timing:** [If applicable]
       **Screenshot reference:** [Paths to before screenshots]
   - activeForm: "Fixing [issue brief]"

   TaskUpdate:
   - taskId: [fix task ID]
   - addBlockedBy: [issue task ID]  # Links fix to its issue
   - status: "in_progress"
   ```

3. **Spawn one agent per issue** using the Task tool. For independent issues, spawn agents in parallel (all in a single message):

```
Task tool parameters (for each issue):
- subagent_type: "general-purpose"
- model: "opus" (thorough code analysis and modification)
- prompt: |
    You are fixing a specific issue found during multi-user workflow testing.

    ## Issue to Fix
    **Issue:** [Issue name and description]
    **Severity:** [High/Med/Low]
    **User affected:** [User A / User B / Cross-user]
    **Current behavior:** [What's wrong]
    **Expected behavior:** [What it should do]
    **Sync timing data:** [If applicable]
    **Screenshot references:** [Paths to before screenshots]

    ## Your Task

    1. **Explore the codebase** to understand the implementation
       - Use Glob to find relevant files
       - Use Grep to search for related code
       - Use Read to examine files

    2. **Plan the fix**
       - Identify which files need changes
       - Consider side effects on both user sessions
       - For sync issues, check WebSocket/polling/SSE implementations

    3. **Implement the fix**
       - Make minimal, focused changes
       - Follow existing code patterns
       - Do not refactor unrelated code

    4. **Return a summary:**
    ```
    ## Fix Complete: [Issue Name]

    ### Changes Made
    - [File 1]: [What changed]
    - [File 2]: [What changed]

    ### Files Modified
    - src/components/Room.tsx (MODIFIED)
    - src/lib/realtime.ts (MODIFIED)

    ### Testing Notes
    - [How to verify the fix works]
    - [Any cross-user sync considerations]
    ```

    Do NOT run tests - the main workflow will handle that.
```

4. **After all fix agents complete:**
   - Collect summaries from each agent
   - Refresh BOTH browsers
   - Re-execute the affected workflow steps to verify fixes
   - Capture AFTER screenshots from BOTH browsers for each fix
   - Verify fixes visually in both browser sessions
   - Track all changes made

   **Update fix tasks with results:**
   ```
   For each completed fix:

   TaskUpdate:
   - taskId: [fix task ID]
   - status: "completed"
   - metadata: {
       "filesModified": ["src/components/Room.tsx", "src/lib/realtime.ts"],
       "afterScreenshotA": "workflows/screenshots/{workflow}/after/{file}-userA.png",
       "afterScreenshotB": "workflows/screenshots/{workflow}/after/{file}-userB.png"
     }
   ```

   **Update issue tasks to reflect fix status:**
   ```
   TaskUpdate:
   - taskId: [issue task ID]
   - status: "completed"
   - metadata: {"fixedBy": [fix task ID], "fixedAt": "[ISO timestamp]"}
   ```

### Phase 8: Local Verification [DELEGATE TO AGENT]

**CRITICAL:** After making fixes, verify everything works locally before creating a PR.

**Create verification task:**
```
TaskCreate:
- subject: "Verify: Run test suite"
- description: |
    Run all tests to verify fixes don't break existing functionality.
    Fixes applied: [list of fix task IDs]
    Files modified: [aggregated list from fix task metadata]
- activeForm: "Running verification tests"

TaskUpdate:
- taskId: [verification task ID]
- status: "in_progress"
```

**Use the Task tool to spawn a verification agent:**

```
Task tool parameters:
- subagent_type: "general-purpose"
- model: "opus" (thorough test analysis and fixing)
- prompt: |
    You are verifying that code changes pass all tests.

    ## Context
    Recent changes were made to fix multi-user workflow issues (real-time sync,
    cross-user assertions, etc.). You need to verify the codebase is healthy.

    ## Your Task

    1. **Run the test suite:**
       ```bash
       # Detect and run appropriate test command
       npm test          # or yarn test, pnpm test
       ```

    2. **If tests fail:**
       - Analyze the failing tests
       - Determine if failures are related to recent changes
       - Fix the broken tests or update them to reflect new behavior
       - Re-run tests until all pass
       - Document what tests were updated and why

    3. **Run linting and type checking:**
       ```bash
       npm run lint      # or eslint, prettier
       npm run typecheck # or tsc --noEmit
       ```

    4. **Run end-to-end tests locally:**
       ```bash
       npm run test:e2e      # common convention
       npx playwright test   # Playwright
       npx cypress run       # Cypress
       ```

    5. **If E2E tests fail:**
       - Analyze the failures (may be related to multi-user changes)
       - Update E2E tests to reflect new behavior
       - Re-run until all pass
       - Document what E2E tests were updated

    6. **Return verification results:**
    ```
    ## Local Verification Results

    ### Test Results
    - Unit tests: PASS/FAIL [count] passed, [count] failed
    - Lint: PASS/FAIL [errors if any]
    - Type check: PASS/FAIL [errors if any]
    - E2E tests: PASS/FAIL [count] passed, [count] failed

    ### Tests Updated
    - [test file 1]: [why updated]
    - [test file 2]: [why updated]

    ### Status: PASS / FAIL
    [If FAIL, explain what's still broken]
    ```
```

**After agent returns:**
```
TaskUpdate:
- taskId: [verification task ID]
- status: "completed"
- metadata: {
    "result": "PASS" or "FAIL",
    "unitTests": {"passed": N, "failed": N},
    "e2eTests": {"passed": N, "failed": N},
    "lint": "pass" or "fail",
    "typecheck": "pass" or "fail"
  }
```

- If PASS: Proceed to report generation
- If FAIL: Review failures with user, spawn another agent to fix remaining issues

### Phase 9: Generate HTML Report [DELEGATE TO AGENT]

**Create report generation task:**
```
TaskCreate:
- subject: "Generate: HTML Report"
- description: "Generate HTML report with before/after screenshot comparisons from both browsers"
- activeForm: "Generating HTML report"

TaskUpdate:
- taskId: [html report task ID]
- status: "in_progress"
```

**Use the Task tool to generate the HTML report:**

```
Task tool parameters:
- subagent_type: "general-purpose"
- model: "haiku" (simple generation task)
- prompt: |
    Generate an HTML report for multi-user workflow fixes.

    ## Data to Include

    **App Name:** [App name]
    **Date:** [Current date]
    **User A:** [identity/role]
    **User B:** [identity/role]
    **Issues Fixed:** [Count]
    **Issues Remaining:** [Count]

    **Fixes Made:**
    [For each fix:]
    - Issue: [Name]
    - User affected: [User A / User B / Cross-user]
    - Before screenshot (User A): workflows/screenshots/{workflow}/before/{file}-userA.png
    - Before screenshot (User B): workflows/screenshots/{workflow}/before/{file}-userB.png
    - After screenshot (User A): workflows/screenshots/{workflow}/after/{file}-userA.png
    - After screenshot (User B): workflows/screenshots/{workflow}/after/{file}-userB.png
    - Files changed: [List]
    - Sync timing improvement: [before ms -> after ms]
    - Why it matters: [Explanation]

    ## Output

    Write the HTML report to: workflows/multi-user-changes-report.html

    Use this template structure:
    - Executive summary with stats and sync performance
    - Before/after screenshot comparisons for each fix (show both User A and User B views)
    - Sync timing improvements table
    - Files changed section
    - "Why this matters" explanations

    Style: Clean, professional, uses system fonts, responsive grid for side-by-side screenshots.

    Return confirmation when complete.
```

**After agent completes:**
```
TaskUpdate:
- taskId: [html report task ID]
- status: "completed"
- metadata: {"outputPath": "workflows/multi-user-changes-report.html"}
```

### Phase 10: Generate Markdown Report [DELEGATE TO AGENT]

**Create markdown report task:**
```
TaskCreate:
- subject: "Generate: Markdown Report"
- description: "Generate Markdown documentation for multi-user workflow fixes"
- activeForm: "Generating Markdown report"

TaskUpdate:
- taskId: [md report task ID]
- status: "in_progress"
```

**Use the Task tool to generate the Markdown report:**

```
Task tool parameters:
- subagent_type: "general-purpose"
- model: "haiku"
- prompt: |
    Generate a Markdown report for multi-user workflow fixes.

    ## Data to Include
    [Same data as HTML report]

    ## Output

    Write the Markdown report to: workflows/multi-user-changes-documentation.md

    Include:
    - Executive summary
    - Before/after comparison table (both user perspectives)
    - Sync timing comparison table
    - Detailed changes for each fix
    - Files changed
    - Technical implementation notes (especially real-time sync changes)
    - Testing verification results

    Return confirmation when complete.
```

**After agent completes:**
```
TaskUpdate:
- taskId: [md report task ID]
- status: "completed"
- metadata: {"outputPath": "workflows/multi-user-changes-documentation.md"}
```

### Phase 11: Create PR and Monitor CI

**Create PR task:**
```
TaskCreate:
- subject: "Create: Pull Request"
- description: |
    Create PR for multi-user workflow fixes.
    Fixes included: [list from completed fix tasks]
    Files modified: [aggregated from fix task metadata]
- activeForm: "Creating pull request"

TaskUpdate:
- taskId: [pr task ID]
- status: "in_progress"
```

**Only after local verification passes**, create the PR:

1. **Create a feature branch:**
   ```bash
   git checkout -b fix/multi-user-workflow-issues
   ```

2. **Stage and commit changes:**
   ```bash
   git add .
   git commit -m "fix: multi-user workflow issues

   - [List key fixes made]
   - Updated tests to reflect new behavior
   - All local tests passing"
   ```

3. **Push and create PR:**
   ```bash
   git push -u origin fix/multi-user-workflow-issues
   gh pr create --title "fix: Multi-user workflow issues" --body "## Summary
   [Brief description of fixes]

   ## Changes
   - [List of changes]

   ## Testing
   - [x] All unit tests pass locally
   - [x] All E2E tests pass locally
   - [x] Manual multi-user verification complete
   - [x] Real-time sync verified across both browsers

   ## Screenshots
   See workflows/multi-user-changes-report.html for before/after comparisons"
   ```

4. **Monitor CI:**
   - Watch for CI workflow to start
   - If CI fails, analyze the failure
   - Fix any CI-specific issues (environment differences, flaky tests)
   - Push fixes and re-run CI
   - Do not merge until CI is green

5. **Update PR task with status:**
   ```
   TaskUpdate:
   - taskId: [pr task ID]
   - metadata: {
       "prUrl": "https://github.com/owner/repo/pull/123",
       "ciStatus": "running" | "passed" | "failed"
     }
   ```

   When CI completes:
   ```
   TaskUpdate:
   - taskId: [pr task ID]
   - status: "completed"
   - metadata: {"prUrl": "...", "ciStatus": "passed", "merged": false}
   ```

6. **Report PR status to user:**
   ```
   PR created: https://github.com/owner/repo/pull/123
   CI status: Running... (or Passed/Failed)
   ```

7. **Final session summary from tasks:**
   ```
   Call TaskList to generate final summary:

   ## Session Complete

   **Workflows Executed:** [count completed workflow tasks]
   **Issues Found:** [count issue tasks]
   **Issues Fixed:** [count completed fix tasks]
   **Sync Performance:** Avg [ms], Max [ms], Failures [count]
   **Tests:** [from verification task metadata]
   **PR:** [from pr task metadata]

   All tasks completed successfully.
   ```

## Cross-User Sync Verification

Real-time sync assertions require checking that an action by one user is reflected in the other user's browser. Use the following polling pattern:

### Polling Pattern

```
1. User A performs an action (e.g., sends a message)
2. Record timestamp: sync_start = now()
3. Poll User B's browser for the expected change:
   - Check every 500ms
   - Timeout after 10 seconds (configurable per workflow)
   - Each check: use browser_snapshot or read_page to inspect User B's state
4. Record timestamp: sync_end = now()
5. Calculate: sync_time = sync_end - sync_start
6. Result:
   - If change detected: PASS (sync_time: Xms)
   - If timeout: FAIL (sync_time: >10000ms, timed out)
```

### Sync Timing Thresholds

| Category | Good | Acceptable | Slow | Failed |
|---|---|---|---|---|
| WebSocket/SSE | <500ms | 500-2000ms | 2000-5000ms | >5000ms |
| Polling-based | <2000ms | 2000-5000ms | 5000-10000ms | >10000ms |
| Database sync | <1000ms | 1000-3000ms | 3000-8000ms | >8000ms |

### When Sync Fails

If a cross-user sync assertion fails (timeout):
1. Take screenshots from BOTH browsers showing the inconsistent state
2. Check console logs in both browsers for errors
3. Check network requests for failed WebSocket/API calls
4. Create an issue task with severity "High" and sync timing data
5. Continue to next step (do not block the entire workflow)

## MCP Tool Reference

### Chrome MCP Tools (User A)

**Navigation:**
- `navigate({ url, tabId })` - Go to URL

**Finding Elements:**
- `find({ query, tabId })` - Natural language search, returns refs
- `read_page({ tabId, filter: 'interactive' })` - Get all interactive elements

**Interactions:**
- `computer({ action: 'left_click', coordinate: [x, y], tabId })`
- `computer({ action: 'left_click', ref: 'ref_1', tabId })` - Click by reference
- `computer({ action: 'type', text: '...', tabId })`
- `computer({ action: 'scroll', scroll_direction: 'down', coordinate: [x, y], tabId })`
- `computer({ action: 'left_click_drag', start_coordinate: [x1, y1], coordinate: [x2, y2], tabId })`
- `computer({ action: 'wait', duration: 2, tabId })`

**Screenshots:**
- `computer({ action: 'screenshot', tabId })` - Capture current state

**Inspection:**
- `get_page_text({ tabId })` - Extract text content
- `read_console_messages({ tabId, pattern: 'error' })` - Check for errors
- `read_network_requests({ tabId })` - Check API calls

**Forms:**
- `form_input({ ref, value, tabId })` - Set form field value

### Playwright MCP Tools (User B)

**Navigation:**
- `browser_navigate({ url })` - Navigate to URL

**Page State:**
- `browser_snapshot({})` - Get accessibility snapshot of current page

**Interactions:**
- `browser_click({ element, ref })` - Click an element by description or reference
- `browser_fill_form({ element, ref, value })` - Fill a form field
- `browser_select_option({ element, ref, values })` - Select dropdown option
- `browser_hover({ element, ref })` - Hover over an element
- `browser_drag({ startElement, endElement })` - Drag and drop

**Keyboard:**
- `browser_press_key({ key })` - Press a keyboard key
- `browser_type({ text, submit })` - Type text, optionally press Enter

**Tabs:**
- `browser_tab_list({})` - List open tabs
- `browser_tab_new({ url })` - Open new tab
- `browser_tab_select({ ref })` - Switch to tab

**Utilities:**
- `browser_wait({ time })` - Wait for specified milliseconds
- `browser_resize({ width, height })` - Resize viewport
- `browser_handle_dialog({ accept, promptText })` - Handle alert/confirm/prompt dialogs
- `browser_file_upload({ paths })` - Upload files
- `browser_pdf_save({})` - Save page as PDF
- `browser_close({})` - Close the browser

## Known Limitations

### Chrome MCP Limitations (User A)

1. **Keyboard Shortcuts**
   - System-level shortcuts (Cmd+Z, Cmd+C, Cmd+V, etc.) may cause extension disconnection
   - Browser shortcuts that trigger native behavior can interrupt the session
   - **Workaround:** Use UI buttons instead of keyboard shortcuts when available

2. **Native Browser Dialogs**
   - `alert()`, `confirm()`, `prompt()` dialogs block all browser events
   - File upload dialogs (OS-level file picker)
   - Print dialogs
   - **Workaround:** Skip steps requiring these, or flag for manual testing

3. **Pop-ups and New Windows**
   - Pop-ups that open in new windows outside the MCP tab group
   - OAuth flows that redirect to external authentication pages
   - **Workaround:** Document as requiring manual verification

4. **System-Level Interactions**
   - Browser permission prompts (camera, microphone, notifications, location)
   - Download dialogs and download management
   - Browser settings and preferences pages
   - **Workaround:** Pre-configure permissions or skip these steps

### Playwright MCP Limitations (User B)

1. **No Existing Session**
   - Playwright runs a fresh browser instance with no existing cookies/sessions
   - Authentication must be set up explicitly (login flow, cookie injection, or API tokens)
   - **Workaround:** Include auth setup steps in Phase 2

2. **Separate Browser Context**
   - Playwright runs Chromium, not the user's actual Chrome browser
   - Extensions, saved passwords, and browser profiles are not available
   - **Workaround:** Use API-based auth or explicit login flows

3. **Screenshot Format Differences**
   - Playwright screenshots may differ in format/resolution from Chrome MCP
   - Side-by-side comparisons may need normalization
   - **Workaround:** Note format differences in reports

4. **Network Isolation**
   - Playwright browser has its own network stack
   - Cookies set in Chrome are not shared with Playwright
   - **Workaround:** Set up auth independently in each browser

5. **Dialog Handling**
   - Playwright can handle dialogs programmatically via `browser_handle_dialog`
   - But dialogs must be handled before they appear (pre-register handler)
   - **Workaround:** Set up dialog handlers before triggering dialog-producing actions

### Cross-Browser Limitations

1. **Timing Coordination**
   - No built-in synchronization between Chrome MCP and Playwright MCP
   - Steps are executed sequentially, not truly simultaneously
   - **Workaround:** Use polling with timeouts for sync assertions

2. **State Isolation**
   - Changes in one browser are only visible in the other through the application's sync mechanism
   - Direct DOM/state sharing between browsers is not possible
   - **Workaround:** Rely on application-level sync (WebSocket, polling, SSE)

3. **Screenshot Timing**
   - Screenshots from both browsers are taken sequentially, not simultaneously
   - Small timing differences may exist between User A and User B screenshots
   - **Workaround:** Add short waits before cross-browser screenshots

### Handling Limited Steps

When a workflow step involves a known limitation:

1. **Mark as [MANUAL]:** Note the step requires manual verification
2. **Try Alternative:** If testing keyboard shortcuts, look for UI buttons instead
3. **Document the Limitation:** Record in findings that the step was skipped due to automation limits
4. **Continue Testing:** Don't let one limited step block the entire workflow

## Session Recovery

If resuming from an interrupted session:

**Primary method: Use task list (preferred)**
1. Call `TaskList` to get all existing tasks
2. Check for workflow tasks with status `in_progress` or `pending`
3. Check for issue tasks to understand what was found
4. Check for fix tasks to see what fixes were attempted
5. Resume from the appropriate point based on task states

**Recovery decision tree:**
```
TaskList shows:
├── All workflow tasks completed, no fix tasks
│   └── Ask user: "Audit complete. Want to fix issues?"
├── All workflow tasks completed, fix tasks in_progress
│   └── Resume fix mode, check agent status
├── Some workflow tasks pending
│   └── Resume from first pending workflow
├── Workflow task in_progress
│   └── Read findings file to see which steps completed
│       └── Resume from next step in that workflow
└── No tasks exist
    └── Fresh start (Phase 1)
```

**Fallback method: Use findings file**
1. Read `.claude/plans/multi-user-workflow-findings.md` to see which workflows have been completed
2. Resume from the next uncompleted workflow
3. Recreate tasks for remaining workflows

**Browser recovery:**
When resuming, both browsers may need to be re-initialized:
1. Check if Chrome MCP tab is still active (`tabs_context_mcp`)
2. Check if Playwright browser is still open (`browser_snapshot`)
3. If either browser is unavailable, re-initialize it (Phase 2)
4. Verify both browsers still show the correct authenticated state

**Always inform user:**
```
Resuming from interrupted session:
- Workflows completed: [list from completed tasks]
- Issues found: [count from issue tasks]
- Current state: [in_progress task description]
- Browser status: Chrome MCP [active/needs restart], Playwright [active/needs restart]
- Resuming: [next action]
```

Do not re-execute already-passed workflows unless the user specifically requests it.

## Guidelines

- **Be methodical:** Execute steps in order, don't skip ahead
- **Be observant:** Note anything unusual, even if the step "passes"
- **Be thorough:** Check console for errors, look for visual glitches, monitor sync timing
- **Be constructive:** Frame issues as opportunities for improvement
- **Ask if stuck:** If a step is ambiguous or fails, ask the user for guidance
- **Prefer clicks over keys:** Always use UI buttons instead of keyboard shortcuts when possible
- **Route correctly:** Always check the `[User A]` / `[User B]` prefix before choosing which browser tool to use
- **Capture both perspectives:** For cross-user assertions, always screenshot BOTH browsers
- **Track timing:** Record sync timing for every cross-user assertion
- **Delegate to agents:** Use agents for fixing, verification, and report generation to save context
- **Stay synchronized:** After each user action, verify the other user's browser reflects the expected state

## Handling Failures

If a step fails:
1. Take a screenshot of the failure state from the relevant browser
2. If it's a cross-user issue, take screenshots from BOTH browsers
3. Check console for errors (`read_console_messages` for Chrome, check Playwright output)
4. Check network requests for failed API calls
5. Note what went wrong and which user/browser was affected
6. Ask the user: continue with next step, retry, or abort?

Do not silently skip failed steps.
