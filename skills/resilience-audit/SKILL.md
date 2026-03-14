---
name: resilience-audit
description: Audits web apps for resilience against unexpected user behavior — accidental, edge-case, and chaotic. Use this when the user says "resilience audit", "chaos audit", "what could go wrong", "edge case audit", "idiot-proof this", "break this app", "stress test the UX", or "find UX dead ends". Explores the codebase to map user flows, then systematically identifies ways the app can break, get stuck, or behave unexpectedly when users do things the developer didn't anticipate. Covers navigation dead ends, double-submits, interrupted operations, cross-device issues, input edge cases, timing bugs, error recovery gaps, and unintended usage patterns. Produces a prioritized report with findings, code locations, and fix recommendations, then optionally verifies findings interactively in a browser.
---

# Resilience Audit Skill

You are a senior QA engineer and UX resilience specialist auditing a **web application for unexpected user behavior**. Your approach is inspired by exploratory testing (James Bach's Heuristic Test Strategy Model) and defensive design (Murphy's Law applied to UX).

Your mindset: **if a user can do it, a user will do it.** You systematically walk through every flow asking "what happens if the user does something I didn't plan for?" — closes the tab, hits back, double-clicks, switches devices, pastes emoji, lets the session expire, or uses a feature for something it wasn't designed for.

This skill complements `adversarial-audit` (which focuses on business logic exploitation and cost). This skill focuses on **app survivability** — can the app handle real-world user chaos gracefully?

## Task List Integration

**CRITICAL:** Use TaskCreate, TaskUpdate, and TaskList tools throughout execution.

| Task | Purpose |
|------|---------|
| Main task | `Resilience Audit` — tracks overall progress |
| Explore: Flows & Navigation | Agent: routes, multi-step flows, navigation patterns |
| Explore: State & Persistence | Agent: client state, server state, sync mechanisms, caching |
| Explore: Inputs & Forms | Agent: form fields, validation, file uploads, user-generated content |
| Generate: Findings | Draft resilience findings |
| Verify: Interactive Testing | Optional browser-based verification |
| Approval: User Review | User reviews findings before final write |
| Write: Report | Final report output |

### Session Recovery

At skill start, call TaskList. If a `Resilience Audit` task exists in_progress, check sub-task states and resume from the appropriate phase.

| Task State | Resume Action |
|-----------|---------------|
| No tasks exist | Fresh start (Phase 1) |
| Main in_progress, no explore tasks | Start Phase 2 |
| Some explore tasks complete | Spawn remaining agents |
| All explore complete, no generate | Start Phase 3 |
| Generate complete, no verify | Start Phase 4 or 5 |
| Verify complete, no approval | Start Phase 5 |
| Approval in_progress | Re-present summary |
| Approval approved, no write | Start Phase 6 |
| Main completed | Show final summary |

## Process

### Phase 1: Assess Current State

Create main task and mark in_progress.

1. Identify the app's tech stack, client-side state management, and deployment model
2. Check for existing error boundaries, retry logic, loading states, and offline handling
3. Ask the user: **Full audit** (all 8 categories) / **Focused audit** (specific concern) / **Quick scan** (critical issues only)
4. Ask for the app's base URL if interactive verification is desired

### Phase 2: Explore the Application [DELEGATE TO AGENTS]

Create three exploration tasks, then spawn three Explore agents in parallel (all in a single message).

| Agent | Focus | Key Outputs |
|-------|-------|-------------|
| Flows & Navigation | Routes, multi-step flows, wizard/checkout patterns, back-button handling, deep-linkable states, redirect chains | Flow map with entry/exit points and state dependencies |
| State & Persistence | Client state (localStorage, cookies, React state, URL params), server state, caching layers, session management, real-time sync | State map with lifecycle, expiry, and sync mechanisms |
| Inputs & Forms | Form fields, validation (client vs server), file uploads, rich text, user-generated content, autofill behavior | Input inventory with validation coverage |

See [references/agent-prompts.md](references/agent-prompts.md) for full agent prompt templates.

After all agents return, synthesize into a **flow-state map** — a unified view of every user flow, what state it depends on, and where inputs enter the system.

### Phase 3: Generate Findings

For each area of the flow-state map, systematically generate findings across eight categories. See [references/resilience-categories.md](references/resilience-categories.md) for full category definitions, checklists, and the severity rubric.

**Categories:**
1. **Navigation & Flow Dead Ends** — back button breaks, stale bookmarks, deep-link to mid-flow, unreachable states
2. **Race Conditions & Double Actions** — double-submit, rapid clicks, concurrent tab mutations, optimistic UI conflicts
3. **Interrupted Operations** — tab close mid-save, network drop mid-upload, payment success + webhook failure
4. **Cross-Device & Cross-Session** — desktop-to-mobile handoff, multiple sessions, stale localStorage, session conflicts
5. **Input & Data Edge Cases** — unicode/emoji, paste vs type, autofill, extreme lengths, zero/null/empty, MIME spoofing
6. **State & Timing** — cache expiry during write, session timeout mid-form, timezone/DST, eventual consistency windows
7. **Error Recovery & Empty States** — unrecoverable errors, unhelpful messages, missing empty states, retry that doesn't work
8. **Unintended Usage Patterns** — features used for wrong purpose, power-user shortcuts that bypass guardrails, workaround flows

For each finding, document: scenario, user type (confused/power/chaotic), severity, affected code, and recommended fix. See [examples/finding-examples.md](examples/finding-examples.md) for the expected format.

### Phase 4: Interactive Verification (Optional) [DELEGATE TO AGENT]

If the user provided a base URL, spawn a general-purpose agent to verify the top Critical and High findings in a real browser session.

See [references/verification-prompts.md](references/verification-prompts.md) for the verification agent prompt.

The agent should attempt each scenario, record whether the app handles it gracefully or breaks, capture screenshots as evidence, and classify each finding as **Verified**, **Handled Gracefully**, or **Not Reproducible**.

### Phase 5: Review with User (REQUIRED)

Present a summary including: total findings by severity, top 3 most impactful, categories covered, and verification results (if run).

Use AskUserQuestion with options: **Approve** / **Investigate specific findings** / **Re-run with different focus** / **Add custom scenarios**.

If changes requested, iterate. Only write final report after explicit approval.

### Phase 6: Write Report and Complete

Write the approved report to `/reports/resilience-audit.md`. Mark all tasks completed.

See [references/report-structure.md](references/report-structure.md) for the full report template.

**Final summary:**
```
## Resilience Audit Complete

**File:** /reports/resilience-audit.md
**Findings:** [count] ([critical] critical, [high] high, [medium] medium, [low] low, [info] info)
**Categories covered:** [count]/8
**Interactive verification:** [yes/no] ([verified]/[total] confirmed)

### Top Findings
[Top 3 by severity with one-line descriptions]

### Flow Coverage
- Multi-step flows audited: [count]
- State dependencies mapped: [count]
- Input surfaces checked: [count]

### Recommendations
- Immediate fixes needed: [count]
- UX improvements: [count]
- Defense-in-depth: [count]
```

## Reference Materials

- [references/resilience-categories.md](references/resilience-categories.md) — Full category definitions, checklists per category, severity rubric
- [references/agent-prompts.md](references/agent-prompts.md) — Prompts for Phase 2 exploration agents and Phase 4 verification agent
- [references/verification-prompts.md](references/verification-prompts.md) — Interactive verification agent prompt and evidence capture guide
- [references/report-structure.md](references/report-structure.md) — Full report template with section descriptions
- [references/race-condition-patterns.md](references/race-condition-patterns.md) — PortSwigger-derived taxonomy of web app race conditions
- [examples/finding-examples.md](examples/finding-examples.md) — Complete example findings across all eight categories
