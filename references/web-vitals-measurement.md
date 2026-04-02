# Web Vitals Measurement via Playwright MCP

Measurement patterns for capturing Core Web Vitals in authenticated browser sessions using `browser_evaluate`. Referenced by the performance-profiler skill during runtime profiling.

## Setup: Inject Performance Observer

Before navigating to each route, inject the measurement collector. This must be done AFTER `browser_navigate` but BEFORE any user interaction, then read AFTER a settle period.

### Step 1: Navigate and Wait for Load

```
browser_navigate url="<route-url>"
browser_wait_for text="<expected-content>" timeout=10000
```

Wait for the page to be interactive before reading metrics.

### Step 2: Collect Navigation Timing (TTFB, DOM Load, Full Load)

```javascript
browser_evaluate function:
() => {
  const nav = performance.getEntriesByType('navigation')[0];
  if (!nav) return { available: false };
  return {
    available: true,
    ttfb_ms: Math.round(nav.responseStart - nav.requestStart),
    dom_content_loaded_ms: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
    load_complete_ms: Math.round(nav.loadEventEnd - nav.startTime),
    transfer_size_kb: Math.round(nav.transferSize / 1024 * 100) / 100,
    dom_interactive_ms: Math.round(nav.domInteractive - nav.startTime),
  };
}
```

### Step 3: Collect LCP (Largest Contentful Paint)

```javascript
browser_evaluate function:
() => {
  return new Promise(resolve => {
    const entries = performance.getEntriesByType('largest-contentful-paint');
    if (entries.length > 0) {
      const last = entries[entries.length - 1];
      resolve({
        available: true,
        lcp_ms: Math.round(last.startTime),
        element: last.element?.tagName?.toLowerCase() || 'unknown',
        url: last.url || null,
        size: last.size,
      });
      return;
    }
    // Fallback: observe for up to 3 seconds
    let lastEntry = null;
    const observer = new PerformanceObserver(list => {
      const e = list.getEntries();
      if (e.length > 0) lastEntry = e[e.length - 1];
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
      } : { available: false });
    }, 3000);
  });
}
```

### Step 4: Collect CLS (Cumulative Layout Shift)

```javascript
browser_evaluate function:
() => {
  return new Promise(resolve => {
    let clsValue = 0;
    let clsEntries = [];
    const entries = performance.getEntriesByType('layout-shift');
    if (entries.length > 0) {
      for (const entry of entries) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          clsEntries.push({
            value: Math.round(entry.value * 10000) / 10000,
            startTime: Math.round(entry.startTime),
          });
        }
      }
      resolve({
        available: true,
        cls: Math.round(clsValue * 10000) / 10000,
        shift_count: clsEntries.length,
        shifts: clsEntries.slice(0, 5),
      });
      return;
    }
    // Fallback: observe for up to 3 seconds
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          clsEntries.push({
            value: Math.round(entry.value * 10000) / 10000,
            startTime: Math.round(entry.startTime),
          });
        }
      }
    });
    observer.observe({ type: 'layout-shift', buffered: true });
    setTimeout(() => {
      observer.disconnect();
      resolve({
        available: true,
        cls: Math.round(clsValue * 10000) / 10000,
        shift_count: clsEntries.length,
        shifts: clsEntries.slice(0, 5),
      });
    }, 3000);
  });
}
```

### Step 5: Collect Resource Loading (Heavy Resources)

```javascript
browser_evaluate function:
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
  const css_kb = Math.round(resources.filter(r => r.initiatorType === 'link' || r.initiatorType === 'css').reduce((sum, r) => sum + r.transferSize, 0) / 1024);
  const img_kb = Math.round(resources.filter(r => r.initiatorType === 'img').reduce((sum, r) => sum + r.transferSize, 0) / 1024);

  return {
    total_resources: resources.length,
    total_kb,
    js_kb,
    css_kb,
    img_kb,
    heavy_resources: heavy,
  };
}
```

## Rating Thresholds (Google Core Web Vitals)

| Metric | Good      | Needs Improvement | Poor     |
| ------ | --------- | ----------------- | -------- |
| LCP    | <= 2500ms | <= 4000ms         | > 4000ms |
| CLS    | <= 0.1    | <= 0.25           | > 0.25   |
| INP    | <= 200ms  | <= 500ms          | > 500ms  |
| TTFB   | <= 800ms  | <= 1800ms         | > 1800ms |
| FCP    | <= 1800ms | <= 3000ms         | > 3000ms |

## Profiling at Multiple Viewports

For comprehensive profiling, measure at both viewport sizes:

**Desktop (1280x720):**

```
browser_resize width=1280 height=720
```

**Mobile (393x852):**

```
browser_resize width=393 height=852
```

Compare metrics across viewports — mobile often has different LCP elements and more layout shifts.

## Per-Route Profiling Loop

For each route to profile:

```
1. browser_navigate url="<route>"
2. browser_wait_for text="<expected>" timeout=10000
3. Wait 2 seconds for settle (layout shifts, lazy loading)
4. Collect Navigation Timing (Step 2)
5. Collect LCP (Step 3)
6. Collect CLS (Step 4)
7. Collect Resource Loading (Step 5)
8. browser_take_screenshot (visual record)
9. Record all metrics for this route
```

Repeat at each viewport size if doing multi-viewport profiling.
