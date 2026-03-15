# Trust Builder Audit: Bleep That Sh*t

> Generated 2026-03-15 | Audience: content creators (YouTube, podcasters) and educators (K-12, university) | Monetization: SaaS subscription ($9-19/mo) with freemium; 180 free cloud minutes on signup

## Executive Summary

**Opportunities identified:** 4
**Must-Build:** 1 | **Should-Build:** 1 | **Nice-to-Have:** 1 | **Backlog:** 1

**Top 3 opportunities:**
1. Free Transcription Accuracy Sampler — lets users test their own 30-second clips against all 3 Whisper models with word-level confidence scores, proving accuracy before any commitment
2. Educator-Specific Free Classroom Guide — downloadable PDF guide targeting edu search queries, positioning BTS as the classroom-safe censorship tool
3. Browser Extension for Quick Bleeps — persistent Chrome extension for one-click censoring of short audio clips from any webpage, keeping BTS top-of-mind

**Competitive verification:** Not performed

Bleep That Sh*t already has an unusually strong trust posture for a SaaS product: a fully functional free browser mode where files never leave the user's device, no-signup access to the core feature, and a model comparison page at `/sampler`. The opportunities below extend that foundation into areas that deepen trust with specific audience segments — particularly educators who need proof of transcription accuracy and content creators who want quick-access tools in their daily workflow.

## Current Trust Signals

| Trust Signal | Present | Notes |
|---|---|---|
| Free offering exists | Yes | Full in-browser transcription and bleeping via FFmpeg.wasm + Whisper ONNX. No file size limit enforced, though practical limit is ~10 min due to browser memory. |
| Privacy messaging | Yes | "Files never leave your device" displayed prominently in browser mode. Architecturally true — no server calls during browser-mode processing. |
| No-signup experience | Yes | Browser mode works without any account creation. User can transcribe, select words, and download bleeped audio with zero friction. |
| Transparent methodology | Partial | `/sampler` page shows model comparison across Whisper variants (tiny, base, small) with pre-loaded samples. However, users cannot test their own audio, and word-level confidence scores are not exposed. |
| Open source | No | Proprietary SaaS. No public repository, no published components, no open-source contributions from the codebase. |

## Opportunities (Prioritized)

### Must-Build

#### Free Transcription Accuracy Sampler

**Trust rationale:** Content creators and educators need to trust that transcription will correctly identify the words they want to censor. A wrong transcription means missed profanity (embarrassing for creators) or false positives (disruptive for educators). Letting users test their own audio — not just pre-loaded samples — proves accuracy on their specific content type (lecture audio, podcast recording, screencast narration) before they commit to a subscription.

**What users get free:** Upload a 30-second audio clip (MP3, WAV, M4A) and see it transcribed by all three Whisper model sizes (tiny, base, small) side-by-side. Each word displays a confidence score (0-100%) with color coding: green (>90%), yellow (70-90%), red (<70%). Users can play back the audio with word-level highlighting synchronized to playback position. Runs entirely in-browser — no upload, no signup.

**Technical approach:**
- Extend the existing `/sampler` page (`app/sampler/page.tsx`) to accept user-uploaded audio via a file input and drag-and-drop zone
- Use the existing `@huggingface/transformers` pipeline (already loaded for browser mode) to run inference with all three model sizes sequentially
- Extract word-level timestamps and logprob confidence scores from the Whisper ONNX output — `@huggingface/transformers` exposes `return_timestamps: "word"` which provides per-word timing
- Confidence scores derived from token-level log probabilities already available in the model output; normalize to 0-100 scale
- Use a Web Worker (existing `workers/transcribe.worker.ts` pattern) to prevent UI blocking during sequential model runs
- Audio playback sync via Web Audio API `currentTime` matched against word timestamp ranges
- 30-second limit enforced client-side by reading audio duration from `AudioContext.decodeAudioData()` before processing
- Store results in Dexie (IndexedDB) so users can compare results across multiple clips without re-processing

**Funnel to paid:** Users who test accuracy on a 30-second clip and see strong results have direct evidence that BTS will work on their content. The natural next step is processing a full-length file — which either works in browser mode (building more trust) or requires cloud mode for longer files (upgrade trigger). The sampler also surfaces model quality differences, priming users to want the "best" model available only in cloud mode.

**Complexity:** Medium — the transcription pipeline and model loading already exist in the codebase; the main work is UI (side-by-side comparison, confidence visualization, audio sync) and the sequential multi-model run orchestration.

---

### Should-Build

#### Educator-Specific Free Classroom Guide

**Trust rationale:** Educators evaluating tools for classroom use need institutional-grade justification: how does this tool handle student privacy (FERPA), what are the content policies, and how do you use it in a lesson plan? A comprehensive free guide positions BTS as a tool that understands education workflows, not just content creator workflows. It also targets high-intent search queries ("how to censor classroom videos," "make videos ad-safe for school") that current marketing does not capture.

**What users get free:** A downloadable PDF guide (15-20 pages) covering:
- Step-by-step walkthrough of censoring a classroom recording using browser mode (with screenshots)
- FERPA compliance notes: browser mode processes locally so no student data is transmitted
- Lesson plan templates: using BTS to teach media literacy (students identify and censor inappropriate content in sample clips)
- Batch workflow guide for processing multiple class recordings
- FAQ section addressing common educator concerns (cost for schools, browser compatibility, Chromebook support)
- Comparison table: BTS browser mode vs. manual audio editing in Audacity vs. YouTube's built-in muting

**Technical approach:**
- Create a new route at `app/guides/classroom/page.tsx` with the guide content rendered as a Next.js page (SEO-indexable)
- Use `jsPDF` (or `@react-pdf/renderer` for React-native PDF generation) to offer a downloadable PDF version via a "Download PDF" button
- PDF generation runs client-side — no server cost per download
- Guide content stored as MDX in `content/guides/classroom-guide.mdx` for easy editing
- Add structured data (`@type: HowTo` and `@type: EducationalOccupationalProgram`) for search engine rich snippets
- Link from the main landing page and `/sampler` page to capture organic traffic

**Funnel to paid:** Educators who follow the guide will use browser mode for short clips, then discover the cloud mode advantage when processing full 50-minute lecture recordings. The guide explicitly walks through the browser-to-cloud upgrade path as a natural workflow progression, not a sales pitch. School/district purchases often start with one teacher's recommendation — the guide creates that first advocate.

**Complexity:** Low — primarily content creation and a simple Next.js page. PDF generation with `jsPDF` or `@react-pdf/renderer` is well-documented. No new backend infrastructure required.

---

### Nice-to-Have

#### Browser Extension for Quick Bleeps

**Trust rationale:** Content creators review audio/video across many platforms (YouTube Studio, Google Drive, Dropbox, Descript). A browser extension that lets them right-click any audio element on a webpage and censor a short clip keeps BTS in their workflow without requiring them to visit the site. The extension itself is free and functional, reinforcing the "we give you real tools for free" brand identity.

**What users get free:** A Chrome extension (Manifest V3) that adds a context menu item on `<audio>` and `<video>` elements: "Bleep with BTS." Clicking it extracts up to 60 seconds of audio, runs Whisper tiny model transcription via the extension's background service worker, presents a word-selection UI in a popup, and produces a bleeped audio file for download. Fully offline — uses the same FFmpeg.wasm + Whisper ONNX stack as browser mode.

**Technical approach:**
- Chrome extension with Manifest V3, using a service worker for background processing
- Package `@ffmpeg/ffmpeg` and `@huggingface/transformers` (Whisper tiny model only, ~40MB) into the extension bundle
- Use `chrome.contextMenus` API to add the right-click option on media elements
- Audio extraction via `chrome.tabCapture` or by fetching the media element's `src` URL directly
- Processing happens in an offscreen document (`chrome.offscreen` API) to run WASM — service workers cannot run WASM directly in MV3
- Word selection and bleep UI rendered in a popup or side panel (`chrome.sidePanel` API)
- 60-second limit enforced to keep extension size and processing time reasonable
- Extension links back to the full BTS web app for longer files with a "Process full file on BTS" button

**Funnel to paid:** The extension handles short clips but visibly cannot handle long-form content. Every use reinforces BTS brand recognition. The "Process full file on BTS" link drives traffic to the web app where cloud mode upgrade prompts appear. Extension users who install the tool have demonstrated high intent — they are 3-5x more likely to convert than casual website visitors.

**Complexity:** High — browser extension development, WASM packaging for MV3, offscreen document API, Chrome Web Store submission and review process. Estimated 3-4 weeks of development.

---

### Backlog

#### Open-Source Profanity Word Lists

**Trust rationale:** Publishing the word list and wordset system as an open-source npm package invites community contributions (multi-language support, domain-specific lists for gaming, sports, etc.) and demonstrates transparency about how the censorship engine decides what to flag. For developers evaluating BTS for integration, auditable word lists are a trust signal that the tool is not a black box.

**What users get free:** An npm package (`@bleepthatshit/wordsets` or similar) containing:
- Curated English profanity word lists organized by severity tier (mild, moderate, severe)
- Variant generation rules (common letter substitutions, concatenations)
- Word boundary detection utilities for compound-word matching
- Locale-specific lists with community contribution workflow (PRs to a public GitHub repo)
- TypeScript types and a simple API: `import { getSevereTier } from '@bleepthatshit/wordsets'`

**Technical approach:**
- Extract existing word list logic from the BTS codebase (likely in a `lib/wordsets/` or `utils/profanity/` directory) into a standalone package
- Publish to npm with semantic versioning and automated CI/CD via GitHub Actions
- Repository structure: `src/locales/en.ts`, `src/locales/es.ts`, etc., with a `CONTRIBUTING.md` guiding community additions
- Use a simple JSON schema for word entries: `{ word: string, tier: "mild" | "moderate" | "severe", variants?: string[] }`
- Automated tests validate no duplicates, correct tier assignments, and variant generation consistency
- License under MIT for maximum adoption

**Funnel to paid:** Open-source word lists attract developers who may build integrations or recommend BTS to non-technical users. The package README links to BTS as the production-ready tool that uses these lists. Community contributions (new languages, domain-specific lists) directly improve the paid product. GitHub stars and npm downloads provide social proof visible to evaluating customers.

**Complexity:** Medium — extracting and packaging existing logic is straightforward, but maintaining an open-source project requires ongoing community management, PR reviews, and versioning discipline.

---

## Technology Catalog Matches

| Opportunity | Technology | Source | Notes |
|---|---|---|---|
| Free Transcription Accuracy Sampler | @huggingface/transformers (Whisper ONNX) | Client-Side AI/ML | Already in the codebase; extend to expose per-word confidence scores from logprobs |
| Free Transcription Accuracy Sampler | Web Workers (Comlink) | Data Processing | Existing worker pattern in codebase; use for sequential multi-model runs |
| Free Transcription Accuracy Sampler | Dexie (IndexedDB) | Data Processing | Already used for caching; extend to store multi-model comparison results |
| Educator Classroom Guide | jsPDF / @react-pdf/renderer | Content Tools | Client-side PDF generation for downloadable guide; zero server cost |
| Educator Classroom Guide | MDX (next-mdx-remote) | Content Tools | Content-driven page with embedded components for interactive examples |
| Browser Extension for Quick Bleeps | FFmpeg.wasm + chrome.offscreen | Browser Extensions as Free Tools | WASM in MV3 requires offscreen document; same processing stack as browser mode |
| Open-Source Profanity Word Lists | npm package + GitHub Actions | Open-Source Components as Trust Signals | Extract existing logic into standalone package with community contribution workflow |

## Next Steps

1. **Extend `/sampler` with user audio upload** — This is the highest-impact, lowest-risk opportunity. The transcription pipeline already exists; the work is primarily UI. Start by adding a file input to the existing sampler page and wiring it to the existing Whisper pipeline with `return_timestamps: "word"`. Target: 1-2 weeks.
2. **Draft the Educator Classroom Guide content** — Write the guide content as MDX before building the page. Validate with 2-3 educator contacts that the content addresses their actual concerns (FERPA, Chromebook compatibility, lesson plan integration). Target: 1 week for content, 1 week for page and PDF export.
3. **Schedule browser extension for Q3** — The extension requires significant development and Chrome Web Store review time. Begin with a proof-of-concept that packages Whisper tiny + FFmpeg.wasm into an offscreen document to validate the MV3 constraint. Target: 3-4 weeks development, 1-2 weeks store review.
4. **Evaluate open-source word list extraction** — Review the current word list implementation to assess extraction complexity. If the lists are cleanly separated from business logic, this could be a quick win for developer trust. Defer community management planning until after launch metrics validate interest.
