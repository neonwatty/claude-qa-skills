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
5. **Record** your observations before moving to next step

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

## Guidelines

- **Be methodical:** Execute steps in order, don't skip ahead
- **Be observant:** Note anything unusual, even if the step "passes"
- **Be thorough:** Check console for errors, look for visual glitches
- **Be constructive:** Frame issues as opportunities for improvement
- **Ask if stuck:** If a step is ambiguous or fails, ask the user for guidance

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
