# Claude Code Skills Plugin

Skills for [Claude Code](https://claude.ai/code) that leverage browser automation, iOS Simulator control, and interactive questioning.

## Installation

```bash
# 1. Add the marketplace
/plugin marketplace add neonwatty/claude-skills

# 2. Install to your project
/plugin install claude-skills@claude-skills --scope project
```

## Skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| **validator** | "validate", "run checks" | Auto-detects project type, runs linting/tests/type checking |
| **pr-creator** | "create pr" | Commits, creates PR, monitors CI until green |
| **feature-interview** | "new feature", "plan a feature" | Deep Q&A about requirements, writes implementation plan |
| **bug-interview** | "found a bug", "let's work on this bug" | Systematic bug diagnosis, writes investigation plan |
| **think-through** | "think through", "help me think about" | Socratic exploration of technical ideas (apps, products, tools) |
| **browser-workflow-generator** | "generate browser workflows" | Explores codebase, creates user workflow docs |
| **browser-workflow-executor** | "run browser workflows" | Executes workflows via Chrome MCP |
| **ios-workflow-generator** | "generate ios workflows" | Explores iOS app, creates workflow docs |
| **ios-workflow-executor** | "run ios workflows" | Executes workflows via iOS Simulator MCP |
| **ios-workflow-to-playwright** | "convert ios workflows to playwright" | Converts iOS workflows to WebKit mobile Playwright tests |
| **browser-workflow-to-playwright** | "convert workflows to playwright" | Converts browser workflows to Playwright E2E tests |
| **mobile-ux-ci** | "add mobile ux checks" | Generates Playwright tests that detect iOS/mobile UX anti-patterns |
| **mobile-browser-workflow-generator** | "generate mobile browser workflows" | Explores codebase, creates mobile workflow docs with iOS HIG focus |
| **mobile-browser-workflow-executor** | "run mobile browser workflows" | Executes workflows in Playwright mobile viewport (393x852) |
| **mobile-browser-workflow-to-playwright** | "convert mobile workflows to playwright" | Converts mobile workflows to Chromium mobile CI tests |
| **mobile-browser-workflow-orchestrator** | "run mobile workflow pipeline" | Chains generator → executor → converter with config management |

## Local Development

If you're iterating on these skills locally:

```bash
# Load local version instead of cached plugin
claude --plugin-dir /path/to/claude-skills
```

Don't install the plugin in projects where you're actively developing it—the installed version is cached and won't reflect your local changes until pushed.

## Requirements

- **Browser skills**: Claude-in-Chrome MCP
- **iOS skills**: iOS Simulator MCP
- **Mobile browser skills**: Playwright MCP (primary), Claude-in-Chrome MCP (alternative)
- **PR creator**: [GitHub CLI](https://cli.github.com/) (`gh`)
