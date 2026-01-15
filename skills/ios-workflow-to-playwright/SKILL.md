---
name: ios-workflow-to-playwright
description: Translates iOS workflow markdown files into Playwright E2E tests for CI using WebKit with mobile viewport. Use this when the user says "convert ios workflows to playwright", "translate ios workflows to CI", or wants to promote refined iOS/mobile workflows to automated CI tests.
---

# iOS Workflow to Playwright Skill

You are a senior QA automation engineer. Your job is to translate human-readable iOS workflow markdown files into Playwright E2E test files that can run in CI using WebKit with mobile viewport emulation.

## The Translation Pipeline

```
/workflows/ios-workflows.md     →     e2e/ios-mobile-workflows.spec.ts
     (Human-readable)                    (Playwright WebKit mobile tests)
```

## Important: WebKit vs iOS Simulator

**What Playwright WebKit provides:**
- Safari's rendering engine (WebKit)
- Mobile viewport emulation
- Touch event simulation
- User agent spoofing

**What Playwright WebKit cannot do (requires real iOS Simulator):**
- Actual iOS Safari behavior (some quirks differ)
- Real device gestures (pinch-to-zoom physics)
- iOS system UI (permission dialogs, keyboards)
- Safe area inset testing on real notched devices
- Native app wrapper behavior (Capacitor, etc.)

**Translation strategy:** Generate tests that approximate iOS behavior in CI, while marking truly iOS-specific tests for the `ios-workflow-executor` skill.

## When to Use This Skill

Use when:
- User has refined iOS workflows via `ios-workflow-executor`
- User wants to promote workflows to CI
- User says "convert ios workflows to CI", "generate mobile tests"

## Process

### Phase 1: Read and Parse Workflows

1. Read `/workflows/ios-workflows.md`
2. If file doesn't exist, inform user and stop
3. Parse all workflows (each starts with `## Workflow:` or `### Workflow:`)
4. For each workflow, extract:
   - Name and description
   - URL (if specified)
   - Numbered steps and substeps
   - `[MANUAL]` tagged steps
   - iOS-specific steps (gestures, permissions, etc.)

### Phase 2: Check for Existing Tests

1. Look for existing `e2e/ios-mobile-workflows.spec.ts`
2. If exists, parse to find which workflows are translated
3. Determine diff:
   - New workflows → Add
   - Modified workflows → Update
   - Removed workflows → Ask user

### Phase 3: Explore Codebase for Selectors

Same as browser skill, but with mobile-specific considerations:

**Mobile-specific selectors to find:**
- Touch-friendly button classes
- Mobile navigation components (bottom nav, tab bars)
- Mobile-specific layouts (`.mobile-only`, `@media` breakpoints)
- Gesture handlers (swipe, pinch components)

**Selector Priority:**
```
1. data-testid="..."          ← Most stable
2. aria-label="..."           ← Accessible
3. role="..." + text          ← Semantic
4. .mobile-[component]        ← Mobile-specific classes
5. :has-text("...")           ← Text-based
```

### Phase 4: Map Actions to Playwright (Mobile)

| Workflow Language | Playwright Code |
|-------------------|-----------------|
| "Open Safari and navigate to [URL]" | `await page.goto('URL')` |
| "Tap [element]" | `await page.locator(selector).tap()` |
| "Long press [element]" | `await page.locator(selector).click({ delay: 500 })` |
| "Type '[text]'" | `await page.locator(selector).fill('text')` |
| "Swipe up/down/left/right" | Custom swipe helper (see below) |
| "Pull to refresh" | Custom pull-to-refresh helper |
| "Pinch to zoom" | `test.skip('Pinch gesture requires iOS Simulator')` |
| "Verify [condition]" | `await expect(...).toBe...(...)` |
| "Wait for [element]" | `await expect(locator).toBeVisible()` |
| "[MANUAL] Grant permission" | `test.skip('Permission dialogs require iOS Simulator')` |

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

### Phase 5: Handle iOS-Specific Steps

Many iOS workflow steps cannot be fully replicated in Playwright:

**Translatable (approximate in WebKit):**
- Basic taps and navigation
- Form input
- Scroll/swipe gestures
- Visual verification
- URL navigation

**Not translatable (skip with note):**
```typescript
test.skip('Step N: [description]', async () => {
  // iOS SIMULATOR ONLY: This step requires real iOS Simulator
  // Original: "[step text]"
  // Reason: [specific iOS feature needed]
  // Test this via: ios-workflow-executor skill
});
```

**iOS-only features:**
- System permission dialogs (camera, location, notifications)
- iOS keyboard behavior (autocorrect, suggestions)
- Haptic feedback
- Face ID / Touch ID
- Safe area insets (real device only)
- iOS share sheet
- App Store interactions

### Phase 6: Generate Test File

Create `e2e/ios-mobile-workflows.spec.ts`:

```typescript
/**
 * iOS Mobile Workflow Tests
 *
 * Auto-generated from /workflows/ios-workflows.md
 * Generated: [timestamp]
 *
 * These tests run in Playwright WebKit with iPhone viewport.
 * They approximate iOS Safari behavior but cannot fully replicate it.
 *
 * For full iOS testing, use the ios-workflow-executor skill
 * with the actual iOS Simulator.
 *
 * To regenerate: Run ios-workflow-to-playwright skill
 */

import { test, expect, Page } from '@playwright/test';

// iPhone 14 viewport
const MOBILE_VIEWPORT = { width: 393, height: 852 };

// Configure for WebKit mobile
test.use({
  viewport: MOBILE_VIEWPORT,
  // Use WebKit for closest Safari approximation
  browserName: 'webkit',
  // Enable touch events
  hasTouch: true,
  // Mobile user agent
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

  test.skip('Step 2: [iOS Simulator Only]', async () => {
    // iOS SIMULATOR ONLY: Permission dialog
    // Test via: ios-workflow-executor
  });
});
```

### Phase 7: Playwright Config for WebKit Mobile

If WebKit mobile project doesn't exist, suggest adding to `playwright.config.ts`:

```typescript
// In playwright.config.ts projects array:
{
  name: 'Mobile Safari',
  use: {
    ...devices['iPhone 14'],
    // Override to use WebKit
    browserName: 'webkit',
  },
},
```

### Phase 8: Handle Updates (Diff Strategy)

Same as browser skill:

1. Parse existing test file
2. Compare with workflow markdown
3. Add new, update changed, ask about removed
4. Preserve `// CUSTOM:` marked code

### Phase 9: Review with User

Show translation summary:

```
iOS Workflows to translate: 5

Workflow: First-Time Onboarding
  - 8 steps total
  - 6 translatable to WebKit
  - 2 iOS Simulator only (permission dialogs)

Workflow: Canvas Manipulation
  - 9 steps total
  - 7 translatable
  - 2 need gesture approximation (pinch-to-zoom → skip)

Coverage: 72% of steps can run in CI
Remaining 28% require ios-workflow-executor for full testing
```

## iOS-Specific Considerations

### Viewport Sizes to Support

```typescript
const IPHONE_SE = { width: 375, height: 667 };
const IPHONE_14 = { width: 393, height: 852 };
const IPHONE_14_PRO_MAX = { width: 430, height: 932 };
const IPAD_MINI = { width: 768, height: 1024 };
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

## Example Translation

**iOS Workflow markdown:**
```markdown
## Workflow: Mobile Guest Assignment

> Tests assigning guests to tables on mobile Safari.

**URL:** http://localhost:5173/

1. Open app on mobile
   - Open Safari and navigate to http://localhost:5173/
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
   - This requires real iOS Simulator gesture testing
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
    // iOS SIMULATOR ONLY: Pinch gesture cannot be automated in Playwright
    // Test via: ios-workflow-executor skill with actual iOS Simulator
    // Original: "Test pinch-to-zoom on canvas"
  });
});
```

## Output Files

Primary output:
- `e2e/ios-mobile-workflows.spec.ts` - Generated WebKit mobile tests

Optional outputs:
- `e2e/ios-mobile-workflows.selectors.ts` - Extracted selectors
- `.claude/ios-workflow-test-mapping.json` - Diff tracking

## Limitations to Communicate

Always inform user of what CI tests CANNOT cover:

```
⚠️  CI Test Limitations (WebKit approximation):

These require ios-workflow-executor for real iOS Simulator testing:
- System permission dialogs
- Real iOS keyboard behavior
- Pinch/zoom gestures
- Safe area insets on notched devices
- iOS share sheet
- Face ID / Touch ID
- Safari-specific CSS quirks

CI tests cover: ~70-80% of typical iOS workflows
iOS Simulator covers: 100% (but requires manual/local execution)
```
