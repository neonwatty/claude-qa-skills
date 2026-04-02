# QA-Skills Plugin: Performance & Mobile Expansion

**Date:** 2026-04-02
**Status:** Approved

## Overview

Expand the qa-skills plugin from 3 QA personas (smoke, ux, adversarial) to 5 by adding a **performance profiler agent** and a **mobile UX auditor agent**. Restructure existing agents to use dedicated reference files. Update `/run-qa` to dispatch any combination of the 5 personas.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Performance: skill vs agent | Agent replaces skill | Single artifact, consistent with other personas |
| Performance: fix code? | Report-only (measure + flag) | Keeps agent fast and non-destructive |
| Mobile: scope | Comprehensive (iOS native feel + mobile web best practices) | ~80 checks, covers both app types |
| Mobile: viewport | Single — 393x852 (iPhone 15 Pro) | Consistent with existing mobile workflow convention |
| `/run-qa` interface | Flat list, one at a time or any combination | `[smoke\|ux\|adversarial\|performance\|mobile\|all]` |
| Reference structure | One reference file per persona | Clean separation; agents stay focused on process/output |
| Agent architecture | Agent + shared references (Approach 2) | Matches existing plugin patterns |

## Agent 1: Performance Profiler

**File:** `agents/performance-profiler.md`
**Reference:** `references/performance-profiler.md`
**Script:** `scripts/performance/parse-build-output.sh` (existing)

### Role

Measure runtime performance and static code patterns on each assigned screen/route. Report-only — no fixes, no PRs.

### Runtime Metrics (collected via Playwright `browser_evaluate`)

| Category | Metrics | Source |
|----------|---------|--------|
| Core Web Vitals | LCP, CLS, INP | PerformanceObserver |
| Supplemental Vitals | TTFB, FCP, TBT (via Long Tasks sum) | Navigation Timing + PerformanceObserver |
| DOM Health | Node count, max depth, max children per node | `document.querySelectorAll('*')` |
| Long Tasks | Count and duration of tasks > 50ms | PerformanceObserver `longtask` |
| Memory | JS heap size snapshot | `performance.memory` (Chromium) |
| Resource Loading | Total JS/CSS/image KB, request count, heavy resources > 50KB | Resource Timing API |

### Static Analysis

The existing 73 checks across 7 categories from the current performance-profiler skill:

1. Bundle & Code Splitting (10 checks)
2. Rendering & Hydration (8 checks)
3. API Routes & Data Fetching (10 checks)
4. Images & Assets (8 checks)
5. Third-party SDKs — PostHog (6), Sentry (6), Supabase (10)
6. Caching & Revalidation (7 checks)
7. Server Components & Streaming (8 checks)

### Flagging Thresholds

| Metric | MEDIUM | HIGH |
|--------|--------|------|
| LCP | — | > 2500ms |
| CLS | — | > 0.1 |
| INP | — | > 200ms |
| FCP | > 1800ms | > 3000ms |
| TTFB | > 800ms | > 1800ms |
| TBT | > 200ms | > 300ms |
| Total JS (compressed) | > 300KB | > 500KB |
| DOM nodes | > 1500 | > 3000 |
| Long Tasks count | > 3 | any single > 200ms |
| HTTP requests | > 50 | — |
| JS Execution Time | > 2s | > 3.5s |

### Output Format

Per-route metrics table + findings list with severity ratings. Matches existing agent output patterns (markdown table + detailed findings).

```markdown
## Performance Profiler Results

### Per-Route Metrics
| Route | TTFB | FCP | LCP | CLS | INP | TBT | JS (KB) | DOM Nodes | Rating |
|-------|------|-----|-----|-----|-----|-----|---------|-----------|--------|
| / | 120ms | 1.2s | 1.8s | 0.02 | 85ms | 120ms | 245 | 890 | Good |
| /dashboard | 340ms | 2.1s | 3.2s | 0.18 | 220ms | 340ms | 412 | 2100 | Poor |

### Findings
1. [HIGH] **LCP 3.2s on /dashboard** — Largest element is an unoptimized hero image...
2. [HIGH] **CLS 0.18 on /dashboard** — Layout shift caused by...
3. [MEDIUM] **TBT 340ms on /dashboard** — 7 long tasks detected...
```

## Agent 2: Mobile UX Auditor

**File:** `agents/mobile-ux-auditor.md`
**Reference:** `references/mobile-ux-auditor.md`
**Also references:** `references/ios-hig-requirements.md`, `references/ios-hig-anti-patterns.md`

### Role

Comprehensive mobile UX audit at 393x852 viewport. Covers iOS-native-feel standards and mobile web best practices. Report-only — inspects and grades, no fixes.

### Setup

At start of each screen: `browser_resize width=393 height=852`

### Category 1: Touch & Interaction (~5 checks)

| Check | Threshold | Method |
|-------|-----------|--------|
| Tap target size (Apple HIG) | >= 44x44 CSS px | `getBoundingClientRect()` on all interactive elements |
| Tap target size (Google) | >= 48x48 CSS px (flag as info) | Same |
| Tap target spacing | >= 8px between adjacent targets | Compute gaps between interactive element rects |
| Icon-only nav items have text labels | aria-label or visible text present | Query nav items with SVG/img but no adjacent text |
| One-handed reachability | Critical CTAs in bottom 2/3 of viewport | Measure Y-position of primary buttons/links |

### Category 2: iOS Safari Specific (~5 checks)

| Check | What to detect | Method |
|-------|---------------|--------|
| `100vh` bug | Elements using `height: 100vh` | `browser_evaluate` computed styles scan |
| Input zoom prevention | `<input>`, `<select>`, `<textarea>` with font-size < 16px | Query + getComputedStyle |
| Safe area insets | If `viewport-fit=cover`, verify `env(safe-area-inset-*)` in CSS | Parse meta viewport + grep CSS |
| `position: fixed; bottom: 0` + keyboard | Fixed bottom elements that would overlap keyboard | Query fixed-positioned elements |
| Dynamic viewport units | Flag `100vh` usage, suggest `100dvh`/`svh` | CSS scan |

### Category 3: iOS Native Feel (~6 checks)

| Check | Anti-pattern | Best practice |
|-------|-------------|---------------|
| Hamburger menu detection | Hidden nav behind 3-line icon | Tab bar or visible nav |
| FAB detection | Floating circle button | Nav bar buttons |
| Breadcrumb on mobile | Desktop pattern on small screen | Back button + title |
| Material Design styling | Android-specific visuals (elevation, ripples) | iOS shadows, rounded corners |
| Component patterns | Web checkboxes, web dropdowns | iOS-style toggles, pickers |
| Toast/snackbar detection | Android-style bottom notifications | iOS alert/banner patterns |

### Category 4: Viewport & Responsive (~5 checks)

| Check | Threshold | Method |
|-------|-----------|--------|
| Viewport meta tag present | `width=device-width, initial-scale=1` | Parse `<meta name="viewport">` |
| Zoom not disabled | `user-scalable != no`, `maximum-scale >= 2` | Parse viewport meta content |
| No horizontal overflow | `scrollWidth <= clientWidth` | `browser_evaluate` |
| Orientation support | Content works in landscape (852x393) | Resize + check for content loss |
| Reflow at 320px | No horizontal scroll at 320px width (WCAG 1.4.10) | Resize to 320px + check |

### Category 5: Mobile Typography (~7 checks)

| Check | Threshold | Method |
|-------|-----------|--------|
| Body text font size | >= 16px CSS | getComputedStyle on body text elements |
| Input font size | >= 16px (iOS zoom prevention) | getComputedStyle on form elements |
| Line height | >= 1.5x font size (WCAG 1.4.12) | Computed line-height / font-size ratio |
| Paragraph spacing | >= 2x font size | Computed margin-bottom |
| Letter spacing | >= 0.12x font size | Computed letter-spacing |
| Color contrast (normal text, AA) | >= 4.5:1 | Foreground vs background color extraction |
| Color contrast (large text, AA) | >= 3:1 (>= 18pt or >= 14pt bold) | Same, with size check |

### Category 6: Mobile Form UX (~7 checks)

| Check | Requirement | Method |
|-------|-------------|--------|
| Email fields use `type="email"` | Fields with "email" in name/label have correct type | Query + attribute check |
| Phone fields use `type="tel"` | Fields with "phone"/"tel" in name/label | Same |
| Numeric fields use `inputmode` | `inputmode="numeric"` or `"decimal"` where appropriate | Same |
| `autocomplete` attributes present | All standard fields have autocomplete | Query all inputs, check attribute |
| `enterkeyhint` present | Form fields have enterkeyhint | Query inputs in forms |
| Single-column layout | No side-by-side form fields at mobile viewport | Detect form fields with same Y-position |
| Password fields | `autocomplete="current-password"` or `"new-password"` | Attribute check |

### Category 7: Interstitials & Overlays (~4 checks)

| Check | Threshold | Method |
|-------|-----------|--------|
| Overlay coverage on load | < 30% of viewport area | Detect fixed/absolute elements with high z-index, compute area ratio |
| Sticky banner height | < 15% of viewport | Measure fixed header/footer heights |
| Popup close button size | >= 44x44 CSS px | Find close buttons in overlay elements |
| Overlay timing | Flag overlays appearing within 3s of load | Observe DOM mutations after navigate |

### Category 8: Mobile Accessibility — WCAG Mobile (~6 checks)

| Check | WCAG ID | Method |
|-------|---------|--------|
| Touch targets >= 24x24 CSS px (AA) | 2.5.8 | getBoundingClientRect |
| Touch targets >= 44x44 CSS px (AAA) | 2.5.5 | Same (flag as enhancement) |
| `prefers-reduced-motion` support | — | Check for media query in stylesheets |
| Focus not obscured by sticky elements | 2.4.11 | Tab through elements, check visibility against fixed headers/footers |
| Hover-dependent UI has touch alternative | — | Check for `@media (hover: none)` or `(pointer: coarse)` rules |
| Text resize to 200% | 1.4.4 | Set zoom, check for overflow/clipping |

### Grading

Same as UX-auditor: PASS / MINOR / MAJOR / CRITICAL per category.

### Output Format

```markdown
## Mobile UX Audit Results

### [Screen Name] — [URL] (393x852)

| Category | Grade | Findings |
|----------|-------|----------|
| Touch & Interaction | MINOR | 1 finding |
| iOS Safari Specific | PASS | — |
| iOS Native Feel | MAJOR | hamburger menu, FAB detected |
| Viewport & Responsive | PASS | — |
| Mobile Typography | MINOR | 2 inputs below 16px |
| Mobile Form UX | MAJOR | missing autocomplete on 4 fields |
| Interstitials & Overlays | PASS | — |
| Mobile Accessibility | MINOR | 3 targets below 44x44 (AAA) |

### Findings Detail
1. [MAJOR] **Hamburger menu on /dashboard** — Primary navigation hidden behind...
2. [MAJOR] **Missing autocomplete on login form** — Email and password fields...
3. [MINOR] **Search input font-size 14px** — Below 16px threshold, will trigger iOS Safari zoom...
```

## `/run-qa` Command Update

**File:** `commands/run-qa.md`

### Argument Parsing

```
/run-qa [persona...] [--url URL]
```

Accepts any combination:

```
/run-qa smoke                    → just smoke
/run-qa ux                       → just ux
/run-qa adversarial              → just adversarial
/run-qa performance              → just performance
/run-qa mobile                   → just mobile
/run-qa smoke ux mobile          → any combination
/run-qa all                      → all 5
```

### Dispatch

Each selected persona runs independently on assigned screens. No persona gates another.

### Report Format

Unified report with one section per dispatched persona:

```markdown
## QA Report — YYYY-MM-DD

### Smoke Test Results
(pass/fail per step)

### UX Audit Results
(graded rubric per screen)

### Mobile UX Audit Results
(graded rubric per screen, 8 mobile categories)

### Performance Results
(per-route metrics table + flagged findings)

### Adversarial Results
(findings with severity)
```

Only sections for dispatched personas appear in the report.

## Reference File Structure

One reference file per persona:

| Persona | Reference File | Contents |
|---------|---------------|----------|
| Smoke | `references/smoke-tester.md` | Action mapping, pass/fail criteria, verification patterns |
| UX | `references/ux-auditor.md` | Rubric check descriptions, measurement methods |
| Adversarial | `references/adversarial-breaker.md` | Attack patterns, severity classification, reproduction templates |
| Performance | `references/performance-profiler.md` | Metrics collection scripts, 73 static checks, expanded thresholds |
| Mobile | `references/mobile-ux-auditor.md` | 8-category check implementations, `browser_evaluate` measurement scripts |

Mobile agent also references (read-only, no changes):
- `references/ios-hig-requirements.md`
- `references/ios-hig-anti-patterns.md`

## Scripts

| Persona | Script | Purpose |
|---------|--------|---------|
| Performance | `scripts/performance/parse-build-output.sh` (existing) | Parse `next build` output into structured metrics |

## File Change Summary

### New Files (7)

| File | Description |
|------|-------------|
| `agents/performance-profiler.md` | Performance agent |
| `agents/mobile-ux-auditor.md` | Mobile UX agent |
| `references/performance-profiler.md` | Consolidated performance reference |
| `references/mobile-ux-auditor.md` | Mobile check implementations |
| `references/smoke-tester.md` | Extracted from smoke agent inline content |
| `references/ux-auditor.md` | Extracted from ux agent inline content |
| `references/adversarial-breaker.md` | Extracted from adversarial agent inline content |

### Updated Files (5)

| File | Changes |
|------|---------|
| `commands/run-qa.md` | Add performance + mobile to argument parsing, dispatch, report format |
| `agents/smoke-tester.md` | Slim down — move detail to `references/smoke-tester.md` |
| `agents/ux-auditor.md` | Slim down — move detail to `references/ux-auditor.md` |
| `agents/adversarial-breaker.md` | Slim down — move detail to `references/adversarial-breaker.md` |
| `.claude-plugin/plugin.json` | Update description to mention 5 personas |

### Deleted Files (5)

| File | Reason |
|------|--------|
| `skills/performance-profiler/SKILL.md` | Replaced by agent |
| `skills/performance-profiler/` directory | Entire skill directory removed |
| `references/performance-checks.md` | Consolidated into `references/performance-profiler.md` |
| `references/web-vitals-measurement.md` | Consolidated into `references/performance-profiler.md` |
| `scripts/performance/compare-metrics.sh` | No longer needed (report-only) |
