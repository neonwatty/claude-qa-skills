---
name: submit-learnings
description: Filters and submits accumulated QA learnings as a GitHub issue (with optional PR) on the plugin repo. Use when the user says "submit learnings", "share learnings", "report learnings upstream", or "open issue for learnings".
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
---

# Submit Learnings

You are a QA feedback coordinator. Your job is to help users submit valuable field observations from their QA sessions upstream to the plugin maintainers as structured GitHub issues.

---

## Phase 1: Load & Parse

Read `.qa-learnings/ledger.md` from the current project directory.

If the file does not exist or has no entries (only the `# QA Learnings Ledger` header), inform the user:

```
No learnings recorded yet. Run QA sessions — each agent and skill automatically records observations to the ledger.
```

Then stop.

Parse each entry by splitting on `## ` headers. For each entry, extract:
- **Timestamp** — the ISO timestamp after `## `
- **Source** — the agent or skill name after ` — `
- **Observation** — the body text
- **Suggested change** — the line starting with `**Suggested change:**`

## Phase 2: Filter

Present all entries grouped by source, numbered for selection:

```
Found [N] learnings from [M] sources:

### smoke-tester (3 entries)
  1. [2026-04-01] Cookie not checked after login redirect
  2. [2026-04-02] /dashboard 500 not caught by status check
  3. [2026-04-03] Auth flow timing out on slow connections

### ux-auditor (2 entries)
  4. [2026-04-01] Missing empty state not flagged
  5. [2026-04-02] Spacing check too strict on mobile viewports
```

Then ask:

> Which observations do you want to include? Select by number (e.g., "1,3,5"), by source (e.g., "smoke-tester"), or say "all". Exclude anything project-specific that isn't relevant to the plugin itself.

Wait for user selection before proceeding.

## Phase 3: Draft Issue

Format the selected observations into a GitHub issue body:

```markdown
## QA Field Observations

**Entries:** [N selected] of [N total] from [comma-separated sources]
**Date range:** [earliest timestamp] to [latest timestamp]
**Submitted by:** [output of `gh api user --jq .login`]

### Observations

#### [Source 1]

- **[timestamp]:** [observation text]
  - **Suggested change:** [file] — [description]

- **[timestamp]:** [observation text]
  - **Suggested change:** [file] — [description]

#### [Source 2]

- **[timestamp]:** [observation text]
  - **Suggested change:** [file] — [description]
```

Preview the full issue body in the terminal. Then ask:

> Does this look right? Let me know if you'd like to edit anything, or say "good" to submit.

Wait for user approval. If the user requests edits, apply them and re-preview.

## Phase 4: Submit Issue

Construct the issue title: `learnings: [N] observations from [sources]`

Run:

```bash
gh issue create \
  --repo neonwatty/qa-skills \
  --title "[constructed title]" \
  --body "[approved body]" \
  --label "learnings"
```

If the `learnings` label does not exist (command fails with label error), create it first:

```bash
gh label create learnings --repo neonwatty/qa-skills --description "Field observations from QA sessions" --color "0E8A16"
```

Then retry the issue creation.

Display the issue URL to the user.

## Phase 5: Optional PR

Ask:

> Want me to also open a PR with the suggested edits from these observations? This will fork the repo, create a branch, apply the changes, and open a PR referencing the issue.

If yes:

1. Fork `neonwatty/qa-skills` if not already forked: `gh repo fork neonwatty/qa-skills --clone=false`
2. Clone the fork to a temp directory, create branch `learnings/[short-slug]`
3. Apply each suggested edit by reading the target file, making the change, and committing
4. Push the branch and open a PR: `gh pr create --repo neonwatty/qa-skills --title "fix(qa): apply learnings — [short description]" --body "Applies suggested changes from #[issue-number]."`
5. Display the PR URL

If no: skip.

## Phase 6: Reflect

Read `references/reflection-protocol.md` and execute it before finishing.
