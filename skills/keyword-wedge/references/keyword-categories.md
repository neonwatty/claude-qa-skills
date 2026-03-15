# Keyword Categories

Three categories for triaging an app's keyword portfolio. Each keyword or keyword cluster is assigned to exactly one category based on current performance data.

## 1. Working Keywords

**Definition:** Keywords where the app currently ranks (position 1-20) AND receives meaningful traffic (clicks > 0 in last 90 days).

**What to analyze:**

| Signal | Source | What it reveals |
|--------|--------|-----------------|
| Position trend | Search Console | Is ranking improving, stable, or declining? |
| CTR vs position average | Search Console | Is the listing compelling relative to its rank? |
| Post-click behavior | PostHog | Do visitors from this keyword engage or bounce? |
| Feature alignment | Codebase | Does the app genuinely deliver what this keyword promises? |
| Content depth | Codebase | Is there enough content to defend this ranking? |

**Leverage strategies:**
- **Expand adjacently:** Find related keywords in the same semantic cluster. If "video transcription" works, explore "audio transcription", "meeting transcription", "transcription API"
- **Deepen content:** Add more targeted content around the keyword — blog posts, docs, feature pages
- **Improve messaging:** If CTR is below position average, the meta description and title tag need work
- **Internal linking:** Strengthen the landing page's internal link network

**Assessment template:**
```
### [KW-W-XXX] [Keyword]
- **Current position:** [X] ([trend: ↑ stable ↓])
- **Monthly impressions:** [N]
- **Clicks:** [N] (CTR: [X]%)
- **Landing page:** [URL]
- **PostHog bounce rate:** [X]% (organic visitors)
- **Feature alignment:** [Strong / Moderate / Weak]
- **Recommendation:** [Expand / Deepen / Improve messaging / Maintain]
- **Adjacent keywords to research:** [list]
```

---

## 2. Underperforming Keywords

**Definition:** Keywords where the app appears in search results (impressions > 50 in last 90 days) but fails to convert impressions to traffic OR traffic to engagement.

**Two subtypes:**

### 2a. High Impressions, Low CTR
The app ranks but users don't click. Diagnose:
- **Title tag mismatch:** The page title doesn't match the search intent
- **Meta description weakness:** The snippet doesn't compel clicks
- **SERP feature displacement:** Featured snippets, knowledge panels, or ads push the result below the fold
- **Wrong page ranking:** Google chose a suboptimal page for this query

### 2b. Clicks but High Bounce / Low Engagement
Users click but leave immediately. Diagnose:
- **Content-intent mismatch:** The page content doesn't match what the user searched for
- **Rendering issues:** Content exists but isn't visible (SPA rendering problem)
- **UX problems:** Slow load, poor mobile experience, aggressive popups
- **Wrong landing page:** The ranking page isn't the best page for this keyword

**Diagnosis framework:**

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Impressions > 100, CTR < 1% | Title/description mismatch | Rewrite meta tags to match search intent |
| Position 1-3, CTR < 10% | SERP feature displacement | Add structured data, target featured snippets |
| Clicks > 10, bounce > 80% | Content-intent mismatch | Rewrite page content or redirect to better page |
| Organic bounce >> direct bounce | Expectation gap | Landing page promises something the app doesn't deliver |

**Assessment template:**
```
### [KW-U-XXX] [Keyword]
- **Current position:** [X]
- **Impressions:** [N] / Clicks: [N] (CTR: [X]%)
- **Landing page:** [URL]
- **Subtype:** [High impressions low CTR / Clicks but high bounce]
- **Diagnosis:** [specific cause identified from framework above]
- **PostHog evidence:** [relevant behavior data]
- **Rendering visible:** [Yes / No — flagged in SEO visibility assessment]
- **Recommendation:** [Rewrite meta / Rewrite content / Redirect / Abandon]
- **Priority:** [High if fixable with messaging change, Low if structural]
```

---

## 3. New Wedge Candidates

**Definition:** Keywords the app does NOT currently rank for but SHOULD target, based on feature-keyword alignment and low competition signals.

**Discovery sources:**

| Source | What it reveals |
|--------|-----------------|
| Keyword Planner | Volume and competition for seed keywords derived from app features |
| App features not covered | Features the app has but no content targets |
| Search Console gaps | Related keywords that appear in "related queries" but the app doesn't rank for |
| PostHog feature usage | Heavily-used features that aren't reflected in search content |

**Wedge qualification criteria:**

A keyword qualifies as a wedge candidate when ALL of these are true:

1. **Low competition** in Keyword Planner (Low competition tier)
2. **Meaningful volume** — at least 100 monthly searches (below this, even ranking #1 won't move the needle)
3. **Feature alignment** — the app genuinely has capabilities related to this keyword
4. **Content gap** — the app doesn't currently have content targeting this keyword
5. **Expansion potential** — the keyword belongs to a cluster with adjacent higher-volume terms (this is what makes it a "wedge" vs just a keyword)

**Wedge scoring:**

```
Opportunity Score = Search Volume × (1 / Competition Level) × Feature Alignment Score

Where:
- Search Volume = monthly searches (use midpoint of Keyword Planner range)
- Competition Level: Low = 1, Medium = 3, High = 10
- Feature Alignment: Strong = 3 (core feature), Moderate = 2 (related feature), Weak = 1 (tangential)
```

**Expansion potential assessment:**

For each wedge candidate, identify the **expansion cluster** — adjacent keywords with increasing volume and competition:

```
Wedge entry point: "free audio transcription tool" (500/mo, Low competition)
  → Level 2: "audio transcription software" (2,000/mo, Medium competition)
  → Level 3: "transcription service" (10,000/mo, High competition)
```

The expansion cluster shows the strategic path: establish the wedge, then work up through adjacent terms.

**Assessment template:**
```
### [KW-N-XXX] [Keyword]
- **Monthly volume:** [range from Keyword Planner]
- **Competition:** Low
- **Feature alignment:** [Strong / Moderate] — [which feature]
- **Opportunity score:** [calculated]
- **Current content:** None (gap identified)
- **Expansion cluster:**
  - Entry: [this keyword] ([volume], Low)
  - Level 2: [adjacent keyword] ([volume], [competition])
  - Level 3: [target keyword] ([volume], [competition])
- **Content recommendation:** [what to create — blog post, feature page, landing page, docs page]
- **Messaging angle:** [how to position the app for this keyword]
```

---

## Cross-Category Analysis

After triaging all keywords, synthesize across categories:

1. **Theme clusters:** Do working keywords, underperformers, and candidates cluster around the same themes? This reveals the app's natural keyword territory
2. **Funnel alignment:** Are there keywords for each stage (awareness → consideration → conversion)?
3. **Feature coverage:** Which app features have keyword representation and which don't?
4. **Quick wins:** Underperformers that could become working keywords with messaging changes
5. **Strategic wedges:** New candidates that connect to existing working keywords via expansion clusters
