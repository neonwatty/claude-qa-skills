# Submit Learnings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a three-layer nudge system and `/submit-learnings` skill so QA observations flow upstream as GitHub issues on the plugin repo.

**Architecture:** Modify the reflection protocol to nudge users when learnings accumulate (layers B & C), add a cross-reference in `/review-learnings` (layer A), and create a new `/submit-learnings` skill that filters, drafts, and submits issues via `gh`. One new skill directory, three modified files, one plugin manifest update.

**Tech Stack:** Markdown skill definitions, `gh` CLI for GitHub issue creation

---

## File Structure

| File | Responsibility |
|------|---------------|
| `skills/submit-learnings/SKILL.md` | **Create** — New skill: filter ledger entries, draft issue, submit via `gh`, optional PR |
| `references/reflection-protocol.md` | **Modify** — Add layer B (per-run nudge) and layer C (threshold nudge) |
| `skills/review-learnings/SKILL.md` | **Modify** — Add layer A (`/submit-learnings` suggestion after Phase 3) |
| `README.md` | **Modify** — Add submit-learnings to skills table, bump skill count 13→14 |
| `.claude-plugin/plugin.json` | **Modify** — Update description to mention 6 personas (was 5), bump skill count |

---

### Task 1: Create `/submit-learnings` skill

**Files:**
- Create: `skills/submit-learnings/SKILL.md`

- [ ] **Step 1: Create the skill directory**

```bash
mkdir -p skills/submit-learnings
```

- [ ] **Step 2: Write the skill file**

Create `skills/submit-learnings/SKILL.md` with this exact content:

```markdown
---
name: submit-learnings
description: Filters and submits accumulated QA learnings as a GitHub issue (with optional PR) on the plugin repo. Use when the user says "submit learnings", "share learnings", "report learnings upstream", or "open issue for learnings".
allowed-tools: Read, Glob, Grep, Bash, AskUserQuestion
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
```

- [ ] **Step 3: Verify the file exists and has correct frontmatter**

```bash
head -5 skills/submit-learnings/SKILL.md
```

Expected: the YAML frontmatter block with `name: submit-learnings`.

- [ ] **Step 4: Commit**

```bash
git add skills/submit-learnings/SKILL.md
git commit -m "feat: add /submit-learnings skill for upstream feedback"
```

---

### Task 2: Add nudge layers to reflection protocol

**Files:**
- Modify: `references/reflection-protocol.md:17-25`

The current end of the file (lines 17–25) reads:

```markdown
If you have zero observations, append nothing and say nothing about it.

If you recorded any observations, include a single line in your output:
`[N] observation(s) recorded to .qa-learnings/ledger.md`
```

- [ ] **Step 1: Replace the output instructions**

Replace lines 19–25 of `references/reflection-protocol.md` with:

```markdown
If you have zero observations, append nothing and say nothing about it.

If you recorded any observations, include this line in your output:
`[N] observation(s) recorded to .qa-learnings/ledger.md — run /review-learnings to synthesize, or /submit-learnings to share upstream.`

### Threshold Nudge

After recording observations (or if you recorded none), count the total entries and unique sources in `.qa-learnings/ledger.md` by scanning for `## ` entry headers. If the ledger has **5 or more entries** OR **3 or more unique sources**, append an additional line:

`The learnings ledger has [N] entries from [M] sources. Consider running /submit-learnings to share with plugin maintainers.`

This nudge repeats every run until the user submits or clears the ledger.
```

- [ ] **Step 2: Verify the edit**

Read `references/reflection-protocol.md` and confirm:
- Line containing the observation output now includes the `/review-learnings` and `/submit-learnings` references
- A new `### Threshold Nudge` section exists after the observation output line
- The threshold values are 5 entries OR 3 unique sources

- [ ] **Step 3: Commit**

```bash
git add references/reflection-protocol.md
git commit -m "feat: add per-run and threshold nudges to reflection protocol"
```

---

### Task 3: Add layer A suggestion to `/review-learnings`

**Files:**
- Modify: `skills/review-learnings/SKILL.md:57-58`

The current Phase 3 output template ends around line 57–58 with:

```markdown
### 2. [Cluster Title]
[same format]
```

After that is `## Phase 4: Implement`.

- [ ] **Step 1: Insert the upstream suggestion**

After the Phase 3 output template closing ` ``` ` (after line 58) and before `## Phase 4: Implement`, insert:

```markdown

After the report, include:

> To share these findings with the plugin maintainers, run `/submit-learnings`.

```

- [ ] **Step 2: Verify the edit**

Read `skills/review-learnings/SKILL.md` and confirm:
- The `/submit-learnings` suggestion appears between the end of the Phase 3 output template and Phase 4
- Phase 4 is unchanged

- [ ] **Step 3: Commit**

```bash
git add skills/review-learnings/SKILL.md
git commit -m "feat: add /submit-learnings cross-reference to review-learnings"
```

---

### Task 4: Update README and plugin manifest

**Files:**
- Modify: `README.md:44,76-77`
- Modify: `.claude-plugin/plugin.json:4`

- [ ] **Step 1: Update skill count in README**

Change line 44 of `README.md` from:

```markdown
## Skills (13)
```

to:

```markdown
## Skills (14)
```

- [ ] **Step 2: Add submit-learnings to the Audits & Analysis table**

In `README.md`, after the `review-learnings` row (line 76) and before the blank line before `### Utility` (line 77), insert:

```markdown
| **submit-learnings** | "submit learnings" | Filters and submits QA observations as GitHub issues on the plugin repo |
```

- [ ] **Step 3: Update plugin.json description**

In `.claude-plugin/plugin.json`, update the `description` field (line 4) from:

```json
"description": "QA testing pipeline with 5 personas (smoke, UX, adversarial, performance, mobile) — generate workflow docs, convert to Playwright E2E tests, run interactively or in CI. Supports quantified UX scoring with before/after binary scorecards, Next.js performance profiling, and mobile UX auditing against iOS HIG and Material Design 3 standards.",
```

to:

```json
"description": "QA testing pipeline with 6 personas (smoke, UX, adversarial, security, performance, mobile) — generate workflow docs, convert to Playwright E2E tests, run interactively or in CI. Supports quantified UX scoring with before/after binary scorecards, Next.js performance profiling, and mobile UX auditing against iOS HIG and Material Design 3 standards.",
```

(Changes: `5 personas` → `6 personas`, added `security` to the list.)

- [ ] **Step 4: Verify both files**

Read `README.md` lines 44 and 76–78 to confirm:
- Skill count is 14
- `submit-learnings` row exists in the table

Read `.claude-plugin/plugin.json` line 4 to confirm:
- Description says `6 personas` and includes `security`

- [ ] **Step 5: Commit**

```bash
git add README.md .claude-plugin/plugin.json
git commit -m "docs: add submit-learnings to README and update plugin manifest"
```
