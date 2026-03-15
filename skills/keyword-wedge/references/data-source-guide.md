# Data Source Guide

How to connect to, authenticate, and query each data source.

## Google Search Console

### Auth Verification

Check access by attempting to fetch the property list:

```
WebFetch: https://www.googleapis.com/webmasters/v3/sites
```

If this returns 401/403, report to the user:
- "Google Search Console API access is not configured. Set up OAuth credentials or an API key for the Search Console API."
- "Ensure the Search Console property is verified for your domain."
- Do not attempt to create accounts or guide through setup — inform and proceed with other sources.

### API Queries

**Top queries (last 90 days):**
```
POST https://www.googleapis.com/webmasters/v3/sites/{site_url}/searchAnalytics/query
{
  "startDate": "YYYY-MM-DD",  // 90 days ago
  "endDate": "YYYY-MM-DD",    // today
  "dimensions": ["query"],
  "rowLimit": 500,
  "startRow": 0
}
```

**Landing page performance:**
```
POST https://www.googleapis.com/webmasters/v3/sites/{site_url}/searchAnalytics/query
{
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "dimensions": ["page"],
  "rowLimit": 100
}
```

**Query-page mapping:**
```
POST https://www.googleapis.com/webmasters/v3/sites/{site_url}/searchAnalytics/query
{
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "dimensions": ["query", "page"],
  "rowLimit": 1000
}
```

**Trend comparison (last 30 days vs prior 30 days):**
Run two queries with different date ranges and compare metrics per query.

### Data Interpretation

| Metric | What it means |
|--------|---------------|
| Impressions | How many times the page appeared in search results |
| Clicks | How many times users clicked through |
| CTR | Clicks / Impressions — measures messaging effectiveness |
| Position | Average ranking position (1 = top of page 1) |

**Key signals:**
- High impressions, low CTR → messaging doesn't match search intent (fix copy)
- Position 5-20 → "almost there" — small improvements could reach page 1
- Rising impressions → organic momentum in this keyword space
- Declining position → losing ground to competitors

---

## PostHog

### Auth Verification

**Via PostHog MCP skills (preferred):**
Use the PostHog skills available in this plugin collection (`posthog:insights`, `posthog:query`, etc.) to query data.

**Via API:**
```
WebFetch: https://app.posthog.com/api/projects/
Headers: Authorization: Bearer {POSTHOG_API_KEY}
```

If both fail, report to the user:
- "PostHog access is not configured. Ensure a PostHog API key is set, or that PostHog MCP skills are available."
- Proceed with other sources.

### Key Queries

**Pageviews by path (HogQL via posthog:query):**
```sql
SELECT properties.$pathname AS path, count() AS views
FROM events
WHERE event = '$pageview'
AND timestamp > now() - interval 90 day
GROUP BY path
ORDER BY views DESC
LIMIT 50
```

**Referral sources:**
```sql
SELECT properties.$referrer AS referrer, count() AS visits
FROM events
WHERE event = '$pageview'
AND properties.$referrer IS NOT NULL
AND timestamp > now() - interval 90 day
GROUP BY referrer
ORDER BY visits DESC
LIMIT 30
```

**Bounce rate by landing page:**
```sql
SELECT
  first_page,
  total_sessions,
  bounced_sessions,
  bounced_sessions / total_sessions AS bounce_rate
FROM (
  SELECT
    argMin(properties.$pathname, timestamp) AS first_page,
    properties.$session_id AS session_id,
    count() AS page_count,
    1 AS total_sessions,
    if(count() = 1, 1, 0) AS bounced_sessions
  FROM events
  WHERE event = '$pageview'
  AND timestamp > now() - interval 90 day
  GROUP BY session_id
)
GROUP BY first_page
ORDER BY total_sessions DESC
LIMIT 20
```

**Feature usage frequency:**
```sql
SELECT event, count() AS frequency, uniq(distinct_id) AS unique_users
FROM events
WHERE event NOT LIKE '$%'
AND timestamp > now() - interval 90 day
GROUP BY event
ORDER BY frequency DESC
LIMIT 30
```

---

## Google Keyword Planner (Claude-in-Chrome)

### Auth Verification

Navigate to Google Ads and check for an active session:

1. Call `tabs_context_mcp` with `createIfEmpty: true`
2. Navigate to `https://ads.google.com/aw/keywordplanner/home`
3. If redirected to login, inform the user:
   - "Sign into Google Ads in Chrome, then re-run the skill."
   - Do not attempt to automate the login flow.
4. If the page loads with the Keyword Planner interface, proceed.

### Browser Workflow

**Step 1: Access "Discover new keywords"**
1. Find and click "Discover new keywords" on the Keyword Planner home page
2. Select "Start with keywords" tab

**Step 2: Enter seed keywords**
1. Based on the confirmed app understanding, generate 5-10 seed keywords
2. Enter each keyword in the search box
3. Set location and language filters as appropriate (default: United States, English)
4. Click "Get results"

**Step 3: Extract keyword data**
1. Wait for results table to load
2. Read the page to extract: keyword, average monthly searches, competition level (Low/Medium/High), top-of-page bid range
3. Sort by "Avg. monthly searches" to see volume
4. Filter for "Low" competition keywords

**Step 4: Explore related keywords**
1. For each promising low-competition keyword, click to see related suggestions
2. Record related keywords with their metrics
3. Look for keyword clusters — groups of related low-competition terms

**Step 5: Research app-specific terms**
1. Enter keywords derived from the app's specific features
2. Look for feature-specific terms with search volume but low competition
3. Record any "keyword gaps" — things the app does that people search for but nobody targets

### Data Interpretation

| Competition | Meaning (Paid) | Organic Proxy |
|-------------|----------------|---------------|
| Low | Few advertisers bid on this | Likely achievable organic ranking |
| Medium | Moderate advertiser interest | Competitive but possible with good content |
| High | Many advertisers compete | Difficult organic ranking, probably dominated by established sites |

**Key signals for wedge identification:**
- Low competition + 100-10,000 monthly searches = ideal wedge target
- Low competition + the app has genuine authority (features match the keyword) = strong wedge
- Cluster of 3+ related low-competition keywords = wedge with expansion potential

### Handling Keyword Planner Limitations

- Keyword Planner rounds search volumes to ranges (10-100, 100-1K, etc.) — note this imprecision in reports
- Competition is for paid search, not organic — always note this as a proxy, not a direct measure
- If Keyword Planner is unavailable, note it in the report and proceed with Search Console + PostHog data only
