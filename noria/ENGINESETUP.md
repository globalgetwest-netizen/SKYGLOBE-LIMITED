# NORIA Engine — Free, Unlimited, Global Setup Guide

This guide covers everything the **Noria Engine backend** needs so that Noria can
serve unlimited users worldwide **at zero subscription cost**.

> The frontend (`index.html`) is done. These changes happen in the **engine**
> (the service behind `https://noria-engine.onrender.com/v1/ask`).

---

## 1. The #1 Critical Bug to Fix First

The current engine proxy **drops the `system` prompt**. The frontend sends:

```json
{ "query": "...", "history": [...], "system": "<all of Noria's identity & laws>" }
```

…but the proxy only forwards `query` and `history`. **This means none of Noria's
identity, multilingual rules, or document instructions reach the model** — which
is the root cause of wrong answers, language mixing, and refusal loops.

**Fix:** forward `system` to the model as the system message. See code below.

---

## 2. Free AI Providers — Register Keys Here (No Cost)

Register **10–20 keys** across these providers. All have free tiers, no credit card.

| Provider | Free Limit (per key) | Model | Sign up |
|---|---|---|---|
| **Groq** ⭐ | 14,400 req/day | Llama 3.3 70B | console.groq.com |
| **Google Gemini** | 1,500 req/day | Gemini 2.0 Flash | aistudio.google.com |
| **Cerebras** | 14,400 req/day | Llama 3.3 70B | cloud.cerebras.ai |
| **OpenRouter** | varies (free models) | many | openrouter.ai |
| **Cloudflare Workers AI** | 10,000 neurons/day | Llama 3 | dash.cloudflare.com |

**Strategy:** Register ~4 Groq + ~4 Cerebras + ~4 Gemini accounts (different emails).
With key rotation that is **easily 100,000+ free requests per day** — enough for a
very large global user base. Add more keys as you grow.

⭐ **Start with Groq + Cerebras** — both run Llama 3.3 70B, both are extremely fast,
both give 14,400/day free.

---

## 3. The Engine Code (Node.js / Express) — with Key Rotation

This is a complete, production-ready engine. Drop it into the `noria-engine` repo.

```js
// server.js — NORIA Engine with multi-key rotation + system prompt forwarding
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ── 1. Load all keys from environment (comma-separated) ──
// In Render: set GROQ_KEYS = "key1,key2,key3,..." (up to 20)
const GROQ_KEYS = (process.env.GROQ_KEYS || '').split(',').map(k => k.trim()).filter(Boolean);
const CEREBRAS_KEYS = (process.env.CEREBRAS_KEYS || '').split(',').map(k => k.trim()).filter(Boolean);

// ── 2. Round-robin rotation with automatic failover ──
let groqIdx = 0, cerebrasIdx = 0;
function nextGroqKey()     { const k = GROQ_KEYS[groqIdx % GROQ_KEYS.length]; groqIdx++; return k; }
function nextCerebrasKey() { const k = CEREBRAS_KEYS[cerebrasIdx % CEREBRAS_KEYS.length]; cerebrasIdx++; return k; }

// ── 3. Provider definitions (OpenAI-compatible APIs) ──
const PROVIDERS = [
  {
    name: 'groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    nextKey: nextGroqKey,
    available: () => GROQ_KEYS.length > 0,
  },
  {
    name: 'cerebras',
    url: 'https://api.cerebras.ai/v1/chat/completions',
    model: 'llama-3.3-70b',
    nextKey: nextCerebrasKey,
    available: () => CEREBRAS_KEYS.length > 0,
  },
];

// ── 4. Call a provider, trying every key until one works ──
async function callProvider(provider, messages) {
  const keyCount = provider.name === 'groq' ? GROQ_KEYS.length : CEREBRAS_KEYS.length;
  for (let attempt = 0; attempt < keyCount; attempt++) {
    const key = provider.nextKey();
    try {
      const res = await fetch(provider.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: provider.model, messages, temperature: 0.7, max_tokens: 4000 }),
      });
      if (res.status === 429) continue;          // rate limited — try next key
      if (!res.ok) continue;                      // other error — try next key
      const data = await res.json();
      const answer = data?.choices?.[0]?.message?.content;
      if (answer) return answer;
    } catch (e) { /* try next key */ }
  }
  return null; // all keys for this provider exhausted
}

// ── 5. Main endpoint — forwards system prompt (THE FIX) ──
app.post('/v1/ask', async (req, res) => {
  const { query, history = [], system = '' } = req.body || {};
  if (!query) return res.status(400).json({ error: 'query is required' });

  // Build OpenAI-format messages — system prompt FIRST (was missing before!)
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  for (const m of history) {
    if (m.role && m.content) messages.push({ role: m.role, content: m.content });
  }
  messages.push({ role: 'user', content: query });

  // Try each provider in order; failover to the next if one is fully exhausted
  for (const provider of PROVIDERS) {
    if (!provider.available()) continue;
    const answer = await callProvider(provider, messages);
    if (answer) return res.json({ answer });
  }

  // All providers exhausted (very rare with enough keys)
  return res.json({ answer: "I'm experiencing very high demand right now. Please try again in a moment." });
});

// ── 6. Health check for keep-alive pings ──
app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`NORIA Engine on ${PORT} | Groq keys: ${GROQ_KEYS.length} | Cerebras keys: ${CEREBRAS_KEYS.length}`));
```

---

## 4. Render.com Environment Variables

In your Render dashboard for the engine service, set:

```
GROQ_KEYS = gsk_aaa...,gsk_bbb...,gsk_ccc...,gsk_ddd...
CEREBRAS_KEYS = csk_aaa...,csk_bbb...,csk_ccc...
```

(Comma-separated, no spaces. Add as many keys as you have.)

---

## 5. Fixing the Render Cold-Start (sleep) Problem

Render free tier sleeps after 15 min. Two fixes (do both):

1. **Frontend keep-alive** — already done in `index.html` (pings every 8 min while app open).
2. **External uptime ping** — set up a free monitor at **uptimerobot.com** or
   **cron-job.org** to GET `https://noria-engine.onrender.com/health` every 10 minutes.
   This keeps the server awake 24/7 for free, even when no one has the app open.

---

## 6. Image Generation — Already Free & Working

The frontend now generates images via **Pollinations.ai** (Flux model):
- No API key, no cost, unlimited, runs on their servers.
- URL format: `https://image.pollinations.ai/prompt/{prompt}?width=W&height=H&model=flux`
- Nothing needed on the engine for this.

---

## 7. Optional — Server-Side Voice (for true background audio)

For natural voice that plays in the background (browser TTS can't), add a TTS
endpoint to the engine using a free option:
- **Kokoro TTS** (open weights, runs free, very natural) — best quality/cost.
- **Edge-TTS** (Microsoft voices, free via the `edge-tts` library) — easiest.

Then the frontend plays the returned MP3 through an `<audio>` element + MediaSession.

---

## Priority Order

1. 🔴 **Fix system prompt forwarding** (Section 1 & 3) — fixes most behaviour bugs.
2. 🔴 **Add Groq + Cerebras keys with rotation** (Section 2–4) — free unlimited scale.
3. 🟡 **External uptime ping** (Section 5) — kills the cold-start delay.
4. 🟢 **Server-side voice** (Section 7) — when you want background audio.

*NORIA — Architected by SkyGlobe Group.*
