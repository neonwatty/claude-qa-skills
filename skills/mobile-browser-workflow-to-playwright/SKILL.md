---
name: mobile-browser-workflow-to-playwright
description: Translates mobile browser workflow markdown files into Playwright E2E tests for CI using Chromium with mobile viewport. Use this when the user says "convert mobile browser workflows to playwright", "translate mobile browser workflows to CI", or wants to promote refined mobile browser workflows to automated CI tests.
---

# Mobile Browser Workflow to Playwright Skill

You are a senior QA automation engineer. Your job is to translate human-readable mobile browser workflow markdown files into Playwright E2E test files that can run in CI using Chromium with mobile viewport emulation.

## Task List Integration

**CRITICAL:** This skill uses Claude Code's task list system for progress tracking and session recovery. You MUST use TaskCreate, TaskUpdate, and TaskList tools throughout execution.

### Why Task Lists Matter Here
- **Coverage visibility:** User sees "5/7 workflows translatable, 72% CI coverage"
- **Session recovery:** If interrupted during selector discovery, resume that phase
- **Ambiguous selector resolution:** Block on selectors needing user input
- **Mobile browser tracking:** Clearly show which steps require real mobile testing vs Chromium emulation

### Task Hierarchy
```
[Main Task] "Translate Mobile Browser Workflows to Playwright"
  └── [Parse Task] "Parse: 5 workflows from mobile-browser-workflows.md"
  └── [Check Task] "Check: existing mobile-browser-workflows.spec.ts"
  └── [Selector Task] "Selectors: finding mobile-specific selectors"
  └── [Ambiguous Task] "Ambiguous: Step 2.3 - mobile vs desktop nav" (BLOCKING)
  └── [Generate Task] "Generate: Chromium mobile tests"
  └── [Write Task] "Write: e2e/mobile-browser-workflows.spec.ts"
```

### Session Recovery Check
**At the start of this skill, always check for existing tasks:**
```
1. Call TaskList to check for existing translation tasks
2. If a "Translate Mobile Browser Workflows" task exists with status in_progress:
   - Check its metadata for current phase
   - Resume from that phase
3. If ambiguous selector tasks exist and are pending:
   - These are BLOCKING - present to user for resolution
4. If no tasks exist, proceed with fresh execution
```

## The Translation Pipeline

```
/workflows/mobile-browser-workflows.md     →     e2e/mobile-browser-workflows.spec.ts
     (Human-readable)                              (Playwright Chromium mobile tests)
```

## Important: Chromium Mobile vs Real Mobile Devices

**What Playwright Chromium provides:**
- Chrome's rendering engine (Chromium/Blink)
- Mobile viewport emulation (iPhone 15 Pro: 393x852)
- Touch event simulation
- User agent spoofing
- Mobile-specific gestures (.tap(), swipe helpers)
- hasTouch: true configuration

**What Playwright Chromium cannot do (requires real mobile testing):**
- Actual mobile device behavior (some touch quirks differ)
- Real device gestures (pinch-to-zoom physics on actual touchscreens)
- Mobile OS system UI (permission dialogs, native keyboards)
- Safe area inset testing on real notched devices
- PWA installation flows
- Mobile-specific browser features (pull-to-refresh might vary)

**Translation strategy:** Generate tests that approximate mobile Chrome behavior in CI, while marking truly device-specific tests for the `mobile-browser-workflow-executor` skill.

## When to Use This Skill

Use when:
- User has refined mobile browser workflows via `mobile-browser-workflow-executor`
- User wants to promote workflows to CI
- User says "convert mobile browser workflows to CI", "generate mobile tests"

## Process

### Phase 1: Read and Parse Workflows

**Create the main translation task:**
```
TaskCreate:
- subject: "Translate Mobile Browser Workflows to Playwright"
- description: |
    Convert mobile browser workflow markdown to Playwright Chromium mobile tests.
    Source: /workflows/mobile-browser-workflows.md
    Target: e2e/mobile-browser-workflows.spec.ts
- activeForm: "Reading mobile browser workflows"

TaskUpdate:
- taskId: [main task ID]
- status: "in_progress"
```

1. Read `/workflows/mobile-browser-workflows.md`
2. If file doesn't exist, inform user and stop
3. Parse all workflows (each starts with `## Workflow:` or `### Workflow:`)
4. For each workflow, extract:
   - Name and description
   - URL (if specified)
   - Numbered steps and substeps
   - `[MANUAL]` tagged steps
   - Mobile-specific steps (gestures, touch interactions, etc.)

**Create parse task with metadata:**
```
TaskCreate:
- subject: "Parse: [N] workflows from mobile-browser-workflows.md"
- description: |
    Parsed mobile browser workflows for translation.
    Workflows: [list names]
    Total steps: [count]
    Mobile-specific: [count] steps
    Manual steps: [count]
- activeForm: "Parsing mobile browser workflows"

TaskUpdate:
- taskId: [parse task ID]
- status: "completed"
- metadata: {
    "workflowCount": [N],
    "totalSteps": [count],
    "mobileSpecificSteps": [count],
    "manualSteps": [count],
    "workflows": ["Workflow 1", "Workflow 2", ...]
  }
```

### Phase 2: Check for Existing Tests

**Create check task:**
```
TaskCreate:
- subject: "Check: existing mobile-browser-workflows.spec.ts"
- description: |
    Check for existing Playwright Chromium mobile tests.
    Looking for: e2e/mobile-browser-workflows.spec.ts
- activeForm: "Checking existing tests"

TaskUpdate:
- taskId: [check task ID]
- status: "in_progress"
```

1. Look for existing `e2e/mobile-browser-workflows.spec.ts`
2. If exists, parse to find which workflows are translated
3. Determine diff:
   - New workflows → Add
   - Modified workflows → Update
   - Removed workflows → Ask user

**Update check task with results:**
```
TaskUpdate:
- taskId: [check task ID]
- status: "completed"
- metadata: {
    "existingFile": true/false,
    "existingWorkflows": ["Workflow 1", ...],
    "newWorkflows": ["Workflow 3", ...],
    "modifiedWorkflows": ["Workflow 1", ...],
    "removedWorkflows": []
  }
```

### Phase 3: Explore Codebase for Selectors [DELEGATE TO AGENT]

**Create selector task:**
```
TaskCreate:
- subject: "Selectors: finding mobile-specific selectors"
- description: |
    Discovering Playwright selectors for mobile browser workflow steps.
    Delegating to Explore agent for thorough codebase search.
    Looking for mobile-specific components and touch handlers.
- activeForm: "Finding mobile selectors"

TaskUpdate:
- taskId: [selector task ID]
- status: "in_progress"
```

**Purpose:** For each workflow step, explore the codebase to find reliable selectors with mobile-specific considerations. Delegate this to an Explore agent to save context.

**Use the Task tool to spawn an Explore agent:**

```
Task tool parameters:
- subagent_type: "Explore"
- model: "sonnet" (balance of speed and thoroughness)
- prompt: |
    You are finding reliable Playwright selectors for mobile browser workflow steps.
    These selectors will be used in Chromium mobile viewport tests.

    ## Workflows to Find Selectors For
    [Include parsed workflow steps that need selectors]

    ## What to Search For

    For each step, find the BEST available selector using this priority:

    **Selector Priority (best to worst):**
    1. data-testid="..."          ← Most stable
    2. aria-label="..."           ← Accessible
    3. role="..." + text          ← Semantic
    4. .mobile-[component]        ← Mobile-specific classes
    5. :has-text("...")           ← Text-based
    6. Complex CSS path           ← Last resort

    ## Mobile-Specific Search Strategy

    1. **Mobile Navigation Components**
       - Search for bottom nav, tab bars: `bottom-nav`, `tab-bar`, `mobile-nav`
       - Find mobile-specific layouts: `.mobile-only`, `@media` queries
       - Look for touch-optimized components

    2. **Touch Interaction Elements**
       - Find touch-friendly button classes
       - Locate gesture handlers (swipe, drag components)
       - Identify long-press handlers

    3. **Mobile-Style Components**
       - Search for mobile picker components
       - Find action sheet / bottom sheet patterns
       - Locate toggle switches vs checkboxes

    4. **Responsive Breakpoints**
       - Identify mobile breakpoint values
       - Find conditionally rendered mobile components

    ## Return Format

    Return a structured mapping:
    ```
    ## Selector Mapping (Mobile)

    ### Workflow: [Name]

    | Step | Element Description | Recommended Selector | Confidence | Mobile Notes |
    |------|---------------------|---------------------|------------|--------------|
    | 1.1  | Bottom nav Guests tab | [data-testid="nav-guests"] | High | Mobile-only component |
    | 1.2  | Guest list item | .guest-item | Medium | Needs .tap() not .click() |
    | 2.1  | Action sheet | [role="dialog"].action-sheet | High | Mobile-style sheet |

    ### Mobile-Specific Considerations
    - Component X only renders on mobile viewport
    - Gesture handler found in SwipeableList.tsx - may need approximation

    ### Ambiguous Selectors (need user input)
    - Step 3.2: Found both mobile and desktop versions

    ### Missing Selectors (not found)
    - Step 4.1: Could not find mobile-specific element
    ```
```

**After agent returns:** Use the selector mapping to generate accurate Playwright test code. Note mobile-specific considerations for each selector.

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
    "missing": [count],
    "mobileSpecific": [count]
  }
```

**Handle ambiguous selectors (BLOCKING):**
For each ambiguous selector, create a blocking task that requires user resolution:
```
TaskCreate:
- subject: "Ambiguous: Step [N.M] - [element description]"
- description: |
    BLOCKING: This selector needs user input.

    Step: [step description]
    Options found:
    1. [selector option 1] - [context]
    2. [selector option 2] - [context]

    Which selector should be used for mobile?
- activeForm: "Awaiting selector choice"

# DO NOT mark as in_progress - leave as pending to indicate blocking
```

**IMPORTANT:** If any ambiguous tasks are created:
1. Present all ambiguous selectors to user at once
2. Wait for user to resolve each one
3. Update tasks with user's choices:
```
TaskUpdate:
- taskId: [ambiguous task ID]
- status: "completed"
- metadata: {"selectedSelector": "[user's choice]", "reasoning": "[user's notes]"}
```
4. Only proceed to Phase 4 after ALL ambiguous tasks are resolved

### Phase 4: Map Actions to Playwright (Mobile)

| Workflow Language | Playwright Code |
|-------------------|-----------------|
| "Navigate to [URL]" | `await page.goto('URL')` |
| "Tap [element]" | `await page.locator(selector).tap()` |
| "Long press [element]" | `await page.locator(selector).click({ delay: 500 })` |
| "Type '[text]'" | `await page.locator(selector).fill('text')` |
| "Swipe up/down/left/right" | Custom swipe helper (see below) |
| "Pull to refresh" | Custom pull-to-refresh helper |
| "Pinch to zoom" | `test.skip('Pinch gesture requires real mobile device')` |
| "Verify [condition]" | `await expect(...).toBe...(...)` |
| "Wait for [element]" | `await expect(locator).toBeVisible()` |
| "[MANUAL] Grant permission" | `test.skip('Permission dialogs require real mobile device')` |

**Swipe gesture helper:**
```typescript
async function swipe(
  page: Page,
  direction: 'up' | 'down' | 'left' | 'right',
  options?: { startX?: number; startY?: number; distance?: number }
) {
  const viewport = page.viewportSize()!;
  const startX = options?.startX ?? viewport.width / 2;
  const startY = options?.startY ?? viewport.height / 2;
  const distance = options?.distance ?? 300;

  const deltas = {
    up: { x: 0, y: -distance },
    down: { x: 0, y: distance },
    left: { x: -distance, y: 0 },
    right: { x: distance, y: 0 },
  };

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltas[direction].x, startY + deltas[direction].y, { steps: 10 });
  await page.mouse.up();
}
```

**Pull-to-refresh helper:**
```typescript
async function pullToRefresh(page: Page) {
  await swipe(page, 'down', { startY: 150, distance: 400 });
}
```

### Phase 5: Handle Mobile-Specific Steps

Many mobile browser workflow steps cannot be fully replicated in Playwright:

**Translatable (approximate in Chromium mobile):**
- Basic taps and navigation
- Form input
- Scroll/swipe gestures
- Visual verification
- URL navigation
- Mobile layout testing

**Not translatable (skip with note):**
```typescript
test.skip('Step N: [description]', async () => {
  // REAL MOBILE DEVICE ONLY: This step requires real mobile device
  // Original: "[step text]"
  // Reason: [specific mobile feature needed]
  // Test this via: mobile-browser-workflow-executor skill
});
```

**Mobile-only features:**
- System permission dialogs (camera, location, notifications)
- Mobile OS keyboard behavior (autocorrect, suggestions)
- Haptic feedback
- Biometric authentication
- Safe area insets (real device only)
- Native share sheet
- PWA installation prompts
- Real device orientation changes

### Phase 6: Generate Test File [DELEGATE TO AGENT]

**Create generate task:**
```
TaskCreate:
- subject: "Generate: Chromium mobile tests"
- description: |
    Generating Playwright Chromium mobile test file.
    Delegating to code generation agent.
    Workflows: [count]
    Selectors resolved: [count]
- activeForm: "Generating mobile tests"

TaskUpdate:
- taskId: [generate task ID]
- status: "in_progress"
```

**Purpose:** Generate the Playwright Chromium mobile test file from the parsed workflows and selector mapping. Delegate to an agent for focused code generation.

**Use the Task tool to spawn a code generation agent:**

```
Task tool parameters:
- subagent_type: "general-purpose"
- model: "sonnet" (good balance for code generation)
- prompt: |
    You are generating a Playwright E2E test file for mobile browser workflows.
    These tests run in Chromium with mobile viewport emulation.

    ## Input Data

    **Workflows:**
    [Include parsed workflow data with names, steps, substeps]

    **Selector Mapping:**
    [Include selector mapping from Phase 3 agent]

    **Existing Test File (if updating):**
    [Include existing test content if this is an update, or "None - new file"]

    ## Your Task

    Generate `e2e/mobile-browser-workflows.spec.ts` with:

    1. **File header** explaining Chromium limitations vs real mobile
    2. **Mobile viewport config** (iPhone 15 Pro: 393x852)
    3. **Chromium + touch config** via test.use()
    4. **Helper functions** (swipe, pullToRefresh)
    5. **Test.describe block** for each workflow
    6. **Individual tests** using .tap() for touch interactions
    7. **test.skip** for real mobile device-only steps

    ## Mobile-Specific Requirements

    - Use `.tap()` instead of `.click()` for touch interactions
    - Use the swipe helper for swipe gestures
    - Mark pinch/zoom as test.skip (real mobile device only)
    - Mark permission dialogs as test.skip
    - Add mobile user agent string (iPhone 15 Pro Safari)
    - Configure hasTouch: true
    - Configure browserName: undefined (uses default Chromium)

    ## Handle Special Cases

    - [MANUAL] steps → `test.skip()` with explanation
    - Mobile-only gestures (pinch) → `test.skip()` with "real mobile device only" note
    - Permission dialogs → `test.skip()` with "requires real mobile"
    - Long press → `await element.click({ delay: 500 })`

    ## Return Format

    Return the complete test file content ready to write.
    Also return a summary:
    ```
    ## Generation Summary
    - Workflows: [count]
    - Total tests: [count]
    - Chromium translatable: [count]
    - Real mobile only: [count]
    - Coverage: [percentage]% can run in CI
    ```
```

**After agent returns:** Write the generated test file to `e2e/mobile-browser-workflows.spec.ts`. Review coverage summary with user.

**Update generate task with coverage metrics:**
```
TaskUpdate:
- taskId: [generate task ID]
- status: "completed"
- metadata: {
    "totalWorkflows": [count],
    "totalTests": [count],
    "chromiumTranslatable": [count],
    "realMobileOnly": [count],
    "coverage": "[percentage]%"
  }
```

**Create write task:**
```
TaskCreate:
- subject: "Write: e2e/mobile-browser-workflows.spec.ts"
- description: |
    Writing generated Playwright Chromium mobile tests.
    File: e2e/mobile-browser-workflows.spec.ts
    Tests: [count]
    Coverage: [percentage]% CI-runnable
- activeForm: "Writing test file"

TaskUpdate:
- taskId: [write task ID]
- status: "in_progress"
```

Create `e2e/mobile-browser-workflows.spec.ts`:

```typescript
/**
 * Mobile Browser Workflow Tests
 *
 * Auto-generated from /workflows/mobile-browser-workflows.md
 * Generated: [timestamp]
 *
 * These tests run in Playwright Chromium with iPhone 15 Pro mobile viewport.
 * They emulate mobile Chrome behavior with touch support.
 *
 * For full mobile device testing, use the mobile-browser-workflow-executor skill
 * with actual mobile browsers or devices.
 *
 * To regenerate: Run mobile-browser-workflow-to-playwright skill
 */

import { test, expect, Page } from '@playwright/test';

// iPhone 15 Pro viewport
const MOBILE_VIEWPORT = { width: 393, height: 852 };

// Configure for Chromium mobile
test.use({
  viewport: MOBILE_VIEWPORT,
  // Enable touch events
  hasTouch: true,
  // Mobile user agent (iPhone 15 Pro Safari)
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});

// ============================================================================
// HELPERS
// ============================================================================

async function swipe(
  page: Page,
  direction: 'up' | 'down' | 'left' | 'right',
  options?: { startX?: number; startY?: number; distance?: number }
) {
  const viewport = page.viewportSize()!;
  const startX = options?.startX ?? viewport.width / 2;
  const startY = options?.startY ?? viewport.height / 2;
  const distance = options?.distance ?? 300;

  const deltas = {
    up: { x: 0, y: -distance },
    down: { x: 0, y: distance },
    left: { x: -distance, y: 0 },
    right: { x: distance, y: 0 },
  };

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(
    startX + deltas[direction].x,
    startY + deltas[direction].y,
    { steps: 10 }
  );
  await page.mouse.up();
}

async function pullToRefresh(page: Page) {
  await swipe(page, 'down', { startY: 150, distance: 400 });
}

// ============================================================================
// WORKFLOW: [Workflow Name]
// ============================================================================

test.describe('Workflow: [Name]', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('[base-url]');
  });

  test('Step 1: [Description]', async ({ page }) => {
    // Substep: [description]
    await page.locator('[selector]').tap();

    // Substep: [description]
    await expect(page.locator('[selector]')).toBeVisible();
  });

  test.skip('Step 2: [Real Mobile Device Only]', async () => {
    // REAL MOBILE DEVICE ONLY: Permission dialog
    // Test via: mobile-browser-workflow-executor
  });
});
```

### Phase 7: Playwright Config for Chromium Mobile

If Chromium mobile project doesn't exist, suggest adding to `playwright.config.ts`:

```typescript
// In playwright.config.ts projects array:
{
  name: 'Mobile Chrome',
  use: {
    ...devices['iPhone 15 Pro'],
    // Uses default Chromium (not WebKit)
    browserName: 'chromium',
  },
},
```

**Note:** Unlike iOS workflows which use WebKit, mobile browser workflows use Chromium to match the actual testing environment.

### Phase 8: Handle Updates (Diff Strategy)

Same as browser skill:

1. Parse existing test file
2. Compare with workflow markdown
3. Add new, update changed, ask about removed
4. Preserve `// CUSTOM:` marked code

**Preserving custom code:**
```typescript
// CUSTOM: Custom setup logic - DO NOT REMOVE
const customHelper = () => { /* ... */ };

test('Step 1: ...', async ({ page }) => {
  // CUSTOM: Special handling for this test
  await customHelper();

  // Generated code
  await page.locator('[selector]').tap();
});
```

When updating, the generator MUST:
- Keep all `// CUSTOM:` sections intact
- Only update generated code between custom sections
- Warn user if custom code conflicts with new workflow

### Phase 9: Review with User

**Mark write task completed:**
```
TaskUpdate:
- taskId: [write task ID]
- status: "completed"
- metadata: {"filePath": "e2e/mobile-browser-workflows.spec.ts", "fileWritten": true}
```

**Mark main task completed:**
```
TaskUpdate:
- taskId: [main task ID]
- status: "completed"
- metadata: {
    "workflowsTranslated": [count],
    "totalTests": [count],
    "chromiumCoverage": "[percentage]%",
    "realMobileOnly": [count],
    "outputFile": "e2e/mobile-browser-workflows.spec.ts"
  }
```

**Generate summary from task data:**

Call `TaskList` to get all tasks and their metadata, then generate:

```
Mobile Browser Workflows to translate: 5

Workflow: First-Time Onboarding
  - 8 steps total
  - 6 translatable to Chromium mobile
  - 2 real mobile device only (permission dialogs)

Workflow: Canvas Manipulation
  - 9 steps total
  - 7 translatable
  - 2 need gesture approximation (pinch-to-zoom → skip)

Coverage: 72% of steps can run in CI
Remaining 28% require mobile-browser-workflow-executor for full testing

## Task Summary
[Generated from task metadata:]
- Workflows parsed: [from parse task]
- Selectors found: [from selector task]
- Ambiguous resolved: [count from ambiguous tasks]
- Tests generated: [from generate task]
- File written: [from write task]
```

## Session Recovery

If resuming from an interrupted session:

**Recovery decision tree:**
```
TaskList shows:
├── Main task in_progress, no parse task
│   └── Start from Phase 1 (read workflows)
├── Parse task completed, no check task
│   └── Start from Phase 2 (check existing tests)
├── Check task completed, no selector task
│   └── Start from Phase 3 (selector discovery)
├── Selector task in_progress
│   └── Resume selector discovery agent
├── Ambiguous tasks pending (not completed)
│   └── BLOCKING: Present to user for resolution
├── Selector task completed, no generate task
│   └── Start from Phase 6 (generate tests)
├── Generate task in_progress
│   └── Resume code generation agent
├── Generate task completed, no write task
│   └── Start from Phase 9 (write file)
├── Main task completed
│   └── Translation done, show summary
└── No tasks exist
    └── Fresh start (Phase 1)
```

**Resuming with ambiguous selectors:**
```
1. Get all tasks with "Ambiguous:" prefix
2. Filter to status: "pending" (not yet resolved)
3. Present each to user:
   "Found unresolved selector choices from previous session:
    - Step 2.3: bottom-nav vs tab-bar
    - Step 4.1: .mobile-menu vs .hamburger-menu
   Please select the correct selector for each."
4. Update each task as user resolves them
5. Only continue to generation when all resolved
```

**Always inform user when resuming:**
```
Resuming mobile browser workflow translation session:
- Source: /workflows/mobile-browser-workflows.md
- Target: e2e/mobile-browser-workflows.spec.ts
- Workflows: [count from parse task metadata]
- Current state: [in_progress task description]
- Pending: [any blocking ambiguous tasks]
- Resuming: [next action]
```

## Mobile-Specific Considerations

### Viewport Sizes to Support

```typescript
const IPHONE_SE = { width: 375, height: 667 };
const IPHONE_15_PRO = { width: 393, height: 852 };
const IPHONE_15_PRO_MAX = { width: 430, height: 932 };
const PIXEL_7 = { width: 412, height: 915 };
const GALAXY_S23 = { width: 360, height: 780 };
```

### Touch vs Click

Always use `.tap()` instead of `.click()` for mobile tests:
```typescript
// Preferred for mobile
await page.locator('button').tap();

// Fallback if tap doesn't work
await page.locator('button').click();
```

### Handling Keyboard

Mobile keyboards behave differently:
```typescript
// Fill and close keyboard
await page.locator('input').fill('text');
await page.keyboard.press('Enter'); // Dismiss keyboard

// Or tap outside to dismiss
await page.locator('body').tap({ position: { x: 10, y: 10 } });
```

### Safe Area Handling

Cannot truly test safe areas, but can check CSS:
```typescript
// Check that safe area CSS is present (informational)
const usesSafeArea = await page.evaluate(() => {
  // Check for env(safe-area-inset-*) in styles
  return document.documentElement.style.cssText.includes('safe-area');
});
```

### Responsive Breakpoints

Test that mobile layouts activate correctly:
```typescript
test('Mobile layout activates at correct breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await expect(page.locator('.mobile-nav')).toBeVisible();
  await expect(page.locator('.desktop-nav')).not.toBeVisible();
});
```

## Example Translation

**Mobile Browser Workflow markdown:**
```markdown
## Workflow: Mobile Guest Assignment

> Tests assigning guests to tables on mobile Chrome.

**URL:** http://localhost:5173/

1. Open app on mobile
   - Navigate to http://localhost:5173/
   - Wait for app to load
   - Verify mobile layout is active

2. Navigate to guest view
   - Tap bottom nav "Guests" tab
   - Verify guest list appears

3. Assign guest to table
   - Long press on a guest name
   - Drag to table (or tap assign button)
   - Verify guest is assigned

4. [MANUAL] Test pinch-to-zoom on canvas
   - This requires real mobile device gesture testing
```

**Generated Playwright:**
```typescript
test.describe('Workflow: Mobile Guest Assignment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
  });

  test('Step 1: Open app on mobile', async ({ page }) => {
    // Substep: Wait for app to load
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible();

    // Substep: Verify mobile layout is active
    await expect(page.locator('.mobile-layout, .bottom-nav')).toBeVisible();
  });

  test('Step 2: Navigate to guest view', async ({ page }) => {
    // Substep: Tap bottom nav "Guests" tab
    await page.locator('.bottom-nav-item:has-text("Guests")').tap();

    // Substep: Verify guest list appears
    await expect(page.locator('[data-testid="guest-list"]')).toBeVisible();
  });

  test('Step 3: Assign guest to table', async ({ page }) => {
    // Setup: Navigate to guests first
    await page.locator('.bottom-nav-item:has-text("Guests")').tap();
    await expect(page.locator('[data-testid="guest-list"]')).toBeVisible();

    // Substep: Long press on a guest name
    const guest = page.locator('.guest-item').first();
    await guest.click({ delay: 500 }); // Long press approximation

    // Substep: Tap assign button (drag not fully supported)
    await page.locator('[data-testid="assign-btn"]').tap();

    // Substep: Verify guest is assigned
    await expect(page.locator('.guest-item.assigned')).toBeVisible();
  });

  test.skip('Step 4: [MANUAL] Test pinch-to-zoom on canvas', async () => {
    // REAL MOBILE DEVICE ONLY: Pinch gesture cannot be automated in Playwright
    // Test via: mobile-browser-workflow-executor skill with actual mobile browser
    // Original: "Test pinch-to-zoom on canvas"
  });
});
```

## Output Files

Primary output:
- `e2e/mobile-browser-workflows.spec.ts` - Generated Chromium mobile tests

Optional outputs:
- `e2e/mobile-browser-workflows.selectors.ts` - Extracted selectors
- `.claude/mobile-browser-workflow-test-mapping.json` - Diff tracking

## Limitations to Communicate

Always inform user of what CI tests CANNOT cover:

```
⚠️  CI Test Limitations (Chromium mobile emulation):

These require mobile-browser-workflow-executor for real mobile device testing:
- System permission dialogs
- Real mobile keyboard behavior
- Pinch/zoom gestures
- Safe area insets on notched devices
- Native share sheet
- Biometric authentication
- Mobile browser-specific quirks
- PWA installation flows

CI tests cover: ~70-80% of typical mobile browser workflows
Real mobile device covers: 100% (but requires manual/local execution)
```

## Key Differences from iOS Workflow Translation

1. **Source file:** `/workflows/mobile-browser-workflows.md` (not ios-workflows.md)
2. **Target file:** `e2e/mobile-browser-workflows.spec.ts` (not ios-mobile-workflows.spec.ts)
3. **Browser:** Chromium (not WebKit) - matches actual testing environment
4. **Browser config:** Uses default Chromium, not webkit override
5. **User agent:** iPhone 15 Pro Safari string (for compatibility testing)
6. **Viewport:** iPhone 15 Pro (393x852) - same as iOS
7. **Touch config:** hasTouch: true - same as iOS
8. **Gesture handling:** .tap() for touch interactions - same as iOS

## Complete Test File Template

```typescript
/**
 * Mobile Browser Workflow Tests
 *
 * Auto-generated from /workflows/mobile-browser-workflows.md
 * Generated: [timestamp]
 *
 * These tests run in Playwright Chromium with iPhone 15 Pro mobile viewport.
 * They emulate mobile Chrome behavior with touch support.
 *
 * For full mobile device testing, use the mobile-browser-workflow-executor skill.
 *
 * To regenerate: Run mobile-browser-workflow-to-playwright skill
 */

import { test, expect, Page } from '@playwright/test';

// iPhone 15 Pro viewport
const MOBILE_VIEWPORT = { width: 393, height: 852 };

// Configure for Chromium mobile
test.use({
  viewport: MOBILE_VIEWPORT,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});

// ============================================================================
// HELPERS
// ============================================================================

async function swipe(
  page: Page,
  direction: 'up' | 'down' | 'left' | 'right',
  options?: { startX?: number; startY?: number; distance?: number }
) {
  const viewport = page.viewportSize()!;
  const startX = options?.startX ?? viewport.width / 2;
  const startY = options?.startY ?? viewport.height / 2;
  const distance = options?.distance ?? 300;

  const deltas = {
    up: { x: 0, y: -distance },
    down: { x: 0, y: distance },
    left: { x: -distance, y: 0 },
    right: { x: distance, y: 0 },
  };

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(
    startX + deltas[direction].x,
    startY + deltas[direction].y,
    { steps: 10 }
  );
  await page.mouse.up();
}

async function pullToRefresh(page: Page) {
  await swipe(page, 'down', { startY: 150, distance: 400 });
}

// ============================================================================
// WORKFLOWS
// ============================================================================

test.describe('Workflow: Example Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
  });

  test('Step 1: Example step', async ({ page }) => {
    // Substep: Example action
    await page.locator('[data-testid="example"]').tap();

    // Substep: Example verification
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });

  test.skip('Step 2: Mobile device only', async () => {
    // REAL MOBILE DEVICE ONLY: Requires actual mobile browser
    // Test via: mobile-browser-workflow-executor
  });
});
```

## Summary

This skill translates mobile browser workflows into CI-runnable Playwright tests using Chromium with mobile viewport emulation. It provides:

- **70-80% CI coverage** of typical mobile workflows
- **Chromium mobile emulation** matching actual testing environment
- **Touch interaction support** via .tap() and gesture helpers
- **Session recovery** via task list integration
- **Ambiguous selector resolution** via blocking tasks
- **Clear limitations** communicated to user

For comprehensive mobile testing of the remaining 20-30% (device-specific features), users should use the `mobile-browser-workflow-executor` skill.
