# Claude QA Skills

QA testing pipeline for [Claude Code](https://claude.ai/code) — generate user workflows, execute them with browser/iOS/mobile/multi-user automation, translate to Playwright E2E tests, and run them in CI.

## Installation

```bash
# Add the marketplace
claude plugin marketplace add neonwatty/claude-qa-skills

# Install to your project
claude plugin install qa-skills@neonwatty-qa
```

## The Pipeline

```
Stage 1: Generate Workflows    → workflows/<platform>-workflows.md
Stage 2: Execute Interactively → screenshots, issue reports
Stage 3: Translate to Playwright → e2e/<platform>-workflows.spec.ts
Stage 4: Run Playwright Tests   → test results, reports
```

1. **Generate** — Explore your codebase and create comprehensive user workflow documents
2. **Execute** — Run each workflow step-by-step with browser automation, capture screenshots, generate HTML reports
3. **Translate** — Convert refined workflows into Playwright E2E spec files
4. **Run** — Execute Playwright tests, report results, optionally auto-fix failures

Each stage works across four platforms: desktop browser, iOS Safari, mobile browser (Chromium), and multi-user concurrent sessions.

## Skills

### Browser (Desktop) — 3 skills

| Skill | Trigger | Stage | Description |
|-------|---------|-------|-------------|
| **browser-workflow-generator** | "generate browser workflows" | 1 | Explores codebase, discovers all routes and interactions, creates numbered workflow docs |
| **browser-workflow-executor** | "run browser workflows" | 2 | Executes workflows via Claude-in-Chrome MCP, captures before/after screenshots, generates HTML reports |
| **browser-workflow-to-playwright** | "convert workflows to playwright" | 3 | Translates workflow markdown into Playwright E2E tests for CI |

### iOS (Mobile Safari) — 3 skills

| Skill | Trigger | Stage | Description |
|-------|---------|-------|-------------|
| **ios-workflow-generator** | "generate ios workflows" | 1 | Explores web app for iOS Safari, creates mobile-specific workflow docs |
| **ios-workflow-executor** | "run ios workflows" | 2 | Executes workflows in iOS Simulator Safari, captures screenshots, generates HTML reports |
| **ios-workflow-to-playwright** | "convert ios workflows to playwright" | 3 | Translates iOS workflows into Playwright tests using WebKit with mobile viewport |

### Mobile Browser (Chromium) — 3 skills

| Skill | Trigger | Stage | Description |
|-------|---------|-------|-------------|
| **mobile-browser-workflow-generator** | "generate mobile browser workflows" | 1 | Explores codebase, creates mobile workflow docs with iOS HIG focus |
| **mobile-browser-workflow-executor** | "run mobile browser workflows" | 2 | Executes workflows in Playwright mobile viewport (393x852) |
| **mobile-browser-workflow-to-playwright** | "convert mobile workflows to playwright" | 3 | Converts mobile workflows to Chromium mobile CI tests |

### Multi-User (Concurrent Sessions) — 3 skills

| Skill | Trigger | Stage | Description |
|-------|---------|-------|-------------|
| **multi-user-workflow-generator** | "generate multi-user workflows" | 1 | Discovers multi-user flows (auth, real-time sync, cross-user features) using parallel exploration agents |
| **multi-user-workflow-executor** | "run multi-user workflows" | 2 | Executes workflows with Chrome MCP (User A) + Playwright MCP (User B), tracks sync timing |
| **multi-user-workflow-to-playwright** | "convert multi-user workflows to playwright" | 3 | Translates to Playwright specs with multiple browser contexts per persona |

### Shared — 2 skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| **playwright-executor** | "run playwright tests" | Runs `e2e/*.spec.ts` files, reports pass/fail/skip, optionally auto-fixes failures |
| **mobile-ux-ci** | "add mobile ux checks" | Generates Playwright tests that detect iOS/mobile UX anti-patterns (hamburger menus, small touch targets, FABs) |

## Workflow

A typical QA cycle looks like:

```bash
# Desktop browser testing
"generate browser workflows"
"run browser workflows"
"convert workflows to playwright"
"run playwright tests browser"

# iOS testing
"generate ios workflows"
"run ios workflows"
"convert ios workflows to playwright"
"run playwright tests ios"

# Multi-user testing
"generate multi-user workflows"
"run multi-user workflows"
"convert multi-user workflows to playwright"
"run playwright tests multi-user"

# Run all tests
"run playwright tests"

# Run and auto-fix failures
"run playwright tests --fix"
```

## Requirements

- **Browser skills**: Claude-in-Chrome MCP
- **iOS skills**: iOS Simulator MCP
- **Mobile browser skills**: Playwright MCP (primary), Claude-in-Chrome MCP (alternative)
- **Multi-user skills**: Claude-in-Chrome MCP + Playwright MCP (dual-browser architecture)
- **Playwright executor**: Playwright installed (`npx playwright install`)

## Local Development

```bash
# Load local version instead of cached plugin
claude --plugin-dir /path/to/claude-qa-skills
```

Don't install the plugin in projects where you're actively developing it — the installed version is cached and won't reflect your local changes until pushed.

## Related Plugins

- [claude-dev-skills](https://github.com/neonwatty/claude-dev-skills) — Developer workflow automation (validation, PR creation)
- [claude-interview-skills](https://github.com/neonwatty/claude-interview-skills) — Structured interviews for feature planning and bug diagnosis
