---
name: mobile-workflow-generator
description: Generates mobile browser workflow documentation by exploring the app's codebase, then walking through the live app with the user step-by-step via Playwright in a mobile viewport (393x852) to co-author verifications. Use when the user says "generate mobile workflows", "create mobile workflows", "update mobile workflows", or "generate mobile browser workflows". Produces numbered workflow markdown files that feed into the mobile converter and Playwright runner. Includes iOS HIG awareness and mobile UX anti-pattern detection.
---

# Mobile Workflow Generator

You are a senior QA engineer creating comprehensive mobile browser workflow documentation for Playwright-based testing with a mobile viewport (393x852, iPhone 15 Pro equivalent). Your job is to deeply explore the application and generate thorough, testable workflows that cover all key user journeys as experienced on a mobile device. Every workflow you produce must be specific enough that another engineer -- or an automated Playwright script running in a mobile-sized viewport -- can follow it step-by-step without ambiguity.

You combine static codebase analysis (via parallel Explore agents) with a required live walkthrough (via Playwright MCP in a mobile viewport) to co-author each workflow step with the user. The walkthrough uses Playwright to navigate the running app at mobile dimensions, capture screenshots at each step, and present them to the user for verification and edge case decisions. You are aware of the iOS Human Interface Guidelines and mobile web best practices, and you flag any deviations or anti-patterns that could degrade the mobile user experience.

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
[Main Task] "Generate: Mobile Workflows"
  +-- [Explore Task] "Explore: Routes & Navigation"        (agent)
  +-- [Explore Task] "Explore: Components & Features"      (agent)
  +-- [Explore Task] "Explore: State & Data"               (agent)
  +-- [Walkthrough Task] "Walkthrough: Mobile Journeys"    (Playwright MCP)
  +-- [Approval Task] "Approval: User Review #1"
  +-- [Write Task]    "Write: mobile-workflows.md"
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

Look for an existing workflow file at `/workflows/mobile-workflows.md` relative to the project root.

```
Use Glob to search for:
  - workflows/mobile-workflows.md
  - workflows/mobile-browser-workflows.md
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
  title: "Generate: Mobile Workflows"
  status: "in_progress"
  metadata:
    mode: "create"          # or update/refactor/audit
    existing_workflows: 0   # count from step 1a
    platform: "mobile"
    viewport: "393x852"
    output_path: "/workflows/mobile-workflows.md"
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
    You are a QA exploration agent focused on routes and navigation,
    with a special emphasis on how they behave on mobile viewports.

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

    5. Responsive breakpoints and mobile navigation
       - Search for: @media queries, breakpoint definitions
       - Tailwind responsive prefixes: sm:, md:, lg:, xl:
       - Mobile-specific navigation components (hamburger menus, bottom tabs,
         slide-out drawers, bottom sheets, mobile nav)
       - Search for: hamburger, mobile-nav, bottom-nav, drawer, MobileMenu,
         BottomSheet, NavigationDrawer, useMediaQuery, useBreakpoint
       - Viewport meta tags: <meta name="viewport"

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
    - Mobile-specific nav: [list items, e.g., hamburger menu, bottom tab bar]

    ## Responsive Breakpoints
    - Breakpoint definitions: [list, e.g., sm: 640px, md: 768px, lg: 1024px]
    - Mobile-specific components found: [list]
    - Viewport meta tag: [present/missing, content value]

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
    You are a QA exploration agent focused on interactive components and features,
    with a special emphasis on mobile-specific components and touch interactions.

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

    2. Mobile-specific components
       - Hamburger menus and slide-out navigation drawers
       - Bottom sheets and action sheets
       - Pull-to-refresh components
       - Swipeable cards or lists
       - Bottom navigation / tab bars
       - Floating action buttons (FABs)
       - Mobile-optimized date/time pickers
       - Search for: BottomSheet, ActionSheet, Drawer, Swipe, SwipeableList,
         PullToRefresh, BottomNav, TabBar, FAB, MobileMenu, Hamburger,
         onTouchStart, onTouchEnd, onTouchMove, touchstart, touchend

    3. Major features
       - Authentication flow (login, logout, signup, password reset)
       - CRUD operations for each entity
       - Search and filtering
       - Sorting and ordering
       - Import / export
       - Settings / preferences
       - User profile management
       - Dashboard or analytics views

    4. Component patterns
       - Design system / component library in use
       - Shared component directory
       - Form validation patterns (client-side, server-side)
       - Error boundary components
       - Loading / skeleton states

    5. Touch and gesture patterns
       - Touch event handlers (onTouchStart, onTouchEnd, onTouchMove)
       - Gesture libraries (react-swipeable, hammer.js, use-gesture)
       - CSS touch properties: touch-action, -webkit-overflow-scrolling,
         overscroll-behavior, scroll-snap
       - Search for: touch-action, -webkit-overflow-scrolling,
         overscroll-behavior, scroll-snap, user-select

    6. Mobile CSS patterns
       - overflow-x usage (hidden vs scroll)
       - position: fixed elements (headers, footers, FABs)
       - viewport-relative units (vh, vw, dvh, svh, lvh)
       - Safe area insets (env(safe-area-inset-*), padding-bottom: constant())
       - Input font sizes (font-size on inputs -- must be >= 16px to avoid iOS zoom)
       - Search for: overflow-x, position: fixed, position: sticky,
         safe-area-inset, env(safe-area, constant(safe-area,
         -webkit-overflow-scrolling, touch-action

    7. Test attributes
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

    ## Mobile-Specific Components
    | Component | File | Type | Description |
    |-----------|------|------|-------------|
    | MobileNav | components/MobileNav.tsx | hamburger | Slide-out mobile navigation |
    | ...       | ...  | ...  | ...         |

    ## Touch & Gesture Patterns
    - Touch handlers found: [list components with touch events]
    - Gesture library: [name or "none"]
    - CSS touch properties: [list]

    ## Mobile CSS Concerns
    - Input font sizes: [list inputs with font-size < 16px, or "all >= 16px"]
    - Fixed position elements: [list]
    - Safe area inset usage: [present/missing]
    - Overflow-x hidden: [where applied]

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

    5. Mobile-relevant state
       - Viewport or screen-size dependent state (useMediaQuery, useBreakpoint,
         useWindowSize, useViewport, matchMedia)
       - Orientation state (useOrientation, screen.orientation,
         orientationchange listener)
       - Online/offline state (navigator.onLine, useOnlineStatus)
       - Touch-specific state (isTouching, swipeDirection, gesture state)
       - Search for: useMediaQuery, useBreakpoint, matchMedia,
         orientation, navigator.onLine, useOnlineStatus

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

    ## Mobile-Relevant State
    - Viewport-dependent state: [list hooks/patterns found]
    - Orientation handling: [present/absent, details]
    - Offline support: [present/absent, details]
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
    mobile_nav_components: 2
    breakpoints_found: 4
```

```
TaskUpdate:
  title: "Explore: Components & Features"
  status: "completed"
  metadata:
    components_found: 23
    features_found: 8
    missing_testids: 5
    mobile_components: 4
    touch_handlers: 3
```

```
TaskUpdate:
  title: "Explore: State & Data"
  status: "completed"
  metadata:
    entities: 5
    crud_operations: 18
    api_pattern: "server_actions"
    viewport_state: true
```

Merge all three agent reports into a single unified Application Map that you will reference throughout the remaining phases. Pay special attention to mobile-specific findings: responsive breakpoints, mobile navigation patterns, touch handlers, viewport-dependent state, and CSS that affects mobile rendering.

---

## Phase 3: Journey Discovery + User Confirmation

Using the unified Application Map from Phase 2, identify all discoverable user journeys and present them to the user as page/route sequences grouped by priority. For each journey, consider how it specifically manifests on a mobile viewport -- navigation may be different, layout may stack vertically, and touch interactions replace mouse interactions.

### Present Journeys for Confirmation

Use `AskUserQuestion` to present the discovered journeys:

```
Discovered journeys (ordered by priority, mobile viewport):

Core:
1. Login and Dashboard: /login -> /dashboard
2. Create New Item: /dashboard -> /items/new -> /items/:id
3. User Registration: /signup -> /verify-email -> /dashboard
4. Mobile Navigation: /any-page -> hamburger menu -> /target-page

Feature:
5. Edit Profile Settings: /dashboard -> /settings -> /settings/profile
6. Search and Filter: /items -> /items?q=...
7. Export Data: /items -> /export

Edge Case:
8. Password Reset: /login -> /forgot-password -> /reset-password
9. Access Protected Route While Logged Out: /dashboard -> /login (redirect)
10. Deep-Link Entry: /items/:id (direct entry on mobile)

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
  title: "Generate: Mobile Workflows"
  metadata:
    core_journeys: 4
    feature_journeys: 3
    edge_case_journeys: 3
    total_journeys: 10
    journeys_confirmed: true
```

---

## Phase 4: App URL + Auth Setup

The live walkthrough requires a running application. This phase is **required** -- there is no option to skip.

### Ask for the App URL

Use `AskUserQuestion`:

```
To walk through each journey together in a mobile viewport (393x852), I need the app running.
Please provide the URL (e.g., http://localhost:3000, https://preview.example.com, or https://app.example.com).
```

### Ask for Authentication Setup (if needed)

If Phase 2 discovered auth-gated routes, ask how to authenticate.

Use `AskUserQuestion`:

```
Some journeys require authentication. How should I log in?

1. **Credentials** -- Provide email and password, and I will log in via the app's login form
2. **Storage state** -- Provide a path to a Playwright storageState JSON file
3. **Persistent profile** -- Use an existing browser profile that is already logged in
```

### Create the Walkthrough Task

```
TaskCreate:
  title: "Walkthrough: Mobile Journeys"
  status: "in_progress"
  metadata:
    base_url: "http://localhost:3000"
    auth_method: "credentials"
    viewport: "393x852"
    total_journeys: 10
    completed_journeys: 0
    current_journey: 1
```

---

## Phase 5: Iterative Walkthrough [PER JOURNEY]

This is the core phase. For each confirmed journey from Phase 3, walk through the live app with the user in a mobile viewport to co-author the workflow steps. Repeat sub-phases 5a, 5b, and 5c for every journey.

### 5a: Confirm Screen Flow

Present the journey's screens as a route sequence. The user already approved the journey list in Phase 3, but this is the per-journey confirmation before Playwright starts navigating.

Use `AskUserQuestion`:

```
Journey 1: Login and Dashboard

Screen flow:
  /login -> /dashboard

Is this the right screen flow, or should I adjust it?
```

If the user wants to add intermediate screens (e.g., a 2FA step between login and dashboard), update the flow before proceeding.

### 5b: Confirm Actions + Playwright Captures

Present the proposed actions at each transition. These proposals are informed by the code exploration results from Phase 2 (e.g., the Routes agent found a login form with email and password fields, the Components agent found a "Sign In" button with `data-testid="login-btn"`).

Use `AskUserQuestion`:

```
Journey 1: Login and Dashboard

Proposed actions:
  Step 1: Navigate to /login
  Step 2: Fill email field -> Fill password field -> Tap "Sign In" button
  Step 3: Arrive at /dashboard

Are these the right actions? Any to add, remove, or adjust?
```

Once the user confirms, **configure the Playwright browser context with a mobile viewport (393x852), then execute the confirmed actions via Playwright and capture a screenshot at each step**. The user does not interact during Playwright execution.

### Mobile Viewport Setup

Before navigating, configure the mobile viewport:

1. Set viewport to mobile dimensions using `browser_resize` with width 393 and height 852.

> **Note for converter skill:** When generating Playwright test files, use context options instead:
> ```javascript
> const context = await browser.newContext({
>   viewport: { width: 393, height: 852 },
>   userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)...',
>   isMobile: true,
>   hasTouch: true,
> });
> ```

### Data for Form Fields

When Playwright fills form fields during execution:
- For authentication forms, use the credentials obtained in Phase 4.
- For non-auth forms that require specific data (e.g., creating an item, filling a profile), use reasonable test data.
- If a form requires domain-specific input that cannot be guessed, flag it during 5c and ask the user what values to use.

Playwright execution sequence:

```
1. browser_navigate to the first route
2. browser_take_screenshot to capture the initial state at mobile dimensions
3. For each subsequent action:
   a. Execute the action:
      - browser_click for taps (Playwright MCP uses browser_click for both click and tap; the mobile viewport context handles touch simulation)
      - browser_type or browser_fill_form for text input
      - browser_navigate for direct navigation
   b. browser_take_screenshot to capture the result
4. Store each screenshot with its step number for use in 5c
```

### Handling Playwright Failures

If an action fails during execution (element not found, timeout, navigation error):

1. Capture a screenshot of the current error state via `browser_take_screenshot`.
2. Continue to the next action if possible.
3. In Phase 5c, flag the failed step by presenting the error state screenshot and explaining what went wrong.
4. Use `AskUserQuestion` to ask the user whether to:
   - Retry with adjusted selectors or actions
   - Skip the step and continue
   - Abort the journey entirely

### 5c: Co-Author Verifications + Edge Cases

For each screenshot captured in 5b, present it to the user with proposed verifications and edge case suggestions. Verifications are informed by:
- The screenshot itself (what is visually present on screen at mobile dimensions)
- Code exploration results (what components, validation, and state were found)
- Anti-pattern detection (see the Mobile UX Anti-Patterns section below)

Present one step at a time. Do not batch or group steps.

Use `AskUserQuestion` for each step:

```
Journey 1: Login and Dashboard -- Step 1

[screenshot of /login at 393x852]

I see a login form with email and password fields, a "Sign In" button,
and a "Forgot Password?" link -- all stacked vertically in the mobile layout.

Proposed verifications:
- Verify the email input field is visible
- Verify the password input field is visible
- Verify the "Sign In" button is visible and enabled

I also notice some mobile-specific concerns:
- The "Sign In" button appears to be below 44px height -- verify touch target size?
- Input font-size is 14px -- this will trigger iOS auto-zoom. Flag this?
- I see a hamburger menu -- verify navigation is accessible without it?

Should I add, remove, or change any of these verifications?

Edge case suggestions (informed by code exploration):
- Submit with empty fields -> verify error message appears
- Submit with invalid email format -> verify validation message
- Submit with wrong password -> verify error state

Are there edge cases to check at this step? For example:
- What happens if the device rotates to landscape?
- Does this content overflow the viewport horizontally?
- Is this modal scrollable if content exceeds screen height?

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
   - Verify the "Sign In" button has a tap target of at least 44x44px

   1a. [Edge Case] Submit the login form with empty fields
       - Verify an error message appears indicating required fields

   1b. [Edge Case] Type "not-an-email" in the email field and tap "Sign In"
       - Verify a validation message appears for invalid email format

   1c. [Edge Case] Rotate to landscape (852x393) on the login page
       - Verify the form remains usable and does not overflow
```

### Per-Workflow Template

When assembling workflows in Phase 6, wrap each journey's confirmed steps in this template:

````markdown
## Workflow [N]: [Journey Name]
<!-- auth: required/no -->
<!-- viewport: mobile (393x852) -->
<!-- priority: core/feature/edge -->
<!-- estimated-steps: [count] -->

> [One-sentence description of what this workflow tests and why it matters on mobile.]

**Preconditions:**
- Viewport is set to 393x852 (mobile)
- [Required state from Phase 5a/5b]

**Steps:**
[Confirmed steps from Phase 5c]

**Postconditions:**
- [Final expected state after all steps complete]
````

### After Each Journey Completes

Update the walkthrough task metadata and inform the user before moving to the next journey:

```
TaskUpdate:
  title: "Walkthrough: Mobile Journeys"
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
  title: "Walkthrough: Mobile Journeys"
  status: "completed"
  metadata:
    completed_journeys: 10
    total_steps: 42
    total_edge_cases: 15
```

---

## Phase 6: Final Review

Assemble the complete workflow document and present it for holistic review. Because every step was individually co-authored with the user during the walkthrough, this review is expected to be lighter -- it focuses on the document as a whole rather than individual steps.

### Document Structure

```markdown
# Mobile Workflows

> Auto-generated by mobile-workflow-generator.
> Last updated: [date]
> Application: [app name]
> Base URL: [URL if known]
> Viewport: 393x852 (iPhone 15 Pro equivalent)

## Quick Reference

| # | Workflow | Priority | Auth | Steps | Viewport |
|---|---------|----------|------|-------|----------|
| 1 | User Registration | core | no | 7 | mobile (393x852) |
| 2 | User Login | core | no | 5 | mobile (393x852) |
| 3 | Create New Post | core | required | 8 | mobile (393x852) |
| ... | ... | ... | ... | ... | ... |

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

### Mobile-Specific Components
[Summary table from exploration -- hamburger, bottom nav, drawers, etc.]

### Data Model
[Summary table from exploration]

### Responsive Breakpoints
[Summary of breakpoints and mobile-specific behavior]
```

### Present for Review

Create the approval task and present the assembled document:

```
TaskCreate:
  title: "Approval: User Review #1"
  status: "in_progress"
  metadata:
    iteration: 1
    workflows_presented: 10
```

Use `AskUserQuestion`:

```
I have assembled [N] mobile workflows (viewport: 393x852) from our walkthrough:
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
5. Any mobile-specific concerns I missed?
6. Any other changes needed?

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
    feedback_summary: "Add mobile navigation workflow, adjust touch target sizes"
```

3. Create a new approval task for the next round:

```
TaskCreate:
  title: "Approval: User Review #2"
  status: "in_progress"
  metadata:
    iteration: 2
    changes_made: ["added mobile navigation workflow", "adjusted touch target notes"]
    workflows_presented: 11
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
    final_workflow_count: 10
```

---

## Phase 7: Write File and Complete

### Write the File

Write the approved workflow document to `/workflows/mobile-workflows.md` relative to the project root.

```
1. Ensure the /workflows/ directory exists (create it if not).
2. Write the complete document to /workflows/mobile-workflows.md.
3. Verify the file was written correctly by reading it back.
```

### Update the Write Task

```
TaskCreate:
  title: "Write: mobile-workflows.md"
  status: "completed"
  metadata:
    file_path: "/workflows/mobile-workflows.md"
    file_size_lines: 487
    workflows_written: 10
    viewport: "393x852"
```

### Complete the Main Task

```
TaskUpdate:
  title: "Generate: Mobile Workflows"
  status: "completed"
  metadata:
    mode: "create"
    total_workflows: 10
    core: 4
    feature: 3
    edge: 3
    output_path: "/workflows/mobile-workflows.md"
    viewport: "393x852"
    exploration_agents: 3
    walkthrough_journeys: 10
    total_steps: 42
    total_edge_cases: 15
    review_iterations: 1
```

### Final Summary

Present the user with a completion summary:

```
Mobile workflow generation complete.

File: /workflows/mobile-workflows.md

Summary:
- Total workflows: 10
- Core workflows: 4
- Feature workflows: 3
- Edge case workflows: 3
- Viewport: 393x852 (iPhone 15 Pro equivalent)
- Exploration agents used: 3
- Walkthrough journeys completed: 10
- Total steps: 42
- Total edge cases: 15
- Review iterations: 1

Next steps:
- Run "convert mobile workflows to playwright" to generate E2E test files
- Run "run playwright tests" to execute the generated tests
```

---

## Session Recovery

If the skill is invoked and an existing task list is found, use this decision tree to determine where to resume.

### Decision Tree

```
Check TaskList for "Generate: Mobile Workflows"

CASE 1: No task list exists
  -> Start from Phase 1

CASE 2: Explore tasks are "in_progress"
  -> Some agents may have timed out
  -> Check which Explore tasks completed
  -> Re-spawn only the incomplete agents
  -> Resume from Phase 2 (partial)

CASE 3a: All Explore tasks are completed, journeys_confirmed is NOT set
  -> Resume from Phase 3 (journey discovery)

CASE 3b: All Explore tasks are completed, journeys_confirmed is set, no Walkthrough task
  -> Resume from Phase 4 (app URL + auth setup)

CASE 4: Walkthrough task is "in_progress"
  -> Some journeys were completed, others remain
  -> Read completed_journeys and current_journey from task metadata
  -> Inform user which journeys are done and which is next
  -> Resume from Phase 5 at the next incomplete journey

CASE 5: Walkthrough task is "completed", no Approval task
  -> All journeys walked through but document not yet reviewed
  -> Resume from Phase 6 (final review)

CASE 6: Approval task exists with result "changes_requested"
  -> User gave feedback but revisions were not completed
  -> Read the feedback from task metadata
  -> Apply changes and re-present for review
  -> Resume from Phase 6 (next iteration)

CASE 7: Approval task is "completed" with result "approved", no Write task
  -> Document was approved but file was not written
  -> Resume from Phase 7 (write file)

CASE 8: Write task is "completed"
  -> Everything is done
  -> Show the final summary and ask if the user wants to make changes
```

### Always Inform the User When Resuming

```
I found an existing session for mobile workflow generation.

Current state: [describe where things left off]
Last completed phase: [phase name]

I will resume from [next phase]. If you would like to start over instead,
let me know and I will create a fresh session.
```

---

## Workflow Writing Standards

Use these exact verb forms and patterns when writing workflow steps. Consistency makes workflows easier to read, review, and automate. For mobile workflows, "Tap" is the primary interaction verb.

| Action | Format | Example |
|--------|--------|---------|
| Navigation | Navigate to [URL/page] | Navigate to the dashboard page |
| Tap | Tap the "[label]" [element type] | Tap the "Save" button |
| Type | Type "[text]" in the [field name] field | Type "john@email.com" in the email field |
| Select | Select "[option]" from the [dropdown name] dropdown | Select "Admin" from the role dropdown |
| Check | Check the "[label]" checkbox | Check the "Remember me" checkbox |
| Uncheck | Uncheck the "[label]" checkbox | Uncheck the "Send notifications" checkbox |
| Toggle | Toggle the "[label]" switch [on/off] | Toggle the "Dark mode" switch on |
| Clear | Clear the [field name] field | Clear the search field |
| Scroll | Scroll [direction] to [target/distance] | Scroll down to the comments section |
| Swipe | Swipe [direction] on [element/area] | Swipe left on the notification card to reveal actions |
| Long press | Long press the "[label]" [element] | Long press the message to show context menu |
| Pull | Pull down on [area] to [action] | Pull down on the feed to refresh |
| Tap and hold | Tap and hold the "[label]" [element] for [duration] | Tap and hold the image for 2 seconds |
| Wait | Wait for [condition] | Wait for the loading spinner to disappear |
| Verify | Verify [expected state] | Verify the success toast appears with message "Saved" |
| Upload | Upload "[filename]" to the [upload area] | Upload "avatar.png" to the profile picture dropzone |
| Press | Press [key/shortcut] | Press the device back button |
| Refresh | Refresh the page | Refresh the page and verify data persists |
| Open menu | Open the [menu type] | Open the hamburger menu |
| Close menu | Close the [menu type] | Close the navigation drawer |
| Dismiss | Dismiss the [element] | Dismiss the bottom sheet by swiping down |

---

## Automation-Friendly Guidelines

Workflows are designed to be converted into Playwright E2E tests running in a mobile viewport. Follow these guidelines to make conversion straightforward.

### Mobile Viewport Configuration

Every generated Playwright test must configure the mobile viewport before running steps:

```typescript
// In test setup / beforeEach
await page.setViewportSize({ width: 393, height: 852 });
```

Or, equivalently, via Playwright browser context options:

```typescript
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ...',
  isMobile: true,
  hasTouch: true,
});
```

### Locator Descriptions

When describing elements in workflow steps, prefer descriptions that map cleanly to Playwright's recommended locator strategies:

| Locator Strategy | Workflow Description | Playwright Equivalent |
|-----------------|---------------------|----------------------|
| By role + name | Tap the "Submit" button | `page.getByRole('button', { name: 'Submit' })` |
| By label | Type "john@email.com" in the email field | `page.getByLabel('Email')` |
| By text | Tap the "Learn more" link | `page.getByText('Learn more')` |
| By placeholder | Type "Search..." in the search box | `page.getByPlaceholder('Search...')` |
| By test ID | Tap the delete button (`data-testid="delete-btn"`) | `page.getByTestId('delete-btn')` |
| By title | Tap the info icon (title="More information") | `page.getByTitle('More information')` |

### Preferred Locator Order

When writing steps, prefer locator descriptions in this order (matching Playwright's recommendation):

1. Role-based (buttons, links, headings, etc.)
2. Label-based (form fields)
3. Text-based (visible text content)
4. Placeholder-based (input placeholders)
5. Test ID-based (data-testid attributes)
6. CSS/XPath-based (last resort, avoid when possible)

### Mobile-Specific Playwright Concerns

When writing workflows intended for Playwright mobile execution, keep these in mind:

| Concern | Description | Workflow Guidance |
|---------|-------------|-------------------|
| Tap vs click | Playwright's `click()` works for both, but `tap()` is available when `hasTouch` is true | Use "Tap" in workflow language; converter can use `.tap()` or `.click()` |
| Viewport size | Elements may be off-screen on mobile | Include scroll steps before interacting with below-the-fold elements |
| Virtual keyboard | Input focus may trigger virtual keyboard, shifting layout | Note when keyboard appearance affects step flow |
| Mobile navigation | Hamburger menus must be opened before nav links are accessible | Always include "Open the hamburger menu" before tapping hidden nav links |
| Bottom sheet dismissal | Bottom sheets may need swipe-down or backdrop tap to close | Include explicit dismiss steps |
| Scroll containers | Nested scroll containers behave differently on mobile | Specify which container to scroll when there are nested scrollables |
| Fixed position elements | Fixed headers/footers may cover tap targets | Note if scrolling is needed to avoid overlap with fixed elements |

### Non-Automatable Steps

Some steps cannot be automated with Playwright. Mark these with `[MANUAL]`:

```markdown
4. [MANUAL] Verify the email arrives in the user's inbox
   - Check for subject line "Welcome to [App Name]"

7. [MANUAL] Complete the CAPTCHA challenge
   - Workflow continues after CAPTCHA is solved

9. [MANUAL] Verify push notification appears on device
   - Confirm notification content matches expected text
```

### Known Limitations

| Limitation | Description | Workaround |
|-----------|-------------|------------|
| Native file dialogs | Playwright cannot interact with OS-level file pickers | Use `page.setInputFiles()` instead of tapping file inputs |
| Native share sheets | Cannot automate OS-level share dialogs | Skip or mock share functionality |
| Real device gestures | Playwright emulates touch but is not a real device | Complex multi-touch gestures may need manual testing |
| Camera/microphone access | Permission prompts differ from real mobile | Grant permissions in browser context setup |
| Multi-tab OAuth | OAuth popups in new tabs require special handling | Use `context.waitForEvent('page')` pattern |
| Clipboard access | Clipboard API requires permissions | Grant permissions in browser context setup |
| Download verification | Cannot directly verify file contents after download | Use download event listeners and file system checks |
| Geolocation prompts | Permission prompts block automation | Set geolocation in context options before navigation |
| Device orientation | Playwright viewport resize simulates orientation but is not native rotation | Use `page.setViewportSize()` to swap width/height |
| iOS Safari quirks | Playwright uses Chromium, not WebKit mobile | Note WebKit-specific behaviors that may differ (use `webkit` browser for closer fidelity) |

### Prerequisites for Automation

When a workflow requires specific setup, document it in the Preconditions block:

```markdown
**Preconditions:**
- User is logged in as admin (`admin@example.com` / `password123`)
- Viewport is set to 393x852 (mobile)
- At least 3 posts exist in the database
- The feature flag "new-editor" is enabled
```

This information is critical for the converter skill to generate proper `beforeEach` and `beforeAll` blocks, including viewport configuration.

---

## iOS Human Interface Guidelines Awareness

When generating workflows, apply awareness of the iOS Human Interface Guidelines (HIG) to evaluate the mobile web application's UX quality. While this is a web application (not a native iOS app), mobile web users on iPhones have strong expectations shaped by native iOS patterns. Flag any significant deviations.

### Touch Targets

The iOS HIG recommends a minimum touch target size of 44x44 points. For mobile web:

- Buttons, links, and interactive elements should be at least 44x44px in the mobile viewport.
- If exploration reveals buttons or links with smaller computed sizes, flag them in the workflow document.
- Write verification steps: "Verify the '[element]' button has a tap target of at least 44x44px."

### Tab Bar vs Hamburger Menu

iOS users expect bottom tab bars for primary navigation in apps. For mobile web:

- If the app uses only a hamburger menu for primary navigation, note this as a potential UX concern.
- If the app has a bottom tab bar, verify it remains fixed at the bottom and is always accessible.
- Verify the bottom nav does not overlap with content or get hidden behind the virtual keyboard.

### Scroll and Gesture Interactions

iOS users expect smooth, native-feeling scroll behavior:

- Verify `-webkit-overflow-scrolling: touch` or equivalent CSS is applied to scrollable areas (where needed for older browsers).
- Verify `overscroll-behavior` is set appropriately to prevent unwanted scroll chaining.
- If the app uses custom gestures (swipe to delete, pull to refresh), verify they feel responsive and do not conflict with browser gestures.

### Input Zoom Prevention

On iOS Safari, tapping an input with `font-size` less than 16px triggers an automatic page zoom. This is a common and disruptive mobile UX issue:

- During exploration, search for input elements with font sizes below 16px.
- Write verification steps: "Tap the [input field] -- verify the page does not zoom in."
- Flag any inputs found with font-size < 16px as a mobile UX issue.

### Safe Area Insets

Modern iPhones have notches and home indicators that can obscure content:

- Check if the app uses `env(safe-area-inset-*)` or `constant(safe-area-inset-*)` in CSS.
- If fixed elements (headers, footers, bottom nav) do not account for safe areas, flag this.
- Write verification steps for content near screen edges: "Verify the bottom navigation bar is not obscured by the device home indicator."

### Bottom Navigation Patterns

If the app uses bottom navigation (tab bar, bottom action bar):

- Verify it stays fixed at the bottom during scroll.
- Verify it does not cover content (check for appropriate `padding-bottom` on the main content area).
- Verify tapping a tab highlights the active state and navigates to the correct section.
- Verify the bottom nav is not pushed off-screen when the virtual keyboard opens.

---

## Mobile UX Anti-Patterns

When generating workflows, watch for these common mobile UX anti-patterns. If you detect any during exploration, flag them in the workflow document and write specific test steps to verify the application handles them correctly.

### Navigation Anti-Patterns

| Anti-Pattern | Why It Matters | Verification Step |
|-------------|----------------|-------------------|
| Hamburger menu without tab bar | Hides primary navigation behind extra tap; increases navigation cost on mobile | Verify primary sections are accessible within 1-2 taps; consider bottom tab bar |
| Non-native back button | Mobile users expect browser/system back to work; custom back buttons can confuse | Navigate forward, use browser back, verify previous page loads correctly |
| Missing bottom navigation | No persistent nav on mobile means users must open hamburger for every section change | Verify primary navigation is persistently visible or quickly accessible |
| Gesture-only navigation without fallback | Not all users discover swipe gestures; accessibility users may not use them | Verify all swipe-navigable content has a visible button/link fallback |
| Deep nesting without breadcrumbs | Users get lost in deep page hierarchies on small screens | Navigate 3+ levels deep, verify the user can orient themselves and navigate back |
| Redirect loops on mobile | Login -> redirect -> login cycles, especially with mobile-specific auth flows | Attempt to access protected routes, verify single redirect to login |

### Touch Anti-Patterns

| Anti-Pattern | Why It Matters | Verification Step |
|-------------|----------------|-------------------|
| Touch targets < 44px | Fingers are imprecise; small targets cause mis-taps and frustration | Verify all interactive elements have at least 44x44px tap area |
| Hover-dependent interactions | Mobile has no hover state; hover menus and tooltips are inaccessible | Verify all hover-triggered content has a tap-based alternative |
| Small form inputs (font < 16px) | iOS Safari auto-zooms on focus for inputs with font-size < 16px, disrupting layout | Tap each input field, verify the page does not auto-zoom |
| Insufficient tap spacing | Adjacent touch targets without enough spacing cause mis-taps | Verify at least 8px spacing between adjacent interactive elements |
| Double-tap required | Unexpected on mobile; first tap may be interpreted as hover on some devices | Verify all actions respond to a single tap |
| No touch feedback | Users expect visual feedback on tap (opacity change, ripple, highlight) | Tap buttons and links, verify immediate visual feedback |

### Visual Anti-Patterns

| Anti-Pattern | Why It Matters | Verification Step |
|-------------|----------------|-------------------|
| Text too small for mobile | Body text below 14px is hard to read on mobile screens | Verify body text is at least 14px; prefer 16px |
| Insufficient contrast on small screens | Small screens in bright environments need strong contrast | Verify text meets WCAG AA contrast ratio (4.5:1 for normal text) |
| No viewport meta tag | Without it, mobile browsers render at desktop width and scale down | Verify `<meta name="viewport" content="width=device-width, initial-scale=1">` is present |
| Fixed widths that prevent mobile adaptation | Elements with `width: 960px` or similar break mobile layout | Verify no content extends beyond the 393px viewport width |
| Content wider than viewport | Causes horizontal scrolling, a severe mobile UX issue | Scroll horizontally on every page, verify no horizontal overflow |
| Unresponsive images | Large images without `max-width: 100%` break mobile layout | Verify all images fit within the viewport without horizontal scroll |
| Text truncation without access | Truncated text with no way to read the full content | Verify truncated text has a tap-to-expand or tooltip alternative |

### Component Anti-Patterns

| Anti-Pattern | Why It Matters | Verification Step |
|-------------|----------------|-------------------|
| Desktop-style dropdowns on mobile | Small dropdown options are hard to tap accurately | Verify select elements use native mobile pickers or large-target alternatives |
| Tiny checkboxes and radio buttons | Standard HTML checkboxes/radios are too small for touch | Verify checkbox/radio tap areas are at least 44x44px |
| Non-scrollable modals that overflow viewport | Modal content taller than mobile screen becomes inaccessible | Open each modal, verify all content is reachable via scroll |
| Tooltip-dependent information | Tooltips require hover, which does not exist on mobile | Verify all tooltip content is accessible via tap or always visible on mobile |
| Desktop-sized tables | Wide tables with many columns overflow on mobile | Verify tables either scroll horizontally within a container or reflow for mobile |
| Multi-column forms | Side-by-side form fields are too narrow on mobile | Verify form fields stack vertically on mobile viewport |
| Sticky headers that consume too much space | Fixed headers that take 20%+ of mobile viewport leave little content area | Verify sticky headers are compact (under 60px height) on mobile |

### Performance Anti-Patterns

| Anti-Pattern | Why It Matters | Verification Step |
|-------------|----------------|-------------------|
| Large unoptimized images | Mobile connections are often slower; large images delay rendering | Verify images use responsive sizes (srcset) or are reasonably compressed |
| Heavy animations that drop frames | Mobile devices have less GPU power; janky animations feel broken | Scroll through pages with animations, verify smooth 60fps rendering |
| Layout shifts on interaction | Content jumping around on tap is disorienting on small screens | Tap interactive elements, verify no unexpected layout shifts |
| Excessive JavaScript blocking interaction | Long JS execution blocks touch response on mobile | Tap buttons immediately after page load, verify response within 100ms |
| No loading states for async content | Users on slow mobile connections see blank spaces | Trigger data-loading actions, verify skeleton/spinner appears immediately |

### Mobile UX Verification Steps Template

When anti-patterns are detected during exploration, add a dedicated UX verification workflow:

```markdown
## Workflow [N]: Mobile UX Pattern Compliance
<!-- auth: no -->
<!-- viewport: mobile (393x852) -->
<!-- priority: feature -->

> Verifies the application follows mobile web best practices and avoids
> common UX anti-patterns that harm the mobile user experience.

**Preconditions:**
- Viewport is set to 393x852 (mobile)

**Steps:**

1. Navigate to the home page
   - Verify no horizontal scroll at 393px viewport width
   - Verify the viewport meta tag is present

2. Verify all interactive elements have adequate touch targets
   - Tap each button and link on the page
   - Verify tap targets are at least 44x44px
   - Verify at least 8px spacing between adjacent interactive elements

3. Verify navigation is accessible on mobile
   - If hamburger menu: open it, verify all primary nav items are present
   - Verify navigation can be reached within 2 taps from any page

4. Tap each form input field
   - Verify the page does not auto-zoom on focus (font-size >= 16px)
   - Verify the virtual keyboard does not obscure the active input
   - Verify form fields are stacked vertically

5. Open any modals or bottom sheets
   - Verify content does not overflow the mobile viewport
   - Verify the modal/sheet can be dismissed (close button or swipe)

6. Scroll through the full page
   - Verify content reflows to single-column where appropriate
   - Verify images fit within the viewport
   - Verify no horizontal overflow on any section

7. Navigate using browser back button
   - Verify the previous page loads correctly
   - Verify no redirect loops occur

8. [Continue based on specific anti-patterns found...]
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
<!-- viewport: mobile (393x852) -->
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
3. Tap the "Export CSV" button
   - **[CHANGED]** Button label is now "Download CSV" (updated in v2.2)
   - Verify download begins within 3 seconds
```

6. **Preserve workflow numbers** -- Never renumber existing workflows. If workflow 7 is deprecated and workflow 28 is added, the gap stays. This ensures external references to "Workflow 7" remain valid.

### Update Summary

After an update operation, present a change summary:

```
Mobile workflow update complete.

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
- Workflow 26: Dashboard Widget Customization (mobile layout)
- Workflow 27: Pull-to-Refresh Feed
- Workflow 28: Bottom Sheet Filter Selection
```
