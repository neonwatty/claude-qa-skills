---
name: mobile-workflow-to-playwright
description: Converts mobile workflow markdown into a self-contained Playwright test project with mobile viewports (Chromium + WebKit), authentication scaffolding, UX anti-pattern assertions, and CI workflow. Use when the user says "convert mobile workflows to playwright", "translate mobile workflows to CI", or "generate mobile playwright tests".
---

# Mobile Workflow to Playwright Converter

You are a senior QA automation engineer converting human-readable mobile workflow documentation into a self-contained Playwright test project optimized for mobile viewports. Your job is to read workflows from `/workflows/mobile-workflows.md`, translate every step into idiomatic Playwright code with mobile-specific UX assertions, and produce a fully functional test project at `e2e/mobile/` that includes dual-browser coverage (Chromium and WebKit), authentication scaffolding, UX anti-pattern detection, CI configuration, and Vercel deployment protection headers.

Every generated test must be runnable out of the box with `cd e2e/mobile && npm ci && npx playwright test`.

---

## Task List Integration

Task lists track agent progress, provide user visibility, enable session recovery after interruptions, record review iterations, and serve as an audit trail of what was parsed, generated, and approved.

### Task Hierarchy

Every run of this skill creates the following task tree. Tasks are completed in order.

```
[Main Task] "Convert: Mobile Workflows to Playwright"
  +-- [Parse Task]    "Parse: mobile-workflows.md"
  +-- [Check Task]    "Check: Existing e2e/mobile/ project"
  +-- [Selector Task] "Selectors: Find for all workflows"   (agent)
  +-- [Generate Task] "Generate: Playwright project"
  +-- [Approval Task] "Approval: Review generated tests"
  +-- [Write Task]    "Write: e2e/mobile/"
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
/workflows/mobile-workflows.md  ->  e2e/mobile/
                                      +-- playwright.config.ts
                                      +-- package.json
                                      +-- tests/
                                      |   +-- auth.setup.ts
                                      |   +-- workflows.spec.ts
                                      +-- .github/workflows/mobile-e2e.yml
                                      +-- .gitignore
```

Every file in the output is self-contained. The project has no dependency on the source workflow markdown at runtime -- the workflows are fully compiled into Playwright test code.

---

## Phase 1: Parse Workflows

Read the workflow markdown file, extract each workflow with its metadata, and build an internal representation that drives all subsequent phases.

> **Format reference:** The input workflow file follows the format defined in [`docs/workflow-format.md`](../../docs/workflow-format.md). See that spec for details on heading format, metadata comments, step format, recognized verbs, and assertion types.

### Step 1: Locate the Workflow File

Use Glob to search for the workflow file:

```
Glob patterns:
  - workflows/mobile-workflows.md
```

If no file is found, stop and inform the user:

```
No mobile workflow file found at /workflows/mobile-workflows.md.
Please run "generate mobile workflows" first, or provide the path
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
    name: "Mobile User Registration",
    auth: false,
    priority: "core",
    estimatedSteps: 7,
    preconditions: ["User is on the landing page on a mobile device"],
    steps: [
      { action: "Navigate to /signup", verify: "Signup form is visible" },
      { action: "Tap the first name field and type 'John'", verify: "Field shows 'John'" },
      ...
    ],
    postconditions: ["User account exists", "User is redirected to dashboard"]
  },
  ...
]
```

Skip any workflow marked `<!-- deprecated: true -->`. Log skipped workflows to the user:

```
Parsed 25 workflows from mobile-workflows.md.
Skipped 2 deprecated workflows: #7 (Legacy Mobile Export), #15 (Old Settings Page).
Converting 23 active workflows.
```

### Step 4: Create Tasks

```
TaskCreate:
  title: "Convert: Mobile Workflows to Playwright"
  status: "in_progress"
  metadata:
    source_file: "/workflows/mobile-workflows.md"
    total_workflows: 25
    active_workflows: 23
    deprecated_skipped: 2
    output_path: "e2e/mobile/"
```

```
TaskCreate:
  title: "Parse: mobile-workflows.md"
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

Before generating, check whether an `e2e/mobile/` directory already exists.

### Step 1: Check for Existing Files

Use Glob to check for existing project files:

```
Glob patterns:
  - e2e/mobile/playwright.config.ts
  - e2e/mobile/package.json
  - e2e/mobile/tests/*.spec.ts
  - e2e/mobile/tests/*.setup.ts
```

### Step 2: Determine Strategy

**If no existing project is found:**
- Proceed with fresh generation.
- No further decisions needed.

**If an existing project is found:**
- Read the existing `tests/workflows.spec.ts` to understand what is already covered.
- Use `AskUserQuestion` to determine the user's intent:

```
I found an existing Playwright project at e2e/mobile/ with [N] existing test blocks.

How would you like to proceed?

1. **Overwrite** -- Replace all generated files with fresh output
2. **Update** -- Add new tests for new workflows, update changed workflows, preserve custom modifications
3. **Cancel** -- Stop and keep existing files unchanged
```

### Step 3: Create the Check Task

```
TaskCreate:
  title: "Check: Existing e2e/mobile/ project"
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
    You are a QA exploration agent focused on finding Playwright selectors
    for mobile-optimized elements.

    Your job is to find the best Playwright-compatible selectors for every
    interactive element referenced in the workflow documentation. Pay special
    attention to mobile-specific elements: hamburger menus, bottom navigation
    bars, swipe targets, pull-to-refresh triggers, and touch-optimized controls.
    Use Read, Grep, and Glob to explore the codebase. Do NOT use any browser tools.

    Here are the workflows I need selectors for:
    [Paste the parsed workflow list with all step actions]

    For each element, search for: data-testid, aria-label, role attributes,
    <label> associations, placeholder text, and visible text content.

    Prefer selectors in this order (Playwright recommended):
    1. getByRole  2. getByLabel  3. getByPlaceholder
    4. getByText  5. getByTestId  6. CSS selector (last resort)

    Additionally, note any elements that appear to be touch-specific
    (hamburger icons, bottom tabs, swipeable cards, etc.) and whether
    they have appropriate ARIA attributes for accessibility.

    Return findings as:

    ## Selector Map
    | Workflow | Step | Element Description | Recommended Selector | Fallback Selector |
    |----------|------|--------------------|--------------------|-------------------|
    | 1 | 2 | "Save" button | getByRole('button', { name: 'Save' }) | getByTestId('save-btn') |

    ## Missing Selectors
    - Elements not found in codebase (suggest data-testid additions)

    ## Mobile-Specific Findings
    - Elements that change between mobile/desktop layouts
    - Hamburger vs sidebar navigation differences
    - Bottom nav vs top nav variations

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
    mobile_specific_elements: 12
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

Generate the Playwright configuration file with two mobile browser projects (Chromium and WebKit emulating iPhone 15 Pro), auth setup as a dependency, and Vercel deployment protection bypass headers.

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
      name: 'mobile-chromium',
      use: {
        ...devices['iPhone 15 Pro'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-webkit',
      use: {
        ...devices['iPhone 15 Pro'],
        browserName: 'webkit',
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
```

Key configuration decisions: `fullyParallel` for speed, `retries: 2` in CI only for flaky test mitigation, `trace: 'on-first-retry'` for debugging failures, `baseURL` from environment for localhost vs deployed URL flexibility. Vercel bypass headers are conditionally applied only when `VERCEL_AUTOMATION_BYPASS_SECRET` is set. The `setup` project runs `auth.setup.ts` before any test that depends on `storageState`. Two mobile projects provide coverage across both Chromium-based and WebKit-based mobile browsers, catching engine-specific rendering and behavior differences. The `devices['iPhone 15 Pro']` preset configures mobile viewport dimensions, device scale factor, touch support, and user agent string.

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
  "name": "mobile-e2e",
  "private": true,
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:headed": "playwright test --headed",
    "test:chromium": "playwright test --project=mobile-chromium",
    "test:webkit": "playwright test --project=mobile-webkit"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.0"
  }
}
```

### Step 5: Generate .github/workflows/mobile-e2e.yml

Generate the GitHub Actions CI workflow that runs mobile tests against Vercel preview deployments. Both Chromium and WebKit browsers are installed for dual-engine coverage.

```yaml
name: Mobile E2E Tests
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
      - run: cd e2e/mobile && npm ci
      - run: cd e2e/mobile && npx playwright install chromium webkit --with-deps
      - run: cd e2e/mobile && npx playwright test
        env:
          BASE_URL: ${{ github.event.deployment_status.target_url }}
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
          VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: mobile-playwright-report
          path: e2e/mobile/playwright-report/
```

Key CI decisions: triggers on `deployment_status` so tests run against the actual Vercel preview URL, filters to `Preview` environment only, uses `target_url` as `BASE_URL`, requires three GitHub secrets (`TEST_EMAIL`, `TEST_PASSWORD`, `VERCEL_AUTOMATION_BYPASS_SECRET`), uploads Playwright HTML report as artifact on every run. Installs both `chromium` and `webkit` for full dual-engine mobile coverage.

### Step 6: Generate .gitignore

```
node_modules/
playwright/.auth/
playwright-report/
test-results/
```

### Step 7: Generate tests/workflows.spec.ts

This is the largest and most important file. Map each parsed workflow to a `test.describe()` block, and each workflow step to one or more Playwright actions. Every generated test also includes mobile UX anti-pattern assertions as `test.step()` blocks.

#### Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Core Workflows', () => {

  test.describe('Workflow 1: Mobile User Registration', () => {
    test('completes user registration flow on mobile', async ({ page }) => {
      // Step 1: Navigate to /signup
      await page.goto('/signup');
      // Verify: Signup form is visible
      await expect(page.getByRole('heading', { name: 'Sign Up' })).toBeVisible();

      // Step 2: Tap the first name field and type "John"
      await page.getByLabel('First name').fill('John');

      // Step 3: Tap the email field and type "john@example.com"
      await page.getByLabel('Email').fill('john@example.com');

      // Step 4: Tap the "Create Account" button
      await page.getByRole('button', { name: 'Create Account' }).click();

      // Step 5: Verify success message appears
      await expect(page.getByText('Account created successfully')).toBeVisible();
    });

    test('UX: touch targets and input accessibility', async ({ page }) => {
      await page.goto('/signup');
      // Runs all four UX checks -- see "UX Anti-Pattern Assertions" below
      await test.step('touch targets are at least 44px', async () => { /* ... */ });
      await test.step('input font-size >= 16px to prevent iOS zoom', async () => { /* ... */ });
      await test.step('no hover-only interactions', async () => { /* ... */ });
      await test.step('viewport meta tag is present', async () => { /* ... */ });
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
3. **Two tests per workflow** -- Each workflow generates two `test()` calls:
   - A **functional test** containing all workflow steps in sequence (atomic pass/fail).
   - A **UX anti-pattern test** that checks mobile usability on the pages visited by that workflow.
4. **Step comments** -- Every step from the workflow is preceded by a comment (`// Step N: ...`) and its verification (`// Verify: ...`).

#### UX Anti-Pattern Assertions

Every generated workflow produces a companion UX test that validates mobile best practices on the pages visited during that workflow. These assertions are wrapped in `test.step()` blocks for clear reporting. For each workflow, determine which unique pages are visited (by examining navigation steps and URL changes) and generate one UX test per workflow that navigates to the primary page and runs all four checks.

The four required checks:

1. **Touch targets >= 44px** -- Loop over all `getByRole('button')` and `getByRole('link')` elements. For each, call `boundingBox()` and assert `width >= 44` and `height >= 44`. This enforces Apple HIG and WCAG 2.5.8 minimum tap target size.

2. **Input font-size >= 16px** -- Loop over all `input, textarea, select` elements. For each, evaluate `parseFloat(window.getComputedStyle(el).fontSize)` and assert `>= 16`. This prevents the iOS Safari auto-zoom behavior on focus.

3. **No hover-only interactions** -- Evaluate page stylesheets. For each CSS rule containing `:hover`, find matching elements and check that they also have a click/tap handler (are `<button>`, `<a>`, or have `role="button"`). Collect violations and assert the list is empty.

4. **Viewport meta tag** -- Assert `meta[name="viewport"]` exists with count 1 and its `content` attribute contains `width=device-width`.

Full implementation of all four checks is shown in the Example Translation section below.

#### Translation Rules for Steps

When translating workflow steps to Playwright code, apply the following rules. Use the Selector Map from Phase 3 to choose the best selector for each element. Mobile workflows use tap language, which maps to Playwright's `.click()` method since Playwright's mobile emulation handles touch events automatically.

```typescript
// Navigation
await page.goto('/dashboard');

// Tap actions (mobile tap = Playwright click with touch emulation)
await page.getByRole('button', { name: 'Save' }).click();
await page.getByRole('link', { name: 'Settings' }).click();
await page.getByText('Learn more').click();

// Tap hamburger menu / mobile navigation
await page.getByRole('button', { name: /menu|hamburger/i }).click();
await page.getByRole('navigation').getByRole('link', { name: 'Settings' }).click();

// Type / fill actions (tap field then type)
await page.getByLabel('Email').fill('hello@example.com');
await page.getByPlaceholder('Search...').fill('search term');

// Select, checkbox, toggle
await page.getByLabel('Role').selectOption('Admin');
await page.getByLabel('Remember me').check();
await page.getByLabel('Send notifications').uncheck();

// Swipe actions (dispatch touchstart + touchend with offset clientX)
await page.locator('[data-testid="swipeable-card"]').evaluate((el) => {
  el.dispatchEvent(new TouchEvent('touchstart', { touches: [new Touch({ identifier: 0, target: el, clientX: 300, clientY: 200 })] }));
  el.dispatchEvent(new TouchEvent('touchend', { changedTouches: [new Touch({ identifier: 0, target: el, clientX: 50, clientY: 200 })] }));
});

// Pull-to-refresh (mouse drag down)
await page.mouse.move(200, 100);
await page.mouse.down();
await page.mouse.move(200, 400, { steps: 10 });
await page.mouse.up();

// Wait and visibility
await expect(page.getByText('Loading')).toBeHidden();
await page.waitForURL('**/dashboard');

// Verification assertions
await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
await expect(page.getByText('Changes saved')).toBeVisible();
await expect(page).toHaveURL(/.*\/settings/);
await expect(page).toHaveTitle('Settings');

// Bottom navigation tap
await page.getByRole('navigation').getByRole('link', { name: 'Home' }).click();
await page.getByRole('navigation').getByRole('link', { name: 'Profile' }).click();

// Scroll into view (for content below the fold on mobile)
await page.getByText('Comments').scrollIntoViewIfNeeded();

// File upload
await page.getByLabel('Upload').setInputFiles('photo.jpg');

// Keyboard
await page.keyboard.press('Enter');
```

#### Handling MANUAL Steps

Workflow steps marked `[MANUAL]` cannot be automated. Generate a skipped or annotated test step:

```typescript
// Step 4: [MANUAL] Verify the push notification arrives on the device
// This step requires manual verification -- cannot be automated with Playwright.
// Consider using a push notification testing service for automation.
```

Do NOT generate `test.skip()` for the entire workflow if only one step is manual. Instead, add the comment and continue with subsequent automatable steps.

#### Handling Preconditions

If a workflow has preconditions beyond authentication, generate them as `test.beforeEach` or inline setup code:

```typescript
test.describe('Workflow 5: Edit Existing Post', () => {
  test('edits an existing post on mobile', async ({ page }) => {
    // Precondition: At least one post exists
    // Navigate to the posts list to verify
    await page.goto('/posts');
    await expect(page.getByRole('article')).toHaveCount(1, { timeout: 5000 });

    // Step 1: Tap the first post title
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
    functional_tests: 23
    ux_tests: 23
    total_steps_translated: 142
    manual_steps_skipped: 3
    selectors_from_agent: 87
```

---

## Action Mapping Reference

This table provides the complete mapping from mobile workflow language to Playwright code. Use it as a quick reference when translating steps.

| Workflow Language | Playwright Code |
|---|---|
| Navigate to /dashboard | `await page.goto('/dashboard')` |
| Tap the "Save" button | `await page.getByRole('button', { name: 'Save' }).click()` |
| Tap the "Settings" link | `await page.getByRole('link', { name: 'Settings' }).click()` |
| Tap the hamburger menu | `await page.getByRole('button', { name: /menu/i }).click()` |
| Tap the bottom navigation "Home" tab | `await page.getByRole('navigation').getByRole('link', { name: 'Home' }).click()` |
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
| Upload "photo.jpg" | `await page.getByLabel('Upload').setInputFiles('photo.jpg')` |
| Press Enter to submit | `await page.keyboard.press('Enter')` |
| Scroll to comments section | `await page.getByText('Comments').scrollIntoViewIfNeeded()` |
| Swipe left on card | `await card.evaluate((el) => { /* touch events */ })` |
| Pull down to refresh | `await page.mouse.move(200, 100); /* drag down */` |
| Long press on item | `await page.getByText('Item').click({ delay: 800 })` |
| Verify element has count N | `await expect(page.getByRole('listitem')).toHaveCount(N)` |
| Verify input has value "text" | `await expect(page.getByLabel('Name')).toHaveValue('text')` |
| Clear the search field | `await page.getByLabel('Search').clear()` |
| Dismiss the keyboard | `await page.keyboard.press('Escape')` |
| Tap outside to close modal | `await page.locator('body').click({ position: { x: 10, y: 10 } })` |

---

## Example Translation

Below is a complete worked example showing how a workflow from `mobile-workflows.md` is converted into Playwright test code.

### Input Workflow

```markdown
## Workflow 3: Create New Post
<!-- auth: required -->
<!-- priority: core -->
<!-- estimated-steps: 8 -->

> Tests the complete flow of creating a new blog post from the mobile dashboard.

**Preconditions:**
- User is logged in as editor

**Steps:**

1. Navigate to /dashboard
   - Verify the dashboard heading is visible

2. Tap the "New Post" button
   - Verify the post editor page loads

3. Tap the title field and type "My First Post"
   - Verify the title field shows "My First Post"

4. Tap the content editor and type "This is the post body content."
   - Verify content appears in the editor

5. Tap the category dropdown and select "Technology"
   - Verify "Technology" is selected

6. Tap the "Publish" button
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
  test('creates a new blog post from the mobile dashboard', async ({ page }) => {
    // Step 1: Navigate to /dashboard
    await page.goto('/dashboard');
    // Verify: The dashboard heading is visible
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Step 2: Tap the "New Post" button
    await page.getByRole('button', { name: 'New Post' }).click();
    // Verify: The post editor page loads
    await expect(page.getByRole('heading', { name: /editor|new post/i })).toBeVisible();

    // Step 3: Tap the title field and type "My First Post"
    await page.getByLabel('Title').fill('My First Post');
    // Verify: The title field shows "My First Post"
    await expect(page.getByLabel('Title')).toHaveValue('My First Post');

    // Step 4: Tap the content editor and type "This is the post body content."
    await page.getByLabel('Content').fill('This is the post body content.');
    // Verify: Content appears in the editor
    await expect(page.getByLabel('Content')).toHaveValue('This is the post body content.');

    // Step 5: Tap the category dropdown and select "Technology"
    await page.getByLabel('Category').selectOption('Technology');
    // Verify: "Technology" is selected
    await expect(page.getByLabel('Category')).toHaveValue('Technology');

    // Step 6: Tap the "Publish" button
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

  test('UX: mobile usability on post editor', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'New Post' }).click();

    await test.step('touch targets are at least 44px', async () => {
      const buttons = page.getByRole('button');
      const count = await buttons.count();
      for (let i = 0; i < count; i++) {
        const box = await buttons.nth(i).boundingBox();
        expect(box, `Button ${i} should have dimensions`).not.toBeNull();
        expect(box!.width, `Button ${i} width >= 44px`).toBeGreaterThanOrEqual(44);
        expect(box!.height, `Button ${i} height >= 44px`).toBeGreaterThanOrEqual(44);
      }
    });

    await test.step('input font-size >= 16px to prevent iOS zoom', async () => {
      const inputs = page.locator('input, textarea, select');
      const count = await inputs.count();
      for (let i = 0; i < count; i++) {
        const fontSize = await inputs.nth(i).evaluate(
          (el) => parseFloat(window.getComputedStyle(el).fontSize)
        );
        expect(fontSize, `Input ${i} font-size >= 16px`).toBeGreaterThanOrEqual(16);
      }
    });

    await test.step('no hover-only interactions', async () => {
      const hoverOnlyElements = await page.evaluate(() => {
        const issues: string[] = [];
        const sheets = Array.from(document.styleSheets);
        for (const sheet of sheets) {
          try {
            const rules = Array.from(sheet.cssRules || []);
            for (const rule of rules) {
              if (rule instanceof CSSStyleRule && rule.selectorText?.includes(':hover')) {
                const baseSelector = rule.selectorText.replace(/:hover/g, '');
                const elements = document.querySelectorAll(baseSelector);
                elements.forEach((el) => {
                  const style = window.getComputedStyle(el);
                  if (style.display !== 'none' && style.visibility !== 'hidden') {
                    const hasClickHandler = el.getAttribute('onclick') ||
                      el.tagName === 'BUTTON' || el.tagName === 'A' ||
                      el.getAttribute('role') === 'button';
                    if (!hasClickHandler) {
                      issues.push(`${el.tagName}.${el.className} has :hover but no tap handler`);
                    }
                  }
                });
              }
            }
          } catch {
            // Cross-origin stylesheets cannot be inspected
          }
        }
        return issues;
      });
      expect(hoverOnlyElements, 'Elements with hover-only interactions').toHaveLength(0);
    });

    await test.step('viewport meta tag is present', async () => {
      const viewport = page.locator('meta[name="viewport"]');
      await expect(viewport).toHaveCount(1);
      const content = await viewport.getAttribute('content');
      expect(content).toContain('width=device-width');
    });
  });
});
```

### Translation Notes

Key patterns: step comments mirror the workflow text for cross-referencing, every "Verify" sub-step becomes an `expect()` assertion, selectors follow the priority hierarchy (role > label > text > testid) with Phase 3 overrides, test names are derived from the workflow description, dynamic URL segments use regex patterns, and each workflow gets a companion UX test that validates mobile-specific usability on the pages it visits. The UX test navigates to the workflow's primary page and checks touch targets, input font sizes, hover-only interactions, and viewport meta configuration.

---

## Phase 5: Review with User (REQUIRED)

This phase is mandatory. You must never write files without user approval.

### Present Generated Tests for Review

Use `AskUserQuestion` to present the generated project. Include the project structure, test summary (functional + UX counts per priority tier), browser coverage (mobile-chromium, mobile-webkit), and the complete generated `tests/workflows.spec.ts` and `auth.setup.ts` (if customized). Ask the user to review test translations, selectors, UX thresholds, and auth flow. Wait for "approved" or feedback for revision.

### Create the Approval Task

```
TaskCreate:
  title: "Approval: Review generated tests"
  status: "in_progress"
  metadata:
    iteration: 1
    test_blocks_presented: 23
    functional_tests: 23
    ux_tests: 23
    total_steps: 142
```

### Handling Feedback

If the user provides feedback instead of approving: (1) apply changes, (2) mark current approval task completed with `result: "changes_requested"` and `feedback_summary`, (3) create a new approval task for the next iteration, (4) re-present revised tests. Repeat until the user approves.

On approval, mark the approval task completed with `result: "approved"` and the final test counts.

---

## Phase 6: Write Files

Write all generated files to `e2e/mobile/`.

### Step 1: Create Directory Structure

```
1. Ensure e2e/mobile/ exists (create if not).
2. Ensure e2e/mobile/tests/ exists (create if not).
3. Ensure .github/workflows/ exists (create if not).
```

### Step 2: Write All Files

Write each file in order:

1. `e2e/mobile/playwright.config.ts`
2. `e2e/mobile/package.json`
3. `e2e/mobile/tsconfig.json`
4. `e2e/mobile/tests/auth.setup.ts`
5. `e2e/mobile/tests/workflows.spec.ts`
6. `e2e/mobile/.gitignore`
7. `.github/workflows/mobile-e2e.yml` (note: this is at the repo root, not inside `e2e/mobile/`)

**`tsconfig.json` contents:**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["tests/**/*.ts"]
}
```

### Step 3: Verify Files

After writing, read back each file to confirm it was written correctly.

### Step 4: Type-Check Generated Code

Run TypeScript type-checking on the generated project to catch compilation errors before presenting the project as complete.

**Prerequisite:** `tsc` must be available. If `npx tsc --version` fails, attempt `npm install typescript --save-dev` in the e2e/mobile directory. If TypeScript still cannot be found, stop and inform the user: "TypeScript compiler (tsc) is required for type-checking but could not be found. Install it with `npm install -D typescript` or ensure it is available globally." Type-checking is not optional — do not skip it.

**Process:**

```
1. Install dependencies (capture errors for diagnosis):
   cd e2e/mobile && npm install --ignore-scripts 2>&1 | tee /tmp/npm-install.log

2. Run type-check:
   cd e2e/mobile && npx tsc --noEmit

3. If type errors are found:
   a. Read the tsc error output to identify the failing file and line.
   b. Fix the type error in the generated code.
   c. IMPORTANT: Write modified files back to disk BEFORE the next tsc run.
      Do not batch fixes — write each fix immediately so the next tsc run
      sees the corrected code on disk.
   d. Re-run: cd e2e/mobile && npx tsc --noEmit
   e. Repeat up to a 3-attempt cap (counted per full tsc run, not per error).
      After 3 full tsc runs with errors, STOP and use AskUserQuestion to
      present the remaining errors to the user and ask for guidance.
```

**Semantic guard:** The fix loop must NOT modify assertions, selectors, or test intent. Fixes are limited to:
- Type annotations (adding explicit types, fixing type mismatches)
- Import statements (missing imports, incorrect import paths)
- API usage corrections (wrong Playwright API method signature)

If a fix would change **what** the test checks (modifying assertions, changing selectors, altering test logic, removing test steps), do NOT apply it. Instead, escalate to the user via `AskUserQuestion`:

```
Type error in [file]:[line] requires changing test intent to fix:

  Error: [tsc error message]
  Current code: [the line with the error]

  Fixing this would require changing [what would change — e.g., the assertion,
  the selector, the test logic]. This is beyond the scope of type-error fixes.

  How would you like to proceed?
  1. Fix it manually
  2. Suppress with // @ts-expect-error and move on
  3. Remove the affected test block
```

### Step 5: Update Tasks

Mark `"Write: e2e/mobile/"` as completed and update the main task `"Convert: Mobile Workflows to Playwright"` to completed with final metadata (files written, workflow counts, browser projects, review iterations).

### Final Summary

Present a completion summary listing: output directory (`e2e/mobile/`), CI workflow path, all files written, conversion counts (workflows, deprecated, manual steps, selectors, review iterations, UX checks per workflow), browser projects (mobile-chromium, mobile-webkit), and next steps:

1. `cd e2e/mobile && npm install && npx playwright install chromium webkit`
2. `npx playwright test --headed` (local headed mode)
3. `npx playwright test --project=mobile-chromium` or `--project=mobile-webkit` (single engine)
4. Configure GitHub secrets: `TEST_EMAIL`, `TEST_PASSWORD`, `VERCEL_AUTOMATION_BYPASS_SECRET`
5. Push to trigger CI on next Vercel preview deployment

---

## Session Recovery

If the skill is invoked and an existing task list is found, check for the task `"Convert: Mobile Workflows to Playwright"` and find the last completed subtask. Resume from the next phase:

| Last Completed Task | Resume From |
|---|---|
| None | Phase 1 (parse) |
| Parse | Phase 2 (check existing) |
| Check | Phase 3 (selector discovery) |
| Selectors (in_progress) | Phase 3 (re-spawn agent) |
| Selectors (completed) | Phase 4 (generate) |
| Generate | Phase 5 (review) |
| Approval (changes_requested) | Phase 5 (apply feedback, re-present) |
| Approval (approved) | Phase 6 (write files) |
| Write | Done (show summary) |

Always inform the user when resuming: state what was completed, what phase comes next, and offer to start fresh instead.

---

## Handling Updates

When the user chooses "Update" mode (modifying existing tests to match changed workflows), follow these rules.

### Rules for Updating Existing Tests

1. **Preserve custom modifications** -- If the user has manually edited a generated test (added custom helpers, changed selectors, added extra assertions), preserve those edits. Look for comments like `// CUSTOM:` or any code that does not match the generated pattern.

2. **Match workflows to test blocks** -- Use the `test.describe('Workflow N: ...')` naming convention to match existing test blocks to their source workflows. This is why consistent naming is critical.

3. **Update changed workflows** -- If a workflow's steps have changed since the last generation, regenerate only that workflow's `test.describe` block (both the functional test and the UX test). Preserve the position of the block within the file.

4. **Add new workflows** -- New workflows are added to the appropriate priority group (`Core Workflows`, `Feature Workflows`, `Edge Case Workflows`). They are appended to the end of their group.

5. **Mark removed workflows** -- If a workflow has been deprecated since the last generation, comment out its test block rather than deleting it:

```typescript
// DEPRECATED: Workflow 7 -- Legacy Mobile Export Feature
// Reason: Export feature removed in v2.3
// Date: 2025-01-15
// test.describe('Workflow 7: Legacy Mobile Export Feature', () => { ... });
```

6. **Regenerate config files** -- `playwright.config.ts`, `package.json`, `.gitignore`, and the CI workflow are always regenerated from templates (they should not contain custom modifications).

7. **Preserve auth.setup.ts customizations** -- If the user has customized the auth setup (different login flow, multi-step auth), preserve their version. Only regenerate if the user explicitly requests it.

### Update Summary

After an update operation, present a change summary listing: test blocks preserved, updated, deprecated, and added; which specific workflows changed and why; which files were regenerated vs preserved.

---

## Selector Strategy Reference

Prefer selectors in this order: (1) `getByRole` (2) `getByLabel` (3) `getByPlaceholder` (4) `getByText` (5) `getByTestId` (6) CSS selector (last resort). Avoid ID selectors, class selectors, structural selectors, and attribute selectors -- all are fragile and break on refactors.

---

## Constraints

- **Tools allowed** -- This skill only uses Read, Write, Glob, Grep, and the Task/Explore tools. Do NOT use Chrome MCP, iOS Simulator MCP, Playwright CLI, or any other browser automation tool. All browser interactions are generated as code, never executed during conversion.
- **Output location** -- All test files go to `e2e/mobile/`. The CI workflow goes to `.github/workflows/mobile-e2e.yml` at the repository root.
- **Auth is always generated** -- `auth.setup.ts` is always included, even if zero workflows require authentication. It gracefully handles missing credentials.
- **Vercel headers are always included** -- The `x-vercel-protection-bypass` and `x-vercel-set-bypass-cookie` headers are conditionally applied in `playwright.config.ts` when the environment variable is set.
- **No runtime dependencies on workflows** -- The generated test project is fully self-contained. It does not read or import from the workflow markdown file at runtime.
- **Playwright best practices** -- Use `getByRole`, `getByLabel`, `getByText`, `getByPlaceholder`, and `getByTestId` in that order. Avoid CSS and XPath selectors unless absolutely necessary.
- **Dual browser coverage** -- Every test runs against both `mobile-chromium` and `mobile-webkit` projects to catch engine-specific rendering and behavior differences.
- **UX anti-pattern assertions** -- Every workflow generates a companion UX test that checks mobile usability (touch targets, input zoom prevention, hover-only detection, viewport meta). These are not optional -- they are always generated.
- **Mobile viewport** -- All tests run in the iPhone 15 Pro device emulation profile, which sets the correct viewport dimensions, device scale factor, touch support, and user agent string.
