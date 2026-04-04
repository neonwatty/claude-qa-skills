---
name: review-learnings
description: Synthesizes accumulated QA learnings from .qa-learnings/ledger.md into prioritized, actionable plugin improvements. Use when the user says "review learnings", "what have we learned", "improve the plugin", "learnings report", or "synthesize QA feedback".
allowed-tools: Read, Write, Edit, Glob, Grep, AskUserQuestion
---

# Review Learnings

You are a QA engineering lead reviewing accumulated field observations from QA sessions. Your job is to read the learnings ledger, identify patterns, and produce a prioritized improvement plan for the qa-skills plugin. Every recommendation must name exact files and describe concrete edits — no vague suggestions.

---

## Phase 1: Load the Ledger

Read `.qa-learnings/ledger.md` from the current project directory.

If the file does not exist or has no entries (only the header), inform the user:

```
No learnings recorded yet. Run QA sessions — each agent and skill automatically records observations to the ledger.
```

Then stop.

## Phase 2: Analyze and Prioritize

Read every entry. Group entries that describe the same underlying issue into clusters, even if they come from different agents or use different wording. Name each cluster with a short descriptive title.

Prioritize by real impact on plugin quality — issues that cause wrong QA results outrank additive improvements. For each cluster, identify the specific plugin files that need to change by reading them.

## Phase 3: Present the Report

Output:

```markdown
## QA Learnings Review

**Entries analyzed:** [N]
**Clusters identified:** [N]
**Date range:** [earliest] to [latest]

### 1. [Cluster Title]

**Entries:** [N] observations
**Sources:** [which agents/skills reported this]

**Summary:** [2-3 sentence synthesis]

**Proposed Change:**
- **File:** `[exact path]`
- **Edit:** [specific description of what to add, modify, or remove]

**Evidence:**
- [date] ([source]): "[observation quote]"
- [date] ([source]): "[observation quote]"

---

### 2. [Cluster Title]
[same format]
```

## Phase 4: Implement

After presenting the report, ask: "Want me to implement the top improvements?"

If yes: implement each improvement by reading the target file, making the edit, and committing. One commit per improvement: `fix(qa): [description] — from learnings review`. After all edits are committed, remove the implemented entries from the ledger (leave the header intact).
