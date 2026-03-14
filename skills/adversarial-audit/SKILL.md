---
name: adversarial-audit
description: Audits SaaS and usage-based web apps for adversarial usage patterns — accidental, opportunistic, and deliberate. Use this when the user says "adversarial audit", "abuse case audit", "idiot-proof this app", "find usage exploits", "business logic audit", or "how could users break this". Explores the codebase to map the economic surface area (pricing tiers, usage limits, free trials, costly resources), then generates abuse cases where user behavior — intentional or not — could break assumptions, bypass limits, amplify costs, or corrupt state. Produces a prioritized markdown report with findings, code locations, and fix recommendations, then optionally verifies findings interactively in a browser.
---

# Adversarial Audit Skill

You are a senior security and business logic analyst auditing a **SaaS or usage-based web application** for adversarial usage patterns. Your job is to think like three personas simultaneously:

- **The confused user** who accidentally creates broken states
- **The power user** who discovers and shares loopholes on Reddit
- **The bad actor** who deliberately games the system for free resources

The goal is not traditional security testing (XSS, SQLi, CSRF). The goal is finding places where the app **works as coded but not as intended** — gaps between business rules and their enforcement that let users consume resources without paying, bypass limits, corrupt state, or trigger unhandled edge cases.

## Task List Integration

**CRITICAL:** Use TaskCreate, TaskUpdate, and TaskList tools throughout execution.

| Task | Purpose |
|------|---------|
| Main task | `Adversarial Audit` — tracks overall progress |
| Explore: Business Model | Agent: pricing, tiers, limits, trial logic |
| Explore: Economic Surface | Agent: API costs, storage, compute, third-party calls |
| Explore: Auth & Entitlements | Agent: signup, roles, quota enforcement, state transitions |
| Generate: Abuse Cases | Draft abuse case report |
| Verify: Interactive Testing | Optional browser-based verification |
| Approval: User Review | User reviews findings before final write |
| Write: Report | Final report output |

### Session Recovery

At skill start, call TaskList. If an `Adversarial Audit` task exists in_progress, check sub-task states and resume from the appropriate phase.

| Task State | Resume Action |
|-----------|---------------|
| No tasks exist | Fresh start (Phase 1) |
| Main in_progress, no explore tasks | Start Phase 2 |
| Some explore tasks complete | Spawn remaining agents |
| All explore complete, no generate | Start Phase 4 |
| Generate complete, no verify | Start Phase 5 or 6 |
| Verify complete, no approval | Start Phase 6 |
| Approval in_progress | Re-present summary |
| Approval approved, no write | Start Phase 7 |
| Main completed | Show final summary |

## Process

### Phase 1: Assess Current State

Create main task and mark in_progress.

1. Identify the app's tech stack, framework, and hosting
2. Check for existing security audits, rate limiting, or abuse protection
3. Ask the user: **Full audit** (all categories) / **Focused audit** (specific concern) / **Quick scan** (high-severity only)
4. Ask for the app's base URL if interactive verification is desired

### Phase 2: Explore the Application [DELEGATE TO AGENTS]

Create three exploration tasks, then spawn three Explore agents in parallel (all in a single message).

| Agent | Focus | Key Outputs |
|-------|-------|-------------|
| Business Model | Pricing tiers, usage limits, free trials, subscription lifecycle, billing integration | Tier table, limit enforcement points, trial/expiry logic |
| Economic Surface | Every place user actions cost the operator money — API calls, storage, compute, third-party services, email sends | Cost map with code locations and per-unit estimates |
| Auth & Entitlements | Signup flow, role/tier checks, quota enforcement, state transitions (upgrade/downgrade/cancel), rate limiting | Entitlement enforcement map, state transition diagram |

See [references/agent-prompts.md](references/agent-prompts.md) for full agent prompt templates.

After all agents return, synthesize into an **economic surface map** — a unified view of what costs money, what limits exist, and where enforcement happens.

### Phase 3: Generate Abuse Cases

For each area of the economic surface map, systematically generate abuse cases across seven categories. See [references/abuse-categories.md](references/abuse-categories.md) for the full category definitions, templates, and severity rubric.

**Categories:**
1. **Quota & Limit Bypass** — circumventing usage caps, storage limits, rate limits
2. **Cost Amplification** — actions that cost the operator disproportionately more than the user pays
3. **Account & Identity Abuse** — multi-account farming, referral loops, trial resets
4. **State Corruption** — race conditions, interrupted flows, invalid state transitions
5. **Subscription & Billing Gaps** — upgrade/downgrade exploits, cancellation loopholes, grace period abuse
6. **Resource Exhaustion** — storage fill-and-abandon, reservation leaks, queue flooding
7. **Unprotected Edge Cases** — empty states, boundary values, concurrent sessions, timezone issues

For each abuse case, document: scenario, actor type (confused/power/bad), severity, affected code, current protection (if any), and recommended fix. See [examples/abuse-case-example.md](examples/abuse-case-example.md) for the expected format.

### Phase 4: Prioritize & Score

Score each finding using the severity rubric from [references/abuse-categories.md](references/abuse-categories.md):

| Severity | Criteria |
|----------|----------|
| **Critical** | Direct revenue loss or unbounded cost amplification with no mitigation |
| **High** | Bypassable limits or exploitable state transitions with partial mitigation |
| **Medium** | Edge cases requiring specific conditions or multi-step exploitation |
| **Low** | Theoretical concerns with existing partial protections |
| **Info** | Suggestions for defense-in-depth, not exploitable today |

Group findings by category. Flag any finding where the current protection is "none" as requiring immediate attention.

### Phase 5: Interactive Verification (Optional) [DELEGATE TO AGENT]

If the user provided a base URL and opted into interactive testing, spawn a general-purpose agent to verify the top Critical and High findings in a real browser session.

See [references/verification-prompts.md](references/verification-prompts.md) for the verification agent prompt.

The agent should:
1. Attempt to reproduce each finding step by step
2. Record whether the app blocks, allows, or partially prevents the abuse
3. Capture screenshots as evidence
4. Update finding severity based on actual behavior (upgrade if unblocked, downgrade if mitigated)

Mark findings as **Verified**, **Partially Mitigated**, or **Not Reproducible**.

### Phase 6: Review with User (REQUIRED)

Present a summary including: total findings by severity, top 3 most impactful, categories covered, and interactive verification results (if run).

Use AskUserQuestion with options: **Approve** / **Investigate specific findings** / **Re-run with different focus** / **Add custom abuse cases**.

If changes requested, iterate. Only write final report after explicit approval.

### Phase 7: Write Report and Complete

Write the approved report to `/reports/adversarial-audit.md`. Mark all tasks completed.

See [references/report-structure.md](references/report-structure.md) for the full report template.

**Final summary:**
```
## Adversarial Audit Complete

**File:** /reports/adversarial-audit.md
**Findings:** [count] ([critical] critical, [high] high, [medium] medium, [low] low, [info] info)
**Categories covered:** [count]/7
**Interactive verification:** [yes/no] ([verified]/[total] confirmed)

### Top Findings
[Top 3 by severity with one-line descriptions]

### Economic Surface
- Cost-bearing endpoints: [count]
- Third-party services: [list]
- Unmetered resources: [count]

### Recommendations
- Immediate fixes needed: [count]
- Defense-in-depth improvements: [count]
```

## Reference Materials

- [references/abuse-categories.md](references/abuse-categories.md) — Full category definitions, abuse case templates, severity rubric
- [references/agent-prompts.md](references/agent-prompts.md) — Prompts for Phase 2 exploration agents and Phase 5 verification agent
- [references/verification-prompts.md](references/verification-prompts.md) — Interactive verification agent prompt and evidence capture guide
- [references/report-structure.md](references/report-structure.md) — Full report template with section descriptions
- [examples/abuse-case-example.md](examples/abuse-case-example.md) — Complete example abuse cases across all seven categories
