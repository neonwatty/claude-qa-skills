# Claude QA Skills

QA testing pipeline for [Claude Code](https://claude.ai/code) — set up authentication profiles, generate user workflow documentation, convert to Playwright E2E tests, and run them interactively or in CI. Includes three specialized QA agents (smoke tester, UX auditor, adversarial breaker) for different levels of testing depth. Supports desktop, mobile, and multi-user flows with built-in profile-based authentication.

> **Read the full walkthrough:** [Claude Code Browser Testing and iOS Automation with MCP Workflows](https://neonwatty.com/posts/claude-code-workflow-testing-mcp/) — how these skills fit into a practical testing workflow.

## Installation

```bash
# Add the marketplace
claude plugin marketplace add neonwatty/qa-skills

# Install to your project
claude plugin install qa-skills@neonwatty-qa
```

## The Pipeline

```
                                              ┌→  Converters  →  .spec.ts  →  CI (GitHub Actions)
/setup-profiles  →  Generators  →  workflow  ─┤
                                    markdown   └→  Runner (Playwright MCP)  →  interactive local testing
```

1. **Authenticate** — Run `/setup-profiles` to create persistent browser profiles for each user role
2. **Generate** — Explore your codebase, then walk through the live app with you step-by-step via Playwright to co-author workflow documentation
3. **Convert** — Translate workflows into self-contained Playwright test projects with auth and CI
4. **Run** — Execute workflows interactively via Playwright MCP, or run generated tests in CI

## Commands

| Command           | Description                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| `/setup-profiles` | Create or refresh Playwright authentication profiles for the current project |
| `/run-qa`         | Discover all screens, confirm manifest with user, dispatch QA agents         |

`/setup-profiles` — Set up persistent auth. Claude opens a headed browser for each role, you log in manually, and the session state is saved locally.

`/run-qa [smoke|ux|adversarial|all]` — The orchestrator. Scans the codebase and workflow files to discover every screen, presents a manifest for you to confirm, then dispatches agents to every screen in the manifest. Nothing gets skipped.

> **Framework support:** Route discovery is currently optimized for **Next.js** (App Router and Pages Router), with additional support for React Router, Remix, and SvelteKit. Other frameworks (Astro, Nuxt, etc.) fall back to generic route-pattern matching, which may require manual additions to the manifest.

```
/run-qa smoke                    # Quick pass/fail on all screens
/run-qa ux --url http://localhost:3000  # Obsessive UX check
/run-qa adversarial              # Try to break everything
/run-qa all                      # Full QA suite
```

## Skills

### Profiles — 1 skill

| Skill            | Trigger                                           | Description                                         |
| ---------------- | ------------------------------------------------- | --------------------------------------------------- |
| **use-profiles** | Automatic when `.playwright/profiles.json` exists | Loads saved auth profiles before browser automation |

### Generators — 3 skills

| Skill                             | Trigger                         | Description                                                                                          |
| --------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **desktop-workflow-generator**    | "generate desktop workflows"    | Explores codebase, walks the live app with you step-by-step, co-authors verifications and edge cases |
| **mobile-workflow-generator**     | "generate mobile workflows"     | Same with mobile viewport (393x852), iOS HIG awareness, and UX anti-pattern detection                |
| **multi-user-workflow-generator** | "generate multi-user workflows" | Interviews about personas, walks the app with per-persona contexts, co-authors sync verifications    |

### Converters — 3 skills

| Skill                                 | Trigger                                      | Description                                                                                     |
| ------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **desktop-workflow-to-playwright**    | "convert desktop workflows to playwright"    | Generates `e2e/desktop/` project with Chromium tests, auth setup, CI workflow                   |
| **mobile-workflow-to-playwright**     | "convert mobile workflows to playwright"     | Generates `e2e/mobile/` project with Chromium + WebKit mobile tests, UX anti-pattern assertions |
| **multi-user-workflow-to-playwright** | "convert multi-user workflows to playwright" | Generates `e2e/multi-user/` project with per-persona auth, multi-context test patterns          |

### Runner — 1 skill

| Skill                 | Trigger         | Description                                                                   |
| --------------------- | --------------- | ----------------------------------------------------------------------------- |
| **playwright-runner** | "run workflows" | Executes workflow markdown interactively via Playwright MCP with auth support |

## Agents

Three specialized QA agents for different levels of testing depth. Agents are autonomous — they navigate the app, inspect screens, and produce structured reports.

| Agent                   | Trigger                          | Mindset                                  | What It Catches                                                          |
| ----------------------- | -------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| **smoke-tester**        | "smoke test the workflows"       | Optimistic — follows happy path          | Broken flows, 500s, dead links                                           |
| **ux-auditor**          | "audit the UX of this page"      | Obsessive — inspects every detail        | Inconsistent spacing, missing states, bad error copy, accessibility gaps |
| **adversarial-breaker** | "try to break the checkout flow" | Hostile — actively tries to break things | Auth bypasses, double-submits, state corruption, input abuse             |

When run via `/run-qa`, agents receive resolved auth profiles from the orchestrator. When run standalone, agents use the profile specified in the spawn prompt or skip auth if none is provided.

## Workflow

A typical QA cycle:

```bash
# First-time setup: create auth profiles
/setup-profiles

# Desktop testing
"generate desktop workflows"
"convert desktop workflows to playwright"
"run workflows desktop"

# Mobile testing
"generate mobile workflows"
"convert mobile workflows to playwright"
"run workflows mobile"

# Multi-user testing (one profile per persona)
"generate multi-user workflows"
"convert multi-user workflows to playwright"
"run workflows multi-user"
```

## What Gets Generated

Each converter produces a self-contained Playwright project:

```
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
```

## Authentication

This plugin supports two authentication paths:

### Local / Interactive (Profiles)

Run `/setup-profiles` once per project. All generators and the runner automatically detect `.playwright/profiles.json` and load saved sessions before navigating. No repeated logins.

Per-project files:

| File                          | Committed?      | Purpose                              |
| ----------------------------- | --------------- | ------------------------------------ |
| `.playwright/profiles.json`   | Yes             | Role names, login URLs, descriptions |
| `.playwright/profiles/*.json` | No (gitignored) | storageState auth data               |

### CI (Environment Variables)

Converters generate `auth.setup.ts` with `process.env` credential references for headless CI:

- **CI** uses GitHub secrets for credentials and Vercel deployment protection bypass
- **Multi-user** supports arbitrary persona counts with per-persona credentials

## Requirements

- **Playwright MCP** — Bundled with this plugin via `.mcp.json` (auto-configured on install)
- **Playwright** — `npx playwright install` in generated test projects

No other MCP dependencies required.

> **Already have Playwright MCP?** If you have Playwright MCP configured in your global `~/.claude/settings.json` or project `.mcp.json`, the plugin's bundled server may create a duplicate. In that case, delete the plugin's `.mcp.json` file (located in the plugin's install directory) to use your existing server instead.

## Local Development

```bash
# Load local version instead of cached plugin
claude --plugin-dir /path/to/qa-skills
```

## Related Plugins

- [claude-dev-skills](https://github.com/neonwatty/claude-dev-skills) — Developer workflow automation
- [claude-interview-skills](https://github.com/neonwatty/claude-interview-skills) — Structured interviews for feature planning
