# Trust Builder Skill Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `trust-builder` skill that analyzes web apps for free-value trust-building opportunities, producing a prioritized report with mini-specs.

**Architecture:** A phase-based skill (SKILL.md) with 6 reference documents, 1 example document, and a directory structure matching the established plugin pattern. The skill delegates to 3 parallel exploration agents (codebase, browser, technology catalog), interviews the user, and generates a prioritized opportunity report.

**Tech Stack:** Markdown skill files, YAML frontmatter, Claude Code tool references (TaskCreate, TaskUpdate, AskUserQuestion, Agent, Chrome MCP).

---

## Chunk 1: Core Skill File

### Task 1: Create skill directory structure

**Files:**
- Create: `skills/trust-builder/SKILL.md`
- Create: `skills/trust-builder/references/` (directory)
- Create: `skills/trust-builder/examples/` (directory)

- [ ] **Step 1: Create the directory structure**

```bash
mkdir -p skills/trust-builder/references skills/trust-builder/examples
```

- [ ] **Step 2: Verify directories exist**

Run: `ls -la skills/trust-builder/`
Expected: `references/` and `examples/` directories listed

### Task 2: Write SKILL.md

**Files:**
- Create: `skills/trust-builder/SKILL.md`

- [ ] **Step 1: Write the complete SKILL.md file**

The file must follow the exact pattern established by `skills/adversarial-audit/SKILL.md` and `skills/resilience-audit/SKILL.md`. Key structural requirements:

1. **YAML frontmatter** — `name: trust-builder` (must match directory name exactly), `description:` with trigger phrases inline
2. **Title** — `# Trust Builder Skill`
3. **Persona paragraph** — from spec: product strategist and technical architect specializing in trust-first growth
4. **Task List Integration** — table of all task types + session recovery decision table
5. **Process** — 7 phases exactly as specified in the design spec:
   - Phase 1: Assess Current State & Interview (create main task, identify tech stack, ask for base URL, interview questions via AskUserQuestion, ask about Phase 5 opt-in)
   - Phase 2: Explore the Application (3 parallel agents: Codebase Architecture, Live App Experience, Technology Opportunities)
   - Phase 3: Generate Opportunity Mini-Specs (7 fields per opportunity: name, rationale, free value, technical approach, funnel, complexity, priority)
   - Phase 4: Prioritize & Score (4 tiers: Must-build, Should-build, Nice-to-have, Backlog)
   - Phase 5: Competitive Verification (optional, based on Phase 1 preference)
   - Phase 6: Review with User (REQUIRED, AskUserQuestion with 4 options)
   - Phase 7: Write Report and Complete (write to `/reports/trust-builder-audit.md`, final summary format)
6. **Reference Materials** — links to all 6 reference docs using relative markdown links
7. **No TODOs, no placeholders, no "see below"** — everything must be self-contained

Content for the frontmatter `description` field:

```yaml
---
name: trust-builder
description: Analyzes web apps for free-value trust-building opportunities — features, tools, and offerings that demonstrate genuine utility before asking for commitment. Use this when the user says "trust builder", "trust audit", "find free offerings", "free value analysis", "trust building opportunities", or "how can I build trust with users". Explores the codebase and live app, interviews the user about audience and goals, then generates a prioritized report with full mini-specs for the top trust-building features. Tailored to the Mean Weasel / Neonwatty portfolio.
---
```

The Phase 1 interview questions to include (via AskUserQuestion):
- Who is the primary audience for this app?
- What's the current or planned monetization model?
- What does "trust" mean for your users? (e.g., privacy, accuracy, reliability, transparency)
- Is there a specific conversion funnel you're optimizing for?
- Are there any constraints on what you can offer for free? (e.g., API costs, compute limits)

The Phase 2 agent table must specify all three agents with Focus and Key Outputs columns matching the spec.

The Phase 6 AskUserQuestion options: **Approve** / **Deep-dive on specific opportunities** / **Re-run with different focus** / **Add ideas I have**

The Phase 7 final summary must match the format in the spec exactly (App, Audience, Opportunities found with counts per tier, Top Opportunities, Current Trust Posture, Recommended Next Steps).

The Reference Materials section must link to all 6 files:
- `references/agent-prompts.md`
- `references/technology-catalog.md`
- `references/interview-questions.md`
- `references/verification-prompts.md`
- `references/report-structure.md`
- `references/trust-patterns.md`

Plus one example link:
- `examples/trust-builder-example.md`

- [ ] **Step 2: Validate the skill file passes validation**

Run: `bash scripts/validate-skills.sh`
Expected: `trust-builder` listed with `✓ Valid`, all other skills still valid, exit 0

- [ ] **Step 3: Commit**

```bash
git add skills/trust-builder/SKILL.md
git commit -m "feat: add trust-builder skill SKILL.md"
```

## Chunk 2: Agent Prompts Reference

### Task 3: Write agent-prompts.md

**Files:**
- Create: `skills/trust-builder/references/agent-prompts.md`

- [ ] **Step 1: Write the agent prompts reference file**

This file must contain full, self-contained prompts for 3 exploration agents. Follow the pattern from `skills/adversarial-audit/references/agent-prompts.md` — each prompt is a fenced code block under an H2 heading, with numbered items telling the agent exactly what to find and where to look.

**Structure:**

```markdown
# Agent Prompts

## Phase 2: Codebase Architecture Agent

(fenced code block with full prompt)

## Phase 2: Live App Experience Agent

(fenced code block with full prompt)

## Phase 2: Technology Opportunities Agent

(fenced code block with full prompt)
```

**Codebase Architecture Agent prompt must include:**
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

Return: structured summary with code file locations for each finding.

**Live App Experience Agent prompt must include:**
Instructions to use Chrome MCP tools to visit the app at [BASE_URL] as a first-time user. Must check:
1. **First impression**: Landing page, value proposition clarity, call-to-action
2. **Free access**: What can be done without creating an account? Navigate every path available without signup.
3. **Signup friction**: What's required to create an account? How many steps? What information is collected?
4. **Trust signals visible**: Privacy messaging, open source badges/links, methodology disclosure, security indicators, testimonials, social proof
5. **Onboarding experience**: First-use experience after signup (if applicable)
6. **Feature gating**: Which features require payment? How is the upgrade prompt presented?

Return: first-time user experience report with specific observations per item.

Include browser setup instructions: call `tabs_context_mcp`, create tab via `tabs_create_mcp`, navigate to base URL.

**Technology Opportunities Agent prompt must include:**
Instructions to cross-reference the app's feature set (from codebase analysis) against the technology catalog in `references/technology-catalog.md`. Must:
1. Read the technology catalog
2. For each technology category, assess whether it's applicable to the app's domain
3. For applicable categories, identify specific opportunities (e.g., "this app processes audio — FFmpeg.wasm could enable free in-browser processing")
4. Note feasibility (already uses similar tech? compatible with existing stack?)
5. Note any free-tier or content-marketing patterns that match the app's audience

Return: opportunity candidates with technology reference, feasibility assessment, and relevance to app domain.

- [ ] **Step 2: Commit**

```bash
git add skills/trust-builder/references/agent-prompts.md
git commit -m "feat: add trust-builder agent prompts reference"
```

## Chunk 3: Technology Catalog Reference

### Task 4: Write technology-catalog.md

**Files:**
- Create: `skills/trust-builder/references/technology-catalog.md`

- [ ] **Step 1: Write the technology catalog reference file**

This is the curated catalog of free-value-capable technologies. Organized by domain with specific libraries, use cases, and examples. Each section should be actionable — not just "use WASM" but "FFmpeg.wasm enables client-side audio/video processing without server costs, used by Bleep That Sh*t for in-browser bleeping."

**Structure and content:**

```markdown
# Technology Catalog

Curated catalog of technologies and patterns for building free-value trust features. Organized by domain. Each entry includes the technology, what it enables, and an example or use case.

## Client-Side Media Processing

| Technology | What It Enables | Example Use Case |
|-----------|----------------|-----------------|
| FFmpeg.wasm (@ffmpeg/ffmpeg) | Audio/video transcoding, format conversion, trimming, mixing in-browser | Bleep That Sh*t: free in-browser audio bleeping |
| Whisper ONNX (@huggingface/transformers) | Speech-to-text transcription in-browser via ONNX Runtime Web | Bleep That Sh*t: free in-browser word-level transcription |
| MediaPipe (@mediapipe/tasks-vision) | Real-time person segmentation, hand/face/pose detection in-browser | Meet Camera Overlay: person occlusion for virtual backgrounds |
| Web Audio API | Audio analysis, synthesis, effects processing natively in browser | Spectrum analyzers, audio effects demos, sound processing tools |
| Canvas API / WebGL | Image manipulation, real-time rendering, visual effects | Photo editors, image filters, visual demos |

## Client-Side AI/ML

| Technology | What It Enables | Example Use Case |
|-----------|----------------|-----------------|
| TensorFlow.js | Pre-trained model inference in-browser (object detection, classification, NLP) | Phone Lunk Alarm: real-time phone detection via COCO-SSD |
| ONNX Runtime Web | Run ONNX models in-browser with WebAssembly/WebGL acceleration | Whisper transcription, image classification, text embedding |
| @huggingface/transformers | Transformer model inference in-browser (text, vision, audio) | Text summarization, sentiment analysis, image captioning demos |
| WebLLM (MLC AI) | Run large language models in-browser via WebGPU | AI chat demos, text generation tools without API costs |
| CLIP (via ONNX) | Image-text similarity matching in-browser | Visual search, content matching, similarity demos |

## Content Tools

| Technology | What It Enables | Example Use Case |
|-----------|----------------|-----------------|
| PDF.js (Mozilla) | Render and interact with PDFs in-browser without server | In-browser PDF viewer, annotation tool, form filler |
| Client-side export (jsPDF, html2canvas) | Generate PDFs, images, and documents entirely in-browser | Report export, certificate generation, invoice creation |
| Canvas/WebGL rendering | Real-time graphics, image processing, visual effects | Photo editors, data visualization, interactive diagrams |
| Document generation (docx, xlsx libs) | Create Word/Excel documents in-browser | Template-based document builders, spreadsheet exporters |
| Markdown/rich text editors (Tiptap, ProseMirror) | In-browser content creation with formatting | Blog editors, note-taking tools, documentation builders |

## Data Processing

| Technology | What It Enables | Example Use Case |
|-----------|----------------|-----------------|
| WebAssembly (WASM) | Near-native performance for compute-heavy tasks in-browser | File format conversion, compression, encryption |
| Web Workers | Parallel background processing without blocking UI | Batch data processing, model inference, file parsing |
| IndexedDB (via Dexie) | Large-scale structured data storage client-side | Offline-first apps, client-side databases, caching layers |
| Comlink (with Web Workers) | Simple API for offloading compute to workers | Heavy computation with clean async interface |
| Client-side compression (fflate, pako) | Zip/gzip/deflate entirely in-browser | File archiving, download optimization |

## Browser APIs for Free Features

| API | What It Enables | Example Use Case |
|-----|----------------|-----------------|
| Web Speech API | Speech recognition and text-to-speech natively | Voice input, dictation tools, accessibility features |
| MediaDevices (Camera/Mic) | Access webcam and microphone for real-time processing | AR effects, video recording, audio analysis |
| FileSystem Access API | Read/write local files without server upload | Local file editors, batch processors |
| Web Share API | Native sharing UI on mobile devices | One-tap social sharing from web apps |
| Notifications API | Push notifications without native app | Alerts, reminders, status updates |
| Service Workers | Offline support, background sync, caching | PWA capabilities, offline-first features |

## Free-Tier and Freemium Patterns

| Pattern | How It Works | Example |
|---------|-------------|---------|
| Client-side core / cloud upgrade | Core feature runs in-browser for free, cloud version for power users | Bleep That Sh*t: browser mode (free) vs. cloud mode (paid) |
| Signup grant | Free resource allocation on account creation to demo paid features | Bleep That Sh*t: 180 free cloud minutes on signup |
| Feature-gated freemium | Basic features free, advanced features paid | Free basic scan, paid detailed analysis |
| Usage-limited free tier | Free up to N uses per month, paid for more | 5 free scans/day, unlimited with subscription |
| Time-limited trial | Full access for N days, then downgrade | 14-day free trial of all features |
| Community / personal-use tier | Free for individuals, paid for teams/commercial | Open-source for personal use, commercial license for business |

## Content Marketing as Trust

| Pattern | What It Provides | Example |
|---------|-----------------|---------|
| Free tools / calculators | Standalone utility that demonstrates expertise | ROI calculator, compliance checker, readiness assessment |
| Downloadable templates | Structured documents users need in the app's domain | Speaker submission brief, event checklist, brand guideline template |
| Interactive demos / sandboxes | Try the product with sample data, no account needed | Pre-loaded demo environment with sample violations/results |
| Educational guides | Comprehensive how-to content targeting search intent | "Complete Guide to Collecting Speaker Presentations" |
| Open-source components | Publishing reusable parts of the stack | Open-source detection pipeline, word lists, scoring algorithms |
| Case studies / investigations | Real-world demonstrations of the product's value | ScamShield: Filson case study showing detection methodology |

## Browser Extensions as Free Tools

| Approach | What It Enables | Example |
|---------|----------------|---------|
| Free Chrome/Firefox extension | Persistent free tool that builds brand awareness | ScamShield: planned browser extension for real-time scam warnings |
| Extension as product gateway | Extension provides basic feature, website provides full product | ytgify-glue: extension creates GIFs, web app stores/manages them |
| Extension with freemium upgrade | Extension is free, premium features in web app | Ad blockers, productivity tools with premium dashboards |

## Open-Source Components as Trust Signals

| Approach | What It Enables | Example |
|---------|----------------|---------|
| Open-source the full product | Community validation, auditable code, self-hosting option | Meme Search: 643 stars, community trust through transparency |
| Open-source a core library | Demonstrate expertise, attract developers, build credibility | Publishing detection algorithms, scoring engines, processing pipelines |
| Open-source datasets/word lists | Community contributions improve quality, build authority | Profanity word lists, scam domain databases, brand impersonation patterns |
| Public API / reference implementation | Enable integrations, demonstrate capability | Public API endpoints for basic checks, embeddable widgets |
```

- [ ] **Step 2: Commit**

```bash
git add skills/trust-builder/references/technology-catalog.md
git commit -m "feat: add trust-builder technology catalog reference"
```

## Chunk 4: Interview Questions, Verification Prompts, and Report Structure References

### Task 5: Write interview-questions.md

**Files:**
- Create: `skills/trust-builder/references/interview-questions.md`

- [ ] **Step 1: Write the interview questions reference file**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add skills/trust-builder/references/interview-questions.md
git commit -m "feat: add trust-builder interview questions reference"
```

### Task 6: Write verification-prompts.md

**Files:**
- Create: `skills/trust-builder/references/verification-prompts.md`

- [ ] **Step 1: Write the verification prompts reference file**

Follow the pattern from `skills/adversarial-audit/references/verification-prompts.md`.

```markdown
# Verification Prompts

## Phase 5: Competitive Verification Agent

(backtick-fenced code block containing the full agent prompt)
```

The prompt must instruct the agent to:
1. **Set up**: Call `tabs_context_mcp`, create a new tab via `tabs_create_mcp`
2. **For each competitor/comparable app provided:**
   - Navigate to the competitor's website
   - Identify what free offerings exist (free tools, demos, trials, browser extensions, free tiers)
   - Note what trust signals are visible (privacy messaging, open source, testimonials, methodology disclosure)
   - Capture screenshots of free offerings and trust signals
3. **Compare against proposed opportunities:**
   - For each proposed opportunity, note whether a competitor already offers something similar
   - Flag opportunities where the proposed feature would be undifferentiated ("me too")
   - Flag opportunities where no competitor offers anything similar (differentiation advantage)
4. **Return**: Competitive landscape table with columns: Competitor, Free Offerings, Trust Signals, Overlap with Proposed, Differentiation Notes

Include browser setup instructions and evidence directory structure:
```
/reports/trust-builder-evidence/
├── screenshots/
│   ├── competitor-1-free-offering.png
│   ├── competitor-2-trust-signals.png
│   └── ...
└── competitive-landscape.md
```

- [ ] **Step 2: Commit**

```bash
git add skills/trust-builder/references/verification-prompts.md
git commit -m "feat: add trust-builder verification prompts reference"
```

### Task 7: Write report-structure.md

**Files:**
- Create: `skills/trust-builder/references/report-structure.md`

- [ ] **Step 1: Write the report structure reference file**

Follow the pattern from `skills/adversarial-audit/references/report-structure.md`. Include the complete report template from the design spec, plus report guidelines.

The template must include all sections from the spec:
1. Title with app name
2. Metadata line (date, audience, monetization model)
3. Executive Summary (2-3 sentences)
4. Current Trust Signals table (5 signals: free offering, privacy messaging, no-signup experience, transparent methodology, open source)
5. Opportunities (Prioritized) with 4 tiers (Must-Build, Should-Build, Nice-to-Have, Backlog)
6. Each opportunity with 5 fields: trust rationale, what users get free, technical approach, funnel to paid, complexity
7. Technology Catalog Matches
8. Competitive Landscape (include note: "Section omitted if Phase 5 was not run")
9. Next Steps

Report guidelines (matching adversarial-audit pattern):
- Be specific: include file paths and library names, not just "add a free feature"
- Be actionable: each mini-spec should be implementable without further research
- Be honest about feasibility: if an opportunity requires significant infrastructure, say so
- Include the funnel: every free offering should have a clear path to value for the operator
- Note what's already working: acknowledge existing trust signals that are effective

- [ ] **Step 2: Commit**

```bash
git add skills/trust-builder/references/report-structure.md
git commit -m "feat: add trust-builder report structure reference"
```

## Chunk 5: Trust Patterns Reference and Example

### Task 8: Write trust-patterns.md

**Files:**
- Create: `skills/trust-builder/references/trust-patterns.md`

- [ ] **Step 1: Write the trust patterns reference file**

This is the portfolio-specific reference — proven trust-building patterns from Mean Weasel / Neonwatty apps. Each pattern must include: what was done, why it builds trust, the technical approach, and the funnel mechanics.

```markdown
# Trust Patterns — Mean Weasel Portfolio

Proven trust-building patterns from the Mean Weasel / Neonwatty portfolio. Use these as reference when generating opportunities for new apps.

## Pattern 1: Free In-Browser Processing (Bleep That Sh*t)

**What:** Full audio transcription and bleeping runs entirely in-browser via WebAssembly and Web Workers. No signup, no server, no data upload. Files never leave the user's device.

**Why it builds trust:**
- Zero friction: user experiences core value in seconds
- Privacy: "files never leave your device" is verifiable and legally accurate
- No bait-and-switch: the free version does real work, not a crippled demo

**Technical approach:**
- FFmpeg.wasm (@ffmpeg/ffmpeg + @ffmpeg/core) for audio/video processing
- Whisper ONNX via @huggingface/transformers for speech-to-text
- Web Workers for background processing (keeps UI responsive)
- Dexie (IndexedDB) for client-side caching of transcription results

**Funnel mechanics:**
1. User arrives (SEO, social, direct)
2. Processes a short file in-browser — experiences full product
3. Hits limitation (file too long, wants faster processing)
4. Signup prompt appears with 180 free cloud minutes
5. Cloud mode is 10-100x faster (Groq API) — compelling upgrade

**Key constraint:** Browser mode works for clips up to ~10 minutes (limited by browser memory/compute).

## Pattern 2: Full Free Client-Side App (Phone Lunk Alarm)

**What:** The entire app runs client-side with TensorFlow.js (COCO-SSD model). Camera access, real-time detection, alarm, recording, and social sharing — all without any server or account.

**Why it builds trust:**
- Instant gratification: open the page, allow camera, see it work
- No data collection: no accounts, no personal data, no video upload
- Shareable output: recorded clips with watermarks create organic word-of-mouth

**Technical approach:**
- TensorFlow.js 4.22.0 for object detection
- COCO-SSD 2.2.3 pre-trained model
- react-webcam for camera access
- Canvas API for recording with overlays

**Funnel mechanics:**
1. User sees viral clip on social media
2. Visits app, tries demo instantly
3. Creates and shares their own clip (viral loop)
4. Future: premium sounds, gym integrations, kiosk mode

**Key constraint:** Currently no server-side component at all — future monetization requires adding one.

## Pattern 3: Transparent Methodology (ScamShield)

**What:** Full public disclosure of scoring methodology — exact point values, threshold ranges, detection signals, and explicit limitations (what the tool cannot do).

**Why it builds trust:**
- Honesty about limitations ("legitimate result is not a guarantee") builds credibility
- Users can verify the methodology — it's not a black box
- Evidence chain UI shows every signal, not just pass/fail

**Technical approach:**
- 7-checker OSINT pipeline (WHOIS, DNS, IP, HTTP, SSL, domain patterns, fingerprinting)
- Weighted scoring with transparent thresholds
- Plain-English explanations of every signal
- Actionable guidance per verdict tier (FTC reporting links, chargeback instructions)

**Funnel mechanics:**
1. User encounters suspicious website
2. Pastes URL, gets transparent analysis instantly (no signup)
3. Shares result or bookmarks tool
4. Future: browser extension (real-time), API (B2B), brand protection partnerships

## Pattern 4: No-Backend Architecture as Trust (Meet Camera Overlay)

**What:** All processing (MediaPipe segmentation, WebGL rendering, image/GIF handling) runs locally in the browser. No backend, no database, no data collection.

**Why it builds trust:**
- Architectural guarantee of privacy — there's literally no server to send data to
- For church and education audiences (privacy-sensitive), "no data leaves your device" is a powerful differentiator
- No account wall — open the page and use it

**Technical approach:**
- MediaPipe tasks-vision for person segmentation
- WebGL for real-time rendering (Canvas2D fallback)
- IndexedDB for local storage of user-uploaded content
- Vanilla JS with ES modules (no framework overhead)

**Funnel mechanics:**
1. User discovers tool (search, recommendation)
2. Uses wall art feature immediately on webcam
3. Chrome extension provides persistent access
4. Future: premium template packs, integration partnerships

## Pattern 5: Open Source Community Trust (Meme Search)

**What:** Fully open-source, self-hostable meme search engine with 643 GitHub stars and a Discord community.

**Why it builds trust:**
- Code is auditable — users can verify what it does
- Self-hostable — users control their own data
- Community validation — 643 stars = social proof from developers
- Active development visible in commit history

**Technical approach:**
- Rails 8 + Python 3.12 + PostgreSQL with pgvector
- VLM image-to-text indexing (multiple model sizes)
- Docker for easy self-hosting
- Apache 2.0 license (permissive)

**Funnel mechanics:**
1. Developer discovers repo (GitHub trending, search, HN)
2. Stars repo, joins Discord
3. Self-hosts and uses
4. Community contributions improve the tool
5. Future: hosted version as SaaS alternative to self-hosting

## Common Principles Across Patterns

1. **The free offering must do real work** — not a crippled demo, not a teaser, not "sign up to see results"
2. **Privacy claims must be architecturally true** — "files never leave your device" only works if there's no server call
3. **The limitation that drives conversion should be natural** — file size limits, processing speed, feature depth — not artificial gates
4. **Trust signals should be visible, not buried** — privacy messaging on the landing page, methodology on the about page, open source badge in the header
5. **The funnel should feel like a service, not a trap** — upgrade prompts should acknowledge the free version's value
```

- [ ] **Step 2: Commit**

```bash
git add skills/trust-builder/references/trust-patterns.md
git commit -m "feat: add trust-builder trust patterns reference"
```

### Task 9: Write trust-builder-example.md

**Files:**
- Create: `skills/trust-builder/examples/trust-builder-example.md`

- [ ] **Step 1: Write the example report**

This is a complete example of what the trust-builder report output looks like, modeled on Bleep That Sh*t — the portfolio's canonical trust-building case. Follow the report template from `references/report-structure.md` exactly.

The example must include:
1. Full report header (App: Bleep That Sh*t, Date, Audience: content creators and educators, Monetization: SaaS subscription with freemium)
2. Executive Summary (2-3 sentences covering the existing browser-mode trust builder and identifying additional opportunities)
3. Current Trust Signals table (5 rows, with actual assessments for Bleep That Sh*t — most should be "yes" since this app already has strong trust signals)
4. At least 1 Must-Build opportunity with all 5 fields filled in completely (this should be an opportunity BEYOND what already exists, e.g., a free model comparison tool, expanded free sampler, or educational content)
5. At least 1 Should-Build opportunity with all 5 fields
6. At least 1 Nice-to-Have opportunity with all 5 fields
7. At least 1 Backlog opportunity with all 5 fields
8. Technology Catalog Matches section (showing which catalog entries match audio/video processing domain)
9. Next Steps section

Example Must-Build opportunity (for reference, adapt as appropriate):
- **Name:** "Free Transcription Accuracy Sampler"
- **Trust rationale:** Content creators need to trust transcription accuracy before committing to a paid plan. The existing /sampler page compares models, but expanding it to let users test their own short clips would demonstrate accuracy on THEIR content.
- **What users get free:** Upload a 30-second clip, get transcription from all 3 Whisper models side-by-side, with accuracy comparison and word-level confidence scores
- **Technical approach:** Already exists partially as /sampler page using @huggingface/transformers. Extend to accept user uploads (short clips only) and display confidence-per-word visualization
- **Funnel to paid:** Users who see accurate transcription on their own content → trust the product → sign up for cloud mode for longer files
- **Complexity:** Small — sampler page and browser-mode processing already exist, just needs user upload integration and confidence visualization

- [ ] **Step 2: Commit**

```bash
git add skills/trust-builder/examples/trust-builder-example.md
git commit -m "feat: add trust-builder example report"
```

### Task 10: Final validation and commit

**Files:**
- Verify: `skills/trust-builder/SKILL.md`
- Verify: All reference and example files

- [ ] **Step 1: Run skill validation**

Run: `bash scripts/validate-skills.sh`
Expected: All skills valid including trust-builder, exit 0

- [ ] **Step 2: Run markdown linting**

Run: `npx markdownlint-cli2 "skills/trust-builder/**/*.md"`
Expected: No errors (warnings are acceptable)

- [ ] **Step 3: Verify all reference links in SKILL.md resolve**

Run: `ls skills/trust-builder/references/ skills/trust-builder/examples/`
Expected: All 6 reference files and 1 example file present:
- `references/agent-prompts.md`
- `references/technology-catalog.md`
- `references/interview-questions.md`
- `references/verification-prompts.md`
- `references/report-structure.md`
- `references/trust-patterns.md`
- `examples/trust-builder-example.md`

- [ ] **Step 4: Commit any linting fixes**

```bash
git add skills/trust-builder/
git commit -m "fix: address linting issues in trust-builder skill"
```

(Only if linting found issues. Skip if clean.)
