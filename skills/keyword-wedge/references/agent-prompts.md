# Agent Prompts

## Phase 2: Messaging & Features Agent

```
You are exploring a web application's codebase to extract all messaging signals — every place the app communicates its value to users or search engines.

Find and document:

1. **UI copy**: Headlines, subheadlines, CTAs, feature descriptions, onboarding text, empty states
   - Look in: React/Vue/Svelte components, HTML templates, layout files, hero sections
   - Document: exact text, file location, whether it's static or dynamic

2. **Meta tags and structured data**: Title tags, meta descriptions, Open Graph tags, JSON-LD, schema.org markup
   - Look in: <head> sections, layout components, SEO utility functions, next/head or equivalent
   - Document: per-page meta content, whether it's templated or hardcoded

3. **Marketing pages**: Landing pages, pricing pages, about pages, feature comparison pages
   - Look in: /pages, /app, /marketing, /landing, route definitions
   - Document: page URLs, primary messaging per page, target audience signals

4. **Content assets**: Blog posts, documentation, changelogs, case studies
   - Look in: /content, /blog, /docs, /posts, CMS integration points, MDX files
   - Document: content inventory with topics and publication dates

5. **README and package metadata**: npm/pip package descriptions, GitHub repo description
   - Look in: README.md, package.json description, pyproject.toml, setup.py
   - Document: how the app describes itself in developer-facing contexts

6. **Feature inventory**: What does the app actually DO?
   - Look in: route handlers, API endpoints, database schemas, state management
   - Document: core features, secondary features, planned features (from TODOs/comments)

Return a structured summary organized as:
- App description (1-2 sentences synthesized from all signals)
- Core value propositions (3-5 key selling points)
- Feature list with importance ranking
- Content inventory (existing pages and posts)
- Messaging themes (recurring language patterns)
- File locations for each finding
```

## Phase 2: Rendering & SEO Visibility Agent

```
You are exploring a web application's codebase to assess its rendering strategy and SEO visibility — determining what content search engines can actually crawl and index.

Find and document:

1. **Framework and rendering strategy**
   - Look in: package.json dependencies, framework config files (next.config, nuxt.config, vite.config, etc.)
   - Determine: SPA (client-only), SSR (server-rendered), SSG (static generation), ISR (incremental), or hybrid
   - Document: which pages use which rendering strategy

2. **SEO infrastructure**
   - Look in: robots.txt, sitemap.xml or sitemap generation, canonical URL handling
   - Document: what's allowed/disallowed, sitemap coverage, canonical strategy

3. **Client-side rendering boundaries**
   - Look in: dynamic imports, lazy loading, client-only components, useEffect-dependent content
   - Document: content that only renders after JavaScript execution (invisible to basic crawlers)

4. **SEO-critical elements**
   - Look in: heading hierarchy (h1-h6), image alt text, internal link structure, anchor text patterns
   - Document: heading usage patterns, missing alt text, orphan pages

5. **Performance signals**
   - Look in: Core Web Vitals configuration, image optimization (next/image, etc.), font loading, bundle size
   - Document: known performance issues that affect search ranking

Return a structured assessment:
- Rendering strategy per page/route (SPA/SSR/SSG/hybrid)
- SEO visibility score: what percentage of content is crawlable
- Flagged issues: content that exists in code but search engines likely cannot see
- Infrastructure status: robots.txt, sitemap, canonical URLs, structured data
- Recommendations for improving crawlability (if gaps found)
```

## Phase 4: Search Console Agent

```
You are gathering organic search performance data from Google Search Console for an app's domain.

Access Google Search Console via API (or WebFetch if API access is configured). Gather:

1. **Top queries** (last 90 days): query text, impressions, clicks, CTR, average position
   - Sort by impressions to see what searches the app appears in
   - Sort by clicks to see what actually drives traffic
   - Filter for queries with impressions > 10 to exclude noise

2. **Landing page performance**: URL, impressions, clicks, CTR, average position
   - Identify top-performing pages
   - Identify pages with high impressions but low CTR (messaging mismatch)

3. **Query-page mapping**: Which queries lead to which pages
   - Identify intent alignment: does the landing page match what users searched for?

4. **Position distribution**: Queries where the app ranks positions 5-20 (near the first page but not yet visible)
   - These are "almost there" opportunities that small improvements could push to page 1

5. **Trend data**: Compare last 30 days to prior 30 days
   - Identify rising queries (organic momentum) and declining queries (losing ground)

Return structured data:
- Top 50 queries by impressions with all metrics
- Top 20 landing pages with performance data
- Query-page mapping for top performers
- "Almost there" queries (positions 5-20)
- Rising and declining trends
- Total impressions, clicks, and average CTR
```

## Phase 4: PostHog Analytics Agent

```
You are gathering user behavior and acquisition data from PostHog for an app.

Use PostHog API or PostHog MCP skills to gather:

1. **Acquisition data**: Where do users come from?
   - Referral sources by volume
   - UTM parameters if tracked
   - Search engine referral breakdown (which engines, which landing pages)

2. **Landing page engagement**: How do users behave after arriving?
   - Pageviews by path (identify most-visited pages)
   - Bounce rates by page (where do users leave immediately?)
   - Session duration by entry page
   - Scroll depth if tracked

3. **Feature usage**: What do users actually do?
   - Most-used features by frequency
   - Feature adoption rates (what percentage of users use each feature)
   - Power user patterns (what features do retained users use most)

4. **Funnel performance**: Where do users drop off?
   - Signup/onboarding funnel completion rates
   - Key conversion funnels (trial → paid, visitor → signup, etc.)
   - Drop-off points with page-level granularity

5. **Search intent signals**: What can be inferred about why users arrived?
   - Correlate referral source with subsequent behavior
   - Compare behavior of organic search visitors vs direct vs social
   - Identify pages where organic visitors convert at higher/lower rates

Return structured data:
- Acquisition channel breakdown with volumes
- Top 20 pages by engagement (views, bounce rate, session duration)
- Feature usage ranking
- Funnel performance with drop-off points
- Organic search visitor behavior patterns (vs other channels)
```
