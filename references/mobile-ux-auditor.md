# Mobile UX Auditor — Complete Rubric Reference

This reference contains all 10 mobile audit categories, measurement scripts, thresholds, and grading criteria. Referenced by the `mobile-ux-auditor` agent. Also references `references/ios-hig-requirements.md` and `references/ios-hig-anti-patterns.md` for iOS-specific standards and anti-pattern detection.

**Viewport:** 393x852 (iPhone 15 Pro)
**Setup:** At start of each screen, run `browser_resize width=393 height=852`
**Total checks:** 56
**Scoring:** Binary scorecard (Pass=1, Fail=0). Score presented as X/56.

---

## Category 1: Touch & Interaction (7 checks)

| # | Check | Threshold | Method | Severity |
|---|-------|-----------|--------|----------|
| 1.1 | Tap target size (Apple HIG) | >= 44x44 CSS px | `getBoundingClientRect()` on all `a, button, input, select, textarea, [role="button"], [onclick]` | CRITICAL |
| 1.2 | Tap target size (Google MD3) | >= 48x48 CSS px | Same selector set; flag as info only (not scored as fail) | MINOR |
| 1.3 | Tap target spacing | >= 8px between adjacent targets | Compute gaps between interactive element bounding rects | MAJOR |
| 1.4 | Icon-only nav items have text labels | `aria-label` or visible text present | Query nav items with SVG/img but no adjacent text node | MAJOR |
| 1.5 | Primary CTAs in thumb zone | 100% within bottom 60% of viewport | `y > 0.4 * viewportHeight` for primary action buttons | MINOR |
| 1.6 | Input field minimum height | >= 48px | `getBoundingClientRect().height` on all `input, select, textarea` | MAJOR |
| 1.7 | Label visibility | Labels above fields, not placeholder-only | Check for `<label>` elements associated with each input; flag inputs relying solely on `placeholder` | MAJOR |

### Measurement Details

**Tap target size:** Measure both `width` and `height` from `getBoundingClientRect()`. An element fails if either dimension is below threshold. For Apple HIG, both must be >= 44px. For Google MD3 (informational), both must be >= 48px.

**Tap target spacing:** For each pair of adjacent interactive elements (siblings or visually nearby), compute the gap as `Math.max(0, rect2.left - rect1.right)` horizontally and `Math.max(0, rect2.top - rect1.bottom)` vertically. The minimum gap in the relevant axis must be >= 8px.

**Thumb zone:** The "thumb zone" is the bottom 60% of the viewport (y >= 0.4 * 852 = 341px). Primary CTAs (elements with prominent styling, `[class*="primary"]`, `[class*="cta"]`, or the first/largest button in the hero section) should have their center point within this zone.

---

## Category 2: iOS Safari Specific (5 checks)

| # | Check | What to Detect | Method | Severity |
|---|-------|---------------|--------|----------|
| 2.1 | `100vh` bug detection | Elements using `height: 100vh` | Scan computed styles for `100vh` usage; flag elements whose height equals exactly `window.innerHeight` when the address bar is visible | MAJOR |
| 2.2 | Input zoom prevention | All `<input>`, `<select>`, `<textarea>` must have `font-size >= 16px` | `getComputedStyle(el).fontSize` on all form elements; any value < 16px triggers iOS Safari auto-zoom | CRITICAL |
| 2.3 | Safe area insets | If `viewport-fit=cover`, verify `env(safe-area-inset-*)` in CSS | Parse `<meta name="viewport">` content for `viewport-fit=cover`, then scan all stylesheets for `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`, etc. | MAJOR |
| 2.4 | Fixed bottom + keyboard conflict | Flag `position: fixed; bottom: 0` elements | Query elements with `position: fixed` and `bottom: 0` that are likely to conflict with the iOS keyboard (form elements, input bars, footers) | MAJOR |
| 2.5 | Dynamic viewport units | Flag `100vh`, suggest `100dvh`/`svh` | Scan stylesheets and inline styles for `100vh` usage; recommend replacement with `100dvh`, `100svh`, or `100lvh` | MINOR |

### iOS Safari Context

The `100vh` bug occurs because iOS Safari's `100vh` includes the area behind the URL bar, causing content to be clipped when the address bar is visible. The fix is to use `100dvh` (dynamic viewport height), `100svh` (small viewport height), or JavaScript-based height calculation.

Input zoom: iOS Safari automatically zooms in when a user focuses an input with `font-size < 16px`. This is disorienting and the user must manually zoom back out. Setting all form element font sizes to >= 16px prevents this.

---

## Category 3: iOS Native Feel (6 checks)

| # | Check | Anti-Pattern | Best Practice | Method | Severity |
|---|-------|-------------|---------------|--------|----------|
| 3.1 | Hamburger menu detection | Hidden nav behind 3-line icon | Tab bar or visible nav (2-3x engagement improvement) | Look for `[class*="hamburger"]`, `[class*="burger"]`, `[aria-label*="menu"]` with hidden child navs, or `<button>` elements that toggle `<nav>` visibility | MAJOR |
| 3.2 | FAB detection | Floating circle button | Navigation bar buttons | `position: fixed` elements with `border-radius >= 50%` and aspect ratio ~1:1 (width/height between 0.8 and 1.2) | MAJOR |
| 3.3 | Breadcrumb on mobile | Desktop breadcrumb pattern on small screen | Back button + title | Query `nav[aria-label*="breadcrumb"]`, `[class*="breadcrumb"]`, or `ol/ul` with `>` / `/` separators between links | MINOR |
| 3.4 | Material Design styling | Android-specific visuals | iOS shadows, rounded corners, system font | Detect MD3 elevation shadows (`box-shadow` matching MD3 levels), ripple effect classes (`[class*="ripple"]`, `[class*="mdc-"]`), or Material component prefixes | MINOR |
| 3.5 | Component patterns | Web checkboxes, web dropdowns | iOS-style toggles, pickers | Detect `<input type="checkbox">` rendered as standard web checkboxes (not styled as toggles) and `<select>` rendered as web dropdowns instead of iOS pickers | MINOR |
| 3.6 | Toast/snackbar detection | Android-style bottom notifications | iOS alert/banner patterns | Detect `[class*="toast"]`, `[class*="snackbar"]`, or fixed-bottom short-lived notification elements styled in Material Design fashion | MINOR |

### Detection Heuristics

**Hamburger menu:** A hamburger menu is confirmed when:
1. A button/icon element contains a 3-line SVG, `class*="hamburger"`, `class*="burger"`, or `aria-label` containing "menu"
2. AND a `<nav>` or navigation container is hidden (`display: none`, `visibility: hidden`, or `transform: translateX(...)` off-screen) that becomes visible when the button is activated

**FAB:** A floating action button is confirmed when an element has:
1. `position: fixed` or `position: absolute` (with high z-index)
2. `border-radius` >= 50% of its width
3. Roughly circular (aspect ratio between 0.8:1 and 1.2:1)
4. Typically positioned in bottom-right quadrant

---

## Category 4: Viewport & Responsive (6 checks)

| # | Check | Threshold | Method | Severity |
|---|-------|-----------|--------|----------|
| 4.1 | Viewport meta tag present | `width=device-width, initial-scale=1` | `document.querySelector('meta[name="viewport"]').content` — verify it contains `width=device-width` and `initial-scale=1` | CRITICAL |
| 4.2 | Zoom not disabled | `user-scalable != no` AND `maximum-scale >= 2` | Parse viewport meta `content` attribute; fail if `user-scalable=no` or `maximum-scale < 2` | CRITICAL |
| 4.3 | No horizontal overflow | `scrollWidth <= clientWidth` | `document.documentElement.scrollWidth <= document.documentElement.clientWidth` | MAJOR |
| 4.4 | Orientation support | Content works in landscape (852x393) | Resize to `852x393`, then check for content loss, layout breakage, or horizontal overflow | MINOR |
| 4.5 | Reflow at 320px | No horizontal scroll at 320px width (WCAG 1.4.10) | Resize to `320x852`, then check `scrollWidth <= clientWidth` | MAJOR |
| 4.6 | Viewport utilization | Fixed header + footer heights < 20% of `clientHeight` | Measure combined height of all `position: fixed` or `position: sticky` elements at top/bottom as percentage of viewport height | MINOR |

---

## Category 5: Mobile Typography (10 checks)

| # | Check | Threshold | Method | Severity |
|---|-------|-----------|--------|----------|
| 5.1 | Body text font size | >= 16px CSS (17pt iOS) | `getComputedStyle` on `<p>`, `<span>`, `<li>`, `<div>` text elements | MAJOR |
| 5.2 | Input font size | >= 16px (iOS zoom prevention) | `getComputedStyle` on `input, select, textarea` | CRITICAL |
| 5.3 | Minimum any text | >= 11px (iOS caption2 floor) | `getComputedStyle` on all visible text elements; none below 11px | MAJOR |
| 5.4 | Line height | >= 1.5x font size (WCAG 1.4.12) | Computed `lineHeight / fontSize` ratio on body text | MAJOR |
| 5.5 | Line length (mobile) | 30-50 characters per line | `containerWidth / (fontSize * 0.5)` — approximate characters per line | MINOR |
| 5.6 | Paragraph spacing | >= 2x font size | Computed `marginBottom` on `<p>` elements relative to their `fontSize` | MINOR |
| 5.7 | Letter spacing | >= 0.12x font size | Computed `letterSpacing` relative to `fontSize`; flag if below 0.12em | MINOR |
| 5.8 | Color contrast — normal text (AA) | >= 4.5:1 | Foreground vs background color extraction + luminance ratio | CRITICAL |
| 5.9 | Color contrast — large text (AA) | >= 3:1 (>= 18pt or >= 14pt bold) | Same contrast formula, with size/weight check for large text classification | CRITICAL |
| 5.10 | Text scaling at 200% | No truncation or clipping | Set browser zoom to 200%, check for `overflow: hidden` clipping or text truncation | MAJOR |

### iOS Default Text Style Reference

| Style | Size | Weight |
|-------|------|--------|
| Large Title | 34 pt | Regular |
| Title 1 | 28 pt | Regular |
| Title 2 | 22 pt | Regular |
| Title 3 | 20 pt | Regular |
| Headline | 17 pt | Semibold |
| Body | 17 pt | Regular |
| Callout | 16 pt | Regular |
| Subheadline | 15 pt | Regular |
| Footnote | 13 pt | Regular |
| Caption 1 | 12 pt | Regular |
| Caption 2 | 11 pt | Regular |

**Note:** iOS points (pt) map approximately to CSS pixels (px) at 1:1 on standard displays. The minimum text size on iOS is 11pt (Caption 2). Body text should be at least 17pt (Body style) for comfortable reading, which maps to >= 16px CSS as the web minimum.

### Contrast Ratio Formula

Contrast ratio = (L1 + 0.05) / (L2 + 0.05) where L1 is the relative luminance of the lighter color and L2 is the darker.

Relative luminance: For each sRGB channel (R, G, B), convert from 0-255 to 0-1, then:
- If channel <= 0.04045: linear = channel / 12.92
- Else: linear = ((channel + 0.055) / 1.055) ^ 2.4

Luminance = 0.2126 * R_linear + 0.7152 * G_linear + 0.0722 * B_linear

---

## Category 6: Mobile Form UX (8 checks)

| # | Check | Requirement | Method | Severity |
|---|-------|-------------|--------|----------|
| 6.1 | Email fields use `type="email"` | Fields with "email" in name/label/placeholder | Query inputs, cross-reference `name`, `id`, `placeholder`, associated `<label>` text against "email"; verify `type="email"` | MAJOR |
| 6.2 | Phone fields use `type="tel"` | Fields with "phone"/"tel" in name/label/placeholder | Same cross-reference approach; verify `type="tel"` | MAJOR |
| 6.3 | Numeric fields use `inputmode="numeric"` or `"decimal"` | Fields expecting numbers | Cross-reference name/label/placeholder for "number", "amount", "quantity", "zip", "code"; verify `inputmode` attribute | MAJOR |
| 6.4 | `autocomplete` present | 100% of applicable fields | Query all `input` elements in forms; check `autocomplete` attribute is set to a valid token | MAJOR |
| 6.5 | `enterkeyhint` present | Form fields have `enterkeyhint` | Query `input` elements within `<form>`; check for `enterkeyhint` attribute (e.g., "done", "go", "next", "search", "send") | MINOR |
| 6.6 | Single-column layout | No side-by-side form fields at mobile width | Detect form `input`/`select`/`textarea` elements at the same Y-position (within 5px tolerance) — indicates multi-column layout | MAJOR |
| 6.7 | Password autocomplete | `autocomplete="current-password"` or `"new-password"` | Query `input[type="password"]`; verify `autocomplete` is set to `current-password` or `new-password` | MAJOR |
| 6.8 | Keyboard type matching | Correct mobile keyboard for each input | Cross-reference `type`/`inputmode` against field `name`/`label`/`placeholder` content to ensure the right keyboard appears | MAJOR |

### Keyboard Type Mapping

| Input Type | HTML `type` | `inputmode` | `autocomplete` |
|-----------|-------------|-------------|----------------|
| Email | `email` | `email` | `email` |
| Phone | `tel` | `tel` | `tel` |
| URL | `url` | `url` | `url` |
| Number (integer) | `text` | `numeric` | varies |
| Number (decimal) | `text` | `decimal` | varies |
| Search | `search` | `search` | -- |
| Password | `password` | -- | `current-password` |
| New password | `password` | -- | `new-password` |
| Credit card | `text` | `numeric` | `cc-number` |
| One-time code | `text` | `numeric` | `one-time-code` |

---

## Category 7: Interstitials & Overlays (4 checks)

| # | Check | Threshold | Method | Severity |
|---|-------|-----------|--------|----------|
| 7.1 | Overlay coverage on load | < 30% of viewport area | Detect `position: fixed` or `position: absolute` elements with `z-index > 1000`, compute their area as percentage of viewport | CRITICAL |
| 7.2 | Sticky banner height | < 15% of viewport | Measure height of fixed/sticky elements at top or bottom of viewport as percentage of `clientHeight` | MAJOR |
| 7.3 | Popup close button size | >= 44x44 CSS px | Find close buttons (`[class*="close"]`, `[aria-label*="close"]`, `[aria-label*="dismiss"]`) within overlay elements; measure dimensions | MAJOR |
| 7.4 | Overlay timing | Flag overlays appearing within 3s of load | Observe DOM mutations after page load; flag any high-z-index overlay elements that appear within the first 3 seconds | MAJOR |

---

## Category 8: Mobile Accessibility — WCAG Mobile (6 checks)

| # | Check | WCAG Reference | Threshold | Method | Severity |
|---|-------|---------------|-----------|--------|----------|
| 8.1 | Touch targets >= 24x24 CSS px (AA) | WCAG 2.5.8 | All interactive elements >= 24x24 | `getBoundingClientRect()` on all interactive elements | MAJOR |
| 8.2 | Touch targets >= 44x44 CSS px (AAA) | WCAG 2.5.5 | Flag as enhancement, not failure | Same measurement; report as informational | MINOR |
| 8.3 | `prefers-reduced-motion` support | -- | Media query present in stylesheets | Scan all `<style>` and linked stylesheets for `@media (prefers-reduced-motion` | MINOR |
| 8.4 | Focus not obscured by sticky elements | WCAG 2.4.11 | Focused element fully visible | Tab through interactive elements; for each, check that its bounding rect is not overlapped by any `position: fixed` or `position: sticky` element | MAJOR |
| 8.5 | Hover-dependent UI has touch alternative | -- | Touch fallback exists | Check for `@media (hover: none)` or `@media (pointer: coarse)` rules in stylesheets; flag `:hover`-only interactive patterns without touch equivalents | MAJOR |
| 8.6 | Text resize to 200% | WCAG 1.4.4 | No overflow or clipping | Set zoom to 200%, check `scrollWidth <= clientWidth` and no `overflow: hidden` clipping on text containers | MAJOR |

---

## Category 9: Gestures & Interaction (5 checks)

| # | Check | Threshold | Method | Severity |
|---|-------|-----------|--------|----------|
| 9.1 | Pull-to-refresh on scrollable lists | Present on all scrollable list screens | Check for refresh indicators: `[class*="pull-to-refresh"]`, `[class*="ptr"]`, custom scroll event handlers at top of scrollable containers | MINOR |
| 9.2 | Swipe-back gesture support | 100% of pushed screens | Navigate into sub-pages, verify `history.back()` works and left-edge swipe is not blocked by the page | MINOR |
| 9.3 | Swipe-to-reveal on list items | Consistent across all applicable lists | Check for swipe-to-reveal patterns (`[class*="swipe"]`, `[class*="slide-action"]`) on list items | MINOR |
| 9.4 | Gesture cancellability | User can cancel mid-gesture | Verify that swipe/drag gestures can be cancelled by reversing direction or moving finger off target | MINOR |
| 9.5 | Skeleton screens for loads > 300ms | Present for content-loading screens | Query `[class*="skeleton"]`, `[class*="shimmer"]`, `[class*="placeholder"]` during navigation transitions | MINOR |

---

## Category 10: Animation & Motion (5 checks)

| # | Check | Threshold | Method | Severity |
|---|-------|-----------|--------|----------|
| 10.1 | Animation duration range | 100-600ms (MD3 standard range) | Audit CSS `transition-duration` and `animation-duration` on all elements; flag values outside range | MINOR |
| 10.2 | No linear easing on spatial transforms | 0 violations | Check `transition-timing-function` on elements that transition `transform`, `left`, `top`, `width`, `height`; flag `linear` | MINOR |
| 10.3 | Entrance vs exit asymmetry | Exit animations faster than entrance | Compare enter/exit duration values in CSS transitions; exit should be shorter | MINOR |
| 10.4 | Elevation consistency (MD3) | Standard levels: 0/1/3/6/8/12dp | Audit `box-shadow` values and map to MD3 elevation levels; flag non-standard elevations | MINOR |
| 10.5 | Tonal elevation preferred | Shadow-only elements flagged | Count elements using `box-shadow` for elevation without a corresponding tonal surface color (background-color shift); prefer tonal elevation | MINOR |

### MD3 Duration Tokens

| Token | Value | Use Case |
|-------|-------|----------|
| Short1 | 50ms | Micro-interactions |
| Short2 | 100ms | Small transitions |
| Short3 | 150ms | Button states |
| Short4 | 200ms | Small enter/exit |
| Medium1 | 250ms | Card expansion |
| Medium2 | 300ms | Navigation transitions |
| Medium3 | 350ms | Larger transitions |
| Medium4 | 400ms | Full-screen mobile |
| Long1 | 450ms | Complex transitions |
| Long2 | 500ms | Page-level |

### MD3 Easing Curves

| Token | Value | Use Case |
|-------|-------|----------|
| Standard | `cubic-bezier(0.2, 0, 0, 1)` | Default motion |
| Standard Decelerate | `cubic-bezier(0, 0, 0, 1)` | Entering elements |
| Standard Accelerate | `cubic-bezier(0.3, 0, 1, 1)` | Exiting elements |
| Emphasized Decelerate | `cubic-bezier(0.05, 0.7, 0.1, 1)` | Hero entering |
| Emphasized Accelerate | `cubic-bezier(0.3, 0, 0.8, 0.15)` | Hero exiting |

**Key principle:** Entrance animations should use decelerate easing (element slows down as it arrives). Exit animations should use accelerate easing (element speeds up as it leaves). Exit durations should be shorter than entrance durations.

---

## Measurement Scripts (`browser_evaluate`)

The following JavaScript snippets are designed for use with `browser_evaluate` to automate measurement of the checks above.

### 1. Touch Target Size & Spacing Measurement

```javascript
(() => {
  const selectors = 'a, button, input, select, textarea, [role="button"], [onclick]';
  const elements = document.querySelectorAll(selectors);
  const results = { undersized44: [], undersized48: [], spacingViolations: [] };
  const rects = [];

  elements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return; // hidden elements
    const entry = {
      tag: el.tagName,
      text: (el.textContent || el.getAttribute('aria-label') || '').slice(0, 30),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      x: Math.round(rect.x),
      y: Math.round(rect.y)
    };

    if (rect.width < 44 || rect.height < 44) {
      results.undersized44.push(entry);
    }
    if (rect.width < 48 || rect.height < 48) {
      results.undersized48.push(entry);
    }
    rects.push({ rect, entry });
  });

  // Spacing check: compare each pair of nearby elements
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i].rect;
      const b = rects[j].rect;
      const hGap = Math.max(0, Math.max(b.left - a.right, a.left - b.right));
      const vGap = Math.max(0, Math.max(b.top - a.bottom, a.top - b.bottom));
      // Only check elements that are visually adjacent (within 50px in at least one axis)
      if (hGap < 50 && vGap < 50) {
        const minGap = Math.min(
          hGap > 0 ? hGap : Infinity,
          vGap > 0 ? vGap : Infinity
        );
        if (minGap < 8 && minGap !== Infinity) {
          results.spacingViolations.push({
            elementA: rects[i].entry,
            elementB: rects[j].entry,
            gap: Math.round(minGap)
          });
        }
      }
    }
  }

  return {
    totalInteractiveElements: elements.length,
    failAppleHIG: results.undersized44.length,
    failGoogleMD3: results.undersized48.length,
    spacingViolations: results.spacingViolations.length,
    undersized44: results.undersized44.slice(0, 10),
    undersized48: results.undersized48.slice(0, 10),
    spacingDetails: results.spacingViolations.slice(0, 10)
  };
})()
```

### 2. Viewport Meta Tag Parsing

```javascript
(() => {
  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return { present: false, content: null, issues: ['No viewport meta tag found'] };

  const content = meta.getAttribute('content') || '';
  const issues = [];

  if (!content.includes('width=device-width')) {
    issues.push('Missing width=device-width');
  }
  if (!content.includes('initial-scale=1')) {
    issues.push('Missing initial-scale=1');
  }
  if (content.includes('user-scalable=no') || content.includes('user-scalable=0')) {
    issues.push('CRITICAL: user-scalable=no disables zoom (accessibility violation)');
  }

  const maxScaleMatch = content.match(/maximum-scale=([0-9.]+)/);
  if (maxScaleMatch && parseFloat(maxScaleMatch[1]) < 2) {
    issues.push(`maximum-scale=${maxScaleMatch[1]} restricts zoom below 2x`);
  }

  const viewportFit = content.includes('viewport-fit=cover');

  return {
    present: true,
    content,
    viewportFitCover: viewportFit,
    issues,
    pass: issues.length === 0
  };
})()
```

### 3. Input Font-Size Checking (iOS Zoom Prevention)

```javascript
(() => {
  const formElements = document.querySelectorAll('input, select, textarea');
  const violations = [];

  formElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return; // hidden

    const computed = getComputedStyle(el);
    const fontSize = parseFloat(computed.fontSize);

    if (fontSize < 16) {
      violations.push({
        tag: el.tagName,
        type: el.type || 'N/A',
        name: el.name || el.id || 'unnamed',
        placeholder: (el.placeholder || '').slice(0, 30),
        fontSize: Math.round(fontSize * 10) / 10,
        height: Math.round(rect.height)
      });
    }
  });

  return {
    totalFormElements: formElements.length,
    violationCount: violations.length,
    violations: violations.slice(0, 15),
    pass: violations.length === 0
  };
})()
```

### 4. Horizontal Overflow Detection

```javascript
(() => {
  const docEl = document.documentElement;
  const body = document.body;
  const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
  const clientWidth = docEl.clientWidth;
  const hasOverflow = scrollWidth > clientWidth;

  // Find elements causing overflow
  const overflowingElements = [];
  if (hasOverflow) {
    document.querySelectorAll('*').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > clientWidth + 1) {
        overflowingElements.push({
          tag: el.tagName,
          class: (el.className || '').toString().slice(0, 40),
          right: Math.round(rect.right),
          width: Math.round(rect.width)
        });
      }
    });
  }

  return {
    scrollWidth,
    clientWidth,
    hasOverflow,
    overflowPx: hasOverflow ? scrollWidth - clientWidth : 0,
    overflowingElements: overflowingElements.slice(0, 10),
    pass: !hasOverflow
  };
})()
```

### 5. Form Attribute Validation (type/inputmode/autocomplete cross-reference)

```javascript
(() => {
  const inputs = document.querySelectorAll('input, select, textarea');
  const findings = [];

  const keywordMap = {
    email: { type: 'email', inputmode: 'email', autocomplete: 'email' },
    phone: { type: 'tel', inputmode: 'tel', autocomplete: 'tel' },
    tel: { type: 'tel', inputmode: 'tel', autocomplete: 'tel' },
    url: { type: 'url', inputmode: 'url', autocomplete: 'url' },
    password: { type: 'password', autocomplete: ['current-password', 'new-password'] },
    search: { type: 'search', inputmode: 'search' }
  };

  inputs.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const name = (el.name || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const placeholder = (el.placeholder || '').toLowerCase();
    const label = el.labels?.[0]?.textContent?.toLowerCase() || '';
    const combined = `${name} ${id} ${placeholder} ${label}`;
    const issues = [];

    for (const [keyword, expected] of Object.entries(keywordMap)) {
      if (combined.includes(keyword)) {
        if (expected.type && el.type !== expected.type) {
          issues.push(`Expected type="${expected.type}" for ${keyword} field, got "${el.type}"`);
        }
        if (expected.inputmode && el.getAttribute('inputmode') !== expected.inputmode) {
          issues.push(`Missing inputmode="${expected.inputmode}" for ${keyword} field`);
        }
        if (expected.autocomplete) {
          const ac = el.getAttribute('autocomplete');
          const valid = Array.isArray(expected.autocomplete)
            ? expected.autocomplete.includes(ac)
            : ac === expected.autocomplete;
          if (!valid) {
            const exp = Array.isArray(expected.autocomplete)
              ? expected.autocomplete.join(' or ')
              : expected.autocomplete;
            issues.push(`Missing autocomplete="${exp}" for ${keyword} field`);
          }
        }
        break;
      }
    }

    if (!el.getAttribute('autocomplete') && el.tagName === 'INPUT' && el.type !== 'hidden' && el.type !== 'submit') {
      issues.push('Missing autocomplete attribute');
    }

    if (el.closest('form') && !el.getAttribute('enterkeyhint') && el.tagName === 'INPUT') {
      issues.push('Missing enterkeyhint attribute');
    }

    if (issues.length > 0) {
      findings.push({
        tag: el.tagName,
        type: el.type,
        name: el.name || el.id || 'unnamed',
        issues
      });
    }
  });

  // Check for multi-column form layout
  const formInputs = Array.from(document.querySelectorAll('form input, form select, form textarea'))
    .filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    })
    .map(el => ({ el, rect: el.getBoundingClientRect() }));

  const sameRowPairs = [];
  for (let i = 0; i < formInputs.length; i++) {
    for (let j = i + 1; j < formInputs.length; j++) {
      const yDiff = Math.abs(formInputs[i].rect.top - formInputs[j].rect.top);
      if (yDiff < 5) {
        sameRowPairs.push({
          fieldA: formInputs[i].el.name || formInputs[i].el.id || 'unnamed',
          fieldB: formInputs[j].el.name || formInputs[j].el.id || 'unnamed',
          y: Math.round(formInputs[i].rect.top)
        });
      }
    }
  }

  return {
    totalInputs: inputs.length,
    fieldsWithIssues: findings.length,
    findings: findings.slice(0, 20),
    multiColumnViolations: sameRowPairs.slice(0, 10),
    pass: findings.length === 0 && sameRowPairs.length === 0
  };
})()
```

### 6. Overlay Coverage Calculation

```javascript
(() => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const viewportArea = viewportWidth * viewportHeight;
  const overlays = [];

  document.querySelectorAll('*').forEach(el => {
    const computed = getComputedStyle(el);
    const position = computed.position;
    const zIndex = parseInt(computed.zIndex) || 0;

    if ((position === 'fixed' || position === 'absolute') && zIndex > 1000) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const area = rect.width * rect.height;
        const coveragePercent = (area / viewportArea) * 100;
        overlays.push({
          tag: el.tagName,
          class: (el.className || '').toString().slice(0, 40),
          zIndex,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          coveragePercent: Math.round(coveragePercent * 10) / 10
        });
      }
    }
  });

  const totalCoverage = overlays.reduce((sum, o) => sum + o.coveragePercent, 0);

  // Check sticky banner height
  const stickyElements = [];
  document.querySelectorAll('*').forEach(el => {
    const computed = getComputedStyle(el);
    if (computed.position === 'fixed' || computed.position === 'sticky') {
      const rect = el.getBoundingClientRect();
      if (rect.height > 0 && (rect.top < 10 || rect.bottom > viewportHeight - 10)) {
        stickyElements.push({
          tag: el.tagName,
          class: (el.className || '').toString().slice(0, 40),
          height: Math.round(rect.height),
          percentOfViewport: Math.round((rect.height / viewportHeight) * 1000) / 10,
          position: rect.top < viewportHeight / 2 ? 'top' : 'bottom'
        });
      }
    }
  });

  const stickyTotalPercent = stickyElements.reduce((sum, s) => sum + s.percentOfViewport, 0);

  return {
    overlayCount: overlays.length,
    totalOverlayCoverage: Math.round(totalCoverage * 10) / 10,
    overlays: overlays.slice(0, 5),
    overlayCoveragePass: totalCoverage < 30,
    stickyElements: stickyElements.slice(0, 5),
    stickyTotalPercent: Math.round(stickyTotalPercent * 10) / 10,
    stickyBannerPass: stickyTotalPercent < 15
  };
})()
```

### 7. Contrast Ratio Computation

```javascript
(() => {
  function luminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  function parseColor(str) {
    const div = document.createElement('div');
    div.style.color = str;
    document.body.appendChild(div);
    const computed = getComputedStyle(div).color;
    document.body.removeChild(div);
    const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return null;
    return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
  }

  function contrastRatio(c1, c2) {
    const l1 = luminance(c1.r, c1.g, c1.b);
    const l2 = luminance(c2.r, c2.g, c2.b);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function getEffectiveBg(el) {
    let current = el;
    while (current && current !== document.documentElement) {
      const bg = getComputedStyle(current).backgroundColor;
      const parsed = parseColor(bg);
      if (parsed && !(parsed.r === 0 && parsed.g === 0 && parsed.b === 0 &&
          bg.includes('rgba') && bg.includes(', 0)'))) {
        return parsed;
      }
      current = current.parentElement;
    }
    return { r: 255, g: 255, b: 255 }; // default white
  }

  const textElements = document.querySelectorAll('p, span, a, h1, h2, h3, h4, h5, h6, li, label, td, th, div');
  const violations = [];

  textElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    if (!el.textContent?.trim()) return;

    const computed = getComputedStyle(el);
    const fg = parseColor(computed.color);
    const bg = getEffectiveBg(el);
    if (!fg || !bg) return;

    const ratio = contrastRatio(fg, bg);
    const fontSize = parseFloat(computed.fontSize);
    const fontWeight = parseInt(computed.fontWeight) || 400;
    const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
    const requiredRatio = isLargeText ? 3 : 4.5;

    if (ratio < requiredRatio) {
      violations.push({
        text: el.textContent.trim().slice(0, 30),
        tag: el.tagName,
        fontSize: Math.round(fontSize),
        fontWeight,
        isLargeText,
        ratio: Math.round(ratio * 100) / 100,
        requiredRatio,
        fg: `rgb(${fg.r},${fg.g},${fg.b})`,
        bg: `rgb(${bg.r},${bg.g},${bg.b})`
      });
    }
  });

  return {
    totalTextElements: textElements.length,
    contrastViolations: violations.length,
    violations: violations.slice(0, 15),
    pass: violations.length === 0
  };
})()
```

### 8. Hamburger Menu Detection Heuristics

```javascript
(() => {
  const indicators = [];

  // Method 1: Class-based detection
  const byClass = document.querySelectorAll(
    '[class*="hamburger"], [class*="burger"], [class*="menu-toggle"], [class*="nav-toggle"], [class*="mobile-menu"]'
  );
  byClass.forEach(el => {
    indicators.push({
      method: 'class',
      element: el.tagName,
      class: (el.className || '').toString().slice(0, 60),
      visible: el.getBoundingClientRect().width > 0
    });
  });

  // Method 2: Aria-label detection
  const byAria = document.querySelectorAll('[aria-label*="menu" i], [aria-label*="navigation" i]');
  byAria.forEach(el => {
    if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
      indicators.push({
        method: 'aria-label',
        element: el.tagName,
        ariaLabel: el.getAttribute('aria-label'),
        visible: el.getBoundingClientRect().width > 0
      });
    }
  });

  // Method 3: Button that toggles nav visibility
  const buttons = document.querySelectorAll('button, [role="button"]');
  buttons.forEach(btn => {
    const ariaControls = btn.getAttribute('aria-controls');
    const ariaExpanded = btn.getAttribute('aria-expanded');
    if (ariaControls || ariaExpanded !== null) {
      const target = ariaControls ? document.getElementById(ariaControls) : null;
      if (target?.tagName === 'NAV' || target?.querySelector('nav')) {
        indicators.push({
          method: 'aria-controls',
          element: btn.tagName,
          controls: ariaControls,
          expanded: ariaExpanded,
          visible: btn.getBoundingClientRect().width > 0
        });
      }
    }
  });

  // Method 4: SVG with 3 horizontal lines (hamburger icon)
  const svgs = document.querySelectorAll('button svg, [role="button"] svg');
  svgs.forEach(svg => {
    const lines = svg.querySelectorAll('line, rect, path');
    if (lines.length >= 2 && lines.length <= 4) {
      indicators.push({
        method: 'svg-icon',
        element: svg.closest('button, [role="button"]')?.tagName || 'SVG',
        lineCount: lines.length,
        visible: svg.getBoundingClientRect().width > 0
      });
    }
  });

  return {
    hamburgerDetected: indicators.length > 0,
    indicatorCount: indicators.length,
    indicators: indicators.slice(0, 10),
    pass: indicators.length === 0
  };
})()
```

### 9. FAB Detection Heuristics

```javascript
(() => {
  const candidates = [];

  document.querySelectorAll('*').forEach(el => {
    const computed = getComputedStyle(el);
    if (computed.position !== 'fixed' && computed.position !== 'absolute') return;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const borderRadius = parseFloat(computed.borderRadius) || 0;
    const aspectRatio = rect.width / rect.height;
    const isCircular = borderRadius >= (rect.width / 2) * 0.9;
    const isSquarish = aspectRatio >= 0.8 && aspectRatio <= 1.2;
    const isSmallEnough = rect.width <= 80 && rect.height <= 80;
    const isLargeEnough = rect.width >= 40 && rect.height >= 40;

    if (isCircular && isSquarish && isSmallEnough && isLargeEnough) {
      const zIndex = parseInt(computed.zIndex) || 0;
      candidates.push({
        tag: el.tagName,
        class: (el.className || '').toString().slice(0, 40),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        borderRadius: Math.round(borderRadius),
        position: computed.position,
        zIndex,
        bottom: Math.round(window.innerHeight - rect.bottom),
        right: Math.round(window.innerWidth - rect.right),
        text: (el.textContent || el.getAttribute('aria-label') || '').slice(0, 20)
      });
    }
  });

  return {
    fabDetected: candidates.length > 0,
    fabCount: candidates.length,
    candidates: candidates.slice(0, 5),
    pass: candidates.length === 0
  };
})()
```

### 10. Animation Duration & Easing Audit

```javascript
(() => {
  const findings = {
    durationOutOfRange: [],
    linearOnSpatial: [],
    totalAnimated: 0
  };

  const spatialProps = ['transform', 'left', 'top', 'right', 'bottom', 'width', 'height', 'margin', 'padding'];

  document.querySelectorAll('*').forEach(el => {
    const computed = getComputedStyle(el);

    // Check transition properties
    const transitionDuration = computed.transitionDuration;
    const transitionProperty = computed.transitionProperty;
    const transitionTiming = computed.transitionTimingFunction;

    if (transitionDuration && transitionDuration !== '0s') {
      const durations = transitionDuration.split(',').map(d => parseFloat(d) * 1000);
      const properties = transitionProperty.split(',').map(p => p.trim());
      const timings = transitionTiming.split(',').map(t => t.trim());

      durations.forEach((dur, i) => {
        if (dur > 0) {
          findings.totalAnimated++;
          const prop = properties[i] || properties[0] || 'all';
          const timing = timings[i] || timings[0] || 'ease';

          if (dur < 100 || dur > 600) {
            findings.durationOutOfRange.push({
              tag: el.tagName,
              class: (el.className || '').toString().slice(0, 30),
              property: prop,
              duration: dur,
              issue: dur < 100 ? 'Too fast (< 100ms)' : 'Too slow (> 600ms)'
            });
          }

          const isSpatial = spatialProps.some(sp => prop.includes(sp) || prop === 'all');
          if (isSpatial && timing === 'linear') {
            findings.linearOnSpatial.push({
              tag: el.tagName,
              class: (el.className || '').toString().slice(0, 30),
              property: prop,
              timing
            });
          }
        }
      });
    }

    // Check animation properties
    const animDuration = computed.animationDuration;
    if (animDuration && animDuration !== '0s') {
      const dur = parseFloat(animDuration) * 1000;
      if (dur > 0) {
        findings.totalAnimated++;
        if (dur < 100 || dur > 600) {
          findings.durationOutOfRange.push({
            tag: el.tagName,
            class: (el.className || '').toString().slice(0, 30),
            property: 'animation',
            duration: dur,
            issue: dur < 100 ? 'Too fast (< 100ms)' : 'Too slow (> 600ms)'
          });
        }
      }
    }
  });

  // Audit box-shadow for MD3 elevation consistency
  const elevationMap = {
    '0': 0, '1': 1, '3': 3, '6': 6, '8': 8, '12': 12
  };
  const shadowElements = [];
  document.querySelectorAll('*').forEach(el => {
    const shadow = getComputedStyle(el).boxShadow;
    if (shadow && shadow !== 'none') {
      const blurMatch = shadow.match(/(\d+)px\s+(\d+)px\s+(\d+)px/);
      if (blurMatch) {
        const blur = parseInt(blurMatch[3]);
        const standardLevels = [0, 1, 3, 6, 8, 12];
        const closestLevel = standardLevels.reduce((prev, curr) =>
          Math.abs(curr - blur) < Math.abs(prev - blur) ? curr : prev
        );
        shadowElements.push({
          tag: el.tagName,
          class: (el.className || '').toString().slice(0, 30),
          blurRadius: blur,
          closestMD3Level: closestLevel,
          isStandard: standardLevels.includes(blur)
        });
      }
    }
  });

  return {
    totalAnimatedElements: findings.totalAnimated,
    durationViolations: findings.durationOutOfRange.length,
    linearEasingViolations: findings.linearOnSpatial.length,
    durationOutOfRange: findings.durationOutOfRange.slice(0, 10),
    linearOnSpatial: findings.linearOnSpatial.slice(0, 10),
    shadowElements: shadowElements.slice(0, 10),
    nonStandardElevations: shadowElements.filter(s => !s.isStandard).length
  };
})()
```

---

## Severity Grading

Each category receives one of four grades based on the severity of findings within it:

| Grade | Definition | Criteria |
|-------|-----------|----------|
| **PASS** | No issues found | All checks in category pass |
| **MINOR** | Low-impact cosmetic or informational issues | Only MINOR-severity checks fail |
| **MAJOR** | Significant usability or accessibility problems | At least one MAJOR-severity check fails |
| **CRITICAL** | Severe problems blocking usability or accessibility | At least one CRITICAL-severity check fails |

**Category grade** is determined by the highest-severity failing check in that category.

---

## Binary Scorecard

**Total checks:** 56 (across 10 categories)

Each check is scored as:
- **Pass = 1** (meets threshold)
- **Fail = 0** (does not meet threshold)

**Score presentation:** X/56 (percentage)

### Scorecard Template

```markdown
## Mobile UX Audit Results

### Scorecard: X/56 Pass (XX%)

### [Screen Name] — [URL] (393x852)

| Category | Grade | Pass/Total | Findings |
|----------|-------|------------|----------|
| Touch & Interaction | — | —/7 | — |
| iOS Safari Specific | — | —/5 | — |
| iOS Native Feel | — | —/6 | — |
| Viewport & Responsive | — | —/6 | — |
| Mobile Typography | — | —/10 | — |
| Mobile Form UX | — | —/8 | — |
| Interstitials & Overlays | — | —/4 | — |
| Mobile Accessibility | — | —/6 | — |
| Gestures & Interaction | — | —/5 | — |
| Animation & Motion | — | —/5 | — |

### Findings Detail
1. [SEVERITY] **Finding title** — Description with measured value vs threshold...
```

### Check Count Summary

| Category | Check Count |
|----------|------------|
| 1. Touch & Interaction | 7 |
| 2. iOS Safari Specific | 5 |
| 3. iOS Native Feel | 6 |
| 4. Viewport & Responsive | 6 |
| 5. Mobile Typography | 10 |
| 6. Mobile Form UX | 8 |
| 7. Interstitials & Overlays | 4 |
| 8. Mobile Accessibility — WCAG Mobile | 6 |
| 9. Gestures & Interaction | 5 |
| 10. Animation & Motion | 5 |
| **Total** | **56** |
