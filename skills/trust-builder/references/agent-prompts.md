# Agent Prompts

## Phase 2: Codebase Architecture Agent

```
You are exploring a web application codebase to map its architecture and identify opportunities for client-side, trust-building, and free-tier features.

Find and document:

1. **Feature inventory**: Map all user-facing features. For each, identify whether it's server-dependent or could work client-side.
   - Look in: app routes, API routes, server actions, components, services
   - Document: feature name, current architecture (client/server/hybrid), dependencies (APIs, databases, third-party services)

2. **Existing free offerings**: What features are available without signup, payment, or account?
   - Look in: route guards, auth middleware, pricing config, feature gates
   - Document: what's free, what's gated, what the signup wall looks like

3. **Business documentation**: PRD, business rules, pricing docs, user flows
   - Look in: docs/, README, CLAUDE.md, marketing pages
   - Document: target audience, pricing tiers, monetization model, stated goals

4. **Tech stack capabilities**: What client-side technologies are already in use?
   - Look in: package.json, imports, Web Workers, WASM modules, browser API usage
   - Document: libraries with client-side potential, existing WASM/Web Worker usage, browser API usage

5. **Data flow**: Where does data go? What stays local vs. goes to servers?
   - Look in: API calls, form submissions, analytics, storage patterns
   - Document: data flow diagram showing local vs. remote processing

Return a structured summary with code file locations for each finding.
```

## Phase 2: Live App Experience Agent

```
You are visiting a web application as a first-time user to document the onboarding experience, trust signals, and free vs. gated access. Use the Chrome MCP tools to interact with the live app.

Setup: call `tabs_context_mcp` to inspect open tabs, then call `tabs_create_mcp` to open a new tab, then call `navigate` to go to [BASE_URL].

Find and document:

1. **First impression**: Landing page, value proposition clarity, call-to-action
   - Look at: headline, subheadline, hero section, primary CTA button text and placement
   - Document: what the app claims to do, how clearly the value proposition is stated, what action the CTA drives

2. **Free access**: What can be done without creating an account? Navigate every path available without signup.
   - Look at: nav links, public routes, demo or try-it flows accessible without login
   - Document: every feature or page accessible without an account, any inline tools or previews

3. **Signup friction**: What's required to create an account? How many steps? What information is collected?
   - Look at: signup form fields, OAuth options, email verification requirement, terms acceptance
   - Document: number of steps, required fields, optional fields, social login options, any friction points

4. **Trust signals visible**: Privacy messaging, open source badges/links, methodology disclosure, security indicators, testimonials, social proof
   - Look at: footer, about page, landing page, pricing page, any privacy or security pages
   - Document: every trust signal found, its location, and whether it links to supporting evidence

5. **Onboarding experience**: First-use experience after signup (if applicable)
   - Look at: post-signup redirect, welcome screen, empty states, guided tours or tooltips
   - Document: what the user sees immediately after creating an account, what action is prompted first

6. **Feature gating**: Which features require payment? How is the upgrade prompt presented?
   - Look at: locked feature states, upgrade CTAs, paywall modals, pricing page
   - Document: which features are locked, the exact copy used in upgrade prompts, how aggressive the paywall feels

Return a first-time user experience report with specific observations per item.
```

## Phase 2: Technology Opportunities Agent

```
You are identifying opportunities to add client-side, privacy-first, or free-tier features to a web application by cross-referencing its feature set against a catalog of relevant technologies.

Find and document:

1. **Read the technology catalog**: Load the full contents of `references/technology-catalog.md`.
   - Look in: the file at references/technology-catalog.md relative to the skill root
   - Document: all technology categories and entries present in the catalog

2. **Explore the codebase**: Independently survey the app's tech stack, features, and architecture to understand what it does and how.
   - Look in: package.json (dependencies), app routes, API routes, imports, Web Workers, WASM modules, browser API usage
   - Document: app domain, key features, current tech stack, existing client-side capabilities

3. **Assess category applicability**: For each technology category in the catalog, assess whether it's applicable to the app's domain.
   - Look in: the codebase exploration findings above
   - Document: which categories are relevant, which are out of scope, and why

4. **Identify specific opportunities**: For each applicable category, identify concrete features the app could add or migrate.
   - Look in: the app's existing features, current server-side implementations that could move client-side
   - Document: proposed feature name, which catalog technology enables it, what user problem it solves

5. **Assess feasibility**: For each opportunity, evaluate how easy it would be to implement given the existing stack.
   - Look in: package.json, existing imports, current framework and dependencies
   - Document: whether the app already uses similar tech, whether the library is compatible with the existing framework, estimated integration effort (low/medium/high)

6. **Match to free-tier and content-marketing patterns**: Note which opportunities could serve as free tools, demos, or content-marketing entry points that build user trust.
   - Look in: the app's pricing model, current free tier, competitor free offerings
   - Document: which opportunities fit a free-tool or freemium pattern, what audience segment they attract, how they connect to the paid product

Return an opportunity candidates list. For each candidate include: proposed feature name, technology reference from the catalog, feasibility assessment (low/medium/high effort), and relevance to the app's domain and audience.
```
