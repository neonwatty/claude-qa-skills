# issuectl — Cross-Repo GitHub Issue Command Center

**Date:** 2026-04-06
**Status:** Draft

## Overview

`issuectl` is a CLI tool and web dashboard for managing GitHub issues and PRs across multiple repositories from a single interface. Its distinguishing feature is the ability to "launch" an issue directly into a Claude Code session — auto-creating a branch, gathering issue context (body, comments, referenced files), and opening a new terminal with Claude Code pre-loaded with everything it needs to start working.

## Goals

1. **Unified view** of all issues and PRs across a configurable set of GitHub repos
2. **Full issue management** (create, edit, label, close, comment) without leaving the tool
3. **Full PR visibility** across tracked repos (list, detail, review status)
4. **One-click Claude Code launch** with rich issue context and automatic branch creation
5. **Full lifecycle tracking** from issue creation through PR merge via GitHub labels
6. **Two equal interfaces** — CLI (TUI + subcommands) and web dashboard with full feature parity

## Non-Goals

- Replacing GitHub for code review or PR merging
- Running multiple parallel Claude Code sessions
- Custom priority systems beyond GitHub labels
- Background/autonomous Claude Code sessions

---

## Architecture

### Monorepo Structure

TypeScript monorepo using pnpm workspaces and Turborepo:

```
issuectl/
├── packages/
│   ├── core/                  # @issuectl/core — shared business logic
│   │   ├── src/
│   │   │   ├── github/
│   │   │   │   ├── client.ts       # GitHub API wrapper (uses gh auth token)
│   │   │   │   ├── issues.ts       # List, create, update, close issues
│   │   │   │   ├── pulls.ts        # List PRs, get PR detail
│   │   │   │   ├── labels.ts       # Manage lifecycle labels
│   │   │   │   └── search.ts       # Cross-repo search
│   │   │   ├── config/
│   │   │   │   ├── schema.ts       # Config type definitions + validation
│   │   │   │   ├── reader.ts       # Read/write config YAML
│   │   │   │   └── defaults.ts     # Default values
│   │   │   ├── cache/
│   │   │   │   └── ttl-cache.ts    # JSON file cache with per-entry TTL
│   │   │   ├── launch/
│   │   │   │   ├── context.ts      # Build issue context (body + comments + refs)
│   │   │   │   ├── branch.ts       # Create branch from naming pattern
│   │   │   │   └── terminal.ts     # Open terminal with claude command
│   │   │   └── types.ts            # Shared types
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── cli/                   # @issuectl/cli → published as `issuectl`
│   │   ├── src/
│   │   │   ├── commands/      # Subcommand handlers
│   │   │   ├── tui/           # Interactive TUI components (ink-based)
│   │   │   └── index.ts       # CLI entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                   # @issuectl/web → Next.js dashboard
│       ├── app/
│       │   ├── page.tsx       # Dashboard (repo list)
│       │   ├── [repo]/
│       │   │   ├── page.tsx   # Repo detail (issues + PRs)
│       │   │   ├── issues/[id]/page.tsx
│       │   │   └── pulls/[id]/page.tsx
│       │   └── settings/page.tsx
│       ├── package.json
│       └── next.config.ts
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── tsconfig.base.json
```

### Build Tooling

- **pnpm** — workspace management
- **Turborepo** — build orchestration (core first, cli/web in parallel)
- **tsup** — bundling core and cli packages
- **Next.js** — built-in build for web app

---

## Configuration

Config file: `~/.config/issuectl/config.yaml`

```yaml
repos:
  - name: mean-weasel/seatify
    path: ~/Desktop/seatify
    branch_pattern: "issue-{number}-{slug}"
  - name: mean-weasel/bugdrop
    path: ~/Desktop/bugdrop
  - name: neonwatty/qa-skills
    path: ~/Desktop/qa-skills
  # Repo without local path — tool prompts to clone on launch
  - name: joshuayoes/ios-simulator-mcp

defaults:
  branch_pattern: "issue-{number}-{slug}"

cache:
  ttl: 300  # seconds (5 minutes)
  dir: ~/.config/issuectl/cache/
```

### Repo management commands

```bash
issuectl repo add mean-weasel/seatify                    # Interactive — prompts for path, pattern
issuectl repo add mean-weasel/seatify --path ~/Desktop/seatify  # Inline
issuectl repo remove mean-weasel/seatify
issuectl repo list
issuectl repo update mean-weasel/seatify --path ~/Projects/seatify
```

The web app provides the same repo management via a Settings page.

---

## Authentication

### CLI / Local web app

Piggybacks on the existing `gh` CLI authentication. Retrieves the token via `gh auth token`. No separate login flow — if you're logged into `gh`, `issuectl` just works.

### Deployed web app (future)

Standard GitHub OAuth flow — "Sign in with GitHub" button. The OAuth app requests `repo` scope for full issue/PR access.

---

## Lifecycle Tracking

All state lives in GitHub via labels. No local database.

### Lifecycle labels

| Label | Applied when | Removed when |
|---|---|---|
| `issuectl:deployed` | Claude Code is launched on the issue | Never (historical record) |
| `issuectl:pr-open` | A PR referencing this issue is detected | PR is merged or closed |
| `issuectl:done` | PR is merged and issue is closed | Never |

The tool manages these labels automatically. The `issuectl:deployed` label stays even after completion as an audit trail.

### PR ↔ Issue linking

The tool instructs Claude Code to include `Closes #123` in PR bodies. GitHub's native auto-close handles the rest on merge.

---

## CLI Interface

### Interactive TUI mode

```bash
issuectl    # Opens full-screen TUI
```

Layout:
- **Left panel:** Repo list with issue counts, grouped by repo name
- **Right panel:** Issue list for selected repo (title, labels, age, lifecycle status)
- **Detail view:** Full issue body + comments when an issue is selected
- **Action bar:** `[Enter] Launch` `[c] Create` `[e] Edit` `[l] Label` `[x] Close` `[/] Filter`

Built with [Ink](https://github.com/vadimdemedes/ink) (React for CLI).

### Subcommand mode

```bash
# Issues
issuectl list                              # All issues across tracked repos
issuectl list --repo mean-weasel/seatify   # Filter by repo
issuectl list --label bug                  # Filter by label
issuectl show 123 --repo seatify           # Full issue detail + deployment history
issuectl launch 123 --repo seatify         # Launch Claude Code on issue
issuectl create --repo seatify             # Create issue (opens $EDITOR or inline)
issuectl edit 123 --repo seatify           # Edit issue
issuectl close 123 --repo seatify          # Close issue
issuectl label 123 bug --repo seatify      # Add/remove labels
issuectl comment 123 --repo seatify        # Add comment

# PRs
issuectl pr list                           # All PRs across tracked repos
issuectl pr list --repo seatify            # Filter by repo
issuectl pr show 456 --repo seatify        # PR detail

# Config
issuectl repo add/remove/list/update       # Manage tracked repos
issuectl config                            # Open config in $EDITOR
```

---

## Launch Flow

The core workflow — selecting an issue and launching Claude Code:

1. **Fetch context:** Issue title, body, all comments, and any files referenced in the issue body (by path or GitHub link)
2. **Check history:** If `issuectl:deployed` label exists, show a summary of previous deployment (branch name, linked PR, PR status, review comments) and confirm re-launch
3. **Create branch:** Checkout repo's default branch, pull latest, create `issue-{number}-{slug}` branch
4. **Apply label:** Add `issuectl:deployed` to the issue on GitHub
5. **Open terminal:** Launch a new Ghostty window with:
   ```bash
   cd {repo_path} && git checkout {branch_name} && claude "{assembled_issue_context}"
   ```

### Context assembly

The prompt sent to Claude Code includes:
- Issue title and number
- Full issue body (markdown)
- All comments in chronological order
- Content of any files referenced by path in the issue body (e.g., `src/components/Canvas.tsx` or GitHub file links). Detected by regex matching file path patterns and GitHub blob URLs. If no files are referenced, this section is omitted.
- Recent commits touching files mentioned in the issue (if any are detected), limited to the last 10 relevant commits
- Instruction to include `Closes #{number}` in any PR created

### Repo without local path

If a tracked repo has no `path` configured, the launch flow:
1. Prompts the user with: "Repo `org/name` has no local path. Clone to `~/Desktop/name`? [Y/n/custom path]"
2. Clones the repo to the chosen location
3. Updates the config file with the new path
4. Continues with the normal launch flow

---

## Web Dashboard

Next.js App Router application.

### Pages

**Dashboard (`/`):**
- Repo list with issue and PR counts
- Sorted by most issues (descending)
- Click a repo to navigate to its detail view

**Repo detail (`/[repo]`):**
- Two tabs: Issues and PRs
- Issues tab: list with title, labels, age, lifecycle status, quick actions (launch, label, close)
- PRs tab: list with title, status (open/merged/closed), review status, linked issue

**Issue detail (`/[repo]/issues/[id]`):**
- Rendered markdown body
- Comment thread with ability to add comments
- Deployment history: previous launches, linked PRs, branch names
- Actions: launch to Claude Code, edit, label, close

**PR detail (`/[repo]/pulls/[id]`):**
- PR body, diff stats, review status
- Linked issue
- Merge and CI status

**Settings (`/settings`):**
- Add/remove tracked repos
- Set local paths and branch patterns
- Configure cache TTL

### Launch from web app

- **Local mode:** Web app shells out to open a Ghostty window (same as CLI launch flow)
- **Deployed mode:** "Launch" button generates and displays the CLI command to copy-paste into a local terminal

---

## Caching

Local JSON file cache at `~/.config/issuectl/cache/`:

- Each API response is cached with a timestamp
- TTL is configurable (default: 5 minutes)
- Cache is per-endpoint (issues for repo X, PRs for repo Y, etc.)
- `issuectl list` reads from cache if fresh, fetches from GitHub if stale
- `issuectl list --refresh` bypasses cache
- Cache is shared between CLI and web app (both read/write the same files)

---

## Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│   CLI/TUI   │────▶│  @issuectl/  │────▶│  GitHub API    │
│   or Web    │◀────│    core      │◀────│  (via gh auth) │
└─────────────┘     └──────────────┘     └────────────────┘
                           │
                    ┌──────┴──────┐
                    │  Local      │
                    │  JSON Cache │
                    └─────────────┘
```

Both interfaces call the same `core` functions. The core handles:
- Auth (via `gh auth token`)
- API calls with automatic caching
- Config reading/writing
- Branch creation and terminal launching

---

## Future Considerations (out of scope for v1)

- **Deployed web app** with GitHub OAuth (architecture supports it, implementation deferred)
- **Additional terminal support** beyond Ghostty (iTerm2, VS Code terminal, kitty)
- **Webhook-based updates** instead of polling/TTL cache
- **Parallel Claude Code sessions** across repos
- **Smart prioritization** (auto-sort by age, label severity, activity)
