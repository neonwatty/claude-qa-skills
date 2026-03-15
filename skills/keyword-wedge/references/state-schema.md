# State Schema

JSON schemas for state management files in `.keyword-wedge/state/`.

## Directory Structure

```
.keyword-wedge/
  state/
    strategy.json        # Current wedge strategies and target keywords
    history.json         # Run history with ranking snapshots
    expansion-plan.json  # Queued expansion targets for future runs
  reports/
    YYYY-MM-DD.md        # Markdown report per run
    YYYY-MM-DD.html      # HTML report per run
```

## strategy.json

Current active keyword strategies. Updated at the end of each run.

```json
{
  "app": {
    "name": "App Name",
    "domain": "example.com",
    "description": "One-line app description confirmed with user",
    "rendering_strategy": "SSR",
    "seo_visibility_score": 0.85
  },
  "last_run": "2026-03-15",
  "run_count": 3,
  "keywords": {
    "working": [
      {
        "id": "KW-W-001",
        "keyword": "free video transcription",
        "position": 4,
        "impressions_90d": 2400,
        "clicks_90d": 180,
        "ctr": 0.075,
        "landing_page": "/features/transcription",
        "feature_alignment": "strong",
        "strategy": "expand",
        "adjacent_targets": ["audio transcription tool", "meeting transcription"],
        "first_tracked": "2026-01-15",
        "position_history": [
          {"date": "2026-01-15", "position": 12},
          {"date": "2026-02-15", "position": 7},
          {"date": "2026-03-15", "position": 4}
        ]
      }
    ],
    "underperforming": [
      {
        "id": "KW-U-001",
        "keyword": "ai note taking app",
        "position": 8,
        "impressions_90d": 5000,
        "clicks_90d": 45,
        "ctr": 0.009,
        "landing_page": "/",
        "subtype": "high_impressions_low_ctr",
        "diagnosis": "Title tag says 'App Name - Home' instead of matching search intent",
        "recommended_fix": "Rewrite title tag to 'AI Note Taking App — [App Name]'",
        "first_tracked": "2026-02-15"
      }
    ],
    "wedge_candidates": [
      {
        "id": "KW-N-001",
        "keyword": "transcribe zoom meetings free",
        "monthly_volume": "1K-10K",
        "volume_midpoint": 3000,
        "competition": "Low",
        "feature_alignment": "strong",
        "aligned_feature": "Zoom integration with auto-transcription",
        "opportunity_score": 9000,
        "content_recommendation": "Create dedicated landing page /zoom-transcription",
        "expansion_cluster": [
          {"keyword": "transcribe zoom meetings free", "volume": 3000, "competition": "Low"},
          {"keyword": "zoom transcription software", "volume": 8000, "competition": "Medium"},
          {"keyword": "zoom meeting transcription", "volume": 22000, "competition": "High"}
        ],
        "status": "identified",
        "first_identified": "2026-03-15"
      }
    ]
  },
  "themes": [
    {
      "name": "Transcription",
      "keywords": ["KW-W-001", "KW-N-001"],
      "coverage": "partial",
      "notes": "Strong working keyword, expansion cluster identified"
    }
  ]
}
```

## history.json

Append-only run history. Each run adds an entry with a snapshot of key metrics.

```json
{
  "runs": [
    {
      "date": "2026-03-15",
      "run_number": 3,
      "mode": "returning",
      "data_sources": {
        "search_console": true,
        "posthog": true,
        "keyword_planner": true
      },
      "summary": {
        "working_keywords": 8,
        "underperforming_keywords": 3,
        "wedge_candidates": 5,
        "top_opportunity_score": 9000,
        "total_impressions_90d": 45000,
        "total_clicks_90d": 2100,
        "average_ctr": 0.047
      },
      "changes_from_previous": {
        "keywords_improved": ["KW-W-001"],
        "keywords_declined": [],
        "new_keywords_discovered": ["KW-N-003", "KW-N-004"],
        "keywords_promoted": [
          {
            "id": "KW-N-002",
            "from": "wedge_candidate",
            "to": "working",
            "note": "Now ranking position 6 after landing page created"
          }
        ]
      },
      "posthog_instrumentation": {
        "coverage": "partial",
        "events_found": 12,
        "events_recommended": 5
      },
      "user_direction": "Focus on transcription cluster expansion, fix title tags for underperformers"
    }
  ]
}
```

## expansion-plan.json

Queued expansion targets for future runs. Updated based on user-guided priorities.

```json
{
  "last_updated": "2026-03-15",
  "active_wedges": [
    {
      "entry_keyword": "KW-W-001",
      "entry_status": "established",
      "current_position": 4,
      "next_target": {
        "keyword": "audio transcription tool",
        "volume": 5000,
        "competition": "Medium",
        "action_needed": "Create comparison blog post, add internal links from transcription feature page",
        "estimated_content": "blog post"
      },
      "ultimate_target": {
        "keyword": "transcription service",
        "volume": 25000,
        "competition": "High"
      },
      "progress": 0.4,
      "notes": "Position improved from 12 to 4 over 2 months. Ready for Level 2 expansion."
    }
  ],
  "queued_wedges": [
    {
      "candidate_id": "KW-N-001",
      "keyword": "transcribe zoom meetings free",
      "priority": 1,
      "action_needed": "Create /zoom-transcription landing page",
      "user_approved": true,
      "approved_date": "2026-03-15"
    }
  ],
  "next_run_focus": [
    "Check if KW-N-001 content was created and is ranking",
    "Research more keywords in transcription cluster",
    "Re-check underperformer KW-U-001 after title tag fix"
  ]
}
```

## State Management Rules

1. **Never overwrite history.json** — always append new run entries
2. **strategy.json reflects current state** — overwrite with latest data each run
3. **expansion-plan.json is user-guided** — only add targets the user has approved
4. **All dates are ISO 8601** — YYYY-MM-DD format
5. **Keyword IDs are stable** — once assigned, a keyword keeps its ID across runs (KW-W-001 stays KW-W-001 even if it moves to underperforming)
6. **Position history is cumulative** — append each run's position, don't replace
7. **Track promotions and demotions** — when a keyword moves between categories, record the transition in history
