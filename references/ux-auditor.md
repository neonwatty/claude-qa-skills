# UX Auditor — Complete Rubric Reference

This reference contains all 10 audit categories, measurement scripts, thresholds, and grading criteria for the UX auditor agent. It covers ~75 checks across Visual Consistency, Component States, Copy & Microcopy, Accessibility, Layout & Responsiveness, Navigation & Wayfinding, Forms & Input, Feedback & Response, Data Display & Scalability, and Visual Complexity & Consistency.

Each check maps to a binary Pass (1) or Fail (0). The total score per screen is X/75. Severity grades (PASS / MINOR / MAJOR / CRITICAL) are assigned per category based on the number and impact of failures.

---

## Measurement Tier Legend

Each check is tagged with its measurement confidence level:

- **`[D]` Deterministic** — Fully measurable via `browser_evaluate`. Returns a numeric value with a clear threshold. Same page always produces the same result. High confidence.
- **`[H]` Heuristic** — Measurable via `browser_evaluate` but with known false positive/negative risks (<5% error rate), OR requires Playwright interaction sequence. Reliable signal, not definitive.
- **`[J]` LLM-Judgment** — Requires visual interpretation or semantic understanding. A programmatic pre-filter narrows what the LLM evaluates by 75-85%. Lower confidence.

### Threshold Citation Legend

- **`[research]`** — Backed by peer-reviewed research or official standards (WCAG, Apple HIG, MD3, Google Web Vitals)
- **`[convention]`** — Widely accepted industry convention
- **`[heuristic]`** — Team-chosen threshold, reasonable but not externally validated

---

## Measurement Utilities

### Shadow DOM Traversal

Many modern web apps use Shadow DOM (Web Components, Shoelace, Lit, Ionic). Standard `querySelectorAll` does not traverse shadow roots. Use this utility in scripts that need complete DOM coverage:

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

Use `deepQuerySelectorAll` instead of `document.querySelectorAll` in scripts that measure touch targets, form attributes, text elements, interactive elements, or any check where Shadow DOM elements would be missed. For performance, only use when `document.querySelectorAll('*').length` and custom element detection suggest shadow roots are present.

**Known limitation:** Cross-origin iframes cannot be traversed. Third-party widgets (chat, payments, auth) inside cross-origin iframes are invisible to all measurement scripts. Document this in findings as "iframe content not audited."

---

## Category 1: Visual Consistency

- [ ] `[H]` Typography: font sizes, weights, and line heights follow a consistent scale
- [ ] `[H]` Spacing: padding and margins use a consistent system (4px/8px grid or similar)
- [ ] `[H]` Colors: brand colors are used consistently, no off-by-one hex values
- [ ] `[H]` Border radii: consistent across similar elements (buttons, cards, inputs)
- [ ] `[H]` Shadows: consistent depth system, not arbitrary values
- [ ] `[H]` Icons: consistent style (outline vs filled), consistent sizing
- [ ] `[H]` Alignment: elements are properly aligned to a grid, no off-by-1px misalignment `[heuristic]`

---

## Category 2: Component States

- [ ] `[J]` Default state: clear, not ambiguous (pre-filter: script 10)
- [ ] `[H]` Hover state: present on all interactive elements, provides visual feedback (interaction script: Hover State Detection)
- [ ] `[D]` Focus state: visible focus ring for keyboard navigation (interaction script: Focus State Visibility)
- [ ] `[H]` Active/pressed state: provides tactile feedback (static script: Active/Pressed #13 + interaction script: Hover State Detection)
- [ ] `[D]` Disabled state: visually distinct, not clickable
- [ ] `[H]` Loading state: present where async operations occur, uses consistent pattern
- [ ] `[J]` Empty state: helpful message and action when no data exists (not just blank space)
- [ ] `[H]` Error state: clear, specific, actionable error messages near the relevant field (interaction script: Form Validation Error Trigger)

---

## Category 3: Copy & Microcopy

- [ ] `[H]` Error messages: specific ("Email is already registered") not vague ("Something went wrong")
- [ ] `[H]` Button labels: action-oriented ("Save Changes" not "Submit"), consistent capitalization
- [ ] `[H]` Placeholder text: helpful examples, not labels (labels should be above the field)
- [ ] `[H]` Confirmation messages: tell the user what happened ("Profile updated" not "Success")
- [ ] `[H]` Empty states: explain what goes here and how to add content
- [ ] `[J]` Tooltips: present where needed, concise, not redundant with visible labels (pre-filter: script 11)
- [ ] `[H]` Grammar and spelling: no typos, consistent voice and tense

---

## Category 4: Accessibility

### Existing Checks

- [ ] `[D]` Color contrast: text meets WCAG AA (4.5:1 for normal text, 3:1 for large) `[research: WCAG 2.1]`
  > **Dark Mode Testing:** Run contrast checks twice — once in default mode and once after setting `page.emulateMedia({ colorScheme: 'dark' })` via Playwright. Common dark mode failures: gray text on dark backgrounds, muted brand colors losing contrast, focus rings invisible on dark backgrounds, status colors (green/red) losing distinction. Report both mode results in findings.
- [ ] `[D]` Touch targets: at least 44x44px on interactive elements `[research: WCAG 2.1]`
- [ ] `[D]` Form labels: every input has an associated label (not just placeholder)
- [ ] `[D]` Alt text: images have meaningful alt text (or empty alt for decorative)
- [ ] `[D]` Heading hierarchy: h1 -> h2 -> h3, no skipped levels `[research: WCAG 2.1]`
- [ ] `[D]` Tab order: logical, follows visual flow
- [ ] `[H]` Screen reader: critical content is not conveyed by color alone

### Cognitive Load Checks (Enhanced)

- [ ] `[D]` Information density (words/viewport): 150-300 good, 300-500 warning, >500 bad. Method: `innerText` word count within viewport bounds `[heuristic]`
- [ ] `[D]` DOM element count: <1500 good, 1500-3000 warning, >3000 bad. Method: `querySelectorAll('*').length`
- [ ] `[H]` Choices per interaction context: <=5 good, 6-9 warning, >9 bad. Method: count visible actionable elements (buttons/links) in focused section
- [ ] `[D]` Flesch-Kincaid grade level: 7-8th good, 9-12th warning, >12th bad. Method: compute from `innerText`
- [ ] `[D]` Flesch Reading Ease: 60-80 good, 40-60 warning, <40 bad. Method: compute from `innerText`
- [ ] `[D]` Heading frequency: every 200-300 words good, 300-600 warning, >600 bad. Method: count words between h1-h6 `[heuristic]`

### WCAG 2.2 Checks

- [ ] `[D]` Target Size — Desktop (WCAG 2.5.8): Interactive elements must be at least 24x24 CSS px, or have 24px spacing offset from adjacent targets `[research: WCAG 2.2]`
- [ ] `[H]` Focus Not Obscured (WCAG 2.4.11): When an element receives keyboard focus, it must not be entirely hidden behind sticky headers, footers, or other fixed-position elements. Requires tabbing through elements and checking overlap with fixed elements `[research: WCAG 2.2]`
- [ ] `[H]` Dragging Movements (WCAG 2.5.7): All drag operations (`[draggable="true"]`, elements with `ondragstart`) must have a single-pointer alternative (button, click, keyboard). Flag draggable elements without visible alternative nearby `[research: WCAG 2.2]`
- [ ] `[H]` Consistent Help (WCAG 3.2.6): Help mechanisms (links containing "help", "support", "contact", "FAQ"; chat widgets) must appear in the same relative position across pages. Requires cross-screen comparison `[research: WCAG 2.2]`
- [ ] `[H]` Redundant Entry (WCAG 3.3.7): In multi-step forms, information entered in earlier steps must be auto-populated or available for selection in later steps. Requires multi-step interaction `[research: WCAG 2.2]`
- [ ] `[H]` Accessible Authentication (WCAG 3.3.8): Authentication must not require cognitive function tests. Flag CAPTCHA elements (`iframe[src*="captcha"]`, `[class*="captcha"]`, `[class*="recaptcha"]`, `[class*="hcaptcha"]`) unless an alternative is provided `[research: WCAG 2.2]`

---

## Category 5: Layout & Responsiveness

- [ ] `[D]` Content width: readable line length (45-75 characters for body text) `[research: WCAG 2.1]`
- [ ] `[D]` Viewport fit: no horizontal scroll at the current viewport
- [ ] `[D]` Element overflow: text truncates gracefully (ellipsis, not clip)
- [ ] `[H]` Image sizing: images are properly constrained, no layout shift on load
- [ ] `[J]` Whitespace: balanced, no cramped or excessively empty areas `[heuristic]`
- [ ] `[J]` Z-index: overlapping elements stack correctly (dropdowns, modals, tooltips) (pre-filter: script 12)

---

## Category 6: Navigation & Wayfinding

### Existing Checks

- [ ] `[D]` Current location: user knows where they are (breadcrumbs, active nav state, page title)
- [ ] `[H]` Back navigation: browser back button works as expected
- [ ] `[H]` URL reflects state: deep-linkable, shareable
- [ ] `[H]` Dead ends: no pages without a clear next action or way to navigate away
- [ ] `[D]` Breadcrumbs: present on nested pages, clickable

### Enhanced Checks

- [ ] `[D]` Primary nav item count: 5-7 good, 8-9 warning, >9 bad `[convention]`
- [ ] `[D]` Dropdown item count per group: <=7 good, 8-15 warning, >15 bad
- [ ] `[H]` Click depth to key pages: <=3 good, 4 warning, >5 bad
- [ ] `[D]` Breadcrumbs at depth >= 3: present = good, absent = bad
- [ ] `[D]` CTA count per view: 1 primary good, 2-3 warning, >3 competing bad `[convention]`
- [ ] `[H]` Back button fidelity: 100% good, <80% bad

---

## Category 7: Forms & Input

### Existing Checks

- [ ] `[H]` Validation timing: inline validation on blur, not only on submit (interaction script: Form Validation Error Trigger)
- [ ] `[D]` Required indicators: clear marking of required fields
- [ ] `[D]` Input types: correct HTML input types (email, tel, number, url)
- [ ] `[D]` Autofill: standard fields work with browser autofill
- [ ] `[D]` Multi-step forms: progress indicator, ability to go back
- [ ] `[H]` Destructive actions: confirmation before irreversible operations

### Enhanced Checks

- [ ] `[D]` Visible fields per section: 3-5 good, 6-7 warning, >7 bad
- [ ] `[D]` Error message position: inline = good, top of form = warning, console/alert = bad
- [ ] `[H]` Error message actionability: names field + fix = good, generic = warning, missing = bad
- [ ] `[H]` Validation timing (granular): on-blur = good, on-submit only = warning, premature = bad
- [ ] `[D]` Multi-step progress indicator: present for >5 fields = good, absent = bad
- [ ] `[D]` Destructive action confirmation: specific verb = good, generic OK/Cancel = warning, none = bad
- [ ] `[J]` Undo availability: undo toast = good, confirmation only = warning, neither = bad

---

## Category 8: Feedback & Response

### Existing Checks

- [ ] `[H]` Action feedback: every user action gets visible confirmation (interaction script: Toast/Notification Behavior)
- [ ] `[H]` Loading indicators: present during async operations, appropriate type (spinner vs skeleton vs progress)
- [ ] `[J]` Optimistic updates: UI responds immediately where appropriate (partially scripted via Toast timing)
- [ ] `[H]` Error recovery: clear path to retry or correct after errors
- [ ] `[H]` Success confirmation: user knows the action completed (static script: Success Infrastructure #15 + interaction script: Toast/Notification Behavior)

### Enhanced Checks

- [ ] `[D]` Skeleton screen presence: skeleton for loads >300ms = good, spinner only = warning, blank = bad
- [ ] `[H]` Blank screen time: 0ms = good, any blank period = bad
- [ ] `[D]` CLS during loading: 0 = good, <0.1 = warning, >0.1 = bad `[research: Google Web Vitals]`
- [ ] `[D]` Animation duration: 200-300ms = good, 100-500ms = warning, >500ms = bad `[convention]`
- [ ] `[H]` Toast/notification duration: 3-5s = good, <2s or no auto-dismiss for errors = bad (interaction script: Toast/Notification Behavior)
- [ ] `[H]` Pull-to-refresh on scrollable lists: present = good, absent = bad
- [ ] `[H]` Search-as-you-type latency: <200ms good, 200-500ms warning, >500ms bad

---

## Category 9: Data Display & Scalability (10 checks)

- [ ] `[D]` Page scroll depth ratio: <=3x good, 3-5x warning, >5x bad. Method: `scrollHeight / clientHeight` `[heuristic]`
- [ ] `[D]` Repeated item count without pagination: <=25 good, 25-50 warning, >50 bad
- [ ] `[D]` Pagination controls present: present when items >25 = good, absent = bad
- [ ] `[D]` Search input present: present when items >50 = good, absent = bad
- [ ] `[D]` Filter controls present: present when items >25 = good, absent = bad
- [ ] `[D]` Sticky header on long pages: present when scroll >3x = good, absent = bad
- [ ] `[J]` Empty state quality: explanation + CTA + visual = good, text only = warning, blank = bad
- [ ] `[H]` Virtual scroll for large lists: present when items >200 = good, absent = bad
- [ ] `[D]` Scroll-to-action distance: CTA within 2 viewports = good, >2 = bad
- [ ] `[D]` Items-per-page count: 10-50 good, 50-100 warning, >100 bad

---

## Category 10: Visual Complexity & Consistency (12 checks)

- [ ] `[D]` Distinct font sizes: <=6 good, 7-9 warning, >10 bad `[convention]`
- [ ] `[D]` Distinct font families: <=2 good, 3 warning, >3 bad
- [ ] `[D]` Distinct font-size/weight combos: <=10 good, 11-15 warning, >15 bad
- [ ] `[D]` Distinct colors in use: <=15 good, 16-25 warning, >25 bad
- [ ] `[D]` Spacing grid conformance (4px): >90% good, 70-90% warning, <70% bad
- [ ] `[H]` Alignment consistency: <=5 left-edge clusters good, 6-8 warning, >8 bad `[heuristic]`
- [ ] `[H]` Visual balance (Ngo score): >0.85 good, 0.6-0.85 warning, <0.6 bad
- [ ] `[D]` Content line length: 45-75 chars good, 75-90 or 30-45 warning, >90 or <30 bad `[research: WCAG 2.1]`
- [ ] `[H]` Whitespace ratio: 30-50% good, 20-30% warning, <20% bad `[heuristic]`
- [ ] `[J]` Icon consistency (stroke/fill): uniform = good, mixed = bad
- [ ] `[D]` Icon sizing consistency: all same viewBox = good, multiple = bad
- [ ] `[H]` Button style variations: 1-3 good, 4-5 warning, >5 bad `[convention]`

---

## Measurement Scripts (`browser_evaluate`)

JavaScript snippets for all automatable checks. Each returns a structured result object.

### Scroll Depth Ratio

```javascript
(() => {
  const ratio = document.documentElement.scrollHeight / document.documentElement.clientHeight;
  const grade = ratio <= 3 ? 'good' : ratio <= 5 ? 'warning' : 'bad';
  return { check: 'scroll_depth_ratio', value: Math.round(ratio * 100) / 100, grade };
})()
```

### Repeated Item Count

```javascript
(() => {
  // Check ul/ol/table containers
  const lists = document.querySelectorAll('ul, ol, [role="list"], table > tbody');
  let maxCount = 0;
  let maxSource = 'none';
  lists.forEach(list => {
    const children = list.children.length;
    if (children > maxCount) {
      maxCount = children;
      maxSource = list.tagName.toLowerCase();
    }
  });

  // Also find containers whose children share a common class pattern
  // (>= 50% of children with same class list)
  const containers = document.querySelectorAll('div, section, main, article');
  containers.forEach(container => {
    const children = Array.from(container.children);
    if (children.length < 3) return;
    const classCounts = {};
    children.forEach(child => {
      const key = Array.from(child.classList).sort().join(' ');
      if (key) classCounts[key] = (classCounts[key] || 0) + 1;
    });
    const maxClassCount = Math.max(...Object.values(classCounts), 0);
    if (maxClassCount >= children.length * 0.5 && maxClassCount > maxCount) {
      maxCount = maxClassCount;
      maxSource = 'class-pattern';
    }
  });

  const grade = maxCount <= 25 ? 'good' : maxCount <= 50 ? 'warning' : 'bad';
  return { check: 'repeated_item_count', value: maxCount, source: maxSource, grade };
})()
```

### Font Size / Family / Combo Audit

```javascript
(() => {
  const sizes = new Set();
  const families = new Set();
  const combos = new Set();

  // Use TreeWalker with SHOW_TEXT to find leaf text nodes
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent || node.textContent.trim().length === 0) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  while (walker.nextNode()) {
    const textNode = walker.currentNode;
    const el = textNode.parentElement;
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    const style = getComputedStyle(el);
    const rawSize = parseFloat(style.fontSize);
    const roundedSize = Math.round(rawSize * 10) / 10 + 'px';
    sizes.add(roundedSize);
    families.add(style.fontFamily.split(',')[0].trim().replace(/['"]/g, ''));
    combos.add(`${roundedSize}|${style.fontWeight}|${style.fontFamily.split(',')[0].trim()}`);
  }

  const sizeGrade = sizes.size <= 6 ? 'good' : sizes.size <= 9 ? 'warning' : 'bad';
  const familyGrade = families.size <= 2 ? 'good' : families.size === 3 ? 'warning' : 'bad';
  const comboGrade = combos.size <= 10 ? 'good' : combos.size <= 15 ? 'warning' : 'bad';

  return {
    check: 'font_audit',
    distinctSizes: { value: sizes.size, grade: sizeGrade, values: [...sizes] },
    distinctFamilies: { value: families.size, grade: familyGrade, values: [...families] },
    distinctCombos: { value: combos.size, grade: comboGrade }
  };
})()
```

### Spacing Grid Conformance (4px)

```javascript
(() => {
  const els = document.querySelectorAll('*');
  let total = 0;
  let conforming = 0;
  const props = ['marginTop', 'marginRight', 'marginBottom', 'marginLeft',
                 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'];

  els.forEach(el => {
    const style = getComputedStyle(el);
    if (style.display === 'none') return;
    props.forEach(prop => {
      const raw = parseFloat(style[prop]);
      const val = Math.abs(raw);
      if (val > 0) {
        total++;
        if (Math.round(val) % 4 === 0) conforming++;
      }
    });
  });

  const pct = total > 0 ? Math.round((conforming / total) * 100) : 100;
  const grade = pct > 90 ? 'good' : pct >= 70 ? 'warning' : 'bad';
  return { check: 'spacing_grid_conformance', conformingPct: pct, total, conforming, grade };
})()
```

### Alignment Clustering

```javascript
(() => {
  const blockDisplays = new Set(['block', 'flex', 'grid', 'table', 'list-item', 'table-row', 'table-cell']);
  const els = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, div, section, article, li, button, input, img, nav, main, aside, footer, header, form, ul, ol');
  const lefts = [];
  const tolerance = 2; // px

  els.forEach(el => {
    const style = getComputedStyle(el);
    if (!blockDisplays.has(style.display)) return;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0) {
      lefts.push(Math.round(rect.left));
    }
  });

  // Cluster left edges within tolerance
  const sorted = [...lefts].sort((a, b) => a - b);
  const clusters = [];
  let current = null;

  sorted.forEach(val => {
    if (current === null || val - current > tolerance) {
      clusters.push(val);
      current = val;
    }
  });

  const grade = clusters.length <= 5 ? 'good' : clusters.length <= 8 ? 'warning' : 'bad';
  return { check: 'alignment_clustering', clusterCount: clusters.length, clusters, grade };
})()
```

### Visual Balance (Ngo Formula)

```javascript
(() => {
  // Ngo visual balance: BM = (BM_h + BM_v) / 2
  // BM_h = 1 - |W_left - W_right| / max(W_left + W_right, 1)
  // BM_v = 1 - |W_top - W_bottom| / max(W_top + W_bottom, 1)
  // W = sum of (element area) weighted by distance from center axis
  // Fix: process deepest-first, skip parents whose descendants were counted, clip to viewport

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = vw / 2;
  const cy = vh / 2;

  let wLeft = 0, wRight = 0, wTop = 0, wBottom = 0;
  const counted = new Set();

  const els = Array.from(document.querySelectorAll('img, svg, button, input, h1, h2, h3, h4, h5, h6, p, a, video, canvas, [role="img"]'));
  // Sort deepest-first: elements with greater depth processed first
  els.sort((a, b) => {
    let dA = 0, dB = 0;
    let n = a; while (n) { dA++; n = n.parentElement; }
    n = b; while (n) { dB++; n = n.parentElement; }
    return dB - dA;
  });

  els.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    // Clip to viewport bounds
    if (rect.bottom <= 0 || rect.top >= vh || rect.right <= 0 || rect.left >= vw) return;
    // Skip if a descendant was already counted (parent would double-count)
    let dominated = false;
    counted.forEach(c => { if (el.contains(c)) dominated = true; });
    if (dominated) return;
    counted.add(el);

    const clippedLeft = Math.max(rect.left, 0);
    const clippedRight = Math.min(rect.right, vw);
    const clippedTop = Math.max(rect.top, 0);
    const clippedBottom = Math.min(rect.bottom, vh);
    const area = (clippedRight - clippedLeft) * (clippedBottom - clippedTop);
    const elCx = (clippedLeft + clippedRight) / 2;
    const elCy = (clippedTop + clippedBottom) / 2;

    if (elCx < cx) wLeft += area;
    else wRight += area;

    if (elCy < cy) wTop += area;
    else wBottom += area;
  });

  const bmH = 1 - Math.abs(wLeft - wRight) / Math.max(wLeft + wRight, 1);
  const bmV = 1 - Math.abs(wTop - wBottom) / Math.max(wTop + wBottom, 1);
  const bm = (bmH + bmV) / 2;
  const score = Math.round(bm * 100) / 100;

  const grade = score > 0.85 ? 'good' : score >= 0.6 ? 'warning' : 'bad';
  return { check: 'visual_balance_ngo', score, bmH: Math.round(bmH * 100) / 100, bmV: Math.round(bmV * 100) / 100, grade };
})()
```

### Whitespace Ratio

```javascript
(() => {
  // Pixel-sampling approach using document.elementFromPoint on a 20px grid
  // Eliminates double-counting from overlapping/nested elements
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const step = 20;
  let totalSamples = 0;
  let occupiedSamples = 0;

  for (let y = step / 2; y < vh; y += step) {
    for (let x = step / 2; x < vw; x += step) {
      totalSamples++;
      const el = document.elementFromPoint(x, y);
      if (el && el !== document.documentElement && el !== document.body) {
        occupiedSamples++;
      }
    }
  }

  const whitespace = totalSamples > 0 ? Math.round((1 - occupiedSamples / totalSamples) * 100) : 50;
  const grade = whitespace >= 30 && whitespace <= 50 ? 'good' : whitespace >= 20 ? 'warning' : 'bad';
  return { check: 'whitespace_ratio', whitespacePct: whitespace, totalSamples, occupiedSamples, grade };
})()
```

### Flesch-Kincaid Formulas

```javascript
(() => {
  // Language check — FK is only valid for English
  const lang = (document.documentElement.lang || '').toLowerCase();
  if (lang && !lang.startsWith('en')) {
    return { check: 'flesch_kincaid', available: false, reason: 'non-English content', detectedLang: lang };
  }

  // Syllable estimation heuristic
  function countSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 2) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  // Extract text from main content area only
  const contentEl = document.querySelector('main, article, [role="main"]') || document.body;
  const text = contentEl.innerText || '';
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

  const wordCount = words.length;
  const sentenceCount = Math.max(sentences.length, 1);
  let syllableCount = 0;
  words.forEach(w => { syllableCount += countSyllables(w); });

  const wordsPerSentence = wordCount / sentenceCount;
  const syllablesPerWord = syllableCount / Math.max(wordCount, 1);

  // Grade Level: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
  const gradeLevel = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;

  // Reading Ease: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
  const readingEase = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;

  const glRounded = Math.round(gradeLevel * 10) / 10;
  const reRounded = Math.round(readingEase * 10) / 10;

  const glGrade = glRounded <= 8 ? 'good' : glRounded <= 12 ? 'warning' : 'bad';
  const reGrade = reRounded >= 60 && reRounded <= 80 ? 'good' : reRounded >= 40 ? 'warning' : 'bad';

  return {
    check: 'flesch_kincaid',
    available: true,
    contentSource: contentEl.tagName.toLowerCase(),
    gradeLevel: { value: glRounded, grade: glGrade },
    readingEase: { value: reRounded, grade: reGrade },
    stats: { words: wordCount, sentences: sentenceCount, syllables: syllableCount }
  };
})()
```

### Heading Frequency

```javascript
(() => {
  const body = document.body;
  const hiddenTags = new Set(['SCRIPT', 'STYLE', 'TEMPLATE']);
  const headingTags = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

  const walker = document.createTreeWalker(body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (hiddenTags.has(node.tagName)) return NodeFilter.FILTER_REJECT;
        if (getComputedStyle(node).display === 'none') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (parent && hiddenTags.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  let wordsBetween = 0;
  const gaps = [];
  const headingTexts = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeType === Node.ELEMENT_NODE && headingTags.has(node.tagName)) {
      if (wordsBetween > 0) gaps.push(wordsBetween);
      wordsBetween = 0;
      headingTexts.push(node.textContent.trim());
    } else if (node.nodeType === Node.TEXT_NODE) {
      const words = node.textContent.trim().split(/\s+/).filter(w => w.length > 0);
      wordsBetween += words.length;
    }
  }
  if (wordsBetween > 0) gaps.push(wordsBetween);

  const maxGap = gaps.length > 0 ? Math.max(...gaps) : 0;
  const avgGap = gaps.length > 0 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0;
  const grade = maxGap <= 300 ? 'good' : maxGap <= 600 ? 'warning' : 'bad';

  // Compound condition: detect duplicate heading texts
  const uniqueHeadings = new Set(headingTexts);
  const allIdentical = headingTexts.length > 1 && uniqueHeadings.size === 1;

  return { check: 'heading_frequency', maxGap, avgGap, gapCount: gaps.length, grade, headingCount: headingTexts.length, allIdentical };
})()
```

### Information Density (Words in Viewport)

```javascript
(() => {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  let wordCount = 0;

  // Use TreeWalker with SHOW_TEXT to count words from text nodes only
  // Eliminates double-counting from nested elements
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent || node.textContent.trim().length === 0) return NodeFilter.FILTER_REJECT;
      const el = node.parentElement;
      if (!el) return NodeFilter.FILTER_REJECT;
      const rect = el.getBoundingClientRect();
      // Check parent element is within viewport bounds
      if (rect.bottom <= 0 || rect.top >= vh || rect.right <= 0 || rect.left >= vw) return NodeFilter.FILTER_REJECT;
      if (rect.width === 0 && rect.height === 0) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  while (walker.nextNode()) {
    const words = walker.currentNode.textContent.trim().split(/\s+/).filter(w => w.length > 0);
    wordCount += words.length;
  }

  const grade = wordCount >= 150 && wordCount <= 300 ? 'good' : wordCount <= 500 ? 'warning' : 'bad';
  return { check: 'information_density', wordsInViewport: wordCount, grade };
})()
```

### Nav Item Count, Dropdown Count, CTA Count

```javascript
(() => {
  // Primary nav items
  const navEls = document.querySelectorAll('nav > ul > li, nav > a, [role="navigation"] > ul > li');
  const navCount = navEls.length;
  const navGrade = navCount <= 7 ? 'good' : navCount <= 9 ? 'warning' : 'bad';

  // Dropdown item counts
  const dropdowns = document.querySelectorAll('[role="menu"], select, [class*="dropdown"] ul');
  let maxDropdownItems = 0;
  dropdowns.forEach(dd => {
    const items = dd.querySelectorAll('[role="menuitem"], option, li');
    if (items.length > maxDropdownItems) maxDropdownItems = items.length;
  });
  const ddGrade = maxDropdownItems <= 7 ? 'good' : maxDropdownItems <= 15 ? 'warning' : 'bad';

  // CTA count — exclude buttons inside nav, footer, header
  const excludeContainers = new Set(['NAV', 'FOOTER', 'HEADER']);
  function isInExcludedContainer(el) {
    let parent = el.parentElement;
    while (parent) {
      if (excludeContainers.has(parent.tagName)) return true;
      parent = parent.parentElement;
    }
    return false;
  }

  const buttons = document.querySelectorAll('button, a[role="button"], [class*="btn-primary"], [class*="cta"], input[type="submit"]');
  let ctaCount = 0;
  buttons.forEach(btn => {
    const rect = btn.getBoundingClientRect();
    if (rect.top >= window.innerHeight || rect.bottom <= 0 || rect.width === 0) return;

    const cls = (btn.className || '').toLowerCase();
    const isPrimaryClass = /primary|cta/.test(cls);
    const isSubmit = btn.type === 'submit';
    const inExcluded = isInExcludedContainer(btn);

    if (inExcluded && !isPrimaryClass && !isSubmit) return;

    if (isPrimaryClass || isSubmit) {
      ctaCount++;
      return;
    }

    // Heuristic: non-transparent background + padding >= 12px + not in nav/footer
    if (!inExcluded) {
      const style = getComputedStyle(btn);
      const bg = style.backgroundColor;
      const hasBg = bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
      const padL = parseFloat(style.paddingLeft) || 0;
      const padR = parseFloat(style.paddingRight) || 0;
      if (hasBg && (padL >= 12 || padR >= 12)) {
        ctaCount++;
      }
    }
  });
  const ctaGrade = ctaCount === 1 ? 'good' : ctaCount <= 3 ? 'warning' : 'bad';

  return {
    check: 'nav_and_cta_audit',
    navItems: { count: navCount, grade: navGrade },
    maxDropdownItems: { count: maxDropdownItems, grade: ddGrade },
    ctaCount: { count: ctaCount, grade: ctaGrade }
  };
})()
```

### DOM Element Count

```javascript
(() => {
  const count = document.querySelectorAll('*').length;
  const grade = count < 1500 ? 'good' : count <= 3000 ? 'warning' : 'bad';
  return { check: 'dom_element_count', value: count, grade };
})()
```

### Color Audit

```javascript
(() => {
  // Parse CSS color string to {r, g, b} tuple
  function parseColor(str) {
    const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) return { r: +match[1], g: +match[2], b: +match[3] };
    return null;
  }

  // Convert sRGB to CIELAB for perceptual distance
  function srgbToLab(c) {
    let r = c.r / 255, g = c.g / 255, b = c.b / 255;
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
    let x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
    let y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750);
    let z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;
    const f = v => v > 0.008856 ? Math.pow(v, 1/3) : 7.787 * v + 16/116;
    return { L: 116 * f(y) - 16, a: 500 * (f(x) - f(y)), b: 200 * (f(y) - f(z)) };
  }

  // Delta-E (CIE76) distance
  function deltaE(lab1, lab2) {
    return Math.sqrt(
      Math.pow(lab1.L - lab2.L, 2) +
      Math.pow(lab1.a - lab2.a, 2) +
      Math.pow(lab1.b - lab2.b, 2)
    );
  }

  const els = document.querySelectorAll('*');
  const rawColors = new Set();
  const colorTuples = [];

  els.forEach(el => {
    const style = getComputedStyle(el);
    if (el.innerText && el.innerText.trim().length > 0) {
      rawColors.add(style.color);
    }
    if (style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') {
      rawColors.add(style.backgroundColor);
    }
  });

  // Parse all colors to tuples
  rawColors.forEach(c => {
    const parsed = parseColor(c);
    if (parsed) colorTuples.push({ str: c, rgb: parsed, lab: srgbToLab(parsed) });
  });

  // Cluster with Delta-E JND threshold of 3.0
  const JND = 3.0;
  const clustered = [];
  const assigned = new Array(colorTuples.length).fill(false);
  for (let i = 0; i < colorTuples.length; i++) {
    if (assigned[i]) continue;
    assigned[i] = true;
    const cluster = [colorTuples[i].str];
    for (let j = i + 1; j < colorTuples.length; j++) {
      if (assigned[j]) continue;
      if (deltaE(colorTuples[i].lab, colorTuples[j].lab) < JND) {
        assigned[j] = true;
        cluster.push(colorTuples[j].str);
      }
    }
    clustered.push(cluster);
  }

  const rawCount = rawColors.size;
  const clusteredCount = clustered.length;
  const grade = clusteredCount <= 15 ? 'good' : clusteredCount <= 25 ? 'warning' : 'bad';
  return { check: 'color_audit', rawDistinctColors: rawCount, clusteredDistinctColors: clusteredCount, grade, values: [...rawColors] };
})()
```

### Heuristic Scripts for LLM-Assisted Checks

These scripts provide programmatic pre-measurement for checks that were previously LLM-judgment only. They produce heuristic signals with 70-95% confidence. The agent should use these results to inform its assessment rather than relying purely on screenshot interpretation.

#### 1. Icon Style Consistency

```javascript
(() => {
  const svgs = deepQuerySelectorAll('svg');
  let outlineCount = 0;
  let filledCount = 0;
  const strokeWidths = new Set();

  svgs.forEach(svg => {
    const rect = svg.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    if (size < 12 || size > 64 || rect.width === 0) return;

    const paths = svg.querySelectorAll('path, circle, rect, line, polyline, polygon');
    let hasStroke = false;
    let hasFill = false;

    paths.forEach(p => {
      const style = getComputedStyle(p);
      const stroke = style.stroke;
      const fill = style.fill;
      const strokeW = parseFloat(style.strokeWidth) || 0;
      if (stroke && stroke !== 'none' && strokeW > 0) {
        hasStroke = true;
        strokeWidths.add(Math.round(strokeW * 10) / 10);
      }
      if (fill && fill !== 'none' && fill !== 'transparent') {
        hasFill = true;
      }
    });

    if (hasStroke && !hasFill) outlineCount++;
    else if (hasFill && !hasStroke) filledCount++;
    else if (hasFill && hasStroke) filledCount++;
  });

  const isMixed = outlineCount > 0 && filledCount > 0;
  const strokeConsistent = strokeWidths.size <= 1;
  const total = outlineCount + filledCount;
  const grade = total === 0 ? 'good' : (!isMixed && strokeConsistent) ? 'good' : (!isMixed || strokeConsistent) ? 'warning' : 'bad';

  return { check: 'icon_style_consistency', outlineCount, filledCount, isMixed, strokeConsistent, strokeWidths: [...strokeWidths], grade };
})()
```

#### 2. Error Message Specificity

```javascript
(() => {
  const errorEls = deepQuerySelectorAll('[class*="error"], [role="alert"], [class*="invalid"], [class*="err-msg"]');
  const badPhrases = [
    'something went wrong', 'error', 'oops', 'try again', 'invalid',
    'failed', 'please try again', 'unknown error', 'an error occurred',
    'unexpected error', 'sorry', 'whoops', 'uh oh'
  ];

  const results = [];
  let flaggedCount = 0;

  errorEls.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const text = (el.textContent || '').trim().toLowerCase();
    if (!text) return;

    const words = text.split(/\s+/).filter(w => w.length > 0);
    const tooShort = words.length < 4;
    const matchesBad = badPhrases.some(phrase => text === phrase || (words.length <= 5 && text.includes(phrase)));
    const flagged = tooShort || matchesBad;

    if (flagged) flaggedCount++;
    results.push({ text: text.substring(0, 80), words: words.length, tooShort, matchesBad, flagged });
  });

  const grade = results.length === 0 ? 'good' : flaggedCount === 0 ? 'good' : flaggedCount <= 1 ? 'warning' : 'bad';
  return { check: 'error_message_specificity', total: results.length, flaggedCount, details: results.slice(0, 10), grade };
})()
```

#### 3. Button Label Quality

```javascript
(() => {
  const buttons = deepQuerySelectorAll('button, [role="button"], a[role="button"]');
  const genericLabels = new Set(['submit', 'ok', 'yes', 'no', 'go', 'click here', 'click', 'here', 'press', 'next', 'back']);
  const actionVerbRe = /^(save|create|delete|remove|send|cancel|confirm|update|add|edit|upload|download|apply|reset|search|filter|sign|log|register|subscribe|share|copy|close|open|expand|collapse|retry|undo|redo|approve|reject|publish|archive|restore)/i;

  const results = [];
  let genericCount = 0;
  let actionVerbCount = 0;

  buttons.forEach(btn => {
    const rect = btn.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const text = (btn.textContent || btn.getAttribute('aria-label') || '').trim();
    if (!text) return;

    const lower = text.toLowerCase();
    const words = lower.split(/\s+/);
    const isGeneric = words.length === 1 && genericLabels.has(lower);
    const hasActionVerb = actionVerbRe.test(lower);

    if (isGeneric) genericCount++;
    if (hasActionVerb) actionVerbCount++;
    results.push({ text: text.substring(0, 40), isGeneric, hasActionVerb });
  });

  const total = results.length;
  const grade = total === 0 ? 'good' : genericCount === 0 ? 'good' : genericCount <= 1 ? 'warning' : 'bad';
  return { check: 'button_label_quality', total, genericCount, actionVerbCount, details: results.slice(0, 15), grade };
})()
```

#### 4. Placeholder Text Quality

```javascript
(() => {
  const inputs = deepQuerySelectorAll('input[placeholder], textarea[placeholder]');
  const examplePatterns = [/@/, /\d{3}[\s.-]\d{3}/, /john|jane|doe/i, /e\.g\./i, /example/i, /\(\d{3}\)/, /\d{5}/];
  const results = [];
  let badCount = 0;

  inputs.forEach(input => {
    const rect = input.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const placeholder = (input.getAttribute('placeholder') || '').trim();
    if (!placeholder) return;

    const label = input.labels && input.labels[0] ? input.labels[0].textContent.trim() : '';
    const ariaLabel = input.getAttribute('aria-label') || '';
    const hasLabel = label.length > 0 || ariaLabel.length > 0;

    const matchesLabel = label && placeholder.toLowerCase() === label.toLowerCase();
    const looksLikeExample = examplePatterns.some(p => p.test(placeholder));
    const actsAsLabel = !hasLabel && placeholder.length > 0;
    const bad = matchesLabel || actsAsLabel;

    if (bad) badCount++;
    results.push({
      placeholder: placeholder.substring(0, 50),
      label: label.substring(0, 50),
      matchesLabel,
      looksLikeExample,
      actsAsLabel,
      bad
    });
  });

  const grade = results.length === 0 ? 'good' : badCount === 0 ? 'good' : badCount <= 1 ? 'warning' : 'bad';
  return { check: 'placeholder_text_quality', total: results.length, badCount, details: results.slice(0, 10), grade };
})()
```

#### 5. Confirmation Message Quality

```javascript
(() => {
  const successEls = deepQuerySelectorAll('[class*="success"], [role="status"], [class*="toast"], [class*="notification"]');
  const genericSet = ['success', 'done', 'ok', 'completed', 'saved', 'updated', 'submitted', 'confirmed'];
  const results = [];
  let genericCount = 0;

  successEls.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const text = (el.textContent || '').trim();
    if (!text) return;

    const lower = text.toLowerCase();
    const words = lower.split(/\s+/).filter(w => w.length > 0);
    const isGeneric = words.length <= 2 && genericSet.some(g => lower.includes(g));
    const hasSubjectNoun = words.length >= 3;

    if (isGeneric) genericCount++;
    results.push({ text: text.substring(0, 80), words: words.length, isGeneric, hasSubjectNoun });
  });

  const grade = results.length === 0 ? 'good' : genericCount === 0 ? 'good' : genericCount <= 1 ? 'warning' : 'bad';
  return { check: 'confirmation_message_quality', total: results.length, genericCount, details: results.slice(0, 10), grade };
})()
```

#### 6. Empty State Quality (3-component)

```javascript
(() => {
  const containers = deepQuerySelectorAll('[class*="empty"], [class*="no-data"], [class*="no-results"], [class*="zero-state"], [class*="empty-state"], [class*="blank-slate"]');
  const results = [];
  let perfectCount = 0;

  containers.forEach(container => {
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const text = (container.textContent || '').trim();
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const hasText = words.length >= 5;

    const ctas = container.querySelectorAll('a, button, [role="button"]');
    const hasCTA = ctas.length > 0;

    const visuals = container.querySelectorAll('svg, img, [class*="icon"], [class*="illustration"]');
    let hasVisual = false;
    visuals.forEach(v => {
      const vRect = v.getBoundingClientRect();
      if (vRect.width >= 20 && vRect.height >= 20) hasVisual = true;
    });

    const score = (hasText ? 1 : 0) + (hasCTA ? 1 : 0) + (hasVisual ? 1 : 0);
    if (score === 3) perfectCount++;
    results.push({ text: text.substring(0, 60), hasText, hasCTA, hasVisual, score });
  });

  const total = results.length;
  const grade = total === 0 ? 'good' : (perfectCount === total) ? 'good' : (perfectCount >= total / 2) ? 'warning' : 'bad';
  return { check: 'empty_state_quality', total, perfectCount, details: results.slice(0, 10), grade };
})()
```

#### 7. Content Not Color-Only

```javascript
(() => {
  const violations = [];

  // Check inline links in paragraphs: flag if no underline, no bold, no icon
  const paragraphs = deepQuerySelectorAll('p, [class*="text"], [class*="content"]');
  paragraphs.forEach(p => {
    const links = p.querySelectorAll('a');
    links.forEach(link => {
      const rect = link.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const style = getComputedStyle(link);
      const hasUnderline = style.textDecoration.includes('underline');
      const hasBold = parseInt(style.fontWeight) >= 600;
      const hasIcon = link.querySelector('svg, img, [class*="icon"]') !== null;
      if (!hasUnderline && !hasBold && !hasIcon) {
        violations.push({ type: 'link-color-only', text: link.textContent.trim().substring(0, 40) });
      }
    });
  });

  // Check form inputs with colored borders: flag if no text/icon indicator nearby
  const inputs = deepQuerySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    const style = getComputedStyle(input);
    const borderColor = style.borderColor.toLowerCase();
    const isColoredBorder = borderColor.includes('255') || borderColor.includes('red') || borderColor.includes('green');
    if (!isColoredBorder) return;
    const parent = input.parentElement;
    if (!parent) return;
    const textIndicator = parent.querySelector('[class*="error"], [class*="success"], [class*="help"], [role="alert"]');
    const iconIndicator = parent.querySelector('svg, [class*="icon"]');
    if (!textIndicator && !iconIndicator) {
      violations.push({ type: 'input-color-only', name: input.name || input.id || 'unnamed' });
    }
  });

  // Check status indicators: flag if no text or aria-label
  const statusEls = deepQuerySelectorAll('[class*="status"], [class*="badge"], [class*="indicator"]');
  statusEls.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const text = (el.textContent || '').trim();
    const ariaLabel = el.getAttribute('aria-label') || '';
    if (!text && !ariaLabel) {
      violations.push({ type: 'status-color-only', classes: el.className.substring(0, 60) });
    }
  });

  const grade = violations.length === 0 ? 'good' : violations.length <= 2 ? 'warning' : 'bad';
  return { check: 'content_not_color_only', violationCount: violations.length, details: violations.slice(0, 15), grade };
})()
```

#### 8. Dead End Detection

```javascript
(() => {
  const allLinks = deepQuerySelectorAll('a[href]');
  let outboundCount = 0;

  allLinks.forEach(link => {
    const rect = link.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const href = link.getAttribute('href') || '';
    if (href === '#' || href.startsWith('javascript:') || href === '') return;
    outboundCount++;
  });

  const buttons = deepQuerySelectorAll('button, [role="button"]');
  let visibleButtonCount = 0;
  buttons.forEach(btn => {
    const rect = btn.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) visibleButtonCount++;
  });

  const navElements = deepQuerySelectorAll('nav, [role="navigation"]');
  let visibleNavCount = 0;
  navElements.forEach(nav => {
    const rect = nav.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) visibleNavCount++;
  });

  const isDeadEnd = outboundCount === 0 && visibleNavCount === 0;
  const isNearDeadEnd = outboundCount <= 1 && visibleNavCount === 0;
  const grade = isDeadEnd ? 'bad' : isNearDeadEnd ? 'warning' : 'good';

  return { check: 'dead_end_detection', outboundLinks: outboundCount, visibleButtons: visibleButtonCount, navElements: visibleNavCount, isDeadEnd, isNearDeadEnd, grade };
})()
```

#### 9. Error Message Actionability

```javascript
(() => {
  const errorEls = deepQuerySelectorAll('[class*="error"], [role="alert"], [class*="invalid"], [class*="err-msg"], [class*="field-error"]');
  const fieldKeywords = ['email', 'password', 'name', 'phone', 'address', 'username', 'date', 'number', 'url', 'file', 'card', 'zip', 'code', 'amount'];
  const fixKeywords = ['must', 'should', 'at least', 'format', 'characters', 'required', 'enter', 'provide', 'choose', 'select', 'between', 'minimum', 'maximum', 'valid', 'cannot', 'too short', 'too long'];

  const results = [];
  let actionableCount = 0;

  errorEls.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const text = (el.textContent || '').trim().toLowerCase();
    if (!text || text.length < 2) return;

    const hasFieldName = fieldKeywords.some(kw => text.includes(kw));
    const hasFixGuidance = fixKeywords.some(kw => text.includes(kw));
    const isActionable = hasFieldName && hasFixGuidance;

    // Measure distance to nearest input
    const inputs = deepQuerySelectorAll('input, select, textarea');
    let minDistance = Infinity;
    inputs.forEach(input => {
      const iRect = input.getBoundingClientRect();
      if (iRect.width === 0) return;
      const dx = rect.left - iRect.left;
      const dy = rect.top - iRect.bottom;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDistance) minDistance = dist;
    });

    if (isActionable) actionableCount++;
    results.push({
      text: text.substring(0, 80),
      hasFieldName,
      hasFixGuidance,
      isActionable,
      distanceToInput: minDistance === Infinity ? null : Math.round(minDistance)
    });
  });

  const total = results.length;
  const grade = total === 0 ? 'good' : (actionableCount === total) ? 'good' : (actionableCount >= total / 2) ? 'warning' : 'bad';
  return { check: 'error_message_actionability', total, actionableCount, details: results.slice(0, 10), grade };
})()
```

#### 10. Default State Ambiguity Pre-filter `[J with pre-filter]`

```javascript
(() => {
  const flagged = [];

  // Toggles without aria-checked
  const toggles = deepQuerySelectorAll('[role="switch"], [role="checkbox"], [class*="toggle"]');
  toggles.forEach(t => {
    if (!t.getAttribute('aria-checked')) {
      flagged.push({ type: 'toggle-no-aria-checked', text: (t.textContent || '').trim().substring(0, 40) });
    }
  });

  // Radio groups with no default
  const radioGroups = {};
  const radios = deepQuerySelectorAll('input[type="radio"]');
  radios.forEach(r => {
    const name = r.name || 'unnamed';
    if (!radioGroups[name]) radioGroups[name] = { total: 0, checked: 0 };
    radioGroups[name].total++;
    if (r.checked) radioGroups[name].checked++;
  });
  Object.entries(radioGroups).forEach(([name, group]) => {
    if (group.checked === 0) {
      flagged.push({ type: 'radio-no-default', name, count: group.total });
    }
  });

  // Selects with placeholder first option
  const selects = deepQuerySelectorAll('select');
  selects.forEach(sel => {
    const first = sel.options && sel.options[0];
    if (first && (first.value === '' || first.disabled)) {
      const isSelected = sel.selectedIndex === 0;
      if (isSelected) {
        flagged.push({ type: 'select-placeholder-selected', text: first.textContent.trim().substring(0, 40) });
      }
    }
  });

  // Buttons with same background as parent
  const buttons = deepQuerySelectorAll('button, [role="button"]');
  buttons.forEach(btn => {
    const rect = btn.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const btnBg = getComputedStyle(btn).backgroundColor;
    const parent = btn.parentElement;
    if (!parent) return;
    const parentBg = getComputedStyle(parent).backgroundColor;
    if (btnBg === parentBg && btnBg !== 'rgba(0, 0, 0, 0)') {
      flagged.push({ type: 'button-blends-with-parent', text: (btn.textContent || '').trim().substring(0, 40) });
    }
  });

  return { check: 'default_state_ambiguity_prefilter', flaggedCount: flagged.length, details: flagged.slice(0, 20), note: 'Requires LLM review for final judgment' };
})()
```

#### 11. Tooltip Coverage Pre-filter `[J with pre-filter]`

```javascript
(() => {
  const flagged = [];

  // Icon-only buttons without title/aria-label/data-tooltip
  const buttons = deepQuerySelectorAll('button, [role="button"]');
  buttons.forEach(btn => {
    const rect = btn.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const text = (btn.textContent || '').trim();
    const hasSvgOrImg = btn.querySelector('svg, img, [class*="icon"]') !== null;
    const hasTitle = btn.getAttribute('title') || btn.getAttribute('aria-label') || btn.getAttribute('data-tooltip');
    if (hasSvgOrImg && text.length <= 1 && !hasTitle) {
      flagged.push({ type: 'icon-button-no-tooltip', html: btn.outerHTML.substring(0, 80) });
    }
  });

  // Truncated text without title
  const textEls = deepQuerySelectorAll('span, p, td, th, div, a, li');
  textEls.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    if (el.scrollWidth > el.clientWidth + 2) {
      const hasTitle = el.getAttribute('title');
      if (!hasTitle) {
        flagged.push({ type: 'truncated-no-title', text: (el.textContent || '').trim().substring(0, 50) });
      }
    }
  });

  // Abbreviations without title
  const abbrs = deepQuerySelectorAll('abbr');
  abbrs.forEach(abbr => {
    if (!abbr.getAttribute('title')) {
      flagged.push({ type: 'abbr-no-title', text: (abbr.textContent || '').trim() });
    }
  });

  return { check: 'tooltip_coverage_prefilter', flaggedCount: flagged.length, details: flagged.slice(0, 20), note: 'Requires LLM review for final judgment' };
})()
```

#### 12. Z-index Stacking Pre-filter `[J with pre-filter]`

```javascript
(() => {
  const findings = [];
  const els = document.querySelectorAll('*');
  const zValues = [];

  els.forEach(el => {
    const style = getComputedStyle(el);
    const zIndex = parseInt(style.zIndex);
    if (isNaN(zIndex) || style.position === 'static') return;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    zValues.push({ el, zIndex, rect, classes: (el.className || '').toString().substring(0, 60) });

    if (zIndex > 9999) {
      findings.push({ type: 'extreme-z-index', zIndex, classes: (el.className || '').toString().substring(0, 60) });
    }
  });

  // Check for overlay elements with lower z-index than content
  const overlayKeywords = ['overlay', 'modal', 'backdrop', 'drawer', 'popover', 'dropdown'];
  zValues.forEach(item => {
    const cls = item.classes.toLowerCase();
    const isOverlay = overlayKeywords.some(kw => cls.includes(kw));
    if (!isOverlay) return;

    zValues.forEach(other => {
      if (other === item) return;
      const otherCls = other.classes.toLowerCase();
      const isContent = !overlayKeywords.some(kw => otherCls.includes(kw));
      if (isContent && other.zIndex > item.zIndex) {
        const overlaps = !(item.rect.right < other.rect.left || item.rect.left > other.rect.right ||
                           item.rect.bottom < other.rect.top || item.rect.top > other.rect.bottom);
        if (overlaps) {
          findings.push({
            type: 'overlay-under-content',
            overlayZ: item.zIndex, overlayClass: item.classes,
            contentZ: other.zIndex, contentClass: other.classes
          });
        }
      }
    });
  });

  return { check: 'z_index_stacking_prefilter', findingCount: findings.length, maxZ: zValues.length > 0 ? Math.max(...zValues.map(v => v.zIndex)) : 0, details: findings.slice(0, 15), note: 'Requires LLM review for final judgment' };
})()
```

#### 13. Active/Pressed State Feedback

```javascript
(() => {
  const interactiveSelectors = ['button', 'a', '[role="button"]', 'input[type="submit"]', 'input[type="button"]', '[role="tab"]', '[role="menuitem"]'];
  const interactiveEls = deepQuerySelectorAll(interactiveSelectors.join(', '));

  let totalVisible = 0;
  let withCursorPointer = 0;
  let withTransition = 0;

  interactiveEls.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    totalVisible++;

    const style = getComputedStyle(el);
    if (style.cursor === 'pointer') withCursorPointer++;
    if (style.transition && style.transition !== 'none' && style.transition !== 'all 0s ease 0s') withTransition++;
  });

  // Check stylesheets for :active rules
  let activeRuleCount = 0;
  try {
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules || []) {
          if (rule.selectorText && rule.selectorText.includes(':active')) {
            activeRuleCount++;
          }
        }
      } catch (e) { /* cross-origin stylesheet */ }
    }
  } catch (e) { /* no access */ }

  const cursorPct = totalVisible > 0 ? Math.round((withCursorPointer / totalVisible) * 100) : 100;
  const transitionPct = totalVisible > 0 ? Math.round((withTransition / totalVisible) * 100) : 100;
  const coveragePct = Math.round((cursorPct + transitionPct) / 2);
  const grade = coveragePct >= 100 ? 'good' : coveragePct >= 80 ? 'warning' : 'bad';

  return { check: 'active_pressed_state_feedback', totalVisible, withCursorPointer, withTransition, activeRuleCount, cursorPct, transitionPct, coveragePct, grade };
})()
```

#### 14. Error Recovery Path

```javascript
(() => {
  const errorContainers = deepQuerySelectorAll('[class*="error"], [role="alert"], [class*="fail"], [class*="404"], [class*="500"]');
  const results = [];
  let withRecoveryCount = 0;

  errorContainers.forEach(container => {
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const text = (container.textContent || '').trim();
    if (!text || text.length < 3) return;

    // Check for recovery elements inside the error container
    const retryBtn = container.querySelector('button, [role="button"]');
    const navLink = container.querySelector('a[href]');
    const editableField = container.querySelector('input, select, textarea');

    // Also check siblings and parent for recovery elements
    const parent = container.parentElement;
    let nearbyRetry = false;
    let nearbyLink = false;
    let nearbyField = false;
    if (parent) {
      nearbyRetry = parent.querySelector('button[class*="retry"], button[class*="try-again"], [class*="retry"]') !== null;
      nearbyLink = parent.querySelector('a[href]:not([href="#"])') !== null;
      nearbyField = parent.querySelector('input:not([type="hidden"]), select, textarea') !== null;
    }

    const hasRecovery = !!(retryBtn || navLink || editableField || nearbyRetry || nearbyLink || nearbyField);
    if (hasRecovery) withRecoveryCount++;

    results.push({
      text: text.substring(0, 60),
      hasRetryBtn: !!(retryBtn || nearbyRetry),
      hasNavLink: !!(navLink || nearbyLink),
      hasEditableField: !!(editableField || nearbyField),
      hasRecovery
    });
  });

  const total = results.length;
  const grade = total === 0 ? 'good' : (withRecoveryCount === total) ? 'good' : (withRecoveryCount >= total / 2) ? 'warning' : 'bad';
  return { check: 'error_recovery_path', total, withRecoveryCount, details: results.slice(0, 10), grade };
})()
```

#### 15. Success Confirmation Infrastructure

```javascript
(() => {
  // Detect toast/snackbar containers
  const toastContainers = deepQuerySelectorAll('[class*="toast"], [class*="Toaster"], [class*="snackbar"], [class*="Snackbar"], [class*="notification-container"], [id*="toast"], [class*="notistack"]');

  // Detect ARIA live regions
  const statusRegions = deepQuerySelectorAll('[role="status"], [aria-live="polite"], [aria-live="assertive"]');

  // Check forms for adjacent success elements
  const forms = deepQuerySelectorAll('form');
  let formsWithSuccessInfra = 0;
  forms.forEach(form => {
    const rect = form.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const parent = form.parentElement;
    if (!parent) return;
    const successEl = parent.querySelector('[class*="success"], [class*="confirm"], [role="status"]');
    if (successEl) formsWithSuccessInfra++;
  });

  const hasToasts = toastContainers.length > 0;
  const hasStatusRegions = statusRegions.length > 0;
  const hasInfrastructure = hasToasts || hasStatusRegions;

  const grade = hasInfrastructure ? 'good' : forms.length === 0 ? 'good' : 'bad';
  return {
    check: 'success_confirmation_infrastructure',
    toastContainers: toastContainers.length,
    statusRegions: statusRegions.length,
    formsChecked: forms.length,
    formsWithSuccessInfra,
    hasInfrastructure,
    grade
  };
})()
```

### WCAG 2.2 Measurement Scripts

#### 1. Target Size Desktop (24x24)

```javascript
(() => {
  const interactive = document.querySelectorAll(
    'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [onclick], [tabindex]:not([tabindex="-1"])'
  );
  const violations = [];
  
  interactive.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    if (rect.top >= window.innerHeight || rect.bottom <= 0) return;
    
    const meetsMinimum = rect.width >= 24 && rect.height >= 24;
    
    if (!meetsMinimum) {
      // Check spacing offset alternative (24px circle centered on target doesn't intersect adjacent targets)
      // Simplified: check if nearest interactive neighbor is at least 24px away
      let hasSpacingOffset = true;
      interactive.forEach(other => {
        if (other === el) return;
        const otherRect = other.getBoundingClientRect();
        if (otherRect.width === 0) return;
        const dx = Math.max(0, Math.max(rect.left, otherRect.left) - Math.min(rect.right, otherRect.right));
        const dy = Math.max(0, Math.max(rect.top, otherRect.top) - Math.min(rect.bottom, otherRect.bottom));
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 24) hasSpacingOffset = false;
      });
      
      if (!hasSpacingOffset) {
        violations.push({
          tag: el.tagName,
          text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        });
      }
    }
  });
  
  const grade = violations.length === 0 ? 'good' : violations.length <= 3 ? 'warning' : 'bad';
  return { check: 'wcag_target_size_desktop', violations: violations.length, details: violations.slice(0, 15), grade };
})()
```

#### 2. Accessible Authentication

```javascript
(() => {
  const captchaSelectors = [
    'iframe[src*="captcha"]', 'iframe[src*="recaptcha"]', 'iframe[src*="hcaptcha"]',
    '[class*="captcha"]', '[class*="recaptcha"]', '[class*="hcaptcha"]',
    '[id*="captcha"]', '[data-sitekey]'
  ];
  const captchaEls = document.querySelectorAll(captchaSelectors.join(', '));
  
  if (captchaEls.length === 0) {
    return { check: 'wcag_accessible_auth', captchaFound: false, grade: 'good' };
  }
  
  // Check for alternative auth methods nearby
  const loginForm = captchaEls[0].closest('form') || captchaEls[0].parentElement;
  const hasPasskey = !!loginForm?.querySelector('[autocomplete="webauthn"]');
  const hasSocialLogin = !!document.querySelector('a[href*="oauth"], a[href*="login/google"], a[href*="login/github"], [class*="social-login"]');
  const hasAlternative = hasPasskey || hasSocialLogin;
  
  const grade = hasAlternative ? 'good' : 'bad';
  return {
    check: 'wcag_accessible_auth',
    captchaFound: true,
    captchaCount: captchaEls.length,
    hasPasskey,
    hasSocialLogin,
    hasAlternative,
    grade
  };
})()
```

#### 3. Dragging Movements

```javascript
(() => {
  const draggables = document.querySelectorAll('[draggable="true"], [ondragstart], [class*="draggable"], [class*="sortable"]');
  const findings = [];
  
  draggables.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    
    // Check for single-pointer alternatives nearby
    const parent = el.closest('[class*="list"], [class*="container"], [role="list"]') || el.parentElement;
    const hasButtons = parent?.querySelector('button[class*="move"], button[class*="sort"], button[class*="up"], button[class*="down"], [class*="handle"]');
    const hasKeyboard = el.getAttribute('tabindex') !== null || el.getAttribute('role') === 'option';
    
    if (!hasButtons && !hasKeyboard) {
      findings.push({
        tag: el.tagName,
        class: (el.className || '').toString().slice(0, 40),
        text: (el.textContent || '').trim().slice(0, 30)
      });
    }
  });
  
  const grade = findings.length === 0 ? 'good' : 'bad';
  return { check: 'wcag_dragging_movements', draggableElements: draggables.length, withoutAlternative: findings.length, findings: findings.slice(0, 10), grade };
})()
```

#### 4. Focus Not Obscured (Pre-check)

Note: Full verification requires Playwright interaction. Static pre-check can detect fixed/sticky elements that may obscure focus.

```javascript
(() => {
  const allEls = document.querySelectorAll('*');
  const fixedSticky = [];
  
  allEls.forEach(el => {
    const style = getComputedStyle(el);
    if (style.position === 'fixed' || style.position === 'sticky') {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        fixedSticky.push({
          tag: el.tagName,
          position: style.position,
          class: (el.className || '').toString().slice(0, 40),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          height: Math.round(rect.height),
          coversTop: rect.top <= 0,
          coversBottom: rect.bottom >= window.innerHeight
        });
      }
    }
  });
  
  const riskLevel = fixedSticky.length === 0 ? 'low' : fixedSticky.length <= 2 ? 'medium' : 'high';
  const grade = fixedSticky.length === 0 ? 'good' : 'warning';
  return { check: 'wcag_focus_not_obscured_precheck', fixedStickyElements: fixedSticky.length, riskLevel, elements: fixedSticky.slice(0, 10), grade, note: 'Full verification requires Playwright tabbing interaction' };
})()
```

#### 5. Consistent Help (Pre-check)

Note: Full verification requires Playwright interaction. Static pre-check can detect help mechanisms on the current page.

```javascript
(() => {
  const helpLinks = document.querySelectorAll('a[href*="help"], a[href*="support"], a[href*="contact"], a[href*="faq"]');
  const helpText = document.querySelectorAll('a, button');
  const helpElements = [];
  
  helpLinks.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) {
      helpElements.push({
        type: 'link',
        text: (el.textContent || '').trim().slice(0, 30),
        href: (el.getAttribute('href') || '').slice(0, 60),
        top: Math.round(rect.top),
        left: Math.round(rect.left)
      });
    }
  });
  
  helpText.forEach(el => {
    const text = (el.textContent || '').toLowerCase().trim();
    if (/^(help|support|contact|faq|get help)$/i.test(text)) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && !helpElements.some(h => h.text.toLowerCase() === text)) {
        helpElements.push({
          type: el.tagName.toLowerCase(),
          text: text.slice(0, 30),
          top: Math.round(rect.top),
          left: Math.round(rect.left)
        });
      }
    }
  });
  
  // Check for chat widgets
  const chatWidgets = document.querySelectorAll('[class*="chat-widget"], [class*="intercom"], [class*="drift"], [class*="crisp"], [class*="zendesk"], [id*="chat-widget"]');
  chatWidgets.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) {
      helpElements.push({ type: 'chat-widget', class: (el.className || '').toString().slice(0, 40), top: Math.round(rect.top), left: Math.round(rect.left) });
    }
  });
  
  const grade = helpElements.length > 0 ? 'good' : 'warning';
  return { check: 'wcag_consistent_help_precheck', helpMechanismsFound: helpElements.length, elements: helpElements.slice(0, 10), grade, note: 'Cross-page consistency requires Playwright multi-page comparison' };
})()
```

#### 6. Redundant Entry (Pre-check)

Note: Full verification requires Playwright interaction. Static pre-check can detect multi-step form patterns.

```javascript
(() => {
  const progressIndicators = document.querySelectorAll('[class*="step"], [class*="progress"], [class*="wizard"], [role="progressbar"], [class*="stepper"]');
  const forms = document.querySelectorAll('form');
  const multiStepSignals = [];
  
  if (progressIndicators.length > 0) {
    multiStepSignals.push({ type: 'progress-indicator', count: progressIndicators.length });
  }
  
  forms.forEach(form => {
    const fieldsets = form.querySelectorAll('fieldset, [class*="step"], [class*="section"]');
    const hiddenSections = form.querySelectorAll('[style*="display: none"], [hidden], [class*="hidden"]');
    if (fieldsets.length > 1 || hiddenSections.length > 0) {
      multiStepSignals.push({
        type: 'multi-section-form',
        fieldsets: fieldsets.length,
        hiddenSections: hiddenSections.length
      });
    }
    
    // Check for autocomplete attributes (good practice for redundant entry)
    const inputs = form.querySelectorAll('input[autocomplete]');
    if (inputs.length > 0) {
      multiStepSignals.push({ type: 'autocomplete-present', count: inputs.length });
    }
  });
  
  const isMultiStep = multiStepSignals.some(s => s.type !== 'autocomplete-present');
  const grade = !isMultiStep ? 'good' : 'warning';
  return { check: 'wcag_redundant_entry_precheck', isMultiStep, signals: multiStepSignals, grade, note: 'Full verification requires Playwright multi-step form interaction' };
})()
```

---

## Interaction-Based Measurement Scripts

These scripts require Playwright interaction (tabbing, hovering, clicking, form submission) and **change page state**. Run them AFTER all static measurement scripts are complete to avoid polluting the initial DOM state.

**Execution order:** Run interaction scripts in this order: (1) Focus/Tab, (2) Hover, (3) Form Validation, (4) Toast/Notification. Each script documents how to reset state afterward.

### 1. Focus State Visibility (Tab-Through)

Tabs through all focusable elements and verifies `:focus-visible` styles. Requires Playwright `browser_press_key` to simulate Tab presses.

**Procedure:**
1. Run the pre-measurement script below via `browser_evaluate` to catalog all focusable elements
2. Use Playwright `browser_press_key` to press Tab N times (where N = number of focusable elements)
3. After each Tab press, run the focus-check script via `browser_evaluate` to capture the active element's focus styling

**Pre-measurement: Catalog focusable elements**

```javascript
(() => {
  const focusable = document.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [role="button"], [role="tab"], [role="menuitem"], [role="link"]'
  );
  const elements = [];
  focusable.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    if (rect.top >= window.innerHeight * 3 || rect.bottom <= 0) return;
    elements.push({
      tag: el.tagName,
      text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40),
      tabindex: el.getAttribute('tabindex'),
      role: el.getAttribute('role')
    });
  });
  return { check: 'focus_state_catalog', focusableCount: elements.length, elements: elements.slice(0, 50) };
})()
```

**Per-Tab-press: Check active element focus styling**

Run this after each Tab keypress:

```javascript
(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return { check: 'focus_style_check', skipped: true };

  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);

  // Check for visible focus indicators
  const outline = style.outlineStyle;
  const outlineWidth = parseFloat(style.outlineWidth) || 0;
  const outlineColor = style.outlineColor;
  const boxShadow = style.boxShadow;
  const borderColor = style.borderColor;

  const hasOutline = outline !== 'none' && outlineWidth > 0;
  const hasBoxShadow = boxShadow !== 'none' && boxShadow !== '';
  const hasBorderChange = borderColor !== 'rgb(0, 0, 0)' && borderColor !== 'transparent';

  // Check outline is not transparent
  const outlineIsVisible = hasOutline && outlineColor !== 'transparent' && outlineColor !== 'rgba(0, 0, 0, 0)';

  const hasFocusIndicator = outlineIsVisible || hasBoxShadow || hasBorderChange;

  return {
    check: 'focus_style_check',
    element: {
      tag: el.tagName,
      text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40),
      id: el.id || null,
      class: (el.className || '').toString().slice(0, 40)
    },
    focusStyles: {
      outline: `${outline} ${outlineWidth}px ${outlineColor}`,
      boxShadow: boxShadow !== 'none' ? boxShadow.slice(0, 80) : 'none',
      borderColor
    },
    hasFocusIndicator,
    inViewport: rect.top >= 0 && rect.bottom <= window.innerHeight
  };
})()
```

**Scoring:** Count elements with `hasFocusIndicator: false`. PASS if all have indicators. MAJOR if >20% lack focus styles. CRITICAL if >50% lack focus styles.

**State reset:** Click the document body to defocus: `browser_click` on a neutral area.

### 2. Hover State Detection

Hovers over interactive elements and measures computed style changes. Requires Playwright `browser_hover`.

**Procedure:**
1. Run the catalog script below to find interactive elements and capture their default styles
2. For each element (up to 20, prioritizing buttons and links): use Playwright `browser_hover` on the element, then run the comparison script
3. After all hovers, hover a neutral area to reset

**Pre-measurement: Catalog interactive element default styles**

```javascript
(() => {
  const selectors = 'a[href], button:not([disabled]), [role="button"], input[type="submit"], [role="tab"], [role="menuitem"]';
  const elements = document.querySelectorAll(selectors);
  const catalog = [];

  elements.forEach((el, i) => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    if (rect.top >= window.innerHeight || rect.bottom <= 0) return;

    const style = getComputedStyle(el);
    catalog.push({
      index: i,
      tag: el.tagName,
      text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40),
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2),
      defaultStyles: {
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderColor: style.borderColor,
        boxShadow: style.boxShadow !== 'none' ? style.boxShadow.slice(0, 60) : 'none',
        transform: style.transform,
        opacity: style.opacity,
        textDecoration: style.textDecoration
      }
    });
  });

  return { check: 'hover_state_catalog', interactiveCount: catalog.length, elements: catalog.slice(0, 30) };
})()
```

**Per-hover: Compare style after hover**

After using `browser_hover` at (x, y) coordinates from the catalog, run:

```javascript
(() => {
  const el = document.elementFromPoint(/* x */, /* y */);
  if (!el) return { check: 'hover_style_check', skipped: true };

  // Walk up to find the interactive ancestor
  let target = el;
  while (target && !target.matches('a[href], button, [role="button"], input[type="submit"], [role="tab"], [role="menuitem"]')) {
    target = target.parentElement;
  }
  if (!target) target = el;

  const style = getComputedStyle(target);
  return {
    check: 'hover_style_check',
    hoveredStyles: {
      backgroundColor: style.backgroundColor,
      color: style.color,
      borderColor: style.borderColor,
      boxShadow: style.boxShadow !== 'none' ? style.boxShadow.slice(0, 60) : 'none',
      transform: style.transform,
      opacity: style.opacity,
      textDecoration: style.textDecoration,
      cursor: style.cursor
    }
  };
})()
```

Compare `defaultStyles` from catalog with `hoveredStyles`. A perceivable hover change is any difference in: backgroundColor, color, borderColor, boxShadow, transform, opacity, or textDecoration.

**Scoring:** Count elements with no perceivable hover change. PASS if >80% have hover feedback. MINOR if 60-80%. MAJOR if <60%.

**State reset:** `browser_hover` on a neutral area (e.g., page header or body).

### 3. Form Validation Error Trigger

Submits empty required forms to trigger validation error states, then measures error message quality and positioning.

**Procedure:**
1. Run the pre-measurement script to find forms with required fields
2. For each form: use Playwright `browser_click` on the submit button without filling fields
3. Run the error measurement script to capture validation error state

**Pre-measurement: Find forms with required fields**

```javascript
(() => {
  const forms = document.querySelectorAll('form');
  const formData = [];

  forms.forEach((form, i) => {
    const rect = form.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const requiredFields = form.querySelectorAll('[required], [aria-required="true"]');
    if (requiredFields.length === 0) return;

    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
    if (!submitBtn) return;
    const btnRect = submitBtn.getBoundingClientRect();

    formData.push({
      index: i,
      action: form.action || 'none',
      requiredFieldCount: requiredFields.length,
      submitButton: {
        text: (submitBtn.textContent || submitBtn.value || '').trim().slice(0, 30),
        x: Math.round(btnRect.left + btnRect.width / 2),
        y: Math.round(btnRect.top + btnRect.height / 2)
      }
    });
  });

  return { check: 'form_validation_catalog', formsWithRequired: formData.length, forms: formData };
})()
```

**Post-submit: Measure validation error state**

Run after clicking the submit button:

```javascript
(() => {
  // Check for HTML5 validation popups (constraint validation)
  const invalidFields = document.querySelectorAll(':invalid:not(form)');

  // Check for custom error messages in DOM
  const errorEls = document.querySelectorAll(
    '[class*="error"], [class*="invalid"], [role="alert"], [aria-invalid="true"], ' +
    '[class*="err-msg"], [class*="field-error"], [class*="validation"]'
  );

  const errors = [];
  let inlineCount = 0;
  let topOfFormCount = 0;

  errorEls.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const text = (el.textContent || '').trim();
    if (!text || text.length < 2) return;

    // Determine position relative to nearest input
    const nearestInput = el.closest('label, [class*="field"], [class*="form-group"]')?.querySelector('input, select, textarea');
    let position = 'unknown';
    if (nearestInput) {
      const inputRect = nearestInput.getBoundingClientRect();
      const dist = Math.abs(rect.top - inputRect.bottom);
      position = dist < 40 ? 'inline' : 'distant';
      if (position === 'inline') inlineCount++;
    } else {
      topOfFormCount++;
    }

    errors.push({
      text: text.slice(0, 80),
      position,
      hasFieldReference: /email|password|name|phone|address|username/.test(text.toLowerCase()),
      hasFixGuidance: /must|should|at least|required|enter|provide|format|characters/.test(text.toLowerCase())
    });
  });

  const htmlValidationCount = invalidFields.length;
  const customErrorCount = errors.length;
  const totalErrors = Math.max(htmlValidationCount, customErrorCount);
  const grade = totalErrors === 0 ? 'good' :
    (inlineCount >= customErrorCount * 0.8 && errors.every(e => e.hasFieldReference)) ? 'good' :
    inlineCount > 0 ? 'warning' : 'bad';

  return {
    check: 'form_validation_errors',
    htmlValidationFields: htmlValidationCount,
    customErrors: customErrorCount,
    inlineCount,
    topOfFormCount,
    errors: errors.slice(0, 15),
    grade
  };
})()
```

**Scoring:** PASS if errors are inline, reference the field, and provide fix guidance. MINOR if errors exist but are generic. MAJOR if no error feedback at all. **Compound check:** Errors must be inline AND actionable to score as PASS.

**State reset:** Reload the page via `browser_navigate` to the same URL to clear form state.

### 4. Toast/Notification Behavior

Clicks action buttons (save, delete, submit) and monitors for toast/notification appearance, timing, and accessibility.

**Procedure:**
1. Run the pre-measurement script to find action buttons likely to trigger toasts
2. For each button (up to 5): click via Playwright `browser_click`, wait 500ms, then run the toast detection script
3. Note: Only click non-destructive buttons (save, update, close) to avoid side effects. Skip delete/remove buttons.

**Pre-measurement: Find action buttons**

```javascript
(() => {
  const buttons = document.querySelectorAll('button, [role="button"], input[type="submit"]');
  const actionButtons = [];
  const safeVerbs = /^(save|update|close|dismiss|apply|confirm|copy|share|export|download|refresh)/i;
  const unsafeVerbs = /^(delete|remove|destroy|drop|reset|clear|purge|revoke|ban)/i;

  buttons.forEach(btn => {
    const rect = btn.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    if (rect.top >= window.innerHeight || rect.bottom <= 0) return;
    const text = (btn.textContent || btn.value || btn.getAttribute('aria-label') || '').trim();
    if (!text || text.length < 2) return;

    const isSafe = safeVerbs.test(text);
    const isUnsafe = unsafeVerbs.test(text);
    if (isSafe && !isUnsafe) {
      actionButtons.push({
        text: text.slice(0, 40),
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
        tag: btn.tagName
      });
    }
  });

  return { check: 'toast_trigger_catalog', actionButtonCount: actionButtons.length, buttons: actionButtons.slice(0, 10) };
})()
```

**Post-click: Detect toast/notification**

Run 500ms after clicking an action button:

```javascript
(() => {
  // Detect toast/snackbar/notification elements that appeared
  const toastSelectors = [
    '[class*="toast"]', '[class*="Toaster"]', '[class*="snackbar"]',
    '[class*="notification"]', '[class*="alert-banner"]', '[role="status"]',
    '[role="alert"]', '[aria-live="polite"]', '[aria-live="assertive"]',
    '[class*="notistack"]', '[class*="Sonner"]'
  ];

  const toasts = document.querySelectorAll(toastSelectors.join(', '));
  const visibleToasts = [];

  toasts.forEach(toast => {
    const rect = toast.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const style = getComputedStyle(toast);
    if (style.opacity === '0' || style.visibility === 'hidden') return;

    const text = (toast.textContent || '').trim();
    if (!text) return;

    visibleToasts.push({
      text: text.slice(0, 80),
      position: rect.top < window.innerHeight / 2 ? 'top' : 'bottom',
      hasAriaLive: toast.getAttribute('aria-live') !== null,
      hasRole: toast.getAttribute('role') !== null,
      hasCloseButton: toast.querySelector('button, [class*="close"], [class*="dismiss"]') !== null,
      computedPosition: style.position,
      opacity: style.opacity
    });
  });

  const appeared = visibleToasts.length > 0;
  const accessible = visibleToasts.some(t => t.hasAriaLive || t.hasRole);
  const grade = !appeared ? 'warning' : (appeared && accessible) ? 'good' : 'bad';

  return {
    check: 'toast_notification_behavior',
    appeared,
    count: visibleToasts.length,
    accessible,
    toasts: visibleToasts,
    grade
  };
})()
```

**Scoring:** PASS if toast appears, has ARIA live region, and provides meaningful text. MINOR if toast appears but lacks accessibility attributes. MAJOR if no feedback appears after action. NEEDS MANUAL CHECK only if there are no action buttons to test.

**State reset:** Dismiss any visible toasts by clicking their close buttons, or reload the page.

---

## Automation Target

**Goal: Reduce NEEDS MANUAL CHECK from 15/105 to under 5/105.**

The 4 interaction-based scripts above convert these previously-manual checks to automated:

| Check | Category | Previous Tier | New Tier | Script |
|-------|----------|---------------|----------|--------|
| Hover state feedback | Cat 2 | `[H]` manual | `[H]` scripted | Hover State Detection (#2) |
| Focus state visibility | Cat 2 | `[D]` partial | `[D]` scripted | Focus State Visibility (#1) |
| Active/pressed state | Cat 2 | `[H]` manual | `[H]` scripted | Active/Pressed (#13 above) + Hover (#2) |
| Error state messages | Cat 2 | `[H]` manual | `[H]` scripted | Form Validation (#3) |
| Validation timing | Cat 7 | `[H]` manual | `[H]` scripted | Form Validation (#3) |
| Error message actionability | Cat 7 | `[H]` manual | `[H]` scripted | Error Actionability (#9 above) + Form Validation (#3) |
| Toast/notification duration | Cat 8 | `[H]` manual | `[H]` scripted | Toast/Notification (#4) |
| Action feedback | Cat 8 | `[H]` manual | `[H]` scripted | Toast/Notification (#4) |
| Success confirmation | Cat 8 | `[H]` manual | `[H]` scripted | Success Infrastructure (#15 above) + Toast (#4) |
| Optimistic updates | Cat 8 | `[J]` manual | `[J]` partially scripted | Toast (#4) timing comparison |
| Back navigation | Cat 6 | `[H]` manual | Remains `[H]` manual | Requires multi-page Playwright sequence |
| Pull-to-refresh | Cat 8 | `[H]` manual | Remains `[H]` manual | Mobile-only, gesture simulation |

**Remaining NEEDS MANUAL CHECK (target: <=5):**
- Optimistic updates (partial — timing heuristic helps but full verification needs visual diff)
- Back navigation fidelity (requires multi-page navigation sequence)
- Pull-to-refresh on scrollable lists (mobile gesture simulation)
- URL reflects state / deep-linkable (requires multi-step form fill + URL comparison)

---

## Scoring Framework

### Tiered Sub-Scores

Report separate scores for each measurement tier:

| Tier | Description | Confidence |
|------|-------------|-----------|
| Deterministic [D] | Programmatic, reproducible | High |
| Heuristic [H] | Programmatic with <5% error | Medium |
| LLM-Assisted [J] | Pre-filtered LLM judgment | Lower |

### Graduated Scoring

These checks use 0 / 0.5 / 1.0 instead of binary pass/fail:

| Check | 0 | 0.5 | 1.0 |
|-------|---|-----|-----|
| Touch target size | < 24px | 24-43px | >= 44px |
| Color contrast | < 2:1 | 2:1-4.4:1 | >= 4.5:1 |
| Scroll depth ratio | > 8x | 3-8x | <= 3x |
| Font sizes count | > 12 | 7-12 | <= 6 |
| Information density | > 700 words | 300-700 | 150-300 |
| Animation duration | > 1500ms | 600-1500ms | 100-600ms |
| Line length | > 100 or < 20 chars | 75-100 or 20-30 | 30-75 |

### Category Weighting

| Weight | Categories |
|--------|-----------|
| 2x | Accessibility (Cat 4) |
| 1.5x | Forms & Input (Cat 7) |
| 1x | All other categories |
| 0.5x | Visual Complexity & Consistency (Cat 10) |

### Critical Floor Rule

If ANY check tagged as CRITICAL-severity fails, the total weighted score is capped at 50%.

### Compound Conditions

These checks require ALL conditions to pass (prevents gaming):

1. **Autofill (Cat 7)**: `autocomplete` present AND valid HTML token (not "on"/"off"/empty)
2. **Touch target (Cat 4)**: bounding rect >= 44x44 AND visible content area >= 30x30
3. **Pagination (Cat 9)**: Pagination elements present AND > 1 navigable page link
4. **Form label (Cat 4)**: `<label>` associated AND visible (rect area > 0) AND positioned near field
5. **Hover state (Cat 2)**: Style changes on :hover AND perceivable change in color/bg/border/shadow/transform/opacity
6. **Skeleton screen (Cat 8)**: Class found AND visible dimensions AND CSS animation present
7. **Heading frequency (Cat 4)**: Headings every 200-300 words AND heading texts are not all identical

### Conflicting Checks

These pairs can conflict. Report as linked findings, not independent:

1. Whitespace ratio (Cat 10) vs scroll depth (Cat 9)
2. Touch target size (Cat 4) vs nav item count (Cat 6) on mobile
3. CTA count = 1 (Cat 6) vs empty state CTA (Cat 9)
4. Information density (Cat 4) vs heading frequency (Cat 4)
5. Font sizes <= 6 (Cat 10) vs responsive type scales

---

## Severity Grading Criteria

Each category receives a severity grade based on the number and impact of failed checks:

| Grade | Criteria |
|-------|----------|
| **PASS** | All checks in category pass |
| **MINOR** | 1-2 checks fail, low impact |
| **MAJOR** | 3+ checks fail, or any high-impact check fails |
| **CRITICAL** | Fundamental usability broken (e.g., no pagination on 100+ items, >10x scroll depth, zero accessibility, no error recovery) |

### High-Impact Checks (trigger MAJOR on single failure)

- Color contrast below WCAG AA (Category 4)
- No form labels (Category 4)
- No loading indicators on async operations (Category 8)
- No pagination on 50+ items (Category 9)
- Scroll depth >5x viewport with no sticky navigation (Category 9)
- >10 distinct font sizes (Category 10)

---

## Scorecard Rules

### Scoring

- **`[D]` checks**: Pass (1) or Fail (0), with graduated scoring for the 7 checks listed above
- **`[H]` checks**: Pass (1) or Fail (0)
- **`[J]` checks**: Pass (1) or Fail (0), noted as LLM-assessed
- **warning** threshold = Pass (1) but noted as MINOR finding
- **bad** threshold = Fail (0)

### Per-Category Check Counts

| Category | Checks |
|----------|--------|
| 1. Visual Consistency | 7 |
| 2. Component States | 8 |
| 3. Copy & Microcopy | 7 |
| 4. Accessibility | 19 |
| 5. Layout & Responsiveness | 6 |
| 6. Navigation & Wayfinding | 11 |
| 7. Forms & Input | 13 |
| 8. Feedback & Response | 12 |
| 9. Data Display & Scalability | 10 |
| 10. Visual Complexity & Consistency | 12 |
| **Total** | **105** |

> **Note:** Not all checks apply to every screen. The denominator adjusts to only count applicable checks. The target total of ~75 reflects a typical screen; screens with no forms, for example, would exclude Category 7 enhanced checks.

### Output Template

```
## UX Audit Results

### Scorecard: X/Y Weighted (Z%)

| Tier | Pass/Total | Confidence |
|------|------------|-----------|
| Deterministic [D] | 30/33 | High |
| Heuristic [H] | 18/22 | Medium |
| LLM-Assisted [J] | 8/10 | Lower |
| **Weighted Total** | **X/Y** | |

### [Screen Name] — [URL]

| Category | Weight | Grade | Pass/Total | Findings |
|----------|--------|-------|------------|----------|
| Visual Consistency | 1x | MINOR | 6/7 | 1 finding |
| Component States | 1x | PASS | 8/8 | -- |
| Copy & Microcopy | 1x | PASS | 7/7 | -- |
| Accessibility | 2x | MINOR | 11/13 | 2 findings |
| Layout & Responsiveness | 1x | PASS | 6/6 | -- |
| Navigation & Wayfinding | 1x | MAJOR | 7/11 | 4 findings |
| Forms & Input | 1.5x | MINOR | 11/13 | 2 findings |
| Feedback & Response | 1x | PASS | 12/12 | -- |
| Data Display & Scalability | 1x | CRITICAL | 3/10 | 7 findings |
| Visual Complexity & Consistency | 0.5x | MINOR | 10/12 | 2 findings |

### Findings Detail
1. [CRITICAL] `[D]` **Unpaginated list with 87 items on /admin** — ...
2. [MAJOR] `[D]` **Nav has 12 top-level items** — ...
3. [MINOR] `[H]` **Alignment has 9 clusters** — ...
```
