---
name: desktop-workflow-to-playwright
description: Converts desktop workflow markdown into a self-contained Playwright test project with authentication scaffolding and CI workflow. Use when the user says "convert desktop workflows to playwright", "translate desktop workflows to CI", "generate desktop playwright tests", or wants to promote desktop workflows to automated CI tests.
---

# Desktop Workflow to Playwright Converter

You are a senior QA automation engineer converting human-readable desktop workflow documentation into a self-contained Playwright test project. Your job is to read workflows from `/workflows/desktop-workflows.md`, translate every step into idiomatic Playwright code, and produce a fully functional test project at `e2e/desktop/` that includes authentication scaffolding, CI configuration, and Vercel deployment protection headers.

Every generated test must be runnable out of the box with `cd e2e/desktop && npm ci && npx playwright test`.

---

## Task List Integration

Task lists track agent progress, provide user visibility, enable session recovery after interruptions, record review iterations, and serve as an audit trail of what was parsed, generated, and approved.

### Task Hierarchy

Every run of this skill creates the following task tree. Tasks are completed in order.

```
[Main Task] "Convert: Desktop Workflows to Playwright"
  +-- [Parse Task]    "Parse: desktop-workflows.md"
  +-- [Check Task]    "Check: Existing e2e/desktop/ project"
  +-- [Selector Task] "Selectors: Find for all workflows"   (agent)
  +-- [Generate Task] "Generate: Playwright project"
  +-- [Approval Task] "Approval: Review generated tests"
  +-- [Write Task]    "Write: e2e/desktop/"
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

This skill reads a single input file and produces a complete test project.

```
/workflows/desktop-workflows.md  ->  e2e/desktop/
                                       +-- playwright.config.ts
                                       +-- package.json
                                       +-- tests/
                                       |   +-- auth.setup.ts
                                       |   +-- workflows.spec.ts
                                       +-- .github/workflows/e2e.yml
                                       +-- .gitignore
```

Every file in the output is self-contained. The project has no dependency on the source workflow markdown at runtime -- the workflows are fully compiled into Playwright test code.

---

## Phase 1: Parse Workflows

Read the workflow markdown file, extract each workflow with its metadata, and build an internal representation that drives all subsequent phases.

### Step 1: Locate the Workflow File

Use Glob to search for the workflow file:

```
Glob patterns:
  - workflows/desktop-workflows.md
  - workflows/browser-workflows.md
```

If no file is found, stop and inform the user:

```
No desktop workflow file found at /workflows/desktop-workflows.md.
Please run "generate desktop workflows" first, or provide the path
to your workflow file.
```

### Step 2: Read and Parse

Read the entire workflow file. For each workflow, extract:

1. **Workflow number** -- from the `## Workflow [N]:` heading
2. **Workflow name** -- the descriptive name after the number
3. **Auth requirement** -- from `<!-- auth: required -->` or `<!-- auth: no -->`
4. **Priority** -- from `<!-- priority: core -->`, `<!-- priority: feature -->`, or `<!-- priority: edge -->`
5. **Estimated steps** -- from `<!-- estimated-steps: N -->`
6. **Deprecated flag** -- from `<!-- deprecated: true -->` (skip deprecated workflows)
7. **Preconditions** -- the bullet list under `**Preconditions:**`
8. **Steps** -- each numbered step and its verification sub-steps
9. **Postconditions** -- the bullet list under `**Postconditions:**`

### Step 3: Build Internal Representation

Organize workflows into a structured list:

```
workflows = [
  {
    number: 1,
    name: "User Registration",
    auth: false,
    priority: "core",
    estimatedSteps: 7,
    preconditions: ["User is on the landing page"],
    steps: [
      { action: "Navigate to /signup", verify: "Signup form is visible" },
      { action: "Type 'John' in the first name field", verify: "Field shows 'John'" },
      ...
    ],
    postconditions: ["User account exists", "User is redirected to dashboard"]
  },
  ...
]
```

Skip any workflow marked `<!-- deprecated: true -->`. Log skipped workflows to the user:

```
Parsed 25 workflows from desktop-workflows.md.
Skipped 2 deprecated workflows: #7 (Legacy Export), #15 (Old Settings Page).
Converting 23 active workflows.
```

### Step 4: Create Tasks

```
TaskCreate:
  title: "Convert: Desktop Workflows to Playwright"
  status: "in_progress"
  metadata:
    source_file: "/workflows/desktop-workflows.md"
    total_workflows: 25
    active_workflows: 23
    deprecated_skipped: 2
    output_path: "e2e/desktop/"
```

```
TaskCreate:
  title: "Parse: desktop-workflows.md"
  status: "completed"
  metadata:
    workflows_parsed: 25
    active: 23
    deprecated: 2
    core: 5
    feature: 12
    edge: 6
```

---

## Phase 2: Check Existing Project

Before generating, check whether an `e2e/desktop/` directory already exists.

### Step 1: Check for Existing Files

Use Glob to check for existing project files:

```
Glob patterns:
  - e2e/desktop/playwright.config.ts
  - e2e/desktop/package.json
  - e2e/desktop/tests/*.spec.ts
  - e2e/desktop/tests/*.setup.ts
```

### Step 2: Determine Strategy

**If no existing project is found:**
- Proceed with fresh generation.
- No further decisions needed.

**If an existing project is found:**
- Read the existing `tests/workflows.spec.ts` to understand what is already covered.
- Use `AskUserQuestion` to determine the user's intent:

```
I found an existing Playwright project at e2e/desktop/ with [N] existing test blocks.

How would you like to proceed?

1. **Overwrite** -- Replace all generated files with fresh output
2. **Update** -- Add new tests for new workflows, update changed workflows, preserve custom modifications
3. **Cancel** -- Stop and keep existing files unchanged
```

### Step 3: Create the Check Task

```
TaskCreate:
  title: "Check: Existing e2e/desktop/ project"
  status: "completed"
  metadata:
    existing_project: true     # or false
    existing_tests: 18         # count of describe blocks
    strategy: "overwrite"      # or "update" or "fresh"
```

---

## Phase 3: Selector Discovery [DELEGATE TO AGENT]

Spawn an Explore agent to analyze the codebase and find the best Playwright selectors for elements referenced in the workflows.

### Step 1: Create the Task

```
TaskCreate:
  title: "Selectors: Find for all workflows"
  status: "in_progress"
  metadata:
    agent_type: "explore"
    focus: "selectors"
```

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

    For each element, search for: data-testid, aria-label, role attributes,
    <label> associations, placeholder text, and visible text content.

    Prefer selectors in this order (Playwright recommended):
    1. getByRole  2. getByLabel  3. getByPlaceholder
    4. getByText  5. getByTestId  6. CSS selector (last resort)

    Return findings as:

    ## Selector Map
    | Workflow | Step | Element Description | Recommended Selector | Fallback Selector |
    |----------|------|--------------------|--------------------|-------------------|
    | 1 | 2 | "Save" button | getByRole('button', { name: 'Save' }) | getByTestId('save-btn') |

    ## Missing Selectors
    - Elements not found in codebase (suggest data-testid additions)

    ## Selector Quality Report
    - Counts by selector type and elements not found
```

### Step 3: Process Agent Results

When the Explore agent returns, merge its Selector Map into the internal workflow representation. Each step now has a concrete Playwright selector to use during code generation.

```
TaskUpdate:
  title: "Selectors: Find for all workflows"
  status: "completed"
  metadata:
    selectors_found: 87
    selectors_missing: 4
    by_role: 42
    by_label: 23
    by_testid: 15
    by_text: 7
    css_fallback: 0
```

For any elements the agent could not locate, generate a comment in the test code:

```typescript
// TODO: Add data-testid for this element -- selector not found in codebase
await page.locator('[data-testid="unknown-element"]').click();
```

---

## Phase 4: Generate Playwright Project

This is the core generation phase. Generate ALL project files using the parsed workflows, discovered selectors, and configuration templates.

### Step 1: Create the Generation Task

```
TaskCreate:
  title: "Generate: Playwright project"
  status: "in_progress"
  metadata:
    files_to_generate: 6
```

### Step 2: Generate playwright.config.ts

Generate the Playwright configuration file with Desktop Chrome as the primary project, auth setup as a dependency, and Vercel deployment protection bypass headers.

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
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
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
```

Key configuration decisions: `fullyParallel` for speed, `retries: 2` in CI only for flaky test mitigation, `trace: 'on-first-retry'` for debugging failures, `baseURL` from environment for localhost vs deployed URL flexibility. Vercel bypass headers are conditionally applied only when `VERCEL_AUTOMATION_BYPASS_SECRET` is set. The `setup` project runs `auth.setup.ts` before any test that depends on `storageState`.

### Step 3: Generate tests/auth.setup.ts

Generate the authentication setup file. This file is ALWAYS generated, even if no workflows require authentication. When credentials are not provided, it gracefully saves an empty storage state so tests that do not require auth still run.

```typescript
import { test as setup } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Check for saved profiles from /setup-profiles
  const profilesDir = path.join(process.cwd(), '.playwright', 'profiles');
  const profilesConfig = path.join(process.cwd(), '.playwright', 'profiles.json');

  if (fs.existsSync(profilesConfig)) {
    const config = JSON.parse(fs.readFileSync(profilesConfig, 'utf-8'));
    const profileName = Object.keys(config.profiles)[0];
    const profilePath = path.join(profilesDir, `${profileName}.json`);

    if (fs.existsSync(profilePath)) {
      const state = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
      fs.mkdirSync(path.dirname(authFile), { recursive: true });
      fs.writeFileSync(authFile, JSON.stringify(state));
      return;
    }
  }

  // Fall back to env-var credentials
  if (!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD) {
    await page.context().storageState({ path: authFile });
    return;
  }
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL);
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL('**/dashboard');
  await page.context().storageState({ path: authFile });
});
```

When the project has profiles from `/setup-profiles`, the auth setup reads `profiles.json` to discover the first available profile and copies its storageState directly — no credentials needed for local test runs. In CI, credentials from environment variables are used instead.

Key auth decisions: graceful fallback saves empty auth state when credentials are not set, so non-auth tests still pass. Regex button matcher (`/sign in|log in/i`) handles common variations. When generating for a specific application, adapt the login route, field labels, button text, and post-login URL based on selector discovery results from Phase 3.

### Step 4: Generate package.json

```json
{
  "name": "desktop-e2e",
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

Generate the GitHub Actions CI workflow that runs tests against Vercel preview deployments.

```yaml
name: Desktop E2E Tests
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
      - run: cd e2e/desktop && npm ci
      - run: cd e2e/desktop && npx playwright install chromium --with-deps
      - run: cd e2e/desktop && npx playwright test
        env:
          BASE_URL: ${{ github.event.deployment_status.target_url }}
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
          VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: desktop-playwright-report
          path: e2e/desktop/playwright-report/
```

Key CI decisions: triggers on `deployment_status` so tests run against the actual Vercel preview URL, filters to `Preview` environment only, uses `target_url` as `BASE_URL`, requires three GitHub secrets (`TEST_EMAIL`, `TEST_PASSWORD`, `VERCEL_AUTOMATION_BYPASS_SECRET`), uploads Playwright HTML report as artifact on every run, installs only Chromium for speed.

### Step 6: Generate .gitignore

```
node_modules/
playwright/.auth/
playwright-report/
test-results/
```

### Step 7: Generate tests/workflows.spec.ts

This is the largest and most important file. Map each parsed workflow to a `test.describe()` block, and each workflow step to one or more Playwright actions.

#### Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Core Workflows', () => {

  test.describe('Workflow 1: User Registration', () => {
    test('completes user registration flow', async ({ page }) => {
      // Step 1: Navigate to /signup
      await page.goto('/signup');
      // Verify: Signup form is visible
      await expect(page.getByRole('heading', { name: 'Sign Up' })).toBeVisible();

      // Step 2: Type "John" in the first name field
      await page.getByLabel('First name').fill('John');

      // Step 3: Type "john@example.com" in the email field
      await page.getByLabel('Email').fill('john@example.com');

      // Step 4: Click the "Create Account" button
      await page.getByRole('button', { name: 'Create Account' }).click();

      // Step 5: Verify success message appears
      await expect(page.getByText('Account created successfully')).toBeVisible();
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

#### Grouping Rules

1. **Top-level groups** -- `test.describe('Core Workflows', ...)`, `test.describe('Feature Workflows', ...)`, and `test.describe('Edge Case Workflows', ...)` mirror the priority tiers from the workflow file.
2. **Workflow blocks** -- Each workflow becomes a `test.describe('Workflow N: Name', ...)` nested inside the appropriate priority group.
3. **Single test per workflow** -- Each workflow is a single `test()` call containing all steps in sequence. This keeps each workflow atomic -- it either passes or fails as a whole.
4. **Step comments** -- Every step from the workflow is preceded by a comment (`// Step N: ...`) and its verification (`// Verify: ...`).

#### Translation Rules for Steps

When translating workflow steps to Playwright code, apply the following rules. Use the Selector Map from Phase 3 to choose the best selector for each element.

```typescript
// Navigation
await page.goto('/dashboard');

// Click actions
await page.getByRole('button', { name: 'Save' }).click();
await page.getByRole('link', { name: 'Settings' }).click();
await page.getByText('Learn more').click();

// Type / fill actions
await page.getByLabel('Email').fill('hello@example.com');
await page.getByPlaceholder('Search...').fill('search term');

// Select, checkbox, toggle
await page.getByLabel('Role').selectOption('Admin');
await page.getByLabel('Remember me').check();
await page.getByLabel('Send notifications').uncheck();

// Wait and visibility
await expect(page.getByText('Loading')).toBeHidden();
await page.waitForURL('**/dashboard');

// Verification assertions
await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
await expect(page.getByText('Changes saved')).toBeVisible();
await expect(page).toHaveURL(/.*\/settings/);
await expect(page).toHaveTitle('Settings');

// File upload, keyboard, hover, scroll
await page.getByLabel('Upload').setInputFiles('report.pdf');
await page.keyboard.press('Escape');
await page.getByRole('menuitem', { name: 'Settings' }).hover();
await page.getByText('Comments').scrollIntoViewIfNeeded();
```

#### Handling MANUAL Steps

Workflow steps marked `[MANUAL]` cannot be automated. Generate a skipped or annotated test step:

```typescript
// Step 4: [MANUAL] Verify the email arrives in the user's inbox
// This step requires manual verification -- cannot be automated with Playwright.
// Consider using a test email service (e.g., Mailosaur) for automation.
```

Do NOT generate `test.skip()` for the entire workflow if only one step is manual. Instead, add the comment and continue with subsequent automatable steps.

#### Handling Preconditions

If a workflow has preconditions beyond authentication, generate them as `test.beforeEach` or inline setup code:

```typescript
test.describe('Workflow 5: Edit Existing Post', () => {
  test('edits an existing post successfully', async ({ page }) => {
    // Precondition: At least one post exists
    // Navigate to the posts list to verify
    await page.goto('/posts');
    await expect(page.getByRole('article')).toHaveCount(1, { timeout: 5000 });

    // Step 1: Click the first post title
    await page.getByRole('article').first().click();
    // ...
  });
});
```

### Step 8: Update the Generation Task

```
TaskUpdate:
  title: "Generate: Playwright project"
  status: "completed"
  metadata:
    files_generated: 6
    test_describes: 23
    total_steps_translated: 142
    manual_steps_skipped: 3
    selectors_from_agent: 87
```

---

## Action Mapping Reference

This table provides the complete mapping from workflow language to Playwright code. Use it as a quick reference when translating steps.

| Workflow Language | Playwright Code |
|---|---|
| Navigate to /dashboard | `await page.goto('/dashboard')` |
| Click the "Save" button | `await page.getByRole('button', { name: 'Save' }).click()` |
| Click the "Settings" link | `await page.getByRole('link', { name: 'Settings' }).click()` |
| Type "hello" in the email field | `await page.getByLabel('Email').fill('hello')` |
| Type "query" in the search box | `await page.getByPlaceholder('Search...').fill('query')` |
| Verify heading "Dashboard" visible | `await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()` |
| Verify text "Success" appears | `await expect(page.getByText('Success')).toBeVisible()` |
| Verify URL contains /settings | `await expect(page).toHaveURL(/.*\/settings/)` |
| Select "Admin" from role dropdown | `await page.getByLabel('Role').selectOption('Admin')` |
| Check "Remember me" checkbox | `await page.getByLabel('Remember me').check()` |
| Uncheck "Notifications" checkbox | `await page.getByLabel('Notifications').uncheck()` |
| Wait for loading to disappear | `await expect(page.getByText('Loading')).toBeHidden()` |
| Wait for URL to contain /dashboard | `await page.waitForURL('**/dashboard')` |
| Upload "file.pdf" | `await page.getByLabel('Upload').setInputFiles('file.pdf')` |
| Press Escape | `await page.keyboard.press('Escape')` |
| Press Enter to submit | `await page.keyboard.press('Enter')` |
| Hover over "Settings" menu item | `await page.getByRole('menuitem', { name: 'Settings' }).hover()` |
| Scroll to comments section | `await page.getByText('Comments').scrollIntoViewIfNeeded()` |
| Drag "Task A" to "Done" column | `await page.getByText('Task A').dragTo(page.getByText('Done'))` |
| Verify element has count N | `await expect(page.getByRole('listitem')).toHaveCount(N)` |
| Verify input has value "text" | `await expect(page.getByLabel('Name')).toHaveValue('text')` |
| Clear the search field | `await page.getByLabel('Search').clear()` |

---

## Example Translation

Below is a complete worked example showing how a workflow from `desktop-workflows.md` is converted into Playwright test code.

### Input Workflow

```markdown
## Workflow 3: Create New Post
<!-- auth: required -->
<!-- priority: core -->
<!-- estimated-steps: 8 -->

> Tests the complete flow of creating a new blog post from the dashboard.

**Preconditions:**
- User is logged in as editor

**Steps:**

1. Navigate to /dashboard
   - Verify the dashboard heading is visible

2. Click the "New Post" button
   - Verify the post editor page loads

3. Type "My First Post" in the title field
   - Verify the title field shows "My First Post"

4. Type "This is the post body content." in the content editor
   - Verify content appears in the editor

5. Select "Technology" from the category dropdown
   - Verify "Technology" is selected

6. Click the "Publish" button
   - Verify success toast appears with message "Post published"

7. Verify the URL changes to /posts/[slug]

8. Navigate to /posts
   - Verify "My First Post" appears in the post list

**Postconditions:**
- New post exists with title "My First Post"
- Post is visible in the public post list
```

### Output Test Code

```typescript
test.describe('Workflow 3: Create New Post', () => {
  test('creates a new blog post from the dashboard', async ({ page }) => {
    // Step 1: Navigate to /dashboard
    await page.goto('/dashboard');
    // Verify: The dashboard heading is visible
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Step 2: Click the "New Post" button
    await page.getByRole('button', { name: 'New Post' }).click();
    // Verify: The post editor page loads
    await expect(page.getByRole('heading', { name: /editor|new post/i })).toBeVisible();

    // Step 3: Type "My First Post" in the title field
    await page.getByLabel('Title').fill('My First Post');
    // Verify: The title field shows "My First Post"
    await expect(page.getByLabel('Title')).toHaveValue('My First Post');

    // Step 4: Type "This is the post body content." in the content editor
    await page.getByLabel('Content').fill('This is the post body content.');
    // Verify: Content appears in the editor
    await expect(page.getByLabel('Content')).toHaveValue('This is the post body content.');

    // Step 5: Select "Technology" from the category dropdown
    await page.getByLabel('Category').selectOption('Technology');
    // Verify: "Technology" is selected
    await expect(page.getByLabel('Category')).toHaveValue('Technology');

    // Step 6: Click the "Publish" button
    await page.getByRole('button', { name: 'Publish' }).click();
    // Verify: Success toast appears
    await expect(page.getByText('Post published')).toBeVisible();

    // Step 7: Verify the URL changes to /posts/[slug]
    await expect(page).toHaveURL(/\/posts\/.+/);

    // Step 8: Navigate to /posts
    await page.goto('/posts');
    // Verify: "My First Post" appears in the post list
    await expect(page.getByText('My First Post')).toBeVisible();
  });
});
```

### Translation Notes

Key patterns: step comments mirror the workflow text for cross-referencing, every "Verify" sub-step becomes an `expect()` assertion, selectors follow the priority hierarchy (role > label > text > testid) with Phase 3 overrides, test names are derived from the workflow description, and dynamic URL segments use regex patterns.

---

## Phase 5: Review with User (REQUIRED)

This phase is mandatory. You must never write files without user approval.

### Present Generated Tests for Review

Use `AskUserQuestion` to present the generated project:

```
I have generated a Playwright test project from [N] desktop workflows.

Project structure:
  e2e/desktop/
    +-- playwright.config.ts    (Desktop Chrome, auth setup, Vercel bypass)
    +-- package.json            (Playwright dependency + test scripts)
    +-- tests/
    |   +-- auth.setup.ts       (Authentication scaffolding)
    |   +-- workflows.spec.ts   ([N] test blocks, [M] total steps)
    +-- .github/workflows/e2e.yml  (CI on Vercel preview deployments)
    +-- .gitignore

Test summary:
  - Core tests: [X] workflows
  - Feature tests: [Y] workflows
  - Edge case tests: [Z] workflows
  - Manual steps (commented): [K]
  - Selectors from codebase analysis: [S]

Here are the generated test files:

[Paste the complete tests/workflows.spec.ts]
[Paste auth.setup.ts if customized from default]

Please review and let me know:
1. Are any test translations incorrect?
2. Should any selectors be adjusted?
3. Are there any missing edge cases?
4. Any changes to the auth setup flow?

Reply "approved" to write all files, or provide feedback for revision.
```

### Create the Approval Task

```
TaskCreate:
  title: "Approval: Review generated tests"
  status: "in_progress"
  metadata:
    iteration: 1
    test_blocks_presented: 23
    total_steps: 142
```

### Handling Feedback

If the user provides feedback instead of approving:

1. Apply the requested changes to the generated files.
2. Update the approval task:

```
TaskUpdate:
  title: "Approval: Review generated tests"
  status: "completed"
  metadata:
    iteration: 1
    result: "changes_requested"
    feedback_summary: "Fix login selector, add timeout to dashboard load"
```

3. Create a new approval task for the next round:

```
TaskCreate:
  title: "Approval: Review generated tests #2"
  status: "in_progress"
  metadata:
    iteration: 2
    changes_made: ["fixed login selector", "added timeout to dashboard load"]
```

4. Present the revised tests to the user again.

Repeat until the user replies with "approved" or equivalent affirmation.

### On Approval

```
TaskUpdate:
  title: "Approval: Review generated tests"
  status: "completed"
  metadata:
    iteration: 1
    result: "approved"
    final_test_count: 23
```

---

## Phase 6: Write Files

Write all generated files to `e2e/desktop/`.

### Step 1: Create Directory Structure

```
1. Ensure e2e/desktop/ exists (create if not).
2. Ensure e2e/desktop/tests/ exists (create if not).
3. Ensure .github/workflows/ exists (create if not).
```

### Step 2: Write All Files

Write each file in order:

1. `e2e/desktop/playwright.config.ts`
2. `e2e/desktop/package.json`
3. `e2e/desktop/tests/auth.setup.ts`
4. `e2e/desktop/tests/workflows.spec.ts`
5. `e2e/desktop/.gitignore`
6. `.github/workflows/e2e.yml` (note: this is at the repo root, not inside `e2e/desktop/`)

### Step 3: Verify Files

After writing, read back each file to confirm it was written correctly:

```
Use Read tool to verify:
  - e2e/desktop/playwright.config.ts
  - e2e/desktop/package.json
  - e2e/desktop/tests/auth.setup.ts
  - e2e/desktop/tests/workflows.spec.ts
  - e2e/desktop/.gitignore
  - .github/workflows/e2e.yml
```

### Step 4: Update Tasks

```
TaskCreate:
  title: "Write: e2e/desktop/"
  status: "completed"
  metadata:
    files_written: 6
    output_directory: "e2e/desktop/"
    ci_workflow: ".github/workflows/e2e.yml"
```

```
TaskUpdate:
  title: "Convert: Desktop Workflows to Playwright"
  status: "completed"
  metadata:
    source_file: "/workflows/desktop-workflows.md"
    total_workflows_converted: 23
    files_written: 6
    output_directory: "e2e/desktop/"
    ci_workflow: ".github/workflows/e2e.yml"
    review_iterations: 1
```

### Final Summary

Present the user with a completion summary:

```
Desktop workflow-to-Playwright conversion complete.

Output directory: e2e/desktop/
CI workflow: .github/workflows/e2e.yml

Files written:
  - playwright.config.ts    (config with auth + Vercel bypass)
  - package.json            (Playwright dependency)
  - tests/auth.setup.ts     (authentication scaffolding)
  - tests/workflows.spec.ts (23 test blocks, 142 steps)
  - .gitignore              (excludes auth state + reports)
  - e2e.yml                 (GitHub Actions CI workflow)

Summary:
  - Workflows converted: 23 (5 core, 12 feature, 6 edge)
  - Deprecated skipped: 2
  - Manual steps commented: 3
  - Selectors from codebase: 87
  - Review iterations: 1

Next steps:
  1. cd e2e/desktop && npm install && npx playwright install chromium
  2. npx playwright test --headed   (run locally in headed mode)
  3. npx playwright test --ui       (use Playwright UI mode for debugging)
  4. Configure GitHub secrets: TEST_EMAIL, TEST_PASSWORD, VERCEL_AUTOMATION_BYPASS_SECRET
  5. Push to trigger CI on next Vercel preview deployment
```

---

## Session Recovery

If the skill is invoked and an existing task list is found, use this decision tree to determine where to resume.

### Decision Tree

```
Check TaskList for "Convert: Desktop Workflows to Playwright"

CASE 1: No task list exists
  -> Start from Phase 1

CASE 2: Parse task is "completed", no Check task
  -> Workflow file has been parsed
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
I found an existing session for desktop workflow-to-Playwright conversion.

Current state: [describe where things left off]
Last completed phase: [phase name]

I will resume from [next phase]. If you would like to start over instead,
let me know and I will create a fresh session.
```

---

## Handling Updates

When the user chooses "Update" mode (modifying existing tests to match changed workflows), follow these rules.

### Rules for Updating Existing Tests

1. **Preserve custom modifications** -- If the user has manually edited a generated test (added custom helpers, changed selectors, added extra assertions), preserve those edits. Look for comments like `// CUSTOM:` or any code that does not match the generated pattern.

2. **Match workflows to test blocks** -- Use the `test.describe('Workflow N: ...')` naming convention to match existing test blocks to their source workflows. This is why consistent naming is critical.

3. **Update changed workflows** -- If a workflow's steps have changed since the last generation, regenerate only that workflow's `test.describe` block. Preserve the position of the block within the file.

4. **Add new workflows** -- New workflows are added to the appropriate priority group (`Core Workflows`, `Feature Workflows`, `Edge Case Workflows`). They are appended to the end of their group.

5. **Mark removed workflows** -- If a workflow has been deprecated since the last generation, comment out its test block rather than deleting it:

```typescript
// DEPRECATED: Workflow 7 -- Legacy Export Feature
// Reason: Export feature removed in v2.3
// Date: 2025-01-15
// test.describe('Workflow 7: Legacy Export Feature', () => { ... });
```

6. **Regenerate config files** -- `playwright.config.ts`, `package.json`, `.gitignore`, and the CI workflow are always regenerated from templates (they should not contain custom modifications).

7. **Preserve auth.setup.ts customizations** -- If the user has customized the auth setup (different login flow, multi-step auth), preserve their version. Only regenerate if the user explicitly requests it.

### Update Summary

After an update operation, present a change summary:

```
Desktop Playwright test update complete.

Changes to tests/workflows.spec.ts:
  - Test blocks preserved (unchanged): 18
  - Test blocks updated (steps changed): 3
  - Test blocks deprecated (commented out): 1
  - Test blocks added (new workflows): 2

Changed tests:
  - Workflow 4: Updated steps 3-5 (new form field added)
  - Workflow 12: Updated step 1 (route changed to /preferences)
  - Workflow 19: Updated steps 5-7 (confirmation dialog added)

Deprecated tests:
  - Workflow 7: Legacy Export Feature

New tests:
  - Workflow 26: Dashboard Widget Customization
  - Workflow 27: Real-Time Notification Center

Files regenerated: playwright.config.ts, package.json, .gitignore, e2e.yml
Files preserved: auth.setup.ts (custom modifications detected)
```

---

## Selector Strategy Reference

When translating workflow steps to Playwright code, always prefer the most resilient selector available. This table shows the preferred order, matching Playwright's official recommendation.

| Priority | Strategy | When to Use | Example |
|----------|----------|-------------|---------|
| 1 | `getByRole` | Buttons, links, headings, checkboxes, radio buttons, and any element with an explicit ARIA role | `page.getByRole('button', { name: 'Submit' })` |
| 2 | `getByLabel` | Form inputs that have an associated `<label>` element or `aria-label` attribute | `page.getByLabel('Email address')` |
| 3 | `getByPlaceholder` | Inputs without labels but with placeholder text | `page.getByPlaceholder('Search...')` |
| 4 | `getByText` | Non-interactive elements identified by their visible text content | `page.getByText('Welcome back')` |
| 5 | `getByTestId` | Elements with `data-testid` attributes, useful when other selectors are ambiguous | `page.getByTestId('sidebar-nav')` |
| 6 | CSS selector | Last resort when no semantic selector is available | `page.locator('.custom-widget > .action-btn')` |

### Selector Anti-Patterns

Avoid in generated tests: ID selectors (`#submit-btn`), class selectors (`.btn-primary`), structural selectors (`div > span:nth-child(3)`), and attribute selectors (`[onclick="save()"]`). All of these are fragile and break on refactors. Always prefer the semantic locators in the priority table above.

---

## Constraints

- **Tools allowed** -- This skill only uses Read, Write, Glob, Grep, and the Task/Explore tools. Do NOT use Chrome MCP, iOS Simulator MCP, Playwright MCP, or any other browser automation tool. All browser interactions are generated as code, never executed during conversion.
- **Output location** -- All test files go to `e2e/desktop/`. The CI workflow goes to `.github/workflows/e2e.yml` at the repository root.
- **Auth is always generated** -- `auth.setup.ts` is always included, even if zero workflows require authentication. It gracefully handles missing credentials.
- **Vercel headers are always included** -- The `x-vercel-protection-bypass` and `x-vercel-set-bypass-cookie` headers are conditionally applied in `playwright.config.ts` when the environment variable is set.
- **No runtime dependencies on workflows** -- The generated test project is fully self-contained. It does not read or import from the workflow markdown file at runtime.
- **Playwright best practices** -- Use `getByRole`, `getByLabel`, `getByText`, `getByPlaceholder`, and `getByTestId` in that order. Avoid CSS and XPath selectors unless absolutely necessary.
