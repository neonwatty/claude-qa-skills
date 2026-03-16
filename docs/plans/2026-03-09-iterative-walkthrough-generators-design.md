# Iterative Walkthrough Generators Design

**Date**: 2026-03-09
**Status**: Implemented
**Branch**: `v2-playwright-only`

## Problem

The current workflow generators analyze the codebase, bulk-generate all workflow steps, and present a finished document for review. This means the generator decides on its own what each step should verify, what transitions matter, and what the acceptance criteria are. Assumptions compound across steps with no user validation in between.

## Solution

Redesign all three generators (desktop, mobile, multi-user) to walk through the live app with the user, co-authoring each workflow step-by-step. The running app (local, preview, or production URL) becomes the shared reference point. Playwright handles the mechanical navigation and screenshotting; the user makes decisions about what matters at each step.

## Phase Structure

All three generators share this phase structure:

```
Phase 1: Assess current state
Phase 2: Code exploration (3 parallel agents)
Phase 3: Journey discovery + user confirmation
Phase 4: App URL + auth setup
Phase 5: Iterative walkthrough (per journey)
  5a. Present proposed screen flow → user confirms/adjusts
  5b. Present proposed actions → user confirms → Playwright executes + screenshots
  5c. Present each screenshot → propose verifications + edge cases → user confirms/adjusts
Phase 6: Final review of assembled document
Phase 7: Write file
```

## Phase Details

### Phase 1: Assess Current State

Same as current. Check for existing workflows, ask user intent (Create/Update/Refactor/Audit).

### Phase 2: Code Exploration

Same as current. Three parallel agents explore routes, components, and state/data. Platform-specific focus per generator (mobile breakpoints, multi-user roles/sync, etc.). Results inform verification proposals in Phase 5c.

### Phase 3: Journey Discovery + User Confirmation

Present a prioritized list of discovered journeys at **page/route level only**:

```
Discovered journeys (ordered by priority):

Core:
1. Login and Dashboard: /login → /dashboard
2. Create New Item: /dashboard → /items/new → /items/:id
3. User Settings: /dashboard → /settings → /settings/profile

Feature:
4. Search and Filter: /items → /items?q=...
5. Export Data: /items → /export

Edge Case:
6. Password Reset: /login → /forgot-password → /reset-password

Add, remove, reorder, or adjust any of these?
```

User confirms, reorders, adds, or removes journeys before any live interaction begins.

### Phase 4: App URL + Auth Setup

Ask for the running app URL. This is **required** (not optional like the previous live crawl).

Handle authentication:
- Provide credentials (email/password)
- Use existing storageState JSON
- Use persistent browser profile

For multi-user generator: set up auth per persona.

### Phase 5: Iterative Walkthrough

Repeat for each confirmed journey:

#### 5a: Confirm Screen Flow

Present the confirmed journey's screens as a simple route sequence. User already approved the journey list in Phase 3, but this is the per-journey confirmation before Playwright starts navigating.

#### 5b: Confirm Actions + Playwright Captures

Present the proposed actions at each transition:

```
Step 1: Navigate to /login
Step 2: Fill email field → Fill password field → Click "Sign In"
Step 3: Arrive at /dashboard
Step 4: Click "Settings" in sidebar → Arrive at /settings

Are these the right actions? Any to adjust?
```

User confirms or adjusts. Then Playwright executes the confirmed actions and captures a screenshot at each step. No user interaction during execution.

#### 5c: Co-Author Verifications + Edge Cases

For each screenshot, present it with proposed verifications informed by both the screenshot and code exploration results:

```
Step 1: /login
[screenshot]

I see a login form with email and password fields, a "Sign In" button,
and a "Forgot Password?" link.

Proposed verifications:
- Verify email input field is visible
- Verify password input field is visible
- Verify "Sign In" button is visible and enabled

Should I add, remove, or change any of these?

Are there edge cases to check at this step? For example:
- Submit with empty fields → error message?
- Submit with invalid email format → validation?
- Submit with wrong password → error state?
```

User confirms main verifications, then selects which edge cases to include (or adds their own). Confirmed edge cases become additional sub-steps in the workflow.

Pause after **every step** — no batching or grouping.

### Phase 6: Final Review

Assemble the complete workflow document and present it to the user. This is a holistic check:

- Do the journeys cover the right surface area?
- Are any verifications redundant across journeys?
- Are edge cases distributed sensibly?
- Does the ordering make sense?

If changes needed, revise and re-present. Expected to be lighter than current review since every piece was individually approved.

### Phase 7: Write File

Write to the appropriate output file:
- Desktop: `/workflows/desktop-workflows.md`
- Mobile: `/workflows/mobile-workflows.md`
- Multi-user: `/workflows/multi-user-workflows.md`

## Platform-Specific Variations

### Desktop Generator

- Standard viewport
- Proposed verifications draw from desktop code analysis (hover states, focus management, keyboard nav)
- Edge case prompts include desktop concerns (browser back button, tab ordering)

### Mobile Generator

- Viewport locked to 393x852 (iPhone 15 Pro equivalent)
- Proposed verifications automatically include mobile-specific checks:
  - Touch target sizes (flag elements below 44px)
  - Input font sizes (flag below 16px for iOS auto-zoom)
  - Hamburger menu / navigation accessibility
  - Viewport overflow, safe area overlap
- Edge case prompts include mobile concerns (orientation change, viewport overflow, safe area)

### Multi-User Generator

- Phase 2 still includes the persona interview before code exploration
- In 5a, screen flows are presented per-persona in interleaved order:
  ```
  Journey: "Team Invitation Flow"
    [Admin] /team/settings → /team/invite
    [Guest] /inbox (sees invitation)
    [Admin] /team/members (sees updated list)
  ```
- In 5b, Playwright switches persona contexts (separate storageState) at persona handoffs
- In 5c, proposed verifications at persona handoff points include sync timing:
  ```
  Proposed verifications:
  - Verify invitation notification appears
  - Sync verification: visible within 5 seconds of Admin's invite action

  Edge cases:
  - Guest already on inbox when invite sent — appears without refresh?
  - Guest has notifications disabled?
  ```

## Changes Summary

### Removed
- Bulk workflow generation phase
- "Generate all then review" pattern
- Optional live crawl question (the walkthrough replaces it)

### Added
- Phase 4: App URL + auth setup (required)
- Phase 5a: Screen flow confirmation per journey
- Phase 5b: Action confirmation → Playwright executes + screenshots
- Phase 5c: Screenshot-based verification + edge case co-authoring

### Changed
- Phase 3 presents journeys at page/route level only
- Anti-pattern detection surfaces during 5c proposals (not during bulk generation)
- Playwright MCP moves from optional to required

### Unchanged
- Phase 1 (assess current state)
- Phase 2 (code exploration with parallel agents)
- Workflow markdown output format
- Platform-specific exploration focus
- Anti-pattern detection logic (relocated, not removed)

## Tool Dependencies

| Skill | Tools |
|---|---|
| desktop-workflow-generator | Read, Grep, Glob, Task (Explore agents), LSP, **Playwright MCP (required)**, AskUserQuestion |
| mobile-workflow-generator | Read, Grep, Glob, Task (Explore agents), LSP, **Playwright MCP (required)**, AskUserQuestion |
| multi-user-workflow-generator | Read, Grep, Glob, Task (Explore agents), LSP, **Playwright MCP (required)**, AskUserQuestion |
