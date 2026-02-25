---
name: mobile-browser-workflow-executor
description: Executes mobile browser workflows from /workflows/mobile-browser-workflows.md using Claude-in-Chrome MCP with a mobile viewport. Use this when the user says "run mobile browser workflows", "execute mobile workflows", or "test mobile browser workflows". Tests each workflow step by step in a mobile viewport, takes screenshots, and documents issues.
---

# Mobile Browser Workflow Executor Skill

You are a QA engineer executing user workflows in a real browser set to a mobile viewport. Your job is to methodically test each workflow on a mobile-sized screen, capture evidence, and document anything noteworthy — especially mobile-specific issues like touch target sizes, viewport overflow, and responsive layout problems.

## Process

### Phase 1: Read Workflows

1. Read the file `/workflows/mobile-browser-workflows.md`
2. **If the file does not exist or is empty:**
   - Stop immediately
   - Inform the user: "Could not find `/workflows/mobile-browser-workflows.md`. Please create this file with your workflows before running this skill."
   - Provide a brief example of the expected format
   - Do not proceed further
3. Parse all workflows (each starts with `## Workflow:`)
4. If no workflows are found in the file, inform the user and stop
5. List the workflows found and ask the user which one to execute (or all)

### Phase 2: Initialize Browser

1. Call `tabs_context_mcp` with `createIfEmpty: true` to get/create a tab
2. Store the `tabId` for all subsequent operations
3. Set the viewport to mobile size: `resize_window({ width: 393, height: 852, tabId })`
4. Take an initial screenshot to confirm browser is ready and viewport is correct

### Phase 2.5: Capture Before State

**Purpose:** Capture the pristine app state before any workflow steps execute, for before/after comparison.

For each workflow that will be executed:

1. Navigate to the workflow's starting URL using `navigate({ url, tabId })`
2. Wait briefly for the page to fully load: `computer({ action: 'wait', duration: 2, tabId })`
3. Take a full-page screenshot using `computer({ action: 'screenshot', tabId })`
4. Save the screenshot to `workflows/screenshots/before-after/{workflow-name}/before.png`
   - Use Bash to create the directory: `mkdir -p workflows/screenshots/before-after/{workflow-name}`
   - The workflow-name should be kebab-cased from the workflow title
5. Record the starting URL for each workflow (needed later for after-state capture)

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
   - Any mobile-specific UI/UX issues? (touch targets too small, text too tiny, horizontal overflow)
   - Any responsive layout problems? (overlapping elements, hidden content, broken navigation)
   - Any technical problems? (errors in console, failed requests)
   - Any potential improvements or feature ideas?
5. **Record** your observations before moving to next step

### Phase 3.5: Record Findings Incrementally

**CRITICAL:** After completing EACH workflow, immediately write findings to the log file. Do not wait until all workflows are complete.

1. After each workflow completes, append to `.claude/plans/mobile-browser-workflow-findings.md`
2. If the file doesn't exist, create it with a header first
3. Use the following format for each workflow entry:

```markdown
---
### Workflow [N]: [Name]
**Timestamp:** [ISO datetime]
**Viewport:** 393x852 (iPhone 14)
**Status:** Passed/Failed/Partial

**Steps Summary:**
- Step 1: [Pass/Fail] - [brief note]
- Step 2: [Pass/Fail] - [brief note]
...

**Issues Found:**
- [Issue description] (Severity: High/Med/Low)

**Mobile-Specific Issues:**
- [Touch target / responsive / viewport issue]

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

### Phase 4: Generate Final Report

After completing all workflows (or when user requests), consolidate findings into a summary report:

1. Read `.claude/plans/mobile-browser-workflow-findings.md` for all recorded findings
2. Write consolidated report to `.claude/plans/mobile-browser-workflow-report.md`
3. Include overall statistics, prioritized issues, and recommendations

Report format:

```markdown
# Mobile Browser Workflow Report

**Workflow:** [Name]
**Date:** [Timestamp]
**Viewport:** 393x852 (iPhone 14)
**Status:** [Passed/Failed/Partial]

## Summary

[Brief overview of what was tested and overall result]

## Step-by-Step Results

### Step 1: [Description]
- **Status:** Pass/Fail
- **Screenshot:** [filename or inline]
- **Notes:** [Any observations]

### Step 2: [Description]
...

## Issues Discovered

| Issue | Severity | Category | Description |
|-------|----------|----------|-------------|
| Issue 1 | High/Med/Low | Mobile UX / Layout / Technical | Details |

## Mobile-Specific Observations

- Touch target issues
- Responsive layout problems
- Viewport overflow issues

## UX/Design Observations

- Observation 1
- Observation 2

## Technical Problems

- Problem 1 (include console errors if any)
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

1. Navigate to the workflow's starting URL again using `navigate({ url, tabId })`
2. Wait briefly for the page to fully load: `computer({ action: 'wait', duration: 2, tabId })`
3. Take a full-page screenshot using `computer({ action: 'screenshot', tabId })`
4. Save the screenshot to `workflows/screenshots/before-after/{workflow-name}/after.png`

**Task list integration:**
```
TaskCreate:
- subject: "Capture after state for all workflows"
- activeForm: "Capturing after state"
TaskUpdate: status → in_progress when starting, completed when done
```

### Phase 4.6: Generate Before/After Report [DELEGATE TO AGENT]

**Purpose:** Generate a standalone, self-contained HTML report showing side-by-side before/after screenshots for each workflow.

**Delegate to a general-purpose agent** using the Task tool to save context:

```
Task tool parameters:
- subagent_type: "general-purpose"
- prompt: |
    Generate a before/after HTML report for mobile browser workflow testing.

    ## Input
    - Read all before/after screenshots from `workflows/screenshots/before-after/`
    - Each workflow subfolder has `before.png` and `after.png`
    - Read the findings from `.claude/plans/mobile-browser-workflow-findings.md` for issue counts

    ## Output
    Write to `workflows/mobile-before-after-report.html`

    ## Requirements
    - Self-contained HTML (all images embedded as base64)
    - Side-by-side comparison layout for each workflow
    - Mobile device frame styling around screenshots (rounded corners, phone bezel)
    - Executive summary: workflows tested, issues found, viewport used
    - Per-workflow section with: workflow name, starting URL, before/after images, issue count
    - Clean, minimal CSS with system-ui font
    - No external dependencies

    ## HTML Template

    Use this structure:
    ```html
    <!DOCTYPE html>
    <html>
    <head>
      <title>Before/After Report — Mobile Browser Workflows</title>
      <style>
        body { font-family: system-ui; max-width: 1200px; margin: 0 auto; padding: 2rem; background: #fafafa; }
        .summary { background: #fff; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; border: 1px solid #e0e0e0; }
        .workflow-section { margin-bottom: 3rem; border-bottom: 1px solid #eee; padding-bottom: 2rem; }
        .comparison { display: flex; gap: 2rem; align-items: flex-start; justify-content: center; }
        .comparison .panel { flex: 0 1 280px; }
        .device-frame { background: #1a1a1a; border-radius: 32px; padding: 10px; }
        .device-frame img { width: 100%; border-radius: 22px; display: block; }
        .label { font-weight: 600; margin-bottom: 0.5rem; text-align: center; }
        .before .label { color: #d32f2f; }
        .after .label { color: #2e7d32; }
        .stats { display: flex; gap: 1rem; margin-top: 1rem; justify-content: center; }
        .stat { background: #f0f0f0; padding: 0.5rem 1rem; border-radius: 4px; font-size: 0.9rem; }
        .no-change { background: #fff3cd; padding: 0.5rem 1rem; border-radius: 4px; font-size: 0.9rem; color: #856404; }
      </style>
    </head>
    <body>
      <h1>Before / After Report — Mobile Browser</h1>
      <div class="summary">
        <p>Generated: {timestamp}</p>
        <p>Viewport: 393x852 (iPhone 14)</p>
        <p>Workflows tested: {count} | Issues found: {issues}</p>
      </div>
      <!-- Per workflow -->
      <div class="workflow-section">
        <h2>{workflow name}</h2>
        <p>Starting URL: {url}</p>
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

**Viewport:**
- `resize_window({ width: 393, height: 852, tabId })` - Set mobile viewport

**Inspection:**
- `get_page_text({ tabId })` - Extract text content
- `read_console_messages({ tabId, pattern: 'error' })` - Check for errors
- `read_network_requests({ tabId })` - Check API calls

**Forms:**
- `form_input({ ref, value, tabId })` - Set form field value

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

## Mobile-Specific Testing Checklist

When testing on a mobile viewport, pay special attention to:

1. **Touch Targets:** All interactive elements should be at least 44x44px (iOS) or 48x48dp (Android)
2. **Viewport Overflow:** No horizontal scrolling — content should fit within 393px width
3. **Font Sizes:** Body text should be at least 16px to prevent iOS auto-zoom on input focus
4. **Navigation:** Is the navigation pattern mobile-appropriate? (tab bar vs hamburger vs bottom sheet)
5. **Tap vs Click:** Elements designed for hover states may not work well on mobile
6. **Safe Areas:** Content should respect notch/home indicator safe areas
7. **Input Focus:** Does keyboard appearance push content off-screen?
8. **Scroll Behavior:** Are scrollable areas obvious and functional on touch?

## Known Limitations

The Claude-in-Chrome browser automation has the following limitations that cannot be automated:

### Cannot Automate (Must Skip or Flag for Manual Testing)

1. **Keyboard Shortcuts**
   - System-level shortcuts may cause extension disconnection
   - **Workaround:** Use UI buttons instead of keyboard shortcuts

2. **Native Browser Dialogs**
   - `alert()`, `confirm()`, `prompt()` dialogs block all browser events
   - File upload dialogs (OS-level file picker)
   - **Workaround:** Skip steps requiring these, or flag for manual testing

3. **Pop-ups and New Windows**
   - Pop-ups that open in new windows outside the MCP tab group
   - **Workaround:** Document as requiring manual verification

4. **True Mobile Gestures**
   - Pinch-to-zoom, multi-finger gestures
   - Native device rotation (viewport can be resized but not rotated in the same way)
   - Pull-to-refresh gesture
   - **Workaround:** Document as requiring real device or emulator testing

### Handling Limited Steps

When a workflow step involves a known limitation:

1. **Mark as [MANUAL]:** Note the step requires manual verification
2. **Try UI Alternative:** Look for button equivalents instead of gesture-based interactions
3. **Document the Limitation:** Record in findings that the step was skipped due to automation limits
4. **Continue Testing:** Don't let one limited step block the entire workflow

## Guidelines

- **Be methodical:** Execute steps in order, don't skip ahead
- **Be mobile-first:** Think about how a mobile user would interact with each element
- **Be observant:** Note anything unusual, even if the step "passes"
- **Be thorough:** Check console for errors, look for responsive layout issues
- **Be constructive:** Frame issues as opportunities for improvement
- **Ask if stuck:** If a step is ambiguous or fails, ask the user for guidance
- **Verify viewport:** Periodically confirm the viewport is still 393x852 (it can be accidentally resized)

## Handling Failures

If a step fails:
1. Take a screenshot of the failure state
2. Check console for errors (`read_console_messages`)
3. Note what went wrong — is it a mobile-specific failure or a general bug?
4. Ask the user: continue with next step, retry, or abort?

Do not silently skip failed steps.

## Session Recovery

If resuming from an interrupted session:

1. Read `.claude/plans/mobile-browser-workflow-findings.md` to see which workflows have been completed
2. Resume from the next uncompleted workflow
3. Do not re-execute already-passed workflows unless the user specifically requests it
4. Inform the user which workflows were already completed and where you're resuming from
5. Re-set the viewport to mobile size: `resize_window({ width: 393, height: 852, tabId })`
