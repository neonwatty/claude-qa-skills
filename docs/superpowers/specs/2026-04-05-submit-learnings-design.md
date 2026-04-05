# Submit Learnings — Design Spec

**Goal:** Surface accumulated QA learnings to plugin maintainers via GitHub issues (with optional PR), using a three-layer nudge system that catches users at different engagement levels.

**Architecture:** Three nudge layers (post-review suggestion, per-run reminder, threshold trigger) funnel users toward a new `/submit-learnings` skill that filters, drafts, and submits a GitHub issue on the plugin repo.

---

## Three-Layer Nudge System

### Layer A: Post-review suggestion

After `/review-learnings` presents its synthesized report (end of Phase 3), append:

> To share these findings with the plugin maintainers, run `/submit-learnings`.

No new files — one line added to `skills/review-learnings/SKILL.md`.

### Layer B: Per-run nudge

The reflection protocol currently prints `[N] observation(s) recorded to .qa-learnings/ledger.md` when observations are recorded. Extend that output to:

> [N] observation(s) recorded to .qa-learnings/ledger.md — run `/review-learnings` to synthesize, or `/submit-learnings` to share upstream.

Changed in `references/reflection-protocol.md`.

### Layer C: Threshold nudge

At the end of every QA run (in the reflection protocol), after recording observations, count:
- **Total entries** in the ledger
- **Unique sources** (distinct `[SOURCE]` values)

If **5+ entries OR 3+ unique sources**, append a stronger nudge:

> The learnings ledger has [N] entries from [M] sources. Consider running `/submit-learnings` to share with plugin maintainers.

This repeats every run until the user submits or clears the ledger. No marker file — intentionally persistent.

Changed in `references/reflection-protocol.md`.

---

## `/submit-learnings` Skill

### Frontmatter

```yaml
name: submit-learnings
description: Filters and submits accumulated QA learnings as a GitHub issue (with optional PR) on the plugin repo. Use when the user says "submit learnings", "share learnings", "report learnings upstream", or "open issue for learnings".
allowed-tools: Read, Glob, Grep, Bash, AskUserQuestion
```

### Phase 1: Load & Parse

Read `.qa-learnings/ledger.md`. If the file doesn't exist or has no entries (only the header), inform the user and stop:

> No learnings recorded yet. Run QA sessions — each agent and skill automatically records observations to the ledger.

Parse each entry: extract timestamp, source, observation text, and suggested change.

### Phase 2: Filter

Present all entries grouped by source agent/skill. Ask the user:

> Which observations do you want to include? You can select by number, source, or say "all". Exclude anything that's project-specific and not relevant to the plugin itself.

Wait for user selection.

### Phase 3: Draft Issue

Format selected observations into a structured GitHub issue body:

```markdown
## QA Learnings Submission

**Entries:** [N] from [comma-separated sources]
**Date range:** [earliest entry timestamp] to [latest entry timestamp]
**Submitted by:** [gh api user — login]

### Observations

#### [Source 1]
- [observation 1]
- [observation 2]

#### [Source 2]
- [observation 3]

### Suggested Changes

| File | Change |
|------|--------|
| `[path]` | [description] |
| `[path]` | [description] |
```

Preview the full issue in the terminal. Ask:

> Does this look right? Edit anything you'd like to change, or say "good" to submit.

### Phase 4: Submit Issue

Run `gh issue create` on the plugin repo (`neonwatty/qa-skills`) with:
- **Title:** `learnings: [N] observations from [sources]`
- **Body:** the approved draft
- **Labels:** `learnings` (create if it doesn't exist)

Display the issue URL.

### Phase 5: Optional PR

Ask:

> Want me to also open a PR with the suggested edits? This will fork the repo, create a branch, apply the edits, and open a PR referencing the issue.

If yes:
1. Fork `neonwatty/qa-skills` (if not already forked)
2. Create branch `learnings/[short-description]`
3. Apply each suggested edit from the issue
4. Open PR referencing the issue number
5. Display the PR URL

If no: skip.

### Phase 6: Reflect

Read `references/reflection-protocol.md` and execute it before finishing.

---

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `skills/submit-learnings/SKILL.md` | Create | New skill — full 6-phase flow |
| `references/reflection-protocol.md` | Modify | Add layer B extended nudge line and layer C threshold nudge block |
| `skills/review-learnings/SKILL.md` | Modify | Add `/submit-learnings` mention after Phase 3 report |
| `README.md` | Modify | Add submit-learnings to skills table, update skill count |
| `.claude-plugin/plugin.json` | Modify | Register new skill |

---

## Constraints

- **No new dependencies.** Uses `gh` CLI which is assumed available (same as existing CI workflows).
- **Repo target is hardcoded** to `neonwatty/qa-skills`. Users submit to the plugin's own repo, not their project repo.
- **Filtering is mandatory.** The skill never auto-submits — users always review and select observations.
- **PR is optional.** The issue is the default action; PRs require explicit opt-in because they need fork permissions and are higher friction.
