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
- Make the code changes to fix the issue
- Capture **AFTER screenshots** showing the fix
- Generate HTML report with before/after comparison

**Flow:**
```
Audit Mode → Find Issues → Capture BEFORE → Present to User
                                                    ↓
                                        User: "Fix this issue"
                                                    ↓
Fix Mode → Make Changes → Capture AFTER → Generate HTML Report
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
5. **Evaluate platform appropriateness** (see Phase 3.25 below)
6. **Record** your observations before moving to next step

### Phase 3.25: UX Platform Evaluation

For each page/screen encountered, evaluate whether the **web app feels like a native iOS app** (not just a mobile-friendly website):

#### Quick Checklist (check on every page)

**Navigation (must feel native):**
- [ ] Uses tab bar for primary navigation (not hamburger menu)
- [ ] Back navigation feels native (swipe gesture or back button)
- [ ] No breadcrumb navigation
- [ ] Modals slide up from bottom like native iOS sheets

**Touch & Interaction:**
- [ ] All tap targets are at least 44x44pt
- [ ] No hover-dependent interactions
- [ ] Animations feel native (spring physics, smooth)
- [ ] Forms work well with the on-screen keyboard

**Components (should match native iOS):**
- [ ] Uses iOS-style pickers, not web dropdowns
- [ ] Toggle switches, not checkboxes
- [ ] No Material Design components (FAB, snackbars, etc.)
- [ ] Action sheets and alerts follow iOS patterns

**Visual Design:**
- [ ] Typography follows iOS conventions (SF Pro feel)
- [ ] Subtle shadows and rounded corners (not Material elevation)
- [ ] Safe area insets respected on notched devices
- [ ] Doesn't look like a "website" - feels like an app

#### Reference Comparison Process

When you identify a potential UX issue or something that doesn't feel native:

1. **Identify the screen type** (login, dashboard, settings, list view, detail, etc.)

2. **Search for reference examples** using WebSearch:
   ```
   Search: "iOS [screen type] design Dribbble"
   OR: "[well-known iOS app] [screen type] screenshot"
   Examples:
   - "iOS login screen design Dribbble"
   - "Airbnb iOS app settings screenshot"
   - "iOS list view design patterns 2024"
   ```

3. **Visit 2-3 reference examples** using WebFetch or browser to view:
   - Dribbble shots of similar iOS screens
   - Screenshots from well-known native iOS apps (Airbnb, Spotify, Instagram, Apple apps)
   - iOS Human Interface Guidelines examples

4. **Compare structural patterns** (not exact styling):
   - Navigation placement and style (tab bar position, back button)
   - Component types (iOS pickers vs web dropdowns)
   - Layout and spacing (iOS generous whitespace)
   - Animation and transition patterns

5. **Document the comparison**:
   ```markdown
   **UX Comparison: Settings Screen**
   - Reference apps: iOS Settings, Spotify, Airbnb
   - Issue found: App uses hamburger menu for navigation
   - Reference pattern: All three apps use bottom tab bar
   - Recommendation: Replace hamburger with tab bar navigation
   ```

#### When to Trigger Reference Comparison

- When you see a hamburger menu instead of tab bar
- When tap targets feel too small
- When components look "web-like" (dropdowns, checkboxes)
- When navigation doesn't feel like native iOS
- When animations feel jerky or non-native
- When you see Material Design patterns (FAB, elevation shadows, snackbars)
- When the app feels like a "website" instead of a native app
- Any time something looks "off" but you want to validate your instinct

### Phase 3.5: Record Findings Incrementally

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

### Phase 4: Screenshot Management

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
2. Make the code changes to fix the issue
3. Reload/refresh the app in simulator
4. Take screenshot showing the fix
5. Save to `workflows/screenshots/{workflow-name}/after/`
6. Use matching filename pattern to the before screenshot

### Phase 5: Fix Mode Execution

When user triggers fix mode ("fix this issue" or "fix all"):

1. **Confirm which issues to fix:**
   ```
   Issues found:
   1. Hamburger menu (iOS anti-pattern) - BEFORE: 01-hamburger-menu.png
   2. FAB button (Material Design) - BEFORE: 02-fab-button.png
   3. Web dropdown (not iOS picker) - BEFORE: 03-web-dropdown.png

   Fix all issues? Or specify which to fix: [1,2,3 / all / specific numbers]
   ```

2. **For each issue to fix:**
   - Explore codebase to understand the implementation
   - Plan the fix (may need to create new components)
   - Implement the fix
   - Save all changed files
   - Reload the app in simulator
   - Capture AFTER screenshot
   - Verify the fix visually

3. **Track changes made:**
   ```
   Fix #1: Hamburger Menu → iOS Tab Bar
   Files changed:
   - src/components/IOSTabBar.tsx (NEW)
   - src/components/IOSTabBar.css (NEW)
   - src/components/EventLayout.tsx (MODIFIED)
   ```

### Phase 6: Generate HTML Report

After fixes are complete, generate an HTML report with embedded before/after images:

**Output:** `workflows/ios-changes-report.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>iOS HIG Compliance Report - {App Name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro', sans-serif; line-height: 1.6; color: #1d1d1f; background: #f5f5f7; }
    .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
    h1 { font-size: 2.5rem; font-weight: 600; margin-bottom: 10px; }
    .subtitle { color: #86868b; font-size: 1.2rem; margin-bottom: 40px; }
    .summary-card { background: white; border-radius: 18px; padding: 30px; margin-bottom: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .summary-stats { display: flex; gap: 40px; flex-wrap: wrap; }
    .stat { text-align: center; }
    .stat-number { font-size: 3rem; font-weight: 700; color: #0071e3; }
    .stat-label { color: #86868b; font-size: 0.9rem; }
    .stat-number.success { color: #34c759; }
    .comparison-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .comparison-table th, .comparison-table td { padding: 16px; text-align: left; border-bottom: 1px solid #e5e5e5; }
    .comparison-table th { background: #f5f5f7; font-weight: 600; }
    .issue-card { background: white; border-radius: 18px; padding: 30px; margin-bottom: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .issue-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .issue-title { font-size: 1.5rem; font-weight: 600; }
    .badge { padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 500; }
    .badge-fixed { background: #d1f2d9; color: #1d7d3c; }
    .badge-high { background: #fde8e8; color: #c53030; }
    .screenshot-comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 20px 0; }
    .screenshot-box { text-align: center; }
    .screenshot-label { font-weight: 600; margin-bottom: 10px; color: #86868b; }
    .screenshot-label.before { color: #ff3b30; }
    .screenshot-label.after { color: #34c759; }
    .screenshot-box img { max-width: 100%; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); }
    .files-changed { background: #f5f5f7; border-radius: 12px; padding: 20px; margin-top: 20px; }
    .files-changed h4 { margin-bottom: 10px; font-size: 0.95rem; color: #86868b; }
    .file-list { list-style: none; }
    .file-list li { padding: 8px 0; font-family: 'SF Mono', monospace; font-size: 0.9rem; }
    .file-new { color: #34c759; }
    .file-modified { color: #ff9500; }
    .why-matters { background: #e8f4fd; border-radius: 12px; padding: 20px; margin-top: 20px; border-left: 4px solid #0071e3; }
    .why-matters h4 { color: #0071e3; margin-bottom: 10px; }
    @media (max-width: 768px) {
      .screenshot-comparison { grid-template-columns: 1fr; }
      .summary-stats { flex-direction: column; gap: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>iOS HIG Compliance Report</h1>
    <p class="subtitle">{App Name} • Generated {Date}</p>

    <div class="summary-card">
      <h2>Executive Summary</h2>
      <div class="summary-stats">
        <div class="stat">
          <div class="stat-number">{Total Issues}</div>
          <div class="stat-label">Issues Found</div>
        </div>
        <div class="stat">
          <div class="stat-number success">{Fixed Count}</div>
          <div class="stat-label">Issues Fixed</div>
        </div>
        <div class="stat">
          <div class="stat-number">{Remaining}</div>
          <div class="stat-label">Remaining</div>
        </div>
      </div>
    </div>

    <div class="summary-card">
      <h3>Before/After Comparison Table</h3>
      <table class="comparison-table">
        <thead>
          <tr>
            <th>Before</th>
            <th>After</th>
            <th>Issue</th>
            <th>iOS Anti-Pattern</th>
            <th>iOS-Native Fix</th>
          </tr>
        </thead>
        <tbody>
          <!-- Rows generated dynamically -->
        </tbody>
      </table>
    </div>

    <!-- Issue cards generated for each fix -->
    <div class="issue-card">
      <div class="issue-header">
        <h3 class="issue-title">Fix 1: {Issue Name}</h3>
        <span class="badge badge-fixed">✓ Fixed</span>
      </div>

      <div class="screenshot-comparison">
        <div class="screenshot-box">
          <div class="screenshot-label before">BEFORE</div>
          <img src="screenshots/{workflow}/before/{filename}.png" alt="Before fix">
        </div>
        <div class="screenshot-box">
          <div class="screenshot-label after">AFTER</div>
          <img src="screenshots/{workflow}/after/{filename}.png" alt="After fix">
        </div>
      </div>

      <div class="why-matters">
        <h4>Why This Matters for iOS Users</h4>
        <p>{Explanation of why the original pattern was wrong and why the fix follows iOS conventions}</p>
      </div>

      <div class="files-changed">
        <h4>Files Changed</h4>
        <ul class="file-list">
          <li class="file-new">+ src/components/NewComponent.tsx (NEW)</li>
          <li class="file-modified">~ src/components/ExistingFile.tsx (MODIFIED)</li>
        </ul>
      </div>
    </div>

  </div>
</body>
</html>
```

### Phase 7: Markdown Report (Alternative)

Also generate a markdown version for GitHub/documentation:

**Output:** `workflows/ios-changes-documentation.md`

Use the format from the reference document with:
- Executive summary
- Before/after comparison table
- Detailed changes for each fix
- Files changed
- Technical implementation notes
- Testing verification table

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

Example workflow annotation:
```markdown
3. Allow location access
   - [MANUAL] Browser location permission cannot be automated
   - Pre-configure: Grant location access in Settings > Safari > Location
   - Or manually tap "Allow" when prompted
```

## Guidelines

- **Be methodical:** Execute steps in order, don't skip ahead
- **Be observant:** Note anything unusual, even if the step "passes"
- **Be thorough:** Look for visual glitches, animation issues, responsiveness
- **Be constructive:** Frame issues as opportunities for improvement
- **Ask if stuck:** If a step is ambiguous or fails, ask the user for guidance
- **Pre-configure when possible:** Set up simulator state before running workflows

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
