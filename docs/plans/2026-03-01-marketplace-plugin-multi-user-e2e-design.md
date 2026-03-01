# Design: Marketplace Plugin Upgrade + Multi-User E2E Testing

**Date:** 2026-03-01
**Status:** Approved

## Goals

1. Upgrade the repo from a loose skills collection to a proper Claude Code marketplace plugin
2. Add multi-user end-to-end test flow generation and execution using Playwright
3. Add a shared Playwright executor skill for running generated specs
4. Remove the mobile-browser-workflow-orchestrator (users invoke skills individually)
5. Standardize all platforms on a consistent 4-stage pipeline

## 4-Stage Pipeline (All Platforms)

```
Stage 1: Generate Workflows    → workflows/<platform>-workflows.md
Stage 2: Execute Interactively → screenshots, issue reports
Stage 3: Translate to Playwright → e2e/<platform>-workflows.spec.ts
Stage 4: Run Playwright Tests   → test results, reports (shared executor)
```

## Final Skill List (14 Skills)

### Browser Platform (3 — existing, unchanged)

| Skill | Stage | Description |
|-------|-------|-------------|
| `browser-workflow-generator` | 1 | Explore codebase, generate browser workflow docs |
| `browser-workflow-executor` | 2 | Execute workflows interactively via Chrome MCP |
| `browser-workflow-to-playwright` | 3 | Translate workflows to Playwright specs |

### iOS Platform (3 — existing, unchanged)

| Skill | Stage | Description |
|-------|-------|-------------|
| `ios-workflow-generator` | 1 | Explore codebase, generate iOS workflow docs |
| `ios-workflow-executor` | 2 | Execute workflows on iOS Simulator via iOS Sim MCP |
| `ios-workflow-to-playwright` | 3 | Translate workflows to Playwright WebKit specs |

### Mobile Browser Platform (3 — existing, unchanged)

| Skill | Stage | Description |
|-------|-------|-------------|
| `mobile-browser-workflow-generator` | 1 | Explore codebase, generate mobile workflow docs |
| `mobile-browser-workflow-executor` | 2 | Execute via Playwright MCP with mobile viewport |
| `mobile-browser-workflow-to-playwright` | 3 | Translate to Playwright Chromium mobile specs |

### Multi-User Platform (3 — NEW)

| Skill | Stage | Description |
|-------|-------|-------------|
| `multi-user-workflow-generator` | 1 | Discover multi-user flows, write workflow docs |
| `multi-user-workflow-executor` | 2 | Execute interactively with Chrome MCP (User A) + Playwright MCP (User B) |
| `multi-user-workflow-to-playwright` | 3 | Translate to Playwright specs with multiple browser contexts |

### Shared (2 — 1 existing, 1 NEW)

| Skill | Description |
|-------|-------------|
| `mobile-ux-ci` | iOS/mobile anti-pattern CI checks (existing) |
| `playwright-executor` | Run e2e/*.spec.ts files, report results, optionally fix failures (NEW) |

### Removed

| Skill | Reason |
|-------|--------|
| `mobile-browser-workflow-orchestrator` | Users invoke individual skills; orchestrator adds complexity without value |

## Plugin Manifest Changes

### `.claude-plugin/plugin.json` (updated)

```json
{
  "name": "qa-skills",
  "version": "1.0.0",
  "description": "QA testing pipeline — generate workflows, execute interactively, translate to Playwright, run E2E tests. Supports browser, iOS, mobile, and multi-user flows.",
  "author": {
    "name": "Jeremy Watt",
    "url": "https://github.com/neonwatty"
  },
  "license": "MIT",
  "keywords": ["qa", "testing", "playwright", "e2e", "ios", "mobile", "multi-user", "browser-automation"],
  "skills": "./skills",
  "repository": "https://github.com/neonwatty/claude-qa-skills"
}
```

### `.claude-plugin/marketplace.json` (updated)

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "neonwatty-qa",
  "description": "Claude Code QA plugins by Jeremy Watt",
  "owner": { "name": "Jeremy Watt", "github": "neonwatty" },
  "plugins": [
    {
      "name": "qa-skills",
      "source": { "source": "github", "repo": "neonwatty/claude-qa-skills" },
      "description": "QA testing pipeline — generate workflows, execute interactively, translate to Playwright, run E2E tests.",
      "version": "1.0.0",
      "category": "testing",
      "tags": ["qa", "playwright", "e2e", "ios", "mobile", "multi-user"]
    }
  ]
}
```

### Installation

```bash
claude plugin marketplace add neonwatty/claude-qa-skills
claude plugin install qa-skills@neonwatty-qa
```

## New Skill Designs

### multi-user-workflow-generator (Stage 1: Discover)

**Purpose:** Explore a codebase to discover all multi-user interaction flows and generate `workflows/multi-user-workflows.md`.

**Frontmatter:**

```yaml
name: multi-user-workflow-generator
description: Generates multi-user workflow files for testing apps with concurrent users. Use when the user says "generate multi-user workflows", "create multi-user workflows", or "discover multi-user flows".
```

**Process:**

1. **Phase 1: Assess Current State** — check for existing `workflows/multi-user-workflows.md` and `e2e/multi-user*.spec.ts` files
2. **Phase 2: Parallel Exploration** — spawn 3 agents:
   - **Agent 1: Auth & Roles** — discover auth patterns, user roles, session management, RLS policies, middleware
   - **Agent 2: Real-Time & Shared State** — find Supabase Realtime subscriptions, WebSocket channels, shared database tables, optimistic updates, conflict resolution
   - **Agent 3: Cross-User Interactions** — find friend systems, invite flows, notifications, blocking, content sharing, permission models
3. **Phase 3: Synthesize** — merge agent findings into distinct multi-user workflows
4. **Phase 4: Generate Workflow Document** — write numbered workflows with:
   - User personas (e.g., "User A (Host)", "User B (Guest)")
   - Numbered steps showing which user takes each action
   - Expected outcomes visible to each user
   - Assertions for real-time sync verification
5. **Phase 5: User Approval** — present workflows for review
6. **Phase 6: Write** — save to `workflows/multi-user-workflows.md`

**Output format:**

```markdown
## Workflow 1: Party Create and Join

### Personas
- User A: Party Host (authenticated)
- User B: Party Guest (authenticated)

### Steps
1. [User A] Navigate to /create
2. [User A] Click "Create Party" → lands in party room, sees code
3. [User A] Verify: member count shows "1 watching"
4. [User B] Navigate to /join
5. [User B] Enter party code, click "Join Party"
6. [User B] Verify: lands in party room
7. [User A] Verify: member count updates to "2 watching" (real-time)
8. [User B] Verify: member count shows "2 watching"
```

### multi-user-workflow-executor (Stage 2: Interactive Execution)

**Purpose:** Execute multi-user workflows interactively using Chrome MCP (User A) + Playwright MCP (User B), capture screenshots from both user perspectives, and report issues.

**Frontmatter:**

```yaml
name: multi-user-workflow-executor
description: Executes multi-user workflows interactively using dual browser engines. Use when the user says "run multi-user workflows", "execute multi-user workflows", or "test multi-user workflows".
allowed-tools: Read, Write, Bash, Glob, Grep, mcp__claude-in-chrome__*, mcp__plugin_playwright_playwright__*
```

**Dual-Tool Architecture:**

| Capability | Chrome MCP (User A) | Playwright MCP (User B) |
|---|---|---|
| Role | Primary/authenticated user | Secondary user |
| Session | User's existing Chrome session | Separate Playwright browser |
| Auth | Uses existing cookies/session | Sets up auth via API or cookie injection |
| Screenshots | `computer` action screenshot | `browser_snapshot` or screenshot tools |

**Process:**

1. **Phase 1: Read Workflows** — parse `workflows/multi-user-workflows.md`
2. **Phase 2: Setup** — create Chrome MCP tab (User A), launch Playwright MCP browser (User B), set up auth for both
3. **Phase 3: Execute** — for each workflow:
   - Walk through steps sequentially
   - Steps marked `[User A]` → execute via Chrome MCP
   - Steps marked `[User B]` → execute via Playwright MCP
   - Capture BEFORE screenshots at each step from the acting user's perspective
   - Verify cross-user assertions (e.g., after User B joins, check User A's screen updates)
4. **Phase 4: Audit Report** — compile issues found, screenshots, sync timing data
5. **Phase 5: Fix Mode** (user-triggered) — spawn agents to fix issues, capture AFTER screenshots

**Execution Modes:**
- **Audit Mode** (default): find issues, capture evidence, no code changes
- **Fix Mode** (user says "fix"): spawn fix agents, verify fixes, capture AFTER screenshots

### multi-user-workflow-to-playwright (Stage 3: Translate)

**Purpose:** Translate `workflows/multi-user-workflows.md` into Playwright spec files using multiple browser contexts to simulate concurrent users.

**Frontmatter:**

```yaml
name: multi-user-workflow-to-playwright
description: Translates multi-user workflow markdown into Playwright E2E tests with multiple browser contexts. Use when the user says "convert multi-user workflows to playwright" or "translate multi-user workflows to CI".
```

**Process:**

1. **Phase 1: Parse Workflows** — extract personas and steps from `workflows/multi-user-workflows.md`
2. **Phase 2: Discover Selectors** — spawn Explore agent to find `data-testid`, aria labels, role-based selectors for all referenced UI elements
3. **Phase 3: Map Personas to Contexts** — each persona becomes a `browser.newContext()` + `context.newPage()` with its own auth setup
4. **Phase 4: Generate Specs** — produce `e2e/multi-user-workflows.spec.ts` with:
   - `test.describe` per workflow
   - `beforeEach` creating browser contexts per persona
   - Steps switching between pages (pageA, pageB)
   - Real-time sync assertions with extended timeouts (10s)
   - API helper functions for fast precondition setup
5. **Phase 5: Handle Ambiguity** — present ambiguous selectors to user for resolution (BLOCKING tasks)
6. **Phase 6: User Approval** — present generated tests
7. **Phase 7: Write** — save to `e2e/multi-user-workflows.spec.ts`

**Generated test pattern:**

```typescript
import { test, expect, BrowserContext, Page } from '@playwright/test'

test.describe('Multi-User: Party Create and Join', () => {
  let contextA: BrowserContext
  let contextB: BrowserContext
  let pageA: Page
  let pageB: Page

  test.beforeEach(async ({ browser }) => {
    contextA = await browser.newContext()
    contextB = await browser.newContext()
    pageA = await contextA.newPage()
    pageB = await contextB.newPage()
    // Auth setup per user (cookies, localStorage, API calls)
  })

  test.afterEach(async () => {
    await contextA.close()
    await contextB.close()
  })

  test('host creates party, guest joins, both see member count', async () => {
    await pageA.goto('/create')
    await pageA.getByRole('button', { name: 'Create Party' }).click()
    await expect(pageA.getByTestId('party-code')).toBeVisible()
    const partyCode = await pageA.getByTestId('party-code').textContent()

    await expect(pageA.getByText('1 watching')).toBeVisible()

    await pageB.goto(`/join/${partyCode}`)
    await pageB.getByRole('button', { name: 'Join Party' }).click()

    // Real-time sync: both users see updated count
    await expect(pageA.getByText('2 watching')).toBeVisible({ timeout: 10000 })
    await expect(pageB.getByText('2 watching')).toBeVisible()
  })
})
```

**Key design decisions:**
- API helpers for precondition setup (fast, reliable) vs browser interaction for the flow under test
- Real-time assertions use 10s timeouts for Supabase Realtime / WebSocket propagation
- Each persona gets isolated browser context (cookies, storage)
- Tests work with both mock mode and real backend
- `test.skip` for flows requiring real services (email, push notifications)

### playwright-executor (Stage 4: Run — Shared)

**Purpose:** Run Playwright spec files, parse results, report pass/fail, optionally investigate and fix failures.

**Frontmatter:**

```yaml
name: playwright-executor
description: Runs Playwright E2E tests, reports results, and optionally fixes failures. Use when the user says "run playwright tests", "execute e2e tests", or "run e2e".
argument-hint: "[spec-pattern] [--fix]"
```

**Process:**

1. **Phase 1: Discover** — glob `e2e/*.spec.ts`, read `playwright.config.ts`
2. **Phase 2: Configure** — determine scope from `$ARGUMENTS`:
   - No args: run all specs
   - `multi-user`: run `e2e/multi-user*.spec.ts`
   - `browser`: run `e2e/browser*.spec.ts`
   - `--fix`: enable auto-fix mode
3. **Phase 3: Execute** — `npx playwright test` with `--reporter=html,json`
4. **Phase 4: Parse Results** — read JSON output, extract pass/fail/skip counts, failure details, screenshots
5. **Phase 5: Report** — display summary table
6. **Phase 6: Fix Mode** (if `--fix` or user requests):
   - Read failing test source + app code
   - Spawn fix agents per failure
   - Re-run to verify fixes

**Invocation:**

```
/qa-skills:playwright-executor                    # run all
/qa-skills:playwright-executor multi-user         # multi-user specs only
/qa-skills:playwright-executor --fix              # run and auto-fix
```

## Files Changed

### Modified (existing)
- `.claude-plugin/plugin.json` — updated name, description, author, keywords, skills path
- `.claude-plugin/marketplace.json` — updated to match job-apply-plugin pattern with proper source, owner, schema
- `README.md` — rewritten with install instructions, skill matrix, pipeline diagram

### Added (new)
- `skills/multi-user-workflow-generator/SKILL.md`
- `skills/multi-user-workflow-executor/SKILL.md`
- `skills/multi-user-workflow-to-playwright/SKILL.md`
- `skills/playwright-executor/SKILL.md`
- `LICENSE` — MIT license
- `docs/plans/2026-03-01-marketplace-plugin-multi-user-e2e-design.md` — this document

### Removed
- `skills/mobile-browser-workflow-orchestrator/SKILL.md` — users invoke skills individually

### Unchanged (11 existing skills)
All existing SKILL.md files remain as-is. No content changes to existing skills.

## Reference Repositories

- **Plugin pattern:** [neonwatty/codebase-sweeps](https://github.com/neonwatty/codebase-sweeps) and [neonwatty/job-apply-plugin](https://github.com/neonwatty/job-apply-plugin)
- **Playwright MCP usage:** [neonwatty/job-apply-plugin](https://github.com/neonwatty/job-apply-plugin) — dual-tool architecture (Chrome MCP + Playwright MCP)
- **Multi-user test patterns:** [neonwatty/linkparty](https://github.com/neonwatty/linkparty) — `e2e/multi-user.spec.ts` and `e2e/multi-user-realtime.spec.ts` with multiple browser contexts
- **Multi-user workflow examples:** [neonwatty/linkparty](https://github.com/neonwatty/linkparty) — `workflows/multi-user-workflows.md` with 10 multi-user scenarios
