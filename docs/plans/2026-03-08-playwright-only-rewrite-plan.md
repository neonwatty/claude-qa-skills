# Playwright-Only Rewrite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace 14 QA skills with 7 Playwright-only skills on a clean slate branch.

**Architecture:** Each SKILL.md follows the existing pattern: YAML frontmatter, role preamble, task list integration with hierarchy and session recovery, phased process with agent delegation, user approval gates, and detailed examples. The design doc at `docs/plans/2026-03-08-playwright-only-rewrite-design.md` is the source of truth for all behavioral requirements.

**Tech Stack:** Playwright MCP (only MCP dependency), Claude Code task list system, Explore/general-purpose subagents.

**Reference files:**
- Design doc: `docs/plans/2026-03-08-playwright-only-rewrite-design.md`
- Auth patterns: `~/Desktop/playwright-authenticated-testing.md`
- Existing generator pattern: `skills/browser-workflow-generator/SKILL.md`
- Existing converter pattern: `skills/browser-workflow-to-playwright/SKILL.md`
- Existing runner pattern: `skills/playwright-executor/SKILL.md`
- Existing multi-user pattern: `skills/multi-user-workflow-executor/SKILL.md`

---

### Task 1: Create Clean Slate Branch

**Files:**
- Modify: Git branch state

**Step 1: Create the branch**

```bash
cd ~/Desktop/claude-qa-skills
git checkout -b v2-playwright-only
```

**Step 2: Delete all existing skill directories**

```bash
rm -rf skills/browser-workflow-generator
rm -rf skills/browser-workflow-executor
rm -rf skills/browser-workflow-to-playwright
rm -rf skills/ios-workflow-generator
rm -rf skills/ios-workflow-executor
rm -rf skills/ios-workflow-to-playwright
rm -rf skills/mobile-browser-workflow-generator
rm -rf skills/mobile-browser-workflow-executor
rm -rf skills/mobile-browser-workflow-to-playwright
rm -rf skills/multi-user-workflow-generator
rm -rf skills/multi-user-workflow-executor
rm -rf skills/multi-user-workflow-to-playwright
rm -rf skills/playwright-executor
rm -rf skills/mobile-ux-ci
```

**Step 3: Create new skill directories**

```bash
mkdir -p skills/desktop-workflow-generator
mkdir -p skills/mobile-workflow-generator
mkdir -p skills/multi-user-workflow-generator
mkdir -p skills/desktop-workflow-to-playwright
mkdir -p skills/mobile-workflow-to-playwright
mkdir -p skills/multi-user-workflow-to-playwright
mkdir -p skills/playwright-runner
```

**Step 4: Commit the clean slate**

```bash
git add -A
git commit -m "chore: clean slate for v2 Playwright-only rewrite

Remove all 14 existing skills. Create empty directories for 7 new skills.
See docs/plans/2026-03-08-playwright-only-rewrite-design.md for design."
```

---

### Task 2: Update Plugin Metadata

**Files:**
- Modify: `.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`

**Step 1: Update plugin.json**

```json
{
  "name": "qa-skills",
  "version": "2.0.0",
  "description": "QA testing pipeline — generate workflow docs, convert to Playwright E2E tests, run interactively or in CI. Supports desktop, mobile, and multi-user flows. Playwright-only, with built-in storageState authentication and Vercel preview CI generation.",
  "author": {
    "name": "Jeremy Watt",
    "url": "https://github.com/neonwatty"
  },
  "license": "MIT",
  "keywords": ["qa", "testing", "playwright", "e2e", "mobile", "multi-user", "authentication", "ci"],
  "skills": "./skills",
  "repository": "https://github.com/neonwatty/claude-qa-skills"
}
```

**Step 2: Update marketplace.json**

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
      "description": "QA testing pipeline — generate workflows, convert to Playwright tests, run interactively or in CI. Desktop, mobile, and multi-user support with built-in authentication.",
      "version": "2.0.0",
      "category": "testing",
      "tags": ["qa", "playwright", "e2e", "mobile", "multi-user", "authentication"]
    }
  ]
}
```

**Step 3: Verify and commit**

```bash
cat .claude-plugin/plugin.json | python3 -m json.tool > /dev/null && echo "Valid JSON"
cat .claude-plugin/marketplace.json | python3 -m json.tool > /dev/null && echo "Valid JSON"
git add .claude-plugin/
git commit -m "chore: bump plugin to v2.0.0, update descriptions for Playwright-only"
```

---

### Task 3: Write desktop-workflow-generator SKILL.md

**Files:**
- Create: `skills/desktop-workflow-generator/SKILL.md`

**Step 1: Write the skill file**

This is the first generator. It follows the same structural pattern as the existing `browser-workflow-generator` but with these key changes:

- **No Chrome MCP references.** All codebase exploration uses Read/Grep/Glob via Explore agents and LSP if available.
- **Optional Playwright MCP live crawl.** After code exploration, ask user if they want to supplement with a Playwright crawl of the running app.
- **Auth-aware workflow format.** Workflows include `<!-- auth: required -->` comments for the converters and runner to consume.
- **Role preamble:** "You are a senior QA engineer creating comprehensive desktop workflow documentation for Playwright-based testing."

**Frontmatter:**

```yaml
---
name: desktop-workflow-generator
description: Generates desktop browser workflow documentation by exploring the app's codebase and optionally crawling the live app via Playwright. Use when the user says "generate desktop workflows", "create desktop workflows", "update desktop workflows", or "generate browser workflows". Produces numbered workflow markdown files that feed into the desktop converter and Playwright runner.
---
```

**Required sections (follow existing generator pattern in `skills/browser-workflow-generator/SKILL.md`):**

1. **Title & role preamble** — Senior QA engineer, desktop workflow focus
2. **Task List Integration** — Same pattern: hierarchy, session recovery check, metadata tracking
3. **Task Hierarchy:**
   ```
   [Main Task] "Generate: Desktop Workflows"
     └── [Explore Task] "Explore: Routes & Navigation" (agent)
     └── [Explore Task] "Explore: Components & Features" (agent)
     └── [Explore Task] "Explore: State & Data" (agent)
     └── [Crawl Task] "Crawl: Live App" (optional, Playwright MCP)
     └── [Generate Task] "Generate: Workflow Drafts"
     └── [Approval Task] "Approval: User Review #1"
     └── [Write Task] "Write: desktop-workflows.md"
   ```
4. **Phase 1: Assess Current State** — Check for existing `/workflows/desktop-workflows.md`, ask user goal (create/update/refactor/audit)
5. **Phase 2: Explore the Application** — Three parallel Explore agents (routes, components, state/data). Agents use Read/Grep/Glob + LSP. Same agent prompts as existing generator but without Chrome MCP references.
6. **Phase 3: Identify User Journeys** — Core, feature, and edge case journeys. Same as existing.
7. **Phase 4: Optional Live Crawl** — NEW phase. After code exploration, ask user: "Would you like to supplement with a live crawl of the running app? If so, provide the URL." If yes, use Playwright MCP to navigate the app, discover additional routes/elements not found in code. If no, skip to Phase 5.
8. **Phase 5: Generate Workflows** — Same format as existing but with auth annotation:
   ```markdown
   ## Workflow 1: [Name]
   <!-- auth: required -->

   > [Description]

   1. [Step]
      - [Substep with expected outcome]
   ```
9. **Phase 6: Organize & Write** — Same document structure as existing
10. **Phase 7: Review with User** — Same approval gate pattern
11. **Phase 8: Write File and Complete** — Output to `/workflows/desktop-workflows.md`
12. **Session Recovery** — Same decision tree pattern
13. **Workflow Writing Standards** — Same step type table (Navigate, Click, Type, Verify, etc.)
14. **Automation-Friendly Guidelines** — Updated for Playwright MCP (remove Chrome-specific limitations). Steps should prefer Playwright-recommended locator descriptions (getByRole, getByLabel, getByText). Mark non-automatable steps with `[MANUAL]`.
15. **Web Platform UX Anti-Patterns** — Same tables as existing generator (navigation, interaction, visual, component, accessibility anti-patterns)

**Key differences from existing `browser-workflow-generator`:**
- Replace all "Claude-in-Chrome" references with "Playwright MCP" for the live crawl
- Remove "Automation-Friendly Workflow Guidelines" section about Chrome limitations (keyboard shortcuts, native dialogs) — replace with Playwright-specific guidance
- Add `<!-- auth: required -->` to workflow template
- Add Phase 4 (optional live crawl) between exploration and generation
- Output path changes from `/workflows/browser-workflows.md` to `/workflows/desktop-workflows.md`
- Remove UX research phase (Phase 4 in old skill) — this added complexity without proportional value. UX anti-patterns are covered by the static tables instead.

**Step 2: Validate**

```bash
bash scripts/validate-skills.sh
```

Expected: `desktop-workflow-generator` shows `✓ Valid`

**Step 3: Commit**

```bash
git add skills/desktop-workflow-generator/
git commit -m "feat: add desktop-workflow-generator skill

Explores codebase via agents + optional Playwright crawl.
Generates auth-aware workflow markdown to /workflows/desktop-workflows.md."
```

---

### Task 4: Write mobile-workflow-generator SKILL.md

**Files:**
- Create: `skills/mobile-workflow-generator/SKILL.md`

**Step 1: Write the skill file**

Same structure as desktop generator (Task 3) with these differences:

**Frontmatter:**

```yaml
---
name: mobile-workflow-generator
description: Generates mobile browser workflow documentation by exploring the app's codebase and optionally crawling the live app via Playwright with a mobile viewport. Use when the user says "generate mobile workflows", "create mobile workflows", "update mobile workflows", or "generate mobile browser workflows". Produces numbered workflow markdown files that feed into the mobile converter and Playwright runner. Includes iOS HIG awareness and mobile UX anti-pattern detection.
---
```

**Key differences from desktop generator:**
- **Role preamble** mentions mobile viewport focus and iOS HIG awareness
- **Explore agents** additionally search for: responsive breakpoints, media queries, mobile-specific components, viewport meta tags, touch event handlers
- **Optional live crawl** uses Playwright MCP with mobile viewport (393x852, iPhone 15 Pro) — specify in the crawl instructions: `await page.setViewportSize({ width: 393, height: 852 })`
- **Workflow format** includes mobile-specific annotations:
  ```markdown
  ## Workflow 1: [Name]
  <!-- auth: required -->
  <!-- viewport: mobile (393x852) -->

  > [Description]
  ```
- **iOS HIG awareness section** — Absorbed from the deleted `ios-workflow-generator`. Include guidance on:
  - Touch targets (minimum 44x44pt)
  - Tab bar vs hamburger menu patterns
  - Native-feeling scroll and gesture interactions
  - Input zoom prevention (font-size >= 16px)
  - Safe area inset awareness
- **Mobile UX Anti-Patterns tables** — Replace the web platform anti-patterns from desktop with mobile-specific tables. Absorb content from `skills/ios-workflow-generator/SKILL.md` and `skills/mobile-browser-workflow-generator/SKILL.md`:
  - Navigation: hamburger menus, missing tab bars, non-native back button
  - Touch: targets < 44px, hover-dependent interactions, small form inputs
  - Visual: text too small, insufficient contrast on mobile, no viewport meta
  - Components: desktop dropdowns, tiny checkboxes, non-scrollable modals
- **Output path:** `/workflows/mobile-workflows.md`

**Step 2: Validate**

```bash
bash scripts/validate-skills.sh
```

**Step 3: Commit**

```bash
git add skills/mobile-workflow-generator/
git commit -m "feat: add mobile-workflow-generator skill

Mobile viewport focus with iOS HIG awareness.
Absorbs content from deleted ios-workflow-generator.
Generates to /workflows/mobile-workflows.md."
```

---

### Task 5: Write multi-user-workflow-generator SKILL.md

**Files:**
- Create: `skills/multi-user-workflow-generator/SKILL.md`

**Step 1: Write the skill file**

Different flow from desktop/mobile generators — this one interviews the user about personas before exploring code.

**Frontmatter:**

```yaml
---
name: multi-user-workflow-generator
description: Generates multi-user workflow documentation by interviewing the user about personas and roles, then exploring the codebase for multi-user patterns. Use when the user says "generate multi-user workflows", "create multi-user workflows", or "generate concurrent user workflows". Produces persona-tagged workflow markdown that feeds into the multi-user converter and Playwright runner.
---
```

**Unique structure (different from desktop/mobile generators):**

1. **Title & role preamble** — Senior QA engineer, multi-user and real-time testing focus
2. **Task List Integration** — Same pattern
3. **Task Hierarchy:**
   ```
   [Main Task] "Generate: Multi-User Workflows"
     └── [Interview Task] "Interview: User Personas"
     └── [Explore Task] "Explore: Auth & Roles" (agent)
     └── [Explore Task] "Explore: Multi-User Features" (agent)
     └── [Explore Task] "Explore: Real-Time Sync" (agent)
     └── [Crawl Task] "Crawl: Live App" (optional)
     └── [Generate Task] "Generate: Workflow Drafts"
     └── [Approval Task] "Approval: User Review #1"
     └── [Write Task] "Write: multi-user-workflows.md"
   ```
4. **Phase 1: Interview User About Personas** — NEW, unique to this generator. Use `AskUserQuestion` to gather:
   - What personas/roles exist? (e.g., Admin, User, Guest)
   - How many of each? (e.g., 1 admin, 2 regular users)
   - Do test accounts already exist or need creation?
   - What are the credential env var names? (e.g., `ADMIN_EMAIL`, `ADMIN_PASSWORD`)
   - Is there a sign-up flow or are accounts pre-provisioned?
   Store persona list in task metadata.
5. **Phase 2: Explore the Application** — Three parallel agents focused on multi-user concerns:
   - Agent 1: Auth & Roles — auth middleware, role enums/types, RLS policies, route guards, permission checks
   - Agent 2: Multi-User Features — shared resources, collaborative editing, cross-user visibility, invitation flows
   - Agent 3: Real-Time Sync — WebSocket/SSE endpoints, real-time subscriptions, optimistic updates, conflict resolution
6. **Phase 3: Optional Live Crawl** — Same as desktop but log in as each persona to discover role-specific routes
7. **Phase 4: Generate Workflows** — Persona-tagged format:
   ```markdown
   ## Workflow 3: Collaborative Document Editing
   <!-- auth: required -->
   <!-- personas: host, guest1, guest2 -->

   1. [Host] Create a new document
      - Expected: Document created, share link available
   2. [Guest1] Open share link
      - Expected: Document visible in read-only mode
   ```
8. **Phase 5-7: Organize, Review, Write** — Same pattern. Output to `/workflows/multi-user-workflows.md`
9. **Session Recovery** — Same pattern
10. **Multi-User Workflow Writing Standards** — Include persona tagging rules, sync verification patterns, timing expectations for real-time updates

**Step 2: Validate**

```bash
bash scripts/validate-skills.sh
```

**Step 3: Commit**

```bash
git add skills/multi-user-workflow-generator/
git commit -m "feat: add multi-user-workflow-generator skill

Interviews user about personas, explores multi-user patterns.
Generates persona-tagged workflows to /workflows/multi-user-workflows.md."
```

---

### Task 6: Write desktop-workflow-to-playwright SKILL.md

**Files:**
- Create: `skills/desktop-workflow-to-playwright/SKILL.md`

**Step 1: Write the skill file**

This follows the existing `browser-workflow-to-playwright` pattern but outputs a self-contained Playwright project directory instead of a single spec file, and always includes auth scaffolding + CI workflow.

**Frontmatter:**

```yaml
---
name: desktop-workflow-to-playwright
description: Converts desktop workflow markdown into a self-contained Playwright test project with authentication scaffolding and CI workflow. Use when the user says "convert desktop workflows to playwright", "translate desktop workflows to CI", "generate desktop playwright tests", or wants to promote desktop workflows to automated CI tests.
---
```

**Required sections (follow existing converter pattern but with new output structure):**

1. **Title & role preamble** — Senior QA automation engineer
2. **Task List Integration** — Same pattern as existing converter
3. **Task Hierarchy:**
   ```
   [Main Task] "Convert: Desktop Workflows to Playwright"
     └── [Parse Task] "Parse: desktop-workflows.md"
     └── [Check Task] "Check: Existing e2e/desktop/ project"
     └── [Selector Task] "Selectors: Find for all workflows" (agent)
     └── [Generate Task] "Generate: Playwright project" (agent)
     └── [Approval Task] "Approval: Review generated tests"
     └── [Write Task] "Write: e2e/desktop/"
   ```
4. **The Translation Pipeline:**
   ```
   /workflows/desktop-workflows.md  →  e2e/desktop/
                                         ├── playwright.config.ts
                                         ├── package.json
                                         ├── tests/
                                         │   ├── auth.setup.ts
                                         │   └── workflows.spec.ts
                                         ├── .github/workflows/e2e.yml
                                         └── .gitignore
   ```
5. **Phase 1: Parse Workflows** — Same as existing converter
6. **Phase 2: Check Existing Project** — Check for existing `e2e/desktop/` directory instead of single file
7. **Phase 3: Selector Discovery** — Same agent-based approach as existing converter
8. **Phase 4: Generate Playwright Project** — NEW expanded output. Agent generates all files:

   **playwright.config.ts:**
   ```typescript
   import { defineConfig } from '@playwright/test';

   export default defineConfig({
     testDir: './tests',
     use: {
       baseURL: process.env.BASE_URL || 'http://localhost:3000',
       extraHTTPHeaders: {
         ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET && {
           'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
           'x-vercel-set-bypass-cookie': 'samesitenone',
         }),
       },
     },
     projects: [
       { name: 'setup', testMatch: /.*\.setup\.ts/ },
       {
         name: 'desktop-chromium',
         use: {
           ...devices['Desktop Chrome'],
           storageState: 'playwright/.auth/user.json',
         },
         dependencies: ['setup'],
       },
     ],
   });
   ```

   **tests/auth.setup.ts:**
   ```typescript
   import { test as setup } from '@playwright/test';

   const authFile = 'playwright/.auth/user.json';

   setup('authenticate', async ({ page }) => {
     // Skip auth if no credentials provided
     if (!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD) {
       // Save empty storage state
       await page.context().storageState({ path: authFile });
       return;
     }

     await page.goto('/login');
     await page.getByLabel('Email').fill(process.env.TEST_EMAIL);
     await page.getByLabel('Password').fill(process.env.TEST_PASSWORD);
     await page.getByRole('button', { name: /sign in|log in/i }).click();
     await page.waitForURL('**/dashboard');
     await page.context().storageState({ path: authFile });
   });
   ```

   **package.json:**
   ```json
   {
     "name": "desktop-e2e",
     "private": true,
     "scripts": {
       "test": "playwright test",
       "test:ui": "playwright test --ui",
       "test:headed": "playwright test --headed"
     },
     "devDependencies": {
       "@playwright/test": "^1.50.0"
     }
   }
   ```

   **.github/workflows/e2e.yml** — Based on `~/Desktop/playwright-authenticated-testing.md` CI section:
   ```yaml
   name: Desktop E2E Tests
   on: [deployment_status]

   jobs:
     test:
       if: >
         github.event.deployment_status.state == 'success' &&
         contains(github.event.deployment_status.environment, 'Preview')
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
         - run: cd e2e/desktop && npm ci
         - run: cd e2e/desktop && npx playwright install chromium --with-deps
         - run: cd e2e/desktop && npx playwright test
           env:
             BASE_URL: ${{ github.event.deployment_status.target_url }}
             TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
             TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
             VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}
         - uses: actions/upload-artifact@v4
           if: ${{ !cancelled() }}
           with:
             name: desktop-playwright-report
             path: e2e/desktop/playwright-report/
   ```

   **.gitignore:**
   ```
   node_modules/
   playwright/.auth/
   playwright-report/
   test-results/
   ```

   **tests/workflows.spec.ts** — Same generation pattern as existing converter but with updated imports and structure.

9. **Phase 5-7: Handle Updates, Review, Write** — Same patterns as existing converter
10. **Phase 8: Completion** — Same summary pattern
11. **Session Recovery** — Same pattern
12. **Action mapping table** — Same as existing converter
13. **Example translation** — Updated to show the new project structure output

**Step 2: Validate**

```bash
bash scripts/validate-skills.sh
```

**Step 3: Commit**

```bash
git add skills/desktop-workflow-to-playwright/
git commit -m "feat: add desktop-workflow-to-playwright skill

Generates self-contained Playwright project at e2e/desktop/ with
auth.setup.ts, CI workflow, and Vercel bypass headers."
```

---

### Task 7: Write mobile-workflow-to-playwright SKILL.md

**Files:**
- Create: `skills/mobile-workflow-to-playwright/SKILL.md`

**Step 1: Write the skill file**

Same structure as desktop converter (Task 6) with these differences:

**Frontmatter:**

```yaml
---
name: mobile-workflow-to-playwright
description: Converts mobile workflow markdown into a self-contained Playwright test project with mobile viewports (Chromium + WebKit), authentication scaffolding, UX anti-pattern assertions, and CI workflow. Use when the user says "convert mobile workflows to playwright", "translate mobile workflows to CI", or "generate mobile playwright tests".
---
```

**Key differences from desktop converter:**
- **Two browser projects** in playwright.config.ts:
  ```typescript
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['iPhone 15 Pro'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-webkit',
      use: {
        ...devices['iPhone 15 Pro'],
        browserName: 'webkit',
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  ```
- **UX anti-pattern assertions** baked into generated tests as `test.step()` blocks after each workflow test. These check:
  - Touch targets: `expect(await elem.boundingBox()).toSatisfy(box => box.width >= 44 && box.height >= 44)`
  - Input font size >= 16px (prevents iOS zoom): `expect(fontSize).toBeGreaterThanOrEqual(16)`
  - No hover-only interactions (verify all interactive elements are tap-accessible)
  - Viewport meta tag present with appropriate settings
- **CI workflow** installs both chromium and webkit: `npx playwright install chromium webkit --with-deps`
- **Output path:** `e2e/mobile/`

**Step 2: Validate**

```bash
bash scripts/validate-skills.sh
```

**Step 3: Commit**

```bash
git add skills/mobile-workflow-to-playwright/
git commit -m "feat: add mobile-workflow-to-playwright skill

Generates mobile Playwright project with Chromium + WebKit projects,
UX anti-pattern assertions, and iOS HIG checks."
```

---

### Task 8: Write multi-user-workflow-to-playwright SKILL.md

**Files:**
- Create: `skills/multi-user-workflow-to-playwright/SKILL.md`

**Step 1: Write the skill file**

Most complex converter — generates per-persona auth setup and multi-context test patterns.

**Frontmatter:**

```yaml
---
name: multi-user-workflow-to-playwright
description: Converts multi-user workflow markdown into a self-contained Playwright test project with per-persona authentication, multi-context test patterns, and CI workflow. Use when the user says "convert multi-user workflows to playwright", "translate multi-user workflows to CI", or "generate multi-user playwright tests".
---
```

**Key differences from desktop converter:**

- **Parse persona metadata** from workflow comments (`<!-- personas: host, guest1, guest2 -->`)
- **Per-persona setup files** — For each persona discovered, generate a `<persona>.setup.ts`:
  ```typescript
  // tests/admin.setup.ts
  import { test as setup } from '@playwright/test';

  const authFile = 'playwright/.auth/admin.json';

  setup('authenticate as admin', async ({ page }) => {
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      await page.context().storageState({ path: authFile });
      return;
    }
    await page.goto('/login');
    await page.getByLabel('Email').fill(process.env.ADMIN_EMAIL);
    await page.getByLabel('Password').fill(process.env.ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await page.waitForURL('**/dashboard');
    await page.context().storageState({ path: authFile });
  });
  ```
- **playwright.config.ts** with multi-project setup — Based on `~/Desktop/playwright-authenticated-testing.md` multi-context section:
  ```typescript
  projects: [
    { name: 'admin-setup', testMatch: /admin\.setup\.ts/ },
    { name: 'user-setup', testMatch: /user\.setup\.ts/ },
    // ... one per persona
    {
      name: 'multi-user-tests',
      testDir: './tests',
      testMatch: /workflows\.spec\.ts/,
      dependencies: ['admin-setup', 'user-setup'],
      // NO storageState here — tests create their own contexts
    },
  ],
  ```
- **Test pattern** uses `{ browser }` fixture with per-persona contexts:
  ```typescript
  test('Workflow 3: Collaborative Document Editing', async ({ browser }) => {
    const hostCtx = await browser.newContext({
      storageState: 'playwright/.auth/host.json',
    });
    const guest1Ctx = await browser.newContext({
      storageState: 'playwright/.auth/guest1.json',
    });

    const hostPage = await hostCtx.newPage();
    const guest1Page = await guest1Ctx.newPage();

    // [Host] Create a new document
    await hostPage.goto('/documents/new');
    // ... host actions

    // [Guest1] Open share link
    await guest1Page.goto(shareLink);
    // ... guest actions

    await hostCtx.close();
    await guest1Ctx.close();
  });
  ```
- **Persona tag parsing** — Map `[PersonaName]` tags in workflow steps to the corresponding browser context variable
- **CI workflow** includes env vars for all personas:
  ```yaml
  env:
    ADMIN_EMAIL: ${{ secrets.ADMIN_EMAIL }}
    ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
    USER_EMAIL: ${{ secrets.USER_EMAIL }}
    USER_PASSWORD: ${{ secrets.USER_PASSWORD }}
  ```
- **Output path:** `e2e/multi-user/`

**Step 2: Validate**

```bash
bash scripts/validate-skills.sh
```

**Step 3: Commit**

```bash
git add skills/multi-user-workflow-to-playwright/
git commit -m "feat: add multi-user-workflow-to-playwright skill

Generates per-persona auth setup, multi-context test patterns,
and CI with per-persona credential env vars."
```

---

### Task 9: Write playwright-runner SKILL.md

**Files:**
- Create: `skills/playwright-runner/SKILL.md`

**Step 1: Write the skill file**

This is a rewrite of the old `playwright-executor` — now MCP-first execution instead of CLI-based.

**Frontmatter:**

```yaml
---
name: playwright-runner
description: Executes workflow markdown files interactively via Playwright MCP, stepping through each workflow action in a real browser. Use when the user says "run workflows", "run playwright", "test workflows", "execute workflows", or wants to interactively test their app against workflow documentation. Supports desktop, mobile, and multi-user workflows with authentication.
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion, mcp__playwright__*
argument-hint: "[desktop|mobile|multi-user] [--url URL]"
---
```

**Unique structure (different from generators/converters):**

1. **Title & role preamble** — Senior QA engineer executing interactive workflow tests
2. **Task List Integration** — Same pattern
3. **Task Hierarchy:**
   ```
   [Main Task] "Run: [Platform] Workflows"
     └── [Auth Task] "Auth: Setup authentication" (if needed)
     └── [Workflow Task] "Execute: [Workflow Name]"
       └── [Step Task] "Step 1: [Description]" (pass/fail)
       └── [Step Task] "Step 2: [Description]"
       └── [Issue Task] "Issue: [Description]" (on failure)
     └── [Report Task] "Report: Execution Summary"
   ```
4. **Arguments** — Parse `$ARGUMENTS`:
   - Platform filter: `desktop`, `mobile`, `multi-user`, or none (auto-detect from available workflow files)
   - `--url URL`: Base URL of the running app
   - Auto-detect: scan `/workflows/` for available workflow files
5. **Phase 1: Discover Workflows** — Read `/workflows/<platform>-workflows.md`. If multiple platforms available and none specified, ask user which to run.
6. **Phase 2: Authentication Setup** — Check for `<!-- auth: required -->` in workflows. If found, ask user via `AskUserQuestion`:
   - "Provide credentials now" → user gives email/password, runner uses Playwright MCP to log in and capture state
   - "Use existing storageState JSON" → user provides path to auth.json
   - "Use persistent browser profile" → use Playwright MCP `--user-data-dir`
   - "App doesn't need auth" → skip
   For multi-user: repeat for each persona from `<!-- personas: ... -->` metadata.
7. **Phase 3: Execute Workflows** — For each workflow, for each step:
   - Use Playwright MCP to perform the action (navigate, click, fill, etc.)
   - Map workflow language to Playwright MCP tool calls:
     | Workflow Language | Playwright MCP Action |
     |---|---|
     | "Navigate to [URL]" | `browser_navigate` |
     | "Click [element]" | `browser_click` (find element via `browser_snapshot` first) |
     | "Type '[text]' in [field]" | `browser_type` |
     | "Verify [condition]" | `browser_snapshot` + check for expected content |
     | "Wait for [element]" | `browser_wait_for` |
   - After each step: take snapshot, verify expected outcome, mark step pass/fail
   - On failure: capture screenshot, create Issue task with details
   - For mobile: set viewport to 393x852 before starting
   - For multi-user: manage separate browser tabs/contexts per persona (use `browser_tabs` to create and switch)
8. **Phase 4: Report** — Summarize results:
   ```
   ## Execution Summary

   **Platform:** Desktop
   **Workflows:** 5 executed
   **Steps:** 32 passed, 3 failed

   ### Failures
   - Workflow 2, Step 4: Expected "Dashboard" heading but found "Loading..."
     Screenshot: [captured]
   ```
9. **Session Recovery** — Same pattern, resume from last incomplete workflow/step
10. **Error Handling** — App not running, auth failure, element not found, timeout

**Step 2: Validate**

```bash
bash scripts/validate-skills.sh
```

**Step 3: Commit**

```bash
git add skills/playwright-runner/
git commit -m "feat: add playwright-runner skill

MCP-first interactive execution of workflow markdown.
Supports desktop, mobile, and multi-user with auth."
```

---

### Task 10: Update validate-skills.sh

**Files:**
- Modify: `scripts/validate-skills.sh`

**Step 1: No changes needed**

The existing validation script is generic — it scans `skills/*/SKILL.md` and checks frontmatter. It doesn't hardcode skill names. Verify it works with the new skills:

```bash
bash scripts/validate-skills.sh
```

Expected output:
```
Validating skill files...

Checking: desktop-workflow-generator
  ✓ Valid
Checking: desktop-workflow-to-playwright
  ✓ Valid
Checking: mobile-workflow-generator
  ✓ Valid
Checking: mobile-workflow-to-playwright
  ✓ Valid
Checking: multi-user-workflow-generator
  ✓ Valid
Checking: multi-user-workflow-to-playwright
  ✓ Valid
Checking: playwright-runner
  ✓ Valid

✅ All skill files are valid
```

If any fail, fix the SKILL.md frontmatter and re-validate.

**Step 2: Commit (only if changes were needed)**

```bash
git add scripts/
git commit -m "chore: update validate-skills.sh for new skill names"
```

---

### Task 11: Rewrite README.md

**Files:**
- Modify: `README.md`

**Step 1: Write the updated README**

```markdown
# Claude QA Skills

QA testing pipeline for [Claude Code](https://claude.ai/code) — generate user workflow documentation, convert to Playwright E2E tests, and run them interactively or in CI. Supports desktop, mobile, and multi-user flows with built-in authentication.

## Installation

\```bash
# Add the marketplace
claude plugin marketplace add neonwatty/claude-qa-skills

# Install to your project
claude plugin install qa-skills@neonwatty-qa
\```

## The Pipeline

\```
                                    ┌→  Converters  →  .spec.ts  →  CI (GitHub Actions)
Generators  →  workflow markdown  ──┤
                                    └→  Runner (Playwright MCP)  →  interactive local testing
\```

1. **Generate** — Explore your codebase (+ optional Playwright crawl) to create workflow documentation
2. **Convert** — Translate workflows into self-contained Playwright test projects with auth and CI
3. **Run** — Execute workflows interactively via Playwright MCP, or run generated tests in CI

## Skills

### Generators — 3 skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| **desktop-workflow-generator** | "generate desktop workflows" | Explores codebase, discovers routes and features, creates desktop workflow docs |
| **mobile-workflow-generator** | "generate mobile workflows" | Same with mobile viewport focus, iOS HIG awareness, and UX anti-pattern flagging |
| **multi-user-workflow-generator** | "generate multi-user workflows" | Interviews user about personas, explores multi-user patterns, creates persona-tagged workflows |

### Converters — 3 skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| **desktop-workflow-to-playwright** | "convert desktop workflows to playwright" | Generates `e2e/desktop/` project with Chromium tests, auth setup, CI workflow |
| **mobile-workflow-to-playwright** | "convert mobile workflows to playwright" | Generates `e2e/mobile/` project with Chromium + WebKit mobile tests, UX anti-pattern assertions |
| **multi-user-workflow-to-playwright** | "convert multi-user workflows to playwright" | Generates `e2e/multi-user/` project with per-persona auth, multi-context test patterns |

### Runner — 1 skill

| Skill | Trigger | Description |
|-------|---------|-------------|
| **playwright-runner** | "run workflows" | Executes workflow markdown interactively via Playwright MCP with auth support |

## Workflow

A typical QA cycle:

\```bash
# Desktop testing
"generate desktop workflows"
"convert desktop workflows to playwright"
"run workflows desktop"

# Mobile testing
"generate mobile workflows"
"convert mobile workflows to playwright"
"run workflows mobile"

# Multi-user testing
"generate multi-user workflows"
"convert multi-user workflows to playwright"
"run workflows multi-user"
\```

## What Gets Generated

Each converter produces a self-contained Playwright project:

\```
e2e/<platform>/
├── playwright.config.ts       # Auth setup, Vercel bypass headers
├── package.json               # Playwright dependency
├── tests/
│   ├── auth.setup.ts          # storageState authentication
│   └── workflows.spec.ts     # Generated test specs
├── .github/
│   └── workflows/
│       └── e2e.yml            # CI for Vercel preview deployments
└── .gitignore
\```

## Authentication

All skills support Playwright storageState authentication:

- **Converters** always generate `auth.setup.ts` with `process.env` credential references
- **Runner** detects `<!-- auth: required -->` in workflows and offers auth options
- **Multi-user** supports arbitrary persona counts with per-persona credentials
- **CI** uses GitHub secrets for credentials and Vercel deployment protection bypass

## Requirements

- **Playwright MCP** — Install via Claude Code marketplace or configure manually
- **Playwright** — `npx playwright install` in generated test projects

No other MCP dependencies required.

## Local Development

\```bash
# Load local version instead of cached plugin
claude --plugin-dir /path/to/claude-qa-skills
\```

## Related Plugins

- [claude-dev-skills](https://github.com/neonwatty/claude-dev-skills) — Developer workflow automation
- [claude-interview-skills](https://github.com/neonwatty/claude-interview-skills) — Structured interviews for feature planning
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for v2 Playwright-only pipeline

7 skills, 3-stage pipeline, Playwright MCP only."
```

---

### Task 12: Final Validation and Squash

**Step 1: Run full validation**

```bash
bash scripts/validate-skills.sh
```

Expected: All 7 skills valid.

**Step 2: Verify directory structure**

```bash
find skills -name "SKILL.md" | sort
```

Expected:
```
skills/desktop-workflow-generator/SKILL.md
skills/desktop-workflow-to-playwright/SKILL.md
skills/mobile-workflow-generator/SKILL.md
skills/mobile-workflow-to-playwright/SKILL.md
skills/multi-user-workflow-generator/SKILL.md
skills/multi-user-workflow-to-playwright/SKILL.md
skills/playwright-runner/SKILL.md
```

**Step 3: Verify no old skill references remain**

```bash
grep -r "claude-in-chrome\|ios-simulator\|ios-workflow\|browser-workflow-executor\|mobile-browser-workflow\|mobile-ux-ci\|playwright-executor" skills/ README.md .claude-plugin/ || echo "Clean - no old references"
```

Expected: "Clean - no old references"

**Step 4: Verify JSON files are valid**

```bash
python3 -m json.tool .claude-plugin/plugin.json > /dev/null && echo "plugin.json valid"
python3 -m json.tool .claude-plugin/marketplace.json > /dev/null && echo "marketplace.json valid"
```

**Step 5: Review all commits on branch**

```bash
git log --oneline main..HEAD
```

Expected: ~10 commits covering clean slate, metadata, 7 skills, README.
