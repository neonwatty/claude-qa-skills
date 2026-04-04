# Performance Profiler — Complete Reference

Self-contained reference for running a full performance audit. Includes rating thresholds, runtime measurement scripts, viewport profiling, per-route profiling loop, and all static analysis checks.

## Rating Thresholds

| Metric | Tier | Good | Warning | Poor |
|--------|------|------|---------|------|
| TTFB | `[D]` | <= 800ms | <= 1800ms | > 1800ms |
| FCP | `[D]` | <= 1800ms | <= 3000ms | > 3000ms |
| LCP | `[D, Chromium-only]` | <= 2500ms | <= 4000ms | > 4000ms |
| CLS | `[D, Chromium-only]` | <= 0.1 | <= 0.25 | > 0.25 |
| INP | — | <= 200ms | <= 500ms | > 500ms |
| TBT | `[D, Chromium-only]` | <= 200ms | <= 300ms | > 300ms |
| Total JS (compressed) | `[D]` | <= 300KB | <= 500KB | > 500KB |
| Total page weight | `[D]` | <= 2000KB | <= 4000KB | > 4000KB |
| DOM nodes | `[D]` | <= 1500 | <= 3000 | > 3000 |
| Long Tasks count | `[D, Chromium-only]` | <= 3 | <= 6 | > 6 or any single > 200ms |
| HTTP requests | `[D]` | <= 50 | <= 75 | > 75 |
| JS Execution Time | `[D]` | <= 2s | <= 3.5s | > 3.5s |
| Lighthouse Performance score | `[D]` | >= 90 | >= 50 | < 50 |
| Memory | `[D, Chromium-only]` | — | — | — |

## Measurement Tiers

- **`[D]` Deterministic** — Returns same numeric value on same page every time.
- **`[D, Chromium-only]`** — Deterministic but requires Chromium browser. Returns `{ available: false }` on Firefox/WebKit.

All runtime metrics and static checks in this file are deterministic. Chromium-only metrics are noted.

## Measurement Utilities

### Shadow DOM Traversal

Use `deepQuerySelectorAll` in the DOM Health script (Step 8) to count nodes inside shadow roots:

```javascript
function deepQuerySelectorAll(selector, root = document) {
  const results = [...root.querySelectorAll(selector)];
  root.querySelectorAll('*').forEach(el => {
    if (el.shadowRoot) {
      results.push(...deepQuerySelectorAll(selector, el.shadowRoot));
    }
  });
  return results;
}
```

**Known limitation:** Cross-origin iframes cannot be traversed.

## Runtime Measurement Scripts

Measurement patterns for capturing performance metrics in authenticated browser sessions using `playwright-cli -s={session} eval`. These must be run AFTER `playwright-cli -s={session} goto` but BEFORE any user interaction, then read AFTER a settle period.

### Step 1: Navigate and Wait for Load

```
playwright-cli -s={session} goto "<route-url>"
# Poll snapshot until expected content appears (max 3s, 500ms interval)
for i in 1 2 3 4 5 6; do playwright-cli -s={session} snapshot | grep -q "<expected-content>" && break; sleep 0.5; done
```

Wait for the page to be interactive before reading metrics.

### Step 2: Collect Navigation Timing (TTFB, DOM Load, Full Load)

```javascript
playwright-cli -s={session} eval "
() => {
  const nav = performance.getEntriesByType('navigation')[0];
  if (!nav) return { available: false };
  if (nav.loadEventEnd === 0) {
    return {
      available: true,
      partial: true,
      note: 'load event not yet complete',
      ttfb_ms: Math.round(nav.responseStart - nav.requestStart),
      dom_content_loaded_ms: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      load_complete_ms: null,
      transfer_size_kb: Math.round(nav.transferSize / 1024 * 100) / 100,
      dom_interactive_ms: Math.round(nav.domInteractive - nav.startTime),
    };
  }
  return {
    available: true,
    ttfb_ms: Math.round(nav.responseStart - nav.requestStart),
    dom_content_loaded_ms: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
    load_complete_ms: Math.round(nav.loadEventEnd - nav.startTime),
    transfer_size_kb: Math.round(nav.transferSize / 1024 * 100) / 100,
    dom_interactive_ms: Math.round(nav.domInteractive - nav.startTime),
  };
}
"
```

### Step 3: Collect LCP (Largest Contentful Paint)

```javascript
playwright-cli -s={session} eval "
() => {
  return new Promise(resolve => {
    try {
      let lastEntry = null;
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        if (entries.length > 0) lastEntry = entries[entries.length - 1];
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      
      setTimeout(() => {
        observer.disconnect();
        resolve(lastEntry ? {
          available: true,
          lcp_ms: Math.round(lastEntry.startTime),
          element: lastEntry.element?.tagName?.toLowerCase() || 'unknown',
          url: lastEntry.url || null,
          size: lastEntry.size,
        } : { available: false, reason: 'no LCP entries observed within 5s' });
      }, 5000);
    } catch (e) {
      resolve({ available: false, reason: 'LCP observer not supported in this browser' });
    }
  });
}
"
```

### Step 4: Collect CLS (Cumulative Layout Shift)

```javascript
playwright-cli -s={session} eval "
() => {
  return new Promise(resolve => {
    let sessionWindows = [];
    let currentWindow = { shifts: [], score: 0, start: 0 };

    const processEntries = (entries) => {
      for (const entry of entries) {
        if (entry.hadRecentInput) continue;
        
        const shiftValue = entry.value;
        const shiftTime = entry.startTime;
        
        // Start new window if: first shift, gap > 1s, or window > 5s
        if (currentWindow.shifts.length === 0 ||
            shiftTime - currentWindow.shifts[currentWindow.shifts.length - 1].startTime > 1000 ||
            shiftTime - currentWindow.start > 5000) {
          if (currentWindow.shifts.length > 0) {
            sessionWindows.push({ ...currentWindow });
          }
          currentWindow = { shifts: [], score: 0, start: shiftTime };
        }
        
        currentWindow.score += shiftValue;
        currentWindow.shifts.push({
          value: Math.round(shiftValue * 10000) / 10000,
          startTime: Math.round(shiftTime)
        });
      }
    };

    // Try buffered entries first
    const bufferedEntries = performance.getEntriesByType('layout-shift');
    if (bufferedEntries.length > 0) {
      processEntries(bufferedEntries);
    }

    // Also observe for new shifts
    let observer;
    try {
      observer = new PerformanceObserver(list => {
        processEntries(list.getEntries());
      });
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      // layout-shift not supported (Firefox/WebKit)
      if (sessionWindows.length === 0) {
        resolve({ available: false, reason: 'layout-shift observer not supported' });
        return;
      }
    }

    setTimeout(() => {
      if (observer) observer.disconnect();
      // Finalize current window
      if (currentWindow.shifts.length > 0) {
        sessionWindows.push({ ...currentWindow });
      }
      
      // CLS = largest session window score
      const cls = sessionWindows.length > 0
        ? Math.max(...sessionWindows.map(w => w.score))
        : 0;
      
      resolve({
        available: true,
        cls: Math.round(cls * 10000) / 10000,
        sessionWindowCount: sessionWindows.length,
        largestWindow: sessionWindows.length > 0
          ? sessionWindows.reduce((max, w) => w.score > max.score ? w : max)
          : null,
        totalShifts: sessionWindows.reduce((sum, w) => sum + w.shifts.length, 0)
      });
    }, 5000);
  });
}
"
```

### Step 5: Collect Resource Loading (Heavy Resources)

```javascript
playwright-cli -s={session} eval "
() => {
  const resources = performance.getEntriesByType('resource');
  const heavy = resources
    .filter(r => r.transferSize > 50 * 1024) // > 50KB
    .map(r => ({
      name: r.name.split('/').pop().split('?')[0],
      type: r.initiatorType,
      size_kb: Math.round(r.transferSize / 1024 * 100) / 100,
      duration_ms: Math.round(r.duration),
    }))
    .sort((a, b) => b.size_kb - a.size_kb)
    .slice(0, 15);

  const total_kb = Math.round(resources.reduce((sum, r) => sum + r.transferSize, 0) / 1024);
  const js_kb = Math.round(resources.filter(r => r.initiatorType === 'script').reduce((sum, r) => sum + r.transferSize, 0) / 1024);
  const css_kb = Math.round(resources.filter(r => 
    r.initiatorType === 'css' || 
    (r.initiatorType === 'link' && r.name.endsWith('.css'))
  ).reduce((sum, r) => sum + r.transferSize, 0) / 1024);
  const opaque_resources = resources.filter(r => r.transferSize === 0).length;
  const img_kb = Math.round(resources.filter(r => r.initiatorType === 'img').reduce((sum, r) => sum + r.transferSize, 0) / 1024);

  return {
    total_resources: resources.length,
    total_kb,
    js_kb,
    css_kb,
    img_kb,
    opaque_resources,
    heavy_resources: heavy,
  };
}
"
```

### Step 6: Collect FCP (First Contentful Paint)

```javascript
playwright-cli -s={session} eval "
() => {
  const entries = performance.getEntriesByType('paint');
  const fcp = entries.find(e => e.name === 'first-contentful-paint');
  return fcp ? { available: true, fcp_ms: Math.round(fcp.startTime) } : { available: false };
}
"
```

### Step 7: Collect Long Tasks / TBT (Total Blocking Time)

```javascript
playwright-cli -s={session} eval "
() => {
  return new Promise(resolve => {
    try {
      const tasks = [];
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          tasks.push({ duration_ms: Math.round(entry.duration), startTime: Math.round(entry.startTime) });
        }
      });
      observer.observe({ type: 'longtask', buffered: true });
      
      setTimeout(() => {
        observer.disconnect();
        const tbt = tasks.reduce((sum, t) => sum + Math.max(0, t.duration_ms - 50), 0);
        resolve({
          available: true,
          count: tasks.length,
          tbt_ms: tbt,
          longest_ms: tasks.length > 0 ? Math.max(...tasks.map(t => t.duration_ms)) : 0,
          tasks: tasks.slice(0, 10),
          note: 'TBT only covers the 8-second observation window after script injection. Tasks during initial page load may be missed if buffered:true is not supported.'
        });
      }, 8000);
    } catch (e) {
      resolve({ available: false, reason: 'longtask observer not supported in this browser' });
    }
  });
}
"
```

### Step 8: Collect DOM Health

```javascript
playwright-cli -s={session} eval "
() => {
  const all = document.querySelectorAll('*');
  let maxDepth = 0;
  let maxChildren = 0;
  all.forEach(el => {
    let depth = 0;
    let node = el;
    while (node.parentElement) { depth++; node = node.parentElement; }
    if (depth > maxDepth) maxDepth = depth;
    if (el.children.length > maxChildren) maxChildren = el.children.length;
  });
  return { total_nodes: all.length, max_depth: maxDepth, max_children: maxChildren };
}
"
```

### Step 9: Collect Memory Snapshot

```javascript
playwright-cli -s={session} eval "
() => {
  if (performance.memory) {
    return {
      available: true,
      used_mb: Math.round(performance.memory.usedJSHeapSize / 1048576 * 100) / 100,
      total_mb: Math.round(performance.memory.totalJSHeapSize / 1048576 * 100) / 100,
      limit_mb: Math.round(performance.memory.jsHeapSizeLimit / 1048576 * 100) / 100
    };
  }
  return { available: false };
}
"
```

## Viewport Profiling

For comprehensive profiling, measure at both viewport sizes:

**Desktop (1280x720):**

```
playwright-cli -s={session} resize 1280 720
```

**Mobile (393x852):**

```
playwright-cli -s={session} resize 393 852
```

Compare metrics across viewports — mobile often has different LCP elements and more layout shifts.

## Page Settled Detection

Before running any measurement script, ensure the page is settled. After `playwright-cli -s={session} goto` and polling `playwright-cli -s={session} snapshot` for expected content:

1. Wait 2 seconds for lazy loading and layout shifts
2. Run this settle check:

```javascript
playwright-cli -s={session} eval "
(() => {
  return {
    readyState: document.readyState,
    fontsReady: document.fonts.status === 'loaded',
    runningAnimations: document.getAnimations().filter(a => a.playState === 'running').length,
    pendingImages: [...document.images].filter(img => !img.complete).length
  };
})()
"
```

If `runningAnimations > 0` or `pendingImages > 0`, wait an additional 2 seconds and re-check. Maximum 3 settle attempts before proceeding.

## Per-Route Profiling Loop

For each route to profile:

```
0. Run Page Settled Detection (see above)
1. playwright-cli -s={session} goto "<route>"
2. Poll playwright-cli -s={session} snapshot until "<expected>" appears (max 3s, 500ms interval)
3. Run Page Settled Detection settle check (wait + verify)
4. Collect Navigation Timing (Step 2)
5. Collect LCP (Step 3)
6. Collect CLS (Step 4)
7. Collect Resource Loading (Step 5)
8. Collect FCP (Step 6)
9. Collect Long Tasks / TBT (Step 7)
10. Collect DOM Health (Step 8)
11. Collect Memory Snapshot (Step 9)
12. playwright-cli -s={session} screenshot (visual record)
13. Record all metrics for this route
```

Repeat at each viewport size if doing multi-viewport profiling.

### SPA Soft Navigation Limitation

The profiling loop uses `playwright-cli -s={session} goto` for each route, which triggers full page loads. In SPAs with client-side routing (Next.js App Router, React Router, SvelteKit), real users navigate via link clicks that produce soft navigations. Metrics from hard navigations may differ significantly from the in-app experience:

- **LCP** may be much higher on hard navigation (full page load) vs soft navigation (incremental update)
- **CLS** patterns differ (hard nav has initial layout; soft nav has transition shifts)
- **TTFB** is irrelevant for soft navigations (no server request)
- **TBT** may be lower on soft navigation (no initial JS parsing)

**Mitigation:** For SPA routes, consider an additional measurement pass:
1. Navigate to the app's entry point via `playwright-cli -s={session} goto`
2. Click through to the target route via internal links using `playwright-cli -s={session} click <ref>`
3. Wait for content to settle (use Page Settled Detection)
4. Measure metrics after the soft navigation

This requires Playwright interaction orchestration and is not yet automated in the standard profiling loop. When auditing SPAs, document this gap in findings and note whether metrics reflect hard or soft navigation.

**Detection:** Check for SPA frameworks by looking for `window.__NEXT_DATA__` (Next.js), `window.__NUXT__` (Nuxt), `[id="__svelte"]` (SvelteKit), or `[data-reactroot]` (React). If detected, note in the report that metrics reflect hard navigation only.

## Multiple-Run Measurement

For reliable before/after comparison, timing-based metrics require multiple runs.

### Protocol

1. Run the full profiling loop **3 times** for each route
2. For each metric, report the **median** of the 3 runs
3. For before/after comparisons:
   - Run 3 times before changes, 3 times after
   - Compare median values
   - Flag changes < 10% as "within measurement noise"
   - Only report improvements/regressions where the change exceeds 10% consistently

### Metric Stability

| Metric | Stability | Recommended Runs | Notes |
|--------|-----------|-----------------|-------|
| TTFB | Low | 5 runs, report median | Highly variable: server load, network, CDN cache |
| FCP | Medium | 3 runs | Affected by network and parsing |
| LCP | Medium | 3 runs | Cache state affects result |
| CLS | Low-Medium | 3 runs | Timing of async content matters |
| TBT | Medium | 3 runs | CPU load and background processes |
| DOM nodes | High | 1 run sufficient | Deterministic for same content |
| Bundle sizes | High | 1 run sufficient | Deterministic from build output |
| Resource count | High | 1 run sufficient | Deterministic for same page |
| Memory | Low | 5 runs, report median | GC timing, quantized values |

### Environment Consistency

For valid before/after comparison, hold constant:
- Viewport dimensions (already specified: 1280x720 desktop, 393x852 mobile)
- Browser version (Chromium recommended for comprehensive metrics)
- Network conditions (unthrottled, or use consistent throttling profile)
- Cache state (clear browser cache between runs: `page.context().clearCookies()` + navigate to `about:blank`)
- Data state (same database content / seed data if possible)
- Time of day (avoid comparing 2 AM measurement vs peak-hour measurement on shared hosting)

## Static Analysis Checks

Detailed check tables for each performance category. Each check is tagged with the Core Web Vital(s) it impacts: **LCP** (Largest Contentful Paint), **CLS** (Cumulative Layout Shift), **INP** (Interaction to Next Paint), **TTFB** (Time to First Byte).

### 1. Bundle & Code Splitting

| #   | Check                                                   | What to look for                                                                                                                                                                                                                                                                                                                                                          | Severity | Vitals    |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| B1  | Full-library imports of heavy dependencies              | `import _ from 'lodash'` → use `lodash-es` or per-function imports (`import debounce from 'lodash/debounce'`). `import moment from 'moment'` → use `date-fns` or `dayjs`. `import * as icons from 'lucide-react'` → use named imports (`import { Search } from 'lucide-react'`). `import { icons } from '@tabler/icons-react'` → use `@tabler/icons-react` named imports. | HIGH     | LCP, TTFB |
| B2  | Missing dynamic imports for heavy components            | Components >10KB that are below the fold, in modals, or behind user interaction should use `next/dynamic` with `{ ssr: false }` where appropriate. Chart libraries, rich text editors, code editors, PDF viewers are common offenders.                                                                                                                                    | HIGH     | LCP, TTFB |
| B3  | Missing route-level code splitting                      | Pages importing heavy dependencies that aren't needed on initial render. Check for barrel file re-exports (`index.ts`) that pull in entire module trees.                                                                                                                                                                                                                  | MEDIUM   | LCP, TTFB |
| B4  | `next.config` missing `modularizeImports`               | For libraries with deep import paths (e.g., `@mui/icons-material`, `lodash`, `@heroicons/react`), configure `modularizeImports` in `next.config.ts` to auto-transform barrel imports.                                                                                                                                                                                     | MEDIUM   | LCP       |
| B5  | `next.config` missing `transpilePackages`               | ESM-only or poorly-bundled packages that need transpilation. Check for runtime errors from untranspiled node_modules.                                                                                                                                                                                                                                                     | LOW      | TTFB      |
| B6  | Unnecessary polyfills or compatibility code             | Polyfills for features supported by all modern browsers (e.g., `core-js` for Promise, Array.from). Browserslist config targeting very old browsers.                                                                                                                                                                                                                       | MEDIUM   | LCP       |
| B7  | Duplicate dependencies in bundle                        | Same library included in multiple versions. Check `pnpm ls --depth 1` or `npm ls` for duplicate packages like `react`, `tslib`, or utility libraries.                                                                                                                                                                                                                     | MEDIUM   | LCP       |
| B8  | CSS imported in JavaScript unnecessarily                | Large CSS files imported in `_app.tsx` or layout files that could use CSS Modules or Tailwind. Global CSS that includes styles for components not on the critical path.                                                                                                                                                                                                   | LOW      | LCP       |
| B9  | Missing `next/script` strategy for non-critical scripts | Third-party scripts loaded synchronously in `<head>` instead of using `next/script` with `strategy="lazyOnload"` or `"afterInteractive"`.                                                                                                                                                                                                                                 | HIGH     | LCP, TTFB |
| B10 | Development-only code in production                     | `console.log`, debug panels, dev tools, mock data imports still present. Check for `process.env.NODE_ENV` guards.                                                                                                                                                                                                                                                         | LOW      | LCP       |

### 2. Rendering & Hydration

| #   | Check                                                      | What to look for                                                                                                                                                                                                | Severity | Vitals    |
| --- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| R1  | Unnecessary `"use client"` directives                      | Components marked `"use client"` that don't use hooks, event handlers, or browser APIs. These force client-side hydration for no benefit. Server Components are the default — only opt into client when needed. | HIGH     | LCP, TTFB |
| R2  | Large component trees inside `"use client"` boundaries     | A single `"use client"` at a layout level forces everything below to hydrate. Push `"use client"` down to the smallest leaf components that need it.                                                            | HIGH     | LCP, INP  |
| R3  | Missing `React.memo` on expensive list items               | Components rendered in `.map()` over large arrays without memoization. Check for list items that re-render when parent state changes but item props haven't changed.                                            | MEDIUM   | INP       |
| R4  | Missing `useMemo`/`useCallback` for expensive computations | Computations like filtering/sorting large arrays, complex calculations, or formatting that run on every render.                                                                                                 | MEDIUM   | INP       |
| R5  | Hydration mismatches causing full re-renders               | Components that render differently on server vs client (Date.now(), Math.random(), window checks). Use `useEffect` for client-only values or `suppressHydrationWarning` sparingly.                              | MEDIUM   | LCP, CLS  |
| R6  | Layout shifts from dynamic content                         | Content that loads after initial paint and pushes other elements (ads, images without dimensions, lazy-loaded sections without skeleton/placeholder).                                                           | HIGH     | CLS       |
| R7  | Missing `key` prop or using index as key                   | Array rendering without stable keys causes unnecessary DOM reconciliation. Using array index as key when items can reorder or be inserted.                                                                      | LOW      | INP       |
| R8  | Heavy state management on render path                      | Zustand/Redux selectors that return new object references on every call, causing re-renders. Check for selectors that don't use shallow comparison.                                                             | MEDIUM   | INP       |
| R9  | Unpaginated `.map()` rendering without size limits         | Component files containing `.map(` that render arrays without `PAGE_SIZE`, `LIMIT`, `slice`, `pagination`, or `paginate` nearby (within 20 lines). Unbounded `.map()` renders grow with data and degrade INP/LCP as list size increases. Grep for `.map(` in `*.tsx`/`*.jsx` files, then check surrounding context for pagination logic. Flag files where `.map(` appears without any size-limiting pattern. | HIGH     | INP, LCP  |

### 3. API Routes & Data Fetching

| #   | Check                                                | What to look for                                                                                                                                                             | Severity | Vitals    |
| --- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| A1  | Sequential data fetches that could be parallel       | Multiple `await fetch()` or `await supabase.from()` calls in sequence where results don't depend on each other. Use `Promise.all()` or `Promise.allSettled()`.               | HIGH     | TTFB, LCP |
| A2  | Waterfall fetches across component tree              | Parent component fetches data, passes ID to child, child fetches more data. Use parallel fetching at the route level or Suspense boundaries for streaming.                   | HIGH     | TTFB, LCP |
| A3  | Missing Suspense boundaries for streaming            | Server Components that could stream data progressively but block the entire page. Add `<Suspense>` with fallback around slow data fetches.                                   | MEDIUM   | TTFB, LCP |
| A4  | Client-side data fetching that should be server-side | `useEffect` + `fetch` for data that could be fetched in a Server Component or `getServerSideProps`. Client fetching adds a round trip and shows loading spinners.            | HIGH     | LCP, TTFB |
| A5  | Over-fetching (requesting more data than displayed)  | API routes returning full objects when UI only needs 2-3 fields. Supabase `.select('*')` when only specific columns are used. GraphQL queries without field selection.       | MEDIUM   | TTFB      |
| A6  | N+1 query patterns                                   | Fetching a list, then fetching related data for each item in a loop. Use joins, `.select('*, related_table(*)')` in Supabase, or batch queries.                              | HIGH     | TTFB      |
| A7  | Missing error boundaries around data fetches         | Server Component data fetches without `error.tsx` boundary. One failed fetch crashes the entire page instead of just the affected section.                                   | MEDIUM   | LCP       |
| A8  | Redundant data fetches                               | Same data fetched multiple times in the same render tree. React Server Components deduplicate `fetch()` calls automatically, but Supabase client calls are NOT deduplicated. | MEDIUM   | TTFB      |
| A9  | Missing `loading.tsx` for route segments             | Route segments without `loading.tsx` show nothing during navigation. Instant loading states improve perceived performance.                                                   | LOW      | LCP       |
| A10 | Large API response payloads                          | API routes returning >100KB JSON responses. Check for missing pagination, included binary data, or verbose nested objects.                                                   | MEDIUM   | TTFB      |

### 4. Images & Assets

| #   | Check                                     | What to look for                                                                                                                                                                               | Severity | Vitals   |
| --- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| I1  | Missing `next/image` usage                | `<img>` tags instead of `next/image`. The Image component provides automatic optimization, lazy loading, and responsive sizing.                                                                | HIGH     | LCP, CLS |
| I2  | Images without `width` and `height`       | Images without explicit dimensions cause layout shift when they load. `next/image` requires these or `fill` prop.                                                                              | HIGH     | CLS      |
| I3  | Above-fold images not using `priority`    | The LCP image (hero, banner) should have `priority` prop on `next/image` to disable lazy loading and preload.                                                                                  | HIGH     | LCP      |
| I4  | Unoptimized image formats                 | PNG/JPEG where WebP/AVIF would be smaller. `next/image` handles this automatically — check for images served outside the Image component (CSS backgrounds, inline SVGs with embedded rasters). | MEDIUM   | LCP      |
| I5  | Oversized source images                   | Source images that are much larger than their display size (e.g., 4000x3000px image displayed at 400x300). Resize source images or use responsive `sizes` prop.                                | MEDIUM   | LCP      |
| I6  | Missing `sizes` prop on responsive images | `next/image` defaults to generating srcset for all sizes. The `sizes` prop tells the browser which size to request, preventing over-fetching on small screens.                                 | LOW      | LCP      |
| I7  | Large SVGs inlined in JavaScript          | SVG icons >2KB inlined as React components instead of loaded as files or using an icon sprite. Multiple large SVGs add to bundle size.                                                         | MEDIUM   | LCP      |
| I8  | Missing favicon/icon optimization         | Multiple unoptimized favicon formats. Use `next/metadata` icon configuration for automatic optimization.                                                                                       | LOW      | TTFB     |

#### Font Loading Strategy

| # | Check | What to look for | Severity | Vitals |
|---|-------|-----------------|----------|--------|
| FL1 | Missing `font-display` on @font-face | @font-face rules without `font-display: swap` or `font-display: optional`. Causes invisible text during font load (FOIT). Check CSS files and `<style>` tags for @font-face declarations. | HIGH | LCP, CLS |
| FL2 | Web fonts not preloaded | Critical web fonts (used in above-fold text) not loaded via `<link rel="preload" as="font" crossorigin>`. Delays text rendering. Check `<head>` for preload links matching font URLs. | MEDIUM | LCP |
| FL3 | Missing `size-adjust` on fallback fonts | Font fallback declarations without `size-adjust`, `ascent-override`, or `descent-override`. Causes layout shift when web font loads and metrics differ from fallback. | LOW | CLS |

#### Resource Hints

| # | Check | What to look for | Severity | Vitals |
|---|-------|-----------------|----------|--------|
| RH1 | Missing `preconnect` for critical third-party origins | Third-party scripts (analytics, CDN, API) loaded without `<link rel="preconnect" href="..." crossorigin>`. Saves DNS+TCP+TLS time (~100-500ms per origin). Check network resources for third-party origins, then check `<head>` for matching preconnect links. | MEDIUM | TTFB, LCP |
| RH2 | Missing `fetchpriority="high"` on LCP image | The LCP image element (hero/banner) should have `fetchpriority="high"` to tell the browser to prioritize its loading over other resources. Check the LCP element identified in runtime profiling. | HIGH | LCP |
| RH3 | Missing `dns-prefetch` for external origins | External origins used later in page lifecycle (lazy-loaded content, deferred scripts) without `<link rel="dns-prefetch" href="...">`. Cheaper than preconnect for non-critical origins. | LOW | TTFB |
| RH4 | Excessive `preload` usage | More than 3-4 `<link rel="preload">` resources in `<head>`. Overuse negates priority benefit and wastes bandwidth on resources that may not be needed immediately. Count preload links. | LOW | LCP |

### 5. Third-party SDKs

#### PostHog

| #   | Check                                              | What to look for                                                                                                                                                               | Severity | Vitals    |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------- |
| PH1 | PostHog loaded eagerly on all pages                | `posthog-js` imported at top level and initialized on every page load. Should be lazily loaded with `next/dynamic` or `next/script`, especially if using the snippet approach. | HIGH     | LCP, TTFB |
| PH2 | PostHog provider wrapping entire app unnecessarily | `PostHogProvider` in root layout forces PostHog to load on every page, including public/marketing pages that may not need analytics. Consider scoping to authenticated routes. | MEDIUM   | LCP       |
| PH3 | Missing feature flag bootstrap                     | Feature flags fetched client-side cause a flash of default content. Use `bootstrap` option with server-side flag evaluation to prevent layout shifts.                          | MEDIUM   | CLS       |
| PH4 | `posthog.identify()` called on every render        | Identify should be called once on login, not in a render function or useEffect without deps. Repeated calls waste bandwidth and CPU.                                           | MEDIUM   | INP       |
| PH5 | Session recording enabled globally                 | Session recording is heavy. Ensure it's gated behind a feature flag or only enabled for specific user segments/pages.                                                          | LOW      | INP       |
| PH6 | Autocapture enabled without filtering              | Autocapture tracks every click, input change, and page view. Use `autocapture: { element_allowlist: [...] }` or `capture_pageview: false` with manual tracking.                | LOW      | INP       |

#### Sentry

| #   | Check                                               | What to look for                                                                                                                                                                           | Severity | Vitals    |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------- |
| SE1 | Using `@sentry/browser` instead of `@sentry/nextjs` | `@sentry/nextjs` is specifically optimized for Next.js with smaller bundles, automatic route instrumentation, and RSC support. `@sentry/browser` or `@sentry/react` adds unnecessary code. | HIGH     | LCP       |
| SE2 | Missing Sentry tree-shaking                         | Sentry v7+ supports tree-shaking via `sentry.client.config.ts`. Check for `import * as Sentry from '@sentry/nextjs'` in client code — use named imports when possible.                     | MEDIUM   | LCP       |
| SE3 | Sentry replay loaded eagerly                        | `Sentry.replayIntegration()` loaded on init instead of lazily. Use `Sentry.replayIntegration({ lazyLoadIntegration: true })` or dynamic import.                                            | HIGH     | LCP, TTFB |
| SE4 | `tracesSampleRate` set too high in production       | Sample rate of 1.0 sends every transaction. Use 0.1-0.2 for production. High rates add network overhead and slow down API routes.                                                          | MEDIUM   | TTFB      |
| SE5 | Missing source map upload config                    | Without source maps, Sentry can't provide readable stack traces. Check for `withSentryConfig` in `next.config.ts` with `sourcemaps` configuration.                                         | LOW      | —         |
| SE6 | Profiling enabled without sampling                  | `Sentry.browserProfilingIntegration()` without a low `profilesSampleRate` adds significant overhead to every page load.                                                                    | MEDIUM   | LCP, INP  |

#### Supabase

| #    | Check                                          | What to look for                                                                                                                                                            | Severity | Vitals |
| ---- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ |
| SB1  | Creating new Supabase client per request       | `createClient()` called inside component functions or API route handlers instead of using a singleton or cached factory. Each call initializes auth, realtime, and storage. | HIGH     | TTFB   |
| SB2  | Missing server/browser client separation       | Using browser client in Server Components or API routes. Should use `createServerClient` from `@supabase/ssr` for server-side, `createBrowserClient` for client-side.       | HIGH     | TTFB   |
| SB3  | `.select('*')` without column filtering        | Fetching all columns when only 2-3 are needed. Specify columns: `.select('id, name, created_at')`. Reduces payload size and database work.                                  | MEDIUM   | TTFB   |
| SB4  | Missing `.limit()` on list queries             | Queries that could return unbounded results. Always add `.limit()` or use `.range()` for pagination.                                                                        | HIGH     | TTFB   |
| SB5  | Missing `.single()` on unique lookups          | Queries by primary key or unique constraint using `.select()` without `.single()`. Returns an array instead of a single object, adding serialization overhead.              | LOW      | TTFB   |
| SB6  | Redundant `.eq()` chains that could be `.in()` | Multiple sequential queries with different `.eq()` values that could be a single query with `.in()`.                                                                        | MEDIUM   | TTFB   |
| SB7  | Supabase Realtime subscriptions not cleaned up | `.on()` subscriptions in `useEffect` without cleanup in the return function. Accumulated subscriptions leak memory and connections.                                         | MEDIUM   | INP    |
| SB8  | Auth helper called in render path              | `supabase.auth.getSession()` or `supabase.auth.getUser()` called on every render instead of cached or called once in a provider/middleware.                                 | HIGH     | TTFB   |
| SB9  | Missing RPC for complex queries                | Complex multi-table joins or aggregations done client-side with multiple queries instead of a single Supabase RPC (database function).                                      | MEDIUM   | TTFB   |
| SB10 | Large file uploads without resumable upload    | Supabase Storage uploads >6MB without using `createSignedUploadUrl` or TUS resumable uploads. Large uploads block the main thread and fail on slow connections.             | LOW      | INP    |

### 6. Caching & Revalidation

| #   | Check                                                    | What to look for                                                                                                                                                                                                            | Severity | Vitals    |
| --- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| C1  | Missing `fetch` cache configuration                      | Server Component `fetch()` calls without explicit cache option. In Next.js 15+, fetches are not cached by default — add `{ cache: 'force-cache' }` for static data or `{ next: { revalidate: N } }` for timed revalidation. | MEDIUM   | TTFB      |
| C2  | Pages that could be statically generated                 | Dynamic pages with data that rarely changes. Use `generateStaticParams` for SSG or ISR with `revalidate`. Common: marketing pages, blog posts, documentation.                                                               | HIGH     | TTFB, LCP |
| C3  | Missing `revalidatePath`/`revalidateTag` after mutations | Server Actions or API routes that mutate data without calling `revalidatePath()` or `revalidateTag()` to bust the cache. Users see stale data after changes.                                                                | MEDIUM   | TTFB      |
| C4  | `unstable_cache` without revalidation                    | `unstable_cache()` (or `"use cache"` in Next.js 15+) used without `revalidate` option or tag. Cached data never refreshes.                                                                                                  | MEDIUM   | TTFB      |
| C5  | Missing Cache-Control headers on API routes              | API routes serving data that could be cached by CDN or browser. Add `Cache-Control` headers for GET endpoints with predictable data.                                                                                        | LOW      | TTFB      |
| C6  | Revalidation interval too aggressive                     | `revalidate: 1` or very short intervals on data that doesn't change frequently. Creates unnecessary server load. Match revalidation to data change frequency.                                                               | LOW      | TTFB      |
| C7  | Missing `stale-while-revalidate` for API routes          | API routes that could serve stale data while revalidating in the background. Use `Cache-Control: s-maxage=N, stale-while-revalidate=M`.                                                                                     | LOW      | TTFB      |

### 7. Server Components & Streaming

| #   | Check                                                    | What to look for                                                                                                                                                              | Severity | Vitals    |
| --- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| SC1 | Data fetching in layout instead of page                  | `layout.tsx` fetching data that's only needed on specific child pages. Layouts re-render on navigation — fetch in the specific page instead.                                  | MEDIUM   | TTFB      |
| SC2 | Missing `loading.tsx` for slow data fetches              | Route segments with Server Components that fetch slow data without a `loading.tsx` fallback. Navigation appears frozen until data loads.                                      | HIGH     | LCP       |
| SC3 | Entire page blocked by one slow query                    | A single slow database query prevents the entire page from rendering. Wrap slow sections in `<Suspense>` to stream them independently.                                        | HIGH     | TTFB, LCP |
| SC4 | Client Component wrapping Server Components              | `"use client"` parent wrapping children that could be Server Components. Use the "donut pattern" — client wrapper with server children passed via `{children}`.               | MEDIUM   | LCP       |
| SC5 | Server Component passing large props to Client Component | Serializing large objects (full database rows, nested trees) from Server to Client Component. Only pass the data the Client Component needs.                                  | MEDIUM   | LCP, TTFB |
| SC6 | Missing `generateMetadata` for SEO pages                 | Pages without `generateMetadata` or `metadata` export. Missing metadata delays LCP on pages where the browser waits for title/description.                                    | LOW      | LCP       |
| SC7 | Route handlers that should be Server Actions             | POST/PUT/DELETE API routes that are only called from forms or buttons in the same app. Server Actions eliminate the API route overhead and work with progressive enhancement. | LOW      | TTFB      |
| SC8 | Missing parallel routes for independent sections         | Page sections that load different data at different speeds but are rendered sequentially. Parallel routes (`@section`) with `<Suspense>` stream independently.                | MEDIUM   | TTFB, LCP |

## Browser Compatibility

| Metric | Chromium | Firefox | WebKit | Fallback |
|--------|----------|---------|--------|----------|
| Navigation Timing (TTFB) | Yes | Yes | Yes | — |
| FCP (paint entries) | Yes | Yes | Yes | — |
| LCP | Yes | No | No | `{ available: false }` |
| CLS (layout-shift) | Yes | No | No | `{ available: false }` |
| Long Tasks / TBT | Yes | No | No | `{ available: false }` |
| Memory | Yes | No | No | `{ available: false }` |
| Resource Timing | Yes | Yes | Yes | — |
| DOM Health | Yes | Yes | Yes | — |

**Recommendation:** Default to Chromium for comprehensive performance measurement. When running on Firefox or WebKit, the scorecard denominator adjusts to only count available metrics.

**INP Note:** Interaction to Next Paint (INP) is a field-only metric requiring real user interactions. It cannot be measured in lab/synthetic testing. TBT (Total Blocking Time) is the recommended lab proxy for INP. The thresholds table lists INP for reference but measurement scripts do not collect it.
