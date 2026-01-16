---
name: ios-workflow-executor
description: Executes web app workflows in Safari on the iOS Simulator from /workflows/ios-workflows.md. Use this when the user says "run ios workflows", "execute ios workflows", or "test ios workflows". Tests each workflow step by step in mobile Safari, captures before/after screenshots, documents issues, and generates HTML reports with visual evidence of fixes.
---

# iOS Workflow Executor Skill

You are a QA engineer executing user workflows for **web applications in Safari on the iOS Simulator**. Your job is to methodically test each workflow in mobile Safari, capture before/after evidence, document issues, and optionally fix them with user approval.

**Important:** This skill tests web apps (React, Vue, HTML/CSS/JS, etc.) running in Safari on the iOS Simulator. These web apps are intended to become **PWAs or wrapped native apps** (via Capacitor, Tauri, Electron, etc.) and should feel **indistinguishable from native iOS apps**. The UX bar is native iOS quality—if it feels like a web page, that's a bug.

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

1. Read the file `/workflows/ios-workflows.md`
2. **If the file does not exist or is empty:**
   - Stop immediately
   - Inform the user: "Could not find `/workflows/ios-workflows.md`. Please create this file with your workflows before running this skill."
   - Provide a brief example of the expected format
   - Do not proceed further
3. Parse all workflows (each starts with `## Workflow:`)
4. If no workflows are found in the file, inform the user and stop
5. List the workflows found and ask the user which one to execute (or all)

### Phase 2: Initialize Simulator

**Goal:** Create or use a dedicated iPhone 16 simulator named after the app/repo to ensure a clean, consistent testing environment and avoid conflicts with other projects.

1. **Determine the simulator name:**
   - Get the app/repo name from the current working directory: `basename $(pwd)`
   - Or extract from the workflow file's app name if specified
   - Simulator name format: `{AppName}-Workflow-iPhone16`
   - Example: For a repo named "MyAwesomeApp", create `MyAwesomeApp-Workflow-iPhone16`

2. Call `list_simulators` to see available simulators

3. **Look for an existing project-specific simulator:**
   - Search for a simulator matching the `{AppName}-Workflow-iPhone16` pattern
   - If found and available, use it

4. **If no project simulator exists, create one:**
   - First, get the repo/app name: `basename $(pwd)`
   - Run via Bash: `xcrun simctl create "{AppName}-Workflow-iPhone16" "iPhone 16" iOS18.2`
   - Note: Adjust iOS version to latest available (use `xcrun simctl list runtimes` to check)
   - This creates a fresh simulator with no prior state

5. Call `boot_simulator` with the UDID of the project's workflow test simulator
6. Call `claim_simulator` with the UDID to claim it for this session
7. Call `open_simulator` to ensure Simulator.app is visible

8. **Optional: Reset simulator for clean state:**
   - If the simulator has prior state, consider: `xcrun simctl erase <udid>`
   - This resets to factory defaults (ask user first if data might be important)

9. Take an initial screenshot with `screenshot` to confirm simulator is ready
10. Store the `udid` for all subsequent operations
11. **Record simulator info** for the report: device name, iOS version, UDID, app name

**Simulator Naming Convention:**
- `{AppName}-Workflow-iPhone16` - Default workflow testing device (e.g., `Seatify-Workflow-iPhone16`)
- `{AppName}-Workflow-iPhone16-Pro` - For Pro-specific features
- `{AppName}-Workflow-iPad` - For iPad testing

**Creating Simulators (Bash commands):**
```bash
# Get the app/repo name
APP_NAME=$(basename $(pwd))

# List available device types
xcrun simctl list devicetypes | grep iPhone

# List available runtimes
xcrun simctl list runtimes

# Create project-specific iPhone 16 simulator
xcrun simctl create "${APP_NAME}-Workflow-iPhone16" "iPhone 16" iOS18.2

# Create project-specific iPhone 16 Pro simulator
xcrun simctl create "${APP_NAME}-Workflow-iPhone16-Pro" "iPhone 16 Pro" iOS18.2

# Erase simulator to clean state
xcrun simctl erase <udid>

# Delete simulator when done
xcrun simctl delete <udid>

# List all workflow simulators (to find project-specific ones)
xcrun simctl list devices | grep "Workflow-iPhone"
```

### Phase 3: Execute Workflow

For each numbered step in the workflow:

1. **Announce** the step you're about to execute
2. **Execute** using the appropriate MCP tool:
   - "Open Safari and navigate to [URL]" → `launch_app` with `com.apple.mobilesafari`, then `open_url` or type URL in address bar
   - "Tap [element]" → `ui_describe_all` to find coordinates, then `ui_tap`
   - "Type [text]" → `ui_type`
   - "Swipe [direction]" → `ui_swipe`
   - "Verify [condition]" → `ui_describe_all` or `ui_view` to check
   - "Wait [seconds]" → pause before next action
   - "Refresh page" → tap Safari refresh button or pull-to-refresh
3. **Screenshot** after each action using `screenshot`
4. **Observe** and note:
   - Did it work as expected?
   - Any UI/UX issues? (confusing labels, poor contrast, slow response)
   - Any technical problems? (page errors, slow loading, visual glitches)
   - Does the web app feel appropriate on iOS Safari?
   - Any potential improvements or feature ideas?
5. **Record** your observations before moving to next step

### Phase 4: UX Platform Evaluation [DELEGATE TO AGENT]

**Purpose:** Evaluate whether the web app feels like a native iOS app (not just a mobile-friendly website). Delegate this research to an agent to save context.

**Use the Task tool to spawn an agent:**

```
Task tool parameters:
- subagent_type: "general-purpose"
- model: "opus" (thorough research and evaluation)
- prompt: |
    You are evaluating a web app for iOS HIG (Human Interface Guidelines) compliance.
    The app should feel indistinguishable from a native iOS app.

    ## Screen Being Evaluated
    [Include current screen description and context]

    ## Quick Checklist - Evaluate Each Item

    **Navigation (must feel native):**
    - Uses tab bar for primary navigation (not hamburger menu)
    - Back navigation feels native (swipe gesture or back button)
    - No breadcrumb navigation
    - Modals slide up from bottom like native iOS sheets

    **Touch & Interaction:**
    - All tap targets are at least 44x44pt
    - No hover-dependent interactions
    - Animations feel native (spring physics, smooth)
    - Forms work well with the on-screen keyboard

    **Components (should match native iOS):**
    - Uses iOS-style pickers, not web dropdowns
    - Toggle switches, not checkboxes
    - No Material Design components (FAB, snackbars, etc.)
    - Action sheets and alerts follow iOS patterns

    **Visual Design:**
    - Typography follows iOS conventions (SF Pro feel)
    - Subtle shadows and rounded corners (not Material elevation)
    - Safe area insets respected on notched devices
    - Doesn't look like a "website" - feels like an app

    ## Reference Comparison

    Search for reference examples using WebSearch:
    - "iOS [screen type] design Dribbble"
    - "[well-known iOS app like Airbnb/Spotify/Instagram] [screen type] screenshot"
    - "iOS Human Interface Guidelines [component]"

    Visit 2-3 reference examples and compare:
    - Navigation placement and style (tab bar position, back button)
    - Component types (iOS pickers vs web dropdowns)
    - Layout and spacing (iOS generous whitespace)
    - Animation and transition patterns

    ## Return Format

    Return a structured report:
    ```
    ## iOS HIG Evaluation: [Screen Name]

    ### Checklist Results
    | Check | Pass/Fail | Notes |
    |-------|-----------|-------|

    ### Reference Comparison
    - Reference apps compared: [list]
    - Key differences found: [list]

    ### Issues Found (iOS Anti-Patterns)
    - [Issue 1]: [Description] (Severity: High/Med/Low)
      - Anti-pattern: [What's wrong]
      - iOS-native alternative: [What it should be]

    ### Recommendations
    - [Recommendation 1]
    ```
```

**After agent returns:** Incorporate findings into the workflow report and continue.

### Phase 5: Record Findings

**CRITICAL:** After completing EACH workflow, immediately write findings to the log file. Do not wait until all workflows are complete.

1. After each workflow completes, append to `.claude/plans/ios-workflow-findings.md`
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
- iOS conventions followed: [Yes/Partially/No]
- Issues: [List any platform anti-patterns found]
- Reference comparisons: [Apps/screens compared, if any]

**UX/Design Notes:**
- [Observation]

**Technical Problems:**
- [Problem] (include crash logs if any)

**Feature Ideas:**
- [Idea]

**Screenshots:** [list of screenshot paths captured]
```

4. This ensures findings are preserved even if session is interrupted
5. Continue to next workflow after recording

### Phase 6: Generate Audit Report

After completing all workflows (or when user requests), consolidate findings into a summary report:

1. Read `.claude/plans/ios-workflow-findings.md` for all recorded findings
2. Write consolidated report to `.claude/plans/ios-workflow-report.md`
3. Include overall statistics, prioritized issues, and recommendations
4. Present findings to user and await instructions (fix all, fix some, or done)

### Phase 7: Screenshot Management

**Screenshot Directory Structure:**
```
workflows/
├── screenshots/
│   ├── {workflow-name}/
│   │   ├── before/
│   │   │   ├── 01-hamburger-menu.png
│   │   │   ├── 02-fab-button.png
│   │   │   └── ...
│   │   └── after/
│   │       ├── 01-tab-bar-navigation.png
│   │       ├── 02-no-fab.png
│   │       └── ...
│   └── {another-workflow}/
│       ├── before/
│       └── after/
├── ios-workflows.md
└── ios-changes-report.html
```

**Screenshot Naming Convention:**
- `{NN}-{descriptive-name}.png`
- Examples:
  - `01-hamburger-menu.png` (before)
  - `01-tab-bar-navigation.png` (after)
  - `02-fab-button-visible.png` (before)
  - `02-fab-removed.png` (after)

**Capturing BEFORE Screenshots:**
1. When an issue is identified during workflow execution
2. Take screenshot BEFORE any fix is applied
3. Save to `workflows/screenshots/{workflow-name}/before/`
4. Use descriptive filename that identifies the issue
5. Record the screenshot path in the issue tracking

**Capturing AFTER Screenshots:**
1. Only after user approves fixing an issue
2. After fix agent completes, reload/refresh the app in simulator
3. Take screenshot showing the fix
4. Save to `workflows/screenshots/{workflow-name}/after/`
5. Use matching filename pattern to the before screenshot

### Phase 8: Fix Mode Execution [DELEGATE TO AGENTS]

When user triggers fix mode ("fix this issue" or "fix all"):

1. **Confirm which issues to fix:**
   ```
   Issues found:
   1. Hamburger menu (iOS anti-pattern) - BEFORE: 01-hamburger-menu.png
   2. FAB button (Material Design) - BEFORE: 02-fab-button.png
   3. Web dropdown (not iOS picker) - BEFORE: 03-web-dropdown.png

   Fix all issues? Or specify which to fix: [1,2,3 / all / specific numbers]
   ```

2. **Spawn one agent per issue** using the Task tool. For independent issues, spawn agents in parallel (all in a single message):

```
Task tool parameters (for each issue):
- subagent_type: "general-purpose"
- model: "opus" (thorough code analysis and modification)
- prompt: |
    You are fixing a specific iOS UX issue in a web application.
    The app should feel indistinguishable from a native iOS app.

    ## Issue to Fix
    **Issue:** [Issue name and description]
    **Severity:** [High/Med/Low]
    **iOS Anti-Pattern:** [What's wrong - e.g., "hamburger menu"]
    **iOS-Native Solution:** [What it should be - e.g., "bottom tab bar"]
    **Screenshot reference:** [Path to before screenshot]

    ## Your Task

    1. **Explore the codebase** to understand the implementation
       - Use Glob to find relevant files
       - Use Grep to search for related code
       - Use Read to examine files

    2. **Plan the fix**
       - Identify which files need changes
       - May need to create new iOS-style components
       - Consider side effects

    3. **Implement the fix**
       - Make minimal, focused changes
       - Follow existing code patterns
       - Create iOS-native components if needed
       - Do not refactor unrelated code

    4. **Return a summary:**
    ```
    ## Fix Complete: [Issue Name]

    ### iOS Anti-Pattern Replaced
    - Before: [What was wrong]
    - After: [iOS-native solution]

    ### Changes Made
    - [File 1]: [What changed]
    - [File 2]: [What changed]

    ### Files Modified
    - src/components/IOSTabBar.tsx (NEW)
    - src/components/Navigation.tsx (MODIFIED)

    ### Testing Notes
    - [How to verify the fix works]
    ```

    Do NOT run tests - the main workflow will handle that.
```

3. **After all fix agents complete:**
   - Collect summaries from each agent
   - Reload the app in simulator
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
    Recent changes were made to fix iOS UX issues. You need to verify the codebase is healthy.

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
    Generate an HTML report for iOS HIG compliance fixes.

    ## Data to Include

    **App Name:** [App name]
    **Date:** [Current date]
    **Device:** [Simulator device name and iOS version]
    **Issues Fixed:** [Count]
    **Issues Remaining:** [Count]

    **Fixes Made:**
    [For each fix:]
    - Issue: [Name]
    - iOS Anti-Pattern: [What was wrong]
    - iOS-Native Fix: [What it is now]
    - Before screenshot: workflows/screenshots/{workflow}/before/{file}.png
    - After screenshot: workflows/screenshots/{workflow}/after/{file}.png
    - Files changed: [List]
    - Why it matters: [Explanation of iOS HIG compliance]

    ## Output

    Write the HTML report to: workflows/ios-changes-report.html

    Use this template structure:
    - Executive summary with stats
    - Before/after screenshot comparisons for each fix
    - iOS anti-pattern → iOS-native fix explanation
    - Files changed section
    - "Why this matters for iOS users" explanations

    Style: Clean, professional, Apple-style design (SF Pro fonts feel, iOS blue accents).

    Return confirmation when complete.
```

### Phase 11: Generate Markdown Report [DELEGATE TO AGENT]

**Use the Task tool to generate the Markdown report:**

```
Task tool parameters:
- subagent_type: "general-purpose"
- model: "haiku"
- prompt: |
    Generate a Markdown report for iOS HIG compliance fixes.

    ## Data to Include
    [Same data as HTML report]

    ## Output

    Write the Markdown report to: workflows/ios-changes-documentation.md

    Include:
    - Executive summary
    - Before/after comparison table with iOS anti-pattern and fix columns
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
   git checkout -b fix/ios-ux-compliance
   ```

2. **Stage and commit changes:**
   ```bash
   git add .
   git commit -m "fix: iOS UX compliance improvements

   - [List key fixes made]
   - Updated tests to reflect new behavior
   - All local tests passing"
   ```

3. **Push and create PR:**
   ```bash
   git push -u origin fix/ios-ux-compliance
   gh pr create --title "fix: iOS UX compliance improvements" --body "## Summary
   [Brief description of fixes]

   ## Changes
   - [List of changes]

   ## Testing
   - [x] All unit tests pass locally
   - [x] All E2E tests pass locally
   - [x] Manual verification in iOS Simulator complete

   ## Screenshots
   See workflows/ios-changes-report.html for before/after comparisons"
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

**Simulator Management:**
- `list_simulators()` - List all available simulators with status
- `claim_simulator({ udid? })` - Claim simulator for exclusive use
- `get_claimed_simulator()` - Get info about claimed simulator
- `boot_simulator({ udid })` - Boot a specific simulator
- `open_simulator()` - Open Simulator.app

**Finding Elements:**
- `ui_describe_all({ udid? })` - Get accessibility tree of entire screen
- `ui_describe_point({ x, y, udid? })` - Get element at specific coordinates
- `ui_view({ udid? })` - Get compressed screenshot image

**Interactions:**
- `ui_tap({ x, y, duration?, udid? })` - Tap at coordinates
- `ui_type({ text, udid? })` - Type text (ASCII printable characters only)
- `ui_swipe({ x_start, y_start, x_end, y_end, duration?, delta?, udid? })` - Swipe gesture

**Screenshots & Recording:**
- `screenshot({ output_path, type?, udid? })` - Save screenshot to file
- `record_video({ output_path?, codec?, udid? })` - Start video recording
- `stop_recording()` - Stop video recording

**App Management:**
- `install_app({ app_path, udid? })` - Install .app or .ipa
- `launch_app({ bundle_id, terminate_running?, udid? })` - Launch app by bundle ID

## Key Bundle ID

For testing web apps, you'll primarily use Safari:

- **Safari:** `com.apple.mobilesafari` - Use this to launch Safari and navigate to your web app URL

To open a URL in Safari:
1. Launch Safari: `launch_app({ bundle_id: "com.apple.mobilesafari" })`
2. Tap the address bar
3. Type the URL using `ui_type`
4. Tap Go or press Enter

## Coordinate System

The iOS Simulator uses pixel coordinates from top-left (0, 0).
- Use `ui_describe_all` to find element positions
- Elements report their `frame` with x, y, width, height
- Tap center of element: x + width/2, y + height/2

## Known Limitations

When testing web apps in Safari on the iOS Simulator, these limitations apply:

### Cannot Automate (Must Skip or Flag for Manual Testing)

1. **Safari-Specific Dialogs**
   - JavaScript alerts/confirms/prompts
   - Download prompts
   - "Add to Home Screen" flow
   - **Workaround:** Test manually or dismiss dialogs before continuing

2. **Web Permission Prompts**
   - Camera/microphone access via browser
   - Location access via browser
   - Notification permissions
   - **Workaround:** Pre-authorize in Settings or flag for manual testing

3. **Keyboard Limitations**
   - `ui_type` only supports ASCII printable characters
   - Special characters, emoji, and non-Latin scripts cannot be typed
   - Autocorrect interactions
   - **Workaround:** For special text, pre-populate test data

4. **Safari UI Interactions**
   - Bookmarks, Reading List, History
   - Share sheet from Safari
   - Safari settings/preferences
   - **Workaround:** Focus on web app testing, not Safari itself

5. **External Authentication**
   - OAuth flows that open new windows
   - Sign in with Apple on web
   - Third-party login popups
   - **Workaround:** Use test accounts, flag for manual verification

### Handling Limited Steps

When a workflow step involves a known limitation:

1. **Mark as [MANUAL]:** Note the step requires manual verification
2. **Pre-configure:** Set up test data or permissions before testing
3. **Document the Limitation:** Record in findings that the step was skipped due to automation limits
4. **Continue Testing:** Don't let one limited step block the entire workflow

## Guidelines

- **Be methodical:** Execute steps in order, don't skip ahead
- **Be observant:** Note anything unusual, even if the step "passes"
- **Be thorough:** Look for visual glitches, animation issues, responsiveness
- **Be constructive:** Frame issues as opportunities for improvement
- **Ask if stuck:** If a step is ambiguous or fails, ask the user for guidance
- **Pre-configure when possible:** Set up simulator state before running workflows
- **Delegate to agents:** Use agents for research, fixing, verification, and report generation to save context

## Handling Failures

If a step fails:
1. Take a screenshot of the failure state
2. Use `ui_describe_all` to understand current screen state
3. Note what went wrong
4. Ask the user: continue with next step, retry, or abort?

Do not silently skip failed steps.

## Swipe Directions Reference

```
Swipe Up:    x_start=200, y_start=600, x_end=200, y_end=200
Swipe Down:  x_start=200, y_start=200, x_end=200, y_end=600
Swipe Left:  x_start=350, y_start=400, x_end=50, y_end=400
Swipe Right: x_start=50, y_start=400, x_end=350, y_end=400
```

Adjust coordinates based on actual screen size from `ui_describe_all`.

## Session Recovery

If resuming from an interrupted session:

1. Read `.claude/plans/ios-workflow-findings.md` to see which workflows have been completed
2. Resume from the next uncompleted workflow
3. Do not re-execute already-passed workflows unless the user specifically requests it
4. Inform the user which workflows were already completed and where you're resuming from
