NORIA — Master Vision & Requirements
> "Intelligence with Elegance"
> A SkyGlobe Group creation. Goal: build NORIA into **the best AI in the history of mankind.**
> This document is the single source of truth. When we build the backend, everything here must be honored.
---
1. Identity & Brand
Name: NORIA (currently NORIA 1 — first generation)
Tagline: Intelligence with Elegance
Creator: SkyGlobe Group
Domain: noria.skyglobegroup.com
Personality: calm, wise, confident but never arrogant; precise, accurate, warm, professional — a trusted expert advisor.
Self-description (when asked who it is):
> "I am NORIA — SkyGlobe Group's AI intelligence assistant, built to serve the world with accuracy, depth, care, and action. My purpose is to be a trusted guide for knowledge, decisions, and discovery. Intelligence with Elegance is not just my tagline — it is my promise."
Must never reveal its underlying model or technical stack.
Logo / Visual identity
Colors: white + gold is the default app theme; brand mark is a blue compass rose (blue spikes, gold/orange ring, serif "N", 8-point star at north, small accent star).
Original artwork: gold N-compass on navy (provided as images). Current logo is an SVG recreation of the blue/white compass version. TODO: replace with exact artwork when the user provides real PNG files (uploaded as actual files, not chat-embedded previews).
Favicon matches the logo.
---
2. Current State — Frontend (DONE)
File: `noria/index.html` — a self-contained, single-file web app.
Implemented:
Chat UI (send/receive), word-by-word answer reveal
Conversation history (localStorage, per browser)
Light / Dark themes (persisted)
Voice input (Web Speech API) + Read-aloud (speech synthesis)
Markdown rendering (marked) + sanitization (DOMPurify): headers, lists, tables, code blocks, blockquotes
Copy-message button
Mobile responsive, premium typography (Cormorant Garamond + Inter)
Compass-rose SVG logo + favicon
NORIA system prompt embedded
Talks to backend engine: `https://noria-engine.onrender.com/v1/ask`
POST `{ query, history, system }` → expects `{ answer, sources? }`
NOT in frontend (depends on backend / future work): see Section 3.
---
3. The Backend — "The Massive Job" (FUTURE)
This is where NORIA becomes truly world-class. Everything below was discussed and must be delivered.
3.1 Core intelligence
World-class accuracy and depth across all domains.
Deep expertise in: Africa, global mobility/immigration, world history, science, business, technology, finance.
Versatility — handle any topic, any language (match user's language).
Honest about uncertainty; cites sources where possible.
Real-time / web-grounded knowledge (retrieval + citations).
3.2 High fintech document creativity  ⭐ (explicitly requested)
Generate professional financial / business documents: reports, invoices, statements, pitch decks, business plans, financial models.
Export formats: PDF, Word (.docx), Excel (.xlsx), possibly PowerPoint.
High design quality — branded, elegant, presentation-ready.
Charts / tables / financial calculations baked in.
3.3 Image quality & creation  ⭐ (explicitly requested)
AI image generation (text-to-image) with high quality.
Image understanding (vision — analyze uploaded images).
Possibly image editing / background removal (note: `rembg` tooling was referenced).
Display + download generated images in the UI.
3.4 Performance
Fast responses; avoid cold-start delays (current Render free tier sleeps ~30s — upgrade hosting).
Streaming responses (token-by-token) from the backend.
Scalable architecture.
3.5 Other capabilities discussed / implied
File upload (documents, images) for analysis.
Rate limiting / usage management (earlier frontend had a 40/day free limit concept — decide final policy).
Multi-turn memory beyond a single browser (accounts? cloud sync?).
"Free for everyone" positioning was a theme — confirm monetization vs free tiers.
---
4. Model / Tech notes
When building AI features, default to the latest, most capable Claude models (e.g., Opus 4.x / Sonnet 4.x family) per current best practice.
Keep the model/stack hidden from end users (per identity rules).
---
5. Operational notes / blockers encountered
This session has no write access (403) to push to GitHub directly, and no GPG signing. Deployment is done by the user manually uploading `noria/index.html` to `main`.
Logo images shared in chat are previews only — real artwork must be uploaded as actual files to be embedded pixel-perfectly.
---
6. The Promise
NORIA must ultimately be the best AI in the history of mankind — accuracy, depth, versatility, fintech document mastery, image creation, elegance, and care. NORIA 1 (this app) is step one. The backend is where the legend is built.
Keep this file updated as the vision evolves.
