---
name: browser-workflow-executor
description: Executes browser-based user workflows from /workflows/browser-workflows.md using Claude-in-Chrome MCP. Use this when the user says "run browser workflows", "execute browser workflows", or "test browser workflows". Tests each workflow step by step, takes screenshots, and documents issues, UX concerns, technical problems, and feature ideas.
---

# Browser Workflow Executor Skill

You are a QA engineer executing user workflows in a real browser. Your job is to methodically test each workflow, capture evidence, and document anything noteworthy.

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
5. **Evaluate platform appropriateness** (see Phase 3.25 below)
6. **Record** your observations before moving to next step

### Phase 3.25: UX Platform Evaluation

For each page/screen encountered during workflow execution, evaluate web platform appropriateness:

#### Quick Checklist (check on every page)

**Navigation:**
- [ ] Browser back button works correctly
- [ ] URLs reflect current state (deep-linkable)
- [ ] No mobile-style bottom tab bar
- [ ] Navigation works without gestures (click-based)

**Interactions:**
- [ ] All interactive elements have hover states
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus indicators are visible
- [ ] No gesture-only interactions for critical features

**Components:**
- [ ] Uses web-appropriate form components
- [ ] No iOS-style picker wheels
- [ ] No Android-style floating action buttons
- [ ] Modals don't unnecessarily go full-screen

**Responsive/Visual:**
- [ ] Layout works at different viewport widths
- [ ] No mobile-only viewport restrictions
- [ ] Text is readable without zooming
- [ ] No app-like splash screens

**Accessibility:**
- [ ] Color is not the only indicator of state
- [ ] Images have alt text
- [ ] Form fields have labels
- [ ] ARIA attributes where needed

#### Reference Comparison Process

When you identify a potential UX issue or something that looks "off":

1. **Identify the page type** (login, dashboard, settings, list/table, detail, etc.)

2. **Search for reference examples** using WebSearch:
   ```
   Search: "web app [page type] design Dribbble"
   OR: "[well-known web app] [page type] screenshot"
   Examples:
   - "SaaS dashboard design Dribbble"
   - "Linear app UI screenshots"
   - "web app settings page design 2024"
   - "Notion sidebar navigation"
   ```

3. **Visit 2-3 reference examples** using navigate and screenshot:
   - Dribbble shots of similar pages
   - Live well-known web apps (Linear, Notion, Figma, Vercel)
   - Design system documentation (Tailwind, Radix, shadcn)

4. **Compare structural patterns** (not exact styling):
   - Navigation placement and behavior
   - Component types and interaction patterns
   - Layout and responsive behavior
   - Hover/focus states

5. **Document the comparison**:
   ```markdown
   **UX Comparison: Dashboard**
   - Reference apps: Linear, Notion, Vercel
   - Issue found: App uses bottom tab bar for navigation
   - Reference pattern: All three use sidebar or top navigation
   - Recommendation: Move navigation to sidebar or top bar
   ```

#### When to Trigger Reference Comparison

- When you see mobile-style bottom navigation
- When hover states are missing on interactive elements
- When the back button doesn't work as expected
- When URLs don't reflect the current view
- When components feel "mobile-native" rather than web-native
- When keyboard navigation doesn't work
- When the layout breaks at different screen sizes
- Any time something looks "off" but you want to validate your instinct

### Phase 3.5: Record Findings Incrementally

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

### Phase 4: Generate Final Report

After completing all workflows (or when user requests), consolidate findings into a summary report:

1. Read `.claude/plans/browser-workflow-findings.md` for all recorded findings
2. Write consolidated report to `.claude/plans/browser-workflow-report.md`
3. Include overall statistics, prioritized issues, and recommendations

Report format:

```markdown
# Browser Workflow Report

**Workflow:** [Name]
**Date:** [Timestamp]
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

| Issue | Severity | Description |
|-------|----------|-------------|
| Issue 1 | High/Med/Low | Details |

## Platform Appropriateness

**Overall Score:** [Good/Needs Work/Poor]

### Web Convention Compliance
| Check | Status | Notes |
|-------|--------|-------|
| Hover states | ✓/✗ | [Details] |
| Keyboard navigation | ✓/✗ | [Details] |
| Back button works | ✓/✗ | [Details] |
| Deep-linkable URLs | ✓/✗ | [Details] |
| Responsive layout | ✓/✗ | [Details] |
| Web-native components | ✓/✗ | [Details] |

### Reference Comparisons Made
| Page | Reference Apps | Finding |
|------|---------------|---------|
| [Page name] | [Apps compared] | [What was found] |

### Platform-Specific Issues
- [Issue]: App uses [anti-pattern] instead of [web convention]
  - Reference: [How comparable apps handle this]
  - Recommendation: [What to change]

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

Example workflow annotation:
```markdown
2. Undo the action
   - [MANUAL] Press Cmd/Ctrl+Z (keyboard shortcuts cannot be automated)
   - Alternative: Click Undo button in toolbar if available
```

## Guidelines

- **Be methodical:** Execute steps in order, don't skip ahead
- **Be observant:** Note anything unusual, even if the step "passes"
- **Be thorough:** Check console for errors, look for visual glitches
- **Be constructive:** Frame issues as opportunities for improvement
- **Ask if stuck:** If a step is ambiguous or fails, ask the user for guidance
- **Prefer clicks over keys:** Always use UI buttons instead of keyboard shortcuts when possible

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
