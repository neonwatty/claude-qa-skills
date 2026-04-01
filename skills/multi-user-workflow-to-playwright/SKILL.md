---
name: multi-user-workflow-to-playwright
description: Converts multi-user workflow markdown into a self-contained Playwright test project with per-persona authentication, multi-context test patterns, and CI workflow. Use when the user says "convert multi-user workflows to playwright", "translate multi-user workflows to CI", or "generate multi-user playwright tests".
---

# Multi-User Workflow to Playwright Converter

You are a senior QA automation engineer converting human-readable multi-user workflow documentation into a self-contained Playwright test project with per-persona authentication and multi-browser-context test patterns. Your job is to read workflows from `/workflows/multi-user-workflows.md`, parse persona metadata, translate every persona-tagged step into idiomatic Playwright code using separate browser contexts, and produce a fully functional test project at `e2e/multi-user/` that includes per-persona auth setup, multi-project configuration, CI configuration, and Vercel deployment protection headers.

Every generated test must be runnable out of the box with `cd e2e/multi-user && npm ci && npx playwright test`.

---

## Task List Integration

Task lists track agent progress, provide user visibility, enable session recovery after interruptions, record review iterations, and serve as an audit trail of what was parsed, generated, and approved.

### Task Hierarchy

Every run of this skill creates the following task tree. Tasks are completed in order.

```
[Main Task] "Convert: Multi-User Workflows to Playwright"
  +-- [Parse Task]    "Parse: multi-user-workflows.md"
  +-- [Check Task]    "Check: Existing e2e/multi-user/ project"
  +-- [Selector Task] "Selectors: Find for all workflows"   (agent)
  +-- [Generate Task] "Generate: Playwright project"
  +-- [Approval Task] "Approval: Review generated tests"
  +-- [Write Task]    "Write: e2e/multi-user/"
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

## The Translation Pipeline

This skill reads a single input file and produces a complete test project with per-persona authentication.

```
/workflows/multi-user-workflows.md  ->  e2e/multi-user/
                                          +-- playwright.config.ts
                                          +-- package.json
                                          +-- tests/
                                          |   +-- admin.setup.ts
                                          |   +-- user.setup.ts
                                          |   +-- host.setup.ts
                                          |   +-- guest1.setup.ts
                                          |   +-- ...  (one per persona)
                                          |   +-- workflows.spec.ts
                                          +-- .github/workflows/e2e.yml
                                          +-- .gitignore
```

Every file in the output is self-contained. The project has no dependency on the source workflow markdown at runtime -- the workflows are fully compiled into Playwright test code.

---

## Phase 1: Parse Workflows

Read the workflow markdown file, extract each workflow with its persona metadata, and build an internal representation that drives all subsequent phases.

### Step 1: Locate the Workflow File

Use Glob to search for the workflow file:

```
Glob patterns:
  - workflows/multi-user-workflows.md
  - workflows/concurrent-workflows.md
  - workflows/collaboration-workflows.md
```

If no file is found, stop and inform the user:

```
No multi-user workflow file found at /workflows/multi-user-workflows.md.
Please run "generate multi-user workflows" first, or provide the path
to your workflow file.
```

### Step 2: Read and Parse

Read the entire workflow file. For each workflow, extract:

1. **Workflow number** -- from the `## Workflow [N]:` heading
2. **Workflow name** -- the descriptive name after the number
3. **Auth requirement** -- from `<!-- auth: required -->` or `<!-- auth: no -->`
4. **Priority** -- from `<!-- priority: core -->`, `<!-- priority: feature -->`, or `<!-- priority: edge -->`
5. **Personas** -- from `<!-- personas: Admin, Host, Guest1 -->` (comma-separated list)
6. **Estimated steps** -- from `<!-- estimated-steps: N -->`
7. **Sync points** -- from `<!-- sync-points: N -->`
8. **Deprecated flag** -- from `<!-- deprecated: true -->` (skip deprecated workflows)
9. **Preconditions** -- the bullet list under `**Preconditions:**`
10. **Steps** -- each numbered step with its `[PersonaName]` tag and verification sub-steps
11. **Postconditions** -- the bullet list under `**Postconditions:**`

### Step 3: Parse the Persona Registry

Near the top of the workflow file, extract the Persona Registry table and build a Persona Map. For each persona, derive:

- `contextVar`: lowercased persona name + `Ctx` (e.g., `adminCtx`, `guest1Ctx`)
- `pageVar`: lowercased persona name + `Page` (e.g., `adminPage`, `guest1Page`)
- `authFile`: `playwright/.auth/<lowercase-persona>.json`
- `setupFile`: `<lowercase-persona>.setup.ts`
- `emailVar` / `passwordVar`: from the `Credential Env Vars` column (e.g., `ADMIN_EMAIL` / `ADMIN_PASSWORD`)

### Step 4: Build Internal Representation

Organize workflows into a structured list. Each workflow entry includes: number, name, auth flag, priority, personas list, steps (each with a `persona` field, `action`, `verify`, optional `syncVerify` boolean, and `syncTimeout` in ms), preconditions, and postconditions.

Each step's `persona` field is extracted from the `[PersonaName]` tag prefix (e.g., `[Admin]` -> `persona: "Admin"`).

Skip any workflow marked `<!-- deprecated: true -->`. Log skipped workflows to the user:

```
Parsed 20 workflows from multi-user-workflows.md.
Skipped 1 deprecated workflow: #9 (Legacy Shared Calendar).
Converting 19 active workflows.
Personas found: Admin, Host, Guest1, Guest2, Guest3, Viewer (6 total).
```

### Step 5: Create Tasks

Create the main task `"Convert: Multi-User Workflows to Playwright"` (in_progress) with metadata for source file, workflow counts, persona list, and output path. Create the parse task `"Parse: multi-user-workflows.md"` (completed) with metadata for workflow counts by priority, persona count, and sync point total.

---

## Phase 2: Check Existing Project

Before generating, check whether an `e2e/multi-user/` directory already exists.

### Step 1: Check for Existing Files

Use Glob to check for existing project files:

```
Glob patterns:
  - e2e/multi-user/playwright.config.ts
  - e2e/multi-user/package.json
  - e2e/multi-user/tests/*.spec.ts
  - e2e/multi-user/tests/*.setup.ts
```

### Step 2: Determine Strategy

**If no existing project is found:**
- Proceed with fresh generation.
- No further decisions needed.

**If an existing project is found:**
- Read the existing `tests/workflows.spec.ts` to understand what is already covered.
- Read existing `tests/*.setup.ts` files to identify current persona setup files.
- Use `AskUserQuestion` to determine the user's intent:

```
I found an existing Playwright project at e2e/multi-user/ with [N] existing
test blocks and [M] persona setup files.

How would you like to proceed?

1. **Overwrite** -- Replace all generated files with fresh output
2. **Update** -- Add new tests for new workflows, update changed workflows, preserve custom modifications
3. **Cancel** -- Stop and keep existing files unchanged
```

### Step 3: Create the Check Task

Create `"Check: Existing e2e/multi-user/ project"` (completed) with metadata for existing project status, test count, persona setup file count, and chosen strategy.

---

## Phase 3: Selector Discovery [DELEGATE TO AGENT]

Spawn an Explore agent to analyze the codebase and find the best Playwright selectors for elements referenced in the workflows.

### Step 1: Create the Task and Spawn Agent

Create `"Selectors: Find for all workflows"` (in_progress).

### Step 2: Spawn the Explore Agent

Spawn via the Task tool with the following parameters:

```
Task tool:
  subagent_type: "Explore"
  model: "sonnet"
  prompt: |
    You are a QA exploration agent focused on finding Playwright selectors.

    Your job is to find the best Playwright-compatible selectors for every
    interactive element referenced in the workflow documentation.
    Use Read, Grep, and Glob to explore the codebase. Do NOT use any browser tools.

    Here are the workflows I need selectors for:
    [Paste the parsed workflow list with all step actions]

    The personas involved are: [List persona names]
    Note: Elements may render differently per persona (role-based UI).
    When searching, look for conditional rendering based on roles.

    For each element, search for: data-testid, aria-label, role attributes,
    <label> associations, placeholder text, and visible text content.
    Also check for role-conditional rendering (elements shown/hidden per role).

    Prefer selectors in this order (Playwright recommended):
    1. getByRole  2. getByLabel  3. getByPlaceholder
    4. getByText  5. getByTestId  6. CSS selector (last resort)

    Return findings as:

    ## Selector Map
    | Workflow | Step | Persona | Element Description | Recommended Selector | Fallback Selector |
    |----------|------|---------|--------------------|--------------------|-------------------|
    | 1 | 2 | Admin | "Invite Member" button | getByRole('button', { name: 'Invite Member' }) | getByTestId('invite-btn') |

    ## Role-Conditional Elements
    - Elements that render differently per persona (e.g., edit button visible to Admin but not Viewer)

    ## Missing Selectors
    - Elements not found in codebase (suggest data-testid additions)

    ## Selector Quality Report
    - Counts by selector type and elements not found
```

### Step 3: Process Agent Results

When the Explore agent returns, merge its Selector Map into the internal workflow representation. Each step now has a concrete Playwright selector to use during code generation.

Update the task to completed with metadata for selector counts by type, missing count, and role-conditional element count.

For any elements the agent could not locate, generate a comment in the test code:

```typescript
// TODO: Add data-testid for this element -- selector not found in codebase
await adminPage.locator('[data-testid="unknown-element"]').click();
```

---

## Phase 4: Generate Playwright Project

This is the core generation phase. Generate ALL project files using the parsed workflows, discovered selectors, Persona Map, and configuration templates.

### Step 1: Create the Generation Task

Create `"Generate: Playwright project"` (in_progress).

### Step 2: Generate playwright.config.ts

Generate the Playwright configuration file with a multi-project setup. Each persona gets its own setup project, and the main test project depends on ALL persona setup projects. Tests do NOT use a `storageState` in the project config because each test creates its own per-persona browser contexts.

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'html' : [['list'], ['html']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    extraHTTPHeaders: {
      ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET && {
        'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
        'x-vercel-set-bypass-cookie': 'samesitenone',
      }),
    },
  },
  projects: [
    { name: 'admin-setup', testMatch: /admin\.setup\.ts/ },
    { name: 'host-setup', testMatch: /host\.setup\.ts/ },
    { name: 'guest1-setup', testMatch: /guest1\.setup\.ts/ },
    { name: 'guest2-setup', testMatch: /guest2\.setup\.ts/ },
    { name: 'guest3-setup', testMatch: /guest3\.setup\.ts/ },
    { name: 'viewer-setup', testMatch: /viewer\.setup\.ts/ },
    {
      name: 'multi-user-tests',
      testDir: './tests',
      testMatch: /workflows\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: [
        'admin-setup',
        'host-setup',
        'guest1-setup',
        'guest2-setup',
        'guest3-setup',
        'viewer-setup',
      ],
    },
  ],
});
```

Key configuration decisions: `fullyParallel: false` because multi-user tests share state and must run sequentially within a workflow. Each persona has a dedicated setup project that runs its auth flow and saves storage state. The main `multi-user-tests` project depends on ALL persona setup projects so auth is guaranteed complete before tests begin. Tests do NOT declare `storageState` at the project level because each test creates multiple browser contexts with per-persona auth files. Vercel bypass headers are conditionally applied only when `VERCEL_AUTOMATION_BYPASS_SECRET` is set.

When generating for a specific project, include only the personas that appear in the Persona Registry. The example above shows six personas; the actual count will vary.

### Step 3: Generate Per-Persona Setup Files

For EACH persona in the Persona Map, generate a dedicated setup file at `tests/<persona>.setup.ts`. Every setup file follows the same pattern but uses the persona's specific credential environment variables and auth file path.

Template for each persona:

```typescript
import { test as setup } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = 'playwright/.auth/<persona-lowercase>.json';

setup('authenticate as <persona-name>', async ({ page }) => {
  // Check for saved profile from /setup-profiles
  const profilePath = path.join(process.cwd(), '.playwright', 'profiles', '<persona-lowercase>.json');
  if (fs.existsSync(profilePath)) {
    const state = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify(state));
    return;
  }

  // Fall back to env-var credentials
  if (!process.env.<PERSONA_EMAIL_VAR> || !process.env.<PERSONA_PASSWORD_VAR>) {
    await page.context().storageState({ path: authFile });
    return;
  }
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.<PERSONA_EMAIL_VAR>);
  await page.getByLabel('Password').fill(process.env.<PERSONA_PASSWORD_VAR>);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL('**/dashboard');
  await page.context().storageState({ path: authFile });
});
```

Concrete example for `tests/admin.setup.ts`:

```typescript
import { test as setup } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = 'playwright/.auth/admin.json';

setup('authenticate as admin', async ({ page }) => {
  // Check for saved profile from /setup-profiles
  const profilePath = path.join(process.cwd(), '.playwright', 'profiles', 'admin.json');
  if (fs.existsSync(profilePath)) {
    const state = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify(state));
    return;
  }

  // Fall back to env-var credentials
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    await page.context().storageState({ path: authFile });
    return;
  }
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.ADMIN_EMAIL);
  await page.getByLabel('Password').fill(process.env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL('**/dashboard');
  await page.context().storageState({ path: authFile });
});
```

When the project has profiles from `/setup-profiles`, the auth setup copies the saved storageState directly — no credentials needed for local test runs. In CI, credentials from environment variables are used instead.

The same pattern applies to every persona -- only the env var names, profile path, and auth file path change (e.g., `guest1.setup.ts` uses `GUEST1_EMAIL`/`GUEST1_PASSWORD`, checks `.playwright/profiles/guest1.json`, and writes to `playwright/.auth/guest1.json`).

Key auth decisions: graceful fallback saves empty auth state when credentials are not set, so tests still run in environments without full credential configuration. Regex button matcher (`/sign in|log in/i`) handles common variations. When generating for a specific application, adapt the login route, field labels, button text, and post-login URL based on selector discovery results from Phase 3.

### Step 4: Generate package.json

```json
{
  "name": "multi-user-e2e",
  "private": true,
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:headed": "playwright test --headed"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.0"
  }
}
```

### Step 5: Generate .github/workflows/e2e.yml

Generate the GitHub Actions CI workflow that runs tests against Vercel preview deployments. The CI workflow includes environment variables for ALL personas from the Persona Registry.

```yaml
name: Multi-User E2E Tests
on: [deployment_status]
jobs:
  test:
    if: >
      github.event.deployment_status.state == 'success' &&
      contains(github.event.deployment_status.environment, 'Preview')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd e2e/multi-user && npm ci
      - run: cd e2e/multi-user && npx playwright install chromium --with-deps
      - run: cd e2e/multi-user && npx playwright test
        env:
          BASE_URL: ${{ github.event.deployment_status.target_url }}
          ADMIN_EMAIL: ${{ secrets.ADMIN_EMAIL }}
          ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
          HOST_EMAIL: ${{ secrets.HOST_EMAIL }}
          HOST_PASSWORD: ${{ secrets.HOST_PASSWORD }}
          GUEST1_EMAIL: ${{ secrets.GUEST1_EMAIL }}
          GUEST1_PASSWORD: ${{ secrets.GUEST1_PASSWORD }}
          GUEST2_EMAIL: ${{ secrets.GUEST2_EMAIL }}
          GUEST2_PASSWORD: ${{ secrets.GUEST2_PASSWORD }}
          GUEST3_EMAIL: ${{ secrets.GUEST3_EMAIL }}
          GUEST3_PASSWORD: ${{ secrets.GUEST3_PASSWORD }}
          VIEWER_EMAIL: ${{ secrets.VIEWER_EMAIL }}
          VIEWER_PASSWORD: ${{ secrets.VIEWER_PASSWORD }}
          VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: multi-user-playwright-report
          path: e2e/multi-user/playwright-report/
```

Key CI decisions: triggers on `deployment_status` so tests run against the actual Vercel preview URL, filters to `Preview` environment only, uses `target_url` as `BASE_URL`, requires GitHub secrets for EVERY persona's email and password plus `VERCEL_AUTOMATION_BYPASS_SECRET`, uploads Playwright HTML report as artifact on every run, installs only Chromium for speed. When generating for a specific project, include only the personas from the Persona Registry.

### Step 6: Generate .gitignore

```
node_modules/
playwright/.auth/
playwright-report/
test-results/
```

### Step 7: Generate tests/workflows.spec.ts

This is the largest and most complex file. Each workflow becomes a `test.describe()` block, and each workflow step is mapped to the corresponding persona's browser context and page.

#### Multi-Context Test Pattern

Unlike desktop tests that use a single `{ page }` fixture, multi-user tests use the `{ browser }` fixture to create per-persona browser contexts with pre-authenticated storage state.

```typescript
import { test, expect } from '@playwright/test';

test.describe('Core Workflows', () => {

  test.describe('Workflow 1: Team Invitation Flow', () => {
    test('admin invites guest1 to the team', async ({ browser }) => {
      // Create per-persona browser contexts with auth state
      const adminCtx = await browser.newContext({
        storageState: 'playwright/.auth/admin.json',
      });
      const guest1Ctx = await browser.newContext({
        storageState: 'playwright/.auth/guest1.json',
      });
      const adminPage = await adminCtx.newPage();
      const guest1Page = await guest1Ctx.newPage();

      // Step 1: [Admin] Navigate to the team management page
      await adminPage.goto('/team');
      // Verify: The "Invite Member" button is visible
      await expect(adminPage.getByRole('button', { name: 'Invite Member' })).toBeVisible();

      // Step 2: [Admin] Click the "Invite Member" button and enter Guest1's email
      await adminPage.getByRole('button', { name: 'Invite Member' }).click();
      await adminPage.getByLabel('Email').fill(process.env.GUEST1_EMAIL || 'guest1@example.com');
      await adminPage.getByRole('button', { name: 'Send Invitation' }).click();
      // Verify: Invitation sent successfully
      await expect(adminPage.getByText('Invitation sent')).toBeVisible();

      // Step 3: [Guest1] Check for the invitation notification
      // Sync Verification: Within 10 seconds, verify Guest1 sees the invitation
      await guest1Page.goto('/notifications');
      await expect(guest1Page.getByText(/invitation/i)).toBeVisible({ timeout: 10000 });

      // Step 4: [Guest1] Accept the invitation
      await guest1Page.getByRole('button', { name: /accept/i }).click();
      // Verify: Guest1 is redirected to the team workspace
      await expect(guest1Page).toHaveURL(/.*\/team/);

      // Step 5: [Admin] Verify the team member list is updated
      // Sync Verification: Within 5 seconds, Admin sees Guest1 in the member list
      await expect(adminPage.getByText('Guest1')).toBeVisible({ timeout: 5000 });

      // Clean up contexts
      await adminCtx.close();
      await guest1Ctx.close();
    });
  });

  // ... more core workflow describe blocks

});

test.describe('Feature Workflows', () => {
  // ... feature workflow describe blocks
});

test.describe('Edge Case Workflows', () => {
  // ... edge case workflow describe blocks
});
```

#### Structure Rules

1. **Top-level groups** -- `test.describe('Core Workflows', ...)`, `test.describe('Feature Workflows', ...)`, and `test.describe('Edge Case Workflows', ...)` mirror the priority tiers from the workflow file.
2. **Workflow blocks** -- Each workflow becomes a `test.describe('Workflow N: Name', ...)` nested inside the appropriate priority group.
3. **Single test per workflow** -- Each workflow is a single `test()` call containing all steps in sequence. This keeps each workflow atomic -- it either passes or fails as a whole.
4. **Context setup at test start** -- Each test creates browser contexts for every persona involved in that workflow. Only create contexts for personas that appear in the workflow's `<!-- personas: ... -->` list.
5. **Context cleanup at test end** -- Every test closes all browser contexts in a finally-safe pattern or at the end of the test.
6. **Step comments** -- Every step from the workflow is preceded by a comment (`// Step N: [Persona] ...`) and its verification (`// Verify: ...` or `// Sync Verification: ...`).

#### Persona Tag to Context Mapping

The `[PersonaName]` prefix in each workflow step determines which page variable to use:

| Workflow Tag | Context Variable | Page Variable |
|-------------|-----------------|---------------|
| `[Admin]` | `adminCtx` | `adminPage` |
| `[Host]` | `hostCtx` | `hostPage` |
| `[Guest1]` | `guest1Ctx` | `guest1Page` |
| `[Guest2]` | `guest2Ctx` | `guest2Page` |
| `[Guest3]` | `guest3Ctx` | `guest3Page` |
| `[Viewer]` | `viewerCtx` | `viewerPage` |

General rule: the context variable is the lowercased persona name + `Ctx`, and the page variable is the lowercased persona name + `Page`.

#### Sync Verification Translation

Workflow sync verification steps translate to Playwright assertions with explicit timeouts:

```typescript
// Workflow: **Sync Verification:** Within 5 seconds, verify Guest1 sees the document
// Playwright:
await expect(guest1Page.getByText('Document Title')).toBeVisible({ timeout: 5000 });

// Workflow: **Sync Verification:** Within 10 seconds, verify Admin sees Guest1 in the list
// Playwright:
await expect(adminPage.getByText('Guest1')).toBeVisible({ timeout: 10000 });

// Workflow: **Sync Verification:** Guest1 refreshes the page and verifies the change
// Playwright:
await guest1Page.reload();
await expect(guest1Page.getByText('Updated Content')).toBeVisible();
```

#### Handling Parallel Actions

When a workflow step says two personas act simultaneously (e.g., "[Host] and [Guest1] Open the same shared document simultaneously"), use `Promise.all()`:

```typescript
// Step 1: [Host] and [Guest1] Open the same shared document simultaneously
await Promise.all([
  hostPage.goto('/documents/shared-doc'),
  guest1Page.goto('/documents/shared-doc'),
]);
// Verify: Both see the document content
await expect(hostPage.getByRole('heading', { name: 'Shared Document' })).toBeVisible();
await expect(guest1Page.getByRole('heading', { name: 'Shared Document' })).toBeVisible();
```

#### Handling MANUAL Steps

Workflow steps marked `[MANUAL]` cannot be automated. Generate a skipped or annotated test step:

```typescript
// Step 4: [Guest1] [MANUAL] Verify the invitation email arrives in the inbox
// This step requires manual verification -- cannot be automated with Playwright.
// Consider using a test email service (e.g., Mailosaur, Mailhog) for automation.
```

Do NOT generate `test.skip()` for the entire workflow if only one step is manual. Instead, add the comment and continue with subsequent automatable steps.

#### Handling Preconditions

If a workflow has preconditions beyond per-persona authentication, generate them as inline setup code at the start of the test:

```typescript
test.describe('Workflow 5: Collaborative Document Editing', () => {
  test('host and guests collaboratively edit a document', async ({ browser }) => {
    const hostCtx = await browser.newContext({
      storageState: 'playwright/.auth/host.json',
    });
    const guest1Ctx = await browser.newContext({
      storageState: 'playwright/.auth/guest1.json',
    });
    const hostPage = await hostCtx.newPage();
    const guest1Page = await guest1Ctx.newPage();

    // Precondition: A shared document named "Test Doc" exists
    await hostPage.goto('/documents');
    const docExists = await hostPage.getByText('Test Doc').isVisible();
    if (!docExists) {
      await hostPage.getByRole('button', { name: 'New Document' }).click();
      await hostPage.getByLabel('Title').fill('Test Doc');
      await hostPage.getByRole('button', { name: 'Create' }).click();
    }

    // Step 1: [Host] Open the shared document
    await hostPage.getByText('Test Doc').click();
    // ...

    await hostCtx.close();
    await guest1Ctx.close();
  });
});
```

#### Vercel Bypass Headers in Contexts

When creating browser contexts, apply Vercel bypass headers if the environment variable is set:

```typescript
const extraHTTPHeaders = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  ? {
      'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
      'x-vercel-set-bypass-cookie': 'samesitenone',
    }
  : {};

const adminCtx = await browser.newContext({
  storageState: 'playwright/.auth/admin.json',
  extraHTTPHeaders,
});
```

Generate a shared `createContext` helper at the top of the spec file to avoid repetition:

```typescript
import { test, expect, Browser, BrowserContext } from '@playwright/test';

async function createAuthContext(
  browser: Browser,
  persona: string,
): Promise<BrowserContext> {
  const extraHTTPHeaders = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    ? {
        'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
        'x-vercel-set-bypass-cookie': 'samesitenone',
      }
    : {};
  return browser.newContext({
    storageState: `playwright/.auth/${persona}.json`,
    extraHTTPHeaders,
  });
}
```

Then each test uses:

```typescript
const adminCtx = await createAuthContext(browser, 'admin');
const guest1Ctx = await createAuthContext(browser, 'guest1');
```

### Step 8: Update the Generation Task

Mark `"Generate: Playwright project"` as completed with metadata for files generated, test describe count, steps translated, sync verifications, manual steps skipped, persona setup files, and parallel action blocks.

---

## Action Mapping Reference

This table provides the complete mapping from multi-user workflow language to Playwright code. The key difference from desktop mappings is that every action targets a persona-specific page variable.

| Workflow Language | Playwright Code |
|---|---|
| [Admin] Navigate to /dashboard | `await adminPage.goto('/dashboard')` |
| [Host] Click the "Save" button | `await hostPage.getByRole('button', { name: 'Save' }).click()` |
| [Guest1] Click the "Settings" link | `await guest1Page.getByRole('link', { name: 'Settings' }).click()` |
| [Admin] Type "hello" in the email field | `await adminPage.getByLabel('Email').fill('hello')` |
| [Guest2] Type "query" in the search box | `await guest2Page.getByPlaceholder('Search...').fill('query')` |
| [Viewer] Verify heading "Dashboard" visible | `await expect(viewerPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible()` |
| [Host] Verify text "Success" appears | `await expect(hostPage.getByText('Success')).toBeVisible()` |
| [Guest1] Verify URL contains /settings | `await expect(guest1Page).toHaveURL(/.*\/settings/)` |
| [Admin] Select "Editor" from role dropdown | `await adminPage.getByLabel('Role').selectOption('Editor')` |
| [Host] Check "Allow editing" checkbox | `await hostPage.getByLabel('Allow editing').check()` |
| [Admin] Uncheck "Notifications" checkbox | `await adminPage.getByLabel('Notifications').uncheck()` |
| [Guest1] Wait for loading to disappear | `await expect(guest1Page.getByText('Loading')).toBeHidden()` |
| [Host] Wait for URL to contain /document | `await hostPage.waitForURL('**/document')` |
| [Guest1] Upload "file.pdf" | `await guest1Page.getByLabel('Upload').setInputFiles('file.pdf')` |
| [Host] Press Escape | `await hostPage.keyboard.press('Escape')` |
| [Admin] Hover over "Settings" menu item | `await adminPage.getByRole('menuitem', { name: 'Settings' }).hover()` |
| [Viewer] Scroll to comments section | `await viewerPage.getByText('Comments').scrollIntoViewIfNeeded()` |
| **Sync Verification:** Within 5s | `await expect(...).toBeVisible({ timeout: 5000 })` |
| [Host] and [Guest1] simultaneously open /doc | `await Promise.all([hostPage.goto('/doc'), guest1Page.goto('/doc')])` |
| [Guest1] Refresh the page | `await guest1Page.reload()` |
| [Viewer] Verify element is NOT visible | `await expect(viewerPage.getByRole('button', { name: 'Delete' })).toBeHidden()` |
| [Admin] Drag "Task A" to "Done" column | `await adminPage.getByText('Task A').dragTo(adminPage.getByText('Done'))` |
| [Host] Clear the search field | `await hostPage.getByLabel('Search').clear()` |

---

## Example Translation

Below is a complete worked example showing how a multi-user workflow from `multi-user-workflows.md` is converted into Playwright test code with per-persona contexts.

### Input Workflow

```markdown
## Workflow 3: Collaborative Document Editing
<!-- auth: required -->
<!-- priority: core -->
<!-- personas: Host, Guest1, Guest2 -->
<!-- estimated-steps: 10 -->
<!-- sync-points: 4 -->

> Tests real-time collaborative editing where multiple users edit a shared
> document simultaneously and verify cross-user sync.

**Preconditions:**
- Host is logged in as Host persona (HOST_EMAIL / HOST_PASSWORD)
- Guest1 is logged in as Guest1 persona (GUEST1_EMAIL / GUEST1_PASSWORD)
- Guest2 is logged in as Guest2 persona (GUEST2_EMAIL / GUEST2_PASSWORD)
- A shared document named "Project Plan" exists (created by Host)

**Steps:**

1. [Host] Navigate to /documents and click "Project Plan"
   - Verify the document editor loads with title "Project Plan"

2. [Guest1] Navigate to /documents and click "Project Plan"
   - Verify the document editor loads with title "Project Plan"
   - **Sync Verification:** Within 3 seconds, verify Guest1 sees Host's presence
     indicator in the editor

3. [Guest2] Navigate to /documents and click "Project Plan"
   - Verify the document editor loads with title "Project Plan"
   - **Sync Verification:** Within 3 seconds, verify Guest2 sees both Host
     and Guest1 presence indicators

4. [Host] Type "Introduction section" in the document body
   - **Sync Verification:** Within 2 seconds, verify Guest1 sees
     "Introduction section" appear in the document
   - **Sync Verification:** Within 2 seconds, verify Guest2 sees
     "Introduction section" appear in the document

5. [Guest1] Type "Added by Guest1" below Host's text
   - **Sync Verification:** Within 2 seconds, verify Host sees
     "Added by Guest1" appear in the document

6. [Host] Click the "Save" button
   - Verify success message "Document saved" appears

7. [Guest1] Verify the save indicator shows "Saved"

8. [Guest2] Refresh the page
   - Verify both "Introduction section" and "Added by Guest1" are visible

**Postconditions:**
- Document contains content from both Host and Guest1
- All three personas see consistent document state
```

### Output Test Code

```typescript
test.describe('Workflow 3: Collaborative Document Editing', () => {
  test('host and guests collaboratively edit a shared document', async ({ browser }) => {
    const hostCtx = await createAuthContext(browser, 'host');
    const guest1Ctx = await createAuthContext(browser, 'guest1');
    const guest2Ctx = await createAuthContext(browser, 'guest2');
    const hostPage = await hostCtx.newPage();
    const guest1Page = await guest1Ctx.newPage();
    const guest2Page = await guest2Ctx.newPage();

    // Step 1: [Host] Navigate to /documents and click "Project Plan"
    await hostPage.goto('/documents');
    await hostPage.getByText('Project Plan').click();
    await expect(hostPage.getByRole('heading', { name: 'Project Plan' })).toBeVisible();

    // Step 2: [Guest1] Navigate to /documents and click "Project Plan"
    await guest1Page.goto('/documents');
    await guest1Page.getByText('Project Plan').click();
    await expect(guest1Page.getByRole('heading', { name: 'Project Plan' })).toBeVisible();
    // Sync Verification: Within 3 seconds, Guest1 sees Host's presence
    await expect(guest1Page.getByTestId('presence-indicator')).toBeVisible({ timeout: 3000 });

    // Step 3: [Guest2] Navigate to /documents and click "Project Plan"
    await guest2Page.goto('/documents');
    await guest2Page.getByText('Project Plan').click();
    // Sync Verification: Within 3 seconds, Guest2 sees both presence indicators
    await expect(guest2Page.locator('[data-testid="presence-indicator"]')).toHaveCount(2, { timeout: 3000 });

    // Step 4: [Host] Type "Introduction section" in the document body
    await hostPage.getByLabel('Content').fill('Introduction section');
    // Sync: Guest1 and Guest2 see the text within 2 seconds
    await expect(guest1Page.getByText('Introduction section')).toBeVisible({ timeout: 2000 });
    await expect(guest2Page.getByText('Introduction section')).toBeVisible({ timeout: 2000 });

    // Step 5: [Guest1] Type "Added by Guest1" below Host's text
    await guest1Page.getByLabel('Content').pressSequentially('Added by Guest1');
    await expect(hostPage.getByText('Added by Guest1')).toBeVisible({ timeout: 2000 });

    // Step 6: [Host] Click the "Save" button
    await hostPage.getByRole('button', { name: 'Save' }).click();
    await expect(hostPage.getByText('Document saved')).toBeVisible();

    // Step 7-8: [Guest1] verify saved, [Guest2] refresh and verify
    await expect(guest1Page.getByText('Saved')).toBeVisible();
    await guest2Page.reload();
    await expect(guest2Page.getByText('Introduction section')).toBeVisible();
    await expect(guest2Page.getByText('Added by Guest1')).toBeVisible();

    await hostCtx.close();
    await guest1Ctx.close();
    await guest2Ctx.close();
  });
});
```

### Translation Notes

Key patterns: step comments preserve persona tags for cross-referencing, sync verification steps use explicit `{ timeout: N }` matching the workflow's timing expectations, each persona operates on its own page variable, the `createAuthContext` helper handles Vercel bypass headers and storage state, `Promise.all()` is used for simultaneous actions, and context cleanup happens at the end of each test.

---

## Phase 5: Review with User (REQUIRED)

This phase is mandatory. You must never write files without user approval.

### Present Generated Tests for Review

Use `AskUserQuestion` to present the generated project. Include: project structure listing, test summary (counts by priority, sync verifications, manual steps), persona-to-credential mapping, and the complete `workflows.spec.ts` and `playwright.config.ts` contents. Ask the user to review test translations, selectors, sync timeouts, persona mappings, and auth flows. Request "approved" to proceed or feedback for revision.

### Create the Approval Task

Create `"Approval: Review generated tests"` (in_progress) with iteration number and counts.

### Handling Feedback

If the user provides feedback instead of approving: apply changes, mark the current approval task as completed with `result: "changes_requested"` and feedback summary, create a new approval task for iteration N+1 with list of changes made, and re-present the revised tests. Repeat until the user approves.

### On Approval

Mark the approval task as completed with `result: "approved"` and final test/sync verification counts.

---

## Phase 6: Write Files

Write all generated files to `e2e/multi-user/`.

### Step 1: Create Directory Structure

```
1. Ensure e2e/multi-user/ exists (create if not).
2. Ensure e2e/multi-user/tests/ exists (create if not).
3. Ensure .github/workflows/ exists (create if not).
```

### Step 2: Write All Files

Write each file: `playwright.config.ts`, `package.json`, one `<persona>.setup.ts` per persona, `workflows.spec.ts`, `.gitignore` (all inside `e2e/multi-user/`), and `.github/workflows/e2e-multi-user.yml` at the repo root.

### Step 3: Verify Files

After writing, read back each file to confirm it was written correctly.

### Step 4: Update Tasks

Create `"Write: e2e/multi-user/"` (completed) with files written count, output directory, CI workflow path, and persona setup file count. Mark the main task `"Convert: Multi-User Workflows to Playwright"` as completed with full summary metadata.

### Final Summary

Present the user with: output directory, CI workflow path, files written (with counts for test blocks, steps, sync verifications), summary of workflows converted by priority tier, personas and setup file count, manual steps commented, selectors from codebase, review iterations, and next steps (install, run locally, configure GitHub secrets for all personas, push to trigger CI).

---

## Session Recovery

If the skill is invoked and an existing task list is found, use this decision tree to determine where to resume.

### Decision Tree

```
Check TaskList for "Convert: Multi-User Workflows to Playwright"

CASE 1: No task list exists
  -> Start from Phase 1

CASE 2: Parse task is "completed", no Check task
  -> Workflow file has been parsed, Persona Map is available
  -> Resume from Phase 2 (check existing project)

CASE 3: Check task is "completed", no Selector task
  -> Existing project has been checked
  -> Resume from Phase 3 (selector discovery)

CASE 4: Selector task is "in_progress"
  -> Agent may have timed out
  -> Re-spawn the Explore agent
  -> Resume from Phase 3 (partial)

CASE 5: Selector task is "completed", no Generate task
  -> Selectors have been discovered
  -> Resume from Phase 4 (generate project)

CASE 6: Generate task is "completed", no Approval task
  -> Files were generated but not reviewed
  -> Resume from Phase 5 (review with user)

CASE 7: Approval task exists with result "changes_requested"
  -> User gave feedback but revisions were not completed
  -> Read the feedback from task metadata
  -> Apply changes and re-present for review
  -> Resume from Phase 5 (next iteration)

CASE 8: Approval task is "completed" with result "approved", no Write task
  -> Tests were approved but files were not written
  -> Resume from Phase 6 (write files)

CASE 9: Write task is "completed"
  -> Everything is done
  -> Show the final summary and ask if the user wants to make changes
```

### Always Inform the User When Resuming

```
I found an existing session for multi-user workflow-to-Playwright conversion.

Current state: [describe where things left off]
Last completed phase: [phase name]
Personas from parse: [list of personas]

I will resume from [next phase]. If you would like to start over instead,
let me know and I will create a fresh session.
```

---

## Handling Updates

When the user chooses "Update" mode (modifying existing tests to match changed workflows), follow these rules.

### Rules for Updating Existing Tests

1. **Preserve custom modifications** -- If the user has manually edited a generated test (added custom helpers, changed selectors, added extra assertions), preserve those edits. Look for comments like `// CUSTOM:` or any code that does not match the generated pattern.

2. **Match workflows to test blocks** -- Use the `test.describe('Workflow N: ...')` naming convention to match existing test blocks to their source workflows. This is why consistent naming is critical.

3. **Update changed workflows** -- If a workflow's steps, persona assignments, or sync timings have changed since the last generation, regenerate only that workflow's `test.describe` block. Preserve the position of the block within the file.

4. **Add new workflows** -- New workflows are added to the appropriate priority group (`Core Workflows`, `Feature Workflows`, `Edge Case Workflows`). They are appended to the end of their group.

5. **Mark removed workflows** -- If a workflow has been deprecated since the last generation, comment out its test block rather than deleting it:

```typescript
// DEPRECATED: Workflow 9 -- Legacy Shared Calendar
// Reason: Calendar feature removed in v3.0
// Date: 2025-01-15
// test.describe('Workflow 9: Legacy Shared Calendar', () => { ... });
```

6. **Add new persona setup files** -- If new personas have been added to the Persona Registry, generate new setup files and add corresponding projects to `playwright.config.ts` and CI env vars.

7. **Deprecate removed persona setup files** -- Do NOT delete removed persona setup files. Add a `// DEPRECATED` comment at the top instead.

8. **Regenerate config files** -- `playwright.config.ts`, `package.json`, `.gitignore`, and the CI workflow are always regenerated (they should not contain custom modifications). Update the `dependencies` array and CI env vars to reflect current personas.

9. **Preserve auth.setup.ts customizations** -- If the user has customized any persona setup file (different login flow, MFA, OAuth), preserve their version. Only regenerate if explicitly requested.

### Update Summary

After an update operation, present a change summary covering: test blocks preserved/updated/deprecated/added, details of each changed workflow, persona additions/removals, new setup files, files regenerated vs preserved.

---

## Selector Strategy Reference

When translating workflow steps to Playwright code, always prefer the most resilient selector available. This table shows the preferred order, matching Playwright's official recommendation. In multi-user tests, the same selector strategies apply -- only the page variable changes per persona.

| Priority | Strategy | When to Use | Example (Admin persona) |
|----------|----------|-------------|---------|
| 1 | `getByRole` | Buttons, links, headings, checkboxes, radio buttons, and any element with an explicit ARIA role | `adminPage.getByRole('button', { name: 'Submit' })` |
| 2 | `getByLabel` | Form inputs that have an associated `<label>` element or `aria-label` attribute | `hostPage.getByLabel('Email address')` |
| 3 | `getByPlaceholder` | Inputs without labels but with placeholder text | `guest1Page.getByPlaceholder('Search...')` |
| 4 | `getByText` | Non-interactive elements identified by their visible text content | `guest2Page.getByText('Welcome back')` |
| 5 | `getByTestId` | Elements with `data-testid` attributes, useful when other selectors are ambiguous | `viewerPage.getByTestId('sidebar-nav')` |
| 6 | CSS selector | Last resort when no semantic selector is available | `hostPage.locator('.custom-widget > .action-btn')` |

### Selector Anti-Patterns

Avoid in generated tests: ID selectors (`#submit-btn`), class selectors (`.btn-primary`), structural selectors (`div > span:nth-child(3)`), and attribute selectors (`[onclick="save()"]`). All of these are fragile and break on refactors. Always prefer the semantic locators in the priority table above.

---

## Multi-User Testing Patterns Reference

### Pattern 1: Sequential Cross-Persona Actions

One persona acts, then another verifies. This is the most common pattern.

```typescript
await adminPage.getByRole('button', { name: 'Invite' }).click();
await expect(guest1Page.getByText(/invitation/i)).toBeVisible({ timeout: 5000 });
```

### Pattern 2: Parallel Actions with Promise.all

When multiple personas must act simultaneously:

```typescript
await Promise.all([
  hostPage.goto('/documents/shared-doc'),
  guest1Page.goto('/documents/shared-doc'),
]);
```

### Pattern 3: Polling-Based Sync Verification

For features using polling rather than push updates, use `toPass()` for retry-based assertions:

```typescript
await expect(async () => {
  await guest1Page.reload();
  await expect(guest1Page.getByText('Updated Content')).toBeVisible();
}).toPass({ timeout: 15000, intervals: [1000, 2000, 3000] });
```

### Pattern 4: Role-Based Visibility Checks

```typescript
await expect(adminPage.getByRole('button', { name: 'Delete' })).toBeVisible();
await expect(viewerPage.getByRole('button', { name: 'Delete' })).toBeHidden();
```

### Pattern 5: Context Lifecycle

Only create contexts for personas in the workflow. Always close contexts at test end:

```typescript
test('workflow with Admin and Guest1 only', async ({ browser }) => {
  const adminCtx = await createAuthContext(browser, 'admin');
  const guest1Ctx = await createAuthContext(browser, 'guest1');
  const adminPage = await adminCtx.newPage();
  const guest1Page = await guest1Ctx.newPage();
  // ... test steps ...
  await adminCtx.close();
  await guest1Ctx.close();
});
```

---

## Constraints

- **Tools allowed** -- This skill only uses Read, Write, Glob, Grep, and the Task/Explore tools. Do NOT use Chrome MCP, iOS Simulator MCP, Playwright MCP, or any other browser automation tool. All browser interactions are generated as code, never executed during conversion.
- **Output location** -- All test files go to `e2e/multi-user/`. The CI workflow goes to `.github/workflows/e2e-multi-user.yml` at the repository root.
- **Per-persona auth is always generated** -- A setup file is generated for every persona in the Persona Registry, even if not all personas appear in every workflow. Each setup file gracefully handles missing credentials.
- **Vercel headers are always included** -- The `x-vercel-protection-bypass` and `x-vercel-set-bypass-cookie` headers are conditionally applied in both `playwright.config.ts` and the `createAuthContext` helper when the environment variable is set.
- **No runtime dependencies on workflows** -- The generated test project is fully self-contained. It does not read or import from the workflow markdown file at runtime.
- **Playwright best practices** -- Use `getByRole`, `getByLabel`, `getByText`, `getByPlaceholder`, and `getByTestId` in that order. Avoid CSS and XPath selectors unless absolutely necessary.
- **Multi-context best practices** -- Use `browser.newContext()` (not `browser.newPage()`) to get isolated per-persona contexts with separate storage state. Close all contexts at test end.
- **Sequential by default** -- Set `fullyParallel: false` because multi-user tests within a workflow are inherently sequential (step N depends on step N-1). Use `Promise.all()` only for explicitly simultaneous actions.
- **Persona variable naming** -- Always use the convention `<lowercase-persona>Ctx` and `<lowercase-persona>Page` for consistency across all generated tests.
