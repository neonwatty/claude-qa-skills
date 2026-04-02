---
name: performance-profiler
description: Profiles and optimizes Next.js App Router performance by measuring real Web Vitals via authenticated Playwright sessions, analyzing build output, and fixing code anti-patterns. Use this when the user says "performance audit", "profile performance", "optimize bundle size", "speed up the app", "reduce page load", "check web vitals", "performance profiler", or "find performance issues". Visits authenticated routes at desktop and mobile viewports, measures LCP/CLS/INP/TTFB via PerformanceObserver, analyzes bundle sizes from next build, audits code for anti-patterns across 7 categories, fixes HIGH/MEDIUM findings, and creates a PR with before/after metrics.
---

# Performance Profiler Skill

You are a senior performance engineer profiling and optimizing a **Next.js App Router application**. Your job is to measure real performance on live pages (including auth-gated routes), identify anti-patterns in the codebase, fix them, and prove the improvement with before/after metrics.

This skill combines:

- **Runtime profiling** — Playwright MCP visits pages with auth, measures Core Web Vitals via `browser_evaluate`
- **Build analysis** — `next build` output parsed for per-route bundle sizes
- **Static code analysis** — 73 checks across 7 categories for Next.js performance anti-patterns
- **Code fixes** — HIGH and MEDIUM findings are fixed, then re-measured

## Task List Integration

**CRITICAL:** Use TaskCreate, TaskUpdate, and TaskList tools throughout execution.

| Task                           | Purpose                                                           |
| ------------------------------ | ----------------------------------------------------------------- |
| Main task                      | `Performance Profiler` — tracks overall progress                  |
| Explore: Routes & Dependencies | Agent: discover all routes, auth requirements, heavy dependencies |
| Explore: SDK & Config          | Agent: PostHog/Sentry/Supabase patterns, next.config              |
| Build: Baseline Metrics        | Run `next build`, parse bundle sizes                              |
| Profile: Runtime Metrics       | Playwright profiling of routes at desktop + mobile viewports      |
| Audit: Static Analysis         | Code analysis across 1-2 performance categories                   |
| Fix: Apply Changes             | Fix HIGH/MEDIUM findings                                          |
| Build: Post-fix Metrics        | Re-measure after fixes                                            |
| Validate: Quality Checks       | Lint, typecheck, tests                                            |
| Ship: Create PR                | Commit, push, PR with metrics delta                               |

### Session Recovery

At skill start, call TaskList. If a `Performance Profiler` task exists in_progress, check sub-task states and resume from the appropriate phase.

## Process

### Phase 1: Setup

Create main task and mark in_progress.

1. Verify this is a Next.js project (check for `next.config.*`, `package.json` with `next` dependency)
2. If not Next.js, inform the user this skill is Next.js-specific and exit
3. Ask the user:
   - **Full audit** (all 7 categories over multiple runs) / **Focused audit** (specific categories) / **Quick scan** (build + runtime only, no code analysis)
   - **Which routes to profile** — "All discovered routes" (default) / "Specific routes" (user provides list)
4. Check for existing `docs/plans/performance-audit-tracking.md` — if it exists, read it for prior iteration context
5. Checkout main and create an iteration branch:
   ```bash
   git checkout main && git pull origin main
   git checkout -b performance-audit/iteration-<N>
   ```

### Phase 2: Explore Application [DELEGATE TO AGENTS]

Create two exploration tasks, then spawn two Explore agents in parallel.

| Agent                 | Focus                                                                                                                                                                                          | Key Outputs                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Routes & Dependencies | All routes (App Router file-based), auth-gated vs public routes, `middleware.ts` auth checks, heavy dependencies in `package.json`, barrel file exports (`index.ts`), dynamic vs static routes | Route map with auth requirements, dependency weight map |
| SDK & Config          | PostHog/Sentry/Supabase SDK usage patterns, `next.config.ts` settings, `"use client"` directive locations, image handling patterns, caching configuration, third-party script loading          | SDK integration map, config optimization opportunities  |

After both agents return, synthesize into an **Application Performance Map**:

- Route list with auth requirements (public vs auth-gated)
- Heavy dependency list with approximate sizes
- SDK integration points
- Current next.config optimization state

### Phase 3: Build Baseline [BUILD MEASUREMENT]

Create Build task and mark in_progress.

1. Find the correct build command (check `package.json` scripts, `Makefile`, `CLAUDE.md`):

   ```bash
   npm run build 2>&1 | tee /tmp/perf-audit-build-output.txt
   # or: pnpm build, make build, npx next build
   ```

2. Parse with the companion script:

   ```bash
   bash scripts/performance/parse-build-output.sh \
     --input /tmp/perf-audit-build-output.txt \
     --output /tmp/perf-audit-metrics.json
   ```

3. Review the stderr summary. Save baseline:

   ```bash
   cp /tmp/perf-audit-metrics.json docs/plans/performance-baseline.json
   ```

4. **Floor check:** If total JS is already under 500KB, note this — the app is already well-optimized. Continue profiling but adjust expectations for improvement.

5. Record baseline in tracking file (create if missing):

   ```bash
   bash scripts/performance/parse-build-output.sh \
     --input /tmp/perf-audit-build-output.txt \
     --format markdown
   ```

   Copy the markdown output into `docs/plans/performance-audit-tracking.md`.

### Phase 4: Runtime Profiling [PLAYWRIGHT MCP]

Create Profile task and mark in_progress.

This is the key differentiator — visit actual pages (including auth-gated routes) and measure real Web Vitals.

#### Step 1: Authentication Setup

Check for `.playwright/profiles.json`:

- **If profiles exist:** Select the appropriate profile (auto if only 1, ask if multiple). Load it:
  1. Read `.playwright/profiles/<role>.json`
  2. Use `browser_run_code` to restore cookies via `addCookies()`, localStorage via `page.evaluate()`, and sessionStorage
  3. Navigate to the app's base URL
  4. Verify session is valid (check for login redirect, OAuth domain redirect, or login UI in snapshot)
- **If profiles don't exist:** Ask user how to authenticate. Options: set up profiles now (`/setup-profiles`), provide credentials, or skip auth-gated routes.

#### Step 2: Profile Routes

Using the route map from Phase 2, profile each route. Follow the measurement patterns in `references/web-vitals-measurement.md`.

**For each route:**

1. `browser_navigate` to the route URL
2. `browser_wait_for` expected content (use route-specific text from explore results)
3. Wait 2 seconds for settle (lazy loading, layout shifts)
4. Collect metrics via `browser_evaluate`:
   - **Navigation Timing** — TTFB, DOM content loaded, full load, transfer size
   - **LCP** — Largest Contentful Paint time + element identity
   - **CLS** — Cumulative Layout Shift score + individual shift entries
   - **Resource Loading** — Heavy resources (>50KB), total JS/CSS/image breakdown
5. `browser_take_screenshot` for visual record

**Profile at both viewports:**

Desktop first (default viewport), then mobile:

```
browser_resize width=393 height=852
```

Re-profile the top 5 highest-traffic routes at mobile viewport.

#### Step 3: Compile Runtime Report

Build a per-route metrics table:

```markdown
| Route      | TTFB  | LCP  | CLS  | Total JS | Rating     |
| ---------- | ----- | ---- | ---- | -------- | ---------- |
| /          | 120ms | 1.8s | 0.02 | 245 KB   | Good       |
| /dashboard | 340ms | 3.2s | 0.18 | 412 KB   | Needs Work |
```

Rate each metric using the thresholds from `references/web-vitals-measurement.md`.

Flag routes with:

- LCP > 2500ms → HIGH finding
- CLS > 0.1 → HIGH finding
- TTFB > 800ms → MEDIUM finding
- Total JS > 300KB → MEDIUM finding

### Phase 5: Static Analysis [CODE AUDIT]

Create Audit task and mark in_progress.

Pick 1-2 unaudited categories from the list below. For each, follow the detailed checks in `references/performance-checks.md`.

#### Category List

| #   | Category                          | Web Vitals     | Key Focus                                                               |
| --- | --------------------------------- | -------------- | ----------------------------------------------------------------------- |
| 1   | **Bundle & Code Splitting**       | LCP, TTFB      | Full-library imports, dynamic imports, next.config tuning, barrel files |
| 2   | **Rendering & Hydration**         | LCP, CLS, INP  | `"use client"` boundaries, re-renders, memoization                      |
| 3   | **API Routes & Data Fetching**    | TTFB, LCP      | Sequential fetches, waterfalls, N+1, over-fetching                      |
| 4   | **Images & Assets**               | LCP, CLS       | next/image, dimensions, priority, formats                               |
| 5   | **Third-party SDKs**              | LCP, TTFB, INP | PostHog, Sentry, Supabase patterns + query analysis                     |
| 6   | **Caching & Revalidation**        | TTFB, LCP      | Fetch cache, ISR/SSG, revalidation patterns                             |
| 7   | **Server Components & Streaming** | TTFB, LCP, CLS | Server/client boundaries, Suspense, streaming                           |

#### How to Audit Each Category

1. Read the detailed checks in `references/performance-checks.md`
2. Identify all relevant files — scan project structure exhaustively
3. Read every relevant file — don't sample
4. Check each item against the codebase
5. Classify findings:
   - **HIGH** — Measurable performance impact now (large bundle bloat, blocking fetches, missing lazy loading)
   - **MEDIUM** — Moderate impact or scale risk (anti-patterns that work now but degrade at scale)
   - **LOW** — Minor optimization opportunity
6. Tag each finding with impacted Web Vital(s)

### Phase 6: Consolidate & Fix

Create Fix task and mark in_progress.

1. Merge findings from runtime profiling (Phase 4) and static analysis (Phase 5)
2. Deduplicate — runtime metrics and code analysis may surface the same issue
3. Prioritize by severity: HIGH first, then MEDIUM
4. Fix all HIGH and MEDIUM findings (cap at ~12 files)
5. For each fix, note the expected impact (e.g., "removed full lodash import, expected -72KB")
6. **Never introduce regressions** — verify functionality still works after dependency or import changes
7. LOW items are deferred — log in tracking file

### Phase 7: Re-measure

Create post-fix Build task and mark in_progress.

1. Run `next build` again and parse:

   ```bash
   npm run build 2>&1 | tee /tmp/perf-audit-build-post.txt
   bash scripts/performance/parse-build-output.sh \
     --input /tmp/perf-audit-build-post.txt \
     --output /tmp/perf-audit-metrics-post.json
   ```

2. Compare against baseline:

   ```bash
   bash scripts/performance/compare-metrics.sh \
     --baseline docs/plans/performance-baseline.json \
     --current /tmp/perf-audit-metrics-post.json \
     --format markdown
   ```

3. **Optional: Re-profile key routes** via Playwright to measure LCP/CLS improvement on the routes that had the worst ratings. This confirms runtime improvement, not just bundle reduction.

### Phase 8: Validate

Follow project quality checks. Check `CLAUDE.md`, `package.json` scripts, or `Makefile` for the correct commands:

```bash
npm run lint:fix 2>/dev/null || true
npm run typecheck 2>/dev/null || true
npm run test 2>/dev/null || true
```

Performance fixes are particularly likely to:

- Break imports (dynamic imports change module loading)
- Change component rendering behavior (moving to Server Components)
- Affect E2E tests (lazy-loaded content may not be immediately visible)

Fix issues and re-run (max 3 attempts). After validation, clean up:

```bash
rm -rf coverage .nyc_output 2>/dev/null || true
pkill -f "vitest|jest" 2>/dev/null || true
```

### Phase 9: Update Tracking

Append a new entry to `docs/plans/performance-audit-tracking.md`:

```markdown
### Iteration N (YYYY-MM-DD)

**Categories Audited:** [list]
**Findings:** X (Y HIGH, Z MEDIUM, W LOW)
**Fixed:** A
**Deferred:** B

#### Build Metrics (Pre-fix → Post-fix)

| Route      | Before (KB) | After (KB) | Delta |
| ---------- | ----------- | ---------- | ----- |
| /          | XX          | XX         | -X KB |
| /dashboard | XX          | XX         | -X KB |

**Total JS:** XXX KB → XXX KB (**-XX KB, -X.X%**)

#### Runtime Metrics (Key Routes)

| Route      | TTFB | LCP  | CLS  | Rating               |
| ---------- | ---- | ---- | ---- | -------------------- |
| /          | XXms | X.Xs | X.XX | Good/Needs Work/Poor |
| /dashboard | XXms | X.Xs | X.XX | Good/Needs Work/Poor |

#### Fixed

- [x] Description (category: X, severity: HIGH/MEDIUM, vitals: LCP/TTFB, impact: -XXkB)

#### Deferred

- [ ] Description (category: X, severity: LOW, reason)

#### Categories Remaining

- [list of unaudited categories]
```

### Phase 10: Ship

**If fixes were applied:**

1. Stage specific changed files (NEVER use `git add -A` or `git add .`):
   ```bash
   git add <list of specific files>
   ```
2. Commit:
   ```bash
   git commit -m "perf: optimize <brief summary> from performance profiler iteration N"
   ```
3. Push:
   ```bash
   git push -u origin performance-audit/iteration-<N>
   ```
4. Create PR with metrics delta in the body:
   ```bash
   gh pr create --title "Performance Profiler: Iteration N" \
     --body "<include build metrics comparison table and runtime metrics>. See docs/plans/performance-audit-tracking.md for details."
   ```

**If NO fixes applied** (app is already optimized or only LOW findings): skip PR creation, just update tracking file.

### Phase 11: Report Summary

Present the user with a final summary:

```markdown
## Performance Profiler — Iteration N Complete

### Build Impact

- Total JS: XXX KB → XXX KB (-X.X%)
- Largest route: /dashboard (XX KB → XX KB)

### Runtime Impact (Key Routes)

- Best improvement: /dashboard LCP 3.2s → 1.8s
- Remaining issues: /settings CLS 0.18 (MEDIUM)

### Categories Covered: [X/7]

### Next Steps

- [list remaining categories]
- [list deferred LOW items]

### PR: #NNN (if created)
```

Mark main task as completed.
