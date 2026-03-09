# Iterative Walkthrough Generators Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite all three workflow generator skills (desktop, mobile, multi-user) to co-author workflows with the user via a live Playwright walkthrough instead of bulk-generating and reviewing after the fact.

**Architecture:** Each generator keeps its existing Phase 1 (assess state) and Phase 2 (code exploration with parallel agents) intact. Phase 3 changes to present journeys at route-level only for user confirmation. The old Phase 4 (optional crawl) and Phase 5 (bulk generation) are replaced with a required app URL setup phase and an iterative walkthrough loop (confirm flow → confirm actions → Playwright screenshots → co-author verifications + edge cases per step). Phase 6 becomes final review of the assembled document. Phase 7 writes the file.

**Tech Stack:** Playwright MCP (required), TaskList/TaskCreate/TaskUpdate for progress tracking, AskUserQuestion for user interaction at each step.

**Design doc:** `docs/plans/2026-03-09-iterative-walkthrough-generators-design.md`

---

## Task 1: Rewrite Desktop Workflow Generator

**Files:**
- Modify: `skills/desktop-workflow-generator/SKILL.md` (1,106 lines → full rewrite of Phases 3-8)

**Step 1: Read the existing file and identify section boundaries**

Read `skills/desktop-workflow-generator/SKILL.md` and note the line ranges for:
- Phase 1 (Assess Current State): KEEP as-is
- Phase 2 (Explore the Application): KEEP as-is
- Phase 3 (Identify User Journeys): REWRITE — simplify to route-level presentation
- Phase 4 (Optional Live Crawl): REMOVE — replaced by required walkthrough
- Phase 5 (Generate Workflows): REMOVE — replaced by iterative walkthrough
- Phase 6 (Organize and Write): REMOVE — folded into walkthrough output
- Phase 7 (Review with User): REWRITE — becomes lighter final review
- Phase 8 (Write File): KEEP logic, renumber to Phase 7
- Session Recovery: UPDATE to match new phase numbers
- Workflow Writing Standards: KEEP as-is
- Automation-Friendly Guidelines: KEEP as-is
- Web Platform UX Anti-Patterns: KEEP as-is (referenced during 5c proposals)
- Handling Updates: KEEP as-is

**Step 2: Rewrite Phase 3 — Journey Discovery + User Confirmation**

Replace the current Phase 3 (which categorizes journeys into tiers with full detail) with a simpler route-level presentation:

```markdown
## Phase 3: Journey Discovery + User Confirmation

Using the unified Application Map from Phase 2, identify all discoverable user journeys and present them to the user at page/route level for confirmation.

### Categorize Journeys

Group discovered journeys into three tiers:

- **Core** — Critical paths. If these break, the app is unusable.
- **Feature** — Specific features that add value but are not critical path.
- **Edge Case** — Error handling, boundary conditions, unusual but valid paths.

### Present to User

Use `AskUserQuestion` to present the journey list at route level only:

~~~
I discovered these user journeys from the codebase:

Core:
1. Login and Dashboard: /login → /dashboard
2. Create New Item: /dashboard → /items/new → /items/:id
3. User Settings: /dashboard → /settings → /settings/profile

Feature:
4. Search and Filter: /items → /items?q=...
5. Export Data: /items → /export

Edge Case:
6. Password Reset: /login → /forgot-password → /reset-password

Should I add, remove, or reorder any of these journeys?
~~~

Apply any changes the user requests. This is the journey list that will be walked through in Phase 5.

### Update Task Metadata

~~~
TaskUpdate:
  title: "Generate: Desktop Workflows"
  metadata:
    core_journeys: 3
    feature_journeys: 2
    edge_case_journeys: 1
    total_journeys: 6
    journeys_confirmed: true
~~~
```

**Step 3: Rewrite Phase 4 — App URL + Auth Setup**

Replace the old Phase 4 (optional live crawl) with a required app URL phase:

```markdown
## Phase 4: App URL + Auth Setup

The live walkthrough requires a running instance of the application. This phase is mandatory.

### Ask for App URL

Use `AskUserQuestion`:

~~~
To walk through each journey together, I need the app running.

What is the URL? (e.g., http://localhost:3000, https://preview-abc.vercel.app, https://myapp.com)
~~~

### Handle Authentication

If any journeys involve auth-gated routes (identified in Phase 2), ask how to authenticate:

Use `AskUserQuestion`:

~~~
Some journeys require authentication. How should I log in?

1. **Provide credentials** — Give me email/password and I will log in via the app
2. **Existing storageState** — Point me to a storageState JSON file
3. **Persistent profile** — Use a browser profile that is already logged in
~~~

If the user provides credentials, log in via Playwright before starting the walkthrough. Save the authenticated state for reuse across journeys.

### Create the Walkthrough Task

~~~
TaskCreate:
  title: "Walkthrough: Desktop Journeys"
  status: "in_progress"
  metadata:
    base_url: "http://localhost:3000"
    auth_method: "credentials"
    journeys_total: 6
    journeys_completed: 0
~~~
```

**Step 4: Write Phase 5 — Iterative Walkthrough**

This is the core new phase. Write the full iterative walkthrough section:

```markdown
## Phase 5: Iterative Walkthrough [PER JOURNEY]

For each confirmed journey from Phase 3, walk through the live app with the user in three sub-phases. Every journey follows this loop: confirm the flow → confirm the actions → Playwright captures screenshots → co-author verifications and edge cases one step at a time.

### 5a: Confirm the Screen Flow

Present the journey's screens as a route-level sequence. The user already confirmed the journey list in Phase 3, but this is the per-journey confirmation before Playwright starts navigating.

Use `AskUserQuestion`:

~~~
Journey 1: "Login and Dashboard"

Screen flow:
  /login → /dashboard

Does this flow look right? Any screens to add, remove, or reorder?
~~~

Apply any changes the user requests.

### 5b: Confirm Actions + Playwright Captures

Present the proposed actions at each transition between screens. These are informed by code exploration (form fields found, buttons discovered, navigation patterns):

Use `AskUserQuestion`:

~~~
Journey 1: "Login and Dashboard"

Proposed actions:

Step 1: Navigate to /login
Step 2: Fill email field → Fill password field → Click "Sign In" button
Step 3: Arrive at /dashboard

Are these the right actions between screens? Any to adjust?
~~~

Once the user confirms, Playwright executes the confirmed actions and captures a screenshot at each step:

~~~
1. browser_navigate to the starting URL
2. browser_take_screenshot (capture initial state)
3. For each confirmed action:
   a. Execute the action (browser_click, browser_type, browser_fill_form, etc.)
   b. browser_take_screenshot (capture state after action)
4. Store all screenshots in order for Phase 5c
~~~

**Important:** Do not interact with the user during this step. Playwright walks the flow automatically. If an action fails (element not found, navigation error), capture the error state screenshot and flag it in 5c.

### 5c: Co-Author Verifications + Edge Cases

For each screenshot captured in 5b, present it to the user with proposed verifications. Proposed verifications are informed by:
- What is visible in the screenshot
- What the code exploration found (form validation logic, error handling, component structure)
- Desktop UX anti-patterns from the Anti-Patterns section of this skill

Present one step at a time. Do NOT batch or group steps.

Use `AskUserQuestion` for each step:

~~~
Step 1: /login
[Present screenshot]

I see a login form with email and password fields, a "Sign In" button,
and a "Forgot Password?" link.

Proposed verifications:
- Verify email input field is visible
- Verify password input field is visible
- Verify "Sign In" button is visible and enabled

Should I add, remove, or change any of these verifications?

Are there edge cases to check at this step? For example:
- Submit with empty fields → error message?
- Submit with invalid email format → validation?
- Submit with wrong password → error state?
~~~

The user confirms or adjusts the main verifications, then selects which edge cases to include (or adds their own).

**Recording confirmed steps:**

Each confirmed step becomes a workflow step in the final document. Use the exact format from the Workflow Writing Standards section:

~~~markdown
1. Navigate to /login
   - Verify email input field is visible
   - Verify password input field is visible
   - Verify "Sign In" button is visible and enabled
~~~

Edge cases confirmed by the user become additional sub-steps:

~~~markdown
1a. Submit the login form with empty fields
    - Verify error message "Email is required" appears
    - Verify form is not submitted

1b. Submit the login form with invalid email format
    - Verify validation message appears on email field
~~~

### After Each Journey

When all steps of a journey are confirmed, update the task:

~~~
TaskUpdate:
  title: "Walkthrough: Desktop Journeys"
  metadata:
    journeys_completed: 1
    current_journey: "Journey 2: Create New Item"
~~~

Inform the user and move to the next journey:

~~~
Journey 1 "Login and Dashboard" complete (4 steps, 2 edge cases).

Moving to Journey 2: "Create New Item"
  /dashboard → /items/new → /items/:id
~~~

### After All Journeys

When all journeys have been walked through:

~~~
TaskUpdate:
  title: "Walkthrough: Desktop Journeys"
  status: "completed"
  metadata:
    journeys_completed: 6
    total_steps: 34
    total_edge_cases: 12
~~~
```

**Step 5: Rewrite Phase 6 — Final Review**

Replace the old review phase with a lighter version:

```markdown
## Phase 6: Final Review

After all journeys have been walked through and every step co-authored, assemble the complete workflow document and present it to the user for a holistic review.

### Assemble the Document

Use the document structure from the Workflow Writing Standards:
- Header with metadata (app name, base URL, date)
- Quick Reference table
- Core Workflows section
- Feature Workflows section
- Edge Case Workflows section
- Appendix: Application Map Summary

### Present for Review

~~~
I have assembled the complete desktop workflow document:

- Total workflows: [N]
- Core workflows: [X]
- Feature workflows: [Y]
- Edge case workflows: [Z]
- Total steps: [S] (including [E] edge case sub-steps)

[Present the full assembled document]

Please review the complete document. Every step was individually approved,
but this is your chance to check:
- Does the overall coverage look right?
- Are any verifications redundant across journeys?
- Should any edge cases be consolidated?
- Does the ordering make sense?

Reply "approved" to write the file, or provide feedback for revision.
~~~

### Create the Approval Task

~~~
TaskCreate:
  title: "Approval: User Review #1"
  status: "in_progress"
  metadata:
    iteration: 1
    workflows_presented: [N]
~~~

Handle feedback the same way as the current Phase 7: apply changes, increment iteration, re-present until approved.
```

**Step 6: Update Phase 7 — Write File**

Renumber the current Phase 8 to Phase 7. Keep the logic the same.

**Step 7: Update Task Hierarchy and Session Recovery**

Update the Task Hierarchy section to reflect the new phases:

```
[Main Task] "Generate: Desktop Workflows"
  +-- [Explore Task] "Explore: Routes & Navigation"        (agent)
  +-- [Explore Task] "Explore: Components & Features"      (agent)
  +-- [Explore Task] "Explore: State & Data"               (agent)
  +-- [Walkthrough Task] "Walkthrough: Desktop Journeys"   (Playwright MCP)
  +-- [Approval Task] "Approval: User Review #1"
  +-- [Write Task]    "Write: desktop-workflows.md"
```

Update the Session Recovery decision tree to match the new phase numbers and task names. Key changes:
- Remove CASE 3's crawl task reference
- Add CASE for walkthrough task in_progress (partially completed journeys — resume from the next incomplete journey)
- Renumber all cases to match new phases

**Step 8: Update the skill description in frontmatter**

Update the `description` field in the YAML frontmatter to mention the interactive walkthrough:

```yaml
description: Generates desktop browser workflow documentation by exploring the app's codebase, then walking through the live app with the user step-by-step via Playwright to co-author verifications. Use when the user says "generate desktop workflows", "create desktop workflows", "update desktop workflows", or "generate browser workflows".
```

**Step 9: Commit**

```bash
git add skills/desktop-workflow-generator/SKILL.md
git commit -m "feat: rewrite desktop generator with iterative walkthrough"
```

---

## Task 2: Rewrite Mobile Workflow Generator

**Files:**
- Modify: `skills/mobile-workflow-generator/SKILL.md` (1,350 lines → same structural rewrite as desktop)

The mobile generator follows the exact same structural rewrite as desktop. The differences are:

### Mobile-specific elements to preserve

1. **Phase 2 agents** — Keep the mobile-specific exploration focus (responsive breakpoints, touch handlers, CSS touch properties, mobile components, input font sizes, safe area insets). These are UNCHANGED.

2. **Phase 5b viewport** — When Playwright captures screenshots, set viewport to 393x852:
   ```
   Before navigating, configure the Playwright browser context:
   - Viewport: 393x852 (iPhone 15 Pro equivalent)
   - User agent: Mobile Safari or Mobile Chrome equivalent
   ```

3. **Phase 5c mobile-specific verification proposals** — In addition to what's visible in the screenshot and what code exploration found, proposed verifications should include mobile-specific checks from the Mobile UX Anti-Patterns section:
   ```
   I also notice some mobile-specific concerns:
   - This button appears to be below 44px height — verify touch target size?
   - Input font-size is 14px — this will trigger iOS auto-zoom. Flag this?
   - I see a hamburger menu — verify navigation is accessible without it?
   ```

4. **Workflow verb changes** — Use "Tap" instead of "Click" in mobile workflow steps. Keep the mobile-specific Workflow Writing Standards table.

5. **Mobile UX Anti-Patterns section** — KEEP the full section (touch targets, iOS HIG, responsive, text size, etc.). It is referenced during 5c proposals.

6. **Edge case prompts** — Include mobile-specific edge case suggestions:
   ```
   Are there edge cases to check at this step? For example:
   - What happens if the device rotates to landscape?
   - Does this content overflow the viewport horizontally?
   - Is this modal scrollable if content exceeds screen height?
   ```

### Steps

**Step 1:** Read the existing file, identify section boundaries (same approach as Task 1).

**Step 2:** Rewrite Phase 3 — Same as desktop but present with mobile viewport context.

**Step 3:** Rewrite Phase 4 — Same as desktop but mention mobile viewport:
```
To walk through each journey together in a mobile viewport (393x852), I need the app running.
```

**Step 4:** Write Phase 5 — Same structure as desktop with the mobile-specific elements listed above.

**Step 5:** Rewrite Phase 6 — Same as desktop.

**Step 6:** Update Phase 7 — Same as desktop.

**Step 7:** Update Task Hierarchy and Session Recovery — Same structure, mobile task names.

**Step 8:** Update frontmatter description to mention interactive walkthrough + mobile viewport.

**Step 9:** Commit.

```bash
git add skills/mobile-workflow-generator/SKILL.md
git commit -m "feat: rewrite mobile generator with iterative walkthrough"
```

---

## Task 3: Rewrite Multi-User Workflow Generator

**Files:**
- Modify: `skills/multi-user-workflow-generator/SKILL.md` (1,482 lines → same structural rewrite with persona-specific additions)

The multi-user generator follows the same structural rewrite but has unique elements:

### Multi-user-specific elements to preserve

1. **Phase 2 (Interview)** — The persona interview BEFORE code exploration is UNCHANGED. This remains Phase 2. Code exploration becomes Phase 3 (shifted by one). All subsequent phases shift accordingly.

2. **Phase numbering** — Because of the interview phase, the multi-user generator has one extra phase:
   ```
   Phase 1: Assess current state
   Phase 2: Interview user about personas (UNIQUE)
   Phase 3: Code exploration (3 parallel agents — auth/roles, multi-user features, real-time sync)
   Phase 4: Journey discovery + user confirmation
   Phase 5: App URL + auth setup (per persona)
   Phase 6: Iterative walkthrough
   Phase 7: Final review
   Phase 8: Write file
   ```

3. **Phase 4 (Journey Discovery)** — Present journeys with persona tags in interleaved order:
   ```
   Core:
   1. Team Invitation Flow:
      [Admin] /team/settings → /team/invite
      [Guest] /inbox (receives invitation)
      [Admin] /team/members (sees updated list)
   ```

4. **Phase 5 (Auth Setup)** — Set up authentication for EACH persona:
   ```
   For multi-user workflows, I need credentials for each persona:

   - Admin: ADMIN_EMAIL / ADMIN_PASSWORD
   - Host: HOST_EMAIL / HOST_PASSWORD
   - Guest1: GUEST1_EMAIL / GUEST1_PASSWORD

   Please provide values or confirm I should use these env var names.
   ```
   Create a separate Playwright browser context for each persona with its own storageState.

5. **Phase 6b (Confirm Actions)** — Actions are presented with persona tags:
   ```
   Step 1: [Admin] Navigate to /team/settings
   Step 2: [Admin] Click "Invite Member" → Fill email field → Click "Send Invite"
   Step 3: [Guest] Navigate to /inbox
   Step 4: [Guest] Click invitation notification → Click "Accept"
   Step 5: [Admin] Navigate to /team/members
   ```
   Playwright switches browser contexts when the persona changes.

6. **Phase 6c (Verifications)** — At persona handoff points, propose sync timing verifications:
   ```
   Step 3: [Guest] /inbox
   [screenshot from Guest's browser context]

   Proposed verifications:
   - Verify invitation notification appears
   - Sync verification: notification visible within 5 seconds of Admin's invite action

   Edge cases:
   - Guest already on inbox page when invite sent — appears without refresh?
   - Guest has notifications disabled — alternative way to see invite?
   ```

7. **Multi-User UX Anti-Patterns section** — KEEP the full section (sync issues, permission propagation, collaboration patterns, notification patterns). Referenced during 6c proposals.

8. **Persona Registry** — The assembled document includes the Persona Registry table at the top.

### Steps

**Step 1:** Read the existing file, identify section boundaries.

**Step 2:** Keep Phase 1 (Assess Current State) and Phase 2 (Interview) as-is.

**Step 3:** Keep Phase 3 (Code Exploration) as-is (renumbered from Phase 3 to Phase 3).

**Step 4:** Rewrite Phase 4 — Journey Discovery with persona-tagged routes.

**Step 5:** Rewrite Phase 5 — App URL + per-persona auth setup.

**Step 6:** Write Phase 6 — Iterative Walkthrough with persona context switching, sync verification proposals.

**Step 7:** Rewrite Phase 7 — Final review (same as desktop).

**Step 8:** Update Phase 8 — Write file (same logic).

**Step 9:** Update Task Hierarchy and Session Recovery for new phase structure.

**Step 10:** Update frontmatter description.

**Step 11:** Commit.

```bash
git add skills/multi-user-workflow-generator/SKILL.md
git commit -m "feat: rewrite multi-user generator with iterative walkthrough"
```

---

## Task 4: Update Design Doc Status

**Files:**
- Modify: `docs/plans/2026-03-09-iterative-walkthrough-generators-design.md`

**Step 1:** Update the status field from "Approved" to "Implemented".

**Step 2:** Commit.

```bash
git add docs/plans/2026-03-09-iterative-walkthrough-generators-design.md
git commit -m "docs: mark iterative walkthrough design as implemented"
```

---

## Task 5: Update README

**Files:**
- Modify: `README.md`

**Step 1:** Read the current README.

**Step 2:** Update the generator descriptions to mention the interactive walkthrough approach instead of the old "optional live crawl" approach. Key changes:
- Generators now walk the live app with the user step-by-step
- Playwright MCP is required (not optional)
- Each step is individually co-authored with the user

**Step 3:** Commit.

```bash
git add README.md
git commit -m "docs: update README for iterative walkthrough generators"
```

---

## Task 6: Update Plugin Description

**Files:**
- Modify: `.claude-plugin/plugin.json`

**Step 1:** Read the current plugin.json.

**Step 2:** If the plugin description mentions the generator approach, update it to reflect the iterative walkthrough pattern.

**Step 3:** Commit.

```bash
git add .claude-plugin/plugin.json
git commit -m "chore: update plugin description for iterative walkthrough"
```
