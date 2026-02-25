---
name: ios-workflow-executor
description: Executes iOS app user workflows from /workflows/ios-workflows.md using iOS Simulator MCP. Use this when the user says "run ios workflows", "execute ios workflows", or "test ios workflows". Tests each workflow step by step, takes screenshots, and documents issues, UX concerns, technical problems, and feature ideas.
---

# iOS Workflow Executor Skill

You are a QA engineer executing user workflows in the iOS Simulator. Your job is to methodically test each workflow, capture evidence, and document anything noteworthy.

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

### Phase 2.5: Capture Before State

**Purpose:** Capture the pristine app state before any workflow steps execute, for before/after comparison.

For each workflow that will be executed:

1. Navigate to the workflow's starting screen:
   - If it's a web app in Safari: `launch_app({ bundle_id: 'com.apple.mobilesafari' })`, then navigate to the URL
   - If it's a native app: `launch_app({ bundle_id })` to launch to its default screen
2. Wait briefly for the screen to settle (2-3 seconds)
3. Take a screenshot using `screenshot({ output_path: 'workflows/screenshots/before-after/{workflow-name}/before.png', udid })`
   - Use Bash to create the directory first: `mkdir -p workflows/screenshots/before-after/{workflow-name}`
   - The workflow-name should be kebab-cased from the workflow title
4. Record the starting screen/URL for each workflow (needed later for after-state capture)

**Task list integration:**
```
TaskCreate:
- subject: "Capture before state for all workflows"
- activeForm: "Capturing before state"
TaskUpdate: status → in_progress when starting, completed when done
```

### Phase 3: Execute Workflow

For each numbered step in the workflow:

1. **Announce** the step you're about to execute
2. **Execute** using the appropriate MCP tool:
   - "Launch [app]" → `launch_app` with bundle_id
   - "Install [app]" → `install_app` with app_path
   - "Tap [element]" → `ui_describe_all` to find coordinates, then `ui_tap`
   - "Type [text]" → `ui_type`
   - "Swipe [direction]" → `ui_swipe`
   - "Verify [condition]" → `ui_describe_all` or `ui_view` to check
   - "Wait [seconds]" → pause before next action
3. **Screenshot** after each action using `screenshot`
4. **Observe** and note:
   - Did it work as expected?
   - Any UI/UX issues? (confusing labels, poor contrast, slow response)
   - Any technical problems? (crashes, hangs, visual glitches)
   - Any potential improvements or feature ideas?
5. **Record** your observations before moving to next step

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

### Phase 4: Generate Final Report

After completing all workflows (or when user requests), consolidate findings into a summary report:

1. Read `.claude/plans/ios-workflow-findings.md` for all recorded findings
2. Write consolidated report to `.claude/plans/ios-workflow-report.md`
3. Include overall statistics, prioritized issues, and recommendations

Report format:

```markdown
# iOS Workflow Report

**Workflow:** [Name]
**Date:** [Timestamp]
**Simulator:** [Device name and iOS version]
**Status:** [Passed/Failed/Partial]

## Summary

[Brief overview of what was tested and overall result]

## Step-by-Step Results

### Step 1: [Description]
- **Status:** Pass/Fail
- **Screenshot:** [filename]
- **Notes:** [Any observations]

### Step 2: [Description]
...

## Issues Discovered

| Issue | Severity | Description |
|-------|----------|-------------|
| Issue 1 | High/Med/Low | Details |

## UX/Design Observations

- Observation 1
- Observation 2

## Technical Problems

- Problem 1
- Problem 2

## Potential New Features

- Feature idea 1
- Feature idea 2

## Recommendations

1. Recommendation 1
2. Recommendation 2
```

### Phase 4.5: Capture After State

**Purpose:** Capture the app state after all workflows have been executed, for before/after comparison.

For each workflow that was executed:

1. Navigate back to the workflow's starting screen:
   - If web app: navigate Safari to the starting URL
   - If native app: relaunch the app with `launch_app({ bundle_id, terminate_running: true })`
2. Wait briefly for the screen to settle (2-3 seconds)
3. Take a screenshot using `screenshot({ output_path: 'workflows/screenshots/before-after/{workflow-name}/after.png', udid })`

**Task list integration:**
```
TaskCreate:
- subject: "Capture after state for all workflows"
- activeForm: "Capturing after state"
TaskUpdate: status → in_progress when starting, completed when done
```

### Phase 4.6: Generate Before/After Report [DELEGATE TO AGENT]

**Purpose:** Generate a standalone, self-contained HTML report showing side-by-side before/after screenshots for each workflow, with iOS device frames.

**Delegate to a general-purpose agent** using the Task tool to save context:

```
Task tool parameters:
- subagent_type: "general-purpose"
- prompt: |
    Generate a before/after HTML report for iOS workflow testing.

    ## Input
    - Read all before/after screenshots from `workflows/screenshots/before-after/`
    - Each workflow subfolder has `before.png` and `after.png`
    - Read the findings from `.claude/plans/ios-workflow-findings.md` for issue counts

    ## Output
    Write to `workflows/ios-before-after-report.html`

    ## Requirements
    - Self-contained HTML (all images embedded as base64)
    - Side-by-side comparison layout for each workflow
    - iOS device frame styling around screenshots (rounded corners, notch indicator)
    - Executive summary: workflows tested, issues found, simulator info
    - Per-workflow section with: workflow name, starting screen, before/after images, issue count
    - Clean, minimal CSS with system-ui font
    - No external dependencies

    ## HTML Template

    Use this structure:
    ```html
    <!DOCTYPE html>
    <html>
    <head>
      <title>Before/After Report — iOS Workflows</title>
      <style>
        body { font-family: system-ui; max-width: 1200px; margin: 0 auto; padding: 2rem; background: #fafafa; }
        .summary { background: #fff; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; border: 1px solid #e0e0e0; }
        .workflow-section { margin-bottom: 3rem; border-bottom: 1px solid #eee; padding-bottom: 2rem; }
        .comparison { display: flex; gap: 2rem; align-items: flex-start; justify-content: center; }
        .comparison .panel { flex: 0 1 300px; }
        .device-frame { background: #1a1a1a; border-radius: 36px; padding: 12px; position: relative; }
        .device-frame::before { content: ''; display: block; width: 80px; height: 24px; background: #1a1a1a; border-radius: 0 0 12px 12px; position: absolute; top: 0; left: 50%; transform: translateX(-50%); }
        .device-frame img { width: 100%; border-radius: 24px; display: block; }
        .label { font-weight: 600; margin-bottom: 0.5rem; text-align: center; }
        .before .label { color: #d32f2f; }
        .after .label { color: #2e7d32; }
        .stats { display: flex; gap: 1rem; margin-top: 1rem; justify-content: center; }
        .stat { background: #f0f0f0; padding: 0.5rem 1rem; border-radius: 4px; font-size: 0.9rem; }
        .no-change { background: #fff3cd; padding: 0.5rem 1rem; border-radius: 4px; font-size: 0.9rem; color: #856404; }
      </style>
    </head>
    <body>
      <h1>Before / After Report — iOS</h1>
      <div class="summary">
        <p>Generated: {timestamp}</p>
        <p>Simulator: {device name} — iOS {version}</p>
        <p>Workflows tested: {count} | Issues found: {issues}</p>
      </div>
      <!-- Per workflow -->
      <div class="workflow-section">
        <h2>{workflow name}</h2>
        <p>Starting screen: {screen or URL}</p>
        <div class="comparison">
          <div class="panel before">
            <div class="label">Before</div>
            <div class="device-frame">
              <img src="data:image/png;base64,{before_b64}" />
            </div>
          </div>
          <div class="panel after">
            <div class="label">After</div>
            <div class="device-frame">
              <img src="data:image/png;base64,{after_b64}" />
            </div>
          </div>
        </div>
        <div class="stats">
          <span class="stat">Issues: {n}</span>
        </div>
      </div>
    </body>
    </html>
    ```

    To convert images to base64, use: base64 -i <file>
    If before and after screenshots are identical, add a "No visual changes" badge.
```

**Task list integration:**
```
TaskCreate:
- subject: "Generate before/after HTML report"
- activeForm: "Generating before/after report"
TaskUpdate: status → in_progress when starting, completed when done
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

## Screenshot Directory Structure

```
workflows/screenshots/
├── before-after/              (before/after comparison screenshots)
│   ├── {workflow-1-name}/
│   │   ├── before.png
│   │   └── after.png
│   ├── {workflow-2-name}/
│   │   ├── before.png
│   │   └── after.png
```

## Common Bundle IDs

- Safari: `com.apple.mobilesafari`
- Settings: `com.apple.Preferences`
- Photos: `com.apple.mobileslideshow`
- Messages: `com.apple.MobileSMS`
- Calendar: `com.apple.mobilecal`

## Coordinate System

The iOS Simulator uses pixel coordinates from top-left (0, 0).
- Use `ui_describe_all` to find element positions
- Elements report their `frame` with x, y, width, height
- Tap center of element: x + width/2, y + height/2

## Known Limitations

The iOS Simulator automation has the following limitations that cannot be automated:

### Cannot Automate (Must Skip or Flag for Manual Testing)

1. **System Permission Dialogs**
   - Camera, microphone, photo library access prompts
   - Location services authorization
   - Notification permission requests
   - Contacts, calendar, reminders access
   - **Workaround:** Pre-authorize permissions in Simulator settings, or flag for manual testing

2. **System Alerts and Sheets**
   - Low battery warnings
   - Software update prompts
   - iCloud sign-in requests
   - Carrier settings updates
   - **Workaround:** Skip steps that trigger these, document as manual

3. **Hardware Interactions**
   - Physical button simulation (home, power, volume) may be limited
   - Face ID / Touch ID authentication flows
   - Shake gesture, rotation lock, mute switch
   - **Workaround:** Use simulator menu for hardware simulation when possible

4. **System UI Elements**
   - Control Center interactions
   - Notification Center / Lock Screen
   - Spotlight search from home screen
   - App Switcher (multitasking view)
   - **Workaround:** Document as requiring manual verification

5. **Keyboard Limitations**
   - `ui_type` only supports ASCII printable characters
   - Special characters, emoji, and non-Latin scripts cannot be typed
   - Autocorrect and predictive text interactions
   - **Workaround:** For special text, use copy/paste or pre-populate data

6. **External Services**
   - App Store interactions (purchases, reviews)
   - In-app purchases and payment flows
   - Sign in with Apple
   - **Workaround:** Use sandbox/test accounts, flag for manual verification

### Handling Limited Steps

When a workflow step involves a known limitation:

1. **Mark as [MANUAL]:** Note the step requires manual verification
2. **Pre-configure:** Set up simulator permissions before testing
3. **Document the Limitation:** Record in findings that the step was skipped due to automation limits
4. **Continue Testing:** Don't let one limited step block the entire workflow

Example workflow annotation:
```markdown
3. Allow camera access
   - [MANUAL] System permission dialog cannot be automated
   - Pre-configure: Reset privacy settings in Simulator > Device > Erase All Content and Settings
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
