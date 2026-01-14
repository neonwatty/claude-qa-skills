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
5. **Evaluate platform appropriateness** (see Phase 3.25 below)
6. **Record** your observations before moving to next step

### Phase 3.25: UX Platform Evaluation

For each screen encountered during workflow execution, evaluate iOS platform appropriateness:

#### Quick Checklist (check on every screen)

**Navigation:**
- [ ] Uses tab bar for primary navigation (not hamburger menu)
- [ ] Back button follows iOS conventions (chevron + previous title)
- [ ] No floating action buttons (Android pattern)
- [ ] No breadcrumb navigation

**Interactions:**
- [ ] All tap targets are at least 44x44pt
- [ ] Buttons have clear iOS-style affordances
- [ ] No swipe-only actions for critical features

**Components:**
- [ ] Uses native iOS form components (Picker, DatePicker, Toggle)
- [ ] No web-style dropdown selects
- [ ] No Material Design styled components
- [ ] Alerts and action sheets follow iOS patterns

**Visual:**
- [ ] Spacing and typography follow iOS conventions
- [ ] No Android-style toast notifications
- [ ] Cards use subtle iOS styling (not heavy Material shadows)

#### Reference Comparison Process

When you identify a potential UX issue or something that looks "off":

1. **Identify the screen type** (login, settings, list view, detail, etc.)

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
   - Dribbble shots of similar screens
   - Screenshots from well-known iOS apps (Airbnb, Spotify, Instagram, Apple apps)
   - iOS Human Interface Guidelines examples

4. **Compare structural patterns** (not exact styling):
   - Navigation placement and style
   - Component types and sizing
   - Layout and spacing patterns
   - Interaction patterns

5. **Document the comparison**:
   ```markdown
   **UX Comparison: Login Screen**
   - Reference apps: Spotify, Instagram, Airbnb
   - Issue found: App uses web-style dropdown for country code
   - Reference pattern: All three apps use native iOS picker wheel
   - Recommendation: Replace dropdown with UIPickerView
   ```

#### When to Trigger Reference Comparison

- When you see a hamburger menu (☰) instead of tab bar
- When tap targets feel too small
- When components look "web-like" or "Android-like"
- When navigation feels unusual for iOS
- When forms use non-native components
- When the overall feel doesn't match typical iOS apps
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

## Platform Appropriateness

**Overall Score:** [Good/Needs Work/Poor]

### iOS Convention Compliance
| Check | Status | Notes |
|-------|--------|-------|
| Tab bar navigation | ✓/✗ | [Details] |
| 44pt tap targets | ✓/✗ | [Details] |
| Native iOS components | ✓/✗ | [Details] |
| iOS visual styling | ✓/✗ | [Details] |

### Reference Comparisons Made
| Screen | Reference Apps | Finding |
|--------|---------------|---------|
| [Screen name] | [Apps compared] | [What was found] |

### Platform-Specific Issues
- [Issue]: App uses [anti-pattern] instead of [iOS convention]
  - Reference: [How comparable apps handle this]
  - Recommendation: [What to change]

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
