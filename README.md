# Claude QA Skills

QA testing pipeline for [Claude Code](https://claude.ai/code) — generate workflow docs, convert to Playwright E2E tests, run interactively or in CI, and audit apps with six specialized QA agents. Supports desktop, mobile, and multi-user flows with profile-based authentication.

> **Full walkthrough:** [Claude Code Browser Testing and iOS Automation with MCP Workflows](https://neonwatty.com/posts/claude-code-workflow-testing-mcp/)

## Installation

```bash
claude plugin marketplace add neonwatty/qa-skills
claude plugin install qa-skills@neonwatty-qa
```

## Getting Started

```bash
# 1. Install Playwright CLI (one-time, global)
npm install -g @playwright/cli@latest
playwright-cli install

# 2. Create auth profiles for your app (one-time per project)
/setup-profiles
```

`/setup-profiles` opens a headed browser for each user role. You log in manually (handles OAuth, 2FA, etc.) and the session state is saved to `.playwright/profiles/`. All generators, agents, and the runner load these profiles automatically.

## The Pipeline

```
                                              ┌→  Converters  →  .spec.ts  →  CI (GitHub Actions)
/setup-profiles  →  Generators  →  workflow  ─┤
                                    markdown   └→  Runner (Playwright CLI)  →  interactive local testing
```

## Commands

| Command | Description |
|---------|-------------|
| `/setup-profiles` | Create or refresh Playwright auth profiles |
| `/run-qa [smoke\|ux\|adversarial\|all]` | Discover screens, confirm manifest, dispatch QA agents |

> **Framework support:** Route discovery is optimized for **Next.js** (App Router and Pages Router), with support for React Router, Remix, and SvelteKit. Other frameworks fall back to generic route-pattern matching.

## Skills (13)

### Generators

| Skill | Trigger | Description |
|-------|---------|-------------|
| **desktop-workflow-generator** | "generate desktop workflows" | Explores codebase, walks the live app with you, co-authors verifications and edge cases |
| **mobile-workflow-generator** | "generate mobile workflows" | Mobile viewport (393x852), iOS HIG awareness, UX anti-pattern detection |
| **multi-user-workflow-generator** | "generate multi-user workflows" | Per-persona browser contexts, sync verifications |

### Converters

| Skill | Trigger | Description |
|-------|---------|-------------|
| **desktop-workflow-to-playwright** | "convert desktop workflows to playwright" | `e2e/desktop/` — Chromium tests, auth setup, CI workflow |
| **mobile-workflow-to-playwright** | "convert mobile workflows to playwright" | `e2e/mobile/` — Chromium + WebKit, UX anti-pattern assertions |
| **multi-user-workflow-to-playwright** | "convert multi-user workflows to playwright" | `e2e/multi-user/` — per-persona auth, multi-context patterns |

### Runner

| Skill | Trigger | Description |
|-------|---------|-------------|
| **playwright-runner** | "run workflows" | Executes workflow markdown interactively via Playwright CLI |

### Audits & Analysis

| Skill | Trigger | Description |
|-------|---------|-------------|
| **adversarial-audit** | "adversarial audit" | Maps economic surface area, generates abuse cases across 7 categories |
| **resilience-audit** | "resilience audit" | Finds breakage from unexpected user behavior — dead ends, race conditions, interrupted ops |
| **keyword-wedge** | "keyword wedge" | Cross-references codebase with Search Console, PostHog, and Keyword Planner for SEO footholds |
| **trust-builder** | "trust builder" | Finds free-value trust-building opportunities before asking for commitment |
| **review-learnings** | "review learnings" | Synthesizes accumulated QA observations into prioritized plugin improvements |

### Utility

| Skill | Trigger | Description |
|-------|---------|-------------|
| **use-profiles** | Automatic | Loads saved auth profiles before browser automation |

## Agents (6)

Autonomous QA agents that navigate the app, inspect screens, and produce structured reports. Each agent records observations to a learnings ledger after its session.

| Agent | Mindset | What It Catches |
|-------|---------|-----------------|
| **smoke-tester** | Optimistic — follows happy path | Broken flows, 500s, dead links |
| **ux-auditor** | Obsessive — inspects every detail | Inconsistent spacing, missing states, bad copy, accessibility gaps |
| **adversarial-breaker** | Hostile — tries to break things | Auth bypasses, double-submits, state corruption, input abuse |
| **security-auditor** | Systematic — measures security posture | OWASP compliance, header config, session security, injection patterns |
| **mobile-ux-auditor** | Obsessive — mobile-specific | Touch targets, iOS HIG violations, Safari quirks, mobile form UX |
| **performance-profiler** | Quantitative — measures everything | Slow Web Vitals, bundle bloat, DOM health, code anti-patterns |

> The `validation-subagent` is dispatched automatically by generators — not invoked directly.

## What Gets Generated

Each converter produces a self-contained Playwright project:

```
e2e/<platform>/
├── playwright.config.ts       # Auth setup, Vercel bypass headers
├── package.json               # Playwright dependency
├── tests/
│   ├── auth.setup.ts          # storageState authentication
│   └── workflows.spec.ts     # Generated test specs
├── .github/workflows/e2e.yml  # CI for Vercel preview deployments
└── .gitignore
```

## Authentication

**Local:** `/setup-profiles` saves `storageState` per role. Config is committed (`.playwright/profiles.json`), auth data is gitignored (`.playwright/profiles/*.json`).

**CI:** Converters generate `auth.setup.ts` with `process.env` credential references. Uses GitHub secrets for credentials and Vercel deployment protection bypass.

## Local Development

```bash
claude --plugin-dir /path/to/qa-skills
```

## Related Plugins

- [claude-dev-skills](https://github.com/neonwatty/claude-dev-skills) — Developer workflow automation
- [claude-interview-skills](https://github.com/neonwatty/claude-interview-skills) — Structured interviews for feature planning
