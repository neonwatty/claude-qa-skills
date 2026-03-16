# QA Skills v2: Playwright-Only Rewrite Design

**Date**: 2026-03-08
**Status**: Approved
**Branch**: Clean slate branch in `claude-qa-skills`

## Goal

Replace the current 14-skill QA pipeline (spanning 3 MCP dependencies) with 7 focused skills that use Playwright MCP exclusively. Bake in storageState authentication and CI generation from the start.

## Pipeline

```
                                    ┌→  Converters  →  .spec.ts  →  CI (GitHub Actions)
Generators  →  workflow markdown  ──┤
                                    └→  Runner (Playwright MCP)  →  interactive local testing
```

Three stages, two output paths from the same workflow markdown source of truth.

## Skills

### Generators (3)

All generators share a common exploration flow:

1. **Code exploration first**: Read/Grep/Glob + LSP (if available) to discover routes, components, API endpoints, auth middleware, layout structures
2. **Ask about live crawl**: After code exploration, ask the user if they want to supplement with a Playwright MCP crawl of the running app
3. **Output**: Numbered workflow markdown to `/workflows/`

**Workflow markdown format** (shared):

```markdown
## Workflow 1: User Login and Dashboard
<!-- auth: required -->

1. Navigate to /login
   - Expected: Login form with email and password fields
2. Fill email field with test credentials
   - Expected: Field accepts input
3. Submit login form
   - Expected: Redirect to /dashboard, heading "Dashboard" visible
```

**Multi-user workflow format**:

```markdown
## Workflow 3: Collaborative Document Editing
<!-- auth: required -->
<!-- personas: host, guest1, guest2 -->

1. [Host] Create a new document
   - Expected: Document created, share link available
2. [Guest1] Open share link
   - Expected: Document visible in read-only mode
3. [Host] Grant edit access to Guest1
   - Expected: Guest1 sees edit controls appear
4. [Guest2] Open share link
   - Expected: Document visible in read-only mode, Guest1's edits visible
```

#### desktop-workflow-generator

- Discovers all routes, page components, forms, navigation flows
- Outputs `/workflows/desktop-workflows.md`

#### mobile-workflow-generator

- Focuses on responsive breakpoints, mobile-specific components, touch interactions
- Flags iOS HIG concerns (touch target sizes, navigation patterns, input handling)
- Outputs `/workflows/mobile-workflows.md`

#### multi-user-workflow-generator

- **Interviews the user first**: What personas exist? What are their credentials? Do test accounts need to be created? Where should storageState files live?
- Explores codebase for role-gated routes, RLS policies, real-time features (WebSocket/SSE), collaborative flows
- Supports arbitrary persona counts (not limited to admin/user pairs)
- Outputs `/workflows/multi-user-workflows.md`

### Converters (3)

All converters read workflow markdown and produce a self-contained Playwright project.

**Common output structure**:

```
e2e/<platform>/
├── playwright.config.ts
├── package.json
├── tests/
│   ├── auth.setup.ts
│   └── workflows.spec.ts
├── .github/
│   └── workflows/
│       └── e2e.yml
└── .gitignore
```

**Common behavior**:

- Always generate `auth.setup.ts` with `process.env.TEST_EMAIL` / `TEST_PASSWORD` placeholders and storageState output to `playwright/.auth/user.json`
- Always wire `dependencies: ['setup']` in config
- Always include `extraHTTPHeaders` with `x-vercel-protection-bypass` env var reference
- Always generate GitHub Actions workflow for Vercel preview deployment triggers
- Use Playwright recommended locator strategies (`getByRole`, `getByLabel`, `getByText`)

#### desktop-workflow-to-playwright

- Output: `/e2e/desktop/`
- Config: Chromium project, default viewport
- 1:1 mapping of workflow steps to Playwright actions

#### mobile-workflow-to-playwright

- Output: `/e2e/mobile/`
- Config: Two projects — Chromium mobile (393x852) and WebKit mobile (393x852)
- **UX anti-pattern assertions baked into workflow tests** as `test.step()` blocks:
  - Touch targets < 44px
  - Hamburger menus instead of tab bars
  - Hover-dependent interactions
  - Text smaller than 16px in inputs (triggers iOS zoom)

#### multi-user-workflow-to-playwright

- Output: `/e2e/multi-user/`
- Per-persona setup files (e.g., `admin.setup.ts`, `user.setup.ts`) each saving to `playwright/.auth/<persona>.json`
- Per-persona env vars: `<PERSONA>_EMAIL`, `<PERSONA>_PASSWORD`
- `multi-user-tests` project with `dependencies` on all persona setups and **no** project-level storageState
- Tests use `{ browser }` fixture, create `browser.newContext({ storageState })` per persona
- CI workflow includes env vars for all persona credentials

### Runner (1)

#### playwright-runner

- **MCP-first execution**: Uses Playwright MCP to walk through workflows step-by-step
- Reads workflow markdown from `/workflows/`
- Executes each step interactively: navigate, click, fill, assert
- Reports pass/fail per step with screenshots on failure
- **Auth handling**: Checks for `<!-- auth: required -->`, asks user how to authenticate (provide credentials, existing storageState, or persistent profile)
- **Multi-user support**: Manages separate Playwright contexts per persona
- **On failure**: Claude inspects page state, takes snapshots, flags issue or attempts fix

## Authentication (Cross-Cutting)

### Converters

Always generate auth scaffolding:

- `auth.setup.ts` with `process.env` credential references
- storageState output to `playwright/.auth/`
- `dependencies: ['setup']` wiring
- Multi-user: per-persona setup files and auth JSON files

### Runner

Interactive auth before workflow execution:

- Detects `<!-- auth: required -->` in workflow markdown
- Asks user: provide credentials, use existing storageState JSON, or use `--user-data-dir` persistent profile
- Multi-user: sets up separate authenticated context per persona

### CI

Every converter generates `.github/workflows/e2e.yml`:

- Triggers on Vercel preview deployment success (`deployment_status` event)
- `x-vercel-protection-bypass` header via `VERCEL_AUTOMATION_BYPASS_SECRET` env var
- `x-vercel-set-bypass-cookie: samesitenone` header for subsequent navigations
- Credential env vars from GitHub secrets
- Playwright install step
- Report artifact upload

## Skill Tool Dependencies

| Skill | Tools |
|---|---|
| desktop-workflow-generator | Read, Grep, Glob, Task (Explore agents), LSP, Playwright MCP (optional), AskUserQuestion |
| mobile-workflow-generator | Read, Grep, Glob, Task (Explore agents), LSP, Playwright MCP (optional), AskUserQuestion |
| multi-user-workflow-generator | Read, Grep, Glob, Task (Explore agents), LSP, Playwright MCP (optional), AskUserQuestion |
| desktop-workflow-to-playwright | Read, Write, Glob |
| mobile-workflow-to-playwright | Read, Write, Glob |
| multi-user-workflow-to-playwright | Read, Write, Glob |
| playwright-runner | Playwright MCP (all tools), Read, AskUserQuestion |

**Single MCP dependency**: Playwright MCP. No Claude-in-Chrome. No iOS Simulator.

## Repo Structure

```
claude-qa-skills/
├── .claude-plugin/
│   ├── plugin.json              # namespace: qa-skills, version: 2.0.0
│   └── marketplace.json
├── skills/
│   ├── desktop-workflow-generator/
│   │   └── SKILL.md
│   ├── mobile-workflow-generator/
│   │   └── SKILL.md
│   ├── multi-user-workflow-generator/
│   │   └── SKILL.md
│   ├── desktop-workflow-to-playwright/
│   │   └── SKILL.md
│   ├── mobile-workflow-to-playwright/
│   │   └── SKILL.md
│   ├── multi-user-workflow-to-playwright/
│   │   └── SKILL.md
│   └── playwright-runner/
│       └── SKILL.md
├── scripts/
│   └── validate-skills.sh
├── README.md
├── LICENSE
└── package.json
```

## User's Target Repo After Using Skills

```
their-app/
├── workflows/
│   ├── desktop-workflows.md
│   ├── mobile-workflows.md
│   └── multi-user-workflows.md
├── e2e/
│   ├── desktop/
│   │   ├── playwright.config.ts
│   │   ├── package.json
│   │   ├── tests/
│   │   │   ├── auth.setup.ts
│   │   │   └── workflows.spec.ts
│   │   └── .github/workflows/e2e.yml
│   ├── mobile/
│   │   ├── playwright.config.ts
│   │   ├── package.json
│   │   ├── tests/
│   │   │   ├── auth.setup.ts
│   │   │   └── workflows.spec.ts
│   │   └── .github/workflows/e2e.yml
│   └── multi-user/
│       ├── playwright.config.ts
│       ├── package.json
│       ├── tests/
│       │   ├── admin.setup.ts
│       │   ├── user.setup.ts
│       │   └── workflows.spec.ts
│       └── .github/workflows/e2e.yml
└── ...
```

## Dependencies

**Required**: Playwright MCP (via Claude Code marketplace or `@playwright/mcp`)
**Removed**: Claude-in-Chrome MCP, iOS Simulator MCP
