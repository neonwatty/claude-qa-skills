# Claude QA Skills

QA testing pipeline for [Claude Code](https://claude.ai/code) — generate user workflow documentation, convert to Playwright E2E tests, and run them interactively or in CI. Supports desktop, mobile, and multi-user flows with built-in authentication.

## Installation

```bash
# Add the marketplace
claude plugin marketplace add neonwatty/claude-qa-skills

# Install to your project
claude plugin install qa-skills@neonwatty-qa
```

## The Pipeline

```
                                    ┌→  Converters  →  .spec.ts  →  CI (GitHub Actions)
Generators  →  workflow markdown  ──┤
                                    └→  Runner (Playwright MCP)  →  interactive local testing
```

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

```bash
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

```bash
# Load local version instead of cached plugin
claude --plugin-dir /path/to/claude-qa-skills
```

## Related Plugins

- [claude-dev-skills](https://github.com/neonwatty/claude-dev-skills) — Developer workflow automation
- [claude-interview-skills](https://github.com/neonwatty/claude-interview-skills) — Structured interviews for feature planning
