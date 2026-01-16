---
name: browser-workflow-executor
description: Executes browser-based user workflows from /workflows/browser-workflows.md using Claude-in-Chrome MCP. Use this when the user says "run browser workflows", "execute browser workflows", or "test browser workflows". Tests each workflow step by step, captures before/after screenshots, documents issues, and generates HTML reports with visual evidence of fixes.
---

# Browser Workflow Executor Skill

You are a QA engineer executing user workflows in a real browser. Your job is to methodically test each workflow, capture before/after evidence, document issues, and optionally fix them with user approval.

## Execution Modes

This skill operates in two modes:

### Audit Mode (Default Start)
- Execute workflows and identify issues
- Capture **BEFORE screenshots** of all issues found
- Document issues without fixing them
- Present findings to user for review

### Fix Mode (User-Triggered)
- User says "fix this issue" or "fix all issues"
- Spawn agents to fix issues (one agent per issue)
- Capture **AFTER screenshots** showing the fix
- Generate HTML report with before/after comparison

**Flow:**
```
Audit Mode → Find Issues → Capture BEFORE → Present to User
                                                    ↓
                                        User: "Fix this issue"
                                                    ↓
Fix Mode → Spawn Fix Agents → Capture AFTER → Verify Locally
                                                    ↓
                              Run Tests → Fix Failing Tests → Run E2E
                                                    ↓
                                    All Pass → Generate Reports → Create PR
```

## Process

### Phase 1: Read Workflows

1. Read the file `/workflows/browser-workflows.md`
2. **If the file does not exist or is empty:**
   - Stop immediately
   - Inform the user: "Could not find `/workflows/browser-workflows.md`. Please create this file with your workflows before running this skill."
   - Provide a brief example of the expected format
   - Do not proceed further
3. Parse all workflows (each starts with `## Workflow:`)
4. If no workflows are found in the file, inform the user and stop
5. List the workflows found and ask the user which one to execute (or all)

### Phase 2: Initialize Browser

1. Call `tabs_context_mcp` with `createIfEmpty: true` to get/create a tab
2. Store the `tabId` for all subsequent operations
3. Take an initial screenshot to confirm browser is ready

### Phase 3: Execute Workflow

For each numbered step in the workflow:

1. **Announce** the step you're about to execute
2. **Execute** using the appropriate MCP tool:
   - "Navigate to [URL]" → `navigate`
   - "Click [element]" → `find` to locate, then `computer` with `left_click`
   - "Type [text]" → `computer` with `type` action
   - "Verify [condition]" → `read_page` or `get_page_text` to check
   - "Drag [element]" → `computer` with `left_click_drag`
   - "Scroll [direction]" → `computer` with `scroll`
   - "Wait [seconds]" → `computer` with `wait`
3. **Screenshot** after each action using `computer` with `action: screenshot`
4. **Observe** and note:
   - Did it work as expected?
   - Any UI/UX issues? (confusing labels, poor contrast, slow response)
   - Any technical problems? (errors in console, failed requests)
   - Any potential improvements or feature ideas?
5. **Record** your observations before moving to next step

### Phase 4: UX Platform Evaluation [DELEGATE TO AGENT]

**Purpose:** Evaluate whether the web app follows web platform conventions. Delegate this research to an agent to save context.

**Use the Task tool to spawn an agent:**

```
Task tool parameters:
- subagent_type: "general-purpose"
- model: "opus" (thorough research and evaluation)
- prompt: |
    You are evaluating a web app for web platform UX compliance.

    ## Page Being Evaluated
    [Include current page URL and brief description]

    ## Quick Checklist - Evaluate Each Item

    **Navigation:**
    - Browser back button works correctly
    - URLs reflect current state (deep-linkable)
    - No mobile-style bottom tab bar
    - Navigation works without gestures (click-based)

    **Interactions:**
    - All interactive elements have hover states
    - Keyboard navigation works (Tab, Enter, Escape)
    - Focus indicators are visible
    - No gesture-only interactions for critical features

    **Components:**
    - Uses web-appropriate form components
    - No iOS-style picker wheels
    - No Android-style floating action buttons
    - Modals don't unnecessarily go full-screen

    **Responsive/Visual:**
    - Layout works at different viewport widths
    - No mobile-only viewport restrictions
    - Text is readable without zooming

    **Accessibility:**
    - Color is not the only indicator of state
    - Form fields have labels

    ## Reference Comparison

    Search for reference examples using WebSearch:
    - "web app [page type] design Dribbble"
    - "[well-known web app like Linear/Notion/Figma] [page type] screenshot"

    Visit 2-3 reference examples and compare:
    - Navigation placement and behavior
    - Component types and interaction patterns
    - Hover/focus states

    ## Return Format

    Return a structured report:
    ```
    ## UX Platform Evaluation: [Page Name]

    ### Checklist Results
    | Check | Pass/Fail | Notes |
    |-------|-----------|-------|

    ### Reference Comparison
    - Reference apps compared: [list]
    - Key differences found: [list]

    ### Issues Found
    - [Issue 1]: [Description] (Severity: High/Med/Low)

    ### Recommendations
    - [Recommendation 1]
    ```
```

**After agent returns:** Incorporate findings into the workflow report and continue.

### Phase 5: Record Findings

**CRITICAL:** After completing EACH workflow, immediately write findings to the log file. Do not wait until all workflows are complete.

1. After each workflow completes, append to `.claude/plans/browser-workflow-findings.md`
2. If the file doesn't exist, create it with a header first
3. Use the following format for each workflow entry:

```markdown
---
### Workflow [N]: [Name]
**Timestamp:** [ISO datetime]
**Status:** Passed/Failed/Partial

**Steps Summary:**
- Step 1: [Pass/Fail] - [brief note]
- Step 2: [Pass/Fail] - [brief note]
...

**Issues Found:**
- [Issue description] (Severity: High/Med/Low)

**Platform Appropriateness:**
- Web conventions followed: [Yes/Partially/No]
- Issues: [List any platform anti-patterns found]
- Reference comparisons: [Apps/pages compared, if any]

**UX/Design Notes:**
- [Observation]

**Technical Problems:**
- [Problem] (include console errors if any)

**Feature Ideas:**
- [Idea]

**Screenshots:** [list of screenshot IDs captured]
```

4. This ensures findings are preserved even if session is interrupted
5. Continue to next workflow after recording

### Phase 6: Generate Audit Report

After completing all workflows (or when user requests), consolidate findings into a summary report:

1. Read `.claude/plans/browser-workflow-findings.md` for all recorded findings
2. Write consolidated report to `.claude/plans/browser-workflow-report.md`
3. Include overall statistics, prioritized issues, and recommendations
4. Present findings to user and await instructions (fix all, fix some, or done)

### Phase 7: Screenshot Management

**Screenshot Directory Structure:**
```
workflows/
├── screenshots/
│   ├── {workflow-name}/
│   │   ├── before/
│   │   │   ├── 01-hover-states-missing.png
│   │   │   ├── 02-keyboard-nav-broken.png
│   │   │   └── ...
│   │   └── after/
│   │       ├── 01-hover-states-added.png
│   │       ├── 02-keyboard-nav-fixed.png
│   │       └── ...
│   └── {another-workflow}/
│       ├── before/
│       └── after/
├── browser-workflows.md
└── browser-changes-report.html
```

**Screenshot Naming Convention:**
- `{NN}-{descriptive-name}.png`
- Examples:
  - `01-hover-states-missing.png` (before)
  - `01-hover-states-added.png` (after)

**Capturing BEFORE Screenshots:**
1. When an issue is identified during workflow execution
2. Take screenshot BEFORE any fix is applied
3. Save to `workflows/screenshots/{workflow-name}/before/`
4. Use descriptive filename that identifies the issue
5. Record the screenshot path in the issue tracking

**Capturing AFTER Screenshots:**
1. Only after user approves fixing an issue
2. After fix agent completes, refresh the browser tab
3. Take screenshot showing the fix
4. Save to `workflows/screenshots/{workflow-name}/after/`
5. Use matching filename pattern to the before screenshot

### Phase 8: Fix Mode Execution [DELEGATE TO AGENTS]

When user triggers fix mode ("fix this issue" or "fix all"):

1. **Confirm which issues to fix:**
   ```
   Issues found:
   1. Missing hover states on buttons - BEFORE: 01-hover-states-missing.png
   2. Keyboard navigation broken - BEFORE: 02-keyboard-nav-broken.png
   3. Back button doesn't work - BEFORE: 03-back-button-broken.png

   Fix all issues? Or specify which to fix: [1,2,3 / all / specific numbers]
   ```

2. **Spawn one agent per issue** using the Task tool. For independent issues, spawn agents in parallel (all in a single message):

```
Task tool parameters (for each issue):
- subagent_type: "general-purpose"
- model: "opus" (thorough code analysis and modification)
- prompt: |
    You are fixing a specific UX issue in a web application.

    ## Issue to Fix
    **Issue:** [Issue name and description]
    **Severity:** [High/Med/Low]
    **Current behavior:** [What's wrong]
    **Expected behavior:** [What it should do]
    **Screenshot reference:** [Path to before screenshot]

    ## Your Task

    1. **Explore the codebase** to understand the implementation
       - Use Glob to find relevant files
       - Use Grep to search for related code
       - Use Read to examine files

    2. **Plan the fix**
       - Identify which files need changes
       - Consider side effects

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
    - src/components/Button.css (MODIFIED)
    - src/styles/global.css (MODIFIED)

    ### Testing Notes
    - [How to verify the fix works]
    ```

    Do NOT run tests - the main workflow will handle that.
```

3. **After all fix agents complete:**
   - Collect summaries from each agent
   - Refresh the browser
   - Capture AFTER screenshots for each fix
   - Verify fixes visually
   - Track all changes made

### Phase 9: Local Verification [DELEGATE TO AGENT]

**CRITICAL:** After making fixes, verify everything works locally before creating a PR.

**Use the Task tool to spawn a verification agent:**

```
Task tool parameters:
- subagent_type: "general-purpose"
- model: "opus" (thorough test analysis and fixing)
- prompt: |
    You are verifying that code changes pass all tests.

    ## Context
    Recent changes were made to fix UX issues. You need to verify the codebase is healthy.

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
       - Analyze the failures (may be related to UI changes)
       - Update E2E tests to reflect new UI behavior
       - Re-run until all pass
       - Document what E2E tests were updated

    6. **Return verification results:**
    ```
    ## Local Verification Results

    ### Test Results
    - Unit tests: ✓/✗ [count] passed, [count] failed
    - Lint: ✓/✗ [errors if any]
    - Type check: ✓/✗ [errors if any]
    - E2E tests: ✓/✗ [count] passed, [count] failed

    ### Tests Updated
    - [test file 1]: [why updated]
    - [test file 2]: [why updated]

    ### Status: PASS / FAIL
    [If FAIL, explain what's still broken]
    ```
```

**After agent returns:**
- If PASS: Proceed to report generation
- If FAIL: Review failures with user, spawn another agent to fix remaining issues

### Phase 10: Generate HTML Report [DELEGATE TO AGENT]

**Use the Task tool to generate the HTML report:**

```
Task tool parameters:
- subagent_type: "general-purpose"
- model: "haiku" (simple generation task)
- prompt: |
    Generate an HTML report for browser UX compliance fixes.

    ## Data to Include

    **App Name:** [App name]
    **Date:** [Current date]
    **Issues Fixed:** [Count]
    **Issues Remaining:** [Count]

    **Fixes Made:**
    [For each fix:]
    - Issue: [Name]
    - Before screenshot: workflows/screenshots/{workflow}/before/{file}.png
    - After screenshot: workflows/screenshots/{workflow}/after/{file}.png
    - Files changed: [List]
    - Why it matters: [Explanation]

    ## Output

    Write the HTML report to: workflows/browser-changes-report.html

    Use this template structure:
    - Executive summary with stats
    - Before/after screenshot comparisons for each fix
    - Files changed section
    - "Why this matters" explanations

    Style: Clean, professional, uses system fonts, responsive grid for screenshots.

    Return confirmation when complete.
```

### Phase 11: Generate Markdown Report [DELEGATE TO AGENT]

**Use the Task tool to generate the Markdown report:**

```
Task tool parameters:
- subagent_type: "general-purpose"
- model: "haiku"
- prompt: |
    Generate a Markdown report for browser UX compliance fixes.

    ## Data to Include
    [Same data as HTML report]

    ## Output

    Write the Markdown report to: workflows/browser-changes-documentation.md

    Include:
    - Executive summary
    - Before/after comparison table
    - Detailed changes for each fix
    - Files changed
    - Technical implementation notes
    - Testing verification results

    Return confirmation when complete.
```

### Phase 12: Create PR and Monitor CI

**Only after local verification passes**, create the PR:

1. **Create a feature branch:**
   ```bash
   git checkout -b fix/browser-ux-compliance
   ```

2. **Stage and commit changes:**
   ```bash
   git add .
   git commit -m "fix: browser UX compliance improvements

   - [List key fixes made]
   - Updated tests to reflect new behavior
   - All local tests passing"
   ```

3. **Push and create PR:**
   ```bash
   git push -u origin fix/browser-ux-compliance
   gh pr create --title "fix: Browser UX compliance improvements" --body "## Summary
   [Brief description of fixes]

   ## Changes
   - [List of changes]

   ## Testing
   - [x] All unit tests pass locally
   - [x] All E2E tests pass locally
   - [x] Manual verification complete

   ## Screenshots
   See workflows/browser-changes-report.html for before/after comparisons"
   ```

4. **Monitor CI:**
   - Watch for CI workflow to start
   - If CI fails, analyze the failure
   - Fix any CI-specific issues (environment differences, flaky tests)
   - Push fixes and re-run CI
   - Do not merge until CI is green

5. **Report PR status to user:**
   ```
   PR created: https://github.com/owner/repo/pull/123
   CI status: Running... (or Passed/Failed)
   ```

## MCP Tool Reference

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

## Known Limitations

The Claude-in-Chrome browser automation has the following limitations that cannot be automated:

### Cannot Automate (Must Skip or Flag for Manual Testing)

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

### Handling Limited Steps

When a workflow step involves a known limitation:

1. **Mark as [MANUAL]:** Note the step requires manual verification
2. **Try UI Alternative:** If testing "Press Cmd+Z to undo", look for an Undo button instead
3. **Document the Limitation:** Record in findings that the step was skipped due to automation limits
4. **Continue Testing:** Don't let one limited step block the entire workflow

## Guidelines

- **Be methodical:** Execute steps in order, don't skip ahead
- **Be observant:** Note anything unusual, even if the step "passes"
- **Be thorough:** Check console for errors, look for visual glitches
- **Be constructive:** Frame issues as opportunities for improvement
- **Ask if stuck:** If a step is ambiguous or fails, ask the user for guidance
- **Prefer clicks over keys:** Always use UI buttons instead of keyboard shortcuts when possible
- **Delegate to agents:** Use agents for research, fixing, verification, and report generation to save context

## Handling Failures

If a step fails:
1. Take a screenshot of the failure state
2. Check console for errors (`read_console_messages`)
3. Note what went wrong
4. Ask the user: continue with next step, retry, or abort?

Do not silently skip failed steps.

## Session Recovery

If resuming from an interrupted session:

1. Read `.claude/plans/browser-workflow-findings.md` to see which workflows have been completed
2. Resume from the next uncompleted workflow
3. Do not re-execute already-passed workflows unless the user specifically requests it
4. Inform the user which workflows were already completed and where you're resuming from
