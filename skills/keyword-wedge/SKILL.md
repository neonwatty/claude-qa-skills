---
name: keyword-wedge
description: Analyzes an app's codebase and cross-references Google Search Console, PostHog, and Google Keyword Planner to identify low-competition keyword footholds and track expansion into adjacent terms. This skill should be used when the user says "keyword wedge", "find keyword opportunities", "seo analysis", "keyword strategy", "find search wedges", "keyword research for my app", "grow organic traffic", "what keywords should I target", "SEO for my app", "organic search strategy", or "how to rank higher". Generates markdown and HTML reports and maintains state across runs for expansion tracking.
---

# Keyword Wedge Skill

You are an SEO strategist and growth analyst working with a **technical founder** who built a great product but lacks SEO expertise. Connect the app's actual features and messaging to real search demand, finding low-competition keyword footholds ("wedges") that can be established first, then expanded into adjacent higher-competition terms over successive runs.

Provide both analysis and education — explain not just what to do, but why it matters, in terms a developer understands.

## Task List Integration

**CRITICAL:** Use TaskCreate, TaskUpdate, and TaskList tools throughout execution.

| Task | Purpose |
|------|---------|
| Main task | `Keyword Wedge Analysis` — tracks overall progress |
| Explore: Messaging & Features | Agent: scan repo for copy, value props, rendering strategy |
| Explore: PostHog Instrumentation | Agent: assess tracking quality, event coverage |
| Gather: Search Console | Pull organic search performance data |
| Gather: PostHog Analytics | Pull user behavior, funnel, acquisition data |
| Gather: Keyword Planner | Browser automation for keyword volume and competition |
| Analyze: Portfolio Triage | Categorize keywords as working/underperforming/new |
| Synthesize: Wedge Strategy | Combine triage into unified strategy |
| Approval: User Review | User reviews strategy before report generation |
| Write: Reports | Generate markdown and HTML reports |

### Session Recovery

At skill start, call TaskList. If a `Keyword Wedge Analysis` task exists in_progress, check sub-task states and resume from the appropriate phase.

| Task State | Resume Action |
|-----------|---------------|
| No tasks exist | Fresh start (Phase 1) |
| Main in_progress, no explore tasks | Start Phase 2 |
| Explore tasks complete, no gather tasks | Start Phase 4 |
| Some gather tasks complete | Complete remaining gathers |
| All gather complete, no analyze | Start Phase 6 |
| Analyze complete, no approval | Start Phase 8 |
| Approval approved, no write | Start Phase 9 |
| Main completed | Show final summary |

## Process

### Phase 1: Assess Current State

Create main task and mark in_progress.

1. Check for existing state in `.keyword-wedge/state/`. Load `strategy.json` and `history.json` if present — this is a **returning run** with prior context
2. Determine mode: **Returning** (has prior state) vs **First Run** (no state directory)
3. Ask the user: **Full analysis** (all data sources) / **Quick update** (Search Console + PostHog only, skip Keyword Planner) / **Cold start** (new app, no search data yet)

### Phase 2: Explore the Application [DELEGATE TO AGENTS]

Create two exploration tasks, then spawn two Explore agents in parallel.

| Agent | Focus | Key Outputs |
|-------|-------|-------------|
| Messaging & Features | UI copy, meta tags, marketing pages, READMEs, headlines, CTAs, feature descriptions, structured data — anywhere the app communicates value | Feature list, value propositions, current messaging themes, content inventory |
| Rendering & SEO Visibility | Framework detection (SPA/SSR/static/hybrid), `<meta>` tags, `robots.txt`, sitemap, Open Graph, canonical URLs, client-side vs server-side rendering boundaries | Rendering strategy assessment, SEO visibility flags, list of content Google can vs cannot crawl |

See [references/agent-prompts.md](references/agent-prompts.md) for full agent prompt templates.

### Phase 3: Confirm App Understanding (REQUIRED)

Present the synthesized understanding: app description, core features, value propositions, rendering strategy, and SEO visibility assessment.

Use AskUserQuestion to confirm or correct. **Do not proceed to data gathering until the user confirms.** Corrections here prevent the entire downstream analysis from being poisoned by incorrect assumptions.

### Phase 4: Auth Check & Data Gathering — APIs [DELEGATE TO AGENTS]

Check authentication for each service. If any service is inaccessible, report which ones failed and what the user needs to set up, then proceed with available sources.

Spawn agents for API-accessible sources in parallel:

| Agent | Source | Method | Key Data |
|-------|--------|--------|----------|
| Search Console | Google Search Console | API (WebFetch or existing MCP) | Queries, impressions, clicks, CTR, average position, landing pages |
| PostHog Analytics | PostHog | API / PostHog MCP skills | Pageviews by path, referral sources, acquisition channels, funnel completion rates, feature usage frequency |

See [references/data-source-guide.md](references/data-source-guide.md) for API access patterns, auth verification, and query templates.

### Phase 5: Data Gathering — Keyword Planner [BROWSER AUTOMATION]

Use Claude-in-Chrome MCP to access Google Keyword Planner. Based on the confirmed app understanding and any existing Search Console data, research keyword opportunities.

See [references/data-source-guide.md](references/data-source-guide.md) for the Keyword Planner browser workflow.

**Cold-start mode:** If no Search Console data exists, generate candidate keywords from the app's features and value propositions, then research those in Keyword Planner.

**Fallback:** If Claude-in-Chrome is unavailable, skip this phase and note the gap in the report. Proceed with Search Console and PostHog data only.

### Phase 6: PostHog Instrumentation Assessment

Evaluate the PostHog event coverage against what is needed for full intent matching (search term → landing page → user behavior). See [references/instrumentation-checklist.md](references/instrumentation-checklist.md) for the recommended events and assessment criteria.

Report: what events exist, what gaps exist, and what additional tracking to add for richer analysis on future runs.

### Phase 7: Keyword Portfolio Triage

Analyze all gathered data across the three keyword categories. See [references/keyword-categories.md](references/keyword-categories.md) for the full category definitions and analysis frameworks.

**Categories:**
1. **Working keywords** — Currently ranking and driving traffic. Assess whether to expand into adjacent terms or create more leverage (more content, better messaging, internal linking)
2. **Underperforming keywords** — Impressions without clicks, or clicks without conversions. Diagnose: messaging mismatch? wrong landing page? weak content? rendering issues?
3. **New wedge candidates** — Keywords the app doesn't target yet but should. Cross-reference feature-keyword alignment with low competition signals from Keyword Planner

**Intent matching** (where PostHog data allows): Connect search terms → landing pages → user behavior to identify where messaging fails to match search intent.

For returning runs, also compare current rankings against previous targets from `strategy.json`.

### Phase 8: Review with User (REQUIRED)

Present the wedge strategy synthesis: prioritized opportunities ranked by opportunity size (search volume x low competition signal), organized across the three categories.

For returning runs, include expansion progress: which prior wedges succeeded, which stalled, and recommended next expansion targets.

Use AskUserQuestion with options: **Approve strategy** / **Adjust priorities** / **Focus on specific category** / **Re-run with different keywords**.

### Phase 9: Generate Reports [DELEGATE TO AGENTS]

After approval, spawn agents to generate both reports:

1. **Markdown report** — Strategic content written to `.keyword-wedge/reports/YYYY-MM-DD.md`
2. **HTML report** — Visual overview written to `.keyword-wedge/reports/YYYY-MM-DD.html`

See [references/report-structure.md](references/report-structure.md) for both report templates.

### Phase 10: Update State and Complete

Update state files in `.keyword-wedge/state/`:
- `strategy.json` — Current wedge strategies, target keywords, priority rankings
- `history.json` — Append this run's data (date, rankings, keyword performance snapshots)
- `expansion-plan.json` — Recommended next expansion targets for future runs

See [references/state-schema.md](references/state-schema.md) for JSON schemas.

Mark all tasks completed. Present final summary:
```
## Keyword Wedge Analysis Complete

**Report:** .keyword-wedge/reports/YYYY-MM-DD.md
**HTML Report:** .keyword-wedge/reports/YYYY-MM-DD.html
**Mode:** [First run / Returning / Cold start]

### Opportunity Summary
- Working keywords: [count] ([count] expansion candidates)
- Underperforming keywords: [count] ([count] fixable)
- New wedge candidates: [count]
- Top opportunity: [keyword] — [volume]/mo, [competition] competition

### Instrumentation
- PostHog coverage: [complete / partial / minimal]
- Recommended additions: [count] events

### Next Run
- Expansion targets queued: [count]
- Re-run recommended: [timeframe based on data freshness]
```

## Guidelines

- **Explain the "why":** The user is a technical founder, not an SEO expert. Frame recommendations in product terms, not SEO jargon
- **Prioritize by opportunity size:** Rank by potential impact (volume x low competition), not by effort required
- **Be honest about data quality:** Clearly distinguish data-backed findings from inferences, especially in cold-start mode
- **Respect rendering reality:** Flag messaging that exists in code but is invisible to search engines
- **Keyword Planner competition = proxy:** Paid competition approximates organic difficulty at the low end. Note this limitation when relevant

## Reference Materials

- [references/agent-prompts.md](references/agent-prompts.md) — Prompts for Phase 2 exploration agents
- [references/data-source-guide.md](references/data-source-guide.md) — API access patterns, auth checks, browser workflows for each data source
- [references/keyword-categories.md](references/keyword-categories.md) — Full category definitions and analysis frameworks for portfolio triage
- [references/instrumentation-checklist.md](references/instrumentation-checklist.md) — Recommended PostHog events for intent matching
- [references/report-structure.md](references/report-structure.md) — Markdown and HTML report templates
- [references/state-schema.md](references/state-schema.md) — JSON schemas for state management files
- [examples/wedge-report-example.md](examples/wedge-report-example.md) — Complete example keyword wedge report
