# Claude QA Skills

QA testing pipeline for [Claude Code](https://claude.ai/code) — generate user workflows, execute them with browser/iOS/mobile automation, and convert to Playwright CI tests.

## Installation

```bash
# Add the marketplace
/plugin marketplace add neonwatty/claude-qa-skills

# Install to your project
/plugin install claude-qa-skills@claude-qa-skills --scope project
```

## The Pipeline

```
Generate → Execute → Playwright
```

1. **Generate** — Explore your codebase and create comprehensive user workflow documents
2. **Execute** — Run each workflow step-by-step with browser, iOS, or mobile automation, capture screenshots, generate HTML reports
3. **Playwright** — Convert refined workflows into Playwright E2E tests for CI

Each stage works across three platforms: desktop browser, iOS Safari, and mobile browser (Chromium).

## Skills

### Browser (Desktop)

| Skill | Trigger | Description |
|-------|---------|-------------|
| **browser-workflow-generator** | "generate browser workflows" | Explores codebase, discovers all routes and interactions, creates numbered workflow docs |
| **browser-workflow-executor** | "run browser workflows" | Executes workflows via Claude-in-Chrome MCP, captures before/after screenshots, generates HTML reports |
| **browser-workflow-to-playwright** | "convert workflows to playwright" | Translates workflow markdown into Playwright E2E tests for CI |

### iOS (Mobile Safari)

| Skill | Trigger | Description |
|-------|---------|-------------|
| **ios-workflow-generator** | "generate ios workflows" | Explores web app for iOS Safari, creates mobile-specific workflow docs |
| **ios-workflow-executor** | "run ios workflows" | Executes workflows in iOS Simulator Safari, captures screenshots, generates HTML reports |
| **ios-workflow-to-playwright** | "convert ios workflows to playwright" | Translates iOS workflows into Playwright tests using WebKit with mobile viewport |

### Mobile Browser (Chromium)

| Skill | Trigger | Description |
|-------|---------|-------------|
| **mobile-browser-workflow-generator** | "generate mobile browser workflows" | Explores codebase, creates mobile workflow docs with iOS HIG focus |
| **mobile-browser-workflow-executor** | "run mobile browser workflows" | Executes workflows in Playwright mobile viewport (393x852) |
| **mobile-browser-workflow-to-playwright** | "convert mobile workflows to playwright" | Converts mobile workflows to Chromium mobile CI tests |
| **mobile-browser-workflow-orchestrator** | "run mobile workflow pipeline" | Chains generator, executor, and converter with config management |

### Mobile UX

| Skill | Trigger | Description |
|-------|---------|-------------|
| **mobile-ux-ci** | "add mobile ux checks" | Generates Playwright tests that detect iOS/mobile UX anti-patterns (hamburger menus, small touch targets, FABs) |

## Workflow

A typical QA cycle looks like:

```bash
# 1. Generate workflows from your codebase
"generate browser workflows"

# 2. Execute and test them (fix issues found)
"run browser workflows"

# 3. Promote to CI tests
"convert workflows to playwright"

# Repeat for iOS
"generate ios workflows"
"run ios workflows"
"convert ios workflows to playwright"

# Or use the mobile orchestrator for the full pipeline
"run mobile workflow pipeline"
```

## Requirements

- **Browser skills**: Claude-in-Chrome MCP
- **iOS skills**: iOS Simulator MCP
- **Mobile browser skills**: Playwright MCP (primary), Claude-in-Chrome MCP (alternative)

## Local Development

```bash
# Load local version instead of cached plugin
claude --plugin-dir /path/to/claude-qa-skills
```

Don't install the plugin in projects where you're actively developing it — the installed version is cached and won't reflect your local changes until pushed.

## Related Plugins

- [claude-dev-skills](https://github.com/neonwatty/claude-dev-skills) — Developer workflow automation (validation, PR creation)
- [claude-interview-skills](https://github.com/neonwatty/claude-interview-skills) — Structured interviews for feature planning and bug diagnosis
