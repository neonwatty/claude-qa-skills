# Report Structure

Templates for both markdown and HTML keyword wedge reports.

## Markdown Report Template

Written to `.keyword-wedge/reports/YYYY-MM-DD.md`.

```markdown
# Keyword Wedge Report

**App:** [App name]
**Date:** [Date]
**Mode:** [First run / Returning (run #N) / Cold start]
**Data sources:** [Search Console: Yes/No] [PostHog: Yes/No] [Keyword Planner: Yes/No]

## Executive Summary

**Keyword portfolio:** [N] keywords analyzed
| Category | Count | Top opportunity |
|----------|-------|-----------------|
| Working | [N] | [keyword] — position [X], [N] clicks/mo |
| Underperforming | [N] | [keyword] — [diagnosis] |
| New wedge candidates | [N] | [keyword] — [volume]/mo, Low competition |

**Top 3 opportunities by size:**
1. [KW-X-XXX] [Keyword] — Opportunity score: [N] — [one-line recommendation]
2. [KW-X-XXX] [Keyword] — Opportunity score: [N] — [one-line recommendation]
3. [KW-X-XXX] [Keyword] — Opportunity score: [N] — [one-line recommendation]

**Expansion progress** (returning runs only):
- Prior targets: [N]
- Improved: [N] (avg position change: [+/-X])
- Stalled: [N]
- Declined: [N]

## App Understanding

**Description:** [1-2 sentence app description confirmed with user]

**Core value propositions:**
1. [Value prop 1]
2. [Value prop 2]
3. [Value prop 3]

**Rendering strategy:** [SPA / SSR / SSG / Hybrid]
**SEO visibility:** [X]% of content is crawlable
**Flagged issues:** [content that exists but search engines cannot see]

## Data Source Summary

### Google Search Console
- Total impressions (90 days): [N]
- Total clicks (90 days): [N]
- Average CTR: [X]%
- Queries tracked: [N]
- Top query: [keyword] — [N] impressions, position [X]

### PostHog
- Instrumentation coverage: [Complete / Partial / Minimal]
- Organic search sessions (90 days): [N]
- Top landing page: [path] — [N] views
- Average bounce rate (organic): [X]%

### Google Keyword Planner
- Keywords researched: [N]
- Low competition keywords found: [N]
- Keyword clusters identified: [N]

## Working Keywords

[For each working keyword, use template from keyword-categories.md]

### Summary
- Keywords holding position 1-3: [N]
- Keywords with expansion potential: [N]
- Keywords needing content reinforcement: [N]

## Underperforming Keywords

[For each underperforming keyword, use template from keyword-categories.md]

### Summary
- Fixable with messaging changes: [N]
- Require structural changes: [N]
- Recommended to abandon: [N]

## New Wedge Candidates

[For each candidate, use template from keyword-categories.md, ordered by opportunity score]

### Summary
- Total candidates: [N]
- Strong feature alignment: [N]
- With expansion clusters: [N]

## Wedge Expansion Roadmap

### Recommended sequence:
1. **[Keyword]** — Entry wedge ([volume]/mo, Low competition)
   → [Adjacent keyword 1] ([volume]/mo, Medium)
   → [Target keyword] ([volume]/mo, High)

2. **[Keyword]** — Entry wedge ([volume]/mo, Low competition)
   → [Adjacent keyword 1] ([volume]/mo, Medium)

### Theme clusters:
[Group keywords by semantic theme — which clusters represent the app's natural territory]

## PostHog Instrumentation Recommendations

[Assessment from instrumentation-checklist.md]

## Intent Matching Findings

[Where data allows: which search terms lead to which pages lead to which user behaviors]

| Search term | Landing page | Bounce rate | Feature engaged | Converted |
|------------|-------------|-------------|-----------------|-----------|
| [term] | [page] | [X]% | [feature or "bounced"] | [Yes/No] |

## Recommendations Summary

### Immediate Actions (Messaging changes)
1. [KW-X-XXX] — [specific action]
2. ...

### Content Creation (New pages/posts needed)
1. [KW-N-XXX] — [what to create and why]
2. ...

### Structural Improvements (Code/rendering changes)
1. [specific rendering or technical SEO fix]
2. ...

### Instrumentation Additions (PostHog events to add)
1. [event] — [why it matters for future analysis]
2. ...
```

## HTML Report Template

Written to `.keyword-wedge/reports/YYYY-MM-DD.html`. Provides a visual overview with charts and tables.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Keyword Wedge Report — [App Name] — [Date]</title>
  <style>
    :root {
      --bg: #0f172a; --surface: #1e293b; --border: #334155;
      --text: #e2e8f0; --muted: #94a3b8; --accent: #38bdf8;
      --green: #4ade80; --yellow: #fbbf24; --red: #f87171; --blue: #60a5fa;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; padding: 2rem; max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.3rem; margin: 2rem 0 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
    h3 { font-size: 1.1rem; margin: 1.5rem 0 0.5rem; }
    .meta { color: var(--muted); margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin: 1rem 0; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; }
    .card-label { font-size: 0.85rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .card-value { font-size: 2rem; font-weight: 700; margin: 0.25rem 0; }
    .card-detail { font-size: 0.9rem; color: var(--muted); }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border); }
    th { color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
    tr:hover { background: rgba(56, 189, 248, 0.05); }
    .badge { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 12px; font-size: 0.8rem; font-weight: 600; }
    .badge-working { background: rgba(74, 222, 128, 0.15); color: var(--green); }
    .badge-underperforming { background: rgba(251, 191, 36, 0.15); color: var(--yellow); }
    .badge-wedge { background: rgba(96, 165, 250, 0.15); color: var(--blue); }
    .badge-low { background: rgba(74, 222, 128, 0.15); color: var(--green); }
    .badge-medium { background: rgba(251, 191, 36, 0.15); color: var(--yellow); }
    .badge-high { background: rgba(248, 113, 113, 0.15); color: var(--red); }
    .opportunity-bar { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; margin-top: 0.5rem; }
    .opportunity-fill { height: 100%; background: var(--accent); border-radius: 4px; }
    .expansion-path { padding: 1rem; background: var(--surface); border-left: 3px solid var(--accent); margin: 0.5rem 0; border-radius: 0 8px 8px 0; }
    .expansion-step { display: flex; align-items: center; gap: 0.5rem; margin: 0.25rem 0; }
    .expansion-arrow { color: var(--muted); }
    .section { margin-bottom: 2rem; }
  </style>
</head>
<body>
  <h1>Keyword Wedge Report</h1>
  <div class="meta">
    <strong>[App Name]</strong> — [Date] — Mode: [First run / Returning / Cold start]
  </div>

  <!-- Summary Cards -->
  <div class="grid">
    <div class="card">
      <div class="card-label">Working Keywords</div>
      <div class="card-value" style="color: var(--green)">[N]</div>
      <div class="card-detail">[N] with expansion potential</div>
    </div>
    <div class="card">
      <div class="card-label">Underperforming</div>
      <div class="card-value" style="color: var(--yellow)">[N]</div>
      <div class="card-detail">[N] fixable with messaging</div>
    </div>
    <div class="card">
      <div class="card-label">New Wedge Candidates</div>
      <div class="card-value" style="color: var(--blue)">[N]</div>
      <div class="card-detail">Top: [keyword] ([volume]/mo)</div>
    </div>
    <div class="card">
      <div class="card-label">PostHog Coverage</div>
      <div class="card-value">[Complete/Partial/Minimal]</div>
      <div class="card-detail">[N] events to add</div>
    </div>
  </div>

  <!-- Top Opportunities -->
  <h2>Top Opportunities</h2>
  <table>
    <thead>
      <tr><th>Keyword</th><th>Category</th><th>Volume</th><th>Competition</th><th>Opportunity Score</th><th>Action</th></tr>
    </thead>
    <tbody>
      <!-- Repeat for each top opportunity -->
      <tr>
        <td>[keyword]</td>
        <td><span class="badge badge-wedge">New Wedge</span></td>
        <td>[volume]/mo</td>
        <td><span class="badge badge-low">Low</span></td>
        <td>
          [score]
          <div class="opportunity-bar"><div class="opportunity-fill" style="width: [percent]%"></div></div>
        </td>
        <td>[recommendation]</td>
      </tr>
    </tbody>
  </table>

  <!-- Expansion Roadmap -->
  <h2>Expansion Roadmap</h2>
  <!-- Repeat for each wedge path -->
  <div class="expansion-path">
    <div class="expansion-step">
      <span class="badge badge-low">Entry</span>
      <strong>[keyword]</strong> — [volume]/mo
    </div>
    <div class="expansion-step">
      <span class="expansion-arrow">→</span>
      <span class="badge badge-medium">Level 2</span>
      [adjacent keyword] — [volume]/mo
    </div>
    <div class="expansion-step">
      <span class="expansion-arrow">→</span>
      <span class="badge badge-high">Target</span>
      [target keyword] — [volume]/mo
    </div>
  </div>

  <!-- Working Keywords Detail -->
  <h2>Working Keywords</h2>
  <table>
    <thead>
      <tr><th>Keyword</th><th>Position</th><th>Trend</th><th>Impressions</th><th>CTR</th><th>Recommendation</th></tr>
    </thead>
    <tbody>
      <!-- rows -->
    </tbody>
  </table>

  <!-- Underperforming Keywords Detail -->
  <h2>Underperforming Keywords</h2>
  <table>
    <thead>
      <tr><th>Keyword</th><th>Position</th><th>Impressions</th><th>CTR</th><th>Diagnosis</th><th>Fix</th></tr>
    </thead>
    <tbody>
      <!-- rows -->
    </tbody>
  </table>

  <!-- New Wedge Candidates Detail -->
  <h2>New Wedge Candidates</h2>
  <table>
    <thead>
      <tr><th>Keyword</th><th>Volume</th><th>Competition</th><th>Feature Alignment</th><th>Score</th><th>Content to Create</th></tr>
    </thead>
    <tbody>
      <!-- rows -->
    </tbody>
  </table>

  <!-- Intent Matching (if data available) -->
  <h2>Intent Matching</h2>
  <table>
    <thead>
      <tr><th>Search Term</th><th>Landing Page</th><th>Bounce Rate</th><th>Feature Engaged</th><th>Converted</th></tr>
    </thead>
    <tbody>
      <!-- rows -->
    </tbody>
  </table>

  <!-- PostHog Instrumentation -->
  <h2>Instrumentation Status</h2>
  <div class="grid">
    <!-- cards for each instrumentation area -->
  </div>

  <!-- Data Sources -->
  <h2>Data Sources</h2>
  <div class="grid">
    <div class="card">
      <div class="card-label">Search Console</div>
      <div class="card-detail">[N] impressions, [N] clicks (90 days)</div>
    </div>
    <div class="card">
      <div class="card-label">PostHog</div>
      <div class="card-detail">[N] sessions, [coverage level]</div>
    </div>
    <div class="card">
      <div class="card-label">Keyword Planner</div>
      <div class="card-detail">[N] keywords researched</div>
    </div>
  </div>

  <footer style="margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.85rem;">
    Generated by Keyword Wedge Skill — [Date]
  </footer>
</body>
</html>
```

## Report Guidelines

- **Frame for technical founders:** Use developer-friendly language, not SEO jargon. "Your homepage title tag" not "your SERP snippet"
- **Be specific:** Include exact keywords, volumes, positions, and file paths
- **Be actionable:** Each recommendation should be implementable without further research
- **Be honest about data quality:** Clearly mark data-backed findings vs inferences. Note Keyword Planner's paid-competition-as-organic-proxy limitation
- **Show the wedge path:** For every new keyword candidate, show the expansion cluster — the strategic path from wedge to target
- **Diff-friendly markdown:** Structure markdown reports so `git diff` between runs is readable and reveals strategy evolution
