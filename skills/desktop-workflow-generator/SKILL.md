---
name: desktop-workflow-generator
description: Generates desktop browser workflow documentation by exploring the app's codebase and optionally crawling the live app via Playwright. Use when the user says "generate desktop workflows", "create desktop workflows", "update desktop workflows", or "generate browser workflows". Produces numbered workflow markdown files that feed into the desktop converter and Playwright runner.
---

# Desktop Workflow Generator

You are a senior QA engineer creating comprehensive desktop browser workflow documentation for Playwright-based testing. Your job is to deeply explore the application and generate thorough, testable workflows that cover all key user journeys. Every workflow you produce must be specific enough that another engineer -- or an automated Playwright script -- can follow it step-by-step without ambiguity.

You combine static codebase analysis (via parallel Explore agents) with an optional live crawl (via Playwright MCP) to build a complete picture of the application before writing a single workflow.

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
  +-- [Crawl Task]   "Crawl: Live App"                     (optional, Playwright MCP)
  +-- [Generate Task] "Generate: Workflow Drafts"
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

### Step 1a: Check for Existing Workflows

Look for an existing workflow file at `/workflows/desktop-workflows.md` relative to the project root.

```
Use Glob to search for:
  - workflows/desktop-workflows.md
  - workflows/browser-workflows.md
  - workflows/*.md
```

If a file exists, read it and summarize what it contains (number of workflows, coverage areas, last-modified date if available).

### Step 1b: Ask the User Their Goal

Use `AskUserQuestion` to determine intent:

```
I found [existing state]. What would you like to do?

1. **Create** -- Generate workflows from scratch (replaces any existing file)
2. **Update** -- Add new workflows and refresh existing ones
3. **Refactor** -- Restructure and improve existing workflows without changing coverage
4. **Audit** -- Review existing workflows for gaps and suggest additions
```

If no existing file is found, skip the question and proceed with "Create" mode.

### Step 1c: Create the Main Task

```
TaskCreate:
  title: "Generate: Desktop Workflows"
  status: "in_progress"
  metadata:
    mode: "create"          # or update/refactor/audit
    existing_workflows: 0   # count from step 1a
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

## Phase 3: Identify User Journeys

Using the unified Application Map from Phase 2, categorize all discoverable user journeys into three tiers.

### Core Journeys

These are the critical paths that every user must be able to complete. If any of these break, the application is fundamentally unusable.

Examples:
- Sign up for a new account
- Log in with existing credentials
- Complete the primary task the app is built for
- Log out

### Feature Journeys

These cover specific features that add value but are not part of the critical path.

Examples:
- Edit profile settings
- Use search and filtering
- Export data
- Manage notifications
- Use keyboard shortcuts

### Edge Case Journeys

These cover error handling, boundary conditions, and unusual but valid paths.

Examples:
- Submit a form with invalid data
- Access a protected route while logged out
- Handle network errors gracefully
- Navigate with browser back/forward buttons
- Deep-link to a specific resource

### Update Task Metadata

```
TaskUpdate:
  title: "Generate: Desktop Workflows"
  metadata:
    core_journeys: 5
    feature_journeys: 12
    edge_case_journeys: 8
    total_journeys: 25
```

---

## Phase 4: Optional Live Crawl

After completing static code exploration, offer the user a live crawl to supplement findings.

### Ask the User

Use `AskUserQuestion`:

```
Code exploration is complete. I found [N] routes and [M] interactive components.

Would you like to supplement with a live crawl of the running app?
This uses Playwright to navigate the app and discover additional routes,
dynamic content, and runtime behavior that static analysis might miss.

If yes, provide the URL (e.g., http://localhost:3000).
If no, I will proceed to workflow generation using code analysis only.
```

### If the User Says Yes

Create the crawl task:

```
TaskCreate:
  title: "Crawl: Live App"
  status: "in_progress"
  metadata:
    base_url: "http://localhost:3000"
    pages_visited: 0
```

Use Playwright MCP tools to crawl the application:

```
1. browser_navigate to the base URL
2. browser_snapshot to capture the initial page structure
3. For each link/route discovered in Phase 2:
   a. browser_navigate to the route
   b. browser_snapshot to capture the page
   c. Record any new elements, routes, or interactions not found in code
4. For interactive elements:
   a. browser_click on buttons, links, nav items
   b. browser_snapshot after each interaction
   c. Note dynamic content, modals, dropdowns, state changes
```

Merge crawl findings into the Application Map. Flag any discrepancies between code analysis and live behavior (e.g., routes defined in code but returning 404, components present in code but not rendered).

```
TaskUpdate:
  title: "Crawl: Live App"
  status: "completed"
  metadata:
    pages_visited: 14
    new_routes_found: 2
    discrepancies: 1
```

### If the User Says No

Skip this phase entirely. Mark the crawl task as skipped:

```
TaskCreate:
  title: "Crawl: Live App"
  status: "completed"
  metadata:
    skipped: true
    reason: "User opted out"
```

---

## Phase 5: Generate Workflows

Using the Application Map (code exploration + optional crawl), generate workflow documents.

### Create the Generation Task

```
TaskCreate:
  title: "Generate: Workflow Drafts"
  status: "in_progress"
  metadata:
    target_count: 25
```

### Workflow Format

Every workflow follows this exact structure:

```markdown
## Workflow [N]: [Descriptive Name]
<!-- auth: required -->
<!-- priority: core -->
<!-- estimated-steps: 8 -->

> [One-sentence description of what this workflow tests and why it matters.]

**Preconditions:**
- User is logged in as [role]
- [Any required data state]

**Steps:**

1. Navigate to [specific page/URL]
   - Verify [expected page state]

2. Click the "[Button Label]" button
   - Verify [expected result of click]

3. Type "[specific text]" in the [field name] field
   - Verify [field accepts input correctly]

4. Click the "[Submit/Save]" button
   - Verify [success state: toast, redirect, updated data]

5. Verify [final expected state]
   - [Specific assertion about what should be true]

**Postconditions:**
- [What state the app should be in after this workflow completes]
```

### Workflow Writing Guidelines

When writing steps, follow these rules:

1. **Be specific** -- Never write "click the button." Write "Click the 'Save Changes' button in the profile settings form."
2. **Include expected outcomes** -- Every action step should have a verification sub-step stating what should happen.
3. **Use consistent verb language** -- See the Workflow Writing Standards table below.
4. **Specify selectors when known** -- If a `data-testid` was found during exploration, reference it: "Click the 'Delete' button (`data-testid='delete-post-btn'`)."
5. **Note auth requirements** -- Use the `<!-- auth: required -->` comment to indicate workflows that need a logged-in user.
6. **Mark priority** -- Use `<!-- priority: core -->`, `<!-- priority: feature -->`, or `<!-- priority: edge -->`.
7. **Number sequentially** -- Workflows are numbered starting at 1 with no gaps.
8. **Group by journey type** -- Core journeys first, then feature journeys, then edge cases.

### Update Task on Completion

```
TaskUpdate:
  title: "Generate: Workflow Drafts"
  status: "completed"
  metadata:
    workflows_generated: 25
    core: 5
    feature: 12
    edge: 8
```

---

## Phase 6: Organize and Write

Structure the full workflow document with a clear table of contents and logical grouping.

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

---

## Phase 7: Review with User (REQUIRED)

This phase is mandatory. You must never write the final file without user approval.

### Present Workflows for Review

Use `AskUserQuestion` to present the generated workflows:

```
I have generated [N] desktop workflows:
- [X] Core workflows (authentication, primary features)
- [Y] Feature workflows (secondary features, settings)
- [Z] Edge case workflows (error handling, edge cases)

Here is the full draft:

[Paste the complete workflow document]

Please review and let me know:
1. Are any workflows missing?
2. Should any workflows be removed or combined?
3. Are the steps accurate and specific enough?
4. Any other changes needed?

Reply "approved" to write the file, or provide feedback for revision.
```

### Create the Approval Task

```
TaskCreate:
  title: "Approval: User Review #1"
  status: "in_progress"
  metadata:
    iteration: 1
    workflows_presented: 25
```

### Handling Feedback

If the user provides feedback instead of approving:

1. Apply the requested changes to the workflow drafts.
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
    workflows_presented: 24
```

4. Present the revised draft to the user again.

Repeat until the user replies with "approved" or equivalent affirmation.

### On Approval

```
TaskUpdate:
  title: "Approval: User Review #[N]"
  status: "completed"
  metadata:
    iteration: N
    result: "approved"
    final_workflow_count: 24
```

---

## Phase 8: Write File and Complete

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
    workflows_written: 24
```

### Complete the Main Task

```
TaskUpdate:
  title: "Generate: Desktop Workflows"
  status: "completed"
  metadata:
    mode: "create"
    total_workflows: 24
    core: 5
    feature: 12
    edge: 7
    output_path: "/workflows/desktop-workflows.md"
    exploration_agents: 3
    live_crawl: true
    review_iterations: 2
```

### Final Summary

Present the user with a completion summary:

```
Desktop workflow generation complete.

File: /workflows/desktop-workflows.md

Summary:
- Total workflows: 24
- Core workflows: 5
- Feature workflows: 12
- Edge case workflows: 7
- Exploration agents used: 3
- Live crawl: yes (14 pages visited)
- Review iterations: 2

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

CASE 3: All Explore tasks are "completed", no Generate task
  -> Code exploration is done
  -> Check if Crawl task exists and its status
  -> Resume from Phase 4 (offer live crawl) or Phase 5 (generate)

CASE 4: Generate task is "completed", no Approval task
  -> Workflows were generated but not reviewed
  -> Resume from Phase 7 (review with user)

CASE 5: Approval task exists with result "changes_requested"
  -> User gave feedback but revisions were not completed
  -> Read the feedback from task metadata
  -> Apply changes and re-present for review
  -> Resume from Phase 7 (next iteration)

CASE 6: Approval task is "completed" with result "approved", no Write task
  -> Workflows were approved but file was not written
  -> Resume from Phase 8 (write file)

CASE 7: Write task is "completed"
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
