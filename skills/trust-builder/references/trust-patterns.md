# Trust Patterns

Proven trust-building patterns illustrated with real-world examples from the Mean Weasel / Neonwatty portfolio. These patterns are generalizable — use them as reference when generating opportunities for any web app, adapting the specific technologies and funnel mechanics to the target app's domain.

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
