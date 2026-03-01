---
name: multi-user-workflow-to-playwright
description: Translates multi-user workflow markdown files into Playwright E2E tests with multiple browser contexts. Use this when the user says "convert multi-user workflows to playwright", "translate multi-user workflows to CI", "generate multi-user playwright tests", or wants to promote multi-user workflows to automated CI tests with persona-based browser contexts.
---

# Multi-User Workflow to Playwright Skill

You are a senior QA automation engineer. Your job is to translate human-readable multi-user workflow markdown files into Playwright E2E test files that use multiple browser contexts to simulate concurrent users. Each persona in a workflow becomes its own browser context with independent auth and state.

## Task List Integration

**CRITICAL:** This skill uses Claude Code's task list system for progress tracking and session recovery. You MUST use TaskCreate, TaskUpdate, and TaskList tools throughout execution.

### Why Task Lists Matter Here
- **Persona-to-context mapping:** Track which personas have been mapped to browser contexts
- **Selector mapping progress:** Track which workflows have selectors resolved across multiple user views
- **Ambiguous selector tracking:** Each ambiguous selector becomes a blocking task awaiting user input
- **Translation progress:** User sees "3/5 workflows translated"
- **Session recovery:** If interrupted, know which selectors were found and which need resolution
- **Code generation tracking:** Track test generation and user approval

### Task Hierarchy
```
[Main Task] "Translate Multi-User Workflows to Playwright"
  └── [Parse Task] "Parse: multi-user-workflows.md"
  └── [Check Task] "Check: existing e2e/multi-user-workflows.spec.ts"
  └── [Selector Task] "Selectors: discover for all workflows" (agent)
      └── [Ambiguous Task] "Resolve: member count selector" (BLOCKING)
  └── [Generate Task] "Generate: Playwright multi-context tests"
  └── [Approval Task] "Approval: Review generated tests"
  └── [Write Task] "Write: e2e/multi-user-workflows.spec.ts"
```

### Session Recovery Check
**At the start of this skill, always check for existing tasks:**
```
1. Call TaskList to check for existing conversion tasks
2. If a "Translate Multi-User Workflows to Playwright" task exists with status in_progress:
   - Check if parsing completed
   - Check if selector discovery completed (read metadata for mappings)
   - Check for pending ambiguous selector tasks awaiting user input
   - Check if code generation completed
   - Resume from appropriate phase
3. If no tasks exist, proceed with fresh execution
```

## The Translation Pipeline

```
/workflows/multi-user-workflows.md  →  e2e/multi-user-workflows.spec.ts
       (Human-readable)                    (Playwright multi-context tests)
```

## When to Use This Skill

Use when:
- User has refined multi-user workflows via `multi-user-workflow-executor`
- User wants to promote multi-user workflows to CI
- User says "convert multi-user workflows to playwright", "generate multi-user CI tests", "automate multi-user workflows"
- Workflows involve multiple personas interacting with the same app simultaneously (e.g., host/guest, admin/member, sender/receiver)

## Multi-User Playwright Patterns

Multi-user tests differ from single-user tests in several critical ways:

### Persona-to-Context Mapping
Each persona in the workflow becomes a `browser.newContext()` with its own `context.newPage()`. This gives each persona independent cookies, localStorage, and authentication state.

```typescript
// Each persona gets their own isolated browser context
contextA = await browser.newContext()  // Host / Admin / Sender
contextB = await browser.newContext()  // Guest / Member / Receiver
pageA = await contextA.newPage()
pageB = await contextB.newPage()
```

### Cross-Context Assertions
After one user acts, assert the result from the other user's page. This validates real-time sync, notifications, and shared state updates.

```typescript
// User A creates something
await pageA.locator('[data-testid="create-btn"]').click()

// User B should see it appear (with timeout for propagation)
await expect(pageB.getByText('New item')).toBeVisible({ timeout: 10000 })
```

### Real-Time Sync Timeouts
WebSocket, SSE, or polling-based real-time features need extended timeouts. Use `{ timeout: 10000 }` (10 seconds) for assertions that depend on cross-user data propagation.

### API Helper Functions for Preconditions
Multi-user tests often require complex preconditions (user accounts, shared resources). Use API helpers to set up state quickly instead of driving the UI for every prerequisite.

```typescript
// Fast setup via API instead of UI
async function createUserViaAPI(email: string, password: string) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return response.json()
}
```

### Skipping Unreachable Flows
Flows requiring real external services (email delivery, push notifications, SMS) should use `test.skip` with a clear explanation.

## Process

### Phase 1: Parse Workflows

**Create the main conversion task:**
```
TaskCreate:
- subject: "Translate Multi-User Workflows to Playwright"
- description: |
    Translate multi-user workflow markdown to Playwright multi-context E2E tests.
    Source: /workflows/multi-user-workflows.md
    Target: e2e/multi-user-workflows.spec.ts
- activeForm: "Parsing multi-user workflows"

TaskUpdate:
- taskId: [main task ID]
- status: "in_progress"
```

**Create parse task:**
```
TaskCreate:
- subject: "Parse: multi-user-workflows.md"
- description: "Read and parse multi-user workflow file, extract personas and steps"
- activeForm: "Parsing multi-user workflows"

TaskUpdate:
- taskId: [parse task ID]
- addBlockedBy: [main task ID]
- status: "in_progress"
```

1. Read `/workflows/multi-user-workflows.md`
2. If file doesn't exist, inform user and stop
3. Parse all workflows (each starts with `## Workflow:` or `### Workflow:`)
4. For each workflow, extract:
   - Name and description
   - **Personas** (e.g., "Host", "Guest", "Admin", "Member") and their auth requirements
   - Prerequisites (accounts, shared resources, invitations)
   - Numbered steps with **persona attribution** (which user performs each step)
   - Any `[MANUAL]` tagged steps
   - Any cross-user assertions (one user's action verified from another's view)

**Mark parse task complete with workflow inventory:**
```
TaskUpdate:
- taskId: [parse task ID]
- status: "completed"
- metadata: {
    "workflowCount": [N],
    "workflows": [list of names],
    "personas": [list of unique personas across all workflows],
    "totalSteps": [count],
    "crossUserAssertions": [count],
    "manualSteps": [count]
  }
```

### Phase 2: Check for Existing Tests

**Create check task:**
```
TaskCreate:
- subject: "Check: existing e2e/multi-user-workflows.spec.ts"
- description: "Check for existing Playwright tests and determine diff"
- activeForm: "Checking existing tests"

TaskUpdate:
- taskId: [check task ID]
- addBlockedBy: [main task ID]
- status: "in_progress"
```

1. Look for existing `e2e/multi-user-workflows.spec.ts`
2. If exists, parse it to find:
   - Which workflows are already translated
   - Which personas/contexts are defined
   - Timestamps or version markers
3. Determine which workflows need updating (diff strategy):
   - New workflows -> Add
   - Modified workflows -> Update
   - Removed workflows -> Ask user whether to remove tests

**Mark check task complete with diff summary:**
```
TaskUpdate:
- taskId: [check task ID]
- status: "completed"
- metadata: {
    "existingTestFile": true/false,
    "existingWorkflows": [list of names],
    "toAdd": [list of new workflow names],
    "toUpdate": [list of modified workflow names],
    "toRemove": [list of removed workflow names],
    "hasCustomCode": true/false
  }
```

### Phase 3: Explore Codebase for Selectors [DELEGATE TO AGENT]

**Purpose:** For each workflow step, explore the codebase to find reliable selectors. Multi-user workflows may reference elements from different user views (e.g., host dashboard vs. guest join page). Delegate this to an Explore agent to save context.

**Create selector discovery task:**
```
TaskCreate:
- subject: "Selectors: discover for all workflows"
- description: |
    Find Playwright selectors for [N] multi-user workflows, [M] total steps.
    Personas: [list of personas]
    Priority: data-testid > getByRole > getByText > getByTestId > CSS
- activeForm: "Discovering selectors"

TaskUpdate:
- taskId: [selector task ID]
- addBlockedBy: [main task ID]
- status: "in_progress"
```

**Use the Task tool to spawn an Explore agent:**

```
Task tool parameters:
- subagent_type: "Explore"
- model: "sonnet" (balance of speed and thoroughness)
- prompt: |
    You are finding reliable Playwright selectors for multi-user workflow steps.
    Multiple personas interact with the app, so elements may appear in different
    views or components depending on the user's role.

    ## Workflows to Find Selectors For
    [Include parsed workflow steps with persona attribution]

    ## What to Search For

    For each step, find the BEST available selector using this priority:

    **Selector Priority (best to worst):**
    1. data-testid="..."     <- Most stable, explicitly for testing
    2. getByRole("...")      <- Accessible and semantic
    3. getByText("...")      <- Readable but fragile if text changes
    4. getByTestId("...")    <- Alias for data-testid patterns
    5. CSS selector          <- Last resort, very fragile

    ## Search Strategy

    1. **Component Selectors**
       - Use Grep to search for React/Vue component names mentioned in steps
       - Find data-testid attributes: `data-testid=`
       - Search for role-based patterns: `role=`, `aria-label=`

    2. **Persona-Specific Views**
       - Host/Admin views may have different components than Guest/Member views
       - Search for role-based rendering (e.g., `isAdmin`, `isHost`, `role ===`)
       - Identify shared vs. persona-specific components

    3. **Real-Time Elements**
       - Search for elements that update via WebSocket/SSE
       - Find counters, presence indicators, live feeds
       - These need extended timeout selectors

    4. **Text-Based Selectors**
       - Match button text to actual button implementations
       - Find aria-labels: `aria-label=`
       - Locate placeholder text for inputs

    ## Return Format

    Return a structured mapping:
    ```
    ## Selector Mapping

    ### Workflow: [Name]

    | Step | Persona | Element Description | Recommended Selector | Confidence | Notes |
    |------|---------|---------------------|---------------------|------------|-------|
    | 1.1  | Host    | Create button       | [data-testid="create-btn"] | High | Found in HostDashboard.tsx:45 |
    | 2.1  | Guest   | Join link           | getByRole("link", { name: "Join" }) | High | Found in JoinPage.tsx:23 |
    | 3.1  | Host    | Member count        | getByText(/\d+ watching/) | Medium | Dynamic text, regex needed |

    ### Ambiguous Selectors (need user input)
    - Step 3.2 "member count selector": Found multiple matches:
      1. [data-testid="member-count"] in HostView.tsx
      2. [data-testid="viewer-count"] in SharedHeader.tsx
      - Recommendation: Ask user which one

    ### Missing Selectors (not found)
    - Step 4.1 "notification badge": Could not find element, may need manual inspection
    ```
```

**After agent returns:**

**Update selector task with findings:**
```
TaskUpdate:
- taskId: [selector task ID]
- status: "completed"
- metadata: {
    "selectorsFound": [count],
    "highConfidence": [count],
    "mediumConfidence": [count],
    "ambiguous": [count],
    "missing": [count]
  }
```

### Phase 4: Resolve Ambiguities

**For each ambiguous selector, create a BLOCKING resolution task:**
```
For each ambiguous selector:

TaskCreate:
- subject: "Resolve: [element description] selector"
- description: |
    Step [N.M] (Persona: [persona]): "[step text]"
    Found multiple matches:
    1. [selector option 1] (in [file])
    2. [selector option 2] (in [file])
    Awaiting user decision.
- activeForm: "Awaiting selector choice"

TaskUpdate:
- taskId: [resolve task ID]
- addBlockedBy: [selector task ID]
- status: "in_progress"
```

**Ask user to resolve ambiguous selectors:**
Present each ambiguous selector to the user. After user responds:
```
TaskUpdate:
- taskId: [resolve task ID]
- status: "completed"
- metadata: {"chosenSelector": "[user's choice]", "reason": "[if provided]"}
```

Use the selector mapping to generate accurate Playwright test code. For missing selectors, flag for manual verification with TODO comments.

### Phase 5: Generate Spec File [DELEGATE TO AGENT]

**Purpose:** Generate the Playwright test file using the multi-context pattern. Delegate to an agent for focused code generation.

**Create code generation task:**
```
TaskCreate:
- subject: "Generate: Playwright multi-context tests"
- description: |
    Generate e2e/multi-user-workflows.spec.ts from workflows and selector mapping.
    Workflows: [count]
    Personas: [list]
    Selectors resolved: [count]
    Ambiguous resolved: [count]
- activeForm: "Generating Playwright multi-context tests"

TaskUpdate:
- taskId: [generate task ID]
- addBlockedBy: [main task ID]
- status: "in_progress"
```

**Use the Task tool to spawn a code generation agent:**

```
Task tool parameters:
- subagent_type: "general-purpose"
- model: "sonnet" (good balance for code generation)
- prompt: |
    You are generating a Playwright E2E test file for multi-user workflows using
    multiple browser contexts.

    ## Input Data

    **Workflows:**
    [Include parsed workflow data with persona attribution]

    **Selector Mapping:**
    [Include selector mapping from Phase 3 agent]

    **Existing Test File (if updating):**
    [Include existing test content if this is an update, or "None - new file"]

    ## Your Task

    Generate `e2e/multi-user-workflows.spec.ts` following the multi-context pattern below.

    ## Multi-Context Test Pattern

    Each workflow becomes a `test.describe` block with:
    - `beforeEach`: creates browser contexts per persona, sets up auth
    - `afterEach`: closes all contexts
    - Tests that switch between pages (pageA, pageB, etc.)
    - Cross-context assertions with extended timeouts

    ## Code Style Requirements

    - Use the recommended selectors from the mapping
    - Add comments for each substep with persona attribution
    - Include API helper functions for precondition setup
    - Mark ambiguous selectors with TODO comments
    - Use { timeout: 10000 } for cross-user sync assertions
    - Follow Playwright best practices

    ## Handle Special Cases

    - [MANUAL] steps -> `test.skip()` with explanation
    - Ambiguous selectors -> Use best guess + TODO comment
    - Missing selectors -> Use descriptive text selector + TODO
    - External service steps (email, push) -> `test.skip()` with explanation
    - Steps needing prior state -> Add setup within test or use API helpers

    ## Return Format

    Return the complete test file content ready to write.
    Also return a summary:
    ```
    ## Generation Summary
    - Workflows: [count]
    - Total tests: [count]
    - Personas: [list]
    - Skipped (manual/external): [count]
    - TODOs for review: [count]
    ```
```

**After agent returns:**

**Update generation task with summary:**
```
TaskUpdate:
- taskId: [generate task ID]
- status: "completed"
- metadata: {
    "workflowsTranslated": [count],
    "totalTests": [count],
    "personas": [list],
    "skippedManual": [count],
    "todosForReview": [count],
    "linesOfCode": [count]
  }
```

Review any TODOs with the user before writing the file.

## Generated Test Structure

The generated test file follows this multi-context pattern:

```typescript
/**
 * Multi-User Workflow Tests
 *
 * Auto-generated from /workflows/multi-user-workflows.md
 * Generated: [timestamp]
 *
 * To regenerate: Run multi-user-workflow-to-playwright skill
 * To update workflows: Edit /workflows/multi-user-workflows.md and re-run
 */

import { test, expect, BrowserContext, Page } from '@playwright/test'

// ============================================================================
// API HELPERS
// Use these to set up preconditions quickly instead of driving the UI
// ============================================================================

async function createUserViaAPI(email: string, password: string) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return response.json()
}

async function loginViaAPI(page: Page, email: string, password: string) {
  // TODO: Replace with your app's auth mechanism
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const { token } = await response.json()
  await page.evaluate((t) => localStorage.setItem('token', t), token)
}

// ============================================================================
// WORKFLOW: Party Create and Join
// Generated from: multi-user-workflows.md
// Last updated: [timestamp]
// ============================================================================

test.describe('Multi-User: Party Create and Join', () => {
  let contextA: BrowserContext
  let contextB: BrowserContext
  let pageA: Page
  let pageB: Page

  test.beforeEach(async ({ browser }) => {
    // Create isolated browser contexts for each persona
    contextA = await browser.newContext()
    contextB = await browser.newContext()
    pageA = await contextA.newPage()
    pageB = await contextB.newPage()

    // Auth setup per persona
    // TODO: Replace with actual auth for your app
    await loginViaAPI(pageA, 'host@example.com', 'password')
    await loginViaAPI(pageB, 'guest@example.com', 'password')
  })

  test.afterEach(async () => {
    await contextA.close()
    await contextB.close()
  })

  test('Step 1: Host creates a party', async () => {
    // Substep: Host navigates to create page
    await pageA.goto('/create')

    // Substep: Host fills in party details
    await pageA.locator('[data-testid="party-name"]').fill('Test Party')

    // Substep: Host clicks create
    await pageA.locator('[data-testid="create-btn"]').click()

    // Substep: Verify party page loads
    await expect(pageA.getByText('Test Party')).toBeVisible()
  })

  test('Step 2: Guest joins the party', async () => {
    // Setup: Host creates a party first (independent test)
    await pageA.goto('/create')
    await pageA.locator('[data-testid="party-name"]').fill('Test Party')
    await pageA.locator('[data-testid="create-btn"]').click()

    // Substep: Guest navigates to join page
    await pageB.goto('/join')

    // Substep: Guest searches for the party
    await pageB.locator('[data-testid="search-input"]').fill('Test Party')

    // Substep: Guest clicks join
    await pageB.locator('[data-testid="join-btn"]').click()

    // Substep: Verify guest sees the party
    await expect(pageB.getByText('Test Party')).toBeVisible()
  })

  test('Step 3: Host sees updated member count', async () => {
    // Setup: Create party and have guest join
    await pageA.goto('/create')
    await pageA.locator('[data-testid="party-name"]').fill('Test Party')
    await pageA.locator('[data-testid="create-btn"]').click()
    await pageB.goto('/join')
    await pageB.locator('[data-testid="search-input"]').fill('Test Party')
    await pageB.locator('[data-testid="join-btn"]').click()

    // Substep: Host checks member count (cross-context assertion)
    // Extended timeout for real-time sync propagation
    await expect(pageA.getByText('2 watching')).toBeVisible({ timeout: 10000 })
  })

  test.skip('Step 4: Guest receives email notification', async () => {
    // SKIP: Requires real email delivery service
    // Original: "Guest receives a confirmation email with party details"
  })
})

// ============================================================================
// WORKFLOW: [Next Workflow Name]
// ============================================================================

// test.describe('Multi-User: [Next Name]', () => {
//   // ... follows same pattern
// })
```

## Selector Priority

When choosing selectors for multi-user workflow elements, follow this priority order:

| Priority | Selector Type | Example | When to Use |
|----------|--------------|---------|-------------|
| 1 (Best) | `data-testid` | `[data-testid="create-btn"]` | Most stable, explicitly for testing |
| 2 | `getByRole` | `getByRole('button', { name: 'Create' })` | Semantic and accessible |
| 3 | `getByText` | `getByText('2 watching')` | Readable but fragile if text changes |
| 4 | `getByTestId` | `getByTestId('member-count')` | Alias for data-testid patterns |
| 5 (Worst) | CSS selector | `.member-count-badge` | Last resort, very fragile |

For dynamic text (counters, timestamps), prefer regex patterns:
```typescript
await expect(pageA.getByText(/\d+ watching/)).toBeVisible({ timeout: 10000 })
```

### Phase 6: User Approval

**Create approval task:**
```
TaskCreate:
- subject: "Approval: Review generated tests"
- description: |
    Review generated Playwright multi-context tests before writing.
    Tests: [count]
    Personas: [list]
    TODOs: [count]
    Awaiting user approval.
- activeForm: "Awaiting test approval"

TaskUpdate:
- taskId: [approval task ID]
- addBlockedBy: [main task ID]
- status: "in_progress"
```

Before writing the file:

1. **Show translation summary (from task metadata):**
   ```
   Workflows to translate: 5 (from parse task metadata)
   - Workflow A: 8 steps (7 translated, 1 manual) — Personas: Host, Guest
   - Workflow B: 6 steps (6 translated) — Personas: Admin, Member
   - Workflow C: 10 steps (8 translated, 2 need selector help) — Personas: Sender, Receiver

   Selectors: [from selector task metadata]
   - High confidence: [count]
   - Medium confidence: [count]
   - Resolved by user: [count from resolve tasks]

   Tests generated: [from generate task metadata]
   - Total tests: [count]
   - Skipped (manual/external): [count]
   - TODOs for review: [count]
   - Cross-user assertions: [count]
   ```

2. **Any remaining ambiguous selectors** should have been resolved via resolve tasks in Phase 4.
   If any were skipped, ask now.

3. **Confirm before writing:**
   - Show diff if updating existing file (from check task metadata)
   - List any workflows being added/removed
   - Get explicit approval

**After user approves:**
```
TaskUpdate:
- taskId: [approval task ID]
- status: "completed"
- metadata: {"decision": "approved"}
```

## Phase 7: Write

**Create write task and write the file:**
```
TaskCreate:
- subject: "Write: e2e/multi-user-workflows.spec.ts"
- description: "Write approved Playwright multi-context test file"
- activeForm: "Writing test file"

TaskUpdate:
- taskId: [write task ID]
- status: "in_progress"
```

**Write the file to `e2e/multi-user-workflows.spec.ts`**

**Mark write task complete:**
```
TaskUpdate:
- taskId: [write task ID]
- status: "completed"
- metadata: {"outputPath": "e2e/multi-user-workflows.spec.ts", "testsWritten": [count]}
```

**Mark main task complete:**
```
TaskUpdate:
- taskId: [main task ID]
- status: "completed"
- metadata: {
    "outputPath": "e2e/multi-user-workflows.spec.ts",
    "workflowsTranslated": [count],
    "totalTests": [count],
    "personas": [list],
    "skippedManual": [count],
    "selectorsResolved": [count],
    "ambiguousResolved": [count],
    "crossUserAssertions": [count]
  }
```

**Final summary from task data:**
```
## Multi-User Playwright Tests Generated

**Output:** e2e/multi-user-workflows.spec.ts
**Workflows:** [from parse task] -> [from generate task] tests
**Personas:** [from parse task metadata]

### Translation Summary
| Workflow | Personas | Steps | Tests | Manual | TODOs |
|----------|----------|-------|-------|--------|-------|
[Generated from task metadata]

### Selector Resolution
- High confidence: [from selector task]
- User-resolved: [count of completed resolve tasks]
- Missing (TODO): [from selector task]

### Next Steps
1. Run tests: `npx playwright test e2e/multi-user-workflows.spec.ts`
2. Review any TODO comments in the file
3. Verify API helper functions match your app's auth endpoints
4. Add to CI pipeline

The multi-context tests are ready to run with Playwright.
```

## Handling Updates

When updating existing tests:

1. **Parse existing test file** to extract:
   - Workflow names and their test blocks
   - Persona-to-context mappings
   - Any custom modifications (marked with `// CUSTOM:`)

2. **Compare with workflow markdown:**
   - Hash each workflow's content to detect changes
   - Track workflow names for additions/removals
   - Detect persona changes (added/removed personas)

3. **Update strategy:**
   ```
   Workflow in MD | Workflow in Tests | Action
   ---------------|-------------------|--------
   Present        | Missing           | ADD new test block
   Present        | Present (same)    | SKIP (no change)
   Present        | Present (diff)    | UPDATE test block
   Missing        | Present           | ASK user: remove or keep?
   ```

4. **Preserve custom code:**
   - Look for `// CUSTOM:` comments
   - Keep custom assertions, API helpers, or setup
   - Warn user if custom code conflicts with updates
   - Preserve custom API helper functions at the top of the file

## Anti-Patterns

Avoid these common mistakes when generating multi-user Playwright tests:

### 1. Sharing Contexts Between Personas
```typescript
// BAD: Both users share the same context (shared cookies/auth)
const page1 = await context.newPage()
const page2 = await context.newPage()

// GOOD: Each user gets their own context
contextA = await browser.newContext()
contextB = await browser.newContext()
pageA = await contextA.newPage()
pageB = await contextB.newPage()
```

### 2. Missing Sync Timeouts on Cross-User Assertions
```typescript
// BAD: Default timeout too short for real-time propagation
await expect(pageA.getByText('2 watching')).toBeVisible()

// GOOD: Extended timeout for WebSocket/SSE/polling propagation
await expect(pageA.getByText('2 watching')).toBeVisible({ timeout: 10000 })
```

### 3. Forgetting to Close Contexts in afterEach
```typescript
// BAD: Context leak causes flaky tests and resource exhaustion
test.afterEach(async () => {
  // nothing here
})

// GOOD: Always close all contexts
test.afterEach(async () => {
  await contextA.close()
  await contextB.close()
})
```

### 4. UI-Driven Precondition Setup for Every Test
```typescript
// BAD: Slow, fragile, repeats UI flows for setup
test('guest joins', async () => {
  // 20 lines of UI steps to create user, login, create party...
  await pageA.goto('/register')
  await pageA.fill('[name="email"]', 'host@example.com')
  // ... many more UI steps ...
})

// GOOD: Use API helpers for fast precondition setup
test('guest joins', async () => {
  const party = await createPartyViaAPI('host-token', 'Test Party')
  await pageB.goto(`/join/${party.code}`)
  // Test only the guest join flow
})
```

### 5. Testing External Service Delivery
```typescript
// BAD: Trying to assert on email/push/SMS delivery
await expect(pageB.getByText('Email received')).toBeVisible()

// GOOD: Skip flows requiring real external services
test.skip('guest receives email notification', async () => {
  // SKIP: Requires real email delivery service
  // Test email content via unit tests instead
})
```

### 6. Hardcoded User Credentials in Test Body
```typescript
// BAD: Credentials scattered across tests
test('host creates', async () => {
  await pageA.fill('[name="email"]', 'host@example.com')
  await pageA.fill('[name="password"]', 'secret123')
})

// GOOD: Centralized auth via API helpers or test fixtures
test.beforeEach(async ({ browser }) => {
  await loginViaAPI(pageA, TEST_USERS.host.email, TEST_USERS.host.password)
  await loginViaAPI(pageB, TEST_USERS.guest.email, TEST_USERS.guest.password)
})
```

### 7. Sequential Page Actions Without Waiting
```typescript
// BAD: Race condition between users
await pageA.locator('[data-testid="send-btn"]').click()
await pageB.locator('[data-testid="message"]').click()  // May not exist yet

// GOOD: Wait for cross-user propagation before acting
await pageA.locator('[data-testid="send-btn"]').click()
await expect(pageB.locator('[data-testid="message"]')).toBeVisible({ timeout: 10000 })
await pageB.locator('[data-testid="message"]').click()
```

## Session Recovery

If resuming from an interrupted session:

**Recovery decision tree:**
```
TaskList shows:
├── Main task in_progress, no parse task
│   └── Start Phase 1 (parse workflows)
├── Main task in_progress, parse completed, no check task
│   └── Start Phase 2 (check existing tests)
├── Main task in_progress, check completed, no selector task
│   └── Start Phase 3 (selector discovery)
├── Main task in_progress, selector completed, resolve tasks pending
│   └── Phase 4: Ask user to resolve remaining ambiguous selectors
├── Main task in_progress, all resolve tasks completed, no generate task
│   └── Start Phase 5 (code generation)
├── Main task in_progress, generate completed, no approval task
│   └── Start Phase 6 (user review)
├── Main task in_progress, approval completed, no write task
│   └── Phase 7: Write the file
├── Main task completed
│   └── Show final summary
└── No tasks exist
    └── Fresh start (Phase 1)
```

**Resuming with partial selector resolution:**
If some ambiguous selector tasks are completed but others pending:
1. Read completed resolve tasks to get user's selector choices
2. Present remaining ambiguous selectors to user
3. Continue after all resolved

**Always inform user when resuming:**
```
Resuming multi-user Playwright conversion session:
- Workflows parsed: [count from parse task]
- Personas found: [list from parse task]
- Existing tests: [from check task]
- Selectors found: [from selector task]
- Ambiguous resolved: [count completed resolve tasks]/[total]
- Code generated: [yes/no from generate task]
- Resuming: [next action]
```

## Selector Discovery Prompts

When exploring the codebase for multi-user workflows, use these search patterns:

**For persona-specific elements:**
```
Search: component name + persona role (e.g., "HostDashboard", "GuestView")
Look for: data-testid, role-based rendering, conditional displays
```

**For real-time elements:**
```
Search: "WebSocket" OR "SSE" OR "useSubscription" OR "onMessage"
Look for: Live counters, presence indicators, notification badges
```

**For shared state elements:**
```
Search: "members" OR "participants" OR "viewers" OR "count"
Look for: data-testid on counter elements, dynamic text patterns
```

**For buttons:**
```
Search: "button" + "[text from workflow]"
Look for: data-testid, aria-label, className, onClick handler name
```

**For inputs:**
```
Search: "input" + "[field name]" OR "TextField" + "[label]"
Look for: name, id, placeholder, aria-label, data-testid
```

## Error Handling

If translation fails:

1. **Missing workflow file:** Inform user, suggest running multi-user-workflow-generator first
2. **Unparseable workflow:** Show which workflow failed, ask for clarification
3. **No selectors found:** List the step and persona, ask user for selector
4. **Conflicting selectors:** Show options, let user choose
5. **Persona auth unclear:** Ask user how each persona authenticates
6. **Playwright not configured:** Offer to set up Playwright config

## Output Files

Primary output:
- `e2e/multi-user-workflows.spec.ts` - The generated multi-context test file

Optional outputs:
- `e2e/multi-user-workflows.helpers.ts` - Extracted API helper functions for reuse
- `.claude/multi-user-workflow-test-mapping.json` - Mapping of workflows to tests for diff tracking
