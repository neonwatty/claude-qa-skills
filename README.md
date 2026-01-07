# Claude Code Skills

Reusable skills for [Claude Code](https://claude.ai/code) that leverage recent improvements in browser automation (Claude-in-Chrome), iOS Simulator control, and interactive user questioning (AskUserQuestion).

## Installation

```bash
# Install globally (all projects)
cp -r ~/Desktop/claude-skills/* ~/.claude/skills/

# Or symlink to a specific project
ln -s ~/Desktop/claude-skills/* /path/to/project/.claude/skills/
```

## Skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| **validator** | "validate", "run checks" | Auto-detects project type, runs linting/tests/type checking |
| **pr-creator** | "create pr" | Commits, creates PR, monitors CI until green |
| **feature-interview** | "interview me about [feature]" | Deep Q&A about requirements, writes implementation plan |
| **bug-interview** | "interview me about [bug]" | Systematic bug diagnosis, writes investigation plan |
| **browser-workflow-generator** | "generate browser workflows" | Explores codebase, creates user workflow docs |
| **browser-workflow-executor** | "run browser workflows" | Executes workflows via Chrome MCP |
| **ios-workflow-generator** | "generate ios workflows" | Explores iOS app, creates workflow docs |
| **ios-workflow-executor** | "run ios workflows" | Executes workflows via iOS Simulator MCP |

## Requirements

- **Browser skills**: [Claude-in-Chrome](https://github.com/anthropics/claude-in-chrome) MCP
- **iOS skills**: iOS Simulator MCP
- **PR creator**: [GitHub CLI](https://cli.github.com/) (`gh`)
