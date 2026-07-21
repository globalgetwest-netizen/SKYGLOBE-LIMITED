const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════════════════
//  SKYGLOBE GROUP — server.js  (Express 4 · Node.js · Supabase · Vanilla JS)
// ═══════════════════════════════════════════════════════════════════════════════
//
//  TABLE OF CONTENTS
//  ─────────────────
//  §0   Environment & Feature Flags
//  §1   Middleware stack         (security headers, rate limiting, compression, static)
//  §2   Core data layer          (Supabase REST client, Storage, Email via Resend)
//  §3   AI engine                (Ollama → Groq → Gemini → Claude fallback chain)
//  §4   Public routes            (contact form, application submit/lookup)
//  §5   Auth layer               (role-based admin/staff, client JWT, activity log)
//  §6   Application management   (admin CRUD, status updates, documents)
//  §7   Client portal            (signup, login, messages, documents, SSE)
//  §8   AI features              (chat, document generator, legal docs, letterhead,
//                                 country info/compare, AI tips, interview prep)
//  §9   Payments                 (Paystack checkout, webhook, verify, admin list)
//  §10  Conferences & work permit
//  §11  HR & operations          (payroll, staff directory, tasks, attendance, activity)
//  §12  CEO tools                (AI assistant, brand & IP registry)
//  §13  SkyGlobe Academy         (parents, students, teachers, admissions, records)
//  §14  YUNEX Ecosystem          (TERRA verification, marketplace, deals, community)
//  §15  Page routes & catch-all
//
// ═══════════════════════════════════════════════════════════════════════════════

const app = express();

// ── §0 ENVIRONMENT & FEATURE FLAGS ────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.SUPABASE_KEY || 'skyglobe-dev-secret';

// AI engine feature flags — auto-detect from environment variables
const USE_OLLAMA = !!process.env.OLLAMA_HOST;
const USE_CEREBRAS = !!process.env.CEREBRAS_API_KEY;
const USE_GROQ = !!process.env.GROQ_API_KEY;

// Cerebras key rotation support (comma-separated for free-tier rotation)
const CEREBRAS_KEYS = {
  keys: (process.env.CEREBRAS_API_KEY || '').split(',').map(s => s.trim()).filter(Boolean),
  current: 0,
  get count() { return this.keys.length; },
  next() { const k = this.keys[this.current]; this.current = (this.current + 1) % Math.max(1, this.keys.length); return k; }
};
const CEREBRAS_MODEL = process.env.CEREBRAS_MODEL || 'llama-3.3-70b';

// ── §1 MIDDLEWARE STACK ───────────────────────────────────────────────────────
// #17 Security headers (helmet equivalent, no extra package needed) ───────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://fonts.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https: http:",
      "media-src 'self' data: blob:",
      "connect-src 'self' https://api.groq.com https://api.cerebras.ai https://generativelanguage.googleapis.com https://*.supabase.co https://api.anthropic.com http://localhost:*",
      "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://youtube.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  next();
});

// ── #14 RATE LIMITING (pure Node.js — no extra package needed) ──────────────
const _rateBuckets = new Map();
function rateLimit({ windowMs = 15 * 60 * 1000, max = 5, message = 'Too many requests. Please try again later.' } = {}) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const bucket = _rateBuckets.get(key) || { count: 0, reset: now + windowMs };
    if (now > bucket.reset) { bucket.count = 0; bucket.reset = now + windowMs; }
    bucket.count++;
    _rateBuckets.set(key, bucket);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - bucket.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.reset / 1000));
    if (bucket.count > max) return res.status(429).json({ error: message });
    next();
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of _rateBuckets) if (now > v.reset) _rateBuckets.delete(k);
}, 30 * 60 * 1000);

const loginLimiter   = rateLimit({ windowMs: 15*60*1000, max: 5,  message: 'Too many login attempts. Wait 15 minutes and try again.' });
const contactLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, message: 'Too many messages sent. Please wait 15 minutes.' });
const applyLimiter   = rateLimit({ windowMs: 60*60*1000, max: 8,  message: 'Too many applications submitted from this IP. Please wait an hour.' });
const aiLimiter      = rateLimit({ windowMs: 60*60*1000, max: 30, message: 'AI request limit reached. Please wait an hour.' });
const generalLimiter = rateLimit({ windowMs: 60*1000,    max: 120, message: 'Slow down — too many requests.' });

app.use(generalLimiter);

// ── #16 INPUT SANITISATION helper ───────────────────────────────────────────
function sanitize(val, maxLen = 1000) {
  if (val === null || val === undefined) return '';
  return String(val).trim().slice(0, maxLen)
    .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function sanitizeEmail(val) {
  const e = String(val || '').trim().toLowerCase().slice(0, 254);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : '';
}

// ── #19 COMPRESSION (gzip/brotli) ────────────────────────────────────────────
let compression = null;
try { compression = require('compression'); } catch { /* optional */ }
if (compression) {
  app.use(compression({ level: 6, threshold: 1024 }));
  console.log('✓ gzip compression enabled');
} else {
  console.log('• compression package not installed — run `npm install` to enable gzip');
}

app.use(express.json({ limit: '12mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(cors());

// ── #20 STATIC CACHING HEADERS ────────────────────────────────────────────────
const CANONICAL_HOST = (process.env.CANONICAL_HOST || 'skyglobegroup.com').toLowerCase().trim();
app.use((req, res, next) => {
  if (!CANONICAL_HOST) return next();
  const host = String(req.headers.host || '').toLowerCase();
  if (host.endsWith('.onrender.com')) {
    return res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`);
  }
  next();
});

// ── PLATFORM SUBDOMAINS ──────────────────────────────────────────────────────
app.use((req, res, next) => {
  const host = String(req.headers.host || '').toLowerCase();
  if (req.path === '/' || req.path === '/index.html') {
    if (host.startsWith('terra.')) return res.sendFile(path.join(__dirname, 'terra.html'));
    if (host.startsWith('yunex.')) return res.sendFile(path.join(__dirname, 'yunex.html'));
  }
  next();
});

app.get(['/terra', '/yunex', '/noria'], (req, res) =>
  res.sendFile(path.join(__dirname, req.path.replace(/[^a-z]/g, '') + '.html')));

app.get(['/mobility', '/services', '/travel'], (req, res) =>
  res.sendFile(path.join(__dirname, 'mobility.html')));

const MOBILITY_WORKSPACES = ['countries','visas','immigration','universities','employers','travel','flights','insurance','conferences','opportunities'];
for (const w of MOBILITY_WORKSPACES) {
  app.get('/mobility/' + w, (req, res) => res.sendFile(path.join(__dirname, 'mobility-workspace.html')));
}

app.get(['/id', '/skyglobe-id'], (req, res) =>
  res.sendFile(path.join(__dirname, 'yunex-app.html')));

app.use(express.static(path.join(__dirname), {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (/\.html?$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else if (/\.(css|js)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    } else if (/\.(png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|mp4|webm)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    }
  },
}));

// ── §2 CORE DATA LAYER ───────────────────────────────────────────────────────
const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_KEY;

async function dbQuery(method, table, body, params) {
  let url = `${SUPA_URL}/rest/v1/${table}`;
  if (params) url += '?' + new URLSearchParams(params);
  const headers = {
    'apikey': SUPA_KEY,
    'Authorization': `Bearer ${SUPA_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
  };
  const r = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) throw new Error(`Supabase ${method} ${table}: ${r.status} ${text}`);
  return text ? JSON.parse(text) : [];
}

async function insertApp(data) {
  const rows = await dbQuery('POST', 'applications', data);
  return Array.isArray(rows) ? rows[0] : rows;
}

async function getAppByRef(ref) {
  const rows = await dbQuery('GET', 'applications', null, { ref: `eq.${ref}`, limit: 1 });
  return rows[0] || null;
}

async function getAppsByEmail(email) {
  return dbQuery('GET', 'applications', null, { email: `eq.${email}`, order: 'created_at.desc' });
}

async function getAllApps() {
  return dbQuery('GET', 'applications', null, { order: 'created_at.desc', limit: 500 });
}

async function getAppsPage(page = 1, perPage = 25) {
  page = Math.max(1, parseInt(page, 10) || 1);
  perPage = Math.min(100, Math.max(1, parseInt(perPage, 10) || 25));
  const offset = (page - 1) * perPage;
  const url = `${SUPA_URL}/rest/v1/applications?` +
    new URLSearchParams({ order: 'created_at.desc', offset: String(offset), limit: String(perPage) });
  const r = await fetch(url, {
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': `Bearer ${SUPA_KEY}`,
      'Prefer': 'count=exact',
      'Range-Unit': 'items',
      'Range': `${offset}-${offset + perPage - 1}`,
    },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Supabase page applications: ${r.status} ${text}`);
  const rows = text ? JSON.parse(text) : [];
  const cr = r.headers.get('content-range') || '';
  const total = parseInt(cr.split('/')[1], 10) || rows.length;
  return { rows, page, perPage, total, hasMore: offset + rows.length < total };
}

async function updateApp(ref, patch) {
  const rows = await dbQuery('PATCH', 'applications', patch, { ref: `eq.${ref}` });
  return Array.isArray(rows) ? rows[0] : rows;
}

async function storageUpload(filePath, buffer, contentType) {
  const r = await fetch(`${SUPA_URL}/storage/v1/object/documents/${filePath}`, {
    method: 'POST',
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': `Bearer ${SUPA_KEY}`,
      'Content-Type': contentType || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: buffer,
  });
  if (!r.ok) throw new Error(`Storage upload ${r.status}: ${await r.text()}`);
}

function storagePublicUrl(filePath) {
  return `${SUPA_URL}/storage/v1/object/public/documents/${filePath}`;
}

const qrcodeGen = require('qrcode-generator');
function qrDataUrl(text) {
  try {
    const qr = qrcodeGen(0, 'M');
    qr.addData(String(text));
    qr.make();
    const svg = qr.createSvgTag({ cellSize: 4, margin: 2 });
    return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  } catch (e) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=170x170&margin=6&data=${encodeURIComponent(text)}`;
  }
}

function assetDataUri(filename) {
  try {
    const p = path.join(__dirname, 'assets', filename);
    if (!fs.existsSync(p)) return null;
    const ext = path.extname(filename).toLowerCase();
    const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.webp': 'image/webp' }[ext] || 'application/octet-stream';
    const buf = fs.readFileSync(p);
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch (e) { return null; }
}

function parseSender(fromStr) {
  const m = /^(.*)<\s*([^>]+)\s*>\s*$/.exec(fromStr || '');
  if (m) return { name: m[1].trim().replace(/^"|"$/g, '') || 'SkyGlobe Group', email: m[2].trim() };
  return { name: 'SkyGlobe Group', email: (fromStr || 'support@skyglobegroup.com').trim() };
}

async function sendViaResend(to, subject, html, replyTo, from) {
  const body = {
    from: from || 'SkyGlobe Group <support@skyglobegroup.com>',
    to,
    subject,
    html,
    headers: { 'X-SkyGlobe-Origin': 'platform' },
  };
  if (replyTo) body.reply_to = replyTo;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function sendViaBrevo(to, subject, html, replyTo, from) {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error('BREVO_API_KEY not set');
  const body = {
    sender: parseSender(from || 'SkyGlobe Group <support@skyglobegroup.com>'),
    to: to.map(email => ({ email })),
    subject,
    htmlContent: html,
    headers: { 'X-SkyGlobe-Origin': 'platform' },
  };
  if (replyTo) body.replyTo = { email: replyTo };
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function sendEmail(to, subject, html, replyTo, from) {
  const recipients = Array.isArray(to) ? to : [to];
  try {
    return await sendViaResend(recipients, subject, html, replyTo, from);
  } catch (resendErr) {
    console.warn(`[email] Resend failed (${resendErr.message.slice(0, 200)}) — trying Brevo fallback`);
    try {
      const data = await sendViaBrevo(recipients, subject, html, replyTo, from);
      console.log(`[email] Delivered via Brevo fallback → ${recipients.join(', ')}`);
      return data;
    } catch (brevoErr) {
      throw new Error(`All email providers failed. Resend: ${resendErr.message.slice(0, 300)} | Brevo: ${brevoErr.message.slice(0, 300)}`);
    }
  }
}

function genRef() {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SKY-${year}-${rand}`;
}

// ── §3 AI ENGINE (Ollama → Groq → Gemini → Claude fallback chain) ──────────

// ── Gemini with retry (hardened cascade) ────────────────────────────────────
async function callGeminiWithRetry(prompt, system) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastErr;
  for (const model of models) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);
      const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.72 },
      };
      if (system) body.system_instruction = { parts: [{ text: system }] };
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal }
      );
      clearTimeout(timer);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error?.message || `Gemini ${model} error ${r.status}`);
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text.trim()) return text;
    } catch (e) { lastErr = e; console.warn(`[AI] Gemini ${model} failed:`, e.message); }
  }
  throw lastErr || new Error('All Gemini models failed');
}

async function geminiGenerate(prompt, { maxTokens = 2048, temperature = 0.72, system } = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50000);
  try {
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature },
    };
    if (system) body.system_instruction = { parts: [{ text: system }] };
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || `Gemini error ${r.status}`);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text.trim()) throw new Error('Empty Gemini response');
    return text;
  } finally { clearTimeout(timer); }
}

async function claudeGenerate(prompt, { maxTokens = 2048, system } = {}) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 55000);
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-opus-4', max_tokens: maxTokens,
        system: system || undefined,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: ctrl.signal,
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || `Claude error ${r.status}`);
    const text = data.content?.[0]?.text || '';
    if (!text.trim()) throw new Error('Empty Claude response');
    return text;
  } finally { clearTimeout(timer); }
}

async function cerebrasChat(messages, { maxTokens = 2048, temperature = 0.72 } = {}) {
  const key = CEREBRAS_KEYS.next();
  if (!key) throw new Error('CEREBRAS_API_KEY not set');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const body = {
      model: CEREBRAS_MODEL,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_completion_tokens: maxTokens,
      temperature,
    };
    const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || `Cerebras error ${r.status}`);
    return data.choices?.[0]?.message?.content || '';
  } finally { clearTimeout(timer); }
}

async function askGroq(system, prompt, { maxTokens = 2048, temperature = 0.72 } = {}) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
      signal: ctrl.signal,
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || `Groq error ${r.status}`);
    return data.choices?.[0]?.message?.content || '';
  } finally { clearTimeout(timer); }
}

async function askOllama(system, prompt) {
  const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  try {
    const r = await fetch(`${host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.OLLAMA_MODEL || 'llama3', system, prompt, stream: false }),
      signal: ctrl.signal,
    });
    const data = await r.json();
    return data.response || '';
  } finally { clearTimeout(timer); }
}

async function academyAskGemini(system, contents, maxTokens = 1024) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 35000);
  try {
    const body = {
      contents,
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.72 },
    };
    if (system) body.system_instruction = { parts: [{ text: system }] };
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || `Gemini error ${r.status}`);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } finally { clearTimeout(timer); }
}

async function generateText(prompt, opts = {}) {
  if (USE_CEREBRAS) {
    try {
      const msgs = [
        { role: 'system', content: opts.system || 'You are a helpful, precise expert. Follow the user instructions exactly.' },
        { role: 'user', content: prompt },
      ];
      const t = await cerebrasChat(msgs, { maxTokens: opts.maxTokens || 2048, temperature: opts.temperature ?? 0.72 });
      if (t && String(t).trim()) return t;
    } catch (e) { console.warn('[AI] Cerebras failed, engaging Gemini:', e.message); }
  }
  let gemErr;
  try {
    return await geminiGenerate(prompt, opts);
  } catch (e) { gemErr = e; console.warn('[AI] fast Gemini failed, engaging cascade:', e.message); }
  try {
    const t = await callGeminiWithRetry(prompt, opts.system || 'You are a helpful, precise expert. Follow the user instructions exactly.');
    if (t && String(t).trim()) return t;
  } catch (e) { console.warn('[AI] cascade failed:', e.message); }
  try {
    return await claudeGenerate(prompt, opts);
  } catch (claudeErr) {
    console.error('[AI] All engines failed. Gemini:', gemErr?.message, '| Claude:', claudeErr.message);
    throw new Error('All AI engines unavailable: ' + claudeErr.message);
  }
}

// ── §4 PUBLIC ROUTES ─────────────────────────────────────────────────────────

const SKYGLOBE_SYSTEM = `You are the AI assistant for SkyGlobe Group, a premium global travel and immigration consultancy. You are knowledgeable, professional, warm, and concise.

Company facts:
- Founded 2016, based in New York City
- 12,400+ visas approved, 98% success rate, 47 countries served
- Phone/WhatsApp: +1 737-399-8522
- Email: support@skyglobegroup.com
- Website: https://skyglobegroup.com
- TikTok: @skyglobegroup
- YouTube: @skyglobegroup
- Instagram: @skyglobegroup

Services offered:
- Student Visas: UK, USA, Canada, Australia, Germany, Schengen and more
- Work Visas: UK Skilled Worker, Canada Express Entry/PR, Germany EU Blue Card, Australia, USA H-1B
- Tourist & Schengen Visas: 40+ destinations, full package
- EU Direct Employment Programme: 17 countries, 8–20 weeks
- University Admissions & Scholarship Applications ($2M+ secured)
- Flight Reservation Letters: PNR-backed, from $15, same day
- Real Flight Ticket Booking: 500+ airlines
- Hotel Reservation Letters: same day
- Real Hotel Booking: 150+ countries
- Travel Insurance: Schengen (€30,000 min), from $20
- Document Translation & Attestation
- National ID Card Assistance

Fees (service fees):
- Flight/Hotel letter: from $15 each
- Travel insurance: from $20
- Tourist/Schengen Visa: from $150
- Student Visa: from $300
- Work Visa: from $400
- EU Employment: contact for quote

Application tracking: SKY-YEAR-XXXX reference numbers.

ABSOLUTE LANGUAGE RULE: Reply in EXACTLY the same language as the user's most recent message.
ACCURACY: Operate in the present day. Never present outdated info as current.`;

// ── DEPARTMENT ROUTING ───────────────────────────────────────────────────────
function deptForService(service) {
  const s = String(service || '').toLowerCase();
  if (s.includes('visa') || s.includes('immigration') || s.includes('work permit')) return 'visas';
  if (s.includes('university') || s.includes('admission') || s.includes('scholarship') || s.includes('student')) return 'education';
  if (s.includes('flight') || s.includes('hotel') || s.includes('travel') || s.includes('insurance') || s.includes('conference')) return 'travel';
  if (s.includes('document') || s.includes('translation') || s.includes('attestation') || s.includes('legal')) return 'legal';
  if (s.includes('eu direct') || s.includes('employment') || s.includes('job')) return 'employment';
  return 'general';
}

const DEPARTMENTS = {
  general:    { label: 'General Enquiries',    email: 'support@skyglobegroup.com' },
  visas:      { label: 'Visa & Immigration',   email: 'visas@skyglobegroup.com' },
  education:  { label: 'Education & Careers',  email: 'education@skyglobegroup.com' },
  travel:     { label: 'Travel Services',      email: 'travel@skyglobegroup.com' },
  legal:      { label: 'Legal & Documents',    email: 'legal@skyglobegroup.com' },
  employment: { label: 'EU Employment',        email: 'employment@skyglobegroup.com' },
};
const VALID_DEPT_KEYS = Object.keys(DEPARTMENTS);

// ── AI RECEPTION ─────────────────────────────────────────────────────────────
async function aiReceive({ source, name, email, service, message, deptHint, ref }) {
  try {
    const dept = DEPARTMENTS[deptHint] || DEPARTMENTS.general;
    const prompt = `You are SkyGlobe Group's AI Receptionist. A ${source} has arrived:

Name: ${name}
Email: ${email}
${service ? `Service: ${service}` : ''}
${ref ? `Reference: ${ref}` : ''}
Message: ${message}

Draft a warm, professional, helpful auto-reply email (2-4 sentences) that:
1. Acknowledges their message
2. Provides a brief, accurate answer if possible
3. Encourages them to reply or WhatsApp for personalised help
4. Mentions their reference number if provided

If the message is unclear or requires human expertise, say "Our team will review this and contact you within 24 hours." and nothing else.

Output ONLY the email body text. No subject line, no signatures.`;

    const reply = await generateText(prompt, { maxTokens: 400, temperature: 0.6 });
    if (!reply || reply.includes('team will review') || reply.includes('24 hours')) {
      await dbQuery('POST', 'ai_reception_queue', {
        source, name, email, service, message, dept: deptHint,
        status: 'pending', created_at: new Date().toISOString(),
      });
      return { autoReplied: false, queued: true };
    }
    await sendEmail(email, `Re: Your ${service || 'enquiry'} — SkyGlobe Group`,
      `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0a1628;padding:24px;border-radius:8px 8px 0 0">
          <img src="https://skyglobegroup.com/icon-512.png" alt="SkyGlobe Group" style="height:48px;width:auto;border-radius:8px;margin-bottom:8px"><br>
          <h2 style="color:#c9a84c;margin:0;font-size:1.1rem">SkyGlobe Group</h2>
        </div>
        <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e0e0e0">
          <p style="color:#333;line-height:1.6">${reply.replace(/\n/g,'<br>')}</p>
          <hr style="border:none;border-top:1px solid #ddd;margin:16px 0">
          <p style="color:#888;font-size:0.8rem">This is an automated response. Reply to this email to reach our team directly, or WhatsApp us at +1 737-399-8522.</p>
        </div>
      </div>`,
      dept.email
    );
    return { autoReplied: true };
  } catch (e) {
    console.error('AI Reception error:', e.message);
    return { autoReplied: false, error: e.message };
  }
}

// ── BASE URL HELPER ──────────────────────────────────────────────────────────
function baseUrl(req) {
  const forwarded = req.headers['x-forwarded-proto'];
  const proto = forwarded || (req.connection?.encrypted ? 'https' : 'http');
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

// ── CONTACT / CONSULTATION FORM ───────────────────────────────────────────────
app.post('/api/dept-message', contactLimiter, async (req, res) => {
  const raw = req.body || {};
  const name = sanitize(raw.name, 100);
  const email = sanitizeEmail(raw.email);
  const message = sanitize(raw.message, 3000);
  let dept = String(raw.dept || 'general').toLowerCase();
  if (!VALID_DEPT_KEYS.includes(dept) || dept === 'ceo') dept = 'general';
  if (!name || !email || !message)
    return res.status(400).json({ error: 'Name, email and message are required.' });
  aiReceive({
    source: 'contact', name, email,
    service: `Website message — ${DEPARTMENTS[dept].label}`,
    message, deptHint: dept,
  }).catch(() => {});
  res.json({ success: true, department: DEPARTMENTS[dept].label });
});

app.post('/api/contact', contactLimiter, async (req, res) => {
  const raw = req.body || {};
  const fname   = sanitize(raw.fname, 100);
  const lname   = sanitize(raw.lname, 100);
  const email   = sanitizeEmail(raw.email);
  const phone   = sanitize(raw.phone, 30);
  const service = sanitize(raw.service, 120);
  const destination = sanitize(raw.destination, 100);
  const message = sanitize(raw.message, 3000);
  if (!fname || !email || !service)
    return res.status(400).json({ error: 'Name, email and service are required.' });
  if (!email)
    return res.status(400).json({ error: 'A valid email address is required.' });

  aiReceive({
    source: 'contact', name: `${fname} ${lname || ''}`.trim(), email, service,
    message: [destination && `Destination: ${destination}`, message].filter(Boolean).join(' · '),
    deptHint: deptForService(service),
  }).catch(() => {});

  if (!process.env.RESEND_API_KEY && !process.env.BREVO_API_KEY)
    return res.status(500).json({ error: 'Email service not configured. Contact us via WhatsApp.' });

  const recipientEmail = process.env.RECIPIENT_EMAIL ? process.env.RECIPIENT_EMAIL.split(',').map(s => s.trim()) : ['support@skyglobegroup.com', 'insights.skyglobe@gmail.com'];
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#0a1628;padding:24px;border-radius:8px 8px 0 0">
        <img src="https://skyglobegroup.com/icon-512.png" alt="SkyGlobe Group" style="height:64px;width:auto;border-radius:10px;margin-bottom:10px"><br>
        <h2 style="color:#c9a84c;margin:0">New Consultation Request</h2>
      </div>
      <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e0e0e0">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#555;width:160px"><strong>Name</strong></td><td>${fname} ${lname || ''}</td></tr>
          <tr><td style="padding:8px 0;color:#555"><strong>Email</strong></td><td><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:8px 0;color:#555"><strong>Phone</strong></td><td>${phone || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#555"><strong>Service</strong></td><td>${service}</td></tr>
          <tr><td style="padding:8px 0;color:#555"><strong>Destination</strong></td><td>${destination || '—'}</td></tr>
        </table>
        ${message ? `<hr style="margin:16px 0;border:none;border-top:1px solid #ddd">
        <p style="color:#555;margin:0 0 8px"><strong>Message</strong></p>
        <p style="color:#333;margin:0;line-height:1.6">${message.replace(/\n/g,'<br>')}</p>` : ''}
      </div>
    </div>`;
  try {
    await sendEmail(recipientEmail, `New Consultation — ${service}`, html, email);
    res.json({ success: true });
  } catch (err) {
    console.error('Email error:', err.message);
    res.status(500).json({ error: 'Email failed: ' + err.message });
  }
});

// ── SUBMIT APPLICATION ────────────────────────────────────────────────────────
app.post('/api/apply', applyLimiter, async (req, res) => {
  const {
    service, fname, lname, email, phone, dob, nationality, passport, passportExpiry,
    destination, travelDate, duration, purpose, institution, employer,
    hotelCity, checkin, checkout, coverage, docType, scholarship, notes,
    provider, currency
  } = req.body;

  if (!fname || !email || !service)
    return res.status(400).json({ error: 'Name, email, and service are required.' });

  const ref = genRef();
  const application = {
    ref, service,
    fname, lname: lname || '', email, phone: phone || '',
    dob: dob || '', nationality: nationality || '',
    passport: passport || '', passport_expiry: passportExpiry || '',
    destination: destination || '', travel_date: travelDate || '',
    duration: duration || '', purpose: purpose || '',
    institution: institution || '', employer: employer || '',
    hotel_city: hotelCity || '', checkin: checkin || '', checkout: checkout || '',
    coverage: coverage || '', doc_type: docType || '',
    scholarship: scholarship || '', notes: notes || '',
    status: 'Received', responses: []
  };

  try {
    await insertApp(application);
  } catch (e) {
    console.error('DB insert failed:', e.message);
    return res.status(500).json({ error: 'Could not save application. Please try again.' });
  }

  aiReceive({
    source: 'application', ref, name: `${fname} ${lname || ''}`.trim(), email, service,
    message: [purpose && `Purpose: ${purpose}`, destination && `Destination: ${destination}`, notes]
      .filter(Boolean).join(' · '),
    deptHint: deptForService(service),
  }).catch(() => {});

  const timestamp = new Date().toISOString();
  const recipientEmail = process.env.RECIPIENT_EMAIL ? process.env.RECIPIENT_EMAIL.split(',').map(s => s.trim()) : ['support@skyglobegroup.com', 'insights.skyglobe@gmail.com'];

  const adminHtml = `
    <div style="font-family:sans-serif;max-width:660px;margin:0 auto">
      <div style="background:#0a1628;padding:24px;border-radius:8px 8px 0 0">
        <img src="https://skyglobegroup.com/icon-512.png" alt="SkyGlobe Group" style="height:64px;width:auto;border-radius:10px;margin-bottom:10px"><br>
        <h2 style="color:#c9a84c;margin:0">New Application — <span style="color:#fff">${ref}</span></h2>
      </div>
      <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e0e0e0">
        <p style="margin:0 0 16px;font-size:1rem"><strong>Service:</strong> ${service}</p>
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem">
          <tr style="background:#eee"><td style="padding:8px;width:180px"><strong>Full Name</strong></td><td style="padding:8px">${fname} ${lname || ''}</td></tr>
          <tr><td style="padding:8px"><strong>Email</strong></td><td style="padding:8px"><a href="mailto:${email}">${email}</a></td></tr>
          <tr style="background:#eee"><td style="padding:8px"><strong>Phone</strong></td><td style="padding:8px">${phone || '—'}</td></tr>
          <tr><td style="padding:8px"><strong>Nationality</strong></td><td style="padding:8px">${nationality || '—'}</td></tr>
          <tr style="background:#eee"><td style="padding:8px"><strong>Date of Birth</strong></td><td style="padding:8px">${dob || '—'}</td></tr>
          <tr><td style="padding:8px"><strong>Passport No.</strong></td><td style="padding:8px">${passport || '—'}</td></tr>
          <tr style="background:#eee"><td style="padding:8px"><strong>Passport Expiry</strong></td><td style="padding:8px">${passportExpiry || '—'}</td></tr>
          <tr><td style="padding:8px"><strong>Destination</strong></td><td style="padding:8px">${destination || '—'}</td></tr>
          <tr style="background:#eee"><td style="padding:8px"><strong>Travel Date</strong></td><td style="padding:8px">${travelDate || '—'}</td></tr>
          <tr><td style="padding:8px"><strong>Duration</strong></td><td style="padding:8px">${duration || '—'}</td></tr>
          <tr style="background:#eee"><td style="padding:8px"><strong>Purpose</strong></td><td style="padding:8px">${purpose || '—'}</td></tr>
          ${institution ? `<tr><td style="padding:8px"><strong>Institution</strong></td><td style="padding:8px">${institution}</td></tr>` : ''}
          ${employer ? `<tr style="background:#eee"><td style="padding:8px"><strong>Employer</strong></td><td style="padding:8px">${employer}</td></tr>` : ''}
          ${hotelCity ? `<tr><td style="padding:8px"><strong>Hotel City</strong></td><td style="padding:8px">${hotelCity} (${checkin || '?'} → ${checkout || '?'})</td></tr>` : ''}
          ${coverage ? `<tr style="background:#eee"><td style="padding:8px"><strong>Coverage</strong></td><td style="padding:8px">${coverage}</td></tr>` : ''}
          ${docType ? `<tr><td style="padding:8px"><strong>Document Type</strong></td><td style="padding:8px">${docType}</td></tr>` : ''}
          ${scholarship ? `<tr style="background:#eee"><td style="padding:8px"><strong>Scholarship</strong></td><td style="padding:8px">${scholarship}</td></tr>` : ''}
        </table>
        ${notes ? `<hr style="margin:16px 0;border:none;border-top:1px solid #ddd">
        <p style="color:#555;margin:0 0 8px"><strong>Notes</strong></p>
        <p style="color:#333;line-height:1.6;margin:0">${notes.replace(/\n/g,'<br>')}</p>` : ''}
        <div style="margin-top:20px;padding:14px;background:#fff8e6;border-left:4px solid #c9a84c;border-radius:4px">
          <strong>Reply to this email to respond directly to the applicant.</strong><br>
          <small style="color:#555">Reference: ${ref} | Submitted: ${new Date(timestamp).toLocaleString()}</small>
        </div>
      </div>
    </div>`;

  const userHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#0a1628;padding:32px;border-radius:8px 8px 0 0;text-align:center">
        <img src="https://skyglobegroup.com/icon-512.png" alt="SkyGlobe Group" style="height:64px;width:auto;border-radius:10px;margin-bottom:10px"><br>
        <h1 style="color:#c9a84c;margin:0 0 8px;font-size:1.6rem">Application Received ✅</h1>
        <p style="color:#8899bb;margin:0">SKYGLOBE GROUP</p>
      </div>
      <div style="background:#f9f9f9;padding:32px;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;text-align:center">
        <p style="color:#333;font-size:1rem;margin:0 0 20px">Dear <strong>${fname}</strong>, your application has been successfully submitted.</p>
        <div style="background:#0a1628;border:2px solid #c9a84c;border-radius:12px;padding:20px;display:inline-block;margin-bottom:24px">
          <p style="color:#8899bb;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px">Your Application Reference</p>
          <p style="color:#c9a84c;font-size:2rem;font-weight:700;font-family:Georgia,serif;margin:0;letter-spacing:0.06em">${ref}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;text-align:left;font-size:0.9rem;margin-bottom:20px">
          <tr><td style="padding:8px 0;color:#555;border-bottom:1px solid #eee"><strong>Service</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee">${service}</td></tr>
          <tr><td style="padding:8px 0;color:#555;border-bottom:1px solid #eee"><strong>Destination</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee">${destination || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#555"><strong>Submitted</strong></td><td style="padding:8px 0">${new Date(timestamp).toLocaleString()}</td></tr>
        </table>
        <div style="background:#e8f5e9;border:1px solid #81c784;border-radius:8px;padding:16px;margin-bottom:20px">
          <p style="color:#2e7d32;margin:0;font-size:0.9rem">Our team will review your application and contact you within <strong>24 hours</strong>.</p>
        </div>
        <p style="color:#555;font-size:0.85rem">Keep your reference number — use it to track your application on our website.</p>
        <a href="https://wa.me/17373998522?text=Hi, my application reference is ${ref}" style="display:inline-block;background:#25D366;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px">💬 WhatsApp Us About This Application</a>
      </div>
      <div style="padding:20px;text-align:center;color:#999;font-size:0.8rem">
        SkyGlobe Group · support@skyglobegroup.com
      </div>
    </div>`;

  try { await sendEmail(recipientEmail, `New Application [${ref}] — ${service}`, adminHtml, email); }
  catch (e) { console.error('Admin email failed:', e.message); }

  try { await sendEmail(email, `Application Confirmed [${ref}] — SkyGlobe Group`, userHtml); }
  catch (e) { console.error('User email failed:', e.message); }

  const product = SERVICE_PRODUCT_MAP[service];
  if (product && PRICING[product] && provider && PAY[provider] && PAY[provider].secret) {
    const cur = (currency || 'USD').toUpperCase();
    const amount = PRICING[product][cur];
    if (amount != null && PAY[provider].currencies.includes(cur)) {
      try {
        const reference = genPayRef();
        await insertPayment({ reference, product, provider, currency: cur, amount, email, app_ref: ref, status: 'pending', meta: { service } });
        const { authorization_url } = await providerInit(provider, {
          reference, amount, currency: cur, email, product, appRef: ref,
          label: `${PRICING[product].label} — ${ref}`, callbackUrl: `${baseUrl(req)}/pay/callback`,
        });
        return res.json({ success: true, ref, status: 'Received', payment: { reference, authorization_url } });
      } catch (e) {
        console.error('apply pay init failed:', e.message);
        return res.json({ success: true, ref, status: 'Received', paymentError: 'Application saved, but payment could not start. We will email you a payment link.' });
      }
    }
  }

  res.json({ success: true, ref, status: 'Received' });
});

app.get('/api/apply/:ref', async (req, res) => {
  try {
    const found = await getAppByRef(req.params.ref.toUpperCase());
    if (!found) return res.status(404).json({ error: 'Application not found.' });
    const { passport, passport_expiry, ...safe } = found;
    res.json(safe);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/apply', async (req, res) => {
  if (!req.query.email) return res.status(400).json({ error: 'Email required.' });
  try {
    const found = (await getAppsByEmail(req.query.email.toLowerCase()))
      .map(({ passport, passport_expiry, ...safe }) => safe);
    res.json(found);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── §5 AUTH LAYER ────────────────────────────────────────────────────────────

const bcrypt = require('bcryptjs');

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signClientToken(email) {
  const payload = Buffer.from(JSON.stringify({ email: email.toLowerCase().trim(), iat: Date.now() })).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyClientToken(token) {
  if (!token) return null;
  try {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'base64url'), Buffer.from(expected, 'base64url'))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    return data.email;
  } catch (e) { return null; }
}

async function getClientByEmail(email) {
  const rows = await dbQuery('GET', 'clients', null, { email: `eq.${email.toLowerCase().trim()}`, limit: 1 });
  return rows[0] || null;
}

async function insertClient(data) {
  const rows = await dbQuery('POST', 'clients', data);
  return Array.isArray(rows) ? rows[0] : rows;
}

// ── ACTIVITY / AUDIT LOG ────────────────────────────────────────────────────
async function logActivity(actor, actor_role, action, detail, target) {
  try {
    await dbQuery('POST', 'activity_log', {
      actor: actor || 'system', actor_role: actor_role || 'system',
      action: action || '', detail: detail || '', target: target || '',
      created_at: new Date().toISOString(),
    });
  } catch (e) { console.error('[activity] log failed:', e.message); }
}

let STAFF_CACHE = [];
async function refreshStaffCache() {
  try {
    const rows = await dbQuery('GET', 'staff_members', null, { status: `eq.active`, limit: 500 });
    STAFF_CACHE = (Array.isArray(rows) ? rows : [])
      .filter(s => s.password)
      .map(s => ({ id: s.id, name: s.name, password: s.password, department: s.department, role: 'staff',
        responsibilities: Array.isArray(s.responsibilities) ? s.responsibilities : [] }));
  } catch (e) { console.error('[staff-cache] refresh failed:', e.message); }
}

function getRole(req) {
  const supplied = req.headers['x-admin-key'] || '';
  if (!supplied) return null;
  const ceoRaw = process.env.ADMIN_PASSWORDS || process.env.ADMIN_PASSWORD || '';
  for (const entry of ceoRaw.split(',').map(s => s.trim()).filter(Boolean)) {
    const [a, b] = entry.includes(':') ? entry.split(':') : [null, entry];
    if (supplied === b) return { role: 'ceo', name: a || 'CEO' };
  }
  for (const s of STAFF_CACHE) {
    if (supplied === s.password) return { role: 'staff', name: s.name, department: s.department, staffId: s.id, responsibilities: s.responsibilities || [] };
  }
  const staffRaw = process.env.STAFF_PASSWORDS || '';
  for (const entry of staffRaw.split(',').map(s => s.trim()).filter(Boolean)) {
    const [a, b] = entry.includes(':') ? entry.split(':') : [null, entry];
    if (supplied === b) return { role: 'staff', name: a || 'Staff' };
  }
  return null;
}

function checkAdmin(req, res, next) {
  const r = getRole(req);
  if (r && r.role === 'ceo') { req._who = r.name; if(next) next(); return r.name; }
  if (res && !res.headersSent) return res.status(401).json({ error: 'Unauthorized' });
  return null;
}

function checkStaffOrAdmin(req, res, next) {
  const r = getRole(req);
  if (r) { req._who = r.name; req._role = r.role; if(next) next(); return r.name; }
  if (res && !res.headersSent) return res.status(401).json({ error: 'Unauthorized' });
  return null;
}

const RESPONSIBILITIES = {
  verifications:   { key: 'verifications',   label: 'YUNEX Trust Desk',        icon: '🛡️', desc: 'Review and decide identity & business verification requests.' },
  academy_records: { key: 'academy_records', label: 'Academy Student Records',  icon: '🎓', desc: 'View student records and open transcripts to assist learners.' },
  applications:    { key: 'applications',    label: 'Client Applications',      icon: '📋', desc: 'Handle the client application work queue.' },
  legal_docs:      { key: 'legal_docs',      label: 'Legal Documents',          icon: '📜', desc: 'Assist with legal document requests.' },
  reception:       { key: 'reception',       label: 'AI Reception',             icon: '🛎️', desc: 'Oversee AI reception and client conversations.' },
  announcements:   { key: 'announcements',   label: 'Announcements',            icon: '📣', desc: 'Draft and post announcements.' },
  user_moderation: { key: 'user_moderation', label: 'User Moderation',          icon: '🛑', desc: 'Suspend or remove users who violate the rules.' },
  disputes:        { key: 'disputes',        label: 'Dispute Resolution',       icon: '⚖️', desc: 'Mediate and resolve escrow disputes.' },
};
const VALID_RESP_KEYS = Object.keys(RESPONSIBILITIES);

function hasResponsibility(req, key) {
  const r = getRole(req);
  if (!r) return null;
  if (r.role === 'ceo') { req._who = r.name; return r.name; }
  if (r.role === 'staff' && Array.isArray(r.responsibilities) && r.responsibilities.includes(key)) { req._who = r.name; req._role = 'staff'; return r.name; }
  return null;
}

function requireResponsibility(key) {
  return (req, res, next) => {
    if (hasResponsibility(req, key)) return next();
    return res.status(401).json({ error: 'You do not have this responsibility. Ask the CEO to delegate it to you.' });
  };
}

app.get('/api/responsibilities/catalog', (req, res) => {
  if (!checkStaffOrAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  res.json(Object.values(RESPONSIBILITIES));
});

app.get('/api/staff/responsibilities', (req, res) => {
  const r = getRole(req);
  if (!r) return res.status(401).json({ error: 'Unauthorized' });
  const keys = r.role === 'ceo' ? VALID_RESP_KEYS : (Array.isArray(r.responsibilities) ? r.responsibilities : []);
  res.json({ role: r.role, responsibilities: keys.map(k => RESPONSIBILITIES[k]).filter(Boolean) });
});

app.get('/api/admin/staff-delegation', async (req, res) => {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const rows = await dbQuery('GET', 'staff_members', null, { order: 'created_at.asc', limit: 500 }).catch(() => []);
    res.json((Array.isArray(rows) ? rows : []).map(s => ({
      id: s.id, name: s.name, department: s.department, role_title: s.role_title, status: s.status,
      responsibilities: Array.isArray(s.responsibilities) ? s.responsibilities : [],
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/staff-delegation/:id', async (req, res) => {
  const who = checkAdmin(req);
  if (!who) return res.status(401).json({ error: 'Unauthorized' });
  try {
    let list = (req.body || {}).responsibilities;
    if (!Array.isArray(list)) return res.status(400).json({ error: 'responsibilities must be a list.' });
    list = list.filter(k => VALID_RESP_KEYS.includes(k));
    await dbQuery('PATCH', 'staff_members', { responsibilities: list }, { id: `eq.${req.params.id}` });
    await refreshStaffCache();
    logActivity(who, 'ceo', 'delegation_update', `Updated responsibilities for staff #${req.params.id}: ${list.join(', ') || 'none'}`, String(req.params.id));
    res.json({ success: true, responsibilities: list });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/login', loginLimiter, (req, res) => {
  const fakeReq = { headers: { 'x-admin-key': (req.body && req.body.password) || '' } };
  const who = checkAdmin(fakeReq);
  if (!who) return res.status(401).json({ error: 'Wrong password.' });
  logActivity(who, 'ceo', 'login', 'Signed in to the CEO portal');
  res.json({ success: true, name: who, role: 'ceo' });
});

app.post('/api/staff/login', loginLimiter, (req, res) => {
  const fakeReq = { headers: { 'x-admin-key': (req.body && req.body.password) || '' } };
  const r = getRole(fakeReq);
  if (!r) return res.status(401).json({ error: 'Wrong password.' });
  logActivity(r.name, r.role, 'login', `Signed in to the staff portal${r.department ? ' · ' + r.department : ''}`);
  res.json({ success: true, name: r.name, role: r.role, department: r.department || '' });
});

app.get('/api/admin/applications', async (req, res) => {
  if (!checkStaffOrAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    if (req.query.page) {
      const data = await getAppsPage(req.query.page, req.query.per_page);
      return res.json(data);
    }
    res.json(await getAllApps());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/update', async (req, res) => {
  const who = checkStaffOrAdmin(req);
  if (!who) return res.status(401).json({ error: 'Unauthorized' });

  const { ref, status, response } = req.body;
  if (!ref || !status) return res.status(400).json({ error: 'ref and status required.' });

  try {
    const app_ = await getAppByRef(ref.toUpperCase());
    if (!app_) return res.status(404).json({ error: 'Application not found.' });

    const responses = app_.responses || [];
    if (response) responses.push({ by: who, message: response, date: new Date().toISOString() });
    await updateApp(ref.toUpperCase(), { status, responses });

    let emailed = false;
    try {
      const statusColors = { 'Received':'#1976d2','In Review':'#f57c00','Approved':'#2e7d32','Completed':'#2e7d32','Needs More Info':'#c62828','Rejected':'#c62828' };
      const color = statusColors[status] || '#1976d2';
      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#0a1628;padding:28px;border-radius:8px 8px 0 0;text-align:center">
            <img src="https://skyglobegroup.com/icon-512.png" alt="SkyGlobe Group" style="height:64px;width:auto;border-radius:10px;margin-bottom:10px"><br>
            <h1 style="color:#c9a84c;margin:0;font-size:1.4rem">Application Update</h1>
            <p style="color:#8899bb;margin:6px 0 0">SKYGLOBE GROUP</p>
          </div>
          <div style="background:#f9f9f9;padding:28px;border-radius:0 0 8px 8px;border:1px solid #e0e0e0">
            <p style="color:#333">Dear <strong>${app_.fname}</strong>, there is an update on your application <strong>${app_.ref}</strong> (${app_.service}):</p>
            <div style="text-align:center;margin:20px 0">
              <span style="display:inline-block;background:${color};color:#fff;padding:10px 28px;border-radius:24px;font-weight:700;font-size:1.1rem">${status}</span>
            </div>
            ${response ? `<div style="background:#fff;border-left:4px solid #c9a84c;padding:16px;border-radius:4px;margin-bottom:16px">
              <p style="color:#555;margin:0 0 6px;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.08em"><strong>Message from our team</strong></p>
              <p style="color:#333;margin:0;line-height:1.6">${response.replace(/\n/g,'<br>')}</p>
            </div>` : ''}
            <p style="color:#555;font-size:0.85rem">Track your application anytime on our website with reference <strong>${app_.ref}</strong>.</p>
            <a href="https://wa.me/17373998522?text=Hi, regarding my application ${app_.ref}" style="display:inline-block;background:#25D366;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px">💬 Reply on WhatsApp</a>
          </div>
        </div>`;
      await sendEmail(app_.email, `Update on Application ${app_.ref} — ${status}`, html);
      emailed = true;
    } catch (e) {
      console.error('Status email failed:', e.message);
      try {
        const recipientEmail = process.env.RECIPIENT_EMAIL ? process.env.RECIPIENT_EMAIL.split(',').map(s => s.trim()) : ['support@skyglobegroup.com', 'insights.skyglobe@gmail.com'];
        await sendEmail(recipientEmail, `⚠️ Manual follow-up needed: ${app_.ref}`,
          `<div style="font-family:sans-serif;padding:20px">
            <h3 style="color:#c9a84c">Status Update (applicant email failed)</h3>
            <p>Could not email <strong>${app_.email}</strong> directly.</p>
            <p><strong>Application:</strong> ${app_.ref} — ${app_.service}</p>
            <p><strong>New status:</strong> ${status}</p>
            ${response ? `<p><strong>Your message:</strong><br>${response.replace(/\n/g,'<br>')}</p>` : ''}
            <p>Please follow up manually: <a href="mailto:${app_.email}">${app_.email}</a></p>
          </div>`);
      } catch (e2) { console.error('Fallback email also failed:', e2.message); }
    }

    logActivity(who, getRole(req)?.role || 'staff', 'application_update', `Set ${ref.toUpperCase()} → ${status}${response ? ' (with message to applicant)' : ''}`, ref.toUpperCase());
    if (app_.email) sseNotify(app_.email, 'status-update', { ref: ref.toUpperCase(), status });
    res.json({ success: true, emailed, emailError: emailed ? null : 'Could not email applicant directly — a fallback notification was sent to your admin email.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── §6 DOCUMENTS ──────────────────────────────────────────────────────────────
app.post('/api/documents', async (req, res) => {
  const { ref, filename, contentType, data } = req.body || {};
  if (!ref || !filename || !data)
    return res.status(400).json({ error: 'ref, filename and data are required.' });

  const who = checkStaffOrAdmin(req);
  const cleanRef = String(ref).toUpperCase().trim();

  try {
    const app_ = await getAppByRef(cleanRef);
    if (!app_) return res.status(404).json({ error: 'Application not found. Check the reference number.' });

    const buffer = Buffer.from(data, 'base64');
    if (buffer.length > 8 * 1024 * 1024)
      return res.status(400).json({ error: 'File too large. Maximum size is 8 MB.' });
    if (buffer.length === 0)
      return res.status(400).json({ error: 'Empty file.' });

    const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
    const filePath = `${cleanRef}/${Date.now()}_${safeName}`;

    await storageUpload(filePath, buffer, contentType);
    const rows = await dbQuery('POST', 'documents', {
      ref: cleanRef,
      filename: safeName,
      path: filePath,
      uploaded_by: who ? `admin:${who}` : 'applicant',
    });
    const doc = Array.isArray(rows) ? rows[0] : rows;

    let viewToken = null;
    if (who && doc?.id) {
      viewToken = await createDocToken(doc.id, filePath, safeName, app_?.email || '', cleanRef);
    }

    if (who) logActivity(who, getRole(req)?.role || 'staff', 'document_upload', `Uploaded "${safeName}" to ${cleanRef}`, cleanRef);
    res.json({ success: true, document: doc, url: storagePublicUrl(filePath), viewToken, viewUrl: viewToken ? `${baseUrl(req)}/view/${viewToken}` : null });
  } catch (e) {
    console.error('Document upload failed:', e.message);
    res.status(500).json({ error: 'Could not upload document. Please try again.' });
  }
});

app.get('/api/documents/:ref', async (req, res) => {
  try {
    const rows = await dbQuery('GET', 'documents', null, {
      ref: `eq.${req.params.ref.toUpperCase()}`, order: 'created_at.asc',
    });
    res.json(rows.map(d => ({ ...d, url: storagePublicUrl(d.path) })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/documents/:id', async (req, res) => {
  if (!checkStaffOrAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const rows = await dbQuery('GET', 'documents', null, { id: `eq.${req.params.id}`, limit: 1 });
    if (!rows[0]) return res.status(404).json({ error: 'Document not found.' });
    try {
      const sr = await fetch(`${SUPA_URL}/storage/v1/object/documents/${rows[0].path}`, {
        method: 'DELETE',
        headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` },
      });
      if (!sr.ok) console.error('Storage delete warning:', await sr.text());
    } catch (storErr) { console.error('Storage delete error (continuing):', storErr.message); }
    await dbQuery('DELETE', 'documents', null, { id: `eq.${req.params.id}` });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
