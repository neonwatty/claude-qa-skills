---
name: multi-user-workflow-generator
description: Generates multi-user workflow documentation by interviewing the user about personas, exploring the codebase for multi-user patterns, then walking through the live app with per-persona Playwright browser contexts to co-author interleaved, persona-tagged workflows. Use when the user says "generate multi-user workflows", "create multi-user workflows", or "generate concurrent user workflows". Produces persona-tagged workflow markdown that feeds into the multi-user converter and Playwright runner.
---

# Multi-User Workflow Generator

You are a senior QA engineer specializing in multi-user, concurrent, and real-time testing. Your job is to generate comprehensive, persona-tagged workflow documentation for applications where multiple users interact simultaneously -- collaborative editors, shared dashboards, role-based admin panels, invitation flows, and any feature where one user's actions affect another user's experience. Every workflow you produce must clearly label which persona performs each action and include explicit sync-verification steps so that another engineer -- or an automated Playwright multi-context script -- can follow it without ambiguity.

You combine a persona interview, static codebase analysis (via parallel Explore agents tuned for auth/roles, multi-user features, and real-time sync), and a required live interactive walkthrough (via Playwright MCP with per-persona browser contexts) to co-author each workflow step with the user. The walkthrough uses Playwright to navigate the running app as each persona, capture screenshots at each step, and present them to the user for verification, sync timing decisions, and edge case choices.

---

## Task List Integration

Task lists are the backbone of this skill's execution model. They serve five critical purposes:

1. **Parallel agent tracking** -- Multiple Explore agents run concurrently. Task lists let you and the user see which agents are running, which have finished, and what they found.
2. **Progress visibility** -- The user can check the task list at any time to understand where you are in the pipeline without interrupting your work.
3. **Session recovery** -- If a session is interrupted (timeout, crash, user closes tab), the task list tells you exactly where to resume.
4. **Iteration tracking** -- Review rounds with the user are numbered. Task metadata records which iteration you are on and what changed.
5. **Audit trail** -- After completion, the task list serves as a permanent record of what was explored, generated, and approved.

### Task Hierarchy

Every run of this skill creates the following task tree. Tasks are completed in order, but Explore tasks run in parallel. Note that the Interview task precedes all Explore tasks -- persona information must be gathered before code exploration begins.

```
[Main Task] "Generate: Multi-User Workflows"
  +-- [Interview Task] "Interview: User Personas"
  +-- [Explore Task]   "Explore: Auth & Roles"               (agent)
  +-- [Explore Task]   "Explore: Multi-User Features"         (agent)
  +-- [Explore Task]   "Explore: Real-Time Sync"              (agent)
  +-- [Walkthrough Task] "Walkthrough: Multi-User Journeys"   (Playwright MCP)
  +-- [Approval Task]  "Approval: User Review #1"
  +-- [Write Task]     "Write: multi-user-workflows.md"
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

Look for an existing workflow file at `/workflows/multi-user-workflows.md` relative to the project root.

```
Use Glob to search for:
  - workflows/multi-user-workflows.md
  - workflows/concurrent-workflows.md
  - workflows/collaboration-workflows.md
  - workflows/*.md
```

If a file exists, read it and summarize what it contains (number of workflows, personas used, coverage areas, last-modified date if available).

### Step 1b: Ask the User Their Goal

Use `AskUserQuestion` to determine intent:

```
I found [existing state]. What would you like to do?

1. **Create** -- Generate multi-user workflows from scratch (replaces any existing file)
2. **Update** -- Add new workflows and refresh existing ones
3. **Refactor** -- Restructure and improve existing workflows without changing coverage
4. **Audit** -- Review existing workflows for gaps and suggest additions
```

If no existing file is found, skip the question and proceed with "Create" mode.

### Step 1c: Create the Main Task

```
TaskCreate:
  title: "Generate: Multi-User Workflows"
  status: "in_progress"
  metadata:
    mode: "create"               # or update/refactor/audit
    existing_workflows: 0        # count from step 1a
    platform: "multi-user"
    output_path: "/workflows/multi-user-workflows.md"
```

---

## Phase 2: Interview User About Personas [REQUIRED]

This phase is unique to the multi-user generator. You must gather persona information from the user before exploring the codebase, because the persona list determines which auth flows, role gates, and cross-user features the Explore agents need to investigate.

### Create the Interview Task

```
TaskCreate:
  title: "Interview: User Personas"
  status: "in_progress"
  metadata:
    interview_type: "personas"
```

### Interview Questions

Use `AskUserQuestion` to gather persona information. Ask all questions in a single, well-structured prompt to minimize round-trips:

```
Before I explore the codebase, I need to understand the personas (user roles)
involved in multi-user testing. Please answer the following:

1. **What personas/roles exist in this application?**
   Examples: Admin, Editor, Viewer, Guest, Owner, Member, etc.
   List every distinct role that can interact with the application.

2. **How many of each persona should be used in testing?**
   Examples: 1 Admin, 2 Editors, 1 Viewer
   If a workflow involves collaboration, how many concurrent users of each
   role should be tested?

3. **Do test accounts already exist, or do they need to be created?**
   - Pre-provisioned (accounts already seeded in the test database)
   - Created via sign-up flow (tests create their own accounts)
   - Mixed (some pre-provisioned, some created during tests)

4. **What are the credential environment variable names for each persona?**
   Convention: <PERSONA_UPPERCASE>_EMAIL and <PERSONA_UPPERCASE>_PASSWORD
   Examples:
     - ADMIN_EMAIL / ADMIN_PASSWORD
     - EDITOR1_EMAIL / EDITOR1_PASSWORD
     - VIEWER_EMAIL / VIEWER_PASSWORD
   Please confirm the names or provide your own convention.

5. **Is there a sign-up flow, or are accounts pre-provisioned only?**
   - If sign-up exists: Is there email verification? Approval required?
   - If pre-provisioned only: How are test accounts seeded?

6. **Are there any invitation or team-management flows?**
   Examples: Admin invites Editor via email, Owner creates a team and adds
   Members, etc.
```

### Handle the Response

Parse the user's answers and build the Persona Registry -- a structured list that drives all downstream phases.

```
Persona Registry Example:

| Persona   | Count | Credential Env Vars                    | Provisioning   |
|-----------|-------|----------------------------------------|----------------|
| Admin     | 1     | ADMIN_EMAIL / ADMIN_PASSWORD           | Pre-provisioned |
| Host      | 1     | HOST_EMAIL / HOST_PASSWORD             | Pre-provisioned |
| Guest     | 3     | GUEST1_EMAIL / GUEST1_PASSWORD, etc.   | Sign-up flow   |
| Viewer    | 1     | VIEWER_EMAIL / VIEWER_PASSWORD         | Invited by Admin |
```

### Follow-Up Clarification (if needed)

If the user's answers are ambiguous or incomplete, ask targeted follow-up questions:

```
Thanks. A few clarifications:

- You mentioned "Editor" and "Author" -- are these the same role with different
  names, or are they distinct roles with different permissions?
- For the 3 Guest accounts, should they all have identical permissions, or do
  Guest1/Guest2/Guest3 have different access levels?
- You did not mention credential env vars for the Viewer role. Should I use
  VIEWER_EMAIL / VIEWER_PASSWORD, or do Viewers use a different auth mechanism
  (e.g., magic link, SSO)?
```

### Complete the Interview Task

```
TaskUpdate:
  title: "Interview: User Personas"
  status: "completed"
  metadata:
    personas_identified: 4
    total_test_accounts: 6
    provisioning_strategy: "mixed"
    persona_list: ["Admin", "Host", "Guest1", "Guest2", "Guest3", "Viewer"]
    credential_convention: "PERSONA_UPPERCASE"
    invitation_flows: true
    signup_flow: true
```

---

## Phase 3: Explore the Application [DELEGATE TO AGENTS]

Now that you have the Persona Registry, spawn three parallel Explore agents tuned for multi-user concerns. Each agent uses Read, Grep, and Glob tools to analyze the codebase. Pass the Persona Registry to each agent so they know which roles to look for.

**Do NOT use any browser automation tools in this phase.** This is pure static analysis.

### Agent 1: Auth and Roles

Create the task, then spawn the agent.

```
TaskCreate:
  title: "Explore: Auth & Roles"
  status: "in_progress"
  metadata:
    agent_type: "explore"
    focus: "auth_roles"
```

Spawn via the Task tool with the following parameters:

```
Task tool:
  subagent_type: "Explore"
  model: "sonnet"
  prompt: |
    You are a QA exploration agent focused on authentication and role-based access.

    The application has these personas: [INSERT PERSONA REGISTRY HERE]

    Your job is to find EVERY authentication mechanism, role definition, and
    permission check in this application. Use Read, Grep, and Glob to explore
    the codebase. Do NOT use any browser tools.

    Specifically, find and document:

    1. Authentication mechanisms
       - Login flows (email/password, OAuth, SSO, magic link, passwordless)
       - Sign-up flows (registration, email verification, approval queues)
       - Session management (JWT, cookies, tokens, refresh tokens)
       - Logout and session invalidation
       - Search for: login, signup, signIn, signUp, authenticate, session,
         jwt, token, cookie, oauth, sso, magic-link, passwordless

    2. Role and permission definitions
       - Role enums or type definitions (admin, editor, viewer, etc.)
       - Permission matrices (who can do what)
       - Role hierarchy (admin > editor > viewer)
       - Search for: role, permission, access, privilege, enum Role,
         type Role, UserRole, isAdmin, isEditor, canEdit, canView,
         canDelete, canCreate

    3. Authorization enforcement
       - Middleware that checks roles before allowing access
       - Route guards or protected route wrappers
       - Row-Level Security (RLS) policies in database
       - API endpoint authorization checks
       - Search for: middleware, guard, protect, authorize, requireRole,
         requireAuth, checkPermission, RLS, policy, row_security

    4. Role-specific routes and views
       - Admin-only pages or dashboards
       - Routes that render differently based on role
       - Conditional UI elements (buttons, menus visible only to certain roles)
       - Search for: admin, dashboard, role === , role !== , hasRole,
         useRole, isAuthorized, visible, hidden, conditional render

    5. Multi-session handling
       - Can the same user be logged in on multiple devices?
       - Session conflict resolution
       - Force-logout mechanisms
       - Search for: session, device, concurrent, force-logout, invalidate

    Return your findings in this exact format:

    ## Authentication Mechanisms
    | Mechanism | File | Description |
    |-----------|------|-------------|
    | Email/Password | auth/login.ts | Standard email + password login |
    | ... | ... | ... |

    ## Role Definitions
    | Role | Source File | Permissions | Hierarchy Level |
    |------|-------------|-------------|-----------------|
    | Admin | types/roles.ts | Full access | 1 (highest) |
    | ... | ... | ... | ... |

    ## Authorization Enforcement
    | Type | File | Protected Resource | Required Role |
    |------|------|--------------------|---------------|
    | Middleware | middleware.ts | /admin/* | admin |
    | RLS Policy | schema.sql | posts table | owner or admin |
    | ... | ... | ... | ... |

    ## Role-Specific Routes
    | Route | Visible To | File | Conditional Elements |
    |-------|-----------|------|---------------------|
    | /admin/dashboard | admin | app/admin/page.tsx | Full CRUD controls |
    | /documents | all roles | app/docs/page.tsx | Edit button (editor+), Delete button (admin only) |
    | ... | ... | ... | ... |

    ## Persona-Route Matrix
    Map each persona from the registry to the routes they can access:
    | Route | Admin | Host | Guest | Viewer |
    |-------|-------|------|-------|--------|
    | /admin | Yes | No | No | No |
    | /dashboard | Yes | Yes | Yes (limited) | Yes (read-only) |
    | ... | ... | ... | ... | ... |
```

### Agent 2: Multi-User Features

```
TaskCreate:
  title: "Explore: Multi-User Features"
  status: "in_progress"
  metadata:
    agent_type: "explore"
    focus: "multi_user_features"
```

```
Task tool:
  subagent_type: "Explore"
  model: "sonnet"
  prompt: |
    You are a QA exploration agent focused on multi-user interactions and
    shared resources.

    The application has these personas: [INSERT PERSONA REGISTRY HERE]

    Your job is to find EVERY feature where one user's actions affect another
    user's experience. Use Read, Grep, and Glob to explore the codebase.
    Do NOT use any browser tools.

    Specifically, find and document:

    1. Shared resources
       - Entities that multiple users can view or edit
       - Documents, boards, lists, or workspaces shared across users
       - Shared data ownership and access patterns
       - Search for: share, shared, collaborate, team, workspace, member,
         participant, contributor, assign, owner, sharedWith, accessList

    2. Invitation and team management flows
       - How users are invited to resources (email, link, code)
       - Team or organization creation and management
       - Role assignment within shared contexts
       - Invitation acceptance and rejection flows
       - Search for: invite, invitation, join, team, organization, member,
         addMember, removeMember, joinLink, inviteCode, acceptInvite

    3. Cross-user visibility
       - What can User A see of User B's data?
       - Activity feeds showing other users' actions
       - Presence indicators (online/offline, "User is typing...")
       - User lists, member lists, participant lists
       - Search for: activity, feed, presence, online, typing, cursor,
         avatar, members, participants, lastSeen, activeUsers

    4. Collaborative editing
       - Real-time co-editing (Google Docs style)
       - Turn-based editing (lock/unlock patterns)
       - Commenting and annotation systems
       - Version history and change attribution
       - Search for: collaborative, coEdit, cursor, selection, comment,
         annotation, version, history, revision, changelog, diff, merge,
         conflict, lock, unlock, editing, draft

    5. Ownership and permission transfers
       - Transfer ownership of a resource
       - Escalation and de-escalation of permissions
       - Leaving or being removed from shared resources
       - Search for: transfer, ownership, promote, demote, leave, remove,
         kick, ban, deactivate, archive

    6. Cross-user notifications
       - Notifications triggered by another user's action
       - @mentions and direct messages
       - Email notifications for shared resource changes
       - Search for: notify, notification, mention, @, email, alert,
         subscribe, watch, follow

    Return your findings in this exact format:

    ## Shared Resources
    | Resource | File | Owners | Shared With | Access Levels |
    |----------|------|--------|-------------|---------------|
    | Document | models/document.ts | creator | team members | owner, editor, viewer |
    | ... | ... | ... | ... | ... |

    ## Invitation Flows
    | Flow | Trigger | File | Invitation Method | Acceptance Flow |
    |------|---------|------|-------------------|-----------------|
    | Team invite | Admin clicks "Invite" | actions/invite.ts | Email link | Click link -> join page |
    | ... | ... | ... | ... | ... |

    ## Cross-User Visibility
    | Feature | What is Visible | Who Sees It | File |
    |---------|-----------------|-------------|------|
    | Activity feed | Recent actions by all team members | All members | components/ActivityFeed.tsx |
    | ... | ... | ... | ... |

    ## Collaborative Features
    | Feature | Type | File | Conflict Strategy |
    |---------|------|------|-------------------|
    | Document editing | Real-time co-editing | lib/collaboration.ts | Last-write-wins with OT |
    | ... | ... | ... | ... |

    ## Ownership & Permission Transfers
    | Action | Initiator | Target | File |
    |--------|-----------|--------|------|
    | Transfer doc ownership | Current owner | Any member | actions/transfer.ts |
    | ... | ... | ... | ... |

    ## Cross-User Notifications
    | Trigger | Recipient | Channel | File |
    |---------|-----------|---------|------|
    | New comment on owned doc | Document owner | In-app + email | lib/notifications.ts |
    | ... | ... | ... | ... |
```

### Agent 3: Real-Time Sync

```
TaskCreate:
  title: "Explore: Real-Time Sync"
  status: "in_progress"
  metadata:
    agent_type: "explore"
    focus: "realtime_sync"
```

```
Task tool:
  subagent_type: "Explore"
  model: "sonnet"
  prompt: |
    You are a QA exploration agent focused on real-time synchronization
    and communication patterns.

    The application has these personas: [INSERT PERSONA REGISTRY HERE]

    Your job is to find EVERY real-time communication mechanism, subscription
    pattern, and synchronization strategy in this application. Use Read, Grep,
    and Glob to explore the codebase. Do NOT use any browser tools.

    Specifically, find and document:

    1. Real-time transport mechanisms
       - WebSocket connections (native, Socket.IO, ws)
       - Server-Sent Events (SSE / EventSource)
       - Long-polling endpoints
       - Real-time database subscriptions (Supabase Realtime, Firebase, Convex)
       - Search for: WebSocket, ws, socket.io, io(, SSE, EventSource,
         event-stream, text/event-stream, long-poll, realtime, subscribe,
         onSnapshot, channel, broadcast, presence

    2. Subscription and channel patterns
       - What channels or topics can users subscribe to?
       - Room-based subscriptions (per-document, per-team, per-chat)
       - Presence channels (who is online, who is viewing what)
       - Search for: subscribe, unsubscribe, channel, room, topic, join,
         leave, on(, emit(, broadcast, presence, track, untrack

    3. Optimistic updates and conflict resolution
       - Client-side optimistic UI updates before server confirmation
       - Rollback strategies on server rejection
       - Conflict detection (concurrent edits to the same resource)
       - Conflict resolution strategies (last-write-wins, OT, CRDT, merge)
       - Search for: optimistic, rollback, revert, conflict, merge, CRDT,
         operational-transform, OT, version, vector-clock, timestamp,
         lastModified, etag, concurrency

    4. Data synchronization patterns
       - How are changes from User A propagated to User B?
       - Polling intervals vs push-based updates
       - Stale data handling (cache invalidation, revalidation)
       - Offline support and sync-on-reconnect
       - Search for: sync, synchronize, invalidate, revalidate, stale,
         refetch, poll, interval, reconnect, offline, queue, retry,
         mutate, broadcast, push

    5. Event ordering and delivery guarantees
       - Are events ordered? (sequence numbers, timestamps)
       - At-least-once vs at-most-once vs exactly-once delivery
       - Event deduplication
       - Message queue patterns
       - Search for: sequence, order, deduplicate, idempotent, ack,
         acknowledge, retry, queue, buffer, batch

    6. Rate limiting and throttling
       - Rate limits on real-time connections
       - Throttling of updates (debounce, throttle, batching)
       - Connection limits per user
       - Search for: rateLimit, throttle, debounce, batch, limit,
         maxConnections, cooldown, backoff

    Return your findings in this exact format:

    ## Real-Time Transport
    | Mechanism | Library/Service | File | Purpose |
    |-----------|----------------|------|---------|
    | WebSocket | Socket.IO | lib/socket.ts | Real-time document updates |
    | SSE | Native EventSource | api/events/route.ts | Notification stream |
    | ... | ... | ... | ... |

    ## Subscription Channels
    | Channel Pattern | Scope | File | Subscribers |
    |----------------|-------|------|-------------|
    | document:{id} | Per-document | lib/channels.ts | All document viewers |
    | team:{id}:presence | Per-team | lib/presence.ts | All team members |
    | ... | ... | ... | ... |

    ## Optimistic Updates
    | Feature | Optimistic Behavior | Rollback Strategy | Conflict Handling |
    |---------|--------------------|--------------------|-------------------|
    | Message send | Show immediately in chat | Remove on failure | Server timestamp ordering |
    | ... | ... | ... | ... |

    ## Sync Patterns
    | Pattern | Trigger | Latency Target | File |
    |---------|---------|----------------|------|
    | Push via WebSocket | Server mutation | <1 second | lib/sync.ts |
    | Polling | 30s interval | <30 seconds | hooks/usePoll.ts |
    | ... | ... | ... | ... |

    ## Event Ordering
    | Stream | Ordering Strategy | Delivery Guarantee | File |
    |--------|------------------|--------------------|------|
    | Chat messages | Server timestamp | At-least-once | lib/chat.ts |
    | ... | ... | ... | ... |

    ## Rate Limits
    | Endpoint/Channel | Limit | Enforcement | File |
    |-----------------|-------|-------------|------|
    | WebSocket messages | 100/min per user | Server-side throttle | middleware/ws.ts |
    | ... | ... | ... | ... |
```

### After All Agents Complete

Once all three Explore agents have returned their findings, update each task:

```
TaskUpdate:
  title: "Explore: Auth & Roles"
  status: "completed"
  metadata:
    auth_mechanisms: 2
    roles_found: 4
    protected_routes: 8
    rls_policies: 3
```

```
TaskUpdate:
  title: "Explore: Multi-User Features"
  status: "completed"
  metadata:
    shared_resources: 5
    invitation_flows: 2
    collaborative_features: 3
    cross_user_notifications: 4
```

```
TaskUpdate:
  title: "Explore: Real-Time Sync"
  status: "completed"
  metadata:
    transport_mechanisms: 2
    subscription_channels: 6
    optimistic_updates: 4
    sync_patterns: 3
```

Merge all three agent reports into a single unified Multi-User Application Map that includes the Persona Registry from Phase 2. This map is the authoritative reference for all remaining phases.

---

## Phase 4: Journey Discovery + User Confirmation

Using the unified Multi-User Application Map from Phase 3 and the Persona Registry from Phase 2, identify all discoverable multi-user journeys and present them to the user as persona-tagged route sequences in INTERLEAVED order, grouped by priority.

### Present Journeys for Confirmation

Use `AskUserQuestion` to present the discovered journeys. Each journey shows the interleaved persona actions at route level:

```
Discovered multi-user journeys (ordered by priority):

Core:
1. Team Invitation Flow:
   [Admin] /team/settings -> /team/invite
   [Guest1] /inbox (receives invitation)
   [Admin] /team/members (sees updated list)

2. Role-Based Access Verification:
   [Admin] /dashboard (full controls)
   [Editor] /dashboard (edit controls only)
   [Viewer] /dashboard (read-only view)

3. Login as Each Persona:
   [Admin] /login -> /dashboard
   [Host] /login -> /dashboard
   [Guest1] /login -> /dashboard
   [Viewer] /login -> /dashboard

Feature:
4. Collaborative Document Editing:
   [Host] /docs/:id (creates content)
   [Guest1] /docs/:id (sees content appear)
   [Host] /docs/:id (sees Guest1's cursor)

5. Real-Time Presence:
   [Host] /docs/:id (opens document)
   [Guest1] /docs/:id (joins, presence indicator appears for Host)
   [Guest1] leaves /docs/:id (presence indicator disappears for Host)

6. Permission Change Propagation:
   [Admin] /team/members (changes Guest1 role to Editor)
   [Guest1] /dashboard (sees new edit controls without re-login)

Edge Case:
7. Concurrent Edit Conflict:
   [Host] /docs/:id (edits paragraph 1)
   [Guest1] /docs/:id (edits paragraph 1 simultaneously)
   [Host] /docs/:id (conflict resolution UI)

8. Resource Deleted While Viewing:
   [Host] /docs/:id (deletes document)
   [Guest1] /docs/:id (sees deletion notification)

Should I add, remove, or reorder any of these journeys?
```

Each journey is presented as a numbered list item with a short name and its interleaved persona-route sequence. Do not include detailed steps, verifications, or preconditions at this stage -- those are co-authored during the walkthrough in Phase 6.

### Apply User Feedback

If the user wants changes:
- **Add**: Append new journeys to the appropriate priority group.
- **Remove**: Drop the specified journeys from the list.
- **Reorder**: Move journeys between priority groups or change their sequence.
- **Adjust**: Modify the route sequence or persona assignments for a specific journey.

Re-present the updated list for final confirmation before proceeding.

### Update Task Metadata

```
TaskUpdate:
  title: "Generate: Multi-User Workflows"
  metadata:
    core_journeys: 3
    feature_journeys: 3
    edge_case_journeys: 2
    total_journeys: 8
    personas_involved: 4
    journeys_confirmed: true
```

---

## Phase 5: App URL + Per-Persona Auth Setup

The live walkthrough requires a running application. This phase is **required** -- there is no option to skip.

### Ask for the App URL

Use `AskUserQuestion`:

```
The live walkthrough requires a running app. Please provide the URL
(e.g., http://localhost:3000, https://preview.example.com, or https://app.example.com).
```

### Ask for Per-Persona Authentication Setup

For multi-user workflows, you need authenticated sessions for EACH persona in the Persona Registry. Check for saved profiles first.

**Step 1: Check for saved profiles**

```
1. Check if .playwright/profiles.json exists at the project root.
2. If it exists, read the profile list and match persona names to profile names.
3. For each matching profile, check if the storageState file exists
   at .playwright/profiles/<role-name>.json.
```

**If profiles exist for all personas:**

Load each profile into a separate browser context automatically:

```
For each persona in the Persona Registry:
  1. Read .playwright/profiles/<persona-name>.json
  2. Create a new Playwright BrowserContext
  3. Use browser_run_code to restore cookies from the storageState
  4. Navigate to the base URL and verify the session is valid
  5. If redirected to loginUrl, the session has expired -- note it for the user
  6. Associate the context with the persona name
```

Inform the user which profiles were loaded and whether any sessions have expired. For expired sessions, suggest running `/setup-profiles` to refresh them.

**If profiles exist for some but not all personas:**

Load the available profiles and inform the user which personas are missing:

```
Loaded profiles for: Admin, Host
Missing profiles for: Guest1, Guest2, Viewer

Run /setup-profiles to create the missing profiles, or provide credentials below.
```

**If no profiles exist:**

Use `AskUserQuestion`:

```
For multi-user workflows, I need authenticated sessions for each persona.

Recommended: Run /setup-profiles to create persistent profiles for each persona.

Or provide credentials for each:
- Admin: ADMIN_EMAIL / ADMIN_PASSWORD
- Host: HOST_EMAIL / HOST_PASSWORD
- Guest1: GUEST1_EMAIL / GUEST1_PASSWORD
- Guest2: GUEST2_EMAIL / GUEST2_PASSWORD
- Guest3: GUEST3_EMAIL / GUEST3_PASSWORD
- Viewer: VIEWER_EMAIL / VIEWER_PASSWORD

Please provide values, confirm env var names, or run /setup-profiles first.
```

### Create Per-Persona Browser Contexts

Create a separate Playwright browser context for each persona with its own `storageState`. This ensures each persona has an independent, authenticated session.

**If using profiles:**

```
For each persona in the Persona Registry:
  1. Read .playwright/profiles/<persona-name>.json
  2. Create a new Playwright BrowserContext
  3. Restore cookies via browser_run_code
  4. Associate the context with the persona name
```

**If using credentials:**

```
For each persona in the Persona Registry:
  1. Create a new Playwright BrowserContext
  2. Navigate to the login page
  3. Authenticate using the persona's credentials
  4. Save the storageState for the context
  5. Associate the context with the persona name
```

### Create the Walkthrough Task

```
TaskCreate:
  title: "Walkthrough: Multi-User Journeys"
  status: "in_progress"
  metadata:
    base_url: "http://localhost:3000"
    auth_method: "profiles"
    personas_authenticated: ["Admin", "Host", "Guest1", "Guest2", "Guest3", "Viewer"]
    total_journeys: 8
    completed_journeys: 0
    current_journey: 1
```

---

## Phase 6: Iterative Walkthrough [PER JOURNEY]

This is the core phase. For each confirmed journey from Phase 4, walk through the live app with the user to co-author the workflow steps using per-persona Playwright browser contexts. Repeat sub-phases 6a, 6b, and 6c for every journey.

### 6a: Confirm Screen Flow

Present the journey's screens as an interleaved persona-route sequence. The user already approved the journey list in Phase 4, but this is the per-journey confirmation before Playwright starts navigating.

Use `AskUserQuestion`:

```
Journey 1: Team Invitation Flow

Screen flow (interleaved by persona):
  [Admin] /team/settings -> /team/invite
  [Guest1] /inbox (receives invitation)
  [Admin] /team/members (sees updated list)

Is this the right screen flow, or should I adjust it?
```

If the user wants to add intermediate screens or change persona ordering, update the flow before proceeding.

### 6b: Confirm Actions + Playwright Captures

Present the proposed actions at each transition, with persona tags. These proposals are informed by the code exploration results from Phase 3 (e.g., the Auth & Roles agent found an invite form, the Multi-User Features agent found an invitation acceptance flow).

When the persona changes between consecutive steps, Playwright switches to that persona's browser context.

Use `AskUserQuestion`:

```
Journey 1: Team Invitation Flow

Proposed actions:
  Step 1: [Admin] Navigate to /team/settings
  Step 2: [Admin] Click "Invite Member" button -> Fill email field with Guest1's email -> Click "Send Invite"
  Step 3: [Guest1] Navigate to /inbox  (switching to Guest1's browser context)
  Step 4: [Guest1] Click the invitation notification -> Click "Accept"
  Step 5: [Admin] Navigate to /team/members  (switching back to Admin's browser context)

Are these the right actions? Any to add, remove, or adjust?
```

Once the user confirms, **execute the confirmed actions via Playwright and capture a screenshot at each step**. The user does not interact during Playwright execution. Each step executes in the correct persona's browser context.

### Data for Form Fields

When Playwright fills form fields during execution:
- For authentication forms, use the credentials obtained in Phase 5.
- For invitation forms, use the target persona's email from the Persona Registry.
- For non-auth forms that require specific data (e.g., creating a document, filling settings), use reasonable test data.
- If a form requires domain-specific input that cannot be guessed, flag it during 6c and ask the user what values to use.

Playwright execution sequence:

```
1. Identify the persona for this step
2. Switch to that persona's browser context
3. browser_navigate to the target route (if navigating)
4. browser_take_screenshot to capture the state in this persona's context
5. For each action in this step:
   a. Execute the action:
      - browser_click for clicks
      - browser_type or browser_fill_form for text input
      - browser_navigate for direct navigation
   b. browser_take_screenshot to capture the result
6. Store each screenshot with its step number and persona name for use in 6c
```

### Handling Playwright Failures

If an action fails during execution (element not found, timeout, navigation error):

1. Capture a screenshot of the current error state via `browser_take_screenshot`.
2. Continue to the next action if possible.
3. In Phase 6c, flag the failed step by presenting the error state screenshot and explaining what went wrong.
4. Use `AskUserQuestion` to ask the user whether to:
   - Retry with adjusted selectors or actions
   - Skip the step and continue
   - Abort the journey entirely

### 6c: Co-Author Verifications + Edge Cases

For each screenshot captured in 6b, present it to the user with proposed verifications and edge case suggestions. Verifications are informed by:
- The screenshot itself (what is visually present on screen)
- Code exploration results (what components, validation, and state were found)
- Anti-pattern detection (see the Multi-User UX Anti-Patterns section below)
- The Timing Expectations by Feature Type table (for sync verifications at persona handoff points)

Present one step at a time. Do not batch or group steps.

At **persona handoff points** (where the active persona changes between consecutive steps), ALSO propose sync timing verifications informed by the Timing Expectations table.

Use `AskUserQuestion` for each step:

```
Journey 1: Team Invitation Flow -- Step 3
[Guest1] /inbox
[screenshot from Guest1's browser context]

I see Guest1's inbox page. There is a notification area at the top and
an invitation card from Admin.

Proposed verifications:
- Verify invitation notification appears in Guest1's inbox
- Verify the invitation shows the correct team name
- Verify the invitation shows Admin as the inviter

Should I add, remove, or change any of these verifications?

Sync verification (persona handoff from Admin to Guest1):
- Sync verification: invitation notification visible within 5 seconds
  of Admin's invite action

Edge cases:
- Guest1 already on inbox page when invite sent -- appears without refresh?
- Guest1 has notifications disabled -- alternative way to see invite?
- Invitation link expires before Guest1 clicks it -- error message?

Which edge cases should I include? (list numbers, "all", or "none")
```

### Building the Workflow Steps

Each confirmed verification becomes a workflow step. Edge cases become sub-steps numbered with a letter suffix (3a, 3b, etc.). Sync verifications are included inline using the standard format.

Example output for the step above:

```markdown
3. [Guest1] Navigate to /inbox
   - Verify invitation notification appears in Guest1's inbox
   - Verify the invitation shows the correct team name and Admin as the inviter
   - **Sync Verification:** Within 5 seconds, verify Guest1 sees the
     invitation notification after Admin's invite action

   3a. [Edge Case] Guest1 is already on the inbox page when Admin sends the invite
       - Verify the invitation appears in real-time without page refresh

   3b. [Edge Case] Invitation link has expired
       - Verify a clear expiration message is shown when Guest1 clicks the link
```

### Per-Workflow Template

When assembling workflows in Phase 7, wrap each journey's confirmed steps in this template:

````markdown
## Workflow [N]: [Journey Name]
<!-- auth: required -->
<!-- priority: core/feature/edge -->
<!-- personas: Admin, Guest1 -->
<!-- estimated-steps: [count] -->
<!-- sync-points: [count] -->

> [One-sentence description of what this workflow tests and why it matters
> for multi-user scenarios.]

**Preconditions:**
- Admin is logged in as Admin persona (ADMIN_EMAIL / ADMIN_PASSWORD)
- Guest1 is logged in as Guest1 persona (GUEST1_EMAIL / GUEST1_PASSWORD)
- [Any required data state]

**Steps:**
[Confirmed steps from Phase 6c]

**Postconditions:**
- [Final expected state after all steps complete]
- [State from each persona's perspective]
````

### After Each Journey Completes

Update the walkthrough task metadata and inform the user before moving to the next journey:

```
TaskUpdate:
  title: "Walkthrough: Multi-User Journeys"
  metadata:
    completed_journeys: 1
    current_journey: 2
    journey_1_steps: 6
    journey_1_edge_cases: 3
    journey_1_sync_points: 2
```

Use `AskUserQuestion`:

```
Journey 1 (Team Invitation Flow) is complete: 6 steps, 3 edge cases, 2 sync points.

Moving to Journey 2: Role-Based Access Verification
  [Admin] /dashboard (full controls)
  [Editor] /dashboard (edit controls only)
  [Viewer] /dashboard (read-only view)

Ready to continue?
```

### When All Journeys Are Complete

```
TaskUpdate:
  title: "Walkthrough: Multi-User Journeys"
  status: "completed"
  metadata:
    completed_journeys: 8
    total_steps: 48
    total_edge_cases: 18
    total_sync_points: 14
```

---

## Phase 7: Final Review

Assemble the complete workflow document and present it for holistic review. Because every step was individually co-authored with the user during the walkthrough, this review is expected to be lighter -- it focuses on the document as a whole rather than individual steps, with special attention to multi-user-specific concerns.

### Document Structure

```markdown
# Multi-User Workflows

> Auto-generated by multi-user-workflow-generator.
> Last updated: [date]
> Application: [app name]
> Base URL: [URL if known]

## Persona Registry

| Persona | Role | Count | Credential Env Vars | Provisioning |
|---------|------|-------|---------------------|--------------|
| Admin | Administrator | 1 | ADMIN_EMAIL / ADMIN_PASSWORD | Pre-provisioned |
| Host | Document Owner | 1 | HOST_EMAIL / HOST_PASSWORD | Pre-provisioned |
| Guest1 | Guest User | 1 | GUEST1_EMAIL / GUEST1_PASSWORD | Sign-up flow |
| Guest2 | Guest User | 1 | GUEST2_EMAIL / GUEST2_PASSWORD | Sign-up flow |
| Guest3 | Guest User | 1 | GUEST3_EMAIL / GUEST3_PASSWORD | Sign-up flow |
| Viewer | Read-Only | 1 | VIEWER_EMAIL / VIEWER_PASSWORD | Invited by Admin |

## Quick Reference

| # | Workflow | Priority | Personas | Steps | Sync Points |
|---|---------|----------|----------|-------|-------------|
| 1 | Team Invitation Flow | core | Admin, Guest1 | 6 | 2 |
| 2 | Collaborative Document Editing | core | Host, Guest1, Guest2 | 10 | 4 |
| 3 | Role-Based Access Verification | core | Admin, Host, Guest1, Viewer | 8 | 0 |
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

## Appendix: Multi-User Application Map Summary

### Authentication Mechanisms
[Summary table from Agent 1]

### Role Definitions
[Summary table from Agent 1]

### Shared Resources
[Summary table from Agent 2]

### Invitation Flows
[Summary table from Agent 2]

### Real-Time Transport
[Summary table from Agent 3]

### Sync Patterns
[Summary table from Agent 3]

### Persona Visibility Matrix
[Matrix derived from code analysis and walkthrough observations]
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
    personas_used: 6
    sync_points: 14
```

Use `AskUserQuestion`:

```
I have assembled [N] multi-user workflows from our walkthrough:
- [X] Core workflows
- [Y] Feature workflows
- [Z] Edge case workflows
- [S] total sync verification points

Personas used: [list of persona names]

Here is the full document:

[Paste the complete workflow document]

Please review the overall document:
1. Are any multi-user journeys missing that we should add?
2. Are the persona assignments correct for each workflow?
3. Are the sync timing expectations reasonable?
4. Does the persona count in metadata match actual usage?
5. Should any workflows be combined or split?
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
    feedback_summary: "Add concurrent deletion scenario, adjust sync timing to 3s for presence"
```

3. Create a new approval task for the next round:

```
TaskCreate:
  title: "Approval: User Review #2"
  status: "in_progress"
  metadata:
    iteration: 2
    changes_made: ["added concurrent deletion workflow", "adjusted presence sync timing to 3s"]
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
    final_sync_points: 14
```

---

## Phase 8: Write File and Complete

### Write the File

Write the approved workflow document to `/workflows/multi-user-workflows.md` relative to the project root.

```
1. Ensure the /workflows/ directory exists (create it if not).
2. Write the complete document to /workflows/multi-user-workflows.md.
3. Verify the file was written correctly by reading it back.
```

### Update the Write Task

```
TaskCreate:
  title: "Write: multi-user-workflows.md"
  status: "completed"
  metadata:
    file_path: "/workflows/multi-user-workflows.md"
    file_size_lines: 620
    workflows_written: 8
    personas_documented: 6
```

### Complete the Main Task

```
TaskUpdate:
  title: "Generate: Multi-User Workflows"
  status: "completed"
  metadata:
    mode: "create"
    total_workflows: 8
    core: 3
    feature: 3
    edge: 2
    personas: ["Admin", "Host", "Guest1", "Guest2", "Guest3", "Viewer"]
    total_sync_points: 14
    output_path: "/workflows/multi-user-workflows.md"
    exploration_agents: 3
    interview_completed: true
    walkthrough_journeys: 8
    total_steps: 48
    total_edge_cases: 18
    review_iterations: 1
```

### Final Summary

Present the user with a completion summary:

```
Multi-user workflow generation complete.

File: /workflows/multi-user-workflows.md

Summary:
- Total workflows: 8
- Core workflows: 3
- Feature workflows: 3
- Edge case workflows: 2
- Personas: Admin, Host, Guest1, Guest2, Guest3, Viewer (6 total)
- Total sync verification points: 14
- Exploration agents used: 3 (Auth & Roles, Multi-User Features, Real-Time Sync)
- Interview completed: yes
- Walkthrough journeys completed: 8
- Total steps: 48
- Total edge cases: 18
- Review iterations: 1

Next steps:
- Run "convert multi-user workflows to playwright" to generate multi-context E2E test files
- Run "run playwright tests" to execute the generated tests
```

---

## Session Recovery

If the skill is invoked and an existing task list is found, use this decision tree to determine where to resume.

### Decision Tree

```
Check TaskList for "Generate: Multi-User Workflows"

CASE 1: No task list exists
  -> Start from Phase 1

CASE 2: Interview task is "in_progress"
  -> The interview was started but not completed
  -> Resume from Phase 2 (re-ask persona questions)

CASE 3: Interview task is "completed", Explore tasks are "in_progress"
  -> Some agents may have timed out
  -> Check which Explore tasks completed
  -> Re-spawn only the incomplete agents (pass the stored Persona Registry)
  -> Resume from Phase 3 (partial)

CASE 4a: All Explore tasks are "completed", journeys_confirmed is NOT set
  -> Code exploration is done but journeys not yet presented
  -> Resume from Phase 4 (journey discovery)

CASE 4b: All Explore tasks are "completed", journeys_confirmed is set, no Walkthrough task
  -> Journeys confirmed but walkthrough not started
  -> Resume from Phase 5 (app URL + per-persona auth setup)

CASE 5: Walkthrough task is "in_progress"
  -> Some journeys were completed, others remain
  -> Read completed_journeys and current_journey from task metadata
  -> Inform user which journeys are done and which is next
  -> Resume from Phase 6 at the next incomplete journey

CASE 6: Walkthrough task is "completed", no Approval task
  -> All journeys walked through but document not yet reviewed
  -> Resume from Phase 7 (final review)

CASE 7: Approval task exists with result "changes_requested"
  -> User gave feedback but revisions were not completed
  -> Read the feedback from task metadata
  -> Apply changes and re-present for review
  -> Resume from Phase 7 (next iteration)

CASE 8: Approval task is "completed" with result "approved", no Write task
  -> Document was approved but file was not written
  -> Resume from Phase 8 (write file)

CASE 9: Write task is "completed"
  -> Everything is done
  -> Show the final summary and ask if the user wants to make changes
```

### Always Inform the User When Resuming

```
I found an existing session for multi-user workflow generation.

Current state: [describe where things left off]
Last completed phase: [phase name]
Persona Registry: [list of personas from the interview]

I will resume from [next phase]. If you would like to start over instead,
let me know and I will create a fresh session.
```

---

## Persona Tagging Rules

Follow these rules strictly when tagging workflow steps with personas:

1. **Every action step must be prefixed with `[PersonaName]`** -- No exceptions. If a step is a system event (like a timer firing), prefix with `[System]`.

2. **Verification steps that check another persona's view must name both personas** -- For example: "[Guest1] Verify that the document edited by [Host] shows the updated title."

3. **Sync verification steps must include timing expectations** -- Always specify the maximum acceptable delay. Use the format: "**Sync Verification:** Within N seconds, verify [condition]."

4. **Context switches must be explicit** -- When consecutive steps switch between personas, add a visual separator comment if the switch might be non-obvious:

```markdown
3. [Admin] Grant edit permissions to Guest1
   - Verify permission change is confirmed

   <!-- Context switch: now acting as Guest1 -->

4. [Guest1] Refresh the document page
   - Verify edit controls are now visible
```

5. **Persona counts in metadata must be accurate** -- The `<!-- personas: ... -->` comment must list EVERY persona that appears in the workflow steps. Do not list personas that are not involved.

6. **Credential env vars in preconditions** -- Always show the exact environment variable names for each persona in the preconditions block.

---

## Sync Verification Patterns

Use these standard patterns for verifying cross-user synchronization:

| Pattern | When to Use | Template |
|---------|------------|----------|
| Immediate sync | Real-time features (WebSocket, SSE) | "**Sync Verification:** Within 2 seconds, verify [Persona B] sees [change made by Persona A]" |
| Near-real-time sync | Polling-based or eventually consistent features | "**Sync Verification:** Within 10 seconds, verify [Persona B] sees [change made by Persona A]" |
| Triggered sync | Changes visible on next page load or action | "**Sync Verification:** [Persona B] refreshes the page and verifies [change made by Persona A] is visible" |
| Absence verification | Verifying a persona does NOT see something | "**Sync Verification:** [Persona B] verifies the [element] is NOT visible (role restriction)" |

---

## Timing Expectations by Feature Type

Use these default timing expectations unless the code exploration reveals specific values:

| Feature Type | Expected Sync Time | Rationale |
|-------------|-------------------|-----------|
| WebSocket push | Within 2 seconds | Real-time transport, near-instant |
| SSE push | Within 3 seconds | Slight overhead vs WebSocket |
| Polling (short interval) | Within polling interval + 2 seconds | Depends on interval |
| Database trigger + notification | Within 5 seconds | DB event -> notification pipeline |
| Email notification | Within 30 seconds | Email delivery is inherently slower |
| Invitation link generation | Within 5 seconds | Server-side generation |
| Permission change propagation | Within 5 seconds | Auth cache invalidation |
| Presence update | Within 3 seconds | Real-time presence channel |

---

## Workflow Writing Standards

Use these exact verb forms and patterns when writing workflow steps. Consistency makes workflows easier to read, review, and automate.

| Action | Format | Example |
|--------|--------|---------|
| Navigation | [Persona] Navigate to [URL/page] | [Admin] Navigate to the team settings page |
| Click | [Persona] Click the "[label]" [element type] | [Host] Click the "Share" button |
| Type | [Persona] Type "[text]" in the [field name] field | [Admin] Type "guest@email.com" in the invite email field |
| Select | [Persona] Select "[option]" from the [dropdown name] dropdown | [Admin] Select "Editor" from the role dropdown |
| Check | [Persona] Check the "[label]" checkbox | [Host] Check the "Allow editing" checkbox |
| Uncheck | [Persona] Uncheck the "[label]" checkbox | [Admin] Uncheck the "Can delete" checkbox |
| Toggle | [Persona] Toggle the "[label]" switch [on/off] | [Host] Toggle the "Public access" switch on |
| Clear | [Persona] Clear the [field name] field | [Guest1] Clear the search field |
| Scroll | [Persona] Scroll [direction] to [target/distance] | [Viewer] Scroll down to the comments section |
| Hover | [Persona] Hover over the "[label]" [element] | [Guest1] Hover over the "Participants" avatar stack |
| Wait | [Persona] Wait for [condition] | [Guest2] Wait for the loading spinner to disappear |
| Verify | [Persona] Verify [expected state] | [Guest1] Verify the shared document title reads "Project Plan" |
| Sync Verify | **Sync Verification:** Within N seconds, verify [condition] | **Sync Verification:** Within 5 seconds, verify [Guest1] sees the document updated by [Host] |
| Upload | [Persona] Upload "[filename]" to the [upload area] | [Host] Upload "report.pdf" to the shared files dropzone |
| Drag | [Persona] Drag "[source]" to "[target]" | [Editor] Drag "Task A" to the "Done" column |
| Press | [Persona] Press [key/shortcut] | [Host] Press Escape to close the share dialog |
| Refresh | [Persona] Refresh the page | [Guest1] Refresh the page and verify data from [Host] persists |

---

## Automation-Friendly Guidelines

Multi-user workflows are designed to be converted into Playwright multi-context E2E tests. Follow these guidelines to make conversion straightforward.

### Multi-Context Pattern

Each persona maps to a separate Playwright BrowserContext (or a separate Browser instance for full isolation). The converter will create:

```
- 1 BrowserContext per persona
- 1 Page per context
- Shared test fixtures for persona credentials
- Helper functions to switch between persona contexts
```

When writing workflows, keep this mapping in mind. Each `[PersonaName]` prefix tells the converter which context to use for that step.

### Locator Descriptions

When describing elements in workflow steps, prefer descriptions that map cleanly to Playwright's recommended locator strategies:

| Locator Strategy | Workflow Description | Playwright Equivalent |
|-----------------|---------------------|----------------------|
| By role + name | [Admin] Click the "Submit" button | `adminPage.getByRole('button', { name: 'Submit' })` |
| By label | [Host] Type "john@email.com" in the email field | `hostPage.getByLabel('Email')` |
| By text | [Guest1] Click the "Learn more" link | `guest1Page.getByText('Learn more')` |
| By placeholder | [Guest2] Type "Search..." in the search box | `guest2Page.getByPlaceholder('Search...')` |
| By test ID | [Admin] Click the delete button (`data-testid="delete-btn"`) | `adminPage.getByTestId('delete-btn')` |
| By title | [Viewer] Hover over the info icon (title="More information") | `viewerPage.getByTitle('More information')` |

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
4. [Guest1] [MANUAL] Verify the invitation email arrives in the inbox
   - Check for subject line "You've been invited to [Team Name]"

7. [Admin] [MANUAL] Complete the CAPTCHA challenge
   - Workflow continues after CAPTCHA is solved
```

### Known Limitations for Multi-User Testing

| Limitation | Description | Workaround |
|-----------|-------------|------------|
| True concurrency | Playwright contexts run sequentially in a single test | Use `Promise.all()` for parallel actions, or accept sequential execution with sync verification |
| WebSocket state observation | Cannot directly observe WebSocket messages from another context | Verify via UI state changes with polling/retries |
| Timing sensitivity | Real-time sync tests are inherently timing-sensitive | Use generous timeouts and retry assertions (e.g., `expect(...).toPass({ timeout: 10000 })`) |
| Shared database state | All contexts share the same database | Ensure preconditions explicitly state required data state; use unique identifiers per test run |
| Browser resource limits | Each context consumes memory and CPU | Limit to 4-5 simultaneous personas per test; split larger groups across multiple tests |
| OAuth per-persona | Each persona may need separate OAuth flows | Pre-provision auth tokens or use API-level login to skip OAuth UI for secondary personas |
| Email verification | Cannot automate email inbox checking | Use test email services (Mailhog, Ethereal) or skip verification in test env |

### Prerequisites for Automation

When a multi-user workflow requires specific setup, document it in the Preconditions block:

```markdown
**Preconditions:**
- Admin is logged in as Admin persona (ADMIN_EMAIL / ADMIN_PASSWORD)
- Host is logged in as Host persona (HOST_EMAIL / HOST_PASSWORD)
- Guest1 is logged in as Guest1 persona (GUEST1_EMAIL / GUEST1_PASSWORD)
- A shared workspace named "Test Workspace" exists (created by Admin)
- Host has "Editor" role in "Test Workspace"
- Guest1 has "Viewer" role in "Test Workspace"
- The feature flag "real-time-collaboration" is enabled
```

This information is critical for the converter skill to generate proper `beforeAll` setup blocks that create contexts, log in each persona, and establish the required data state.

---

## Multi-User UX Anti-Patterns

When generating workflows, watch for these common multi-user UX anti-patterns. If you detect any during exploration, flag them in the workflow document and write specific test steps to verify the application handles them correctly.

### Synchronization Anti-Patterns

| Anti-Pattern | Why It Matters | Verification Step |
|-------------|----------------|-------------------|
| Silent data loss | User A's changes overwritten by User B without warning | [User A] and [User B] edit the same field; verify conflict resolution or merge UI appears |
| Stale reads | User sees outdated data after another user's update | [User B] Verify data updates within expected sync time after [User A] makes changes |
| Phantom deletes | Resource disappears from one user's view without explanation | [User A] Delete resource; [User B] Verify clear "deleted" or "not found" message (not blank screen) |
| No offline indicator | User does not know they are working with stale data | Disconnect network; verify offline banner or stale-data warning appears |
| Optimistic update without rollback | Failed server-side operation leaves client in invalid state | [User A] Perform action that will fail server-side; verify UI rolls back to previous state |

### Permission Anti-Patterns

| Anti-Pattern | Why It Matters | Verification Step |
|-------------|----------------|-------------------|
| UI shows forbidden actions | User sees buttons they cannot use | [Viewer] Verify edit/delete buttons are NOT visible (not just disabled) |
| Error on permitted action | User has permission but gets an error | [Editor] Perform allowed action; verify success (no 403/unauthorized) |
| Delayed permission propagation | Role change does not take effect until re-login | [Admin] Change [Guest1]'s role; [Guest1] Verify new permissions without re-login |
| Inconsistent permission model | Same action allowed via UI but blocked via API or vice versa | [Guest1] Perform action via UI; verify API also permits it |
| No audit trail for permission changes | Cannot track who changed whose access | [Admin] Change [Guest1]'s role; verify audit log entry is created |

### Collaboration Anti-Patterns

| Anti-Pattern | Why It Matters | Verification Step |
|-------------|----------------|-------------------|
| No presence indicators | Users do not know who else is viewing/editing | [Host] and [Guest1] Open same document; verify presence avatars or "N users viewing" indicator |
| Cursor/selection not shared | Users cannot see where others are editing | [Host] Place cursor in document; [Guest1] Verify remote cursor is visible |
| No conflict notification | Concurrent edits silently merged or lost | [Host] and [Guest1] Edit same paragraph; verify conflict notification or merge UI |
| Lock without timeout | User locks resource and goes offline, blocking others | [Host] Start editing; disconnect Host; [Guest1] Verify lock expires or can be overridden |
| No typing indicator | Users type over each other without awareness | [Host] Begin typing; [Guest1] Verify "Host is typing..." indicator appears |

### Notification Anti-Patterns

| Anti-Pattern | Why It Matters | Verification Step |
|-------------|----------------|-------------------|
| Missing notifications | Important events do not trigger notifications | [Host] Perform notable action; [Guest1] Verify notification appears within expected time |
| Notification flood | Every minor action sends a notification | [Host] Perform 10 rapid actions; [Guest1] Verify notifications are batched or throttled |
| Self-notification | User notified of their own actions | [Host] Perform action; verify [Host] does NOT receive notification for own action |
| No notification preferences | Users cannot control notification volume | Verify notification settings page exists with per-channel controls |
| Stale notification links | Clicking notification leads to 404 or wrong state | [Admin] Delete resource; [Guest1] Click notification about resource; verify graceful error |

### Multi-User Verification Steps Template

When anti-patterns are detected during exploration, add a dedicated multi-user verification workflow:

```markdown
## Workflow [N]: Multi-User UX Compliance
<!-- auth: required -->
<!-- priority: feature -->
<!-- personas: Admin, Host, Guest1, Viewer -->
<!-- sync-points: 6 -->

> Verifies the application follows multi-user UX best practices and avoids
> common collaboration, synchronization, and permission anti-patterns.

**Preconditions:**
- All personas are logged in
- A shared workspace exists with all personas as members

**Steps:**

1. [Host] and [Guest1] Open the same shared document simultaneously
   - **Sync Verification:** Within 3 seconds, verify both see presence
     indicators showing the other user

2. [Host] Begin typing in the document
   - **Sync Verification:** Within 2 seconds, verify [Guest1] sees
     [Host]'s cursor or a "Host is typing..." indicator

3. [Admin] Change [Guest1]'s role from "Editor" to "Viewer"
   - **Sync Verification:** Within 5 seconds, verify [Guest1]'s edit
     controls disappear without requiring re-login

4. [Viewer] Attempt to access the edit page for the shared document
   - Verify a clear "permission denied" or redirect occurs (not a 500 error)

5. [Host] Delete the shared document
   - **Sync Verification:** Within 5 seconds, verify [Guest1] sees a
     "document deleted" message (not a blank screen)
   - **Sync Verification:** Within 5 seconds, verify [Viewer] is
     redirected or shown a "not found" message

6. [Guest1] Click a stale notification referencing the deleted document
   - Verify a graceful "document not found" message appears (not a crash)
```

---

## Handling Updates

When the user selects "Update" mode (modifying existing workflows), follow these rules to minimize disruption while ensuring coverage stays current.

### Rules for Updating Existing Workflows

1. **Preserve working workflows** -- If an existing workflow is still valid (routes exist, components match, personas are correct, sync timings are accurate), keep it unchanged. Do not rewrite working workflows for style consistency.

2. **Mark deprecated workflows** -- If a workflow references features, routes, or personas that no longer exist, do not delete it. Instead, add a deprecation marker:

```markdown
## Workflow 9: Legacy Shared Calendar
<!-- auth: required -->
<!-- priority: feature -->
<!-- personas: Admin, Editor -->
<!-- deprecated: true -->
<!-- deprecated-reason: Calendar feature removed in v3.0, replaced by external integration -->
<!-- deprecated-date: 2025-02-15 -->

> **DEPRECATED** -- This workflow references the shared calendar feature which
> has been removed. Keeping for reference until confirmed safe to delete.
```

3. **Add new workflows** -- New workflows are appended to the appropriate section (Core, Feature, or Edge Case). Number them sequentially after the last existing workflow.

4. **Update Persona Registry** -- If personas have changed (new roles added, roles renamed, roles removed), update the Persona Registry table at the top of the document and flag any workflows that reference deprecated personas.

5. **Version notes** -- Add a version history section at the top of the file:

```markdown
## Version History

| Date | Action | Details |
|------|--------|---------|
| 2025-02-20 | Updated | Added workflows 26-28 for new real-time chat feature; added "Moderator" persona |
| 2025-02-15 | Updated | Deprecated workflow 9 (calendar removed); updated sync timings in workflows 3, 7, 12 |
| 2025-02-01 | Created | Initial generation: 24 workflows, 6 personas |
```

6. **Re-validate existing workflows** -- During exploration, cross-reference existing workflow steps against the current codebase. Flag any steps that reference elements, routes, or personas that have changed:

```markdown
3. [Admin] Click the "Invite User" button
   - **[CHANGED]** Button label is now "Add Team Member" (updated in v2.5)
   - Verify the invitation dialog opens
```

7. **Preserve workflow numbers** -- Never renumber existing workflows. If workflow 9 is deprecated and workflow 28 is added, the gap stays. This ensures external references to "Workflow 9" remain valid.

8. **Update sync timings** -- If the real-time infrastructure has changed (e.g., migrated from polling to WebSocket), update all relevant Sync Verification timing expectations.

### Update Summary

After an update operation, present a change summary:

```
Multi-user workflow update complete.

Changes:
- Workflows preserved (unchanged): 18
- Workflows updated (steps modified): 4
- Workflows deprecated: 1
- Workflows added (new): 3
- Total workflows: 27 (1 deprecated)
- Personas added: 1 (Moderator)
- Personas deprecated: 0
- Sync timings updated: 6 steps across 3 workflows

Changed workflows:
- Workflow 3: Updated sync timing from 10s to 3s (WebSocket migration)
- Workflow 7: Updated step 4 (new share dialog UI)
- Workflow 12: Updated sync timing from 10s to 3s (WebSocket migration)
- Workflow 15: Updated step 2 ([Admin] button label changed to "Add Team Member")

Deprecated workflows:
- Workflow 9: Legacy Shared Calendar (calendar removed in v3.0)

New workflows:
- Workflow 26: Real-Time Chat Message Delivery
- Workflow 27: Chat Presence Indicators
- Workflow 28: Moderator Content Moderation Flow

New personas:
- Moderator (MODERATOR_EMAIL / MODERATOR_PASSWORD, pre-provisioned)
```
