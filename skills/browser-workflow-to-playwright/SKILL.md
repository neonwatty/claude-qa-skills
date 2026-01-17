---
name: browser-workflow-to-playwright
description: Translates browser workflow markdown files into Playwright E2E tests for CI. Use this when the user says "convert workflows to playwright", "translate workflows to CI", "generate playwright tests from workflows", or wants to promote refined browser workflows to automated CI tests.
---

# Browser Workflow to Playwright Skill

You are a senior QA automation engineer. Your job is to translate human-readable browser workflow markdown files into Playwright E2E test files that can run in CI.

## The Translation Pipeline

```
/workflows/browser-workflows.md     →     e2e/browser-workflows.spec.ts
     (Human-readable)                         (Playwright tests)
```

## When to Use This Skill

Use when:
- User has refined browser workflows via `browser-workflow-executor`
- User wants to promote workflows to CI
- User says "convert to playwright", "generate CI tests", "automate these workflows"

## Process

### Phase 1: Read and Parse Workflows

1. Read `/workflows/browser-workflows.md`
2. If file doesn't exist, inform user and stop
3. Parse all workflows (each starts with `## Workflow:` or `### Workflow:`)
4. For each workflow, extract:
   - Name and description
   - URL (if specified)
   - Numbered steps and substeps
   - Any `[MANUAL]` tagged steps

### Phase 2: Check for Existing Tests

1. Look for existing `e2e/browser-workflows.spec.ts`
2. If exists, parse it to find:
   - Which workflows are already translated
   - Timestamps or version markers
3. Determine which workflows need updating (diff strategy):
   - New workflows → Add
   - Modified workflows → Update
   - Removed workflows → Ask user whether to remove tests

### Phase 3: Explore Codebase for Selectors [DELEGATE TO AGENT]

**Purpose:** For each workflow step, explore the codebase to find reliable selectors. Delegate this to an Explore agent to save context.

**Use the Task tool to spawn an Explore agent:**

```
Task tool parameters:
- subagent_type: "Explore"
- model: "sonnet" (balance of speed and thoroughness)
- prompt: |
    You are finding reliable Playwright selectors for browser workflow steps.

    ## Workflows to Find Selectors For
    [Include parsed workflow steps that need selectors]

    ## What to Search For

    For each step, find the BEST available selector using this priority:

    **Selector Priority (best to worst):**
    1. data-testid="..."     ← Most stable, explicitly for testing
    2. aria-label="..."      ← Accessible and meaningful
    3. role="..." + text     ← Semantic and readable
    4. :has-text("...")      ← Works but fragile if text changes
    5. .class-name           ← Works but fragile if styles change
    6. Complex CSS path      ← Last resort, very fragile

    ## Search Strategy

    1. **Component Selectors**
       - Use Grep to search for React/Vue component names mentioned in steps
       - Find data-testid attributes: `data-testid=`
       - Find CSS class names in component files

    2. **Text-Based Selectors**
       - Match button text to actual button implementations
       - Find aria-labels: `aria-label=`
       - Locate placeholder text for inputs

    3. **Structural Selectors**
       - Identify form structures for input fields
       - Find modal/dialog patterns
       - Locate navigation elements

    ## Return Format

    Return a structured mapping:
    ```
    ## Selector Mapping

    ### Workflow: [Name]

    | Step | Element Description | Recommended Selector | Confidence | Notes |
    |------|---------------------|---------------------|------------|-------|
    | 1.1  | Login button        | [data-testid="login-btn"] | High | Found in LoginForm.tsx:45 |
    | 1.2  | Email input         | input[name="email"] | High | Found in LoginForm.tsx:23 |
    | 2.1  | Submit button       | button:has-text("Submit") | Medium | No data-testid, using text |

    ### Ambiguous Selectors (need user input)
    - Step 3.2 "settings button": Found multiple matches:
      1. [data-testid="settings-icon"] in Header.tsx
      2. [data-testid="settings-btn"] in Sidebar.tsx
      - Recommendation: Ask user which one

    ### Missing Selectors (not found)
    - Step 4.1 "export dropdown": Could not find element, may need manual inspection
    ```
```

**After agent returns:** Use the selector mapping to generate accurate Playwright test code. For ambiguous selectors, ask the user to choose. For missing selectors, flag for manual verification.

### Phase 4: Map Actions to Playwright

Translate natural language steps to Playwright commands:

| Workflow Language | Playwright Code |
|-------------------|-----------------|
| "Navigate to [URL]" | `await page.goto('URL')` |
| "Click [element]" | `await page.locator(selector).click()` |
| "Tap [element]" | `await page.locator(selector).click()` |
| "Type '[text]' in [field]" | `await page.locator(selector).fill('text')` |
| "Press Enter" | `await page.keyboard.press('Enter')` |
| "Wait for [element]" | `await expect(page.locator(selector)).toBeVisible()` |
| "Verify [condition]" | `await expect(...).toBe...(...)` |
| "Scroll to [element]" | `await page.locator(selector).scrollIntoViewIfNeeded()` |
| "Hover over [element]" | `await page.locator(selector).hover()` |
| "Select '[option]' from [dropdown]" | `await page.locator(selector).selectOption('option')` |
| "Upload [file]" | `await page.locator(selector).setInputFiles('path')` |
| "Wait [N] seconds" | `await page.waitForTimeout(N * 1000)` |
| "Take screenshot" | `await page.screenshot({ path: '...' })` |

### Phase 5: Handle Untranslatable Steps

For steps that cannot be automated:

**[MANUAL] tagged steps:**
```typescript
test.skip('Step N: [description]', async () => {
  // MANUAL: This step requires human intervention
  // Original: "[step text]"
  // Reason: [why it can't be automated]
});
```

**Ambiguous selectors:**
```typescript
// TODO: Selector needs verification - found multiple matches
// Options found:
//   1. [data-testid="btn-submit"]
//   2. button:has-text("Submit")
// Using best guess, please verify:
await page.locator('[data-testid="btn-submit"]').click();
```

**Platform-specific steps:**
```typescript
test.skip('Step N: [description]', async () => {
  // SKIP: This step is browser-specific and tested via browser-workflow-executor
  // Original: "[step text]"
});
```

### Phase 6: Generate Test File [DELEGATE TO AGENT]

**Purpose:** Generate the Playwright test file from the parsed workflows and selector mapping. Delegate to an agent for focused code generation.

**Use the Task tool to spawn a code generation agent:**

```
Task tool parameters:
- subagent_type: "general-purpose"
- model: "sonnet" (good balance for code generation)
- prompt: |
    You are generating a Playwright E2E test file from browser workflow specifications.

    ## Input Data

    **Workflows:**
    [Include parsed workflow data with names, steps, substeps]

    **Selector Mapping:**
    [Include selector mapping from Phase 3 agent]

    **Existing Test File (if updating):**
    [Include existing test content if this is an update, or "None - new file"]

    ## Your Task

    Generate `e2e/browser-workflows.spec.ts` following this structure:

    1. **File header** with generation timestamp and instructions
    2. **Imports** from @playwright/test
    3. **Test.describe block** for each workflow
    4. **Test.beforeEach** for common setup (navigation)
    5. **Individual tests** for each step
    6. **test.skip** for [MANUAL] steps with clear comments

    ## Code Style Requirements

    - Use the recommended selectors from the mapping
    - Add comments for each substep
    - Include setup code in tests that need prior state
    - Mark ambiguous selectors with TODO comments
    - Follow Playwright best practices

    ## Handle Special Cases

    - [MANUAL] steps → `test.skip()` with explanation
    - Ambiguous selectors → Use best guess + TODO comment
    - Missing selectors → Use descriptive text selector + TODO
    - Steps needing prior state → Add setup within test

    ## Return Format

    Return the complete test file content ready to write.
    Also return a summary:
    ```
    ## Generation Summary
    - Workflows: [count]
    - Total tests: [count]
    - Skipped (manual): [count]
    - TODOs for review: [count]
    ```
```

**After agent returns:** Write the generated test file to `e2e/browser-workflows.spec.ts`. Review any TODOs with the user.

Create `e2e/browser-workflows.spec.ts` with this structure:

```typescript
/**
 * Browser Workflow Tests
 *
 * Auto-generated from /workflows/browser-workflows.md
 * Generated: [timestamp]
 *
 * To regenerate: Run browser-workflow-to-playwright skill
 * To update workflows: Edit /workflows/browser-workflows.md and re-run
 */

import { test, expect } from '@playwright/test';

// ============================================================================
// WORKFLOW: [Workflow Name]
// Generated from: browser-workflows.md
// Last updated: [timestamp]
// ============================================================================

test.describe('Workflow: [Name]', () => {
  test.beforeEach(async ({ page }) => {
    // Common setup for this workflow
    await page.goto('[base-url]');
  });

  test('Step 1: [Description]', async ({ page }) => {
    // Substep: [substep description]
    await page.locator('[selector]').click();

    // Substep: [substep description]
    await expect(page.locator('[selector]')).toBeVisible();
  });

  test('Step 2: [Description]', async ({ page }) => {
    // ... continues
  });

  test.skip('Step 3: [MANUAL - Description]', async () => {
    // MANUAL: [reason]
  });
});

// ============================================================================
// WORKFLOW: [Next Workflow Name]
// ============================================================================

test.describe('Workflow: [Next Name]', () => {
  // ...
});
```

### Phase 7: Handle Updates (Diff Strategy)

When updating existing tests:

1. **Parse existing test file** to extract:
   - Workflow names and their test blocks
   - Any custom modifications (marked with `// CUSTOM:`)

2. **Compare with workflow markdown:**
   - Hash each workflow's content to detect changes
   - Track workflow names for additions/removals

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
   - Keep custom assertions or setup
   - Warn user if custom code conflicts with updates

### Phase 8: Review with User

Before writing the file:

1. **Show translation summary:**
   ```
   Workflows to translate: 5
   - Workflow A: 8 steps (7 translated, 1 manual)
   - Workflow B: 6 steps (6 translated)
   - Workflow C: 10 steps (8 translated, 2 need selector help)
   ...
   ```

2. **Ask about ambiguous selectors:**
   ```
   Step "Click the submit button" - found multiple matches:
   1. [data-testid="form-submit"] (in LoginForm.tsx)
   2. button.btn-primary:has-text("Submit") (generic)

   Which selector should I use? [1/2/other]
   ```

3. **Confirm before writing:**
   - Show diff if updating existing file
   - List any workflows being added/removed
   - Get explicit approval

## Selector Discovery Prompts

When exploring the codebase, use these search patterns:

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

**For modals/dialogs:**
```
Search: "Modal" OR "Dialog" + "[title from workflow]"
Look for: Component name, aria-labelledby, className
```

**For navigation:**
```
Search: "Link" OR "NavLink" OR "router" + "[destination]"
Look for: href, to prop, data-testid
```

## Example Translation

**Workflow markdown:**
```markdown
## Workflow: User Login

> Tests the login flow for existing users.

**URL:** http://localhost:5173/login

1. Navigate to login page
   - Open the login page
   - Verify login form is visible

2. Enter credentials
   - Type "test@example.com" in email field
   - Type "password123" in password field

3. Submit login
   - Click the "Sign In" button
   - Wait for redirect to dashboard
   - Verify user name appears in header
```

**Generated Playwright:**
```typescript
test.describe('Workflow: User Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
  });

  test('Step 1: Navigate to login page', async ({ page }) => {
    // Substep: Open the login page
    // (handled in beforeEach)

    // Substep: Verify login form is visible
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('Step 2: Enter credentials', async ({ page }) => {
    // Substep: Type "test@example.com" in email field
    await page.locator('input[name="email"]').fill('test@example.com');

    // Substep: Type "password123" in password field
    await page.locator('input[name="password"]').fill('password123');
  });

  test('Step 3: Submit login', async ({ page }) => {
    // Setup: Fill credentials first (tests are independent)
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="password"]').fill('password123');

    // Substep: Click the "Sign In" button
    await page.locator('button[type="submit"]:has-text("Sign In")').click();

    // Substep: Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Substep: Verify user name appears in header
    await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
  });
});
```

## Test Independence

Since each step becomes a separate test, ensure tests are independent:

1. **Each test should set up its own state** (don't rely on previous test)
2. **Use `test.beforeEach`** for common setup
3. **Consider test.describe.serial** if order truly matters (discouraged)
4. **Add setup steps within tests** that need prior state

## Error Handling

If translation fails:

1. **Missing workflow file:** Inform user, suggest running generator first
2. **Unparseable workflow:** Show which workflow failed, ask for clarification
3. **No selectors found:** List the step, ask user for selector
4. **Conflicting selectors:** Show options, let user choose
5. **Playwright not configured:** Offer to set up Playwright config

## Output Files

Primary output:
- `e2e/browser-workflows.spec.ts` - The generated test file

Optional outputs:
- `e2e/browser-workflows.selectors.ts` - Extracted selectors for reuse
- `.claude/workflow-test-mapping.json` - Mapping of workflows to tests for diff tracking
