NORIA — System Architecture & Evolution
> "Intelligence with Elegance" · A SkyGlobe Group creation
> Goal: build NORIA into the best AI in the history of mankind.
> This document is the architectural source of truth. Build to it.
---
0. Design Principles
Every decision is measured against four words:
Principle	What it means in practice
Simplicity	One clean interface. Complexity hidden behind the Orchestrator. A user types one thing; NORIA decides everything.
Professionalism	Accuracy, depth, care, action. Zero guessing. Cited knowledge. Audit trails.
Premium	Elegant UI, fast responses, document/image quality that looks designed, not generated.
Evolution	Every layer is swappable. Models, agents, and engines can be upgraded without rewriting the rest.
---
1. The Layered Architecture (NORIA 5 — Human-Centred Model)
> The architecture is split into two altitudes:
> **Human Engines** = *what NORIA does for a person's life.*
> **System Layers** = *how the machine actually works.*
> Engines never store their own data — they **consume** the system layers below.
```
USERS
  │
  ▼
EXPERIENCE & BRAND LAYER   Signature logo · Premium minimal UI · Elegant type ·
                           Smooth animations · Multi-device sync · Offline ·
                           Accessibility · Personalisation · Visual consistency
  │
  ▼
THE 5 HUMAN ENGINES        (the soul of NORIA — a human life, in order)
  ├── 1. PURPOSE ENGINE     Vision · reasoning · strategy · life direction
  ├── 2. WELLNESS ENGINE    Empathy · clarity · resilience · trust · safety
  ├── 3. WISDOM ENGINE      Learning · research · tutoring · multimodal · facts
  ├── 4. PROSPERITY ENGINE  Business · finance · automation · productivity
  └── 5. IMPACT ENGINE      Community · government/NGO · health · agriculture
  │
  ▼
NORIA INTELLIGENCE CORE    Strong reasoning · multi-step thinking ·
   (THE BRAIN)             self-verification · context · decision synthesis
  │
  ▼
MEMORY & LEARNING SYSTEM   Long-term memory · knowledge graph ·
                           continuous learning · feedback loop · personalisation
  │
  ▼
KNOWLEDGE & DATA INTEL.    Real-time data · verified sources · enterprise KB ·
                           document understanding · privacy-first ownership
  │
  ▼
ACTION & AUTONOMY LAYER    AI agents · workflow automation · task execution ·
                           tool integration · scheduling engine
  │
  ▼
MODEL ABSTRACTION LAYER    Noria Models · Llama · Mistral · Gemma ·
                           local AI (Ollama) · hybrid cloud + edge
  │
  ▼
INFRASTRUCTURE & DATA      Vector DB · PostgreSQL · Knowledge Graph ·
                           Object Storage · distributed AI compute
  │
  ▼
SECURITY · GOVERNANCE · TRUST   Encryption / zero-trust · audit logs ·
                                bias detection · permission-based memory ·
                                enterprise compliance
```
Why this model
Human outcomes, not capabilities. ChatGPT is organised around features. NORIA is organised around a person's life: find direction (Purpose) → stay well (Wellness) → grow knowledge (Wisdom) → build wealth (Prosperity) → leave a legacy (Impact).
The engine names map onto the sidebar Projects (Vision, Vitality, Wisdom, Wealth, Legacy) — UI and architecture tell the same story.
One service, many consumers. Memory and Knowledge appear inside engines and as their own layers. In the build there is exactly one Memory service and one Knowledge service; engines ask them, they never keep private copies.
---
2. Layer-by-Layer Specification
2.1 Experience Layer
The faces of NORIA. All talk to the same Orchestrator API.
Web — the current `noria/index.html` (NORIA 1). Login, projects, toolbar, search, chat. (LIVE)
Mobile — PWA first (installable), native apps later.
Desktop — Electron wrapper sharing the web core.
API — public/partner API so others build on NORIA.
Voice — speech in/out (already in NORIA 1 via Web Speech; later: real-time voice).
2.2 Identity & Security
Authentication — accounts (email/social/SSO). Replaces today's name-only login.
RBAC — roles: Guest, User, Pro, Business, Admin. Gates features (Upgrade tier).
Encryption — at rest + in transit. Per-user data isolation.
Audit Logs — every action traceable (professionalism + compliance).
Compliance — GDPR/data-protection ready; document confidentiality (esp. Legal/Official docs).
2.3 NORIA Orchestrator — the brain stem
The single most important component. The user never sees it.
Request Routing — classify intent → pick engine(s) + agent(s).
Agent Coordination — run multiple agents, merge results.
Task Planning — break complex requests into steps (e.g. "make a business plan" → research → draft → format → export).
Workflow Management — multi-turn, long-running jobs, document pipelines.
2.4 The 5 Human Engines — the soul of NORIA
Each engine is a human outcome, not a technical feature. They sit above the Intelligence Core and call down into it and the system layers.
#	Engine	Serves	Sidebar Project(s)	Draws on
1	Purpose (Vision + Intelligence)	Deep reasoning, decision support, strategy, planning, truthfulness, uncertainty awareness, long-term life direction	Vision, Purpose	Intelligence Core
2	Wellness (Human-Centred)	Empathy, communication clarity, patience, resilience support, cultural awareness, trust, accessibility, safe interaction	Vitality	Memory + Safety
3	Wisdom (Learning + Knowledge + Research)	Education, tutoring, coding assistant, research agent, document generation, multimodal (text/image/audio/video), fact-checking	Wisdom, Educational Docs, Home Work	Knowledge + Action
4	Prosperity (Business + Automation + Economy)	Business advisor, financial analysis, fintech documents, workflow automation, enterprise tools, productivity, decision optimisation	Wealth, Business/Office Docs	Action + Knowledge
5	Impact (Community + Global Utility)	Humanitarian support, education access, government & NGO tools, agriculture & health, collaboration, social innovation	Legacy, Global Opportunities, Official/Legal Docs	All layers
> **The order is a human life:** Purpose → Wellness → Wisdom → Prosperity → Impact. No competitor's architecture reads like this.
2.4b The System Layers (below the engines)
The engines are the soul; these are the body. Each engine consumes them — none is owned by a single engine.
Layer	Responsibility
Intelligence Core (Brain)	Strong reasoning, multi-step thinking, self-verification & correction, context understanding, decision synthesis — powers every answer
Memory & Learning	Long-term memory (user + org + projects), knowledge graph, continuous learning, feedback loop, personalisation
Knowledge & Data Intelligence	Real-time data, verified sources, fact-checking, enterprise KB, document understanding, privacy-first ownership
Action & Autonomy	AI agents (research, coding, business, education), workflow automation, task execution, tool integration, scheduling
Model Abstraction	Noria Models, Llama/Mistral/Gemma, local AI (Ollama), hybrid cloud + edge inference
Infrastructure & Data	Vector DB, PostgreSQL, Knowledge Graph, Object Storage, distributed AI compute
Security · Governance · Trust	Encryption/zero-trust, audit logs, bias detection & ethical filters, permission-based memory, enterprise compliance
2.5 Specialized Agents
Each agent = focused expertise + tools. They mirror the sidebar Projects so the UI and architecture stay aligned.
Agent	Sidebar Project(s)	Does
Vision Agent	Vision, Purpose	Strategy, planning, foresight, goal-setting
Vitality Agent	Vitality	Health, wellbeing, energy, lifestyle
Wisdom Agent	Wisdom, Home Work, Educational Docs	Knowledge, learning, tutoring, history
Wealth Agent	Wealth, Business Docs	Fintech documents, finance, investing, business modelling
Impact Agent	Legacy, Global Opportunities	Social impact, legacy-building, opportunities
Research Agent	(cross-cutting)	Deep multi-source research with citations
Business Agent	Business/Office Docs	Plans, proposals, invoices, reports, decks
Education Agent	Educational Docs	Curricula, lessons, study material
Government Agent	Official Docs, Legal Docs	Official/legal documents, mobility, immigration
> The current app already exposes these as **Projects** in the sidebar — they become real agents in the backend.
2.6 Model Abstraction Layer
NORIA is model-independent. The Orchestrator asks for a capability; this layer picks the best model.
Noria Models — eventually fine-tuned/proprietary.
Open Models — Llama, Gemma, Mistral (cost-effective, self-hostable).
Premium frontier models for hardest reasoning.
Image models for the Images feature.
Future Models — plug in without touching upper layers.
Rule: the underlying model is never revealed to users.
2.7 Data Infrastructure
PostgreSQL — users, chats, projects, documents metadata, billing.
Vector Database — embeddings for Knowledge Engine (RAG).
Object Storage — generated documents, images, uploads.
Knowledge Graph — structured relationships (entities, facts) for precision.
Data Warehouse — analytics + learning signals.
2.8 Observability & Governance
Monitoring / Logging — health, latency, errors.
AI Safety — guardrails, content filtering, jailbreak resistance.
Quality Evaluation — automated answer scoring; feeds the Learning Engine.
Cost Management — route to cheapest capable model; per-user quotas (free vs Pro).
---
3. Feature → Architecture Map (everything discussed)
Discussed feature	Lives in
Accuracy, depth, care, action	Reasoning + Knowledge + Quality Eval
Africa, global mobility, world history, knowledge	Knowledge Engine + Wisdom/Government/Impact agents
High fintech document creation (PDF/Word/Excel)	Actions Engine + Wealth/Business agents
Image quality & creation	Actions Engine + image models
Structured ChatGPT-style answers, no self-intro	Reasoning Engine + system prompt (done in NORIA 1)
Voice in/out	Experience Layer
Search bar	Orchestrator routing → Knowledge/Research
Projects (Vision…Legacy)	Specialized Agents
Upgrade / Apps / Docs / Images tabs	Experience Layer → gated by RBAC tiers
Memory / personalisation	Memory Engine
Performance (no cold starts)	Model Abstraction + proper hosting
---
4. Evolution Roadmap
NORIA 1 — Foundation (NOW — shipped)
Premium web UI: login, projects, toolbar, search, user avatar, themes, voice.
Single backend call to an engine. Direct, structured answers.
Status: LIVE at `skyglobegroup.com/noria/`.
NORIA 2 — Intelligence Core
Real Orchestrator + Reasoning + Knowledge (RAG with citations).
Accounts & auth (Identity layer), PostgreSQL + Vector DB.
Memory Engine (personalisation that persists across devices).
Reliable hosting (no cold starts), streaming responses.
NORIA 3 — Creation
Actions Engine online.
Fintech document creation (PDF/Word/Excel, branded, premium).
Image generation (Images tab goes live).
First specialized agents: Wealth, Business, Education, Government.
NORIA 4 — Agents & Ecosystem
Full agent roster (Vision, Vitality, Wisdom, Wealth, Impact, Research…).
Apps marketplace (Apps tab goes live).
Public API. Mobile + Desktop apps.
Learning + Analytics engines driving continuous improvement.
NORIA 5 — Sovereignty
Proprietary Noria Models in the abstraction layer.
Knowledge Graph + Data Warehouse at scale.
Enterprise: RBAC, compliance, audit, SLAs.
The legend: the best AI in the history of mankind.
---
5. Operational Notes
This session has no GitHub write access (403) and no GPG signing; deployment is by manual upload of `noria/index.html` to `main`.
An early backend already exists in the main repo's `server.js` (`/api/noria` + SkyGlobe FAQ fallback) proxying to `noria-engine.onrender.com`. NORIA 2 formalises this into the Orchestrator.
Default to the latest, most capable models when building AI features; keep the stack hidden from users.
Keep this document evolving alongside NORIA.
