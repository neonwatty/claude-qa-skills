# Interview Questions

Structured questions for Phase 1. Ask via AskUserQuestion tool, one at a time or batched as appropriate.

## Question 1: Base URL

**Ask:** "What is the app's base URL for live browser exploration?"

**Why this matters:** The Live App Experience agent needs a target URL. Browser exploration is a core phase, not optional.

**How this informs analysis:** The base URL determines what the browser agent explores. If the app isn't deployed yet, browser exploration is skipped and codebase-only analysis is performed.

## Question 2: Primary Audience

**Ask:** "Who is the primary audience for this app?"

**Options to offer (via AskUserQuestion):**
- Content creators / influencers
- Educators / schools / institutions
- Enterprise / corporate teams
- General consumers
- Developers / technical users
- Other (free text)

**Why this matters:** Different audiences value different trust signals. Educators value privacy (FERPA, student data). Enterprise values security and compliance. Consumers value free access and simplicity. Creators value speed and shareability.

**How this informs analysis:** Audience type determines which trust-building patterns are most impactful. Privacy-focused audiences → client-side processing emphasis. Speed-focused audiences → free demo emphasis. Compliance-focused audiences → transparency emphasis.

## Question 3: Monetization Model

**Ask:** "What's the current or planned monetization model?"

**Options to offer:**
- SaaS subscription (monthly/annual)
- Usage-based pricing (pay per use)
- Freemium (free tier + paid upgrades)
- One-time purchase
- Not monetized yet / exploring options
- Other (free text)

**Why this matters:** The monetization model determines the free→paid funnel. A SaaS app needs free features that create upgrade pressure. A not-yet-monetized app needs free features that build an audience for future monetization.

**How this informs analysis:** Shapes the "Funnel mechanics" section of each mini-spec.

## Question 4: Trust Definition

**Ask:** "What does 'trust' mean for your users? What would make them confident in your app?"

**Options to offer:**
- Privacy (data never leaves their device)
- Accuracy / reliability (the app works correctly)
- Transparency (they can see how it works)
- Free access (try before you buy)
- Social proof (others use and recommend it)
- Other (free text)

**Why this matters:** Trust is not monolithic. The same app could build trust through privacy OR through social proof — the right choice depends on the audience.

**How this informs analysis:** Determines which trust signals to prioritize in the report's "Current Trust Signals" table and which opportunities rank highest.

## Question 5: Conversion Funnel

**Ask:** "Is there a specific conversion funnel you're optimizing for?"

**Options to offer:**
- Free tool → signup → paid subscription
- Content/SEO → landing page → signup
- Word of mouth / viral sharing → organic growth
- No funnel yet / building awareness first
- Other (free text)

**Why this matters:** The funnel context determines how free offerings should be positioned — as a top-of-funnel awareness play, a mid-funnel trust builder, or a bottom-funnel conversion driver.

**How this informs analysis:** Shapes where in the user journey each opportunity should be placed.

## Question 6: Constraints

**Ask:** "Are there any constraints on what you can offer for free?"

**Options to offer:**
- API costs (can't afford unlimited free usage of paid APIs)
- Compute costs (server-side processing is expensive)
- Competitive sensitivity (don't want to give away core IP)
- No significant constraints
- Other (free text)

**Why this matters:** Constraints determine which opportunities are feasible. If API costs are a concern, client-side processing opportunities rank higher. If competitive sensitivity matters, open-source components rank lower.

**How this informs analysis:** Acts as a filter on opportunity feasibility.

## Question 7: Competitive Verification (Phase 5)

**Ask:** "Would you like me to also explore competitor apps to verify your free offerings would be differentiated?"

**Options to offer:**
- Yes, check competitors
- No, skip competitive analysis

**Why this matters:** Competitive verification ensures proposed free features aren't "me too" offerings.

**How this informs analysis:** Determines whether Phase 5 runs. Store preference in Interview task metadata as `phase5_opted_in: true/false`.
