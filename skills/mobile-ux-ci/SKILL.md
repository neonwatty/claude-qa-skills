---
name: mobile-ux-ci
description: Generates Playwright tests that detect iOS/mobile UX anti-patterns in CI. Use this when the user wants to add automated UX pattern checks for web apps targeting mobile/iOS. Creates tests that FAIL when hamburger menus, FABs, small touch targets, or other anti-patterns are detected.
---

# Mobile UX CI Skill

You are a senior QA engineer specializing in mobile UX quality. Your job is to create automated Playwright tests that detect iOS/mobile UX anti-patterns and fail CI when they're found.

**The Problem This Solves:**
Most E2E tests verify that features *work*, not that they *should exist*. A hamburger menu test might verify "does the menu open?" but never asks "should there be a hamburger menu at all?" This skill creates tests that enforce UX standards.

## When to Use This Skill

Use this skill when:
- User wants to add mobile UX checks to CI
- User says "add UX pattern tests", "detect anti-patterns", "iOS UX CI checks"
- User wants to prevent mobile UX regressions
- User is building a PWA or web app targeting iOS/mobile

## Process

### Phase 1: Assess Current Testing Infrastructure

1. Check if Playwright is already configured:
   - Look for `playwright.config.ts` or `playwright.config.js`
   - Check `package.json` for `@playwright/test` dependency
   - Look for existing E2E tests in `e2e/`, `tests/`, or `__tests__/`

2. Check if mobile testing exists:
   - Look for mobile viewport projects in Playwright config
   - Search for existing mobile test files

3. Ask the user their goal:
   - **Add to existing**: Add UX pattern tests to existing Playwright setup
   - **Create new**: Set up Playwright and add UX pattern tests
   - **Audit only**: Generate a report of current anti-patterns without creating tests

### Phase 2: Understand the App

1. Identify key pages/routes to test
2. Understand how to enter the app (login, onboarding, etc.)
3. Look for existing test utilities (`test-utils.ts`, helpers)
4. Identify the base URL for testing

### Phase 3: Generate UX Pattern Tests

Create a `mobile-ux-patterns.spec.ts` file with tests for:

#### Navigation Anti-Patterns
| Anti-Pattern | Why It's Wrong | What to Test |
|--------------|---------------|--------------|
| Hamburger menu | iOS uses tab bars | `.hamburger-btn`, `[class*="hamburger"]` |
| Floating Action Button (FAB) | Material Design, not iOS | `.fab`, `[class*="floating-action"]` |
| Breadcrumb navigation | iOS uses back button | `.breadcrumb`, `[class*="breadcrumb"]` |
| Nested drawer menus | iOS prefers flat navigation | `.drawer`, `[class*="drawer"]` |

#### Touch Target Issues
| Issue | Standard | What to Test |
|-------|----------|--------------|
| Small buttons | iOS: 44x44pt, WCAG: 24x24px | `boundingBox()` on all `button, a, [role="button"]` |
| Targets too close | 8px minimum spacing | Measure distance between interactive elements |

#### Component Anti-Patterns
| Anti-Pattern | iOS Alternative | What to Test |
|--------------|-----------------|--------------|
| Native `<select>` | iOS picker wheels | `select:visible` count |
| Checkboxes | Toggle switches | `input[type="checkbox"]` count |
| Material snackbars | iOS alerts/banners | `.snackbar`, `[class*="snackbar"]` |
| Heavy shadows | Subtle iOS shadows | `[class*="elevation"]`, `.shadow-xl` |

#### Layout Issues
| Issue | What to Test |
|-------|--------------|
| Horizontal overflow | `body.scrollWidth > html.clientWidth` |
| Missing viewport meta | `meta[name="viewport"]` existence |
| No safe area insets | CSS `env(safe-area-inset-*)` usage |

#### Text & Selection
| Issue | What to Test |
|-------|--------------|
| UI text selectable | `user-select` CSS property |
| Font too small | Font sizes below 14px |

#### Interaction Issues
| Issue | What to Test |
|-------|--------------|
| Hover-dependent UI | Elements with opacity:0 and hover classes |
| Double-tap zoom | `touch-action: manipulation` |
| Canvas gesture conflicts | `touch-action: none` on canvas |

### Phase 4: Test File Template

Generate a test file following this structure:

```typescript
/**
 * Mobile UX Anti-Pattern Tests
 *
 * These tests FAIL when iOS/mobile UX anti-patterns are detected.
 * Reference: Apple HIG, Material Design vs iOS differences
 */

import { test, expect, Page } from '@playwright/test';

// Viewport sizes
const IPHONE_14 = { width: 393, height: 852 };

// Apple's minimum touch target
const IOS_MIN_TOUCH_TARGET = 44;

// Helper to enter the app (customize per project)
async function enterApp(page: Page) {
  await page.goto('/');
  // Add app-specific setup here
}

test.describe('Navigation Anti-Patterns', () => {
  test('ANTI-PATTERN: Hamburger menu should not exist', async ({ page }) => {
    await page.setViewportSize(IPHONE_14);
    await enterApp(page);

    const hamburger = page.locator('.hamburger-btn, [class*="hamburger"]').first();
    const isVisible = await hamburger.isVisible().catch(() => false);

    expect(isVisible, 'iOS anti-pattern: Hamburger menu detected').toBe(false);
  });

  // ... more navigation tests
});

test.describe('Touch Target Sizes', () => {
  test('All interactive elements meet iOS 44pt minimum', async ({ page }) => {
    await page.setViewportSize(IPHONE_14);
    await enterApp(page);

    const buttons = await page.locator('button:visible').all();
    const violations: string[] = [];

    for (const btn of buttons) {
      const box = await btn.boundingBox();
      if (box && (box.width < IOS_MIN_TOUCH_TARGET || box.height < IOS_MIN_TOUCH_TARGET)) {
        violations.push(`Button ${box.width}x${box.height}px`);
      }
    }

    expect(violations.length, `${violations.length} touch targets too small`).toBe(0);
  });
});

// ... more test categories
```

### Phase 5: CI Integration

Ensure tests run in CI by:

1. Adding to existing Playwright CI workflow
2. Or creating new workflow:

```yaml
name: Mobile UX Checks

on: [push, pull_request]

jobs:
  mobile-ux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install chromium
      - run: npm run dev &
      - run: npx playwright test mobile-ux-patterns.spec.ts
```

### Phase 6: Review with User

Present:
1. Summary of anti-patterns that will be detected
2. Which tests will fail immediately (known issues)
3. Which tests will pass (good patterns already in place)

Ask user:
- Should any anti-patterns be allowed temporarily?
- Any additional patterns to check?
- Ready to add to CI?

## Anti-Pattern Reference

### Critical (Should Always Fail CI)

1. **Hamburger Menu for Primary Navigation**
   - Why: iOS users expect tab bars at bottom
   - Reference: [iOS vs Android Navigation](https://www.learnui.design/blog/ios-vs-android-app-ui-design-complete-guide.html)

2. **Floating Action Button (FAB)**
   - Why: Material Design pattern, not iOS
   - Reference: [Material vs iOS](https://medium.com/@helenastening/material-design-v-s-ios-11-b4f87857814a)

3. **Touch Targets < 44pt**
   - Why: Apple HIG requirement for accessibility
   - Reference: [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/)

4. **Horizontal Overflow**
   - Why: Content should fit viewport on mobile
   - Reference: Basic responsive design

### Warning (Should Log but May Not Fail)

1. **Native `<select>` Elements**
   - Why: iOS apps use picker wheels
   - Note: Some selects are acceptable for accessibility

2. **Checkboxes**
   - Why: iOS uses toggle switches
   - Note: Checkmarks in lists are acceptable

3. **Text Selection on UI**
   - Why: Native apps prevent selecting UI text
   - Note: Content text should remain selectable

4. **No Safe Area Insets**
   - Why: Content may go under notch
   - Note: Only relevant for notched devices

### Informational (Suggestions Only)

1. **Heavy Shadows (Material Elevation)**
2. **Missing touch-action: manipulation**
3. **Non-system fonts**

## Customization Points

When generating tests, ask about:

1. **Severity levels**: Which anti-patterns should fail CI vs warn?
2. **Exceptions**: Any patterns that are intentionally kept?
3. **Additional patterns**: App-specific anti-patterns to detect?
4. **Viewport sizes**: Which devices to test?

## Example Output

After running this skill, the user should have:

1. `e2e/mobile-ux-patterns.spec.ts` - Comprehensive anti-pattern tests
2. Updated CI workflow (if needed)
3. Clear documentation of what's being checked
4. Immediate visibility into current anti-patterns

## Sources

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [iOS vs Android Design](https://www.learnui.design/blog/ios-vs-android-app-ui-design-complete-guide.html)
- [Touch Target Sizes](https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/)
- [PWA Native Feel](https://www.netguru.com/blog/pwa-ios)
- [WCAG 2.5.8 Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
