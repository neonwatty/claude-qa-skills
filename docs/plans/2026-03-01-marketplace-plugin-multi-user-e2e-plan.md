# Marketplace Plugin Upgrade + Multi-User E2E Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade claude-qa-skills to a proper marketplace plugin with 4 new skills (3 multi-user + 1 shared Playwright executor), remove the orchestrator, and update all metadata.

**Architecture:** Pure-markdown plugin. All skills are SKILL.md files with YAML frontmatter. Plugin discovery uses `.claude-plugin/plugin.json` + `marketplace.json`. No executable code. New skills follow the same structural patterns as existing skills (Task List Integration, Session Recovery, multi-phase process, agent delegation).

**Tech Stack:** Claude Code plugin system, Playwright (test generation target), Chrome MCP + Playwright MCP (dual-tool architecture for multi-user executor)

---

## Task 1: Update plugin.json

**Files:**
- Modify: `.claude-plugin/plugin.json` (all 9 lines)

**Step 1: Replace plugin.json contents**

Replace the entire file with:

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

**Step 2: Validate JSON syntax**

Run: `python3 -m json.tool .claude-plugin/plugin.json > /dev/null && echo "Valid"`
Expected: "Valid"

**Step 3: Commit**

```bash
git add .claude-plugin/plugin.json
git commit -m "chore: update plugin.json with proper marketplace fields"
```

---

## Task 2: Update marketplace.json

**Files:**
- Modify: `.claude-plugin/marketplace.json` (all 14 lines)

**Step 1: Replace marketplace.json contents**

Replace the entire file with:

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

**Step 2: Validate JSON syntax**

Run: `python3 -m json.tool .claude-plugin/marketplace.json > /dev/null && echo "Valid"`
Expected: "Valid"

**Step 3: Commit**

```bash
git add .claude-plugin/marketplace.json
git commit -m "chore: update marketplace.json with proper source, owner, and schema"
```

---

## Task 3: Add LICENSE file

**Files:**
- Create: `LICENSE`

**Step 1: Create MIT license file**

Write a standard MIT license with:
- Year: 2025
- Name: Jeremy Watt

**Step 2: Commit**

```bash
git add LICENSE
git commit -m "chore: add MIT license file"
```

---

## Task 4: Remove mobile-browser-workflow-orchestrator

**Files:**
- Delete: `skills/mobile-browser-workflow-orchestrator/SKILL.md`
- Delete: `skills/mobile-browser-workflow-orchestrator/` (directory)

**Step 1: Remove the orchestrator skill directory**

Run: `rm -rf skills/mobile-browser-workflow-orchestrator`

**Step 2: Validate remaining skills still pass**

Run: `./scripts/validate-skills.sh`
Expected: "All skill files are valid" (should list 10 skills, not 11)

**Step 3: Commit**

```bash
git add -A skills/mobile-browser-workflow-orchestrator
git commit -m "refactor: remove mobile-browser-workflow-orchestrator

Users invoke individual skills directly. The orchestrator added complexity
without significant value."
```

---

## Task 5: Create multi-user-workflow-generator skill

**Files:**
- Create: `skills/multi-user-workflow-generator/SKILL.md`

**Step 1: Write the SKILL.md**

This skill discovers multi-user flows in a codebase and generates `workflows/multi-user-workflows.md`. Follow the exact same structural pattern as `skills/browser-workflow-generator/SKILL.md`:

1. YAML frontmatter with `name: multi-user-workflow-generator` and `description:` mentioning trigger phrases ("generate multi-user workflows", "create multi-user workflows", "discover multi-user flows")
2. Intro paragraph positioning the agent as a senior QA engineer focused on multi-user interaction flows
3. Task List Integration section with task hierarchy:
   ```
   [Main Task] "Generate: Multi-User Workflows"
     └── [Explore Task] "Explore: Auth & User Roles" (agent)
     └── [Explore Task] "Explore: Real-Time & Shared State" (agent)
     └── [Explore Task] "Explore: Cross-User Interactions" (agent)
     └── [Generate Task] "Generate: Workflow Drafts"
     └── [Approval Task] "Approval: User Review #1"
     └── [Write Task] "Write: multi-user-workflows.md"
   ```
4. Session Recovery Check section
5. Process phases:
   - **Phase 1: Assess Current State** — check for existing `workflows/multi-user-workflows.md` and `e2e/multi-user*.spec.ts`
   - **Phase 2: Parallel Exploration** — spawn 3 agents:
     - Agent 1: Auth & Roles — discover auth patterns (middleware, RLS policies, auth context), user role definitions, session management, permission models
     - Agent 2: Real-Time & Shared State — find Supabase Realtime / WebSocket subscriptions, shared database tables with RLS, optimistic updates, conflict resolution patterns
     - Agent 3: Cross-User Interactions — find friend/follow systems, invitation flows, notification systems, blocking/privacy features, content sharing between users, collaborative features
   - **Phase 3: Synthesize** — merge findings into distinct multi-user workflows, each with clearly defined personas
   - **Phase 4: Generate Workflow Document** — write numbered workflows following this format:
     ```markdown
     ## Workflow N: [Name]

     ### Personas
     - User A: [Role] (authenticated/anonymous)
     - User B: [Role] (authenticated/anonymous)

     ### Prerequisites
     - [Setup steps, e.g., "User A has an account", "App is running at localhost:3000"]

     ### Steps
     1. [User A] Navigate to /path
     2. [User A] Click "Button" → expected result
     3. [User A] Verify: assertion text
     4. [User B] Navigate to /path
     5. [User B] Verify: sees real-time update from step 2
     ```
   - **Phase 5: User Approval** — present workflows for review, iterate
   - **Phase 6: Write** — save to `workflows/multi-user-workflows.md`

**Reference files to model the structure after:**
- `skills/browser-workflow-generator/SKILL.md` — same overall structure (frontmatter, task list, session recovery, phases, agent delegation)
- `linkparty/workflows/multi-user-workflows.md` — example output format
- `linkparty/e2e/multi-user.spec.ts` — shows what multi-user flows look like in practice

**Key differences from browser-workflow-generator:**
- 3 exploration agents are themed around multi-user patterns (auth/roles, real-time/shared-state, cross-user interactions) instead of (routes, components, state)
- No UX convention research agent (not needed for multi-user flow discovery)
- Workflow format includes personas with `[User X]` step prefixes
- Assertions focus on cross-user visibility and real-time sync

**Step 2: Validate the new skill**

Run: `./scripts/validate-skills.sh`
Expected: Shows "multi-user-workflow-generator" as valid

**Step 3: Commit**

```bash
git add skills/multi-user-workflow-generator/SKILL.md
git commit -m "feat: add multi-user-workflow-generator skill

Discovers multi-user interaction flows in a codebase using 3 parallel
exploration agents (auth/roles, real-time/shared-state, cross-user
interactions) and generates workflows/multi-user-workflows.md."
```

---

## Task 6: Create multi-user-workflow-executor skill

**Files:**
- Create: `skills/multi-user-workflow-executor/SKILL.md`

**Step 1: Write the SKILL.md**

This skill executes multi-user workflows interactively using Chrome MCP (User A) + Playwright MCP (User B). Follow the pattern of `skills/browser-workflow-executor/SKILL.md`:

1. YAML frontmatter with `name: multi-user-workflow-executor` and `description:` mentioning triggers ("run multi-user workflows", "execute multi-user workflows", "test multi-user workflows"). Include `allowed-tools: Read, Write, Bash, Glob, Grep, mcp__claude-in-chrome__*, mcp__plugin_playwright_playwright__*`
2. Intro paragraph: QA engineer executing multi-user workflows using dual browser engines
3. Task List Integration with hierarchy:
   ```
   [Workflow Task] "Execute: Party Create and Join"
     └── [Issue Task] "Issue: Member count not updating in real-time"
     └── [Issue Task] "Issue: Auth not working for User B"
   [Workflow Task] "Execute: Content Sync"
   [Fix Task] "Fix: Real-time sync delay" (created in fix mode)
   [Report Task] "Generate: Multi-user audit report"
   ```
4. Execution Modes section (Audit Mode default, Fix Mode user-triggered) — same as browser-workflow-executor
5. Dual-Tool Architecture section explaining:
   - Chrome MCP = User A (primary/authenticated, uses existing Chrome session)
   - Playwright MCP = User B (secondary, separate browser, auth via API/cookie injection)
   - Table showing capabilities per tool
6. Process phases:
   - **Phase 1: Read Workflows** — parse `workflows/multi-user-workflows.md`, extract personas and steps
   - **Phase 2: Setup Both Browsers** —
     - Chrome MCP: `tabs_context_mcp` → `tabs_create_mcp` → navigate to app
     - Playwright MCP: `browser_navigate` to app, set up auth (cookies, localStorage, API calls)
     - Verify both browsers can access the app
   - **Phase 3: Execute Workflows** — for each workflow:
     - Create a task per workflow
     - Walk through steps sequentially
     - `[User A]` steps → Chrome MCP tools (`navigate`, `find`, `computer`, `read_page`)
     - `[User B]` steps → Playwright MCP tools (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_fill_form`)
     - Capture screenshots from the acting user's browser at each step
     - For "Verify" steps: check the specified assertion in the correct browser
     - Cross-user assertions: after one user acts, check the OTHER user's browser for real-time updates (use polling with timeout)
     - Log timing data for real-time sync assertions
   - **Phase 4: Audit Report** — compile issues, screenshots, sync timing
   - **Phase 5: Fix Mode** — spawn fix agents, re-execute to verify, capture AFTER screenshots
   - **Phase 6: Generate Report** — HTML report with before/after screenshots, sync timing data

**Reference files:**
- `skills/browser-workflow-executor/SKILL.md` — overall structure (audit/fix modes, screenshot capture, HTML report generation)
- `skills/mobile-browser-workflow-executor/SKILL.md` — dual-engine pattern (Playwright MCP primary + Chrome MCP alternative)
- `neonwatty/job-apply-plugin skills/job-apply/SKILL.md` — Chrome MCP + Playwright MCP dual-tool architecture and handoff patterns

**Key differences from browser-workflow-executor:**
- Two browsers instead of one (Chrome MCP + Playwright MCP)
- Steps are routed to the correct browser based on `[User A]` / `[User B]` prefix
- Cross-user assertions require checking BOTH browsers
- Real-time sync timing is tracked and reported

**Step 2: Validate**

Run: `./scripts/validate-skills.sh`
Expected: Shows "multi-user-workflow-executor" as valid

**Step 3: Commit**

```bash
git add skills/multi-user-workflow-executor/SKILL.md
git commit -m "feat: add multi-user-workflow-executor skill

Executes multi-user workflows interactively using Chrome MCP (User A) +
Playwright MCP (User B). Captures screenshots from both perspectives,
tracks real-time sync timing, and generates audit reports."
```

---

## Task 7: Create multi-user-workflow-to-playwright skill

**Files:**
- Create: `skills/multi-user-workflow-to-playwright/SKILL.md`

**Step 1: Write the SKILL.md**

Translates `workflows/multi-user-workflows.md` into Playwright specs with multiple browser contexts. Follow `skills/browser-workflow-to-playwright/SKILL.md`:

1. YAML frontmatter with `name: multi-user-workflow-to-playwright` and `description:` mentioning triggers ("convert multi-user workflows to playwright", "translate multi-user workflows to CI", "generate multi-user playwright tests")
2. Intro paragraph: senior QA automation engineer translating multi-user workflow markdown into Playwright E2E tests
3. Task List Integration with hierarchy:
   ```
   [Main Task] "Translate Multi-User Workflows to Playwright"
     └── [Parse Task] "Parse: multi-user-workflows.md"
     └── [Check Task] "Check: existing e2e/multi-user-workflows.spec.ts"
     └── [Selector Task] "Selectors: discover for all workflows" (agent)
         └── [Ambiguous Task] "Resolve: member count selector" (BLOCKING)
     └── [Generate Task] "Generate: Playwright multi-context tests"
     └── [Approval Task] "Approval: Review generated tests"
     └── [Write Task] "Write: e2e/multi-user-workflows.spec.ts"
   ```
4. Session Recovery Check
5. Translation pipeline diagram:
   ```
   /workflows/multi-user-workflows.md → e2e/multi-user-workflows.spec.ts
        (Human-readable)                    (Playwright multi-context tests)
   ```
6. Multi-User Playwright Patterns section explaining:
   - Each persona becomes a `browser.newContext()` + `context.newPage()`
   - Auth setup per context (cookies, localStorage, API calls in `beforeEach`)
   - Steps switch between `pageA` and `pageB`
   - Real-time sync assertions use `{ timeout: 10000 }` for WebSocket/Realtime propagation
   - API helper functions for fast precondition setup (create party via API instead of UI when it's just setup)
   - `test.skip` for flows requiring real services (email, push notifications)
7. Process phases:
   - **Phase 1: Parse Workflows** — read `workflows/multi-user-workflows.md`, extract personas, prerequisites, and numbered steps
   - **Phase 2: Check Existing Tests** — if `e2e/multi-user-workflows.spec.ts` exists, read it and produce a diff-based update
   - **Phase 3: Discover Selectors** — spawn Explore agent to find `data-testid`, aria labels, role-based selectors. Priority: `data-testid` > `getByRole` > `getByText` > `getByTestId` > CSS
   - **Phase 4: Resolve Ambiguities** — present ambiguous selectors to user as BLOCKING tasks
   - **Phase 5: Generate Spec File** — produce the Playwright spec following the pattern from the design doc (test.describe per workflow, beforeEach/afterEach for context lifecycle, API helpers for setup, extended timeouts for sync assertions)
   - **Phase 6: User Approval** — present generated test code
   - **Phase 7: Write** — save to `e2e/multi-user-workflows.spec.ts`

**Reference files:**
- `skills/browser-workflow-to-playwright/SKILL.md` — overall translation pipeline structure (parse, check existing, discover selectors, resolve ambiguity, generate, approve, write)
- `linkparty/e2e/multi-user.spec.ts` — real example of multi-user Playwright test using two browser contexts
- `linkparty/e2e/multi-user-realtime.spec.ts` — real example showing API helpers for setup, real-time sync assertions with timeouts
- `linkparty/e2e/limits.spec.ts` — example of `apiCreateParty`, `apiJoinParty` helper pattern

**Key differences from browser-workflow-to-playwright:**
- Multiple browser contexts per test (not just one page)
- Persona-to-context mapping in generated code
- Cross-context assertions (check pageA after pageB acts)
- API helper generation for multi-user precondition setup
- Real-time sync timeouts as a first-class concern

**Step 2: Validate**

Run: `./scripts/validate-skills.sh`
Expected: Shows "multi-user-workflow-to-playwright" as valid

**Step 3: Commit**

```bash
git add skills/multi-user-workflow-to-playwright/SKILL.md
git commit -m "feat: add multi-user-workflow-to-playwright skill

Translates multi-user workflow markdown into Playwright specs with multiple
browser contexts. Maps personas to contexts, generates API helpers for
setup, and uses extended timeouts for real-time sync assertions."
```

---

## Task 8: Create playwright-executor skill

**Files:**
- Create: `skills/playwright-executor/SKILL.md`

**Step 1: Write the SKILL.md**

Shared skill that runs any Playwright specs and reports results. This is a simpler skill — no agent delegation, no parallel exploration.

1. YAML frontmatter with `name: playwright-executor` and `description:` mentioning triggers ("run playwright tests", "execute e2e tests", "run e2e")
2. Intro paragraph: QA engineer running Playwright E2E test suites and reporting results
3. Task List Integration:
   ```
   [Main Task] "Run: Playwright Tests"
     └── [Discover Task] "Discover: e2e/*.spec.ts files"
     └── [Execute Task] "Execute: npx playwright test"
     └── [Report Task] "Report: Test Results"
     └── [Fix Task] "Fix: failing-test-name" (fix mode only)
   ```
4. Session Recovery Check
5. Arguments section explaining `$ARGUMENTS` parsing:
   - No args → run all `e2e/*.spec.ts`
   - `multi-user` → run `e2e/multi-user*.spec.ts`
   - `browser` → run `e2e/browser*.spec.ts`
   - `ios` → run `e2e/ios*.spec.ts`
   - `mobile` → run `e2e/mobile*.spec.ts`
   - `--fix` → enable auto-fix mode after failures
   - `--project chromium` → limit to one browser project
   - Arbitrary glob patterns also accepted
6. Process phases:
   - **Phase 1: Discover** — glob for `e2e/*.spec.ts`, read `playwright.config.ts` to understand browser projects, check if Playwright is installed (`npx playwright --version`)
   - **Phase 2: Configure** — parse `$ARGUMENTS`, build `npx playwright test` command with appropriate flags (`--reporter=html,json`, optional `--grep`, `--project`, spec file pattern)
   - **Phase 3: Execute** — run the command via Bash, capture stdout/stderr
   - **Phase 4: Parse Results** — look for JSON reporter output or parse stdout for pass/fail/skip counts, failed test names, error messages, duration
   - **Phase 5: Report** — display summary table showing total/pass/fail/skip counts, list failed tests with error snippets, note the HTML report location (`playwright-report/index.html`)
   - **Phase 6: Fix Mode** (if `--fix` flag or user says "fix"):
     - For each failed test: read the test source and the corresponding app source
     - Determine if the failure is a test bug (stale selector, wrong assertion) or app bug
     - Spawn a fix agent per failure
     - Re-run failed tests to verify fixes
     - Report fix results

**Step 2: Validate**

Run: `./scripts/validate-skills.sh`
Expected: Shows "playwright-executor" as valid

**Step 3: Commit**

```bash
git add skills/playwright-executor/SKILL.md
git commit -m "feat: add playwright-executor skill

Shared skill for running Playwright E2E tests across all platforms.
Supports filtering by platform, auto-fix mode for failures, and
generates summary reports."
```

---

## Task 9: Update README.md

**Files:**
- Modify: `README.md` (all 102 lines)

**Step 1: Rewrite README**

Replace the entire README with updated content covering:

1. **Title and description** — "Claude QA Skills" with updated description mentioning multi-user and 4-stage pipeline
2. **Installation** — updated `claude plugin marketplace add` and `claude plugin install` commands using the new marketplace name `neonwatty-qa`
3. **The Pipeline** — updated diagram showing 4 stages:
   ```
   Generate → Execute → Translate → Run
   ```
   With explanation of each stage
4. **Skills** section — 5 tables:
   - Browser (3 skills)
   - iOS (3 skills)
   - Mobile Browser (3 skills)
   - Multi-User (3 skills) — NEW section
   - Shared (2 skills: mobile-ux-ci + playwright-executor)
5. **Workflow** section — updated examples showing all 4 platforms including multi-user:
   ```bash
   # Multi-user testing
   "generate multi-user workflows"
   "run multi-user workflows"
   "convert multi-user workflows to playwright"
   "run playwright tests"
   ```
6. **Requirements** section — updated to include Playwright MCP for multi-user executor
7. **Local Development** section — keep existing content
8. **Related Plugins** section — keep existing links

Remove all references to `mobile-browser-workflow-orchestrator`.

**Step 2: Validate markdown**

Run: `npx markdownlint-cli2 README.md`
Expected: No errors (or only link-check warnings)

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README with 4-stage pipeline and multi-user skills

Adds installation instructions for marketplace, documents the 14-skill
architecture across 4 platforms, and removes orchestrator references."
```

---

## Task 10: Run full validation and verify

**Step 1: Run plugin validation**

Run: `npx markdownlint-cli2 'skills/**/*.md' 'README.md'`
Expected: All pass (some warnings OK)

**Step 2: Run skill structure validation**

Run: `./scripts/validate-skills.sh`
Expected: 13 skills listed, all valid. Specifically verify:
- `multi-user-workflow-generator ✓`
- `multi-user-workflow-executor ✓`
- `multi-user-workflow-to-playwright ✓`
- `playwright-executor ✓`
- NO `mobile-browser-workflow-orchestrator`

**Step 3: Validate JSON files**

Run: `python3 -m json.tool .claude-plugin/plugin.json > /dev/null && python3 -m json.tool .claude-plugin/marketplace.json > /dev/null && echo "All JSON valid"`
Expected: "All JSON valid"

**Step 4: Check git status is clean**

Run: `git status`
Expected: "nothing to commit, working tree clean"

**Step 5: Review commit log**

Run: `git log --oneline -10`
Expected: 9 commits from this plan (tasks 1-9) plus the design doc commit
