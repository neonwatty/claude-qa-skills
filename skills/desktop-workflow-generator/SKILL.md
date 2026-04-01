---
name: desktop-workflow-generator
description: Generates desktop browser workflow documentation by exploring the app's codebase, then walking through the live app with the user step-by-step via Playwright to co-author verifications. Use when the user says "generate desktop workflows", "create desktop workflows", "update desktop workflows", or "generate browser workflows".
---

# Desktop Workflow Generator

You are a senior QA engineer creating comprehensive desktop browser workflow documentation for Playwright-based testing. Your job is to deeply explore the application and generate thorough, testable workflows that cover all key user journeys. Every workflow you produce must be specific enough that another engineer -- or an automated Playwright script -- can follow it step-by-step without ambiguity.

You combine static codebase analysis (via parallel Explore agents) with a required live walkthrough (via Playwright MCP) to co-author each workflow step with the user. The walkthrough uses Playwright to navigate the running app, capture screenshots at each step, and present them to the user for verification and edge case decisions.

---

## Task List Integration

Task lists are the backbone of this skill's execution model. They serve five critical purposes:

1. **Parallel agent tracking** -- Multiple Explore agents run concurrently. Task lists let you and the user see which agents are running, which have finished, and what they found.
2. **Progress visibility** -- The user can check the task list at any time to understand where you are in the pipeline without interrupting your work.
3. **Session recovery** -- If a session is interrupted (timeout, crash, user closes tab), the task list tells you exactly where to resume.
4. **Iteration tracking** -- Review rounds with the user are numbered. Task metadata records which iteration you are on and what changed.
5. **Audit trail** -- After completion, the task list serves as a permanent record of what was explored, generated, and approved.

### Task Hierarchy

Every run of this skill creates the following task tree. Tasks are completed in order, but Explore tasks run in parallel.

```
[Main Task] "Generate: Desktop Workflows"
  +-- [Explore Task] "Explore: Routes & Navigation"        (agent)
  +-- [Explore Task] "Explore: Components & Features"      (agent)
  +-- [Explore Task] "Explore: State & Data"               (agent)
  +-- [Walkthrough Task] "Walkthrough: Desktop Journeys"   (Playwright MCP)
  +-- [Approval Task] "Approval: User Review #1"
  +-- [Write Task]    "Write: desktop-workflows.md"
```

### Session Recovery Check

At the very start of every invocation, check for an existing task list before doing anything else.

```
1. Read the current TaskList.
2. If no task list exists -> start from Phase 1.
3. If a task list exists:
   a. Find the last task with status "completed".
   b. Determine the corresponding phase.
   c. Inform the user: "Resuming from Phase N -- [phase name]."
   d. Skip to that phase's successor.
```

See the full Session Recovery section near the end of this document for the complete decision tree.

---

## Phase 1: Assess Current State

Before generating anything, understand what already exists and what the user wants.

### Step 1: Check for Existing Workflows

Look for an existing workflow file at `/workflows/desktop-workflows.md` relative to the project root.

```
Use Glob to search for:
  - workflows/desktop-workflows.md
  - workflows/browser-workflows.md
  - workflows/*.md
```

If a file exists, read it and summarize what it contains (number of workflows, coverage areas, last-modified date if available).

### Step 2: Ask the User Their Goal

Use `AskUserQuestion` to determine intent:

```
I found [existing state]. What would you like to do?

1. **Create** -- Generate workflows from scratch (replaces any existing file)
2. **Update** -- Add new workflows and refresh existing ones
3. **Refactor** -- Restructure and improve existing workflows without changing coverage
4. **Audit** -- Review existing workflows for gaps and suggest additions
```

If no existing file is found, skip the question and proceed with "Create" mode.

### Step 3: Create the Main Task

```
TaskCreate:
  title: "Generate: Desktop Workflows"
  status: "in_progress"
  metadata:
    mode: "create"          # or update/refactor/audit
    existing_workflows: 0   # count from step 1
    platform: "desktop"
    output_path: "/workflows/desktop-workflows.md"
```

---

## Phase 2: Explore the Application [DELEGATE TO AGENTS]

This is the most important phase. You spawn three parallel Explore agents to analyze the codebase from different angles. Each agent uses Read, Grep, and Glob tools (plus LSP if the project has one configured) to build a detailed picture of the application.

**Do NOT use any browser automation tools in this phase.** This is pure static analysis.

### Agent 1: Routes and Navigation

Create the task, then spawn the agent.

```
TaskCreate:
  title: "Explore: Routes & Navigation"
  status: "in_progress"
  metadata:
    agent_type: "explore"
    focus: "routing"
```

Spawn via the Task tool with the following parameters:

```
Task tool:
  subagent_type: "Explore"
  model: "sonnet"
  prompt: |
    You are a QA exploration agent focused on routes and navigation.

    Your job is to find EVERY route, page, and navigation path in this application.
    Use Read, Grep, and Glob to explore the codebase. Do NOT use any browser tools.

    Specifically, find and document:

    1. ALL defined routes
       - File-based routes (e.g., Next.js pages/, app/ directories)
       - Programmatic routes (e.g., React Router, Vue Router config files)
       - API routes / endpoints
       - Search for: route definitions, path patterns, URL constants

    2. Navigation patterns
       - Top-level navigation (header, sidebar, nav bars)
       - In-page navigation (tabs, accordions, steppers)
       - Breadcrumb trails
       - Search for: <Link>, <NavLink>, router.push, navigate(), href patterns

    3. Entry points
       - Landing page / home route
       - Login / signup pages
       - Deep-link patterns (e.g., /users/:id, /posts/:slug)
       - Redirect rules

    4. Auth-gated routes
       - Which routes require authentication?
       - Role-based access (admin, user, guest)
       - Search for: middleware, auth guards, protected route wrappers,
         useAuth, requireAuth, isAuthenticated, session checks

    Return your findings in this exact format:

    ## Routes Found
    | Route | File | Auth Required | Description |
    |-------|------|---------------|-------------|
    | /     | app/page.tsx | No | Landing page |
    | ...   | ...  | ...           | ...         |

    ## Navigation Structure
    - Primary nav: [list items]
    - Secondary nav: [list items]
    - Footer nav: [list items]

    ## Auth Gates
    - Protected routes: [list]
    - Auth middleware file: [path]
    - Role definitions: [list]

    ## Entry Points
    - Default entry: [route]
    - Auth entry: [route]
    - Deep-link patterns: [list]
```

### Agent 2: Components and Features

```
TaskCreate:
  title: "Explore: Components & Features"
  status: "in_progress"
  metadata:
    agent_type: "explore"
    focus: "components"
```

```
Task tool:
  subagent_type: "Explore"
  model: "sonnet"
  prompt: |
    You are a QA exploration agent focused on interactive components and features.

    Your job is to find EVERY interactive element and feature in this application.
    Use Read, Grep, and Glob to explore the codebase. Do NOT use any browser tools.

    Specifically, find and document:

    1. Interactive components
       - Forms (login, signup, settings, search, CRUD forms)
       - Buttons and CTAs (submit, delete, share, export)
       - Modals and dialogs (confirmation, detail views, create/edit)
       - Dropdowns, selects, multi-selects
       - File upload components
       - Date/time pickers
       - Search bars and filters
       - Pagination controls
       - Toast / notification components
       - Search for: <form, <button, <input, <select, <dialog, <Modal,
         onClick, onSubmit, onChange, data-testid

    2. Major features
       - Authentication flow (login, logout, signup, password reset)
       - CRUD operations for each entity
       - Search and filtering
       - Sorting and ordering
       - Import / export
       - Settings / preferences
       - User profile management
       - Dashboard or analytics views

    3. Component patterns
       - Design system / component library in use
       - Shared component directory
       - Form validation patterns (client-side, server-side)
       - Error boundary components
       - Loading / skeleton states

    4. Test attributes
       - Existing data-testid attributes
       - Existing aria-label attributes
       - Existing role attributes
       - Components missing test attributes (flag these)

    Return your findings in this exact format:

    ## Interactive Components
    | Component | File | Type | data-testid | Description |
    |-----------|------|------|-------------|-------------|
    | LoginForm | components/LoginForm.tsx | form | login-form | Email + password login |
    | ...       | ...  | ...  | ...         | ...         |

    ## Major Features
    - [ ] Authentication (login, logout, signup, reset)
    - [ ] [Feature name] ([sub-features])
    - ...

    ## Component Patterns
    - Design system: [name or "custom"]
    - Form validation: [pattern]
    - Error handling: [pattern]
    - Loading states: [pattern]

    ## Test Attribute Coverage
    - Components with data-testid: [count]
    - Components missing data-testid: [count]
    - List of missing: [component names]
```

### Agent 3: State and Data

```
TaskCreate:
  title: "Explore: State & Data"
  status: "in_progress"
  metadata:
    agent_type: "explore"
    focus: "state_data"
```

```
Task tool:
  subagent_type: "Explore"
  model: "sonnet"
  prompt: |
    You are a QA exploration agent focused on state management and data flow.

    Your job is to understand how data moves through this application.
    Use Read, Grep, and Glob to explore the codebase. Do NOT use any browser tools.

    Specifically, find and document:

    1. Data model
       - Database schema (Prisma, Drizzle, TypeORM, raw SQL migrations)
       - TypeScript types / interfaces for entities
       - Relationships between entities
       - Search for: schema files, model definitions, type/interface declarations,
         migration files

    2. CRUD operations
       - For each entity: what Create, Read, Update, Delete operations exist?
       - Server actions, API handlers, or service functions
       - Which operations are admin-only vs user-level?
       - Search for: create, update, delete, insert, mutation, action functions

    3. API patterns
       - REST endpoints (GET, POST, PUT, DELETE)
       - GraphQL queries/mutations
       - Server actions (Next.js "use server")
       - tRPC procedures
       - Search for: fetch(, axios, api/, trpc, useMutation, useQuery

    4. State management
       - Client-side state (useState, Redux, Zustand, Jotai, Context)
       - Server state (React Query, SWR, server components)
       - Form state (React Hook Form, Formik, native)
       - URL state (search params, hash fragments)
       - Search for: useState, useReducer, create(Store|Slice|Context),
         useQuery, useSWR, useSearchParams

    Return your findings in this exact format:

    ## Data Model
    | Entity | Source File | Fields | Relationships |
    |--------|-------------|--------|---------------|
    | User   | schema.prisma | id, email, name, role | has many Posts |
    | ...    | ...         | ...    | ...           |

    ## CRUD Operations
    | Entity | Create | Read | Update | Delete | Auth Required |
    |--------|--------|------|--------|--------|---------------|
    | User   | signup | /api/users | /settings | admin only | varies |
    | ...    | ...    | ...  | ...    | ...    | ...           |

    ## API Patterns
    - Pattern: [REST / GraphQL / Server Actions / tRPC]
    - Base URL: [if applicable]
    - Auth mechanism: [JWT / session / cookie]

    ## State Management
    - Client state: [library/pattern]
    - Server state: [library/pattern]
    - Form state: [library/pattern]
```

### After All Agents Complete

Once all three Explore agents have returned their findings, update each task:

```
TaskUpdate:
  title: "Explore: Routes & Navigation"
  status: "completed"
  metadata:
    routes_found: 14
    auth_gated_routes: 6
    nav_structures: 3
```

```
TaskUpdate:
  title: "Explore: Components & Features"
  status: "completed"
  metadata:
    components_found: 23
    features_found: 8
    missing_testids: 5
```

```
TaskUpdate:
  title: "Explore: State & Data"
  status: "completed"
  metadata:
    entities: 5
    crud_operations: 18
    api_pattern: "server_actions"
```

Merge all three agent reports into a single unified Application Map that you will reference throughout the remaining phases.

---

## Phase 3: Journey Discovery + User Confirmation

Using the unified Application Map from Phase 2, identify all discoverable user journeys and present them to the user as page/route sequences grouped by priority.

### Present Journeys for Confirmation

Use `AskUserQuestion` to present the discovered journeys:

```
Discovered journeys (ordered by priority):

Core:
1. Login and Dashboard: /login -> /dashboard
2. Create New Item: /dashboard -> /items/new -> /items/:id
3. User Registration: /signup -> /verify-email -> /dashboard

Feature:
4. Edit Profile Settings: /dashboard -> /settings -> /settings/profile
5. Search and Filter: /items -> /items?q=...
6. Export Data: /items -> /export

Edge Case:
7. Password Reset: /login -> /forgot-password -> /reset-password
8. Access Protected Route While Logged Out: /dashboard -> /login (redirect)

Should I add, remove, or reorder any of these journeys?
```

Each journey is presented as a numbered list item with a short name and its route sequence. Do not include detailed steps, verifications, or preconditions at this stage -- those are co-authored during the walkthrough in Phase 5.

### Apply User Feedback

If the user wants changes:
- **Add**: Append new journeys to the appropriate priority group.
- **Remove**: Drop the specified journeys from the list.
- **Reorder**: Move journeys between priority groups or change their sequence.
- **Adjust**: Modify the route sequence for a specific journey.

Re-present the updated list for final confirmation before proceeding.

### Update Task Metadata

```
TaskUpdate:
  title: "Generate: Desktop Workflows"
  metadata:
    core_journeys: 3
    feature_journeys: 3
    edge_case_journeys: 2
    total_journeys: 8
    journeys_confirmed: true
```

### Route Coverage Check

After the user confirms the journey list, cross-reference the routes discovered by the Explore agents in Phase 2 against the Navigate targets in the proposed journeys.

```
1. Collect all routes discovered by Agent 1 (Routes & Navigation).
2. Collect all Navigate targets from the confirmed journey list.
3. Identify any discovered routes that do NOT appear as a Navigate target
   in any proposed journey.
4. If there are uncovered routes, present them to the user:

   "The following [N] routes from your app are not covered by any proposed workflow:

   | Route | Auth Required | Notes |
   |-------|---------------|-------|
   | /settings | yes | Discovered in routes scan |
   | /admin/users | yes | Admin-only route |
   | /api/webhooks | no | API route — may not need UI workflow |

   Would you like to:
   1. Add workflows for some of these routes
   2. Skip them (they will be noted as intentionally uncovered)
   3. Continue as-is (I will note the gaps in the appendix)"

5. If the user adds new journeys, append them to the confirmed list and
   update the task metadata counts.
6. If the user skips or continues, note the uncovered routes in the
   Application Map appendix for transparency.
```

### Entity Coverage Suggestions

After the route coverage check, cross-reference the entities and CRUD operations discovered by Agent 2 (Components & Features) and Agent 3 (State & Data) against the confirmed journey list.

```
1. Collect all entities and their CRUD operations from the Explore agent results.
2. For each entity, check whether the confirmed journeys cover its key operations
   (create, read, update, delete, plus any state transitions like archive/publish).
3. If any entity operations are NOT covered by any proposed journey, surface them
   as natural-language suggestions (not a matrix):

   "I also noticed a few entity operations from your codebase that aren't covered
   by any workflow yet:

   - No workflow covers **deleting a project**
   - No workflow covers **updating user settings**
   - No workflow covers **archiving a team**

   Would you like to add workflows for any of these, or skip them?"

4. If the user adds new journeys, append them to the confirmed list and
   update the task metadata counts.
5. If the user skips, no further action -- these are suggestions, not gates.
```

---

## Phase 4: App URL + Auth Setup

The live walkthrough requires a running application. This phase is **required** -- there is no option to skip.

### Ask for the App URL

Use `AskUserQuestion`:

```
The live walkthrough requires a running app. Please provide the URL
(e.g., http://localhost:3000, https://preview.example.com, or https://app.example.com).
```

### Ask for Authentication Setup (if needed)

If Phase 2 discovered auth-gated routes, check for saved profiles before asking the user for credentials.

**Step 1: Check for saved profiles**

```
1. Check if .playwright/profiles.json exists at the project root.
2. If it exists, read it and check for valid storageState files
   at .playwright/profiles/<role-name>.json.
```

**If profiles exist with valid storageState files**, select which profile to use:

- If only one profile exists, use it automatically.
- If multiple profiles exist, present the available profiles with their descriptions and ask the user which one to use for the walkthrough:

```
I found [N] authentication profiles for this project:

1. admin — Full admin permissions
2. user — Standard user account
3. viewer — Read-only access

Which profile should I use for the desktop walkthrough?
```

Once a profile is selected, load it:

```javascript
async (page) => {
  const state = <contents of .playwright/profiles/<selected-profile>.json>;
  await page.context().addCookies(state.cookies);
  if (state.origins) {
    for (const origin of state.origins) {
      if (origin.localStorage && origin.localStorage.length > 0) {
        await page.goto(origin.origin);
        await page.evaluate((items) => {
          for (const { name, value } of items) localStorage.setItem(name, value);
        }, origin.localStorage);
      }
    }
  }
  if (state.sessionStorage && state.sessionStorage.length > 0) {
    await page.evaluate((items) => {
      for (const { name, value } of items) sessionStorage.setItem(name, value);
    }, state.sessionStorage);
  }
  return 'Profile loaded: <selected-profile>';
}
```

Navigate to the base URL and verify the session is still valid:
1. If the browser is redirected to the profile's `loginUrl`, the session has expired.
2. If the final URL is on a different domain (e.g., an OAuth provider), the session has expired.
3. Take a `browser_snapshot` — if login-related UI is visible instead of the expected page content, the session has expired.

If expiry is detected, inform the user and suggest running `/setup-profiles` to refresh it.

**If profiles are configured but storageState files are missing**, inform the user:

```
This project has Playwright profiles configured but the auth state files are
missing (they are gitignored). Run /setup-profiles to authenticate.
```

**Step 2: If no profiles exist, ask the user**

Use `AskUserQuestion`:

```
Some journeys require authentication. How should I log in?

1. **Set up profiles** -- Run /setup-profiles to create persistent auth profiles (recommended)
2. **Credentials** -- Provide email and password, and I will log in via the app's login form
3. **Storage state** -- Provide a path to a Playwright storageState JSON file
```

### Create the Walkthrough Task

```
TaskCreate:
  title: "Walkthrough: Desktop Journeys"
  status: "in_progress"
  metadata:
    base_url: "http://localhost:3000"
    auth_method: "<selected method>"  # profiles, credentials, or storageState
    total_journeys: 8
    completed_journeys: 0
    current_journey: 1
```

---

## Phase 5: Iterative Walkthrough [PER JOURNEY]

This is the core phase. For each confirmed journey from Phase 3, walk through the live app with the user to co-author the workflow steps. Repeat Steps 1, 2, and 3 for every journey.

### Step 1: Confirm Screen Flow

Present the journey's screens as a route sequence. The user already approved the journey list in Phase 3, but this is the per-journey confirmation before Playwright starts navigating.

Use `AskUserQuestion`:

```
Journey 1: Login and Dashboard

Screen flow:
  /login -> /dashboard

Is this the right screen flow, or should I adjust it?
```

If the user wants to add intermediate screens (e.g., a 2FA step between login and dashboard), update the flow before proceeding.

### Step 2: Confirm Actions + Playwright Captures

Present the proposed actions at each transition. These proposals are informed by the code exploration results from Phase 2 (e.g., the Routes agent found a login form with email and password fields, the Components agent found a "Sign In" button with `data-testid="login-btn"`).

Use `AskUserQuestion`:

```
Journey 1: Login and Dashboard

Proposed actions:
  Step 1: Navigate to /login
  Step 2: Fill email field -> Fill password field -> Click "Sign In" button
  Step 3: Arrive at /dashboard

Are these the right actions? Any to add, remove, or adjust?
```

Once the user confirms, **execute the confirmed actions via Playwright and capture a screenshot at each step**. The user does not interact during Playwright execution.

### Data for Form Fields

When Playwright fills form fields during execution:
- For authentication forms, use the credentials obtained in Phase 4.
- For non-auth forms that require specific data (e.g., creating an item, filling a profile), use reasonable test data.
- If a form requires domain-specific input that cannot be guessed, flag it during Step 3 and ask the user what values to use.

Playwright execution sequence:

```
1. browser_navigate to the first route
2. browser_take_screenshot to capture the initial state
3. For each subsequent action:
   a. Execute the action:
      - browser_click for clicks
      - browser_type or browser_fill_form for text input
      - browser_navigate for direct navigation
   b. browser_take_screenshot to capture the result
4. Store each screenshot with its step number for use in Step 3
```

### Handling Playwright Failures

If an action fails during execution (element not found, timeout, navigation error):

1. Capture a screenshot of the current error state via `browser_take_screenshot`.
2. Continue to the next action if possible.
3. In Phase 5, Step 3, flag the failed step by presenting the error state screenshot and explaining what went wrong.
4. Use `AskUserQuestion` to ask the user whether to:
   - Retry with adjusted selectors or actions
   - Skip the step and continue
   - Abort the journey entirely

### Step 3: Co-Author Verifications + Edge Cases

For each screenshot captured in Step 2, present it to the user with proposed verifications and edge case suggestions. Verifications are informed by:
- The screenshot itself (what is visually present on screen)
- Code exploration results (what components, validation, and state were found)
- Anti-pattern detection (see the Web Platform UX Anti-Patterns section below)

Present one step at a time. Do not batch or group steps.

Use `AskUserQuestion` for each step:

```
Journey 1: Login and Dashboard -- Step 1

[screenshot of /login]

I see a login form with email and password fields, a "Sign In" button,
and a "Forgot Password?" link.

Proposed verifications:
- Verify the email input field is visible
- Verify the password input field is visible
- Verify the "Sign In" button is visible and enabled

Should I add, remove, or change any of these verifications?

Edge case suggestions (informed by code exploration):
- Submit with empty fields -> verify error message appears
- Submit with invalid email format -> verify validation message
- Submit with wrong password -> verify error state

Which edge cases should I include? (list numbers, "all", or "none")
```

### Building the Workflow Steps

Each confirmed verification becomes a workflow step. Edge cases become sub-steps numbered with a letter suffix (1a, 1b, etc.).

Example output for the step above:

```markdown
1. Navigate to /login
   - Verify the email input field is visible
   - Verify the password input field is visible
   - Verify the "Sign In" button is visible and enabled

   1a. [Edge Case] Submit the login form with empty fields
       - Verify an error message appears indicating required fields

   1b. [Edge Case] Type "not-an-email" in the email field and click "Sign In"
       - Verify a validation message appears for invalid email format
```

### Per-Workflow Template

> **Format reference:** Workflows follow the format defined in [`docs/workflow-format.md`](../../docs/workflow-format.md). See that spec for heading format, metadata comments, step format, recognized verbs, and assertion types. The generator uses these conventions for authoring; validation enforcement is performed externally by the validation subagent.

When assembling workflows in Phase 6, wrap each journey's confirmed steps in this template:

````markdown
## Workflow [N]: [Journey Name]
<!-- auth: required/no -->
<!-- priority: core/feature/edge -->
<!-- estimated-steps: [count] -->

> [One-sentence description]

**Preconditions:**
- [Required state from Phase 5, Steps 1/2]

**Steps:**
[Confirmed steps from Phase 5, Step 3]

**Postconditions:**
- [Final expected state after all steps complete]
````

### After Each Journey Completes

Update the walkthrough task metadata and inform the user before moving to the next journey:

```
TaskUpdate:
  title: "Walkthrough: Desktop Journeys"
  metadata:
    completed_journeys: 1
    current_journey: 2
    journey_1_steps: 5
    journey_1_edge_cases: 3
```

Use `AskUserQuestion`:

```
Journey 1 (Login and Dashboard) is complete: 5 steps, 3 edge cases.

Moving to Journey 2: Create New Item (/dashboard -> /items/new -> /items/:id).

Ready to continue?
```

### When All Journeys Are Complete

```
TaskUpdate:
  title: "Walkthrough: Desktop Journeys"
  status: "completed"
  metadata:
    completed_journeys: 8
    total_steps: 42
    total_edge_cases: 15
```

---

## Phase 6: Final Review

Assemble the complete workflow document and present it for holistic review. Because every step was individually co-authored with the user during the walkthrough, this review is expected to be lighter -- it focuses on the document as a whole rather than individual steps.

### Document Structure

```markdown
# Desktop Workflows

> Auto-generated by desktop-workflow-generator.
> Last updated: [date]
> Application: [app name]
> Base URL: [URL if known]

## Quick Reference

| # | Workflow | Priority | Auth | Steps |
|---|---------|----------|------|-------|
| 1 | User Registration | core | no | 7 |
| 2 | User Login | core | no | 5 |
| 3 | Create New Post | core | required | 8 |
| ... | ... | ... | ... | ... |

---

## Core Workflows

[Workflow 1 through N]

---

## Feature Workflows

[Workflow N+1 through M]

---

## Edge Case Workflows

[Workflow M+1 through end]

---

## Appendix: Application Map Summary

### Routes
[Summary table from exploration]

### Components
[Summary table from exploration]

### Data Model
[Summary table from exploration]
```

### Present for Review

Create the approval task and present the assembled document:

```
TaskCreate:
  title: "Approval: User Review #1"
  status: "in_progress"
  metadata:
    iteration: 1
    workflows_presented: 8
```

Use `AskUserQuestion`:

```
I have assembled [N] desktop workflows from our walkthrough:
- [X] Core workflows
- [Y] Feature workflows
- [Z] Edge case workflows

Here is the full document:

[Paste the complete workflow document]

Please review the overall document:
1. Are any journeys missing that we should add?
2. Should any workflows be combined or split?
3. Are there redundant verifications across workflows?
4. Does the ordering make sense?
5. Any other changes needed?

Reply "approved" to write the file, or provide feedback for revision.
```

### Handling Feedback

If the user provides feedback instead of approving:

1. Apply the requested changes to the workflow document.
2. Update the approval task:

```
TaskUpdate:
  title: "Approval: User Review #1"
  status: "completed"
  metadata:
    iteration: 1
    result: "changes_requested"
    feedback_summary: "Add password reset workflow, combine login variants"
```

3. Create a new approval task for the next round:

```
TaskCreate:
  title: "Approval: User Review #2"
  status: "in_progress"
  metadata:
    iteration: 2
    changes_made: ["added password reset workflow", "combined login variants"]
    workflows_presented: 9
```

4. Present the revised document to the user again.

Repeat until the user replies with "approved" or equivalent affirmation.

### On Approval

```
TaskUpdate:
  title: "Approval: User Review #[N]"
  status: "completed"
  metadata:
    iteration: N
    result: "approved"
    final_workflow_count: 8
```

---

## Phase 7: Write File and Complete

> **Validation is external.** Do not self-validate. After this file is written, validation is performed by the validation subagent (`agents/validation-subagent.md`), which runs independently of the generator. The subagent invokes `scripts/validate-workflows.sh` for mechanical checks and presents judgment observations to the user.

### Write the File

Write the approved workflow document to `/workflows/desktop-workflows.md` relative to the project root.

```
1. Ensure the /workflows/ directory exists (create it if not).
2. Write the complete document to /workflows/desktop-workflows.md.
3. Verify the file was written correctly by reading it back.
```

### Update the Write Task

```
TaskCreate:
  title: "Write: desktop-workflows.md"
  status: "completed"
  metadata:
    file_path: "/workflows/desktop-workflows.md"
    file_size_lines: 487
    workflows_written: 8
```

### Complete the Main Task

```
TaskUpdate:
  title: "Generate: Desktop Workflows"
  status: "completed"
  metadata:
    mode: "create"
    total_workflows: 8
    core: 3
    feature: 3
    edge: 2
    output_path: "/workflows/desktop-workflows.md"
    exploration_agents: 3
    walkthrough_journeys: 8
    total_steps: 42
    total_edge_cases: 15
    review_iterations: 1
```

### Final Summary

Present the user with a completion summary:

```
Desktop workflow generation complete.

File: /workflows/desktop-workflows.md

Summary:
- Total workflows: 8
- Core workflows: 3
- Feature workflows: 3
- Edge case workflows: 2
- Exploration agents used: 3
- Walkthrough journeys completed: 8
- Total steps: 42
- Total edge cases: 15
- Review iterations: 1

Next steps:
- Run "convert workflows to playwright" to generate E2E test files
- Run "run playwright tests" to execute the generated tests
```

---

## Session Recovery

If the skill is invoked and an existing task list is found, use this decision tree to determine where to resume.

### Decision Tree

```
Check TaskList for "Generate: Desktop Workflows"

CASE 1: No task list exists
  -> Start from Phase 1

CASE 2: Explore tasks are "in_progress"
  -> Some agents may have timed out
  -> Check which Explore tasks completed
  -> Re-spawn only the incomplete agents
  -> Resume from Phase 2 (partial)

CASE 3: All Explore tasks are completed, journeys_confirmed is NOT set
  -> Resume from Phase 3 (journey discovery)

CASE 4: All Explore tasks are completed, journeys_confirmed is set, no Walkthrough task
  -> Resume from Phase 4 (app URL + auth setup)

CASE 5: Walkthrough task is "in_progress"
  -> Some journeys were completed, others remain
  -> Read completed_journeys and current_journey from task metadata
  -> Inform user which journeys are done and which is next
  -> Resume from Phase 5 at the next incomplete journey

CASE 6: Walkthrough task is "completed", no Approval task
  -> All journeys walked through but document not yet reviewed
  -> Resume from Phase 6 (final review)

CASE 7: Approval task exists with result "changes_requested"
  -> User gave feedback but revisions were not completed
  -> Read the feedback from task metadata
  -> Apply changes and re-present for review
  -> Resume from Phase 6 (next iteration)

CASE 8: Approval task is "completed" with result "approved", no Write task
  -> Document was approved but file was not written
  -> Resume from Phase 7 (write file)

CASE 9: Write task is "completed"
  -> Everything is done
  -> Show the final summary and ask if the user wants to make changes
```

### Always Inform the User When Resuming

```
I found an existing session for desktop workflow generation.

Current state: [describe where things left off]
Last completed phase: [phase name]

I will resume from [next phase]. If you would like to start over instead,
let me know and I will create a fresh session.
```

---

## Workflow Writing Standards

Use these exact verb forms and patterns when writing workflow steps. Consistency makes workflows easier to read, review, and automate.

| Action | Format | Example |
|--------|--------|---------|
| Navigation | Navigate to [URL/page] | Navigate to the dashboard page |
| Click | Click the "[label]" [element type] | Click the "Save" button |
| Type | Type "[text]" in the [field name] field | Type "john@email.com" in the email field |
| Select | Select "[option]" from the [dropdown name] dropdown | Select "Admin" from the role dropdown |
| Check | Check the "[label]" checkbox | Check the "Remember me" checkbox |
| Uncheck | Uncheck the "[label]" checkbox | Uncheck the "Send notifications" checkbox |
| Toggle | Toggle the "[label]" switch [on/off] | Toggle the "Dark mode" switch on |
| Clear | Clear the [field name] field | Clear the search field |
| Scroll | Scroll [direction] to [target/distance] | Scroll down to the comments section |
| Hover | Hover over the "[label]" [element] | Hover over the "Settings" menu item |
| Wait | Wait for [condition] | Wait for the loading spinner to disappear |
| Verify | Verify [expected state] | Verify the success toast appears with message "Saved" |
| Upload | Upload "[filename]" to the [upload area] | Upload "avatar.png" to the profile picture dropzone |
| Drag | Drag "[source]" to "[target]" | Drag "Task A" to the "Done" column |
| Press | Press [key/shortcut] | Press Escape to close the modal |
| Refresh | Refresh the page | Refresh the page and verify data persists |

---

## Automation-Friendly Guidelines

Workflows are designed to be converted into Playwright E2E tests. Follow these guidelines to make conversion straightforward.

### Locator Descriptions

When describing elements in workflow steps, prefer descriptions that map cleanly to Playwright's recommended locator strategies:

| Locator Strategy | Workflow Description | Playwright Equivalent |
|-----------------|---------------------|----------------------|
| By role + name | Click the "Submit" button | `page.getByRole('button', { name: 'Submit' })` |
| By label | Type "john@email.com" in the email field | `page.getByLabel('Email')` |
| By text | Click the "Learn more" link | `page.getByText('Learn more')` |
| By placeholder | Type "Search..." in the search box | `page.getByPlaceholder('Search...')` |
| By test ID | Click the delete button (`data-testid="delete-btn"`) | `page.getByTestId('delete-btn')` |
| By title | Hover over the info icon (title="More information") | `page.getByTitle('More information')` |

### Preferred Locator Order

When writing steps, prefer locator descriptions in this order (matching Playwright's recommendation):

1. Role-based (buttons, links, headings, etc.)
2. Label-based (form fields)
3. Text-based (visible text content)
4. Placeholder-based (input placeholders)
5. Test ID-based (data-testid attributes)
6. CSS/XPath-based (last resort, avoid when possible)

### Non-Automatable Steps

Some steps cannot be automated with Playwright. Mark these with `[MANUAL]`:

```markdown
4. [MANUAL] Verify the email arrives in the user's inbox
   - Check for subject line "Welcome to [App Name]"

7. [MANUAL] Complete the CAPTCHA challenge
   - Workflow continues after CAPTCHA is solved
```

### Known Limitations

| Limitation | Description | Workaround |
|-----------|-------------|------------|
| Native file dialogs | Playwright cannot interact with OS-level file pickers | Use `page.setInputFiles()` instead of clicking file inputs |
| Native print dialogs | Cannot automate browser print preview | Skip or mock print functionality |
| Browser extensions | Playwright does not support browser extensions | Test extension-dependent features manually |
| Multi-tab OAuth | OAuth popups in new tabs require special handling | Use `context.waitForEvent('page')` pattern |
| Clipboard access | Clipboard API requires permissions | Grant permissions in browser context setup |
| Download verification | Cannot directly verify file contents after download | Use download event listeners and file system checks |
| HTTP basic auth | Browser-native auth dialogs are not automatable via page | Use `httpCredentials` in browser context |
| Geolocation prompts | Permission prompts block automation | Set geolocation in context options before navigation |

### Prerequisites for Automation

When a workflow requires specific setup, document it in the Preconditions block:

```markdown
**Preconditions:**
- User is logged in as admin (`admin@example.com` / `password123`)
- At least 3 posts exist in the database
- The feature flag "new-editor" is enabled
```

This information is critical for the converter skill to generate proper `beforeEach` and `beforeAll` blocks.

---

## Web Platform UX Anti-Patterns

When generating workflows, watch for these common UX anti-patterns. If you detect any during exploration, flag them in the workflow document and write specific test steps to verify the application handles them correctly.

### Navigation Anti-Patterns

| Anti-Pattern | Why It Matters | Verification Step |
|-------------|----------------|-------------------|
| Gesture-only navigation | Desktop users have no swipe gestures | Verify all navigation is accessible via click or keyboard |
| Breaking the back button | Users expect browser back to work | Navigate forward, click back, verify previous page loads |
| No URL for stateful views | Users cannot bookmark or share specific states | Verify that filters, tabs, and modals have URL representations |
| Hash-only routing | Breaks SSR and some crawlers | Check that routes use proper path segments |
| Redirect loops | Login -> redirect -> login cycles | Attempt to access protected routes, verify single redirect |

### Interaction Anti-Patterns

| Anti-Pattern | Why It Matters | Verification Step |
|-------------|----------------|-------------------|
| Missing hover states | Desktop users expect visual hover feedback | Hover over interactive elements, verify cursor and style change |
| No focus indicators | Keyboard users cannot see where they are | Tab through the page, verify visible focus ring on each element |
| Click targets too small | Precision issues on large screens with trackpads | Verify buttons and links have adequate click area (min 24x24px) |
| Pull-to-refresh patterns | Desktop browsers do not support pull gestures | Verify refresh functionality is available via button or keyboard |
| Double-click required | Unexpected interaction pattern for web | Verify all actions respond to single click |
| Context menu overriding | Users expect native right-click behavior | Right-click on page, verify native context menu appears |

### Visual Anti-Patterns

| Anti-Pattern | Why It Matters | Verification Step |
|-------------|----------------|-------------------|
| Full-screen modals on desktop | Wastes screen space on large viewports | Verify modals are appropriately sized for desktop viewports |
| No responsive breakpoints | Content may overflow or underflow | Test at common breakpoints: 1024px, 1280px, 1440px, 1920px |
| Fixed mobile-width layouts | Desktop users expect fluid or max-width layouts | Verify layout adapts to viewport width |
| Tiny text on large screens | Readability issues at desktop viewing distances | Verify body text is at least 16px |
| Horizontal scroll on content | Unexpected on desktop (except tables/code) | Verify no horizontal scrollbar appears at 1280px+ |

### Component Anti-Patterns

| Anti-Pattern | Why It Matters | Verification Step |
|-------------|----------------|-------------------|
| Native mobile pickers | Date/time pickers designed for touch, not mouse | Verify date/time inputs use desktop-friendly pickers |
| Action sheets instead of dropdowns | Mobile pattern that looks wrong on desktop | Verify selection components use standard dropdown/select |
| iOS-style toggle switches | May confuse desktop users expecting checkboxes | Verify toggle behavior matches desktop conventions |
| Bottom sheets | Mobile pattern that wastes desktop space | Verify panels and drawers use side placement on wide viewports |
| Floating action buttons (FABs) | Mobile Material Design pattern, unusual on desktop | Verify primary actions are in standard toolbar/header positions |

### Accessibility Anti-Patterns

| Anti-Pattern | Why It Matters | Verification Step |
|-------------|----------------|-------------------|
| No keyboard navigation | Many desktop users rely on keyboard | Tab through all interactive elements, verify logical order |
| Missing ARIA labels | Screen readers cannot identify elements | Check interactive elements for aria-label or aria-labelledby |
| Color-only status indicators | Colorblind users cannot distinguish states | Verify status uses text/icons in addition to color |
| Auto-playing media | Unexpected and disruptive for desktop users | Verify no media plays without user interaction |
| Focus traps in modals | Tab key should cycle within open modals | Open modal, tab through all elements, verify focus stays inside |
| Missing skip navigation | Keyboard users must tab through entire nav | Verify "Skip to main content" link exists and works |

### UX Verification Steps Template

When anti-patterns are detected during exploration, add a dedicated UX verification workflow:

```markdown
## Workflow [N]: UX Pattern Compliance
<!-- auth: no -->
<!-- priority: feature -->

> Verifies the application follows desktop web platform conventions and avoids
> common UX anti-patterns that harm usability.

**Steps:**

1. Navigate to the home page
   - Verify no horizontal scroll at 1280px viewport width

2. Tab through all interactive elements on the page
   - Verify each element has a visible focus indicator
   - Verify tab order follows logical reading order

3. Hover over all buttons and links
   - Verify cursor changes to pointer
   - Verify hover state is visually distinct from default state

4. Click the browser back button after navigating to a sub-page
   - Verify the previous page loads correctly
   - Verify no redirect loops occur

5. [Continue based on specific anti-patterns found...]
```

---

## Handling Updates

When the user selects "Update" mode (modifying existing workflows), follow these rules to minimize disruption while ensuring coverage stays current.

### Rules for Updating Existing Workflows

1. **Preserve working workflows** -- If an existing workflow is still valid (routes exist, components match, steps are correct), keep it unchanged. Do not rewrite working workflows for style consistency.

2. **Mark deprecated workflows** -- If a workflow references routes or components that no longer exist, do not delete it. Instead, add a deprecation marker:

```markdown
## Workflow 7: Legacy Export Feature
<!-- auth: required -->
<!-- priority: feature -->
<!-- deprecated: true -->
<!-- deprecated-reason: Export feature removed in v2.3 -->
<!-- deprecated-date: 2025-01-15 -->

> **DEPRECATED** -- This workflow references the legacy export feature which
> has been removed. Keeping for reference until confirmed safe to delete.
```

3. **Add new workflows** -- New workflows are appended to the appropriate section (Core, Feature, or Edge Case). Number them sequentially after the last existing workflow.

4. **Version notes** -- Add a version history section at the top of the file:

```markdown
## Version History

| Date | Action | Details |
|------|--------|---------|
| 2025-01-20 | Updated | Added workflows 26-28 for new dashboard features |
| 2025-01-15 | Updated | Deprecated workflow 7 (export feature removed) |
| 2025-01-01 | Created | Initial generation: 25 workflows |
```

5. **Re-validate existing workflows** -- During exploration, cross-reference existing workflow steps against the current codebase. Flag any steps that reference elements or routes that have changed:

```markdown
3. Click the "Export CSV" button
   - **[CHANGED]** Button label is now "Download CSV" (updated in v2.2)
   - Verify download begins within 3 seconds
```

6. **Preserve workflow numbers** -- Never renumber existing workflows. If workflow 7 is deprecated and workflow 28 is added, the gap stays. This ensures external references to "Workflow 7" remain valid.

### Update Summary

After an update operation, present a change summary:

```
Desktop workflow update complete.

Changes:
- Workflows preserved (unchanged): 20
- Workflows updated (steps modified): 3
- Workflows deprecated: 1
- Workflows added (new): 3
- Total workflows: 27 (1 deprecated)

Changed workflows:
- Workflow 4: Updated step 3 (button label changed)
- Workflow 12: Updated step 1 (route changed from /settings to /preferences)
- Workflow 19: Updated steps 5-7 (new confirmation dialog added)

Deprecated workflows:
- Workflow 7: Legacy Export Feature (export removed in v2.3)

New workflows:
- Workflow 26: Dashboard Widget Customization
- Workflow 27: Real-Time Notification Center
- Workflow 28: Bulk Action on List View
```
