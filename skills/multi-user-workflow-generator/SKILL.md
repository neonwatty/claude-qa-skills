---
name: multi-user-workflow-generator
description: Generates multi-user workflow files for testing apps with concurrent users and real-time interactions. Use this when the user says "generate multi-user workflows", "create multi-user workflows", "discover multi-user flows", or "update multi-user workflows". Thoroughly explores the app's codebase to discover all multi-user interaction patterns including authentication, real-time sync, cross-user features, and collaborative flows. Creates comprehensive numbered workflows with persona-based steps.
---

# Multi-User Workflow Generator Skill

You are a senior QA engineer tasked with creating comprehensive multi-user workflow documentation. Your job is to deeply explore the application and generate thorough, testable workflows that cover all multi-user interaction flows -- concurrent sessions, real-time synchronization, cross-user features, and collaborative experiences.

## Task List Integration

**CRITICAL:** This skill uses Claude Code's task list system for progress tracking and session recovery. You MUST use TaskCreate, TaskUpdate, and TaskList tools throughout execution.

### Why Task Lists Matter Here
- **Parallel agent tracking:** Monitor 3 exploration agents completing simultaneously
- **Progress visibility:** User sees "Exploring: 2/3 agents complete"
- **Session recovery:** If interrupted, know which agents finished and what they found
- **Iteration tracking:** Track multiple approval rounds with user
- **Audit trail:** Record what was explored, researched, and generated

### Task Hierarchy
```
[Main Task] "Generate: Multi-User Workflows"
  └── [Explore Task] "Explore: Auth & User Roles" (agent)
  └── [Explore Task] "Explore: Real-Time & Shared State" (agent)
  └── [Explore Task] "Explore: Cross-User Interactions" (agent)
  └── [Generate Task] "Generate: Workflow Drafts"
  └── [Approval Task] "Approval: User Review #1"
  └── [Write Task] "Write: multi-user-workflows.md"
```

### Session Recovery Check
**At the start of this skill, always check for existing tasks:**
```
1. Call TaskList to check for existing workflow generator tasks
2. If a "Generate: Multi-User Workflows" task exists with status in_progress:
   - Check which exploration tasks completed (read their metadata for findings)
   - Check if drafts were generated
   - Resume from appropriate phase
3. If no tasks exist, proceed with fresh execution
```

## Process

### Phase 1: Assess Current State

**Create the main workflow generator task:**
```
TaskCreate:
- subject: "Generate: Multi-User Workflows"
- description: |
    Generate comprehensive multi-user workflow documentation.
    Starting: assess current state
- activeForm: "Assessing current state"

TaskUpdate:
- taskId: [main task ID]
- status: "in_progress"
```

1. Check if `/workflows/multi-user-workflows.md` already exists
2. If it exists, read it and note:
   - What workflows are already documented
   - What might be outdated or incomplete
   - What's missing based on your knowledge of the app
3. Ask the user their goal:
   - **Create new:** Generate workflows from scratch
   - **Update:** Add new workflows for new features
   - **Refactor:** Reorganize or improve existing workflows
   - **Audit:** Check existing workflows against current app state

**Update task with assessment results:**
```
TaskUpdate:
- taskId: [main task ID]
- metadata: {
    "existingFile": true/false,
    "existingWorkflowCount": [N],
    "userGoal": "create" | "update" | "refactor" | "audit"
  }
```

### Phase 2: Deep Exploration [DELEGATE TO AGENTS]

**Purpose:** Thoroughly understand the app's multi-user architecture by launching multiple Explore agents in parallel. This saves context and allows comprehensive codebase exploration.

**Create exploration tasks before spawning agents:**
```
TaskCreate (3 tasks in parallel):

Task 1:
- subject: "Explore: Auth & User Roles"
- description: "Find all auth flows, user role definitions, and permission boundaries"
- activeForm: "Exploring auth & roles"

Task 2:
- subject: "Explore: Real-Time & Shared State"
- description: "Find all real-time subscriptions, shared state, and sync patterns"
- activeForm: "Exploring real-time features"

Task 3:
- subject: "Explore: Cross-User Interactions"
- description: "Find all cross-user features like invites, notifications, social, and collaboration"
- activeForm: "Exploring cross-user interactions"

Then for each:
TaskUpdate:
- taskId: [explore task ID]
- addBlockedBy: [main task ID]  # Links to main task
- status: "in_progress"
```

**Use the Task tool to spawn three agents in parallel (all in a single message):**

```
Agent 1 - Auth & User Roles:
Task tool parameters:
- subagent_type: "Explore"
- model: "sonnet"
- prompt: |
    You are exploring a web application to find all authentication, session management, and user role patterns that affect multi-user interactions.

    ## What to Find

    1. **Authentication Flows**
       - Search for auth middleware (e.g., `middleware.ts`, `auth.ts`, route guards)
       - Find login, signup, logout, and password-reset flows
       - Identify token handling (JWT, session cookies, refresh tokens)
       - Note OAuth/SSO providers if present

    2. **User Role Definitions**
       - Grep for role enums or constants: `role`, `admin`, `host`, `guest`, `owner`, `member`, `anonymous`
       - Find RLS (Row Level Security) policies in SQL or ORM config
       - Identify permission checks: `canEdit`, `isOwner`, `hasPermission`, `authorize`
       - Note any role hierarchy (e.g., admin > moderator > member > guest)

    3. **Session Management**
       - Find session creation and validation logic
       - Identify multi-session handling (same user, multiple devices)
       - Note session expiry, invalidation, and refresh patterns
       - Check for impersonation or "act as" features

    4. **User Identity & Profiles**
       - Find user model/schema with relevant fields
       - Identify display name, avatar, and presence indicators
       - Note user-to-user relationship models (friends, contacts, teams)

    ## Search Patterns
    - Files: `**/auth*`, `**/middleware*`, `**/session*`, `**/user*`, `**/role*`, `**/permission*`
    - Grep: `createUser`, `signIn`, `signUp`, `signOut`, `getSession`, `currentUser`, `requireAuth`
    - Grep: `RLS`, `policy`, `row_level`, `check_access`, `permission`
    - Grep: `role`, `admin`, `host`, `guest`, `anonymous`, `owner`, `member`

    ## Return Format

    ```
    ## Auth & User Roles Report

    ### Authentication Flows
    | Flow | Entry Point | Method | Notes |
    |------|-------------|--------|-------|

    ### User Roles
    | Role | Permissions | Defined In |
    |------|------------|------------|

    ### Session Management
    - Session type: [cookie/JWT/etc.]
    - Multi-device support: [yes/no]
    - Key files: [list]

    ### Permission Boundaries
    | Resource | Owner Can | Member Can | Guest Can | Anonymous Can |
    |----------|-----------|------------|-----------|---------------|
    ```
```

```
Agent 2 - Real-Time & Shared State:
Task tool parameters:
- subagent_type: "Explore"
- model: "sonnet"
- prompt: |
    You are exploring a web application to find all real-time features, shared state, and synchronization patterns between multiple users.

    ## What to Find

    1. **Real-Time Subscriptions**
       - Search for Supabase Realtime: `supabase.channel`, `.on('postgres_changes'`, `subscribe()`
       - Find WebSocket connections: `new WebSocket`, `socket.io`, `ws://`, `wss://`
       - Identify Server-Sent Events: `EventSource`, `text/event-stream`
       - Note polling patterns: `setInterval` + fetch, SWR/React Query refetch intervals

    2. **Shared Database Tables**
       - Find tables/collections that multiple users read and write
       - Identify which entities are scoped per-user vs shared
       - Note any shared rooms, spaces, channels, or workspaces
       - Check for collaborative documents or shared lists

    3. **Optimistic Updates & Conflict Resolution**
       - Find optimistic UI patterns: update UI before server confirms
       - Identify conflict resolution: last-write-wins, merge, CRDT
       - Note any retry or rollback logic on failed mutations
       - Check for version numbers or timestamps on records

    4. **Presence & Live Indicators**
       - Find presence systems: online/offline status, typing indicators
       - Identify live cursors, live avatars, or "who's viewing" features
       - Note any activity feeds or real-time notifications

    ## Search Patterns
    - Files: `**/realtime*`, `**/socket*`, `**/channel*`, `**/subscribe*`, `**/sync*`, `**/presence*`
    - Grep: `supabase`, `realtime`, `subscribe`, `channel`, `broadcast`, `presence`
    - Grep: `WebSocket`, `socket.io`, `EventSource`, `onmessage`
    - Grep: `optimistic`, `conflict`, `merge`, `CRDT`, `version`
    - Grep: `setInterval`, `refetch`, `polling`, `stale`

    ## Return Format

    ```
    ## Real-Time & Shared State Report

    ### Real-Time Channels
    | Channel/Subscription | Table/Event | Purpose | File |
    |---------------------|-------------|---------|------|

    ### Shared State
    | Entity | Scope | Read By | Written By | Sync Method |
    |--------|-------|---------|------------|-------------|

    ### Optimistic Updates
    | Action | Optimistic Behavior | Rollback On Failure | File |
    |--------|--------------------|--------------------|------|

    ### Presence Features
    - Online indicators: [yes/no, details]
    - Typing indicators: [yes/no, details]
    - Live cursors: [yes/no, details]
    - Activity feed: [yes/no, details]
    ```
```

```
Agent 3 - Cross-User Interactions:
Task tool parameters:
- subagent_type: "Explore"
- model: "sonnet"
- prompt: |
    You are exploring a web application to find all cross-user interaction features -- places where one user's actions affect another user's experience.

    ## What to Find

    1. **Invitation & Onboarding Flows**
       - Find invite systems: email invites, invite links, invite codes
       - Identify join flows: accept/decline invitation, request to join
       - Note invite-to-signup: invited user creates an account
       - Check for referral or sharing mechanisms

    2. **Social Features**
       - Find friend/follow systems: `follow`, `friend`, `connect`, `request`
       - Identify blocking/privacy: `block`, `mute`, `restrict`, `privacy`
       - Note user search or discovery features
       - Check for user profiles visible to other users

    3. **Notification Systems**
       - Find in-app notifications: toast, notification center, badges
       - Identify push notifications: FCM, APNs, web push
       - Note email notifications: transactional emails, digests
       - Check notification preferences and opt-out

    4. **Content Sharing & Collaboration**
       - Find content sharing: share buttons, public links, embed codes
       - Identify collaborative editing: multiple cursors, comments, suggestions
       - Note chat or messaging features: DMs, group chat, threads
       - Check for reactions, likes, votes, or ratings across users

    5. **Room/Space Management**
       - Find room creation: `createRoom`, `createSpace`, `createChannel`
       - Identify join/leave flows: `joinRoom`, `leaveRoom`, `addMember`
       - Note room settings: visibility, capacity, moderation
       - Check for room roles: host, moderator, participant, viewer

    ## Search Patterns
    - Files: `**/invite*`, `**/notification*`, `**/share*`, `**/chat*`, `**/message*`, `**/room*`, `**/social*`
    - Grep: `invite`, `invitation`, `joinLink`, `inviteCode`, `referral`
    - Grep: `follow`, `friend`, `block`, `mute`, `privacy`
    - Grep: `notification`, `notify`, `toast`, `badge`, `push`, `fcm`
    - Grep: `share`, `collaborate`, `comment`, `react`, `like`, `vote`
    - Grep: `createRoom`, `joinRoom`, `leaveRoom`, `addMember`, `removeMember`
    - Grep: `chat`, `message`, `thread`, `DM`, `direct_message`

    ## Return Format

    ```
    ## Cross-User Interactions Report

    ### Invitation Flows
    | Flow | Mechanism | New User Signup? | File |
    |------|-----------|-----------------|------|

    ### Social Features
    | Feature | Actions | Privacy Controls | File |
    |---------|---------|-----------------|------|

    ### Notification Systems
    | Trigger | In-App | Push | Email | File |
    |---------|--------|------|-------|------|

    ### Content Sharing
    | Content Type | Share Methods | Permissions | File |
    |-------------|---------------|-------------|------|

    ### Room/Space Management
    | Entity | Create | Join | Leave | Roles | File |
    |--------|--------|------|-------|-------|------|
    ```
```

**After each agent returns, update its task:**
```
TaskUpdate:
- taskId: [explore task ID]
- status: "completed"
- metadata: {
    "authFlowsFound": [count],           # For auth agent
    "rolesFound": [count],               # For auth agent
    "realtimeChannelsFound": [count],    # For real-time agent
    "sharedEntitiesFound": [count],      # For real-time agent
    "crossUserFeaturesFound": [count],   # For cross-user agent
    "notificationTypesFound": [count],   # For cross-user agent
    "summary": "[brief summary of findings]"
  }
```

**After all agents return:** Synthesize findings into a multi-user feature inventory:
- List all multi-user interaction points
- Group by interaction type (auth, real-time, social, collaborative)
- Note which features involve 2 users vs N users

**Update main task with exploration summary:**
```
TaskUpdate:
- taskId: [main task ID]
- metadata: {
    "explorationComplete": true,
    "authFlowsFound": [total],
    "realtimeChannelsFound": [total],
    "crossUserFeaturesFound": [total]
  }
```

### Phase 3: Synthesize Findings

**Update main task for synthesis phase:**
```
TaskUpdate:
- taskId: [main task ID]
- activeForm: "Synthesizing multi-user flows"
```

Based on exploration, merge agent reports and identify distinct multi-user workflows:

**Identify Multi-User Journeys by Complexity:**

**Two-User Flows** (User A + User B):
- Authentication isolation (two accounts, separate sessions)
- Invitation and acceptance
- Content sharing from one user to another
- Real-time sync between two users
- Permission boundaries (owner vs viewer)

**Multi-User Flows** (3+ concurrent users):
- Room/space with multiple participants
- Broadcast updates seen by all members
- Role-based visibility within groups
- Moderation and admin actions

**Edge Case Flows** (unusual but critical):
- Simultaneous edits / conflict resolution
- Offline user reconnects and sees missed updates
- User leaves room/space while others remain
- Blocked user attempts interaction
- Invite-to-signup (new user onboarding via invitation link)

**Update main task with journey counts:**
```
TaskUpdate:
- taskId: [main task ID]
- metadata: {
    "twoUserFlows": [count],
    "multiUserFlows": [count],
    "edgeCaseFlows": [count],
    "totalWorkflows": [total]
  }
```

### Phase 4: Generate Workflow Drafts

**Create workflow generation task:**
```
TaskCreate:
- subject: "Generate: Workflow Drafts"
- description: |
    Generate [N] workflow drafts based on exploration findings.
    Two-user: [count], Multi-user: [count], Edge case: [count]
- activeForm: "Generating workflow drafts"

TaskUpdate:
- taskId: [generate task ID]
- addBlockedBy: [main task ID]
- status: "in_progress"
```

For each identified multi-user journey, create a workflow with this structure:

```markdown
## Workflow N: [Descriptive Name]

### Personas
- User A: [Role description] (authenticated/anonymous)
- User B: [Role description] (authenticated/anonymous)

### Prerequisites
- [Setup needed, e.g., "Both users have accounts", "App running at localhost:3000"]

### Steps
1. [User A] Navigate to /path
2. [User A] Click "Button Text" -> expected outcome
3. [User A] Verify: visible assertion
4. [User B] Navigate to /other-path
5. [User B] Enter "value" in field, click "Submit"
6. [User B] Verify: sees expected result
7. [User A] Verify: sees real-time update from User B's action (cross-user sync)
```

**Guidelines for writing multi-user steps:**
- **Always prefix steps with the acting user:** `[User A]`, `[User B]`, etc.
- **Be specific:** "Click the blue 'Add Guest' button in the toolbar" not "Click add"
- **Include cross-user verifications:** After one user mutates, verify the other user sees the update
- **Include expected outcomes:** "Verify the notification badge shows '1'" not just "Check notifications"
- **Use consistent language:** Navigate, Click, Type, Verify, Drag, Select
- **Include wait conditions:** Real-time sync may not be instantaneous -- note where to wait
- **Mark sync checkpoints:** Clearly indicate when steps verify cross-user synchronization

### Phase 5: Present and Iterate (REQUIRED)

**This step is mandatory. Do not write the final file without user approval.**

**Mark generation task as complete:**
```
TaskUpdate:
- taskId: [generate task ID]
- status: "completed"
- metadata: {
    "workflowsGenerated": [count],
    "totalSteps": [count],
    "twoUserWorkflows": [list of names],
    "multiUserWorkflows": [list of names],
    "edgeCaseWorkflows": [list of names]
  }
```

**Create approval task:**
```
TaskCreate:
- subject: "Approval: User Review #1"
- description: |
    Present workflows to user for approval.
    Workflows: [count]
    Awaiting user decision.
- activeForm: "Awaiting user approval"

TaskUpdate:
- taskId: [approval task ID]
- addBlockedBy: [main task ID]
- status: "in_progress"
```

After generating the workflows, use `AskUserQuestion` to get explicit approval:

1. **Present a summary** to the user:
   - Total workflows generated (list each by name)
   - Personas and interaction types covered
   - Any gaps or areas you couldn't fully cover
   - Anything that needs manual verification

2. **Use AskUserQuestion** to ask:
   - "Do these workflows cover all the key multi-user journeys?"
   - Provide options: Approve / Add more workflows / Modify existing / Start over

3. **If user wants additions or changes:**

   **Update approval task as needing changes:**
   ```
   TaskUpdate:
   - taskId: [approval task ID]
   - subject: "Approval: User Review #1 - changes requested"
   - status: "completed"
   - metadata: {"decision": "changes_requested", "feedback": "[user feedback]"}
   ```

   **Create new approval task for next round:**
   ```
   TaskCreate:
   - subject: "Approval: User Review #2"
   - description: |
       Second review round after changes.
       Changes made: [list of changes]
   - activeForm: "Awaiting user approval (round 2)"
   ```

   - Ask specifically what workflows to add or modify
   - Generate the additional/modified workflows
   - Return to step 1 and present updated summary
   - Repeat until user approves

4. **Only after explicit approval:**

   **Update approval task as approved:**
   ```
   TaskUpdate:
   - taskId: [approval task ID]
   - subject: "Approval: User Review #[N] - approved"
   - status: "completed"
   - metadata: {"decision": "approved", "reviewRounds": [N]}
   ```

   Proceed to Phase 6.

**Example AskUserQuestion usage:**

```
Question: "I've identified [N] multi-user workflows covering [areas]. Do these look complete?"
Options:
- "Yes, looks good - write the file"
- "Add more workflows"
- "Modify some workflows"
- "Let me describe what's missing"
```

If user selects "Add more" or "Modify", follow up with another question asking for specifics before proceeding.

### Phase 6: Write Final Document

**Create write task:**
```
TaskCreate:
- subject: "Write: multi-user-workflows.md"
- description: "Write approved workflows to file"
- activeForm: "Writing workflow file"

TaskUpdate:
- taskId: [write task ID]
- status: "in_progress"
```

Structure the final document:

```markdown
# Multi-User Workflows

> Auto-generated multi-user workflow documentation for [App Name]
> Last updated: [Date]

## Quick Reference

| Workflow | Personas | Purpose | Steps |
|----------|----------|---------|-------|
| [Name] | [User A + User B] | [Brief] | [Count] |

---

## Two-User Workflows

### Workflow 1: [Name]
...

## Multi-User Workflows

### Workflow N: [Name]
...

## Edge Case Workflows

### Workflow N: [Name]
...
```

**Write the file to `/workflows/multi-user-workflows.md`**

**Mark write task as complete:**
```
TaskUpdate:
- taskId: [write task ID]
- status: "completed"
- metadata: {"outputPath": "/workflows/multi-user-workflows.md", "workflowCount": [N]}
```

**Mark main task as complete:**
```
TaskUpdate:
- taskId: [main task ID]
- status: "completed"
- metadata: {
    "outputPath": "/workflows/multi-user-workflows.md",
    "workflowCount": [N],
    "reviewRounds": [N],
    "explorationAgents": 3
  }
```

**Final summary from task data:**
```
## Multi-User Workflows Generated

**File:** /workflows/multi-user-workflows.md
**Workflows:** [count from task metadata]
**Review rounds:** [count from approval task metadata]

### Exploration Summary
- Auth flows found: [from explore task metadata]
- Real-time channels found: [from explore task metadata]
- Cross-user features found: [from explore task metadata]

### Workflows Created
[List from generate task metadata]

The workflows are ready to be executed with the multi-user-workflow-executor skill.
```

### Session Recovery

If resuming from an interrupted session:

**Recovery decision tree:**
```
TaskList shows:
├── Main task in_progress, no explore tasks
│   └── Start Phase 2 (deep exploration)
├── Main task in_progress, some explore tasks completed
│   └── Check which agents finished, spawn remaining
├── Main task in_progress, all explore tasks completed, no generate task
│   └── Start Phase 4 (generate workflow drafts)
├── Main task in_progress, generate completed, no approval task
│   └── Start Phase 5 (present and iterate)
├── Main task in_progress, approval task in_progress
│   └── Present summary to user again
├── Main task in_progress, approval completed (approved), no write task
│   └── Start Phase 6 (write file)
├── Main task completed
│   └── Show final summary
└── No tasks exist
    └── Fresh start (Phase 1)
```

**Resuming with partial exploration:**
If some exploration agents completed but others didn't:
1. Read completed agent findings from task metadata
2. Spawn only the missing agents
3. Combine all findings when all complete

**Always inform user when resuming:**
```
Resuming multi-user workflow generation session:
- Exploration: [N]/3 agents complete
- Workflows generated: [count or "pending"]
- Approval: [status]
- Resuming: [next action]
```

## Workflow Categories

When exploring the codebase, look for these common multi-user workflow types:

| Category | What to Look For | Example Workflow |
|----------|-----------------|------------------|
| Authentication & session isolation | Login, signup, sessions | Two users logged in simultaneously see their own data |
| Room/space creation and joining | Room create, join, invite | User A creates room, User B joins via link |
| Real-time content sync | Insert, update, delete + subscription | User A adds item, User B sees it appear in real time |
| Real-time state sync | Queue advance, toggles, counters | User A advances queue, User B sees position update |
| Social features | Friend requests, blocking, invitations | User A sends friend request, User B accepts |
| Notification delivery | In-app, push, email notifications | User B receives notification when User A mentions them |
| Permission boundaries | Role checks, RLS, visibility | User A (admin) sees controls User B (member) does not |
| Conflict resolution | Simultaneous edits, last-write-wins | Both users edit same item, system resolves conflict |
| Leave/rejoin flows | Disconnect, leave room, rejoin | User A leaves room, User B sees them leave, User A rejoins |
| Invite-to-signup | Invite link, new user onboarding | User A invites email, recipient signs up and joins |

## Multi-User Workflow Writing Standards

**Step Types:**

| Action | Format | Example |
|--------|--------|---------|
| Navigation | [User X] Navigate to [URL/page] | [User A] Navigate to the dashboard |
| Click | [User X] Click [specific element] | [User B] Click the "Join Room" button |
| Type | [User X] Type "[text]" in [field] | [User A] Type "Hello team" in the message input |
| Select | [User X] Select "[option]" from [dropdown] | [User B] Select "Viewer" from role dropdown |
| Verify | [User X] Verify [expected state] | [User A] Verify User B's avatar appears in the room |
| Verify Sync | [User X] Verify: sees [state] from [User Y]'s action | [User B] Verify: sees new item added by User A |
| Wait | [User X] Wait for [condition] | [User A] Wait for real-time sync indicator |

**Persona Prefix Convention:**
- Always prefix every step with `[User A]`, `[User B]`, etc.
- Define each persona in the Personas section at the top of each workflow
- Include role (admin, member, guest, anonymous) and authentication state
- Use consistent persona names throughout a workflow

**Cross-User Verification Pattern:**
After any mutation by one user, include a Verify step for the other user(s):
```markdown
5. [User A] Click "Add Item" -> item appears in list
6. [User A] Verify: new item visible in their list
7. [User B] Verify: sees new item appear in real time (cross-user sync)
```

**Example Workflow:**

```markdown
## Workflow 1: Create Room and Invite Another User

### Personas
- User A: Room host (authenticated, admin role)
- User B: Invited member (authenticated, member role)

### Prerequisites
- Both users have existing accounts
- App running at localhost:3000
- Both users logged in with separate browser sessions

### Steps
1. [User A] Navigate to /rooms
2. [User A] Click "Create Room" button
3. [User A] Type "Test Room" in room name field
4. [User A] Click "Create" -> room is created, redirected to /rooms/[id]
5. [User A] Verify: room page loads with "Test Room" title and empty member list
6. [User A] Click "Invite" button in the toolbar
7. [User A] Type User B's email in the invite field
8. [User A] Click "Send Invite" -> invitation sent confirmation appears
9. [User B] Verify: notification badge appears in the header (cross-user sync)
10. [User B] Click the notification bell icon
11. [User B] Verify: sees "You've been invited to Test Room" notification
12. [User B] Click "Accept" on the invitation
13. [User B] Verify: redirected to /rooms/[id], room content visible
14. [User A] Verify: User B's name appears in the member list (cross-user sync)
15. [User A] Verify: member count updates from 1 to 2
```

## Handling Updates

When updating existing multi-user workflows:

1. **Preserve working workflows** - Don't rewrite what works
2. **Mark deprecated steps** - If API or UI changed, note what's outdated
3. **Add new workflows** - Append new multi-user features as new workflows
4. **Version notes** - Add changelog comments for significant changes

## Multi-User Anti-Patterns

When generating workflows, watch for these common multi-user testing anti-patterns and ensure your workflows avoid them:

### Synchronization Anti-Patterns
| Anti-Pattern | Issue | Better Alternative |
|---|---|---|
| No real-time sync verification | Workflows don't verify other users see updates | Add cross-user Verify steps after every mutation |
| Single-user-only testing | Workflows only test one user at a time | Always test with 2+ personas simultaneously |
| Assuming instant sync | Steps assume updates appear immediately | Include Wait steps and verify sync timing |
| No sync failure testing | Missing tests for what happens when sync fails | Add scenarios for network interruption during sync |

### Permission Anti-Patterns
| Anti-Pattern | Issue | Better Alternative |
|---|---|---|
| Missing permission boundaries | No tests for what User B should NOT see | Add negative assertions for unauthorized access |
| Only testing happy-path roles | Only admin role tested | Test every role: admin, member, guest, anonymous |
| No role escalation tests | Missing tests for privilege changes | Test what happens when roles change mid-session |

### Session Anti-Patterns
| Anti-Pattern | Issue | Better Alternative |
|---|---|---|
| Hardcoded user IDs | Tests break when data changes | Use dynamic values from API responses |
| Shared session state | Tests assume clean state | Include setup/teardown for each persona |
| No offline/reconnect testing | Missing network interruption scenarios | Include disconnect/reconnect verification steps |
| No concurrent mutation tests | Only sequential interactions tested | Test simultaneous actions by multiple users |

### Notification Anti-Patterns
| Anti-Pattern | Issue | Better Alternative |
|---|---|---|
| No notification verification | Workflows skip checking if notifications arrive | Verify notification delivery for every cross-user action |
| Only in-app notifications | Push and email notifications untested | Test all configured notification channels |
| No notification preference tests | Missing tests for opt-out behavior | Verify users can control their notification preferences |
