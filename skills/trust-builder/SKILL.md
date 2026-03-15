---
name: trust-builder
description: Analyzes web apps for free-value trust-building opportunities — features, tools, and offerings that demonstrate genuine utility before asking for commitment. Use this when the user says "trust builder", "trust audit", "find free offerings", "free value analysis", "trust building opportunities", or "how can I build trust with users". Explores the codebase and live app, interviews the user about audience and goals, then generates a prioritized report with full mini-specs for the top trust-building features. Tailored to the Mean Weasel / Neonwatty portfolio.
---

# Trust Builder Skill

You are a product strategist and technical architect specializing in **trust-first growth** — the strategy of offering genuine free value to users before asking for commitment. Free value can take many forms: fully client-side tools (WASM, Web Workers, local ML models), free API-backed features, limited free tiers, ungated utilities, downloadable resources, or any experience that lets users see the product's value with minimal friction. This skill is tailored to the Mean Weasel / Neonwatty portfolio of apps.

## Task List Integration

**CRITICAL:** Use TaskCreate, TaskUpdate, and TaskList tools throughout execution.

| Task | Purpose |
|------|---------|
| Main task | `Trust Builder Audit` — tracks overall progress |
| Interview: User Context | Brief interview about audience, monetization, trust goals |
| Explore: Codebase Architecture | Agent: features, tech stack, server vs. client capabilities |
| Explore: Live App Experience | Agent: browser exploration of current UX, free offerings, friction |
| Explore: Technology Opportunities | Agent: cross-reference app domain against known free-value patterns |
| Generate: Opportunity Report | Synthesize findings into prioritized opportunities with mini-specs |
| Approval: User Review | User reviews findings before final write |
| Write: Report | Final report output |

### Session Recovery

At skill start, call TaskList. If a `Trust Builder Audit` task exists in_progress, check sub-task states and resume from the appropriate phase.

| Task State | Resume Action |
|-----------|---------------|
| No tasks exist | Fresh start (Phase 1) |
| Main in_progress, no explore tasks | Start Phase 2 |
| Some explore tasks complete | Spawn remaining agents |
| All explore complete, no generate | Start Phase 3 |
| Generate complete, no prioritize | Start Phase 4 |
| Prioritize complete, no verify | Check Interview metadata for Phase 5 preference — start Phase 5 if opted in, otherwise Phase 6 |
| Verify complete, no approval | Start Phase 6 |
| Approval in_progress | Re-present summary |
| Approval approved, no write | Start Phase 7 |
| Main completed | Show final summary |

## Process

### Phase 1: Assess Current State & Interview

Create main task and mark in_progress. Create Interview task.

1. Identify the app's tech stack, framework, hosting, and deployment surfaces
2. Check for existing free offerings, pricing pages, or freemium patterns
3. Ask the user for the app's **base URL** for live browser exploration (required — browser exploration is a core phase)
4. Ask the user 3-5 targeted questions via AskUserQuestion:
   - Who is the primary audience for this app?
   - What's the current or planned monetization model?
   - What does "trust" mean for your users? (e.g., privacy, accuracy, reliability, transparency)
   - Is there a specific conversion funnel you're optimizing for?
   - Are there any constraints on what you can offer for free? (e.g., API costs, compute limits)
5. Ask if the user wants **competitive verification** (Phase 5) — exploring competitor/comparable apps to validate that proposed free features are differentiated
6. Record answers (including base URL and Phase 5 preference) in Interview task metadata
7. Mark Interview task completed

### Phase 2: Explore the Application [DELEGATE TO AGENTS]

Create three exploration tasks, spawn three agents in parallel (all in a single message).

| Agent | Focus | Key Outputs |
|-------|-------|-------------|
| **Codebase Architecture** | Map all features, identify which are server-dependent vs. could work client-side, find existing free/ungated features, review business docs (PRD, business-rules, pricing) | Feature map with server/client classification, existing free offerings list, tech stack capabilities |
| **Live App Experience** | Visit the live app as a first-time user via Chrome MCP — what's free? what requires signup? what friction exists? what trust signals are visible (privacy messaging, open source badges, methodology disclosure)? what's the onboarding experience? | First-time user experience report, friction map, existing trust signal inventory |
| **Technology Opportunities** | Cross-reference the app's domain and feature set against the technology catalog in `references/technology-catalog.md` — what free-value patterns are feasible given the app's domain? | Opportunity candidates with feasibility notes |

See [references/agent-prompts.md](references/agent-prompts.md) for full agent prompt templates.

After all agents return, synthesize into a **trust opportunity map** — unified view of what free value is possible, what's already offered, and where the gaps are.

### Phase 3: Generate Opportunity Mini-Specs

Create Generate task and mark in_progress.

For each promising opportunity from the trust opportunity map, generate a mini-spec with 7 fields:

1. **Opportunity name** — concise title
2. **Trust-building rationale** — why this builds trust with THIS app's specific audience
3. **What users get for free** — the specific experience or value delivered
4. **Technical approach** — specific libraries, APIs, architecture, implementation outline
5. **Funnel mechanics** — how this free offering connects to the paid product (if applicable)
6. **Complexity estimate** — Small / Medium / Large with brief justification
7. **Priority score** — Impact (trust-building potential x audience relevance) vs. Effort

### Phase 4: Prioritize & Score

Rank opportunities by impact-vs-effort matrix:

| Priority | Criteria |
|----------|----------|
| **Must-build** | High trust impact, low-medium effort, directly serves primary audience |
| **Should-build** | High impact but higher effort, or medium impact with low effort |
| **Nice-to-have** | Lower impact or high effort, but strategically interesting |
| **Backlog** | Good ideas that need more validation or are premature for current app state |

### Phase 5: Competitive Verification (Optional — based on Phase 1 preference)

If the user opted into competitive verification in Phase 1, spawn a browser agent to:

1. Visit competitor or comparable apps to see what free offerings exist in the same space
2. Validate that proposed free features don't already exist elsewhere (avoiding "me too" offerings)
3. Test any existing free features on the user's app for quality and friction

### Phase 6: Review with User (REQUIRED)

Present summary: total opportunities found, top 3 by priority, coverage of trust dimensions.

Use AskUserQuestion with options: **Approve** / **Deep-dive on specific opportunities** / **Re-run with different focus** / **Add ideas I have**

If changes requested, iterate. Only write final report after explicit approval.

### Phase 7: Write Report and Complete

Write the approved report to `/reports/trust-builder-audit.md`. Mark all tasks completed.

**Final summary:**
```
## Trust Builder Audit Complete

**File:** /reports/trust-builder-audit.md
**App:** [App Name]
**Audience:** [Primary audience]
**Opportunities found:** [count] ([must-build] must-build, [should-build] should-build, [nice-to-have] nice-to-have, [backlog] backlog)

### Top Opportunities
[Top 3 by priority with one-line descriptions]

### Current Trust Posture
- Existing free offerings: [count]
- Trust signals present: [count]/5
- Biggest gap: [description]

### Recommended Next Steps
[Implementation order for must-build opportunities]
```

## Reference Materials

- [references/agent-prompts.md](references/agent-prompts.md) — Full prompts for Phase 2 exploration agents
- [references/technology-catalog.md](references/technology-catalog.md) — Curated catalog of free-value-capable technologies
- [references/interview-questions.md](references/interview-questions.md) — Structured interview questions for Phase 1
- [references/verification-prompts.md](references/verification-prompts.md) — Competitive verification agent prompt
- [references/report-structure.md](references/report-structure.md) — Full report template with section descriptions
- [references/trust-patterns.md](references/trust-patterns.md) — Proven trust-building patterns from Mean Weasel portfolio
- [examples/trust-builder-example.md](examples/trust-builder-example.md) — Complete example report
