# Agent Prompts

## Phase 2: Business Model Agent

```
You are exploring a SaaS web application to map its business model and pricing enforcement.

Find and document:

1. **Pricing tiers**: Free, paid tiers, enterprise. What does each tier include?
   - Look in: config files, constants, Stripe integration, pricing pages
   - Document: tier names, prices, limits per tier, feature gates

2. **Usage limits**: What is metered? How is it tracked?
   - Look in: database schemas, usage tracking tables/functions, API middleware
   - Document: what's counted (minutes, API calls, storage, projects), where limits are checked, whether checks are atomic

3. **Free trial / freemium logic**: What do free users get? When does it expire?
   - Look in: signup flow, onboarding, trial grant logic, expiry cron jobs
   - Document: what's granted, expiry rules, renewal conditions

4. **Subscription lifecycle**: Upgrade, downgrade, cancel, resubscribe flows
   - Look in: Stripe webhooks, billing API routes, profile update logic
   - Document: what happens to balances/resources at each transition

5. **Coupon / discount logic**: Educator discounts, promo codes, referrals
   - Look in: checkout flow, Stripe coupon config, referral tracking

Return a structured summary with code file locations for each finding.
```

## Phase 2: Economic Surface Agent

```
You are exploring a SaaS web application to map every place where user actions cost the operator money.

Find and document:

1. **Third-party API calls**: What external services does the app call?
   - Look in: API routes, server actions, edge functions, background jobs
   - Document: service name, endpoint, estimated cost per call, what triggers it, any caching

2. **Storage costs**: Where are files stored? What are the retention policies?
   - Look in: upload routes, S3/cloud storage config, cleanup cron jobs
   - Document: storage provider, bucket config, lifecycle policies, who pays (user or operator)

3. **Compute costs**: What operations are CPU/memory intensive?
   - Look in: background job definitions, Lambda/serverless functions, Step Functions, queue processors
   - Document: what triggers compute, estimated duration/cost, concurrency limits

4. **Database costs**: What operations are write-heavy or query-heavy?
   - Look in: database migrations, RPC functions, complex queries, materialized views
   - Document: tables that grow unboundedly, expensive queries, missing indexes

5. **Email / notification costs**: What triggers outbound communications?
   - Look in: email sending logic, SMS, push notifications, webhook dispatchers
   - Document: what triggers sends, volume limits, cost per send

Return a cost map: for each cost-bearing action, list the trigger, estimated unit cost, current volume limit (if any), and code location.
```

## Phase 2: Auth & Entitlements Agent

```
You are exploring a SaaS web application to map how authentication, authorization, and entitlements are enforced.

Find and document:

1. **Signup flow**: What's required to create an account?
   - Look in: auth config, signup routes, email verification logic
   - Document: required fields, verification steps, what's granted on signup

2. **Authorization checks**: How does the app verify a user can perform an action?
   - Look in: middleware, API route guards, database RLS policies, role checks
   - Document: where checks happen (middleware vs route vs DB), what's checked (tier, ownership, role)

3. **Quota enforcement**: How are usage limits enforced?
   - Look in: usage tracking functions, pre-action checks, atomic operations
   - Document: enforcement points, atomicity (race condition risk), fail-open vs fail-closed behavior

4. **State transitions**: What happens during tier changes?
   - Look in: webhook handlers, subscription update logic, balance transfer functions
   - Document: upgrade/downgrade/cancel flows, what resources are retained/released, edge cases

5. **Rate limiting**: What rate limits exist and how are they implemented?
   - Look in: rate limit middleware, Redis/KV usage, per-endpoint configs
   - Document: limits per endpoint, implementation (sliding window, token bucket), fail behavior

Return an entitlement enforcement map: for each protected action, list the check type, where it's enforced, and any gaps or fail-open behavior.
```
