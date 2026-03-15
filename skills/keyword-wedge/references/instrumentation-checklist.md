# PostHog Instrumentation Checklist

Recommended PostHog events and properties for full intent matching (search term → landing page → user behavior). Assess the app's current instrumentation against this checklist and report gaps.

## Required for Basic Analysis

These events are needed for the simplest level of keyword-behavior correlation.

| Event | Purpose | How to check |
|-------|---------|--------------|
| `$pageview` | Page-level traffic data | Default in PostHog — almost always present |
| `$pageleave` | Bounce detection, session duration | Default in PostHog — usually present |
| `$session_id` | Session-level analysis | Default property — check it's populated |

**Check:** Query `SELECT event, count() FROM events WHERE event IN ('$pageview', '$pageleave') AND timestamp > now() - interval 7 day GROUP BY event`. If either returns 0, basic analytics are missing.

## Required for Acquisition Analysis

These properties enable referral source and search term correlation.

| Property | On event | Purpose | How to check |
|----------|----------|---------|--------------|
| `$referrer` | `$pageview` | Identify organic search traffic | Default — check `SELECT uniq(properties.$referrer) FROM events WHERE event = '$pageview' AND timestamp > now() - interval 7 day` |
| `$referring_domain` | `$pageview` | Aggregate by source (google.com, bing.com, etc.) | Default property |
| `$utm_source` | `$pageview` | Campaign tracking | Only present if UTM params are used |
| `$utm_medium` | `$pageview` | Channel identification | Only present if UTM params are used |
| `$current_url` | `$pageview` | Full landing page URL | Default — should always be present |
| `$pathname` | `$pageview` | Landing page path | Default — should always be present |

**Assessment:** If `$referrer` data exists, acquisition analysis is possible. UTM tracking is a bonus, not a requirement.

## Required for Intent Matching

These enable the full search term → landing page → behavior chain.

| Event/Property | Purpose | Instrumentation needed |
|----------------|---------|----------------------|
| Custom feature events | Know which features users engage with after arriving | App must fire events like `feature_used`, `action_completed`, etc. |
| Conversion events | Know when users complete key actions | Events like `signup_completed`, `trial_started`, `subscription_created` |
| Scroll depth | Measure content engagement | PostHog autocapture or custom `scroll_depth` event |
| Time on page | Distinguish engaged readers from bouncers | Derived from `$pageview` and `$pageleave` timestamps |

**Check:** Query `SELECT event, count() FROM events WHERE event NOT LIKE '$%' AND timestamp > now() - interval 7 day GROUP BY event ORDER BY count() DESC LIMIT 20`. If this returns very few results, custom event instrumentation is sparse.

## Recommended for Full Funnel Analysis

These enable connecting keyword performance to business outcomes.

| Event | Purpose | Priority |
|-------|---------|----------|
| `signup_started` | Top of conversion funnel | High |
| `signup_completed` | Conversion measurement | High |
| `feature_{name}_used` | Feature engagement | Medium |
| `trial_started` | Trial conversion | High (if applicable) |
| `payment_completed` | Revenue attribution | High (if applicable) |
| `onboarding_step_{n}` | Onboarding funnel | Medium |
| `content_shared` | Organic amplification signals | Low |
| `search_performed` | Internal search intent | Medium |

## Assessment Output Format

After checking the app's PostHog instrumentation, produce this assessment:

```
### PostHog Instrumentation Assessment

**Overall coverage:** [Complete / Partial / Minimal]

#### Present
- [list of events/properties found with sample counts]

#### Missing (Recommended to Add)
- [event] — [why it matters for keyword strategy]
  Impact: [what analysis becomes possible with this event]

#### Analysis Capability
- Basic traffic analysis: [Yes / No]
- Acquisition source tracking: [Yes / No]
- Feature usage correlation: [Yes / Partial / No]
- Conversion funnel analysis: [Yes / Partial / No]
- Full intent matching: [Yes / Partial / No]

#### Priority Additions
1. [Most impactful event to add first]
2. [Second most impactful]
3. [Third most impactful]
```

## Graceful Degradation

When instrumentation is incomplete, degrade analysis gracefully:

| Missing data | Fallback approach |
|-------------|-------------------|
| No custom events | Use `$pageview` paths as proxy for feature engagement |
| No conversion events | Use session duration and page depth as engagement proxy |
| No referrer data | Skip acquisition analysis, note in report |
| No scroll depth | Use bounce rate as content engagement proxy |
| Minimal everything | Report only what Search Console and Keyword Planner reveal, flag PostHog gap |
