# Trust Builder Skill — Design Spec

> **Date:** 2026-03-15
> **Status:** Draft
> **Plugin:** claude-qa-skills (qa-skills)
> **Skill name:** `trust-builder`

## Problem Statement

SaaS and web app developers need systematic ways to identify opportunities for building trust with users through free-value offerings. The proven pattern — exemplified by Bleep That Sh*t's free in-browser transcription mode — is to offer genuine utility before asking for commitment. But identifying what free value to offer for a given app requires deep analysis of the codebase, the live user experience, the target audience, and the available technologies.

This skill automates that analysis for the Mean Weasel / Neonwatty portfolio of apps.

## Approach

**Trust Audit Pipeline** — a multi-phase skill with parallel agent exploration that analyzes an app through the lens of "what free value can we offer?" It combines codebase exploration, live app browser exploration, and technology pattern matching, informed by a brief user interview about audience and goals.

## Skill Identity

- **Name:** `trust-builder`
- **Directory:** `skills/trust-builder/`
- **Trigger phrases:** "trust builder", "trust audit", "find free offerings", "free value analysis", "trust building opportunities", "how can I build trust with users"

### Persona

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

For each promising opportunity from the trust opportunity map, generate a mini-spec:

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

Use AskUserQuestion: **Approve** / **Deep-dive on specific opportunities** / **Re-run with different focus** / **Add ideas I have**.

If changes requested, iterate. Only write final report after explicit approval.

### Phase 7: Write Report and Complete

Write the approved report to `/reports/trust-builder-audit.md`. Mark all tasks completed.

**Final summary format:**
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

## Report Template

```markdown
# Trust Builder Audit: [App Name]

> Generated [date] | Audience: [primary audience] | Monetization: [current model]

## Executive Summary
[2-3 sentences: what the app does, its current trust posture, and the #1 opportunity]

## Current Trust Signals
| Signal | Status | Notes |
|--------|--------|-------|
| Free offering exists | yes/no | [details] |
| Privacy messaging | yes/no | [details] |
| No-signup experience | yes/no | [details] |
| Transparent methodology | yes/no | [details] |
| Open source | yes/no | [details] |

## Opportunities (Prioritized)

### Must-Build
#### 1. [Opportunity Name]
- **Trust rationale:** [why this builds trust]
- **What users get free:** [the experience]
- **Technical approach:** [libraries, APIs, architecture]
- **Funnel to paid:** [conversion path]
- **Complexity:** [S/M/L] — [justification]

### Should-Build
[same format]

### Nice-to-Have
[same format]

### Backlog
[same format]

## Technology Catalog Matches
[Which technologies from the catalog matched this app's domain]

## Competitive Landscape
[What free offerings exist from competitors, if Phase 5 was run]

## Next Steps
[Recommended implementation order]
```

## Reference Materials

The following reference documents will be created in `skills/trust-builder/references/`:

### 1. `agent-prompts.md`
Full prompts for the three Phase 2 exploration agents:
- **Codebase Architecture Agent** — explores features, tech stack, server/client capabilities, business docs
- **Live App Experience Agent** — browser-based first-time user experience analysis via Chrome MCP (uses base URL from Phase 1)
- **Technology Opportunities Agent** — cross-references app domain against technology catalog

### 2. `technology-catalog.md`
Curated catalog of free-value-capable technologies organized by domain:
- **Media processing:** FFmpeg.wasm, Whisper ONNX, MediaPipe, Web Audio API, Canvas API
- **AI/ML in-browser:** TensorFlow.js, ONNX Runtime Web, @huggingface/transformers, WebLLM
- **Content tools:** PDF.js, client-side export, Canvas/WebGL rendering, document generation
- **Data processing:** IndexedDB, Web Workers, WebAssembly, client-side compute
- **Browser APIs:** Web Speech, Camera/Microphone, FileSystem Access, Web Share, Notifications
- **Free-tier patterns:** Limited usage, time-gated trials, feature-gated freemium, community/personal-use tiers, signup grants
- **Content marketing as trust:** Templates, calculators, guides, checklists, interactive demos, sample data sandboxes
- **Browser extensions:** Chrome/Firefox extensions as free tools that demonstrate value
- **Open-source components:** Publishing reusable parts of the stack as trust signals

### 3. `interview-questions.md`
The structured interview questions for Phase 1, with guidance on when to ask each and how answers inform the analysis:
- Audience identification
- Monetization model
- Trust definition for the specific audience
- Conversion funnel goals
- Free-offering constraints

### 4. `verification-prompts.md`
Prompt for the optional Phase 5 competitive verification agent — how to explore competitor apps, what free offerings to look for, how to compare against the proposed opportunities, and evidence capture guidance.

### 5. `report-structure.md`
Full report template with section descriptions, formatting guidelines, and instructions for the report generation phase.

### 6. `trust-patterns.md`
Catalog of proven trust-building patterns from the Mean Weasel portfolio:
- **Bleep That Sh*t — Browser Mode:** Free in-browser transcription and bleeping via WASM/ONNX. Zero signup, zero server. Files never leave the device. Funnel: browser mode (short clips) -> signup grant (180 free cloud minutes) -> paid subscription.
- **Phone Lunk Alarm — Full Free Demo:** Entire app runs client-side with TensorFlow.js. No account needed. Trust through immediate utility and privacy.
- **ScamShield — Transparent Methodology:** Full disclosure of scoring weights, detection methodology, and explicit limitations. Trust through honesty about what the tool can and cannot do.
- **Meet Camera Overlay — No Backend Architecture:** All processing (MediaPipe segmentation, WebGL rendering) runs locally. Zero data collection. Trust through architectural privacy.
- **Meme Search — Open Source with Stars:** Fully open-source, self-hosted, community-driven (643 GitHub stars). Trust through transparency and community validation.

## Example Output

A complete example report will be created in `skills/trust-builder/examples/trust-builder-example.md`, modeled on what a report would look like if run against Bleep That Sh*t (the reference case), to demonstrate the expected output format and depth.

## Design Decisions

### Why tailored to Mean Weasel / Neonwatty?
The user explicitly chose a portfolio-tailored approach over general-purpose. This allows the skill to leverage proven patterns from the portfolio (especially the Bleep That Sh*t browser-mode playbook) and make recommendations that fit the user's typical tech stack (Next.js, Supabase, Vercel, browser-based AI).

### Why both codebase AND browser exploration?
The codebase reveals what's technically possible; the browser reveals what users actually experience. A feature might exist in code but be buried behind signup walls. Conversely, a marketing page might promise free features that don't actually work well. Both perspectives are needed.

### Why a brief interview before analysis?
The same app could serve different audiences with different trust needs. Privacy matters most to educators; speed matters most to creators; accuracy matters most to enterprise buyers. The interview ensures recommendations are grounded in actual goals, not assumptions.

### Why mini-specs instead of just a list?
The user chose "full mini-specs" over strategic recommendations or technical-only notes. Each opportunity needs enough detail to be actionable — specific libraries, architecture sketches, and funnel mechanics — so the user can feed them directly into a planning/implementation workflow.

### Why free value as the primary lens?
While trust can be built through many signals (social proof, transparency, community), the user's proven success pattern is offering genuine free utility. This keeps the skill focused on the highest-impact strategy rather than diluting across too many dimensions.
