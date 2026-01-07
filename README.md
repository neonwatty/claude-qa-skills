# Claude Code Skills

A collection of reusable skills for Claude Code that can be used across projects.

## Installation

To use these skills in a project, symlink or copy the skill directories to your project's `.claude/skills/` directory:

```bash
# Symlink all skills
ln -s ~/Desktop/claude-skills/* /path/to/project/.claude/skills/

# Or symlink specific skills
ln -s ~/Desktop/claude-skills/validator /path/to/project/.claude/skills/
```

Or install globally (available in all projects):

```bash
# Copy to global skills directory
cp -r ~/Desktop/claude-skills/* ~/.claude/skills/
```

## Available Skills

### Development Workflow

| Skill | Trigger | Description |
|-------|---------|-------------|
| `validator` | "validate", "run checks" | Auto-detects project type and runs linting, type checking, tests, dead code detection |
| `pr-creator` | "create pr", "make a pr" | Commits changes, creates PR, monitors CI, debugs failures until green |

### Feature Planning

| Skill | Trigger | Description |
|-------|---------|-------------|
| `feature-interview` | "interview me about [feature]" | Deep-dives into feature requirements via Q&A, writes implementation plan |
| `bug-interview` | "interview me about [bug]" | Diagnoses bugs through systematic questioning, writes investigation plan |

### Browser Testing

| Skill | Trigger | Description |
|-------|---------|-------------|
| `browser-workflow-generator` | "generate browser workflows" | Explores codebase and creates comprehensive user workflow documentation |
| `browser-workflow-executor` | "run browser workflows" | Executes workflows from `/workflows/browser-workflows.md` using Chrome MCP |

### iOS Testing

| Skill | Trigger | Description |
|-------|---------|-------------|
| `ios-workflow-generator` | "generate ios workflows" | Explores iOS codebase and creates workflow documentation |
| `ios-workflow-executor` | "run ios workflows" | Executes workflows from `/workflows/ios-workflows.md` using iOS Simulator MCP |

## Skill Structure

Each skill is a directory containing a `SKILL.md` file:

```
skill-name/
└── SKILL.md
```

The `SKILL.md` file has two parts:

1. **YAML frontmatter** with metadata:
   ```yaml
   ---
   name: skill-name
   description: What the skill does and when to trigger it
   ---
   ```

2. **Markdown instructions** that guide Claude's behavior when the skill is active.

## Creating New Skills

1. Create a new directory: `mkdir my-skill`
2. Create `SKILL.md` with frontmatter and instructions
3. Test by asking Claude to perform the skill's task
4. Iterate on the instructions until it works well

## Dependencies

Some skills require external tools:

- **Browser workflows**: Claude-in-Chrome MCP extension
- **iOS workflows**: iOS Simulator MCP
- **PR creator**: GitHub CLI (`gh`)
- **Validator**: Various linters depending on project type

## License

MIT
