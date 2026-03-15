# Report Structure

Template for the final trust builder audit report written to `/reports/trust-builder-audit.md`.

## Template

```markdown
# Trust Builder Audit: [App Name]

> Generated [date] | Audience: [primary audience] | Monetization: [current model]

## Executive Summary

**Opportunities identified:** [count]
**Must-Build:** [n] | **Should-Build:** [n] | **Nice-to-Have:** [n] | **Backlog:** [n]

**Top 3 opportunities:**
1. [Title] — [One-line trust rationale]
2. [Title] — [One-line trust rationale]
3. [Title] — [One-line trust rationale]

**Competitive verification:** [Completed / Not performed]

## Current Trust Signals

| Trust Signal | Present | Notes |
|---|---|---|
| Free offering exists | Yes / No / Partial | [details] |
| Privacy messaging | Yes / No / Partial | [details] |
| No-signup experience | Yes / No / Partial | [details] |
| Transparent methodology | Yes / No / Partial | [details] |
| Open source | Yes / No / Partial | [details] |

## Opportunities (Prioritized)

### Must-Build

[Opportunities that directly address the primary trust gap for the target audience and are feasible within stated constraints]

#### [Opportunity Title]

**Trust rationale:** [Why this builds trust for the specific audience]
**What users get free:** [Concrete description of the free offering]
**Technical approach:** [Specific libraries, file paths, implementation pattern]
**Funnel to paid:** [How this free offering creates upgrade pressure or awareness]
**Complexity:** Low / Medium / High

---

### Should-Build

[Opportunities with strong trust impact that are achievable in the medium term]

#### [Opportunity Title]

**Trust rationale:** [Why this builds trust for the specific audience]
**What users get free:** [Concrete description of the free offering]
**Technical approach:** [Specific libraries, file paths, implementation pattern]
**Funnel to paid:** [How this free offering creates upgrade pressure or awareness]
**Complexity:** Low / Medium / High

---

### Nice-to-Have

[Opportunities that would improve trust but are lower priority given the audience and constraints]

#### [Opportunity Title]

**Trust rationale:** [Why this builds trust for the specific audience]
**What users get free:** [Concrete description of the free offering]
**Technical approach:** [Specific libraries, file paths, implementation pattern]
**Funnel to paid:** [How this free offering creates upgrade pressure or awareness]
**Complexity:** Low / Medium / High

---

### Backlog

[Opportunities worth revisiting if constraints change or the audience shifts]

#### [Opportunity Title]

**Trust rationale:** [Why this builds trust for the specific audience]
**What users get free:** [Concrete description of the free offering]
**Technical approach:** [Specific libraries, file paths, implementation pattern]
**Funnel to paid:** [How this free offering creates upgrade pressure or awareness]
**Complexity:** Low / Medium / High

---

## Technology Catalog Matches

| Opportunity | Technology | Source | Notes |
|---|---|---|---|
| [Opportunity title] | [Library or approach] | [Catalog category] | [Why it fits] |

## Competitive Landscape

> Section omitted if Phase 4 was not run.

| Competitor | Free Offerings | Trust Signals | Overlap with Proposed | Differentiation Notes |
|---|---|---|---|---|
| [Competitor] | [What they offer free] | [Visible trust signals] | [Which proposed opportunities overlap] | [How the proposed approach differs] |

## Next Steps

1. [Specific action item tied to a Must-Build opportunity]
2. [Specific action item tied to a Must-Build opportunity]
3. [Next review milestone or follow-up recommendation]
```

## Report Guidelines

- **Be specific**: Include file paths and library names, not just "add a privacy feature"
- **Be actionable**: Each mini-spec should be implementable without further research
- **Be honest about feasibility**: If an opportunity is constrained by API costs or compute, say so explicitly
- **Include the funnel**: Every free offering should have a clear path to value — either as an upgrade trigger or an audience-building mechanism
- **Note what's already working**: Acknowledge existing trust signals in the Current Trust Signals table before proposing new ones
