# Keyword Wedge Report

**App:** CloudScribe
**Date:** 2026-03-15
**Mode:** Returning (run #3)
**Data sources:** [Search Console: Yes] [PostHog: Yes] [Keyword Planner: Yes]

## Executive Summary

**Keyword portfolio:** 16 keywords analyzed
| Category | Count | Top opportunity |
|----------|-------|-----------------|
| Working | 8 | "free video transcription" — position 4, 180 clicks/mo |
| Underperforming | 3 | "ai note taking app" — high impressions, 0.9% CTR |
| New wedge candidates | 5 | "transcribe zoom meetings free" — 3,000/mo, Low competition |

**Top 3 opportunities by size:**
1. [KW-N-001] "transcribe zoom meetings free" — Opportunity score: 9,000 — Create dedicated landing page for Zoom integration
2. [KW-U-001] "ai note taking app" — Opportunity score: 7,500 — Fix title tag to match search intent (5,000 impressions wasted)
3. [KW-N-003] "automatic meeting summary" — Opportunity score: 6,000 — Blog post connecting meeting transcription to summary feature

**Expansion progress:**
- Prior targets: 4
- Improved: 3 (avg position change: +5.2 positions)
- Stalled: 1
- Declined: 0

## App Understanding

**Description:** CloudScribe is a web app that automatically transcribes audio and video content, generates summaries, and integrates with Zoom, Google Meet, and Microsoft Teams for live meeting transcription.

**Core value propositions:**
1. Automated transcription with 95%+ accuracy
2. Live meeting integration (Zoom, Meet, Teams)
3. AI-powered summary generation from transcripts
4. Free tier with 60 minutes/month

**Rendering strategy:** SSR (Next.js with App Router)
**SEO visibility:** 92% of content is crawlable
**Flagged issues:** Pricing comparison table renders client-side only (invisible to crawlers)

## Data Source Summary

### Google Search Console
- Total impressions (90 days): 45,000
- Total clicks (90 days): 2,100
- Average CTR: 4.7%
- Queries tracked: 142
- Top query: "free video transcription" — 8,200 impressions, position 4

### PostHog
- Instrumentation coverage: Partial
- Organic search sessions (90 days): 1,850
- Top landing page: /features/transcription — 620 views
- Average bounce rate (organic): 42%

### Google Keyword Planner
- Keywords researched: 35
- Low competition keywords found: 12
- Keyword clusters identified: 3

## Working Keywords

### [KW-W-001] free video transcription
- **Current position:** 4 (↑ from 7 last run)
- **Monthly impressions:** 8,200
- **Clicks:** 180 (CTR: 2.2%)
- **Landing page:** /features/transcription
- **PostHog bounce rate:** 35% (organic visitors)
- **Feature alignment:** Strong — core feature
- **Recommendation:** Expand — research adjacent terms "audio transcription tool", "meeting transcription"
- **Adjacent keywords to research:** audio transcription tool, speech to text free, voice transcription

### [KW-W-002] meeting notes app
- **Current position:** 6 (stable)
- **Monthly impressions:** 3,400
- **Clicks:** 95 (CTR: 2.8%)
- **Landing page:** /features/meeting-notes
- **PostHog bounce rate:** 38% (organic visitors)
- **Feature alignment:** Strong — core feature
- **Recommendation:** Deepen — add comparison blog post "best meeting notes apps 2026"
- **Adjacent keywords to research:** best meeting notes app, ai meeting notes

### [KW-W-003] transcription software free
- **Current position:** 9 (↑ from 15 last run)
- **Monthly impressions:** 4,800
- **Clicks:** 60 (CTR: 1.3%)
- **Landing page:** /
- **PostHog bounce rate:** 55% (organic visitors)
- **Feature alignment:** Strong
- **Recommendation:** Improve messaging — CTR is low for position 9. Homepage title doesn't mention "transcription software". Redirect to /features/transcription or update homepage meta

## Underperforming Keywords

### [KW-U-001] ai note taking app
- **Current position:** 8
- **Impressions:** 5,000 / Clicks: 45 (CTR: 0.9%)
- **Landing page:** /
- **Subtype:** High impressions low CTR
- **Diagnosis:** Homepage title tag is "CloudScribe — Home" — doesn't mention note-taking or AI. Meta description talks about transcription, not notes.
- **PostHog evidence:** The 45 users who do click spend avg 4.2 minutes and 65% try the meeting notes feature — strong engagement when they arrive
- **Rendering visible:** Yes
- **Recommendation:** Rewrite homepage title to "CloudScribe — AI Meeting Notes & Transcription" and meta description to lead with note-taking angle
- **Priority:** High — 5,000 monthly impressions with easy fix

### [KW-U-002] video to text converter
- **Current position:** 14
- **Impressions:** 2,200 / Clicks: 22 (CTR: 1.0%)
- **Landing page:** /features/transcription
- **Subtype:** High impressions low CTR
- **Diagnosis:** Page title says "Transcription" not "Video to Text" — doesn't match the converter-style intent. Users searching "converter" expect a tool, not a feature page
- **PostHog evidence:** 18 of 22 visitors bounce — content doesn't match their expectation of a simple converter tool
- **Rendering visible:** Yes
- **Recommendation:** Create a dedicated /video-to-text page with a simple upload-and-convert interface prominently featured
- **Priority:** Medium — requires new page, not just messaging

## New Wedge Candidates

### [KW-N-001] transcribe zoom meetings free
- **Monthly volume:** 1K-10K (midpoint: 3,000)
- **Competition:** Low
- **Feature alignment:** Strong — Zoom integration is a core feature
- **Opportunity score:** 9,000
- **Current content:** None (gap identified)
- **Expansion cluster:**
  - Entry: "transcribe zoom meetings free" (3,000/mo, Low)
  - Level 2: "zoom transcription software" (8,000/mo, Medium)
  - Level 3: "zoom meeting transcription" (22,000/mo, High)
- **Content recommendation:** Dedicated landing page /zoom-transcription with step-by-step Zoom setup guide
- **Messaging angle:** "Transcribe your Zoom meetings automatically — free for up to 60 minutes/month"

### [KW-N-003] automatic meeting summary
- **Monthly volume:** 1K-10K (midpoint: 2,000)
- **Competition:** Low
- **Feature alignment:** Strong — AI summary is a core feature
- **Opportunity score:** 6,000
- **Current content:** None
- **Expansion cluster:**
  - Entry: "automatic meeting summary" (2,000/mo, Low)
  - Level 2: "ai meeting summary tool" (5,000/mo, Medium)
  - Level 3: "meeting summary" (15,000/mo, High)
- **Content recommendation:** Blog post "How to Get Automatic Meeting Summaries (Without Taking Notes)"
- **Messaging angle:** Position the AI summary as the primary value — transcription is the means, summary is the end

### [KW-N-004] google meet transcription free
- **Monthly volume:** 100-1K (midpoint: 500)
- **Competition:** Low
- **Feature alignment:** Strong — Google Meet integration exists
- **Opportunity score:** 1,500
- **Current content:** None
- **Expansion cluster:**
  - Entry: "google meet transcription free" (500/mo, Low)
  - Level 2: "google meet transcription" (6,000/mo, Medium)
- **Content recommendation:** Dedicated page /google-meet-transcription mirroring the Zoom page structure
- **Messaging angle:** Same pattern as Zoom page but for Google Meet users

## Wedge Expansion Roadmap

### Recommended sequence:
1. **"transcribe zoom meetings free"** — Entry wedge (3,000/mo, Low)
   → "zoom transcription software" (8,000/mo, Medium)
   → "zoom meeting transcription" (22,000/mo, High)

2. **"automatic meeting summary"** — Entry wedge (2,000/mo, Low)
   → "ai meeting summary tool" (5,000/mo, Medium)
   → "meeting summary" (15,000/mo, High)

3. **"google meet transcription free"** — Entry wedge (500/mo, Low)
   → "google meet transcription" (6,000/mo, Medium)

### Theme clusters:
- **Transcription tools** (dominant theme): KW-W-001, KW-W-003, KW-U-002, KW-N-001, KW-N-004
- **Meeting productivity** (growing theme): KW-W-002, KW-U-001, KW-N-003
- **Platform-specific** (tactical): KW-N-001 (Zoom), KW-N-004 (Meet)

## PostHog Instrumentation Recommendations

### PostHog Instrumentation Assessment

**Overall coverage:** Partial

#### Present
- `$pageview` — 12,400 events/week
- `$pageleave` — 11,800 events/week
- `transcription_started` — 340 events/week
- `transcription_completed` — 310 events/week
- `signup_completed` — 85 events/week

#### Missing (Recommended to Add)
- `meeting_connected` — Track when users connect Zoom/Meet/Teams integrations. Impact: enables feature usage correlation with acquisition source
- `summary_generated` — Track AI summary usage. Impact: validates the summary feature's appeal for keyword targeting
- `scroll_depth` — Measure content engagement depth. Impact: distinguish engaged readers from bouncers on content pages

#### Analysis Capability
- Basic traffic analysis: Yes
- Acquisition source tracking: Yes
- Feature usage correlation: Partial
- Conversion funnel analysis: Partial (missing middle-funnel events)
- Full intent matching: Partial

#### Priority Additions
1. `meeting_connected` — directly tied to platform-specific keyword strategy
2. `summary_generated` — validates meeting summary keyword cluster
3. `scroll_depth` — improves content engagement measurement

## Intent Matching Findings

| Search term | Landing page | Bounce rate | Feature engaged | Converted |
|------------|-------------|-------------|-----------------|-----------|
| free video transcription | /features/transcription | 35% | transcription_started (62%) | signup: 8% |
| meeting notes app | /features/meeting-notes | 38% | transcription_started (45%) | signup: 11% |
| transcription software free | / | 55% | none (bounced) | signup: 2% |
| ai note taking app | / | 48% | transcription_started (35%) | signup: 6% |

**Key insight:** Users searching for "meeting notes app" convert at the highest rate (11%) despite lower traffic. The meeting notes angle resonates more strongly with users ready to sign up. This supports prioritizing the meeting productivity keyword cluster.

## Recommendations Summary

### Immediate Actions (Messaging changes)
1. [KW-U-001] Rewrite homepage title tag: "CloudScribe — AI Meeting Notes & Transcription"
2. [KW-W-003] Update homepage meta description to include "transcription software"
3. [KW-W-001] Add internal links from blog posts to /features/transcription

### Content Creation (New pages/posts needed)
1. [KW-N-001] Create /zoom-transcription landing page with Zoom setup guide
2. [KW-N-003] Blog post: "How to Get Automatic Meeting Summaries (Without Taking Notes)"
3. [KW-U-002] Create /video-to-text tool page with simple upload interface
4. [KW-N-004] Create /google-meet-transcription landing page

### Structural Improvements (Code/rendering changes)
1. Fix pricing comparison table — currently client-side only, invisible to crawlers

### Instrumentation Additions (PostHog events to add)
1. `meeting_connected` — track platform integration usage
2. `summary_generated` — track AI summary feature usage
3. `scroll_depth` — measure content page engagement
