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
