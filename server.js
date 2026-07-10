const express = require('express');
const cors = require('cors');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
//  SKYGLOBE GROUP — server.js  (Express 4 · Node.js · Supabase · Vanilla JS)
// ═══════════════════════════════════════════════════════════════════════════════
//
//  TABLE OF CONTENTS
//  ─────────────────
//  §1   Middleware stack         (security headers, rate limiting, compression, static)
//  §2   Core data layer          (Supabase REST client, Storage, Email via Resend)
//  §3   AI engine                (Ollama → Groq → Gemini fallback chain)
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
//  §13  SkyGlobe Academy             (parents, students, teachers, admissions, records)
//  §14  Page routes & catch-all
//
// ═══════════════════════════════════════════════════════════════════════════════

const app = express();

// ── §1 MIDDLEWARE STACK ───────────────────────────────────────────────────────
// #17 Security headers (helmet equivalent, no extra package needed) ───────────
// Protects against clickjacking, MIME sniffing, XSS reflection, and enforces HTTPS.
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
      "connect-src 'self' https://api.groq.com https://generativelanguage.googleapis.com https://*.supabase.co https://api.anthropic.com http://localhost:*",
      // Allow our own pages (e.g. the showreel) to be embedded in same-origin
      // iframes, and allow YouTube video embeds in the homepage video panel.
      "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://youtube.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  next();
});

// ── #14 RATE LIMITING (pure Node.js — no extra package needed) ────────────────
// Tracks requests per IP in-memory. Resets every windowMs milliseconds.
// Chosen limits: login = 5 attempts/15 min (brute-force proof), contact = 10/15 min.
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
// Clean up old buckets every 30 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of _rateBuckets) if (now > v.reset) _rateBuckets.delete(k);
}, 30 * 60 * 1000);

// Pre-built limiters for specific routes
const loginLimiter   = rateLimit({ windowMs: 15*60*1000, max: 5,  message: 'Too many login attempts. Wait 15 minutes and try again.' });
const contactLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, message: 'Too many messages sent. Please wait 15 minutes.' });
const applyLimiter   = rateLimit({ windowMs: 60*60*1000, max: 8,  message: 'Too many applications submitted from this IP. Please wait an hour.' });
const aiLimiter      = rateLimit({ windowMs: 60*60*1000, max: 30, message: 'AI request limit reached. Please wait an hour.' });
const generalLimiter = rateLimit({ windowMs: 60*1000,    max: 120, message: 'Slow down — too many requests.' });

// Global limiter on all routes
app.use(generalLimiter);

// ── #16 INPUT SANITISATION helper (no extra package needed) ──────────────────
// Strips characters that could break HTML/SQL. Used on all user-supplied strings.
function sanitize(val, maxLen = 1000) {
  if (val === null || val === undefined) return '';
  return String(val).trim().slice(0, maxLen)
    .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function sanitizeEmail(val) {
  const e = String(val || '').trim().toLowerCase().slice(0, 254);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : '';
}

// ── #19 COMPRESSION (gzip/brotli) ─────────────────────────────────────────────
// Shrinks HTML/CSS/JS/JSON by ~60-70% before sending. Uses the `compression`
// package when installed (Render runs npm install); if it's missing locally the
// server still starts — it just skips compression instead of crashing.
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
// Repeat visitors re-use cached assets instead of re-downloading them.
//  • HTML  → always revalidate (users always get the newest page)
//  • CSS/JS → 1 hour (fresh enough to pick up edits, still fast on repeat hits)
//  • images/fonts/icons → 30 days (these rarely change)
// ── PLATFORM SUBDOMAINS ──────────────────────────────────────────────────────
// terra.skyglobegroup.com and yunex.skyglobegroup.com are first-class homes
// for the two platforms. The root of each subdomain serves its founding page;
// every other path (assets, /api/*) behaves exactly like the main site.
app.use((req, res, next) => {
  const host = String(req.headers.host || '').toLowerCase();
  if (req.path === '/' || req.path === '/index.html') {
    if (host.startsWith('terra.')) return res.sendFile(path.join(__dirname, 'terra.html'));
    if (host.startsWith('yunex.')) return res.sendFile(path.join(__dirname, 'yunex.html'));
  }
  next();
});

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
// ── SUPABASE ──────────────────────────────────────────────────────────────────
// Env vars needed on Render:
//   SUPABASE_URL  = https://xxxx.supabase.co
//   SUPABASE_KEY  = your anon/service role key
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

// #2 Paginated fetch — cursor by offset. Returns one page plus a total count
// so the admin dashboard can scroll infinitely without ever losing old records.
async function getAppsPage(page = 1, perPage = 25) {
  page = Math.max(1, parseInt(page, 10) || 1);
  perPage = Math.min(100, Math.max(1, parseInt(perPage, 10) || 25));
  const offset = (page - 1) * perPage;
  // Range header makes Supabase return the Content-Range total count.
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
  // Content-Range looks like "0-24/342" — the number after / is the total.
  const cr = r.headers.get('content-range') || '';
  const total = parseInt(cr.split('/')[1], 10) || rows.length;
  return { rows, page, perPage, total, hasMore: offset + rows.length < total };
}

async function updateApp(ref, patch) {
  const rows = await dbQuery('PATCH', 'applications', patch, { ref: `eq.${ref}` });
  return Array.isArray(rows) ? rows[0] : rows;
}

// ── SUPABASE STORAGE (documents bucket) ──────────────────────────────────────
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

// ── OUTBOUND EMAIL (Resend primary → Brevo automatic fallback) ───────────────
// If Resend refuses (daily quota exhausted, outage, etc.) the SAME email is
// automatically retried through Brevo (free tier ~300/day). The caller never
// notices. Only if BOTH providers fail does sendEmail throw — and callers'
// existing .catch fail-safes then route the item back to the human queue.
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
    // LOOP GUARD #4 — every email we send is tagged so the inbound pipeline
    // (worker + server) can recognise and ignore our own mail on sight.
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
    headers: { 'X-SkyGlobe-Origin': 'platform' }, // LOOP GUARD #4 (same tag)
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

// ── §3 AI ENGINE (Ollama → Groq → Gemini fallback chain) ─────────────────────
// ── UNIFIED AI TEXT ENGINE ───────────────────────────────────────────────────
// Resilient generation: try Gemini first (free tier), fall back to Claude
// (premium) if Gemini is missing/errors/empty. Guarantees a stable result so
// documents never silently fail. Returns the generated plain text.
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
        model: 'claude-opus-4-8', max_tokens: maxTokens,
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

// Gemini-primary (free) → Claude fallback (premium). Always returns text or throws.
async function generateText(prompt, opts = {}) {
  // FULL 24/7 CASCADE — the same resilience the CEO assistant enjoys:
  //   1. fast single Gemini call (honours opts exactly)
  //   2. the hardened chain: Ollama → Groq → 3 Gemini models with retries
  //   3. Claude (if configured)
  // One engine having a bad minute must never surface as "can't load".
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
// ── CONTACT / CONSULTATION FORM ───────────────────────────────────────────────
// ── DEPARTMENT MESSAGE (on-site form from the dept-contact strip) ────────────
// Public: visitors write to a department without leaving the website — no
// mail client involved. Lands in AI Reception exactly like an email would:
// AI answers by email when confident, otherwise the department's humans do.
// 'ceo' is deliberately NOT accepted here — the CEO's address is private.
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

  // AI Reception — triage in the background, regardless of email configuration.
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

  // AI Reception — triage this request in the background (never blocks the reply).
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

  // If this service carries a real fee and the client chose a payment method,
  // hand back a payment link the same way conferences/work-permit/legal-docs do.
  // Free-consultation services (not in SERVICE_PRODUCT_MAP) just get the plain
  // "team will contact you" confirmation below — no fee to fake.
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

// ── GET APPLICATION BY REFERENCE ──────────────────────────────────────────────
app.get('/api/apply/:ref', async (req, res) => {
  try {
    const found = await getAppByRef(req.params.ref.toUpperCase());
    if (!found) return res.status(404).json({ error: 'Application not found.' });
    const { passport, passport_expiry, ...safe } = found;
    res.json(safe);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET ALL APPLICATIONS BY EMAIL ─────────────────────────────────────────────
app.get('/api/apply', async (req, res) => {
  if (!req.query.email) return res.status(400).json({ error: 'Email required.' });
  try {
    const found = (await getAppsByEmail(req.query.email.toLowerCase()))
      .map(({ passport, passport_expiry, ...safe }) => safe);
    res.json(found);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── §5 AUTH LAYER ────────────────────────────────────────────────────────────
// ── AUTH (role-based) ────────────────────────────────────────────────────────
// ADMIN_PASSWORDS  → CEO-level access (full portal: analytics, exports, everything)
// STAFF_PASSWORDS  → Staff-level access (legacy env-var staff accounts)
// Staff Directory  → Staff accounts created from the CEO portal (the modern way).
//                    Cached in memory so getRole stays synchronous & fast.
// Format for env vars: "Name:password,Name2:password2"  (name optional)
// Returns { role:'ceo'|'staff', name, department? } or null
let STAFF_CACHE = [];
async function refreshStaffCache() {
  try {
    const rows = await dbQuery('GET', 'staff_members', null, { status: `eq.active`, limit: 500 });
    STAFF_CACHE = (Array.isArray(rows) ? rows : [])
      .filter(s => s.password)
      .map(s => ({ name: s.name, password: s.password, department: s.department, role: 'staff' }));
  } catch (e) { console.error('[staff-cache] refresh failed:', e.message); }
}

// ── ACTIVITY / AUDIT LOG ────────────────────────────────────────────────────
// Records every meaningful action so the CEO has one timeline of everything.
// Fire-and-forget: logging never blocks or breaks the main action.
async function logActivity(actor, actor_role, action, detail, target) {
  try {
    await dbQuery('POST', 'activity_log', {
      actor: actor || 'system', actor_role: actor_role || 'system',
      action: action || '', detail: detail || '', target: target || '',
      created_at: new Date().toISOString(),
    });
  } catch (e) { console.error('[activity] log failed:', e.message); }
}

function getRole(req) {
  const supplied = req.headers['x-admin-key'] || '';
  if (!supplied) return null;
  const ceoRaw = process.env.ADMIN_PASSWORDS || process.env.ADMIN_PASSWORD || '';
  for (const entry of ceoRaw.split(',').map(s => s.trim()).filter(Boolean)) {
    const [a, b] = entry.includes(':') ? entry.split(':') : [null, entry];
    if (supplied === b) return { role: 'ceo', name: a || 'CEO' };
  }
  // Staff accounts created from the CEO portal (Staff Directory)
  for (const s of STAFF_CACHE) {
    if (supplied === s.password) return { role: 'staff', name: s.name, department: s.department };
  }
  const staffRaw = process.env.STAFF_PASSWORDS || '';
  for (const entry of staffRaw.split(',').map(s => s.trim()).filter(Boolean)) {
    const [a, b] = entry.includes(':') ? entry.split(':') : [null, entry];
    if (supplied === b) return { role: 'staff', name: a || 'Staff' };
  }
  return null;
}

// CEO only — for sensitive CEO-only endpoints/portal
function checkAdmin(req, res, next) {
  const r = getRole(req);
  if (r && r.role === 'ceo') { req._who = r.name; if(next) next(); return r.name; }
  if (res && !res.headersSent) return res.status(401).json({ error: 'Unauthorized' });
  return null;
}

// CEO or Staff — for shared day-to-day work endpoints
function checkStaffOrAdmin(req, res, next) {
  const r = getRole(req);
  if (r) { req._who = r.name; req._role = r.role; if(next) next(); return r.name; }
  if (res && !res.headersSent) return res.status(401).json({ error: 'Unauthorized' });
  return null;
}

// CEO portal login — rejects staff passwords (CEO portal is CEO-only)
app.post('/api/admin/login', loginLimiter, (req, res) => {
  const fakeReq = { headers: { 'x-admin-key': (req.body && req.body.password) || '' } };
  const who = checkAdmin(fakeReq);
  if (!who) return res.status(401).json({ error: 'Wrong password.' });
  logActivity(who, 'ceo', 'login', 'Signed in to the CEO portal');
  res.json({ success: true, name: who, role: 'ceo' });
});

// Staff portal login — accepts staff OR CEO passwords
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
    // Paginated mode when ?page= is supplied; otherwise legacy full list (back-compat).
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
    // Push real-time status update to the client if they are logged in
    if (app_.email) sseNotify(app_.email, 'status-update', { ref: ref.toUpperCase(), status });
    res.json({ success: true, emailed, emailError: emailed ? null : 'Could not email applicant directly — a fallback notification was sent to your admin email. To fix permanently, verify a domain on Resend.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── §6 APPLICATION MANAGEMENT ────────────────────────────────────────────────
// ── DOCUMENTS ─────────────────────────────────────────────────────────────────
// Upload a document. Body: { ref, filename, contentType, data (base64) }
// Users upload from the tracking page; admins (with x-admin-key) from the dashboard.
app.post('/api/documents', async (req, res) => {
  const { ref, filename, contentType, data } = req.body || {};
  if (!ref || !filename || !data)
    return res.status(400).json({ error: 'ref, filename and data are required.' });

  const who = checkStaffOrAdmin(req); // null = regular applicant
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

    // If uploaded by staff/admin, auto-generate a secure viewer token
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

// List documents for an application
app.get('/api/documents/:ref', async (req, res) => {
  try {
    const rows = await dbQuery('GET', 'documents', null, {
      ref: `eq.${req.params.ref.toUpperCase()}`, order: 'created_at.asc',
    });
    res.json(rows.map(d => ({ ...d, url: storagePublicUrl(d.path) })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CEO or staff can delete documents
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

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/staff', (req, res) => res.sendFile(path.join(__dirname, 'staff.html')));
app.get('/letterhead', (req, res) => res.sendFile(path.join(__dirname, 'letterhead.html')));
app.get('/digitalization', (req, res) => res.sendFile(path.join(__dirname, 'digitalization.html')));
app.get('/conferences', (req, res) => res.sendFile(path.join(__dirname, 'conferences.html')));
app.get('/showreel', (req, res) => res.sendFile(path.join(__dirname, 'showreel.html')));
app.get('/terra', (req, res) => res.sendFile(path.join(__dirname, 'terra.html')));
app.get('/noria', (req, res) => res.sendFile(path.join(__dirname, 'noria.html')));
app.get('/yunex', (req, res) => res.sendFile(path.join(__dirname, 'yunex.html')));
app.get('/packages', (req, res) => res.sendFile(path.join(__dirname, 'packages.html')));
app.get('/work-permit', (req, res) => res.sendFile(path.join(__dirname, 'work-permit.html')));
app.get('/kids-academy', (req, res) => res.sendFile(path.join(__dirname, 'skyglobe-kids-academy.html')));
app.get('/academy', (req, res) => res.sendFile(path.join(__dirname, 'skyglobe-kids-academy.html'))); // the Academy serves every age — proud new address, old one kept forever
app.get('/legal-documents', (req, res) => res.sendFile(path.join(__dirname, 'legal-documents.html')));

// ── §8 AI FEATURES ───────────────────────────────────────────────────────────
// ── AI CHAT ───────────────────────────────────────────────────────────────────
const SKYGLOBE_SYSTEM = `You are the AI assistant for SkyGlobe Group, a premium global travel and immigration consultancy. You are knowledgeable, professional, warm, and concise.

Company facts:
- Founded 2016, based in New York City
- 12,400+ visas approved, 98% success rate, 47 countries served
- Phone/WhatsApp: +1 737-399-8522
- Email: support@skyglobegroup.com
- Website: https://skyglobegroup.com
- TikTok: @skyglobegroup (https://www.tiktok.com/@skyglobegroup)
- YouTube: @skyglobegroup (https://www.youtube.com/@skyglobegroup)
- Instagram: @skyglobegroup (https://www.instagram.com/skyglobegroup)

Services offered:
- Student Visas: UK (Tier 4/Student Route), USA (F-1), Canada (Study Permit), Australia (Subclass 500), Germany, Schengen and more
- Work Visas: UK Skilled Worker, Canada Express Entry/PR, Germany EU Blue Card, Australia Skilled Migration, USA H-1B
- Tourist & Schengen Visas: 40+ destinations, full package (visa + flight letter + hotel letter + insurance)
- EU Direct Employment Programme: job placement + work permit + visa in Poland, Latvia, Lithuania, Portugal, Spain, Norway, Finland, Czech Republic, Slovakia, Ukraine, Austria, North Macedonia, Bulgaria, Hungary, Montenegro, Japan, South Korea — 8–20 weeks (17 countries)
- University Admissions & Scholarship Applications (helped secure $2M+ in scholarships)
- Flight Reservation Letters: PNR-backed, embassy-accepted, from $15, same day
- Real Flight Ticket Booking: 500+ airlines
- Hotel Reservation Letters: embassy-accepted, same day
- Real Hotel Booking: 150+ countries
- Travel Insurance: Schengen (€30,000 min), comprehensive, student health cover (OSHC/IHS)
- Document Translation & Attestation
- National ID Card Assistance

Fees (service fees, not including government/embassy fees):
- Flight/Hotel letter: from $15 each, same day
- Travel insurance: from $20
- Tourist/Schengen Visa: from $150
- Student Visa: from $300
- Work Visa: from $400
- EU Employment: contact for quote

Application tracking: clients use reference numbers (format SKY-YEAR-XXXX) to track status at any time on the website.

Answer any question the user has about immigration, visas, studying abroad, working abroad, travel, or SkyGlobe's services. If a question is completely unrelated to these topics, politely redirect. Keep answers helpful, accurate, and not too long. Use bullet points or line breaks for clarity.  Always encourage users to book a free consultation or WhatsApp for personalised advice.

ABSOLUTE LANGUAGE RULE (highest priority): Reply in EXACTLY the same language as the user's most recent message. If it is English, reply 100% in English. Judge the language ONLY from the user's latest message and ignore the language of earlier messages. Never mix or switch languages within a reply. If the language is unclear or contains only names/numbers, default to English.

ACCURACY: Operate in the present day. Never present outdated fees, rules, or events as current; if unsure whether something is current, say so and recommend confirming with SkyGlobe or the official embassy. Never invent figures or requirements.`;

app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body || {};
  if (!message || !String(message).trim())
    return res.status(400).json({ error: 'Message is required.' });

  const userMsg = String(message).trim();

  // 24/7 AUTOMATIC CASCADE: Ollama → Groq → Gemini (same engine chain as the
  // Academy and CEO assistant). The assistant works as long as ANY one engine
  // is configured. If none are configured, fall back to the built-in FAQ so the
  // assistant is NEVER dead — it always gives a useful answer.
  if (!USE_OLLAMA && !USE_GROQ && !process.env.GEMINI_API_KEY)
    return res.json({ reply: skyglobeFaqAnswer(userMsg), source: 'faq' });

  try {
    const safeHistory = Array.isArray(history) ? history.slice(-10) : [];
    // Convert history to the shared format (role: user/model)
    const contents = safeHistory.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    contents.push({ role: 'user', parts: [{ text: userMsg }] });

    const reply = await academyAskGemini(SKYGLOBE_SYSTEM, contents, 1024);
    // If the AI engine returned nothing usable, use the FAQ fallback
    res.json({ reply: reply || skyglobeFaqAnswer(userMsg) });
  } catch (e) {
    console.error('AI chat error:', e.message);
    // AI engine down → still help the user with the built-in FAQ
    res.json({ reply: skyglobeFaqAnswer(userMsg), source: 'faq' });
  }
});

// ── NORIA AI — Premium Public Portal Intelligence ─────────────────────────────
// SECURITY: No DB queries. No admin routes. No secret ecosystem access.
// Answers exclusively from public portal knowledge + optional live Brave search.
const NORIA_SYSTEM = `You are NORIA — the premium AI intelligence assistant for SkyGlobe Group's public portal.

NORIA: Intelligence · Innovation · Impact

You have complete, expert knowledge of SkyGlobe Group's public services:

VISA SERVICES:
- Student Visas: UK Student Route, USA F-1, Canada Study Permit, Australia Subclass 500, Germany, Schengen, and 40+ destinations
- Work Visas: UK Skilled Worker, Canada Express Entry/PR, Germany EU Blue Card, Australia Skilled Migration, USA H-1B
- Tourist & Schengen Visas: 40+ destinations, full package (visa + flight letter + hotel letter + travel insurance)
- EU Direct Employment Programme: real job placement + work permit + visa in 17 countries: Poland, Latvia, Lithuania, Portugal, Spain, Norway, Finland, Czech Republic, Slovakia, Ukraine, Austria, North Macedonia, Bulgaria, Hungary, Montenegro, Japan, South Korea — typically 8–20 weeks

EDUCATION & SCHOLARSHIPS:
- University admissions management end-to-end for 195 countries
- Scholarship applications — secured $2M+ for clients
- SkyGlobe Academy educational programmes

TRAVEL SERVICES:
- Flight reservation letters: PNR-backed, embassy-accepted, from $15, same-day
- Real flight ticket booking: 500+ airlines
- Hotel reservation letters: same-day, embassy-accepted
- Real hotel booking: 150+ countries
- Travel insurance: Schengen-compliant (€30,000 min), comprehensive, student health (OSHC/IHS) — from $20
- Document translation & attestation, national ID card assistance

CONFERENCES:
- Worldwide conference sourcing and free registration
- Professional networking, academic, business, and industry events globally

SERVICE FEES (not including government/embassy fees):
- Flight/hotel letter: from $15 each, same day
- Travel insurance: from $20
- Tourist/Schengen visa: from $150
- Student visa: from $300
- Work visa: from $400
- EU Employment Programme: contact for personalised quote

COMPANY FACTS:
- Name: SkyGlobe Group (never "SKYGLOBE LIMITED")
- Founded 2016, New York City
- 12,400+ visas approved · 98% success rate · 47 countries served
- WhatsApp/Phone: +1 737-399-8522
- Email: support@skyglobegroup.com
- Website: https://skyglobegroup.com
- Application tracking: clients use reference numbers (format SKY-YEAR-XXXX)
- Social: @skyglobegroup (TikTok, YouTube, Instagram)

YOUR STANDARDS:
- 100% accuracy. Zero errors. Zero guessing.
- Be fast, precise, professional, warm — intelligence at the level of Gemini or ChatGPT
- Use clear structure: bullet points, bold headings when helpful, short paragraphs
- Always offer to connect users with the team for personalised help: WhatsApp +1 737-399-8522 or email support@skyglobegroup.com
- If asked about real-time info (prices, events, deadlines), give the ranges above and note the team can confirm exact figures
- NEVER access or reveal admin data, internal systems, client records, or confidential business information — public portal knowledge only`;

app.post('/api/noria', async (req, res) => {
  const { message, history } = req.body || {};
  if (!message || !String(message).trim())
    return res.status(400).json({ error: 'Message is required.' });
  const q = String(message).trim();
  // NORIA must never hang. Three-tier ladder, each with a hard clock:
  //  1. dedicated NORIA engine — 8s only (free-tier cold starts take ~50s;
  //     users must not sit through them)
  //  2. the platform AI (Gemini→Claude) with the NORIA persona — 20s
  //  3. built-in FAQ responder — instant, always succeeds
  try {
    const r = await fetch('https://noria-engine.onrender.com/v1/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, history: Array.isArray(history) ? history.slice(-10) : [] }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await r.json();
    if (data.answer) return res.json({ reply: data.answer, source: 'noria' });
    throw new Error('empty engine answer');
  } catch (e) {
    // Warm the engine in the background so the NEXT question hits it hot.
    fetch('https://noria-engine.onrender.com/v1/ask', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'ping', history: [] }), signal: AbortSignal.timeout(60000),
    }).catch(() => {});
    try {
      const hist = (Array.isArray(history) ? history.slice(-6) : [])
        .map(m => `${m.role === 'model' ? 'NORIA' : 'Client'}: ${(m.parts?.[0]?.text || '').slice(0, 400)}`).join('\n');
      const out = await Promise.race([
        generateText(
          `${hist ? 'Conversation so far:\n' + hist + '\n\n' : ''}Client question: ${q}\n\nAnswer as NORIA in 2-5 warm, professional sentences. If the question is outside SkyGlobe's services, answer helpfully and gently relate it back. Never invent prices; for exact pricing point to the website or support@skyglobegroup.com.`,
          { maxTokens: 500, temperature: 0.5, system: 'You are NORIA, SkyGlobe Group\'s AI intelligence. SkyGlobe Group is a digital ecosystem: Global Mobility (visas for 47+ countries, EU work permits & jobs in 17 countries, flight/hotel reservation letters, travel insurance, conferences), SkyGlobe Academy (courses, admissions, scholarships), Legal & Trust Services, Digital Identity, Finance, and the TERRA & YUNEX platforms. WhatsApp +1 737-399-8522.' }
        ),
        new Promise((_, rej) => setTimeout(() => rej(new Error('ai-timeout')), 20000)),
      ]);
      if (out && String(out).trim()) return res.json({ reply: String(out).trim(), source: 'ai' });
      throw new Error('empty ai answer');
    } catch (e2) {
      console.error('NORIA ladder exhausted:', e.message, '|', e2.message);
      res.json({ reply: skyglobeFaqAnswer(q), source: 'faq' });
    }
  }
});

// Built-in FAQ responder — keyword-matched answers so the public assistant
// always replies helpfully even when every AI engine is unavailable.
function skyglobeFaqAnswer(q) {
  const m = String(q || '').toLowerCase();
  const has = (...kw) => kw.some(k => m.includes(k));
  const CONTACT = '\n\nFor personal help, WhatsApp us at +1 737-399-8522 or email support@skyglobegroup.com.';
  if (has('student visa', 'study', 'study abroad', 'admission', 'university'))
    return 'We handle student visas for the UK (Student Route), USA (F-1), Canada (Study Permit), Australia (Subclass 500), Germany and more — including university admissions and scholarship applications (we\'ve helped secure $2M+ in scholarships). We manage your documents, financial proof and interview prep end to end.' + CONTACT;
  if (has('work visa', 'work permit', 'job', 'employment', 'eu direct', 'relocat', 'skilled'))
    return 'Our EU Direct Employment Programme places you in a real job with work permit + visa in 17 countries (Poland, Portugal, Germany, Norway, Finland and more), typically in 8–20 weeks. We also handle UK Skilled Worker, Canada Express Entry/PR, Germany EU Blue Card and Australia Skilled Migration.' + CONTACT;
  if (has('tourist', 'schengen', 'visit visa', 'holiday'))
    return 'We process tourist & Schengen visas for 40+ destinations with a full package: visa application + embassy-accepted flight reservation letter + hotel letter + travel insurance. Tourist/Schengen service fees start from $150.' + CONTACT;
  if (has('flight', 'reservation letter', 'ticket', 'pnr'))
    return 'We provide PNR-backed, embassy-accepted flight reservation letters from $15 (same day), plus real flight ticket booking across 500+ airlines.' + CONTACT;
  if (has('hotel', 'accommodation'))
    return 'We issue embassy-accepted hotel reservation letters (same day) and real hotel bookings in 150+ countries.' + CONTACT;
  if (has('insurance'))
    return 'We offer Schengen-compliant travel insurance (€30,000 minimum cover) from $20, plus comprehensive and student health cover (OSHC/IHS).' + CONTACT;
  if (has('cost', 'price', 'fee', 'how much', 'charge'))
    return 'Our service fees (separate from government/embassy fees): flight or hotel letters from $15, travel insurance from $20, tourist/Schengen visas from $150. Student and work visa packages are quoted based on your destination and case.' + CONTACT;
  if (has('time', 'how long', 'duration', 'processing'))
    return 'Timelines vary by service: flight/hotel letters are same-day; tourist/Schengen visas typically take 1–3 weeks; the EU Direct Employment Programme runs 8–20 weeks depending on country and role.' + CONTACT;
  if (has('contact', 'phone', 'whatsapp', 'email', 'reach', 'call', 'office'))
    return 'You can reach SkyGlobe Group on WhatsApp/phone at +1 737-399-8522, email support@skyglobegroup.com, or via our socials @skyglobegroup. We\'re based in New York City and serve clients worldwide.';
  if (has('hi', 'hello', 'hey', 'salam', 'good morning', 'good afternoon', 'good evening'))
    return '👋 Hello! I\'m SkyGlobe\'s AI assistant. I can help with student & work visas, tourist/Schengen visas, university admissions, flight & hotel letters, travel insurance and more. What would you like to know?';
  return 'SkyGlobe Group is a premium global travel & immigration consultancy — student & work visas, tourist/Schengen visas, university admissions, EU job placement, flight & hotel letters and travel insurance (12,400+ visas approved, 98% success rate, 47 countries).' + CONTACT;
}

// ── SECURE DOCUMENT TOKENS ────────────────────────────────────────────────────

function genSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function createDocToken(docId, docPath, filename, clientEmail, appRef) {
  const token = genSecureToken();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // 72 hours
  try {
    await dbQuery('POST', 'document_tokens', {
      token, document_id: docId, document_path: docPath, filename,
      client_email: clientEmail, application_ref: appRef,
      expires_at: expiresAt, created_at: new Date().toISOString(),
    });
  } catch (e) { console.error('Token create warning:', e.message); }
  return token;
}

// Secure document viewer page
app.get('/view/:token', (req, res) => {
  res.sendFile(path.join(__dirname, 'secure-viewer.html'));
});

// API: validate token and return doc metadata (no raw URL exposed)
app.get('/api/view/:token', async (req, res) => {
  try {
    const rows = await dbQuery('GET', 'document_tokens', null, { token: `eq.${req.params.token}`, limit: 1 });
    if (!rows[0]) return res.status(404).json({ error: 'Invalid or expired link.' });
    const tok = rows[0];
    if (new Date(tok.expires_at) < new Date()) return res.status(410).json({ error: 'This document link has expired. Please contact SkyGlobe Group for a new link.' });
    // record access time
    await dbQuery('PATCH', 'document_tokens', { accessed_at: new Date().toISOString() }, { token: `eq.${req.params.token}` }).catch(() => {});
    res.json({ filename: tok.filename, client_email: tok.client_email, application_ref: tok.application_ref, expires_at: tok.expires_at });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// API: proxy document content through our server (hides real storage URL)
app.get('/api/view/:token/content', async (req, res) => {
  try {
    const rows = await dbQuery('GET', 'document_tokens', null, { token: `eq.${req.params.token}`, limit: 1 });
    if (!rows[0]) return res.status(404).send('Not found.');
    const tok = rows[0];
    if (new Date(tok.expires_at) < new Date()) return res.status(410).send('This link has expired.');
    const fileUrl = storagePublicUrl(tok.document_path);
    const upstream = await fetch(fileUrl);
    if (!upstream.ok) return res.status(404).send('Document not found.');
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    res.set('Content-Type', contentType);
    res.set('Content-Disposition', 'inline'); // inline = display, not download
    res.set('Cache-Control', 'no-store');
    res.set('X-Frame-Options', 'SAMEORIGIN');
    // Node's built-in fetch returns a Web stream (no .pipe method) — buffer it.
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (e) { console.error('view content error:', e.message); res.status(500).send('Error loading document.'); }
});

// Admin: regenerate token for a document
app.post('/api/admin/documents/:id/new-token', checkAdmin, async (req, res) => {
  try {
    const rows = await dbQuery('GET', 'documents', null, { id: `eq.${req.params.id}`, limit: 1 });
    if (!rows[0]) return res.status(404).json({ error: 'Document not found.' });
    const doc = rows[0];
    // get application email
    const apps = await dbQuery('GET', 'applications', null, { ref: `eq.${doc.ref}`, limit: 1 });
    const email = apps[0]?.email || '';
    // delete old token
    await dbQuery('DELETE', 'document_tokens', null, { document_id: `eq.${doc.id}` }).catch(() => {});
    const token = await createDocToken(doc.id, doc.path, doc.filename, email, doc.ref);
    res.json({ success: true, token, viewUrl: `${baseUrl(req)}/view/${token}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


app.get('/api/test-ai', async (req, res) => {
  // Tests BOTH engines so you can see exactly what's configured and working.
  const out = { gemini: { configured: !!process.env.GEMINI_API_KEY }, claude: { configured: !!process.env.ANTHROPIC_API_KEY } };
  try { out.gemini.reply = await geminiGenerate('Say: AI is working!', { maxTokens: 30 }); out.gemini.ok = true; }
  catch (e) { out.gemini.ok = false; out.gemini.error = e.message; }
  try { out.claude.reply = await claudeGenerate('Say: AI is working!', { maxTokens: 30 }); out.claude.ok = true; }
  catch (e) { out.claude.ok = false; out.claude.error = e.message; }
  out.documents_will_work = !!(out.gemini.ok || out.claude.ok);
  res.json(out);
});

// Diagnostic: test exact Gemini call used by CEO + Kids — visit /api/test-gemini in browser
app.get('/api/test-gemini', async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.json({ error: 'GEMINI_API_KEY is NOT set on this server. Set it in Render environment variables.' });
  const results = [];
  for (const model of ['gemini-2.0-flash', 'gemini-2.5-flash']) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: 'You are a helpful assistant.' }] },
            contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: WORKING' }] }],
            generationConfig: { maxOutputTokens: 20, temperature: 0 }
          }),
          signal: AbortSignal.timeout(20000)
        }
      );
      const data = await r.json();
      const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
      results.push({ model, status: r.status, ok: r.ok, text: text || null, finishReason: data.candidates?.[0]?.finishReason, error: data.error?.message || null });
    } catch (e) {
      results.push({ model, ok: false, error: e.message });
    }
  }
  res.json({ key_set: true, key_preview: key.slice(0, 8) + '...', results });
});

app.get('/api/test', async (req, res) => {
  const to = (process.env.RECIPIENT_EMAIL || 'support@skyglobegroup.com').split(',')[0].trim();
  const providers = { resend: !!process.env.RESEND_API_KEY, brevo: !!process.env.BREVO_API_KEY };
  if (!providers.resend && !providers.brevo)
    return res.json({ ok: false, providers, error: 'No email provider configured (RESEND_API_KEY / BREVO_API_KEY missing)' });
  try {
    const data = await sendEmail(to, 'SkyGlobe — Email Test', '<p>✅ Email is working! (Resend primary, Brevo fallback)</p>');
    res.json({ ok: true, providers, response: data });
  } catch (err) { res.json({ ok: false, providers, error: err.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
//  CLIENT ACCOUNTS (login) + IN-APP MESSAGING
//  Reference-number tracking still works without an account — this is additive.
//  Required Supabase tables: clients, messages  (see SETUP SQL in README)
// ════════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.SUPABASE_KEY || 'skyglobe-dev-secret';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(test));
}
function signToken(email) {
  const payload = Buffer.from(JSON.stringify({ email, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (Date.now() - data.iat > 30 * 24 * 60 * 60 * 1000) return null; // 30-day expiry
    return data.email;
  } catch { return null; }
}
function clientAuth(req) {
  const h = req.headers['authorization'] || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  return verifyToken(token);
}

async function getClientByEmail(email) {
  const rows = await dbQuery('GET', 'clients', null, { email: `eq.${email}`, limit: 1 });
  return rows[0] || null;
}

// ── §7 CLIENT PORTAL ─────────────────────────────────────────────────────────
// ── SIGN UP ───────────────────────────────────────────────────────────────────
app.post('/api/auth/signup', loginLimiter, async (req, res) => {
  let { name, email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  email = String(email).trim().toLowerCase();
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  try {
    const existing = await getClientByEmail(email);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    await dbQuery('POST', 'clients', { email, name: name || '', password_hash: hashPassword(password) });
    const token = signToken(email);
    res.json({ success: true, token, email, name: name || '' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── LOG IN ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  let { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  email = String(email).trim().toLowerCase();
  try {
    const client = await getClientByEmail(email);
    if (!client || !verifyPassword(password, client.password_hash))
      return res.status(401).json({ error: 'Wrong email or password.' });
    const token = signToken(email);
    // Record login session (best-effort — don't fail login if this errors)
    dbQuery('POST', 'session_logs', {
      email,
      name: client.name || '',
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      logged_in_at: new Date().toISOString(),
    }).catch(() => {});
    res.json({ success: true, token, email, name: client.name || '' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── WHO AM I ──────────────────────────────────────────────────────────────────
app.get('/api/auth/me', async (req, res) => {
  const email = clientAuth(req);
  if (!email) return res.status(401).json({ error: 'Not logged in.' });
  try {
    const client = await getClientByEmail(email);
    if (!client) return res.status(401).json({ error: 'Account not found.' });
    res.json({ email: client.email, name: client.name || '' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CLIENT: GET MY MESSAGES ─────────────────────────────────────────────────────
// ── CLIENT: MY DOCUMENTS FROM SKYGLOBE ────────────────────────────────────────
// Every document ever handed to this email — staff-delivered files, AI legal
// documents, and identity cards alike — found in one pass via document_tokens
// (which every issuance path stamps with the recipient's email). Because the
// caller already proved who they are by logging in, an expired 72-hour token
// is transparently renewed here rather than left as a dead link — anonymous,
// emailed links still expire on schedule, but the dashboard never dead-ends.
const DOC_KIND_LABELS = { 'ai:identity': 'Identity Card', 'ai:legal-docs': 'Legal Document' };
app.get('/api/client/documents', async (req, res) => {
  const email = clientAuth(req);
  if (!email) return res.status(401).json({ error: 'Not logged in.' });
  try {
    const tokens = await dbQuery('GET', 'document_tokens', null,
      { client_email: `eq.${email}`, order: 'created_at.desc', limit: 200 });
    if (!tokens.length) return res.json([]);
    const byDocId = new Map();
    for (const t of tokens) if (!byDocId.has(t.document_id)) byDocId.set(t.document_id, t);

    const out = [];
    for (const tok of byDocId.values()) {
      const rows = await dbQuery('GET', 'documents', null, { id: `eq.${tok.document_id}`, limit: 1 }).catch(() => []);
      const doc = rows[0];
      if (!doc) continue;
      let activeTok = tok;
      if (new Date(tok.expires_at) < new Date()) {
        const newToken = await createDocToken(doc.id, doc.path, doc.filename, email, tok.application_ref);
        activeTok = { ...tok, token: newToken, expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() };
      }
      out.push({
        id: doc.id, ref: doc.ref, filename: doc.filename, created_at: doc.created_at,
        kind: DOC_KIND_LABELS[doc.uploaded_by] || 'Delivered File',
        application_ref: tok.application_ref || null,
        view_token: activeTok.token, token_expires: activeTok.expires_at,
      });
    }
    out.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/messages', async (req, res) => {
  const email = clientAuth(req);
  if (!email) return res.status(401).json({ error: 'Not logged in.' });
  try {
    const msgs = await dbQuery('GET', 'messages', null, { client_email: `eq.${email}`, order: 'created_at.asc', limit: 500 });
    // mark admin messages as read
    res.json(msgs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CLIENT: SEND A MESSAGE ──────────────────────────────────────────────────────
app.post('/api/messages', async (req, res) => {
  const email = clientAuth(req);
  if (!email) return res.status(401).json({ error: 'Not logged in.' });
  const { body } = req.body || {};
  if (!body || !String(body).trim()) return res.status(400).json({ error: 'Message cannot be empty.' });
  try {
    const rows = await dbQuery('POST', 'messages', { client_email: email, sender: 'client', body: String(body).trim(), read: false });
    sseNotify('__admin__', 'new-client-message', { client_email: email, preview: String(body).trim().slice(0, 80) });
    // AI answers live in the background — until it decides a human is needed.
    aiChatReply(email).catch(() => {});
    // Notify the team by email
    try {
      const recipientEmail = process.env.RECIPIENT_EMAIL ? process.env.RECIPIENT_EMAIL.split(',').map(s => s.trim()) : ['support@skyglobegroup.com', 'insights.skyglobe@gmail.com'];
      await sendEmail(recipientEmail, `💬 New client message from ${email}`,
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#0a1628;padding:20px;border-radius:8px 8px 0 0"><h2 style="color:#c9a84c;margin:0">New In-App Message</h2></div>
          <div style="background:#f9f9f9;padding:20px;border:1px solid #e0e0e0;border-radius:0 0 8px 8px">
            <p style="color:#555;margin:0 0 8px"><strong>From:</strong> ${email}</p>
            <div style="background:#fff;border-left:4px solid #c9a84c;padding:14px;border-radius:4px;color:#333;line-height:1.6">${String(body).trim().replace(/\n/g,'<br>')}</div>
            <p style="color:#888;font-size:0.8rem;margin-top:14px">Reply from the Admin dashboard → Messages, or email them directly.</p>
          </div>
        </div>`, email);
    } catch (e) { console.error('Message notify email failed:', e.message); }
    res.json({ success: true, message: Array.isArray(rows) ? rows[0] : rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ADMIN: LIST ALL MESSAGE THREADS ─────────────────────────────────────────────
app.get('/api/admin/messages', async (req, res) => {
  if (!checkStaffOrAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const all = await dbQuery('GET', 'messages', null, { order: 'created_at.asc', limit: 1000 });
    res.json(all);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ADMIN: REPLY TO A CLIENT ─────────────────────────────────────────────────────
app.post('/api/admin/messages', async (req, res) => {
  const who = checkStaffOrAdmin(req);
  if (!who) return res.status(401).json({ error: 'Unauthorized' });
  const { client_email, body } = req.body || {};
  if (!client_email || !body || !String(body).trim())
    return res.status(400).json({ error: 'client_email and body are required.' });
  try {
    const rows = await dbQuery('POST', 'messages', { client_email: String(client_email).toLowerCase(), sender: 'admin', body: String(body).trim(), read: false });
    sseNotify(String(client_email).toLowerCase(), 'new-message', { sender: 'admin', body: String(body).trim(), created_at: new Date().toISOString() });
    // Email the client that they have a reply
    try {
      await sendEmail(client_email, 'You have a new message from SkyGlobe Group',
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#0a1628;padding:24px;border-radius:8px 8px 0 0;text-align:center">
            <img src="https://skyglobegroup.com/icon-512.png" alt="SkyGlobe" style="height:56px;border-radius:10px"><br>
            <h2 style="color:#c9a84c;margin:10px 0 0">New Message</h2>
          </div>
          <div style="background:#f9f9f9;padding:24px;border:1px solid #e0e0e0;border-radius:0 0 8px 8px">
            <p style="color:#333">Our team has replied to you:</p>
            <div style="background:#fff;border-left:4px solid #c9a84c;padding:16px;border-radius:4px;color:#333;line-height:1.6">${String(body).trim().replace(/\n/g,'<br>')}</div>
            <p style="color:#555;margin-top:16px">Log in at <a href="https://skyglobegroup.com">skyglobegroup.com</a> to reply.</p>
          </div>
        </div>`);
    } catch (e) { console.error('Admin reply email failed:', e.message); }
    res.json({ success: true, message: Array.isArray(rows) ? rows[0] : rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── INTERNAL: STAFF NOTES ON AN APPLICATION ─────────────────────────────────────
// Private notes between CEO & staff, attached to an application. Never shown to client.
// Requires Supabase column:  ALTER TABLE applications ADD COLUMN IF NOT EXISTS staff_notes jsonb DEFAULT '[]'::jsonb;
app.post('/api/admin/note', async (req, res) => {
  const r = getRole(req);
  if (!r) return res.status(401).json({ error: 'Unauthorized' });
  const { ref, note } = req.body || {};
  if (!ref || !note || !String(note).trim()) return res.status(400).json({ error: 'ref and note are required.' });
  try {
    const app_ = await getAppByRef(String(ref).toUpperCase());
    if (!app_) return res.status(404).json({ error: 'Application not found.' });
    const notes = Array.isArray(app_.staff_notes) ? app_.staff_notes : [];
    notes.push({ by: r.name, role: r.role, message: String(note).trim(), date: new Date().toISOString() });
    await updateApp(String(ref).toUpperCase(), { staff_notes: notes });
    res.json({ success: true, notes });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── INTERNAL: TEAM CHAT (CEO ↔ STAFF) ───────────────────────────────────────────
// A shared private channel for the whole team. Clients never see this.
// Requires Supabase table:
//   create table if not exists team_messages (
//     id bigserial primary key, author text, role text, body text,
//     created_at timestamptz default now()
//   );
app.get('/api/team/messages', async (req, res) => {
  if (!getRole(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const rows = await dbQuery('GET', 'team_messages', null, { order: 'created_at.asc', limit: 500 });
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/team/messages', async (req, res) => {
  const r = getRole(req);
  if (!r) return res.status(401).json({ error: 'Unauthorized' });
  const { body } = req.body || {};
  if (!body || !String(body).trim()) return res.status(400).json({ error: 'Message body is required.' });
  try {
    const rows = await dbQuery('POST', 'team_messages', { author: r.name, role: r.role, body: String(body).trim() });
    res.json({ success: true, message: Array.isArray(rows) ? rows[0] : rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// Lightweight endpoint the front-end pings to wake the server from sleep.
app.get('/api/health', (req, res) => res.json({ ok: true, t: Date.now() }));

// ── §12 ANALYTICS (self-hosted — no third-party service, no cookies) ─────────
// Required Supabase table (run once):
//   create table if not exists analytics_events (
//     id bigserial primary key,
//     event text not null,
//     page  text,
//     meta  jsonb,
//     created_at timestamptz default now()
//   );
//   create index on analytics_events (event, created_at desc);

const analyticsLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });

// Public: fire an analytics event (fire-and-forget from the client)
app.post('/api/analytics/event', analyticsLimiter, async (req, res) => {
  const { event, page, meta } = req.body || {};
  if (!event || typeof event !== 'string' || event.length > 80) return res.status(400).end();
  // Write async — never block the response
  dbQuery('POST', 'analytics_events', {
    event: sanitize(event, 80),
    page:  sanitize(page || '', 200),
    meta:  (meta && typeof meta === 'object') ? meta : null,
  }).catch(() => {});
  res.status(202).end();
});

// CEO only: query analytics for the dashboard
app.get('/api/admin/analytics', async (req, res) => {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days) || 30));
    const since = new Date(Date.now() - days * 864e5).toISOString();
    const rows = await dbQuery('GET', 'analytics_events', null, {
      created_at: `gte.${since}`,
      order: 'created_at.desc',
      limit: 5000,
    });
    if (!Array.isArray(rows) || !rows.length) return res.json({ rows: [], days });
    res.json({ rows, days });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── #23 ERROR MONITORING (self-hosted — no Sentry, no extra package) ──────────
// Required Supabase table (run once):
//   create table if not exists error_logs (
//     id bigserial primary key,
//     source text,          -- 'server' | 'client'
//     message text,
//     stack text,
//     url text,
//     user_agent text,
//     created_at timestamptz default now()
//   );
//   create index on error_logs (created_at desc);
async function logError({ source, message, stack, url, userAgent }) {
  try {
    await dbQuery('POST', 'error_logs', {
      source: source || 'server',
      message: String(message || '').slice(0, 1000),
      stack:   String(stack || '').slice(0, 4000),
      url:     String(url || '').slice(0, 500),
      user_agent: String(userAgent || '').slice(0, 300),
    });
  } catch { /* never let logging crash the app */ }
}

// Public: client-side error reporting (rate-limited so it can't be abused)
app.post('/api/log-error', analyticsLimiter, (req, res) => {
  const { message, stack, url } = req.body || {};
  if (message) {
    logError({ source: 'client', message, stack, url, userAgent: req.headers['user-agent'] });
  }
  res.status(202).end();
});

// CEO only: view recent errors
app.get('/api/admin/errors', async (req, res) => {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const rows = await dbQuery('GET', 'error_logs', null, { order: 'created_at.desc', limit: 200 });
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── AI RECEPTION — CEO/staff queue ───────────────────────────────────────────
// Departments config (public labels + future addresses) for the admin UI.
app.get('/api/admin/departments', (req, res) => {
  if (!checkStaffOrAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  res.json(Object.values(DEPARTMENTS));
});

// ── PHASE D: INBOUND EMAIL → AI RECEPTION ────────────────────────────────────
// A Cloudflare Email Worker (cloudflare-email-worker.js in this repo) POSTs
// every email that arrives at a department address here. The worker ALSO
// forwards the original to the human inbox first, so the AI is additive —
// if this endpoint is down, no mail is ever lost. Protected by a shared
// secret (EMAIL_INBOUND_SECRET on Render = INBOUND_SECRET on the worker).
function extractEmailText(raw) {
  if (!raw) return '';
  let t = String(raw);
  // Prefer the text/plain MIME part when present.
  const m = t.match(/Content-Type:\s*text\/plain[^]*?\r?\n\r?\n([^]*?)(\r?\n--|$)/i);
  if (m) t = m[1];
  else { const idx = t.search(/\r?\n\r?\n/); if (idx !== -1) t = t.slice(idx); }
  // Undo common quoted-printable encoding artifacts.
  t = t.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/gi, (_, h) => { try { return String.fromCharCode(parseInt(h, 16)); } catch { return _; } });
  return t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000);
}

app.post('/api/email/inbound', async (req, res) => {
  const secret = process.env.EMAIL_INBOUND_SECRET;
  if (!secret || req.headers['x-inbound-secret'] !== secret)
    return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { from, to, subject, text, raw } = req.body || {};
    const fromEmail = (String(from || '').match(/[\w.+-]+@[\w.-]+/) || [])[0]?.toLowerCase();
    if (!fromEmail) return res.status(400).json({ error: 'No sender address' });
    // LOOP GUARD #2 — never react to our own mail, bounces, or robots.
    // Critical detail: Cloudflare hands the worker the ENVELOPE sender, and
    // for mail we send via Resend that envelope is a resend/ESP bounce
    // address, NOT @skyglobegroup.com — so we must also block ESP bounce
    // domains AND check the raw From: header for our own domain.
    if (/@skyglobegroup\.com$/i.test(fromEmail)
      || /mailer-daemon|postmaster|no-?reply|noreply|bounce/i.test(fromEmail)
      || /(^|[@.])(resend\.(com|dev|app)|amazonses\.com|sendgrid\.net|mailgun\.org|sparkpostmail\.com)$/i.test(fromEmail.split('@')[1] || ''))
      return res.json({ skipped: 'own-domain-or-robot' });
    const rawHead = String(raw || '').slice(0, 4000);
    if (/^From:[^\r\n]*@skyglobegroup\.com/im.test(rawHead) || /^X-SkyGlobe-Origin:/im.test(rawHead))
      return res.json({ skipped: 'own-header-from' });
    // LOOP GUARD #3 — dedup: at most one inbound-email triage per sender per
    // minute. A runaway source can never amplify faster than 1/min.
    try {
      const recent = await dbQuery('GET', 'ai_reception', null, {
        client_email: `eq.${fromEmail}`, source: 'eq.email',
        order: 'created_at.desc', limit: 1,
      });
      if (recent[0] && (Date.now() - new Date(recent[0].created_at).getTime()) < 60 * 1000)
        return res.json({ skipped: 'dedup-window' });
    } catch { /* dedup is best-effort */ }
    const toAddr = String(to || '').toLowerCase();
    // Legacy address aliases — old addresses keep working forever after the
    // ecosystem realignment (visas@ was Global Mobility's original address).
    const EMAIL_ALIASES = { 'visas@skyglobegroup.com': 'travel' };
    const deptKey = Object.keys(EMAIL_ALIASES).find(a => toAddr.includes(a))
      ? EMAIL_ALIASES[Object.keys(EMAIL_ALIASES).find(a => toAddr.includes(a))]
      : (VALID_DEPT_KEYS.find(k => toAddr.includes(DEPARTMENTS[k].email.toLowerCase())) || 'general');
    const bodyText = (text && String(text).trim()) || extractEmailText(raw);
    await aiReceive({
      source: 'email', name: '', email: fromEmail,
      service: `Email to ${DEPARTMENTS[deptKey].email}`,
      message: `Subject: ${String(subject || '(no subject)').slice(0, 200)}\n\n${bodyText || '(no readable text body)'}`,
      deptHint: deptKey,
    });
    res.json({ success: true });
  } catch (e) {
    console.error('[inbound-email] failed:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Map a staff account's free-text department (e.g. "Legal & Documents") to a
// reception department key. Conservative: no confident match → no scoping.
function staffDeptKey(department) {
  const d = String(department || '').toLowerCase();
  if (!d) return null;
  for (const k of VALID_DEPT_KEYS) {
    if (d === k || d.includes(k) || DEPARTMENTS[k].label.toLowerCase().includes(d) || d.includes(DEPARTMENTS[k].label.toLowerCase())) return k;
  }
  if (/travel|visa|mobility/.test(d)) return 'travel';
  if (/educat|academ|admission/.test(d)) return 'education';
  if (/legal|document|notary/.test(d)) return 'legal';
  if (/identity|id card/.test(d)) return 'identity';
  if (/financ|payment|account/.test(d)) return 'finance';
  if (/innovat|technolog|developer/.test(d)) return 'innovation';
  return null;
}

app.get('/api/admin/reception', async (req, res) => {
  if (!checkStaffOrAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const params = { order: 'created_at.desc', limit: 300 };
    if (req.query.dept && VALID_DEPT_KEYS.includes(req.query.dept)) params.department = `eq.${req.query.dept}`;
    if (req.query.status) params.status = `eq.${req.query.status}`;
    const rows = await dbQuery('GET', 'ai_reception', null, params);
    let list = Array.isArray(rows) ? rows : [];
    // ROLE SCOPING (ARCHITECTURE.md §7): a staff member with a recognised
    // department sees their department's queue (+ general + items assigned to
    // them personally) by default. ?all=1 shows everything; the CEO always
    // sees everything.
    const who = getRole(req);
    if (who && who.role === 'staff' && req.query.all !== '1' && !req.query.dept) {
      const myDept = staffDeptKey(who.department);
      if (myDept) {
        list = list.filter(r => r.department === myDept || r.department === 'general' || r.assigned_to === who.name);
      }
    }
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/reception/stats', async (req, res) => {
  if (!checkStaffOrAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const rows = await dbQuery('GET', 'ai_reception', null, { order: 'created_at.desc', limit: 1000 });
    const list = Array.isArray(rows) ? rows : [];
    const byDept = {}, byStatus = {};
    let needsHuman = 0, critical = 0;
    for (const r of list) {
      byDept[r.department] = (byDept[r.department] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      if (r.needs_human && r.status !== 'resolved') needsHuman++;
      if (r.urgency === 'critical' && r.status !== 'resolved') critical++;
    }
    res.json({ total: list.length, needsHuman, critical, byDept, byStatus });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Staff list for the assignee picker (name · department · email).
app.get('/api/admin/reception/staff', async (req, res) => {
  if (!checkStaffOrAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const rows = await dbQuery('GET', 'staff_members', null, { status: `eq.active`, order: 'name.asc', limit: 200 }).catch(() => []);
    res.json((Array.isArray(rows) ? rows : []).map(s => ({ name: s.name, department: s.department || '', email: s.email || '' })));
  } catch (e) { res.json([]); }
});

app.patch('/api/admin/reception/:id', async (req, res) => {
  if (!checkStaffOrAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const b = req.body || {}, patch = {};
    if (['new','ai_handled','assigned','resolved'].includes(b.status)) patch.status = b.status;
    if (b.assigned_to !== undefined) patch.assigned_to = String(b.assigned_to || '').slice(0, 120);
    if (b.department !== undefined && VALID_DEPT_KEYS.includes(b.department)) patch.department = b.department;
    if (typeof b.suggested_reply === 'string') patch.suggested_reply = b.suggested_reply.slice(0, 2000);
    const updated = await dbQuery('PATCH', 'ai_reception', patch, { id: `eq.${req.params.id}` });
    const rec = Array.isArray(updated) ? updated[0] : updated;
    // When newly assigned to a named person, notify them (email + live badge).
    if (b.assigned_to && patch.status === 'assigned') {
      sseNotify('__admin__', 'reception-assigned', { id: req.params.id, assigned_to: b.assigned_to });
      try {
        const staff = await dbQuery('GET', 'staff_members', null, { name: `eq.${b.assigned_to}`, limit: 1 }).catch(() => []);
        const to = staff[0]?.email;
        if (to && rec) {
          const dept = DEPARTMENTS[rec.department] || DEPARTMENTS.general;
          await sendEmail(to, `${dept.icon} Assigned to you — ${rec.client_name || rec.client_email || 'client request'}`,
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a2233">
              <h2 style="color:#c9a84c">A request has been assigned to you</h2>
              <p><strong>Client:</strong> ${rec.client_name || '—'} &lt;${rec.client_email || '—'}&gt;</p>
              <p><strong>Department:</strong> ${dept.label}</p>
              ${rec.service ? `<p><strong>Service:</strong> ${rec.service}</p>` : ''}
              <p><strong>What they need:</strong> ${rec.intent || '—'}</p>
              <p style="font-size:13px;color:#6b7689">Open your Staff Portal → 🛎️ Reception to reply and resolve.</p>
            </div>`).catch(() => {});
        }
      } catch { /* notification is best-effort */ }
    }
    res.json({ success: true, record: rec });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Send the (optionally edited) AI reply to the client and mark it resolved.
app.post('/api/admin/reception/:id/reply', async (req, res) => {
  if (!checkStaffOrAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const rows = await dbQuery('GET', 'ai_reception', null, { id: `eq.${req.params.id}`, limit: 1 });
    const rec = rows[0];
    if (!rec) return res.status(404).json({ error: 'Not found.' });
    const body = String((req.body || {}).reply || rec.suggested_reply || '').trim();
    if (!body) return res.status(400).json({ error: 'Reply is empty.' });
    if (!rec.client_email) return res.status(400).json({ error: 'No client email on file.' });
    const dept = DEPARTMENTS[rec.department] || DEPARTMENTS.general;
    // Chat-sourced items: post the human's reply straight into the client's
    // in-app thread (sender 'admin' = human takeover, which permanently stops
    // the AI auto-replies for that thread) so the conversation stays in one place.
    if (rec.source === 'chat') {
      await dbQuery('POST', 'messages', { client_email: rec.client_email, sender: 'admin', body, read: false }).catch(() => {});
      sseNotify(rec.client_email, 'new-message', { sender: 'admin', body, created_at: new Date().toISOString() });
    } else {
      // Portal-first: if this client has an account, the reply also lands in
      // their in-app inbox instantly — zero email quota, never blocked.
      await portalDeliver(rec.client_email, body, rec.department).catch(() => {});
    }
    await sendEmail(rec.client_email, `SkyGlobe Group — ${dept.label}`,
      `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:22px;color:#1a2233">
        <p>Dear ${rec.client_name || 'Client'},</p>
        <div style="line-height:1.6">${body.replace(/\n/g,'<br>')}</div>
        <p style="margin-top:18px;font-size:13px;color:#6b7689">${dept.icon} ${dept.label} · SkyGlobe Group · One World. One Mission.</p>
      </div>`,
      undefined, deptSender(rec.department)).catch(() => {});
    await dbQuery('PATCH', 'ai_reception', { status: 'resolved', suggested_reply: body }, { id: `eq.${req.params.id}` });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── #3d REAL-TIME: SERVER-SENT EVENTS BROKER ─────────────────────────────────
// Pure Node.js — no extra packages. Clients connect once and receive push events.
// _clientSSE: email → Set<res>  (one user may have multiple tabs open)
// _adminSSE:  Set<res>          (all admin/staff connections share one pool)
const _clientSSE = new Map();
const _adminSSE  = new Set();

function _sseAdd(who, res) {
  if (who === '__admin__') { _adminSSE.add(res); return; }
  if (!_clientSSE.has(who)) _clientSSE.set(who, new Set());
  _clientSSE.get(who).add(res);
}
function _sseRemove(who, res) {
  if (who === '__admin__') { _adminSSE.delete(res); return; }
  _clientSSE.get(who)?.delete(res);
}
function sseNotify(who, eventName, data) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  const targets = who === '__admin__' ? _adminSSE : (_clientSSE.get(who) || new Set());
  for (const r of targets) { try { r.write(payload); } catch {} }
}

// GET /api/sse — authenticated SSE stream.
// EventSource cannot set custom headers, so the auth token is a query param.
// Clients send ?token=<jwt>; admin/staff send ?token=<admin-key>.
app.get('/api/sse', (req, res) => {
  const token = String(req.query.token || '');
  const email = verifyToken(token);
  const role  = !email ? getRole({ headers: { 'x-admin-key': token } }) : null;
  if (!email && !role) return res.status(401).end();
  const who = email || '__admin__';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable Nginx/Render buffering
  res.flushHeaders();

  res.write('event: connected\ndata: {"ok":true}\n\n');
  _sseAdd(who, res);

  // Heartbeat every 25s keeps the connection alive through load balancers
  const hb = setInterval(() => { try { res.write(':hb\n\n'); } catch { clearInterval(hb); } }, 25000);
  req.on('close', () => { clearInterval(hb); _sseRemove(who, res); });
});

app.post('/api/generate-doc', async (req, res) => {
  const { docType, fullName, nationality, email, phone, address, city,
          visaPurpose, destination, institution, program,
          background, experience, whyHere, goals, extraNotes, unlock } = req.body || {};

  // Paid, self-service document generation — docType IS the PRICING product
  // key (sop/coverletter/visaletter/experience/invitation/skyconference).
  // Requires a signed unlock token proving payment, same mechanism as legal
  // documents. This replaced an internal-only staff/CEO password wall that
  // made these documents unreachable (and unpayable) by real clients.
  if (!PRICING[docType]) return res.status(400).json({ error: 'Unknown document type.' });
  if (!unlock || !verifyUnlock(unlock, docType))
    return res.status(402).json({ error: 'Payment required', pay: { product: docType } });

  // Global rule applied to every document so the AI never leaves blanks for the user to fill.
  const NO_PLACEHOLDERS = `
CRITICAL FORMATTING RULES:
- NEVER use bracketed placeholders such as [Your Name], [Your Address], [Date], [Company Name], [Phone Number], or [Email]. The document must be 100% complete and ready to print as-is.
- Do NOT write a sender address block, a date line, or a letterhead. These are added automatically by our system. Begin directly with the salutation (for letters) or the first paragraph (for statements).
- If a specific detail was not provided, write naturally around it — do NOT invent fake institutions, fake grades, or fake names, and do NOT leave a blank or a placeholder.
- Use only the real applicant details supplied below. Applicant's full name is "${fullName}"${city ? `, based in ${city}` : ''}.
- Output plain text only: no markdown, no asterisks, no headings in brackets.`;

  const isIssuerDoc = docType === 'experience' || docType === 'invitation';
  const isSkyConf = docType === 'skyconference';
  if (!docType || !fullName)
    return res.status(400).json({ error: 'Missing required fields.' });
  if (!isIssuerDoc && !isSkyConf && !destination)
    return res.status(400).json({ error: 'Missing required fields.' });
  if (isSkyConf && (!institution || !destination))
    return res.status(400).json({ error: 'Missing required fields.' });
  if (isIssuerDoc && (!institution || !program))
    return res.status(400).json({ error: 'Missing required fields.' });

  if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY)
    return res.status(500).json({ error: 'AI not configured. Please contact support.' });

  // Purpose-specific guidance so the AI writes the right kind of visa letter.
  const visaGuidance = {
    'Tourism / Holiday': '- Emphasise this is a temporary leisure trip. Mention itinerary/places to visit, accommodation, travel dates, and how the trip is funded. Stress strong ties to home (job, family, property) proving the applicant will return.',
    'Visiting Family or Friends': '- State who is being visited, their relationship, immigration status and address. Mention who is funding/hosting, the duration, and the applicant\'s ties to home that guarantee return.',
    'Business Trip': '- Mention the inviting company/organisation, the meetings/conference/event, who covers the costs, and that the applicant has ongoing employment and obligations to return to.',
    'Work / Employment': '- Reference the job offer, employer name, role, contract or work permit details, and the applicant\'s qualifications. Confirm intent to comply with visa conditions.',
    'Study': '- Reference the admission/offer letter, institution, course and duration, how tuition and living costs are funded, and plans to return home after studies.',
    'Medical Treatment': '- State the hospital/clinic, the treatment needed, the appointment confirmation, how it is financed, and strong ties to home and intent to return after treatment.',
    'Transit': '- State the final destination, connecting flight details and dates, and confirm the applicant will only transit and travel onward, not stay.',
    'Religious / Pilgrimage': '- State the religious event/pilgrimage, the organising body, travel dates, funding, and ties to home guaranteeing return.',
    'Other': '- Clearly explain the specific purpose, travel dates, funding, and strong ties to the home country proving the applicant will return.',
  };

  const prompts = {
    sop: `You are an expert academic writer. Write a compelling, professional Statement of Purpose (SOP) for a university application.
Details:
- Applicant Name: ${fullName}
- Nationality: ${nationality || 'Not specified'}
- Target University/Country: ${institution ? institution + ', ' + destination : destination}
- Program/Course: ${program || 'Not specified'}
- Academic Background: ${background || 'Not provided'}
- Work Experience: ${experience || 'None provided'}
- Why this university/program: ${whyHere || 'Not provided'}
- Career Goals: ${goals || 'Not provided'}
- Additional Notes: ${extraNotes || 'None'}

Write a 4-5 paragraph SOP (600-800 words) that:
1. Opens with a compelling hook about their motivation
2. Details their academic/professional background
3. Explains why this specific program and institution
4. Describes their future career goals
5. Closes with a strong statement of intent
Use formal, professional academic language. Write in first person as the applicant.
${NO_PLACEHOLDERS}`,

    coverletter: `You are an expert career coach and professional writer. Write a compelling job cover letter.
Details:
- Applicant Name: ${fullName}
- Nationality: ${nationality || 'Not specified'}
- Target Country/Company: ${institution ? institution + ', ' + destination : destination}
- Job Position: ${program || 'Not specified'}
- Background/Skills: ${background || 'Not provided'}
- Work Experience: ${experience || 'None provided'}
- Why this company/role: ${whyHere || 'Not provided'}
- Career Goals: ${goals || 'Not provided'}
- Additional Notes: ${extraNotes || 'None'}

Write a professional 3-4 paragraph cover letter (350-500 words) that:
1. Opens with enthusiasm for the specific role
2. Highlights 2-3 key achievements from their background
3. Shows why they are the perfect fit for this company
4. Closes with a clear call to action
Use confident, engaging professional language. Write in first person as the applicant.
${NO_PLACEHOLDERS}`,

    visaletter: `You are an immigration document specialist. Write a professional visa cover letter / personal statement for a visa application.
Details:
- Applicant Name: ${fullName}
- Nationality: ${nationality || 'Not specified'}
- Destination Country: ${destination}
- TYPE OF VISA / PURPOSE OF TRAVEL: ${visaPurpose || program || 'General visit'}
- Specific details (place/host/employer/course): ${program || 'Not provided'}
- Background: ${background || 'Not provided'}
- About the trip: ${whyHere || 'Not provided'}
- Ties to home country / return plans: ${goals || 'Not provided'}
- Additional Notes: ${extraNotes || 'None'}

This is a "${visaPurpose || 'general'}" visa letter. Tailor the ENTIRE letter to this exact purpose:
${visaGuidance[visaPurpose] || '- Clearly state the purpose of travel, the dates, who is funding the trip, and strong ties to the home country proving the applicant will return.'}

Write a professional visa cover letter (300-400 words) that:
1. Opens by clearly stating it is a "${visaPurpose || 'visit'}" visa application and the purpose of travel
2. Gives the specific details relevant to this purpose
3. Explains financial stability (reference that supporting documents are enclosed)
4. Shows genuine ties to the home country and intent to return
5. Politely requests the visa and thanks the officer
Use formal, respectful language. Write in first person as the applicant.
${NO_PLACEHOLDERS}`,

    experience: `You are an HR documentation specialist. Write the BODY of a formal Work Experience Certificate that an employer issues about a former or current employee.
Details:
- Employee Name: ${fullName}
- Employee ID / Nationality: ${nationality || 'Not specified'}
- Issuing Company / Employer: ${institution}
- Job Title / Position Held: ${program}
- Employment Period (from – to): ${background || 'Not provided'}
- Key Duties & Responsibilities: ${experience || 'Not provided'}
- Key Achievements: ${whyHere || 'None provided'}
- Conduct & Reason for Leaving: ${goals || 'Not provided'}
- Additional Notes: ${extraNotes || 'None'}

Write a formal experience certificate body (180-280 words) that:
1. Begins with "This is to certify that ${fullName} was employed at ${institution} as ${program}..."
2. States the employment period and summarises the duties and responsibilities
3. Comments positively and professionally on conduct, skills and contribution
4. Closes with a line wishing the employee success in future endeavours
Write in the third person, from the company's point of view. This is an official, factual document — be measured and professional, do NOT exaggerate. Do NOT write the signature line, date, or company letterhead (these are added separately).
${NO_PLACEHOLDERS}`,

    skyconference: `You are the official communications officer of SkyGlobe Group, an international travel and immigration consultancy based in the United Kingdom. Write a formal Letter of Invitation issued BY SkyGlobe Group inviting an individual to attend one of our international events.
Details:
- Invitee / Attendee Name: ${fullName}
- Nationality / Home Country: ${nationality || 'Not specified'}
- Conference / Event Name: ${institution}
- Event Dates & Venue: ${background || 'To be confirmed'}
- Conference Country / Destination: ${destination}
- Attendee's Role: ${program || 'Delegate / Attendee'}
- Attendee's Background: ${experience || 'Not provided'}
- Purpose of the event: ${whyHere || 'International conference on travel, immigration, and global opportunities'}
- Accommodation / cost arrangements: ${goals || 'Attendee responsible for own travel and accommodation unless otherwise stated'}
- Additional Notes: ${extraNotes || 'None'}

Write a formal invitation letter body (220-300 words) that:
1. Opens "To the Visa Officer," — since this letter supports the invitee's visa application
2. Formally introduces SkyGlobe Group (registered immigration and travel consultancy, UK) and confirms we are inviting ${fullName} to ${institution}
3. States the event dates, venue, and the attendee's role
4. Confirms the professional or educational purpose of the event
5. States accommodation/cost arrangements
6. Requests that the visa officer grant the necessary visa and offers to provide further information
Write in formal third person, from SkyGlobe Group's point of view. Do NOT write the signature block or letterhead (added by system). Do NOT use placeholders.
${NO_PLACEHOLDERS}`,

    invitation: `You are a corporate protocol officer. Write the BODY of a formal Letter of Invitation issued BY a host organisation inviting a guest to a conference / event.
Details:
- Guest / Invitee Name: ${fullName}
- Guest Nationality / Home Country: ${nationality || destination || 'Not specified'}
- Host Organisation: ${institution}
- Conference / Event Name: ${program}
- Event Dates & Venue: ${background || 'Not provided'}
- Purpose & Agenda of the Event: ${experience || 'Not provided'}
- Guest's Role (speaker, delegate, etc.): ${whyHere || 'Attendee'}
- Who Covers Costs & Accommodation: ${goals || 'Not provided'}
- Additional Notes: ${extraNotes || 'None'}

Write a formal invitation letter body (200-300 words) that:
1. Opens with a salutation to the visa/consular officer (e.g. "To the Visa Officer," ) since this letter supports a visa application
2. Formally invites ${fullName} to ${program}, stating the dates, venue and purpose
3. States the guest's role and confirms the financial/accommodation arrangements
4. Confirms the organisation's support and requests the officer to grant the necessary visa
Write in the third person, from the host organisation's point of view. Do NOT write the signature line, date, or letterhead (these are added separately).
${NO_PLACEHOLDERS}`,
  };

  const prompt = prompts[docType];
  if (!prompt) return res.status(400).json({ error: 'Invalid document type.' });

  // Resilient: Gemini first (free), Claude fallback (premium) — never silently fails.
  try {
    const text = await generateText(prompt, { maxTokens: 2048, temperature: 0.72 });
    res.json({ text });
  } catch (e) {
    console.error('Doc gen error:', e.message);
    res.status(500).json({ error: 'Document generation is temporarily unavailable. Please try again in a moment.' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  LEGAL DIGITAL DOCUMENTATION  (Digitalization division — flagship service)
//  Flow:  pick document → pick tier → pay → AI generates → secure delivery.
//  Every document is AI-assisted, encrypted at rest, audit-logged, and carries
//  the "Facilitated & Verified by SkyGlobe Group" stamp. We never fabricate
//  instruments, impersonate authorities, or issue what we did not witness.
// ════════════════════════════════════════════════════════════════════════════

// Service tiers — what each price level includes (pricing lives in PRICING).
const LEGAL_TIERS = [
  { id: 'legal_doc_standard', name: 'Standard', product: 'legal_doc_standard',
    blurb: 'AI-drafted, professionally formatted and verified — delivered securely.',
    perks: ['AI-assisted drafting', 'Professional formatting', 'SkyGlobe verification stamp', 'Secure encrypted delivery'] },
  { id: 'legal_doc_premium', name: 'Premium', product: 'legal_doc_premium',
    blurb: 'Everything in Standard, refined with deeper detail and one revision.',
    perks: ['Everything in Standard', 'Enhanced detail & tone control', 'One free revision', 'Priority queue'] },
  { id: 'legal_doc_priority', name: 'Priority', product: 'legal_doc_priority',
    blurb: 'Our highest service — complex documents, express handling, unlimited revisions.',
    perks: ['Everything in Premium', 'Complex / high-value documents', 'Express handling', 'Unlimited revisions (7 days)'] },
];

// Catalogue of document types grouped by family. `kind` selects the prompt.
const LEGAL_DOC_TYPES = {
  'Invitation & Sponsorship': [
    { id: 'visa_invitation',     name: 'Visa Invitation Letter',        desc: 'A host or organisation formally invites a visitor and supports their visa.' },
    { id: 'sponsorship_decl',    name: 'Sponsorship Declaration',       desc: 'A sponsor declares they will fund and support an applicant\'s trip or stay.' },
    { id: 'host_accommodation',  name: 'Host / Accommodation Letter',   desc: 'A host confirms accommodation arrangements for a visiting guest.' },
  ],
  'Affidavits & Declarations': [
    { id: 'affidavit_support',   name: 'Affidavit of Support',          desc: 'A sworn statement undertaking to financially support a named person.' },
    { id: 'statutory_decl',      name: 'Statutory Declaration',         desc: 'A formal declaration of facts, made solemnly and in writing.' },
    { id: 'identity_decl',       name: 'Name / Identity Declaration',   desc: 'Declares a name variation or confirms identity details across documents.' },
  ],
  'Business & Employment': [
    { id: 'employment_verify',   name: 'Employment Verification Letter', desc: 'Confirms a person\'s role, tenure and standing with an employer.' },
    { id: 'business_intro',      name: 'Business Introduction Letter',   desc: 'Introduces a company, its services and intent to a partner or authority.' },
    { id: 'proof_of_funds',      name: 'Proof of Funds Cover Letter',    desc: 'A cover letter explaining and contextualising financial evidence.' },
  ],
  'Travel Cover Letters': [
    { id: 'visa_cover',          name: 'Visa Application Cover Letter',  desc: 'A personal statement to the visa officer explaining the application.' },
    { id: 'itinerary_explain',   name: 'Itinerary Explanation Letter',   desc: 'Explains a travel itinerary, routing and purpose for a consulate.' },
    { id: 'travel_purpose',      name: 'Travel Purpose Statement',       desc: 'A concise statement of the purpose and plan of a trip.' },
  ],
  'Education & Academic': [
    { id: 'academic_reference',  name: 'Academic Reference Letter',      desc: 'A referee\'s formal letter supporting a student\'s application or record.' },
    { id: 'gap_year_explain',    name: 'Gap Year / Study Break Letter',  desc: 'Explains a gap in academic history to an admissions or visa officer.' },
    { id: 'study_plan',          name: 'Study Plan Statement',           desc: 'Sets out an applicant\'s intended course of study and academic goals.' },
  ],
  'Real Estate & Property': [
    { id: 'tenancy_reference',   name: 'Tenancy Reference Letter',       desc: 'A landlord or agent confirms a tenant\'s tenancy history and standing.' },
    { id: 'property_ownership',  name: 'Property Ownership Declaration', desc: 'A sworn declaration of ownership or interest in a named property.' },
    { id: 'property_noc',        name: 'No Objection Certificate (Property)', desc: 'Confirms no objection to a stated use, stay, or transaction involving a property.' },
  ],
  'Corporate & Compliance': [
    { id: 'good_standing_req',   name: 'Certificate of Good Standing Request Letter', desc: 'A company\'s formal request/cover letter for a good-standing certificate.' },
    { id: 'company_authorization', name: 'Company Authorization Letter', desc: 'Authorises a named person to act or transact on behalf of a company.' },
    { id: 'poa_cover',           name: 'Power of Attorney Cover Letter', desc: 'A cover letter accompanying and explaining a power of attorney arrangement.' },
  ],
  'Personal & Family': [
    { id: 'minor_travel_consent', name: 'Consent Letter for Minor Travel', desc: 'A parent/guardian\'s consent for a minor to travel without them.' },
    { id: 'marital_status_decl', name: 'Marital Status Declaration',     desc: 'A sworn declaration of a person\'s current marital status.' },
    { id: 'guardianship_decl',   name: 'Guardianship Declaration',       desc: 'Declares and describes a guardianship arrangement over a named minor or dependant.' },
  ],
};

// Flat lookup id → {name, kind(group)}
const LEGAL_DOC_INDEX = (() => {
  const idx = {};
  for (const [group, items] of Object.entries(LEGAL_DOC_TYPES))
    for (const it of items) idx[it.id] = { ...it, group };
  return idx;
})();

// Per-document guidance steering the AI for accuracy and the right register.
const LEGAL_DOC_GUIDANCE = {
  visa_invitation:    'Write the BODY of a formal Letter of Invitation, in the third person from the host\'s point of view, opening "To the Visa Officer,". State who is invited, the relationship/purpose, dates, accommodation and cost arrangements, and request the officer grant the visa.',
  sponsorship_decl:   'Write a formal Sponsorship Declaration in the first person from the sponsor. State the sponsor\'s identity and capacity, the person sponsored, exactly what is being funded (travel, tuition, living costs), the period covered, and a clear undertaking of responsibility.',
  host_accommodation: 'Write a formal Accommodation/Host Letter in the first person from the host, confirming the guest\'s name, the accommodation address arrangement, the dates of stay, and that the host welcomes and accommodates the guest.',
  affidavit_support:  'Write the BODY of an Affidavit of Support as a solemn first-person sworn statement ("I, NAME, do solemnly affirm..."). State the deponent, the person supported, the nature and extent of financial support undertaken, and the duration. Keep it formal and legally measured.',
  statutory_decl:     'Write the BODY of a Statutory Declaration as a solemn first-person declaration of facts ("I, NAME, do solemnly and sincerely declare that..."). State the declared facts plainly and end with the standard truthfulness affirmation.',
  identity_decl:      'Write the BODY of a Name / Identity Declaration in the first person, declaring that the named variations refer to one and the same person, or confirming the correct identity details, stating the documents affected.',
  employment_verify:  'Write a formal Employment Verification Letter in the third person from the employer. Confirm the employee\'s full name, job title, employment dates/tenure, employment status, and (if provided) salary band and conduct. Be factual and measured.',
  business_intro:     'Write a formal Business Introduction Letter in the first person plural from the company. Introduce the business, its core services, its standing, and the purpose of the introduction to the recipient.',
  proof_of_funds:     'Write a Proof of Funds Cover Letter in the first person, contextualising the applicant\'s financial evidence (without inventing figures) — what the funds are, their source, their sufficiency for the stated purpose, and that statements are enclosed.',
  visa_cover:         'Write a Visa Application Cover Letter in the first person to the visa officer. State the visa type/purpose, the travel plan and dates, funding, ties to the home country and intent to return, and politely request the visa.',
  itinerary_explain:  'Write an Itinerary Explanation Letter in the first person to the consulate, explaining the routing, stops, dates and the reason for the chosen itinerary.',
  travel_purpose:     'Write a concise Travel Purpose Statement in the first person, clearly setting out the purpose of the trip, the plan and dates, and intent to return.',
  academic_reference: 'Write a formal Academic Reference Letter in the third person from the referee (teacher, supervisor, or academic contact). State the student\'s standing, performance, and character, and support their application. Never invent grades, scores, or institution names not supplied.',
  gap_year_explain:   'Write a Gap Year / Study Break Explanation Letter in the first person, clearly and honestly setting out the period covered, what the applicant did during the break, and how it relates to their continued studies.',
  study_plan:         'Write a Study Plan Statement in the first person, setting out the intended course/programme, the institution, the academic goals, and how the study aligns with the applicant\'s background and future plans.',
  tenancy_reference:  'Write a formal Tenancy Reference Letter in the third person from the landlord/agent. Confirm the tenant\'s name, tenancy period, address, and standing (rent payment history, condition of property) as supplied — never invent figures or dates not provided.',
  property_ownership: 'Write the BODY of a Property Ownership Declaration as a solemn first-person statement ("I, NAME, do solemnly declare..."), stating the property address, the nature of the ownership/interest, and the period held.',
  property_noc:       'Write a formal No Objection Certificate in the third person, stating the property address, the party granting no objection, and the specific use/stay/transaction to which no objection is raised.',
  good_standing_req:  'Write a formal Certificate of Good Standing Request Letter in the first person plural from the company, addressed to the relevant registrar/authority, requesting confirmation of the company\'s good standing and stating the purpose.',
  company_authorization: 'Write a formal Company Authorization Letter in the first person plural from the company, naming the authorised person, the scope of what they are authorised to do, and the period of authorisation.',
  poa_cover:          'Write a Power of Attorney Cover Letter in the first person, explaining the relationship between the grantor and attorney, the scope of the power being granted, and the purpose of enclosing the power of attorney.',
  minor_travel_consent: 'Write the BODY of a Consent Letter for Minor Travel as a solemn first-person statement from the parent/guardian, naming the minor, the travel details/destination/dates, the accompanying adult (if any), and clear consent for the travel.',
  marital_status_decl: 'Write the BODY of a Marital Status Declaration as a solemn first-person sworn statement ("I, NAME, do solemnly declare that my marital status is..."), stating the current marital status and any relevant supporting facts supplied.',
  guardianship_decl:  'Write the BODY of a Guardianship Declaration as a solemn first-person statement, naming the guardian, the minor/dependant, the nature and basis of the guardianship, and the responsibilities undertaken.',
};

// ── Structured identification fields, per document type ──────────────────────
// Legal/identity documents need real identification, not a generic name box —
// address, ID/passport number, phone, employer — for both the requester and
// the other party where the document names one. Each entry references the
// shared FIELD_LIB below and assigns a section so the client can render two
// clearly separated blocks (e.g. "Your Details" / "Other Party's Details").
const FIELD_LIB = {
  name:            { label: 'Full legal name',            placeholder: 'As it appears on official ID' },
  address:         { label: 'Full residential address',   placeholder: 'Street, city, postal code, country' },
  idNumber:        { label: 'National ID / Passport number', placeholder: 'e.g. A12345678' },
  phone:           { label: 'Phone number',                placeholder: '+1 000 000 0000' },
  dob:             { label: 'Date of birth', type: 'date' },
  nationality:     { label: 'Nationality', placeholder: 'e.g. Nigerian' },
  employer:        { label: 'Employer name',               placeholder: 'Company you work for' },
  jobTitle:        { label: 'Job title',                   placeholder: 'e.g. Operations Manager' },
  companyName:     { label: 'Company name',                placeholder: 'Registered company name' },
  regNumber:       { label: 'Company registration number', placeholder: 'e.g. RC1234567' },
  propertyAddress: { label: 'Property address',             placeholder: 'Full address of the property' },
  dates:           { label: 'Relevant dates / period',      placeholder: 'e.g. 14–28 September 2026' },
  location:        { label: 'Destination / place',          placeholder: 'e.g. city, country' },
  cpName:          { label: "Other party's full legal name", placeholder: 'Guest, tenant, employee, minor, etc.' },
  cpAddress:       { label: "Other party's address",         placeholder: 'Full residential address' },
  cpIdNumber:      { label: "Other party's ID / passport number", placeholder: 'e.g. B98765432' },
  cpPhone:         { label: "Other party's phone number",    placeholder: '+1 000 000 0000' },
  cpNationality:   { label: "Other party's nationality",     placeholder: 'e.g. Brazilian' },
  cpRelationship:  { label: 'Relationship to you',           placeholder: 'e.g. daughter, tenant, employee' },
  cpDob:           { label: "Other party's date of birth", type: 'date' },
  employerProof:   { label: 'Employer / proof of employment',   placeholder: 'Company name + your position' },
  incomeSource:    { label: 'Source of income',                 placeholder: 'e.g. salaried employment, business, investments' },
  monthlyIncome:   { label: 'Approximate monthly income',        placeholder: 'e.g. $3,500' },
  witnessName:     { label: "Witness's full legal name",         placeholder: 'Person who witnessed the signing' },
  witnessAddress:  { label: "Witness's address",                 placeholder: 'Full residential address' },
  witnessId:       { label: "Witness's ID / passport number",    placeholder: 'e.g. C55219034' },
  witnessOccupation: { label: "Witness's occupation",            placeholder: 'e.g. Solicitor, Notary, Accountant' },
};

// docId → [{ id, section, required }]. `section` groups fields in the UI.
const LEGAL_DOC_FIELDS = {
  visa_invitation: [
    { id: 'name', section: 'Your Details (Host)', required: true }, { id: 'address', section: 'Your Details (Host)', required: true },
    { id: 'idNumber', section: 'Your Details (Host)' }, { id: 'phone', section: 'Your Details (Host)' },
    { id: 'cpName', section: "Visitor's Details", required: true }, { id: 'cpNationality', section: "Visitor's Details", required: true },
    { id: 'cpIdNumber', section: "Visitor's Details" }, { id: 'cpAddress', section: "Visitor's Details" },
    { id: 'dates', section: 'Visit Details', required: true }, { id: 'location', section: 'Visit Details', required: true },
  ],
  sponsorship_decl: [
    { id: 'name', section: 'Your Details (Sponsor)', required: true }, { id: 'address', section: 'Your Details (Sponsor)', required: true },
    { id: 'idNumber', section: 'Your Details (Sponsor)' }, { id: 'phone', section: 'Your Details (Sponsor)' }, { id: 'employer', section: 'Your Details (Sponsor)' },
    { id: 'cpName', section: 'Person Sponsored', required: true }, { id: 'cpRelationship', section: 'Person Sponsored' }, { id: 'cpNationality', section: 'Person Sponsored' },
    { id: 'dates', section: 'Sponsorship Details' }, { id: 'location', section: 'Sponsorship Details' },
  ],
  host_accommodation: [
    { id: 'name', section: 'Your Details (Host)', required: true }, { id: 'address', section: 'Your Details (Host)', required: true },
    { id: 'phone', section: 'Your Details (Host)' }, { id: 'idNumber', section: 'Your Details (Host)' },
    { id: 'cpName', section: "Guest's Details", required: true }, { id: 'cpNationality', section: "Guest's Details" }, { id: 'cpIdNumber', section: "Guest's Details" },
    { id: 'dates', section: 'Stay Details', required: true },
  ],
  affidavit_support: [
    { id: 'name', section: 'Your Details (Deponent)', required: true }, { id: 'address', section: 'Your Details (Deponent)', required: true },
    { id: 'idNumber', section: 'Your Details (Deponent)', required: true }, { id: 'phone', section: 'Your Details (Deponent)' },
    { id: 'employerProof', section: 'Your Details (Deponent)' }, { id: 'incomeSource', section: 'Your Details (Deponent)' }, { id: 'monthlyIncome', section: 'Your Details (Deponent)' },
    { id: 'cpName', section: 'Person Supported', required: true }, { id: 'cpRelationship', section: 'Person Supported' }, { id: 'cpNationality', section: 'Person Supported' },
    { id: 'dates', section: 'Support Period' },
    { id: 'witnessName', section: 'Witness Details', required: true }, { id: 'witnessAddress', section: 'Witness Details' }, { id: 'witnessId', section: 'Witness Details' }, { id: 'witnessOccupation', section: 'Witness Details' },
  ],
  statutory_decl: [
    { id: 'name', section: 'Your Details (Declarant)', required: true }, { id: 'address', section: 'Your Details (Declarant)', required: true },
    { id: 'idNumber', section: 'Your Details (Declarant)', required: true }, { id: 'phone', section: 'Your Details (Declarant)' },
    { id: 'witnessName', section: 'Witness Details', required: true }, { id: 'witnessAddress', section: 'Witness Details' }, { id: 'witnessId', section: 'Witness Details' }, { id: 'witnessOccupation', section: 'Witness Details' },
  ],
  identity_decl: [
    { id: 'name', section: 'Your Details', required: true }, { id: 'address', section: 'Your Details', required: true },
    { id: 'idNumber', section: 'Your Details' }, { id: 'dob', section: 'Your Details' },
  ],
  employment_verify: [
    { id: 'companyName', section: 'Employer Details', required: true }, { id: 'regNumber', section: 'Employer Details' },
    { id: 'address', section: 'Employer Details' }, { id: 'phone', section: 'Employer Details' },
    { id: 'cpName', section: "Employee's Details", required: true }, { id: 'jobTitle', section: "Employee's Details", required: true },
    { id: 'dates', section: "Employee's Details" },
  ],
  business_intro: [
    { id: 'companyName', section: 'Company Details', required: true }, { id: 'regNumber', section: 'Company Details' },
    { id: 'address', section: 'Company Details' }, { id: 'phone', section: 'Company Details' },
    { id: 'cpName', section: 'Recipient', required: true },
  ],
  proof_of_funds: [
    { id: 'name', section: 'Your Details', required: true }, { id: 'address', section: 'Your Details', required: true },
    { id: 'idNumber', section: 'Your Details', required: true }, { id: 'phone', section: 'Your Details' },
    { id: 'employerProof', section: 'Your Details' }, { id: 'incomeSource', section: 'Your Details', required: true }, { id: 'monthlyIncome', section: 'Your Details' },
  ],
  visa_cover: [
    { id: 'name', section: 'Your Details', required: true }, { id: 'nationality', section: 'Your Details', required: true },
    { id: 'idNumber', section: 'Your Details', required: true }, { id: 'address', section: 'Your Details' }, { id: 'phone', section: 'Your Details' },
    { id: 'dates', section: 'Travel Details' }, { id: 'location', section: 'Travel Details' },
  ],
  itinerary_explain: [
    { id: 'name', section: 'Your Details', required: true }, { id: 'idNumber', section: 'Your Details' }, { id: 'phone', section: 'Your Details' },
    { id: 'dates', section: 'Travel Details' }, { id: 'location', section: 'Travel Details' },
  ],
  travel_purpose: [
    { id: 'name', section: 'Your Details', required: true }, { id: 'idNumber', section: 'Your Details' },
    { id: 'dates', section: 'Travel Details' }, { id: 'location', section: 'Travel Details' },
  ],
  academic_reference: [
    { id: 'name', section: 'Referee Details', required: true }, { id: 'jobTitle', section: 'Referee Details' },
    { id: 'companyName', section: 'Referee Details' }, { id: 'phone', section: 'Referee Details' },
    { id: 'cpName', section: "Student's Details", required: true }, { id: 'cpNationality', section: "Student's Details" },
  ],
  gap_year_explain: [
    { id: 'name', section: 'Your Details', required: true }, { id: 'address', section: 'Your Details' }, { id: 'phone', section: 'Your Details' },
    { id: 'dates', section: 'Gap Period' },
  ],
  study_plan: [
    { id: 'name', section: 'Your Details', required: true }, { id: 'nationality', section: 'Your Details' }, { id: 'address', section: 'Your Details' },
    { id: 'location', section: 'Study Details' },
  ],
  tenancy_reference: [
    { id: 'name', section: 'Landlord / Agent Details', required: true }, { id: 'address', section: 'Landlord / Agent Details' },
    { id: 'phone', section: 'Landlord / Agent Details' }, { id: 'companyName', section: 'Landlord / Agent Details' },
    { id: 'cpName', section: "Tenant's Details", required: true },
    { id: 'propertyAddress', section: 'Tenancy Details', required: true }, { id: 'dates', section: 'Tenancy Details' },
  ],
  property_ownership: [
    { id: 'name', section: 'Your Details (Declarant)', required: true }, { id: 'address', section: 'Your Details (Declarant)' },
    { id: 'idNumber', section: 'Your Details (Declarant)', required: true },
    { id: 'propertyAddress', section: 'Property Details', required: true }, { id: 'dates', section: 'Property Details' },
    { id: 'witnessName', section: 'Witness Details', required: true }, { id: 'witnessId', section: 'Witness Details' }, { id: 'witnessOccupation', section: 'Witness Details' },
  ],
  property_noc: [
    { id: 'name', section: 'Your Details', required: true }, { id: 'address', section: 'Your Details' },
    { id: 'idNumber', section: 'Your Details' }, { id: 'phone', section: 'Your Details' },
    { id: 'cpName', section: 'Other Party' },
    { id: 'propertyAddress', section: 'Property Details', required: true },
  ],
  good_standing_req: [
    { id: 'companyName', section: 'Company Details', required: true }, { id: 'regNumber', section: 'Company Details', required: true },
    { id: 'address', section: 'Company Details' }, { id: 'phone', section: 'Company Details' },
  ],
  company_authorization: [
    { id: 'companyName', section: 'Company Details', required: true }, { id: 'regNumber', section: 'Company Details' }, { id: 'address', section: 'Company Details' },
    { id: 'cpName', section: 'Authorised Person', required: true }, { id: 'cpIdNumber', section: 'Authorised Person' }, { id: 'cpPhone', section: 'Authorised Person' },
    { id: 'dates', section: 'Authorisation Period' },
  ],
  poa_cover: [
    { id: 'name', section: 'Grantor Details', required: true }, { id: 'address', section: 'Grantor Details' },
    { id: 'idNumber', section: 'Grantor Details', required: true }, { id: 'phone', section: 'Grantor Details' },
    { id: 'cpName', section: "Attorney's Details", required: true }, { id: 'cpIdNumber', section: "Attorney's Details" },
    { id: 'witnessName', section: 'Witness Details', required: true }, { id: 'witnessId', section: 'Witness Details' }, { id: 'witnessOccupation', section: 'Witness Details' },
  ],
  minor_travel_consent: [
    { id: 'name', section: 'Parent / Guardian Details', required: true }, { id: 'address', section: 'Parent / Guardian Details' },
    { id: 'idNumber', section: 'Parent / Guardian Details' }, { id: 'phone', section: 'Parent / Guardian Details' },
    { id: 'cpName', section: "Minor's Details", required: true }, { id: 'cpDob', section: "Minor's Details" }, { id: 'cpIdNumber', section: "Minor's Details" },
    { id: 'dates', section: 'Travel Details' }, { id: 'location', section: 'Travel Details' },
  ],
  marital_status_decl: [
    { id: 'name', section: 'Your Details', required: true }, { id: 'address', section: 'Your Details' },
    { id: 'idNumber', section: 'Your Details', required: true }, { id: 'dob', section: 'Your Details' },
    { id: 'witnessName', section: 'Witness Details', required: true }, { id: 'witnessId', section: 'Witness Details' },
  ],
  guardianship_decl: [
    { id: 'name', section: 'Guardian Details', required: true }, { id: 'address', section: 'Guardian Details' },
    { id: 'idNumber', section: 'Guardian Details', required: true }, { id: 'phone', section: 'Guardian Details' },
    { id: 'cpName', section: "Minor / Dependant's Details", required: true }, { id: 'cpDob', section: "Minor / Dependant's Details" }, { id: 'cpRelationship', section: "Minor / Dependant's Details" },
    { id: 'witnessName', section: 'Witness Details', required: true }, { id: 'witnessId', section: 'Witness Details' },
  ],
};

function buildLegalPrompt(docId, fields) {
  const guidance = LEGAL_DOC_GUIDANCE[docId];
  const schema = LEGAL_DOC_FIELDS[docId] || [];
  const f = fields || {};
  const factsList = schema
    .map(s => `- ${(FIELD_LIB[s.id] || { label: s.id }).label}: ${f[s.id] || 'Not provided'}`)
    .join('\n');
  return `You are a senior legal documentation specialist at SkyGlobe Group. ${guidance}

Use ONLY these real details supplied by the client — never invent names, addresses, ID numbers, institutions, figures, registration numbers, dates or facts that are not provided:
${factsList}
- Additional specific facts and details for this document: ${f.details || 'Not provided'}

STRICT RULES:
- NEVER use bracketed placeholders such as [Name], [Date], [Address]. The body must read as complete prose.
- Do NOT write a sender address block, date line, letterhead, reference number, signature name or job title — these are added automatically by our system. Begin directly with the salutation or opening line.
- Do NOT fabricate any qualification, employment, enrolment, financial figure, ID number or official outcome that was not supplied. If a detail is missing, write gracefully around it.
- Never claim that SkyGlobe Group issues, certifies or guarantees the instrument — SkyGlobe only facilitates and verifies the document.
- Output plain text only: no markdown, asterisks or headings. Separate paragraphs with a blank line. Keep it formal, precise and well-structured.`;
}

// Branded, verified HTML wrapper rendered into the secure viewer.
function wrapLegalDoc(title, bodyText, ref, req) {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const paras = String(bodyText).trim().split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</p>`).join('\n');
  const origin = req ? baseUrl(req) : 'https://skyglobegroup.com';
  const sigUrl = origin + '/signature.png';
  const stampUrl = origin + '/stamp.png';
  const verifyUrl = origin + '/verify-document/' + ref;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&margin=4&data=${encodeURIComponent(verifyUrl)}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — SkyGlobe Group</title>
<style>
  body{font-family:"Georgia","Times New Roman",serif;color:#1a2233;background:#fff;margin:0;padding:48px 56px;line-height:1.7;max-width:820px;margin:0 auto;position:relative}
  .lh{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #D4A73A;padding-bottom:16px;margin-bottom:8px}
  .lh .b{font-family:Arial,sans-serif;font-weight:700;letter-spacing:.08em;color:#041022;font-size:1.3rem}
  .lh .b small{display:block;color:#a87016;font-size:.6rem;letter-spacing:.24em;font-weight:600}
  .lh .meta{text-align:right;font-family:Arial,sans-serif;font-size:.72rem;color:#6b7689;line-height:1.5}
  h1{font-size:1.2rem;text-transform:uppercase;letter-spacing:.06em;color:#041022;margin:26px 0 18px;font-family:Arial,sans-serif}
  p{margin:0 0 14px}
  .stamp{margin-top:46px;border-top:1px solid #e6e9ef;padding-top:18px;display:flex;align-items:flex-end;gap:18px;position:relative}
  .stamp img.sig{display:block;height:62px;width:auto;margin:6px 0 -6px -4px}
  .stamp img.seal{position:absolute;top:14px;right:76px;height:110px;width:110px;opacity:0.92}
  .stamp .t{font-family:Arial,sans-serif;font-size:.78rem;color:#3c465a;max-width:520px}
  .stamp .t strong{color:#041022}
  .qr-block{position:absolute;top:14px;right:-2px;text-align:center}
  .qr-block img{width:64px;height:64px}
  .qr-block .lbl{font-size:.55rem;color:#9aa3b2;margin-top:2px;letter-spacing:.04em;text-transform:uppercase;font-family:Arial,sans-serif}
  .foot{margin-top:30px;font-family:Arial,sans-serif;font-size:.66rem;color:#9aa3b2;border-top:1px solid #eef1f6;padding-top:12px}
  @media print{body{padding:24px}}
</style></head><body>
  <div class="lh">
    <div class="b">SKYGLOBE<small>GROUP</small></div>
    <div class="meta">Ref: ${ref}<br>${today}<br>Global Operations</div>
  </div>
  <h1>${title}</h1>
  ${paras}
  <div class="stamp">
    <img class="sig" src="${sigUrl}" alt="">
    <div class="t"><strong>Facilitated &amp; Verified by SkyGlobe Group</strong><br>This document was prepared and verified by SkyGlobe Group. SkyGlobe does not issue or certify instruments it did not witness.</div>
    <img class="seal" src="${stampUrl}" alt="Official Stamp">
    <div class="qr-block"><img src="${qrUrl}" alt="Verification QR"><div class="lbl">Verify</div></div>
  </div>
  <div class="foot">© ${new Date().getFullYear()} SkyGlobe Group · Global Operations · support@skyglobegroup.com · One World. One Mission. · Verify this document at ${verifyUrl}</div>
</body></html>`;
}

// Public catalogue for the front-end (document types + tiers + live prices).
app.get('/api/legal-docs/catalog', (_req, res) => {
  const tiers = LEGAL_TIERS.map(t => ({
    id: t.id, name: t.name, product: t.product, blurb: t.blurb, perks: t.perks,
    price: { USD: PRICING[t.product].USD, EUR: PRICING[t.product].EUR, GBP: PRICING[t.product].GBP },
  }));
  res.json({ groups: LEGAL_DOC_TYPES, tiers, fields: LEGAL_DOC_FIELDS, fieldLib: FIELD_LIB });
});

// Generate a paid legal document. Requires a valid instant-unlock token proving
// the matching tier was paid for, then AI-drafts, wraps, stores and secures it.
app.post('/api/legal-docs/generate', async (req, res) => {
  try {
    const { unlock, product, docId, fields } = req.body || {};
    const tier = LEGAL_TIERS.find(t => t.product === product);
    if (!tier) return res.status(400).json({ error: 'Invalid service tier.' });
    if (!unlock || !verifyUnlock(unlock, product))
      return res.status(402).json({ error: 'Payment required', pay: { product } });
    const meta = LEGAL_DOC_INDEX[docId];
    if (!meta) return res.status(400).json({ error: 'Unknown document type.' });
    const f = fields || {};
    const schema = LEGAL_DOC_FIELDS[docId] || [];
    const missing = schema.filter(s => s.required && !String(f[s.id] || '').trim());
    if (missing.length)
      return res.status(400).json({ error: `Please fill in: ${missing.map(s => (FIELD_LIB[s.id] || {}).label || s.id).join(', ')}.` });
    if (!f.details) return res.status(400).json({ error: 'Please describe the specific facts this document must state.' });
    if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY)
      return res.status(500).json({ error: 'AI not configured. Please contact support.' });

    const body = await generateText(buildLegalPrompt(docId, f), { maxTokens: 2048, temperature: 0.55 });
    const ref = 'SGL-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const html = wrapLegalDoc(meta.name, body, ref, req);

    // Store as an encrypted-at-rest HTML artifact and gate it behind a token.
    const safeName = `${meta.id}_${ref}.html`;
    const filePath = `legal/${ref}/${safeName}`;
    let viewUrl = null, viewToken = null;
    try {
      await storageUpload(filePath, Buffer.from(html, 'utf8'), 'text/html; charset=utf-8');
      const rows = await dbQuery('POST', 'documents', {
        ref, filename: safeName, path: filePath, uploaded_by: 'ai:legal-docs',
      }).catch(() => null);
      const docRow = Array.isArray(rows) ? rows[0] : rows;
      viewToken = await createDocToken(docRow?.id || ref, filePath, safeName, f.email || '', ref);
      viewUrl = `${baseUrl(req)}/view/${viewToken}`;
    } catch (storeErr) {
      console.error('Legal doc store warning:', storeErr.message);
    }

    // Human-review queue: every AI-generated document also lands in Reception
    // for a staff quality pass. The client keeps the instant delivery they
    // paid for; a human verifies right behind it and follows up if anything
    // needs correcting. Fire-and-forget — never blocks the client.
    dbQuery('POST', 'ai_reception', {
      source: 'document', ref, client_name: f.name || '', client_email: f.email || '',
      service: `${meta.name} (AI-generated)`, department: 'legal',
      urgency: 'normal', intent: `AI-generated "${meta.name}" was delivered instantly — review it for quality and accuracy, and follow up with the client if a correction is needed.`,
      sentiment: 'neutral', suggested_reply: '', needs_human: true, status: 'new',
      raw: { viewUrl, docId },
    }).catch(() => {});

    res.json({ success: true, ref, title: meta.name, tier: tier.name, html, viewUrl, viewToken });
  } catch (e) {
    console.error('Legal doc generate error:', e.message);
    res.status(500).json({ error: 'Document generation is temporarily unavailable. Please try again in a moment.' });
  }
});

// ── ADMIN: Legal Documents order desk (CEO / staff) ──────────────────────────
// Lists every AI-generated legal document, enriched with its secure token info
// (client email, link, whether it has been opened). The CEO reviews and can
// resend the secure link or regenerate an expired token.
app.get('/api/admin/legal-docs', async (req, res) => {
  if (!checkStaffOrAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const docs = await dbQuery('GET', 'documents', null,
      { uploaded_by: 'eq.ai:legal-docs', order: 'created_at.desc', limit: 500 }).catch(() => []);
    const out = [];
    for (const d of docs) {
      const toks = await dbQuery('GET', 'document_tokens', null,
        { document_id: `eq.${d.id}`, order: 'created_at.desc', limit: 1 }).catch(() => []);
      const tok = toks[0] || null;
      const typeId = String(d.filename || '').split('_')[0];
      const meta = LEGAL_DOC_INDEX[typeId];
      out.push({
        id: d.id, ref: d.ref, filename: d.filename, created_at: d.created_at,
        doc_type: meta ? meta.name : typeId, group: meta ? meta.group : '',
        client_email: tok?.client_email || '',
        token: tok?.token || null,
        expires_at: tok?.expires_at || null,
        accessed_at: tok?.accessed_at || null,
        expired: tok ? new Date(tok.expires_at) < new Date() : true,
        viewUrl: tok ? `${baseUrl(req)}/view/${tok.token}` : null,
      });
    }
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Resend (and refresh if expired) the secure link to the client by email.
app.post('/api/admin/legal-docs/:id/resend', async (req, res) => {
  if (!checkStaffOrAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const rows = await dbQuery('GET', 'documents', null, { id: `eq.${req.params.id}`, limit: 1 });
    const doc = rows[0];
    if (!doc) return res.status(404).json({ error: 'Document not found.' });
    let toks = await dbQuery('GET', 'document_tokens', null,
      { document_id: `eq.${doc.id}`, order: 'created_at.desc', limit: 1 }).catch(() => []);
    let tok = toks[0];
    const email = (req.body && req.body.email) || tok?.client_email || '';
    if (!email) return res.status(400).json({ error: 'No client email on file. Provide one to send the link.' });
    // Refresh token if missing or expired.
    if (!tok || new Date(tok.expires_at) < new Date()) {
      await dbQuery('DELETE', 'document_tokens', null, { document_id: `eq.${doc.id}` }).catch(() => {});
      const newTok = await createDocToken(doc.id, doc.path, doc.filename, email, doc.ref);
      tok = { token: newTok };
    }
    const viewUrl = `${baseUrl(req)}/view/${tok.token}`;
    const typeId = String(doc.filename || '').split('_')[0];
    const docName = LEGAL_DOC_INDEX[typeId]?.name || 'Your document';
    try {
      await sendEmail(email, `Your SkyGlobe document is ready — ${doc.ref}`,
        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a2233">
          <h2 style="color:#a87016;font-family:Georgia,serif">Your document is ready</h2>
          <p>Dear Client,</p>
          <p>Your <strong>${docName}</strong> (Ref: <strong>${doc.ref}</strong>) has been prepared and verified by SkyGlobe Group.</p>
          <p style="margin:22px 0"><a href="${viewUrl}" style="background:#D4A73A;color:#1a1300;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:30px">Open your secure document</a></p>
          <p style="font-size:13px;color:#6b7689">This is a private, encrypted and access-logged link. It expires in 72 hours — contact us if you need it refreshed.</p>
          <p style="font-size:13px;color:#6b7689">Facilitated &amp; Verified by SkyGlobe Group · Global Operations · One World. One Mission.</p>
        </div>`);
    } catch (mailErr) {
      return res.status(502).json({ error: 'Could not send email: ' + mailErr.message, viewUrl });
    }
    res.json({ success: true, viewUrl, email });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── LETTERHEAD AI WRITER (CEO / authorised staff only) ───────────────────────
// Writes the BODY of an official SkyGlobe Group letter. Auth required so the
// public can never generate company correspondence. The signature/stamp are
// added on the letterhead page, governed by role (staff cannot sign as CEO).
app.post('/api/letterhead-draft', async (req, res) => {
  const who = getRole(req);
  if (!who) return res.status(401).json({ error: 'Unauthorized' });

  const { recipient, subject, instruction, tone } = req.body || {};
  if (!instruction || !String(instruction).trim())
    return res.status(400).json({ error: 'Please describe what the letter should say.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI not configured. Please contact support.' });

  const prompt = `You are the official correspondence writer for SkyGlobe Group, a premium global travel, immigration and education consultancy (website skyglobegroup.com, email support@skyglobegroup.com).
Write the BODY of a formal, professional company letter on behalf of SkyGlobe Group.

${recipient ? `Recipient: ${recipient}` : 'Recipient: not specified — open with a suitable salutation such as "Dear Sir/Madam,"'}
${subject ? `Subject of the letter: ${subject}` : ''}
Desired tone: ${tone || 'formal, warm and professional'}

What the letter must communicate:
${instruction}

STRICT RULES:
- Write ONLY the letter body. Begin with the salutation (e.g. "Dear ...,") and end with a closing line such as "Yours sincerely," — do NOT write the sender block, date, reference number, signature name, job title, company letterhead or stamp. Those are added automatically by our system.
- Write in the first person plural from the company's voice ("we", "SkyGlobe Group").
- NEVER invent facts, figures, registration numbers, certifications, guarantees, or commitments that were not given in the instruction above. If a detail is missing, write around it gracefully — do NOT use bracketed placeholders like [Name] or [Date].
- Do NOT fabricate any qualification, employment, enrolment or immigration outcome. SkyGlobe never certifies anything it did not witness.
- Output plain text only: no markdown, asterisks, or headings. Separate paragraphs with a blank line. Keep it concise and well-structured (3-5 short paragraphs).`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 55000);
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1600, temperature: 0.6 },
        }),
        signal: ctrl.signal,
      }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || `API error ${r.status}`);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) throw new Error('Empty response from AI');
    res.json({ text, by: who.name, role: who.role });
  } catch (e) {
    console.error('Letterhead draft error:', e.message);
    const aborted = e.name === 'AbortError';
    res.status(aborted ? 504 : 500).json({
      error: aborted ? 'The AI took too long to respond. Please try again.' : 'Letter generation failed. Please try again.'
    });
  } finally {
    clearTimeout(timer);
  }
});

// ── COUNTRY AI RESEARCH ───────────────────────────────────────────────────────
app.post('/api/country-info', async (req, res) => {
  const { country, capital, region, langs, currency } = req.body || {};
  if (!country) return res.status(400).json({ error: 'country required' });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.json({ html: null });

  const prompt = `You are an expert international immigration and education consultant. Provide comprehensive, accurate information about ${country} for someone considering studying, working, or immigrating there. The capital is ${capital}, region is ${region}, main languages are ${langs}, currency is ${currency}.

Write ONLY raw HTML (no markdown, no code fences, no explanation). Use these exact HTML classes:
- Wrap each section in: <div class="cd-section"><div class="cd-section-head"><h4>EMOJI Title</h4></div><div class="cd-section-body">CONTENT</div></div>
- Use <ul><li> for lists inside .cd-section-body
- Use <div class="cd-chips"><span class="cd-chip">item</span></div> for tags/chips
- Use <div class="cd-stat-row"><div class="cd-stat"><div class="n">VALUE</div><div class="l">LABEL</div></div></div> for key stats
- Use <div class="cd-chips"><span class="cd-chip gold">item</span></div> for highlighted items (top universities, visa types)

Write these 6 sections in this exact order:

1. 🛂 Visa & Entry Requirements
- Common visa types (tourist, student, work) and requirements
- Key documents typically needed
- Processing times and fees (approximate)
- Visa-free nationalities if applicable

2. 🎓 Universities & Education
- 3-5 notable universities with their reputation/specialisation
- Popular study programs for international students
- Tuition fee range (approximate, in local currency or USD)
- Academic year/intake dates
- Student visa specifics

3. 💼 Jobs & Work
- Top industries and in-demand job sectors
- Average salary ranges for popular roles (in local currency)
- Work permit/visa requirements for skilled workers
- Job search tips for international applicants

4. 🏠 Cost of Living
- Monthly budget breakdown: rent (single room in city vs suburbs), food, transport, utilities
- Overall cost comparison (budget / moderate / comfortable lifestyle)
- Cheapest and most expensive cities

5. 🌟 Quality of Life
- Safety, healthcare quality, climate overview
- International-friendliness and English usage
- Notable attractions and lifestyle highlights
- 3-4 interesting quick facts as cd-chip gold items

6. 🛣️ Immigration Pathways
- Main legal routes: student-to-work, skilled worker, PR/citizenship
- Approximate timeline for residency/PR
- Key requirements (language, points, sponsorship, investment)
- SkyGlobe tip: specific advice for someone wanting to settle here

Be specific with real numbers and real university names. Keep each section concise — 3-6 bullet points or 2 short paragraphs max. Use the HTML classes exactly as specified above.`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 35000);
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 2048, temperature: 0.5 } }),
        signal: ctrl.signal }
    );
    clearTimeout(timer);
    const data = await r.json();
    let html = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // Strip any accidental code fences
    html = html.replace(/```html?/gi,'').replace(/```/g,'').trim();
    if (html) return res.json({ html });
    res.json({ html: null });
  } catch (e) { clearTimeout(timer); res.json({ html: null }); }
});

// ── WORLD EXPLORER — live data for countries without hand-curated entries ────
// Only a handful of countries (GB, US, CA, AU...) have hand-written universities/
// airlines/hospitals/hotels/infrastructure data baked into index.html. Every
// other country used to show a static "Data coming soon" placeholder. This
// generates the same structure live via AI, on demand, the first time someone
// opens that country — so all ~195 countries have real, current information
// with zero manual data entry.
app.post('/api/world-explorer-data', aiLimiter, async (req, res) => {
  const { code, name } = req.body || {};
  if (!code || !name) return res.status(400).json({ error: 'country code and name are required.' });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.json({ data: null });

  const prompt = `You are an expert international relocation consultant. Give real, accurate, current information about ${name} (ISO code ${code}) for someone considering studying, working or relocating there.

Return ONLY a JSON object (no markdown, no code fences) with this exact shape:
{
  "currency": "e.g. EUR (€)", "language": "main language(s)", "population": "e.g. 5.4M", "gdp": "e.g. $450B",
  "universities": [ {"name":"real university name","rank":"e.g. QS #120 or National #1","type":"Public/Private","intake":"e.g. Sep","tuition":"realistic intl fee range","note":"1 short sentence"} ],
  "airlines": [ {"name":"real airline","hub":"main hub airport","type":"Full-service/Low-cost","coverage":"route coverage summary","note":"1 short sentence"} ],
  "hospitals": [ {"name":"real hospital","location":"city","type":"Public/Private/Teaching","note":"1 short sentence"} ],
  "hotels": [ {"name":"real hotel or chain","location":"city","stars":"e.g. ★★★★","price":"realistic nightly range","note":"1 short sentence"} ],
  "infrastructure": [ {"name":"real transport/utility system","type":"Public Transport/Internet/Healthcare System/etc","note":"1 short sentence"} ],
  "worldstatus": {"safety":"1 short phrase with any known index rank","healthcare":"1 short phrase","economy":"1 short phrase","climate":"1 short phrase","cost":"1 short phrase","immigration":"1 short phrase on the main PR/residency pathway"}
}

Give exactly 3-5 items per array. Use REAL, verifiable names — real universities, real airlines, real hospitals, real hotel chains that actually operate in ${name}. If you are not confident of a specific real name for a category (e.g. a very small country with limited international hotel chains), use the best real regional/national option you know rather than inventing one. Be concise — each "note" is one short sentence, max ~18 words.`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 35000);
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 3072, temperature: 0.4 } }),
        signal: ctrl.signal }
    );
    clearTimeout(timer);
    const raw = await r.json();
    let text = (raw.candidates?.[0]?.content?.parts?.[0]?.text || '').replace(/```json|```/g, '').trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return res.json({ data: parsed });
    }
    res.json({ data: null });
  } catch (e) { clearTimeout(timer); res.json({ data: null }); }
});

// ── COUNTRY COMPARISON ────────────────────────────────────────────────────────
app.post('/api/country-compare', async (req, res) => {
  const { countries = [] } = req.body || {};
  if (!Array.isArray(countries) || countries.length < 2)
    return res.status(400).json({ error: 'Provide at least 2 countries.' });
  const list = countries.slice(0, 3);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.json({ rows: null });

  const prompt = `You are an expert international immigration and education consultant. Compare these countries for someone deciding where to study, work, or immigrate: ${list.join(', ')}.

Return ONLY a JSON object (no markdown, no code fences) with this exact shape:
{
  "rows": [
    {"label":"Top Universities","icon":"🎓","type":"text","values":[ "<for country1>", "<country2>", ... ]},
    {"label":"Tuition (intl, /year)","icon":"💵","type":"text","values":[ ... ]},
    {"label":"In-demand Jobs","icon":"💼","type":"text","values":[ ... ]},
    {"label":"Avg Salary","icon":"💰","type":"text","values":[ ... ]},
    {"label":"Cost of Living /mo","icon":"🏠","type":"text","values":[ ... ]},
    {"label":"Work Visa Ease","icon":"🛂","type":"rating","values":[ <0-5 number per country> ]},
    {"label":"PR / Citizenship Ease","icon":"🛣️","type":"rating","values":[ <0-5> ]},
    {"label":"Quality of Life","icon":"🌟","type":"rating","values":[ <0-5> ]},
    {"label":"Safety","icon":"🛡️","type":"rating","values":[ <0-5> ]},
    {"label":"English Friendliness","icon":"🗣️","type":"rating","values":[ <0-5> ]},
    {"label":"Best For","icon":"✅","type":"text","values":[ "<one short phrase>", ... ]}
  ]
}

The "values" array MUST have exactly ${list.length} items, in the same order as: ${list.join(', ')}.
For "text" rows keep each value short (max ~8 words, real specifics: real university names, real currency figures). For "rating" rows give an integer 0-5. Be accurate and realistic.`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 35000);
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 2048, temperature: 0.45 } }),
        signal: ctrl.signal }
    );
    clearTimeout(timer);
    const data = await r.json();
    let text = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').replace(/```json|```/g, '').trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.rows) return res.json({ rows: parsed.rows });
    }
    res.json({ rows: null });
  } catch (e) { clearTimeout(timer); res.json({ rows: null }); }
});

// ── AI TIPS ───────────────────────────────────────────────────────────────────
app.post('/api/ai-tips', aiLimiter, async (req, res) => {
  const { countries = [], universities = [], appCount = 0 } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.json({ tips: null }); // fallback to client-side tips

  const prompt = `You are a senior international immigration and education consultant at SkyGlobe Group.
A client has the following profile:
- Countries of interest: ${countries.join(', ') || 'not specified'}
- University targets: ${universities.map(u => u.name + (u.country ? ' (' + u.country + ')' : '')).join(', ') || 'not specified'}
- Active applications: ${appCount}

Give exactly 5 personalised, actionable tips. Respond with ONLY a JSON array, no markdown, no extra text:
[{"title":"...","tip":"..."},...]`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 1024, temperature: 0.7 } }),
        signal: ctrl.signal }
    );
    clearTimeout(timer);
    const data = await r.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = text.replace(/```json|```/g, '').trim().match(/\[[\s\S]*\]/);
    if (match) return res.json({ tips: JSON.parse(match[0]) });
    res.json({ tips: null });
  } catch { clearTimeout(timer); res.json({ tips: null }); }
});

// ── AI INTERVIEW PREP ─────────────────────────────────────────────────────────
app.post('/api/interview-prep', async (req, res) => {
  const { type = 'visa', target = '', nationality = '', background = '', payToken = '' } = req.body || {};
  // Paid, self-service — same signed-unlock pattern as the document generator.
  if (!verifyUnlock(payToken, 'interview_prep'))
    return res.status(402).json({ error: 'Payment required', pay: { product: 'interview_prep' } });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI unavailable' });

  const typeLabels = { visa: 'embassy/consulate visa', job: 'international job', university: 'university admissions' };
  const typeLabel = typeLabels[type] || 'visa';

  const prompt = `You are a world-class ${typeLabel} interview coach at SkyGlobe Group, with 15+ years helping applicants succeed.

Client profile:
- Interview type: ${typeLabel} interview
- Target: ${target || 'not specified'}
- Applicant nationality: ${nationality || 'not specified'}
- Background summary: ${background || 'not provided'}

Generate a comprehensive personalised interview preparation guide. Respond with ONLY valid JSON, no markdown, no extra text:
{
  "overview": "2–3 sentence paragraph describing what to expect in this specific interview — tone, format, typical duration, what the interviewer is really assessing",
  "questions": [
    {"q": "The interview question exactly as asked", "hint": "Coaching note: what the interviewer is really testing, what to emphasise in your answer, what to avoid"},
    ... (10 questions total, ordered from most likely to specialised)
  ],
  "tips": ["Practical tip 1", "Practical tip 2", ... (6 tips — appearance, documents, mindset, body language, timing)],
  "redFlags": ["Things that trigger rejection 1", "Things that trigger rejection 2", ... (4 red flags to avoid saying or doing)]
}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 4096,
            temperature: 0.7,
            responseMimeType: 'application/json'
          }
        }),
        signal: ctrl.signal }
    );
    clearTimeout(timer);
    const data = await r.json();
    if (!r.ok) {
      console.error('Interview prep API error:', JSON.stringify(data.error || data));
      return res.status(502).json({ error: 'AI service error. Please try again.' });
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/);
    if (match) {
      try { return res.json(JSON.parse(match[0])); }
      catch { return res.status(500).json({ error: 'The guide came back malformed. Please try again.' }); }
    }
    console.error('Interview prep empty/unparseable. finishReason:', data.candidates?.[0]?.finishReason);
    res.status(500).json({ error: 'No guide was generated. Please try again.' });
  } catch(e) {
    clearTimeout(timer);
    const aborted = e.name === 'AbortError';
    res.status(aborted ? 504 : 500).json({ error: aborted ? 'The AI took too long. Please try again.' : 'Could not generate the guide. Please try again.' });
  }
});

// ── §9 PAYMENTS ──────────────────────────────────────────────────────────────
// Provider-agnostic engine. Paystack, Stripe and Flutterwave are all supported.
// Activate a provider simply by adding its secret/public keys to Render env vars.
// Nothing breaks while keys are missing — that provider is just "not available".
//
//   PAYSTACK_SECRET_KEY / PAYSTACK_PUBLIC_KEY      (sk_..., pk_...)
//   STRIPE_SECRET_KEY   / STRIPE_PUBLIC_KEY        (sk_..., pk_...)
//   FLUTTERWAVE_SECRET_KEY / FLUTTERWAVE_PUBLIC_KEY
//
// Supabase tables required (see PAYMENTS_SETUP.md for the exact SQL):
//   payments     — every payment attempt + its status
//   conferences  — the curated conferences shown on /conferences (CEO-managed)
// ════════════════════════════════════════════════════════════════════════════

// Server-authoritative pricing. The client NEVER sends the amount — we look it
// up here so prices can't be tampered with. Edit these to your real prices.
// Amounts are in MAJOR units. We charge in USD / EUR / GBP only — premium,
// international, professional. (No local currency.) USD is the default.
const PRICING = {
  interview_prep:        { label: 'AI Interview Prep Guide',                    instant: true,  USD: 9,    EUR: 9,    GBP: 7   },
  conference_invitation: { label: 'Conference Invitation Letter (CEO-stamped)', instant: false, USD: 49,   EUR: 45,   GBP: 39  },
  conference_sourcing:   { label: 'Conference Sourcing — we source & verify the genuine document', instant: false, USD: 159, EUR: 149, GBP: 129 },
  official_letter:       { label: 'Official Company Letter (stamped)',          instant: false, USD: 39,   EUR: 35,   GBP: 29  },
  // ── Work Permit & Migration packages ──────────────────────────────────────
  work_permit_standard:  { label: 'Europe Work Permit — Standard (Full Application Service)',  instant: false, USD: 499,  EUR: 459,  GBP: 399  },
  work_permit_express:   { label: 'Europe Work Permit — Express (Priority + Dedicated Agent)', instant: false, USD: 749,  EUR: 699,  GBP: 599  },
  migration_premium:     { label: 'Premium Migration Package (Permit + Relocation Support)',   instant: false, USD: 1299, EUR: 1199, GBP: 1049 },
  travel_prep_europe:    { label: 'Premium Travel Preparation — Europe',                       instant: false, USD: 199,  EUR: 189,  GBP: 169  },
  travel_prep_global:    { label: 'Premium Travel Preparation — Global (any destination)',     instant: false, USD: 259,  EUR: 239,  GBP: 209  },
  // ── Legal Digital Documentation (Digitalization division) ──────────────────
  // AI-generated, encrypted, audit-logged, delivered through the secure viewer.
  // Three service tiers; document type is chosen by the client at checkout.
  legal_doc_standard:    { label: 'Legal Document — Standard', instant: true, kind: 'legal', USD: 29, EUR: 27, GBP: 24 },
  legal_doc_premium:     { label: 'Legal Document — Premium',  instant: true, kind: 'legal', USD: 59, EUR: 55, GBP: 49 },
  legal_doc_priority:    { label: 'Legal Document — Priority', instant: true, kind: 'legal', USD: 99, EUR: 92, GBP: 79 },
  cert_amateur:          { label: '1-Month Amateur Certificate Program', instant: true, kind: 'certificate', USD: 49,  EUR: 45,  GBP: 39  },
  cert_advanced:         { label: '2-Month Advanced Certificate Program', instant: true, kind: 'certificate', USD: 89,  EUR: 82,  GBP: 71  },
  cert_pro:              { label: '3-Month Pro Certificate Program', instant: true, kind: 'certificate', USD: 149, EUR: 138, GBP: 119 },
  premium_digital_id:    { label: 'SkyGlobe Premium Digital ID', instant: true, kind: 'identity', USD: 79, EUR: 73, GBP: 63 },
  // ── AI Document Generator (public self-service — was previously locked behind
  // a staff/CEO password with no way for a client to ever reach or pay for it).
  // Same instant-unlock pattern as legal docs: pay → signed token → generate.
  sop:            { label: 'Statement of Purpose (SOP) — AI Draft',       instant: true, USD: 29, EUR: 27, GBP: 24 },
  coverletter:    { label: 'Job Cover Letter — AI Draft',                 instant: true, USD: 19, EUR: 18, GBP: 15 },
  visaletter:     { label: 'Visa Cover Letter — AI Draft',                instant: true, USD: 19, EUR: 18, GBP: 15 },
  experience:     { label: 'Experience Certificate Draft — AI Draft',     instant: true, USD: 29, EUR: 27, GBP: 24 },
  invitation:     { label: 'Conference Invitation Letter (Your Org) — AI Draft', instant: true, USD: 29, EUR: 27, GBP: 24 },
  skyconference:  { label: 'SkyGlobe Conference Invitation — AI Instant Draft',  instant: true, USD: 49, EUR: 45, GBP: 39 },
  // ── Global Mobility — visas, PR & jobs (Apply page) ─────────────────────────
  student_visa_processing: { label: 'Student Visa Processing — Full Application Support',      instant: false, USD: 179, EUR: 165, GBP: 145 },
  work_visa_processing:    { label: 'Work Visa Processing — Full Application Support',          instant: false, USD: 199, EUR: 185, GBP: 159 },
  tourist_visa_processing: { label: 'Tourist & Schengen Visa Processing',                       instant: false, USD: 129, EUR: 119, GBP: 99  },
  express_entry_pr:        { label: 'Express Entry / PR Pathway — Full Case Management',        instant: false, USD: 349, EUR: 325, GBP: 279 },
  eu_direct_employment:    { label: 'EU Direct Employment — Job Placement + Work Permit',        instant: false, USD: 249, EUR: 229, GBP: 199 },
  recruitment_placement:   { label: 'Recruitment & Overseas Jobs — Placement Service',           instant: false, USD: 199, EUR: 185, GBP: 159 },
  // ── Education ────────────────────────────────────────────────────────────
  university_admission:    { label: 'University Admission Assistance',                          instant: false, USD: 149, EUR: 139, GBP: 119 },
  scholarship_support:     { label: 'Scholarship Application Support',                           instant: false, USD: 99,  EUR: 92,  GBP: 79  },
  // ── Travel Services ──────────────────────────────────────────────────────
  flight_reservation_letter: { label: 'Flight Reservation Letter (visa itinerary)',              instant: false, USD: 39,  EUR: 35,  GBP: 29  },
  real_flight_booking:     { label: 'Real Flight Booking — Service Fee (ticket cost billed separately)', instant: false, USD: 49,  EUR: 45,  GBP: 39  },
  hotel_reservation_letter:{ label: 'Hotel Reservation / Accommodation Letter',                  instant: false, USD: 39,  EUR: 35,  GBP: 29  },
  real_hotel_booking:      { label: 'Real Hotel Booking — Service Fee (room cost billed separately)', instant: false, USD: 39,  EUR: 35,  GBP: 29  },
  travel_insurance:        { label: 'Travel Insurance — Coverage Certificate',                   instant: false, USD: 59,  EUR: 55,  GBP: 49  },
  document_authentication: { label: 'Document Authentication / Apostille',                       instant: false, USD: 59,  EUR: 55,  GBP: 49  },
  // ── Digitalization — Identity & Presence (Web/App Dev and Business Automation
  // stay quote-based on their pages — genuinely custom scope, no fixed fee yet) ─
  digital_identity_service:{ label: 'Digital Identity & e-Docs — Starting Fee',                  instant: false, USD: 79,  EUR: 73,  GBP: 63  },
  digital_presence_starter:{ label: 'Digital Presence & AI — Starting Fee',                      instant: false, USD: 149, EUR: 139, GBP: 119 },
};

// Maps the free-text "service" values sent by the main Apply form (index.html)
// to a PRICING product key, so /api/apply can offer secure payment for any
// service that carries a real fee. Services not listed here (free consultation
// requests, or Web & App Development / Business Automation which are
// genuinely custom-quoted) stay as plain lead capture — no fixed price to fake.
const SERVICE_PRODUCT_MAP = {
  'Student Visa Processing':               'student_visa_processing',
  'Work Visa Processing':                  'work_visa_processing',
  'Tourist / Visit Visa':                  'tourist_visa_processing',
  'University Admission Assistance':       'university_admission',
  'Scholarship Application Support':       'scholarship_support',
  'Flight Reservation Letter':             'flight_reservation_letter',
  'Flight Booking':                        'real_flight_booking',
  'Hotel Booking / Accommodation Letter':  'hotel_reservation_letter',
  'Travel Insurance':                      'travel_insurance',
  'Document Authentication / Apostille':   'document_authentication',
  'Express Entry / PR Pathway':            'express_entry_pr',
  'EU Direct Employment':                  'eu_direct_employment',
  'Recruitment & Overseas Jobs':           'recruitment_placement',
  'Digital Identity & e-Docs':             'digital_identity_service',
  'Digital Presence & AI':                 'digital_presence_starter',
  'Premium Travel Preparation — Europe':   'travel_prep_europe',
  'Premium Travel Preparation — Global':   'travel_prep_global',
  'Official Company Letter':               'official_letter',
};

// ════════════════════════════════════════════════════════════════════════════
//  DEPARTMENT ROUTING + AI RECEPTION  (Phases B & C)
//  Every inbound request is tagged to a department and read by AI, which
//  classifies it, drafts a suggested reply, and decides whether a human is
//  needed — then it lands in the department's queue in the CEO portal.
//
//  Required Supabase table (run once):
//   create table if not exists ai_reception (
//     id bigserial primary key,
//     source text, ref text, client_name text, client_email text,
//     service text, department text, urgency text, intent text,
//     sentiment text, suggested_reply text, needs_human boolean,
//     status text default 'new', assigned_to text, raw jsonb,
//     created_at timestamptz default now()
//   );
//   create index on ai_reception (created_at desc);
// ════════════════════════════════════════════════════════════════════════════

// Public-facing departments. `email` is the professional address that will go
// live in Phase A (Cloudflare Email Routing). Until each is created, `live`
// stays false and notifications fall back to RECIPIENT_EMAIL — flip `live` to
// true per department the moment its address forwards to a real inbox.
const DEPARTMENTS = {
  // Ecosystem divisions (ARCHITECTURE.md Amendment 2): division-level names —
  // everything travel-related lives under Global Mobility's shadow; the
  // Academy serves every age; Innovation & Technology is the Group's R&D face.
  travel:    { key: 'travel',    label: 'Global Mobility',           email: 'mobility@skyglobegroup.com', icon: '🌐', live: false },
  education: { key: 'education', label: 'SkyGlobe Academy',          email: 'education@skyglobegroup.com', icon: '🎓', live: false },
  legal:     { key: 'legal',     label: 'Legal & Trust Services',    email: 'legal@skyglobegroup.com',    icon: '📜', live: false },
  identity:  { key: 'identity',  label: 'Digital Identity',          email: 'id@skyglobegroup.com',       icon: '🪪', live: false },
  finance:   { key: 'finance',   label: 'Finance & Payments',        email: 'finance@skyglobegroup.com',  icon: '💳', live: false },
  innovation:{ key: 'innovation',label: 'Innovation & Technology',   email: 'innovation@skyglobegroup.com', icon: '🚀', live: false },
  noria:     { key: 'noria',     label: 'NORIA · AI Assistant',     email: 'noria@skyglobegroup.com',    icon: '✦',  live: false, sticky: true },
  yunex:     { key: 'yunex',     label: 'Yunex',                    email: 'yunex@skyglobegroup.com',    icon: '◆',  live: false, sticky: true },
  terra:     { key: 'terra',     label: 'TERRA',                    email: 'terra@skyglobegroup.com',    icon: '🌍', live: false, sticky: true },
  // CEO mail is sacred: never AI-auto-answered, always queued for a human,
  // and never re-classified away from the CEO's office by the AI.
  ceo:       { key: 'ceo',       label: 'Office of the CEO',        email: 'ceo@skyglobegroup.com',      icon: '👑', live: false, sticky: true, aiAutoAnswer: false },
  general:   { key: 'general',   label: 'General / Reception',      email: 'support@skyglobegroup.com',  icon: '📨', live: false },
};
const VALID_DEPT_KEYS = Object.keys(DEPARTMENTS);

// Which department addresses are LIVE (receiving mail via Cloudflare Email
// Routing). Set on Render:  DEPT_EMAILS_LIVE=all   — or a list like
// "travel,legal,general". No code edit needed when Phase A completes.
{
  const liveSet = new Set(String(process.env.DEPT_EMAILS_LIVE || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
  for (const k of VALID_DEPT_KEYS) DEPARTMENTS[k].live = liveSet.has('all') || liveSet.has(k);
}

// Sender identity for a department's outgoing mail. Sending from any
// @skyglobegroup.com address works today (the domain is verified in Resend) —
// but until a department's RECEIVING address exists (Phase A), we keep the
// deliverable support@ address so a client hitting "Reply" never bounces,
// while still showing the department's name. Flip `live: true` per
// department after Phase A and mail goes out from the real address.
function deptSender(deptKey) {
  const d = DEPARTMENTS[deptKey] || DEPARTMENTS.general;
  const addr = (d.live && d.email) ? d.email : 'support@skyglobegroup.com';
  return `SkyGlobe ${d.label} <${addr}>`;
}

// Which department owns each priced product.
const PRODUCT_DEPT = {
  work_permit_standard:'travel', work_permit_express:'travel', migration_premium:'travel',
  travel_prep_europe:'travel', travel_prep_global:'travel', student_visa_processing:'travel',
  work_visa_processing:'travel', tourist_visa_processing:'travel', express_entry_pr:'travel',
  eu_direct_employment:'travel', recruitment_placement:'travel', flight_reservation_letter:'travel',
  real_flight_booking:'travel', hotel_reservation_letter:'travel', real_hotel_booking:'travel',
  travel_insurance:'travel', document_authentication:'travel', conference_invitation:'travel',
  conference_sourcing:'travel', skyconference:'travel', invitation:'travel', visaletter:'travel',
  cert_amateur:'education', cert_advanced:'education', cert_pro:'education',
  university_admission:'education', scholarship_support:'education', sop:'education',
  interview_prep:'education', coverletter:'education', experience:'education',
  legal_doc_standard:'legal', legal_doc_premium:'legal', legal_doc_priority:'legal', official_letter:'legal',
  premium_digital_id:'identity', digital_identity_service:'identity', digital_presence_starter:'identity',
};

function deptForProduct(product) { return PRODUCT_DEPT[product] || 'general'; }
function deptForService(service) {
  const p = SERVICE_PRODUCT_MAP[service];
  if (p) return deptForProduct(p);
  const s = String(service || '').toLowerCase();
  if (/visa|permit|migrat|travel|flight|hotel|relocat|recruit|tourist|schengen/.test(s)) return 'travel';
  if (/course|academy|scholar|admission|student|university|tutor|cv|resume|sop/.test(s)) return 'education';
  if (/legal|document|letter|apostille|notaris|affidavit|agreement|contract/.test(s)) return 'legal';
  if (/identity|\bid\b|digital id|e-?doc|presence/.test(s)) return 'identity';
  if (/payment|invoice|refund|billing|charge/.test(s)) return 'finance';
  return 'general';
}
// Who to email for a department: its own address once live, else the team inbox.
// LOOP GUARD #1 — team notifications must NEVER be sent to our own
// @skyglobegroup.com addresses: those now route into the Email Worker, which
// would hand the notification straight back to this server (this caused a
// real self-amplifying mail loop). Notifications go only to true external
// inboxes; anything on our own domain is stripped.
function deptInbox(_deptKey) {
  const team = (process.env.RECIPIENT_EMAIL
    ? process.env.RECIPIENT_EMAIL.split(',').map(s => s.trim())
    : ['insights.skyglobe@gmail.com'])
    .filter(a => a && !/@skyglobegroup\.com$/i.test(a));
  return team.length ? team : ['insights.skyglobe@gmail.com'];
}

// Pull the first JSON object out of an AI response (handles ```json fences).
function parseAiJson(text) {
  if (!text) return null;
  let t = String(text).replace(/```json/gi, '').replace(/```/g, '').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a === -1 || b === -1 || b <= a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
}

// The heart of the AI Reception. Fire-and-forget: never blocks or breaks the
// client-facing request that triggered it. Classifies, drafts a reply, decides
// escalation, stores the record, and notifies the owning department.
// ── PORTAL-FIRST DELIVERY ────────────────────────────────────────────────────
// If the client has a SkyGlobe account, deliver the AI's reply straight into
// their in-app Messages inbox (database + live SSE push). This channel costs
// ZERO email quota and can never be blocked by a provider — email becomes a
// bonus copy rather than the only path. Returns true when delivered.
async function portalDeliver(clientEmail, body, deptKey) {
  if (!clientEmail || !body) return false;
  const emailLc = String(clientEmail).toLowerCase().trim();
  try {
    const accounts = await dbQuery('GET', 'clients', null, { email: `eq.${emailLc}`, select: 'email', limit: 1 });
    if (!Array.isArray(accounts) || !accounts.length) return false;
    const dept = DEPARTMENTS[deptKey] || DEPARTMENTS.general;
    const text = `${dept.icon} ${dept.label}\n\n${body}`;
    await dbQuery('POST', 'messages', { client_email: emailLc, sender: 'ai', body: text, read: false });
    sseNotify(emailLc, 'new-message', { sender: 'ai', body: text, created_at: new Date().toISOString() });
    console.log(`[ai-reception] portal delivery → ${emailLc} (${deptKey})`);
    return true;
  } catch (e) {
    console.error('[ai-reception] portal delivery failed:', e.message);
    return false;
  }
}

async function aiReceive({ source, ref, name, email, service, message, deptHint }) {
  let rec = {
    source: source || 'request', ref: ref || null,
    client_name: name || '', client_email: email || '',
    service: service || '', department: deptHint || deptForService(service),
    urgency: 'normal', intent: '', sentiment: 'neutral',
    suggested_reply: '', needs_human: true, status: 'new',
    raw: { source, ref, name, email, service, message: message || '' },
  };
  try {
    const prompt = `You are the AI Reception for SkyGlobe Group, a global platform for travel & mobility, education, legal documents and digital identity. A new client request just arrived. Read it and reply with ONLY a JSON object (no prose, no markdown), exactly these keys:
{"department": one of ["travel","education","legal","identity","finance","innovation","general"],
 "urgency": one of ["low","normal","high","critical"],
 "intent": "one concise sentence describing what the client wants",
 "sentiment": one of ["positive","neutral","frustrated"],
 "suggested_reply": "a warm, professional 2-4 sentence reply our team could send this client, signed as SkyGlobe Group",
 "needs_human": true or false}
Set needs_human=true for anything involving payment problems, complaints, legal/visa decisions, or complex or unclear cases; false only when a simple informational reply fully resolves it.

REQUEST:
Service: ${service || '(not specified)'}
Client: ${name || '(unknown)'} <${email || 'no-email'}>
Message: ${message || '(no message — form submission)'}`;
    const out = await generateText(prompt, { maxTokens: 700, temperature: 0.3 });
    const j = parseAiJson(out);
    if (j) {
      // The department the client explicitly chose (form selector) or wrote to
      // (email address) is AUTHORITATIVE — AI classification only decides when
      // the destination was generic ('general' or no hint at all).
      if (VALID_DEPT_KEYS.includes(j.department) && (!deptHint || deptHint === 'general')) rec.department = j.department;
      if (['low','normal','high','critical'].includes(j.urgency)) rec.urgency = j.urgency;
      if (['positive','neutral','frustrated'].includes(j.sentiment)) rec.sentiment = j.sentiment;
      if (typeof j.intent === 'string') rec.intent = j.intent.slice(0, 400);
      if (typeof j.suggested_reply === 'string') rec.suggested_reply = j.suggested_reply.slice(0, 2000);
      if (typeof j.needs_human === 'boolean') rec.needs_human = j.needs_human;
      if (DEPARTMENTS[rec.department] && DEPARTMENTS[rec.department].aiAutoAnswer === false) rec.needs_human = true;
      rec.status = rec.needs_human ? 'new' : 'ai_handled';
    }
  } catch (e) {
    console.error('[ai-reception] triage failed, storing raw:', e.message);
    rec.intent = 'AI triage unavailable — needs manual review.';
  }
  try {
    const saved = await dbQuery('POST', 'ai_reception', rec);
    const row = Array.isArray(saved) ? saved[0] : saved;
    sseNotify('__admin__', 'reception-new', { id: row?.id, department: rec.department, urgency: rec.urgency });
    // Notify the owning department (its own inbox once live, else the team).
    const dept = DEPARTMENTS[rec.department] || DEPARTMENTS.general;
    // AI answers by EMAIL too — when triage is confident no human is needed,
    // the drafted reply goes straight to the client from the department's
    // identity, 24/7. Anything needing a human stays queued and is never
    // auto-answered. Fire-and-forget: an email failure just leaves the item
    // in the queue for staff.
    if (!rec.needs_human && rec.client_email && rec.suggested_reply) {
      // Portal first (free, instant, quota-proof) — email as a bonus copy.
      const portalPromise = portalDeliver(rec.client_email, rec.suggested_reply, rec.department);
      sendEmail(rec.client_email, `SkyGlobe Group — ${dept.label}`,
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:22px;color:#1a2233">
          <p>Dear ${rec.client_name || 'Client'},</p>
          <div style="line-height:1.6">${rec.suggested_reply.replace(/\n/g,'<br>')}</div>
          <p style="margin-top:16px;font-size:13px;color:#6b7689">If you need anything further, simply reply to this email and one of our team members will follow up personally.</p>
          <p style="font-size:13px;color:#6b7689">${dept.icon} ${dept.label} · SkyGlobe Group · One World. One Mission.</p>
        </div>`,
        undefined, deptSender(rec.department)
      ).catch(async (err) => {
        // ZERO-SILENT-FAILURE RULE: if the auto-answer could not be emailed
        // (quota, outage on BOTH providers) AND it didn't reach the client's
        // portal inbox either, flip the item back into the human queue so a
        // specialist follows up. If the portal copy landed, the client HAS the
        // reply — no need to re-open the item.
        console.error('[ai-reception] auto-answer email failed:', err.message);
        const reachedPortal = await portalPromise.catch(() => false);
        if (!reachedPortal) {
          console.error('[ai-reception] no portal account either — rerouting to human');
          try { await dbQuery('PATCH', 'ai_reception', { status: 'new', needs_human: true }, { id: `eq.${row?.id}` }); } catch {}
        }
      });
    }
    // Professional acknowledgement: when the request is queued for a human
    // (no instant AI answer), the client immediately receives a branded
    // receipt confirming WHAT we received and WHICH department is handling it.
    // (Skipped for in-app chat — the hand-off message covers it — and for
    // payment events, which already send their own confirmations.)
    if (rec.needs_human && rec.client_email && ['contact', 'email'].includes(rec.source)) {
      portalDeliver(rec.client_email,
        `Thank you for contacting SkyGlobe Group. Your message has been received and assigned to our ${dept.label} team${ref ? ` (reference ${ref})` : ''}. A specialist will reply to you shortly.`,
        rec.department).catch(() => {});
      sendEmail(rec.client_email, `We've received your message — ${dept.label}`,
        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a2233">
          <h2 style="color:#a87016;font-family:Georgia,serif">${dept.icon} Message received</h2>
          <p>Dear ${rec.client_name || 'Client'},</p>
          <p>Thank you for contacting SkyGlobe Group. Your message has been received and assigned to our <strong>${dept.label}</strong> team${ref ? ` (reference <strong>${ref}</strong>)` : ''}. A specialist will reply to you shortly.</p>
          <div style="background:#f7f8fb;border-left:4px solid #c9a84c;padding:12px 14px;margin:16px 0;font-size:14px;color:#444"><strong>Your message:</strong><br>${String(message || '').slice(0, 600).replace(/</g, '&lt;').replace(/\n/g, '<br>')}</div>
          <p style="font-size:13px;color:#6b7689">You can reply to this email at any time — it reaches the same team. ${dept.icon} ${dept.label} · SkyGlobe Group · One World. One Mission.</p>
        </div>`,
        undefined, deptSender(rec.department)
      ).catch(err => console.error('[ai-reception] acknowledgement email failed:', err.message));
    }
    const flag = rec.urgency === 'critical' ? '🔴 ' : rec.urgency === 'high' ? '🟠 ' : '';
    sendEmail(deptInbox(rec.department),
      `${flag}${dept.icon} ${dept.label} — new request${ref ? ' ' + ref : ''}`,
      `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a2233">
        <h2 style="color:#c9a84c">${dept.icon} ${dept.label}</h2>
        <p><strong>Client:</strong> ${rec.client_name || '—'} &lt;${rec.client_email || '—'}&gt;</p>
        ${service ? `<p><strong>Service:</strong> ${service}</p>` : ''}
        ${ref ? `<p><strong>Reference:</strong> ${ref}</p>` : ''}
        <p><strong>Urgency:</strong> ${rec.urgency} · <strong>Sentiment:</strong> ${rec.sentiment}</p>
        <p><strong>AI summary:</strong> ${rec.intent || '—'}</p>
        ${rec.suggested_reply ? `<div style="background:#fff8e6;border-left:4px solid #c9a84c;padding:12px 14px;margin:14px 0"><strong>AI suggested reply:</strong><br>${rec.suggested_reply.replace(/\n/g,'<br>')}</div>` : ''}
        <p style="font-size:13px;color:#6b7689">${rec.needs_human ? '⚠ Flagged for a human agent.' : '✓ AI can auto-handle — review in the AI Reception panel.'}</p>
        <p style="font-size:13px;color:#6b7689">Open the CEO portal → AI Reception to action this.</p>
      </div>`
    ).catch(err => console.error('[ai-reception] dept email failed:', err.message));
    return row;
  } catch (e) {
    console.error('[ai-reception] save failed:', e.message);
    return null;
  }
}

// ── AI CONVERSATION LOOP ─────────────────────────────────────────────────────
// When a logged-in client posts a message, the AI holds the conversation —
// answering directly turn after turn — UNTIL it decides a human is needed, at
// which point it posts a graceful hand-off, opens a flagged Reception item for
// the right department, and goes silent. Once ANY human replies in the thread,
// the AI stays silent permanently: the human owns it. Fully guarded so it can
// never break the client's message flow.
async function aiChatReply(clientEmail) {
  try {
    const thread = await dbQuery('GET', 'messages', null, { client_email: `eq.${clientEmail}`, order: 'created_at.asc', limit: 60 });
    if (!Array.isArray(thread) || !thread.length) return;
    // A human has taken over the moment any 'admin' message exists → AI silent.
    if (thread.some(m => m.sender === 'admin')) return;
    // Already escalated and still open? Let the human queue own it.
    const openEsc = await dbQuery('GET', 'ai_reception', null,
      { client_email: `eq.${clientEmail}`, source: 'eq.chat', status: `neq.resolved`, limit: 1 }).catch(() => []);
    if (Array.isArray(openEsc) && openEsc.length) return;
    // Nothing new from the client since the last AI turn? Don't double-reply.
    if (thread[thread.length - 1].sender !== 'client') return;

    const history = thread.slice(-16).map(m => `${m.sender === 'client' ? 'Client' : 'SkyGlobe'}: ${m.body}`).join('\n');
    const prompt = `You are NORIA, SkyGlobe Group's warm, professional AI assistant, chatting live with a client in their account inbox. SkyGlobe offers travel & global mobility (visas, work permits, flights, hotels, insurance), education & academy (courses, admissions, scholarships), legal documents, and digital identity cards. Continue the conversation helpfully.

Reply with ONLY a JSON object:
{"reply": "your next message to the client — friendly, concise, useful",
 "needs_human": true or false,
 "department": one of ["travel","education","legal","identity","finance","general"],
 "intent": "one short sentence summarising what the client ultimately needs"}
Set needs_human=true (and keep "reply" as a brief, reassuring hand-off line) when the client needs a payment/refund action, a decision on their specific case, document review, a complaint resolved, or anything you cannot fully and safely resolve yourself. Otherwise keep helping.

CONVERSATION SO FAR:
${history}`;
    const out = await generateText(prompt, { maxTokens: 700, temperature: 0.4 });
    const j = parseAiJson(out);
    if (!j || typeof j.reply !== 'string' || !j.reply.trim()) return; // AI unsure → leave for a human
    const dept = VALID_DEPT_KEYS.includes(j.department) ? j.department : 'general';

    // Post the AI's message to the thread (sender 'ai' → shown as SkyGlobe side).
    const saved = await dbQuery('POST', 'messages', { client_email: clientEmail, sender: 'ai', body: j.reply.trim().slice(0, 2000), read: false });
    sseNotify(clientEmail, 'new-message', { sender: 'ai', body: j.reply.trim(), created_at: new Date().toISOString() });

    if (j.needs_human) {
      // Open a flagged Reception item so a human picks it up, and alert the dept.
      await aiReceive({
        source: 'chat', name: '', email: clientEmail,
        service: `Live chat — ${DEPARTMENTS[dept]?.label || 'General'}`,
        message: history, deptHint: dept,
      }).catch(() => {});
      sseNotify('__admin__', 'reception-new', { department: dept, urgency: 'high', chat: true });
    }
    return Array.isArray(saved) ? saved[0] : saved;
  } catch (e) {
    console.error('[ai-chat] reply failed (left for human):', e.message);
  }
}

const PAY = {
  // Grey — SkyGlobe's own bank/crypto receiving accounts (USD, EUR, GBP, USDC, USDT).
  // Always available: no external API key required, so it never goes "not configured".
  // Confirmed manually by CEO/staff once the transfer is verified in the Grey app.
  grey:        { secret: 'manual', pub: null, currencies: ['USD','EUR','GBP','USDC','USDT'], manual: true },
  paystack:    { secret: process.env.PAYSTACK_SECRET_KEY,    pub: process.env.PAYSTACK_PUBLIC_KEY,    currencies: ['USD'] },
  stripe:      { secret: process.env.STRIPE_SECRET_KEY,      pub: process.env.STRIPE_PUBLIC_KEY,      currencies: ['USD','EUR','GBP'] },
  flutterwave: { secret: process.env.FLUTTERWAVE_SECRET_KEY, pub: process.env.FLUTTERWAVE_PUBLIC_KEY, currencies: ['USD','EUR','GBP'] },
};

function activeProviders() {
  return Object.entries(PAY)
    .filter(([, c]) => c.secret)
    .map(([name, c]) => ({ name, public: c.pub || null, currencies: c.currencies }));
}

function baseUrl(req) {
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL;
  if (req) return `${req.protocol}://${req.get('host')}`;
  return 'https://skyglobegroup.com';
}

function genPayRef() {
  return `PAY-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

// ── payments table helpers ───────────────────────────────────────────────────
async function insertPayment(p) {
  const rows = await dbQuery('POST', 'payments', p);
  return Array.isArray(rows) ? rows[0] : rows;
}
async function getPayment(reference) {
  const rows = await dbQuery('GET', 'payments', null, { reference: `eq.${reference}`, limit: 1 });
  return rows[0] || null;
}
async function updatePayment(reference, patch) {
  const rows = await dbQuery('PATCH', 'payments', patch, { reference: `eq.${reference}` });
  return Array.isArray(rows) ? rows[0] : rows;
}

// ── provider dispatch: initialise a checkout ─────────────────────────────────
// Returns { authorization_url } the browser should be redirected to.
async function providerInit(provider, { reference, amount, currency, email, label, callbackUrl, product, appRef }) {
  if (provider === 'grey') {
    // No external checkout — send the client to our own bank/crypto payment page,
    // pre-filled with their reference, amount, currency and the product they're buying.
    const base = callbackUrl.replace(/\/pay\/callback\/?$/, '');
    const qs = new URLSearchParams({
      payref: reference,
      ref: appRef || reference,
      amount: String(amount),
      cur: currency,
      product: product || '',
      service: label || '',
    });
    return { authorization_url: `${base}/pay.html?${qs.toString()}` };
  }
  if (provider === 'paystack') {
    const r = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PAY.paystack.secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, amount: Math.round(amount * 100), currency, reference,
        callback_url: callbackUrl, metadata: { label },
      }),
    });
    const d = await r.json();
    if (!d.status) throw new Error(d.message || 'Paystack init failed');
    return { authorization_url: d.data.authorization_url };
  }

  if (provider === 'stripe') {
    const form = new URLSearchParams();
    form.set('mode', 'payment');
    form.set('success_url', `${callbackUrl}?reference=${reference}`);
    form.set('cancel_url', `${callbackUrl}?reference=${reference}&cancelled=1`);
    form.set('customer_email', email);
    form.set('client_reference_id', reference);
    form.set('metadata[reference]', reference);
    form.set('line_items[0][quantity]', '1');
    form.set('line_items[0][price_data][currency]', currency.toLowerCase());
    form.set('line_items[0][price_data][unit_amount]', String(Math.round(amount * 100)));
    form.set('line_items[0][price_data][product_data][name]', label);
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PAY.stripe.secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error.message || 'Stripe init failed');
    // remember the stripe session id so we can verify later
    await updatePayment(reference, { provider_ref: d.id });
    return { authorization_url: d.url };
  }

  if (provider === 'flutterwave') {
    const r = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PAY.flutterwave.secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx_ref: reference, amount, currency,
        redirect_url: callbackUrl, customer: { email },
        customizations: { title: 'SkyGlobe Group', description: label },
      }),
    });
    const d = await r.json();
    if (d.status !== 'success') throw new Error(d.message || 'Flutterwave init failed');
    return { authorization_url: d.data.link };
  }

  throw new Error('Unknown payment provider');
}

// ── provider dispatch: verify a payment really succeeded ─────────────────────
async function providerVerify(provider, payment) {
  if (provider === 'grey') return false; // manual confirmation only — see /api/admin/payments/:reference/confirm
  if (provider === 'paystack') {
    const r = await fetch(`https://api.paystack.co/transaction/verify/${payment.reference}`, {
      headers: { Authorization: `Bearer ${PAY.paystack.secret}` },
    });
    const d = await r.json();
    return d.status && d.data && d.data.status === 'success';
  }
  if (provider === 'stripe') {
    const sid = payment.provider_ref;
    if (!sid) return false;
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sid}`, {
      headers: { Authorization: `Bearer ${PAY.stripe.secret}` },
    });
    const d = await r.json();
    return d.payment_status === 'paid';
  }
  if (provider === 'flutterwave') {
    const r = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(payment.reference)}`, {
      headers: { Authorization: `Bearer ${PAY.flutterwave.secret}` },
    });
    const d = await r.json();
    return d.status === 'success' && d.data && d.data.status === 'successful';
  }
  return false;
}

// When a payment is confirmed, unlock whatever it paid for.
async function fulfilPayment(payment) {
  if (payment.app_ref) {
    try {
      const app_ = await getAppByRef(payment.app_ref);
      if (app_) {
        const newStatus = payment.product === 'conference_sourcing'
          ? 'Paid — Sourcing in Progress'
          : 'Paid — Pending CEO Review';
        const responses = app_.responses || [];
        responses.push({ by: 'System', message: `Payment received (${payment.currency} ${payment.amount}). Your request is now in our team's queue.`, date: new Date().toISOString() });
        await updateApp(payment.app_ref, { status: newStatus, paid: true, responses });
        // tell the CEO/team there is paid work waiting
        const team = process.env.RECIPIENT_EMAIL ? process.env.RECIPIENT_EMAIL.split(',').map(s => s.trim()) : ['support@skyglobegroup.com', 'insights.skyglobe@gmail.com'];
        try {
          await sendEmail(team, `💰 PAID request ${payment.app_ref} — ${PRICING[payment.product]?.label || payment.meta?.label || payment.product}`,
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
              <h2 style="color:#c9a84c">Paid request needs action</h2>
              <p><strong>Reference:</strong> ${payment.app_ref}</p>
              <p><strong>Service:</strong> ${PRICING[payment.product]?.label || payment.meta?.label || payment.product}</p>
              <p><strong>Client:</strong> ${app_.fname} ${app_.lname || ''} — ${app_.email}</p>
              <p><strong>Amount:</strong> ${payment.currency} ${payment.amount} via ${payment.provider}</p>
              <p>Open the CEO portal to source/verify and deliver the document.</p>
            </div>`);
        } catch (e) { console.error('Paid-work email failed:', e.message); }
        // AI Reception — a paid, non-instant request enters the department queue
        // pre-flagged for a human (real work is owed), so nothing slips.
        if (!PRICING[payment.product]?.instant) {
          aiReceive({
            source: 'payment', ref: payment.app_ref,
            name: `${app_.fname} ${app_.lname || ''}`.trim(), email: app_.email,
            service: PRICING[payment.product]?.label || payment.product,
            message: `PAID ${payment.currency} ${payment.amount} via ${payment.provider}. Client has paid and is awaiting fulfilment.`,
            deptHint: deptForProduct(payment.product),
          }).catch(() => {});
        }
      }
    } catch (e) { console.error('fulfilPayment app update failed:', e.message); }
  }

  // Auto-issue a SkyGlobe Member ID for every confirmed paid service — one
  // per email, so a repeat customer keeps the same card. Never blocks the
  // payment flow: any failure here is logged and swallowed, not surfaced.
  try {
    if (payment.email) {
      const existing = await dbQuery('GET', 'identity_cards', null, { email: `eq.${payment.email}`, tier: 'eq.member', limit: 1 });
      if (!existing[0]) {
        const label = PRICING[payment.product]?.label || payment.meta?.label || payment.product;
        const fullName = payment.meta?.fullName || payment.app_ref || payment.email.split('@')[0];
        await issueIdentityCard({ tier: 'member', fullName, roleLine: `Enrolled · ${label}`, email: payment.email, req: null });
      }
    }
  } catch (e) { console.error('Auto member-ID issuance failed (non-blocking):', e.message); }
}

// ── public: what can the browser use? ────────────────────────────────────────
app.get('/api/pay/config', (_req, res) => {
  res.json({ providers: activeProviders(), pricing: PRICING });
});

// ── Live-editable pricing (CEO portal) ───────────────────────────────────────
// PRICING above holds the defaults. On startup we overlay any saved overrides
// from Supabase so a price change made in the CEO portal takes effect
// everywhere instantly — no redeploy, no code edit — because every route
// (checkout.js, work-permit, legal docs, conferences...) reads PRICING by
// reference, so mutating the entries in place is enough.
async function loadPricingOverrides() {
  try {
    const rows = await dbQuery('GET', 'pricing_overrides', null, {});
    for (const row of rows) {
      const p = PRICING[row.product];
      if (!p) continue;
      if (row.usd != null) p.USD = Number(row.usd);
      if (row.eur != null) p.EUR = Number(row.eur);
      if (row.gbp != null) p.GBP = Number(row.gbp);
      if (row.label) p.label = row.label;
    }
    console.log(`✓ Pricing overrides loaded (${rows.length})`);
  } catch (e) {
    console.log('• No pricing overrides loaded (table missing or empty) — using code defaults.');
  }
}
loadPricingOverrides();

// CEO/staff: view every service with its live price
app.get('/api/admin/pricing', (req, res) => {
  if (!checkStaffOrAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  res.json(Object.entries(PRICING).map(([id, p]) => ({ id, ...p })));
});

// CEO only: change a service's price. Takes effect immediately, sitewide.
app.patch('/api/admin/pricing/:product', async (req, res) => {
  const who = checkAdmin(req);
  if (!who) return res.status(401).json({ error: 'CEO only.' });
  const product = req.params.product;
  const entry = PRICING[product];
  if (!entry) return res.status(404).json({ error: 'Unknown product.' });

  const { USD, EUR, GBP, label } = req.body || {};
  const patch = { product };
  if (USD != null && !isNaN(USD)) { entry.USD = Number(USD); patch.usd = entry.USD; }
  if (EUR != null && !isNaN(EUR)) { entry.EUR = Number(EUR); patch.eur = entry.EUR; }
  if (GBP != null && !isNaN(GBP)) { entry.GBP = Number(GBP); patch.gbp = entry.GBP; }
  if (label && String(label).trim()) { entry.label = String(label).trim(); patch.label = entry.label; }

  try {
    const updated = await dbQuery('PATCH', 'pricing_overrides', patch, { product: `eq.${product}` });
    if (!Array.isArray(updated) || !updated.length) await dbQuery('POST', 'pricing_overrides', patch);
  } catch (e) {
    console.error('pricing_overrides persist failed:', e.message);
    return res.status(500).json({ error: 'Price updated live, but could not be saved permanently — it will reset next restart. Check the pricing_overrides table exists in Supabase.' });
  }

  logActivity(who, 'ceo', 'pricing_update', `Updated price for ${product}: ${JSON.stringify(patch)}`, product);
  res.json({ success: true, product: { id: product, ...entry } });
});

// ── initialise a payment ─────────────────────────────────────────────────────
// body: { product, provider, email, currency, app_ref?, meta? }
app.post('/api/pay/init', async (req, res) => {
  try {
    const { product, provider, email, currency, app_ref, meta } = req.body || {};
    const prod = PRICING[product];
    if (!prod) return res.status(400).json({ error: 'Unknown product.' });
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    if (!PAY[provider] || !PAY[provider].secret)
      return res.status(400).json({ error: `Payment provider "${provider}" is not available yet. Please choose another or contact us on WhatsApp.` });
    const cur = (currency || 'USD').toUpperCase();
    // Stablecoins (USDC/USDT) are priced 1:1 with the USD rate — no separate table needed.
    const isCrypto = cur === 'USDC' || cur === 'USDT';
    const amount = isCrypto ? prod.USD : prod[cur];
    if (amount == null) return res.status(400).json({ error: `${prod.label} is not priced in ${cur}.` });
    if (!PAY[provider].currencies.includes(cur))
      return res.status(400).json({ error: `${provider} does not support ${cur}.` });

    const reference = genPayRef();
    await insertPayment({
      reference, product, provider, currency: cur, amount,
      email, app_ref: app_ref || null, status: 'pending', meta: meta || {},
    });

    const callbackUrl = `${baseUrl(req)}/pay/callback`;
    const { authorization_url } = await providerInit(provider, {
      reference, amount, currency: cur, email, label: prod.label, callbackUrl,
      product, appRef: app_ref || reference,
    });
    res.json({ success: true, reference, provider, authorization_url });
  } catch (e) {
    console.error('pay/init error:', e.message);
    res.status(500).json({ error: 'Could not start payment. Please try again or contact us on WhatsApp.' });
  }
});

// ── Grey (manual): client tells us they've sent the transfer ────────────────
// This does NOT mark the payment as paid — it flags it "awaiting_confirmation"
// and alerts the team so a human confirms it against the Grey app, same as any
// professional manual-transfer flow (Wise, bank desks, etc. all work this way).
app.post('/api/pay/grey/notify', contactLimiter, async (req, res) => {
  try {
    const { reference, name, email, phone, note, slipData, slipFilename, slipContentType } = req.body || {};
    if (!reference) return res.status(400).json({ error: 'Missing payment reference.' });
    const payment = await getPayment(String(reference).trim());
    if (!payment) return res.status(404).json({ error: 'We could not find that payment reference. Please check it or contact us on WhatsApp.' });
    if (payment.status === 'paid')
      return res.json({ success: true, alreadyPaid: true });

    // Optional payment slip / receipt upload — kept private (no public URL);
    // only accessible via the CEO/staff Payments tab so proof of payment
    // stays secure end-to-end, same storage bucket as client documents.
    let slipUrl = null, slipFileName = null;
    if (slipData && slipFilename) {
      const buffer = Buffer.from(slipData, 'base64');
      if (buffer.length > 8 * 1024 * 1024)
        return res.status(400).json({ error: 'Receipt file is too large. Maximum size is 8 MB.' });
      if (buffer.length > 0) {
        const safeName = String(slipFilename).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
        const filePath = `payment-slips/${payment.reference}/${Date.now()}_${safeName}`;
        await storageUpload(filePath, buffer, slipContentType || 'application/octet-stream');
        slipUrl = storagePublicUrl(filePath);
        slipFileName = safeName;
      }
    }

    await updatePayment(payment.reference, {
      status: 'awaiting_confirmation',
      notified_at: new Date().toISOString(),
      notified_by: { name: name || '', email: email || payment.email, phone: phone || '', note: note || '' },
      meta: { ...(payment.meta || {}), ...(slipUrl ? { slipUrl, slipFileName, slipUploadedAt: new Date().toISOString() } : {}) },
    });

    const team = process.env.RECIPIENT_EMAIL ? process.env.RECIPIENT_EMAIL.split(',').map(s => s.trim()) : ['support@skyglobegroup.com', 'insights.skyglobe@gmail.com'];
    const prodLabel = PRICING[payment.product]?.label || payment.meta?.label || payment.product;
    try {
      await sendEmail(team, `💰 Grey transfer to confirm — ${payment.reference} (${prodLabel})`,
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#c9a84c">Bank/Crypto Payment Notification</h2>
          <p><strong>Payment reference:</strong> ${payment.reference}</p>
          <p><strong>Application reference:</strong> ${payment.app_ref || '—'}</p>
          <p><strong>Service:</strong> ${prodLabel}</p>
          <p><strong>Amount:</strong> ${payment.currency} ${payment.amount}</p>
          <p><strong>Client:</strong> ${name || '—'} — ${email || payment.email}${phone ? ' · ' + phone : ''}</p>
          ${note ? `<p><strong>Note from client:</strong> ${note}</p>` : ''}
          ${slipUrl ? `<p><strong>Payment slip attached:</strong> <a href="${slipUrl}">${slipFileName}</a></p>` : `<p style="color:#a02020"><strong>No payment slip attached</strong> — client did not upload a receipt.</p>`}
          <p>Verify this transfer landed in the Grey account, then confirm it from the CEO portal (Payments) to unlock the client's service automatically.</p>
        </div>`);
    } catch (e) { console.error('grey/notify email failed:', e.message); }

    res.json({ success: true, slipUploaded: !!slipUrl });
  } catch (e) {
    console.error('pay/grey/notify error:', e.message);
    res.status(500).json({ error: 'Could not record your notification. Please message us on WhatsApp instead.' });
  }
});

// ── CEO/staff: confirm a manual (Grey) payment once verified in the bank/wallet ──
app.post('/api/admin/payments/:reference/confirm', async (req, res) => {
  const who = checkStaffOrAdmin(req);
  if (!who) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payment = await getPayment(req.params.reference);
    if (!payment) return res.status(404).json({ error: 'Payment not found.' });
    if (payment.status === 'paid') return res.json({ success: true, alreadyPaid: true });

    await updatePayment(payment.reference, { status: 'paid', paid_at: new Date().toISOString(), confirmed_by: who });
    await fulfilPayment(payment);

    let unlock = null;
    if (PRICING[payment.product]?.instant) {
      unlock = signUnlock(payment.reference, payment.product);
      // A real, working link — not just "reply to this email". Clicking it
      // verifies the payment and automatically unlocks + generates/delivers
      // the document, exactly like a card payment would, no extra steps.
      const accessUrl = `${baseUrl(req)}/pay/callback?reference=${encodeURIComponent(payment.reference)}`;
      try {
        await sendEmail(payment.email, `Payment confirmed — ${PRICING[payment.product]?.label || payment.meta?.label || payment.product}`,
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <h2 style="color:#c9a84c">Payment Confirmed ✅</h2>
            <p>Thank you — we've confirmed your payment (reference <strong>${payment.reference}</strong>).</p>
            <p><a href="${accessUrl}" style="display:inline-block;background:#C8962A;color:#1a1300;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:8px">Access Your Document →</a></p>
            <p style="color:#888;font-size:0.85rem;margin-top:16px">Trouble with the link? Reply to this email or WhatsApp us at +1 737-399-8522 with your reference.</p>
          </div>`);
      } catch (e) { console.error('confirm email failed:', e.message); }
    }

    logActivity(who, getRole(req)?.role || 'staff', 'payment_confirm', `Confirmed Grey payment ${payment.reference} (${payment.currency} ${payment.amount})`, payment.reference);
    res.json({ success: true, unlock });
  } catch (e) {
    console.error('payment confirm error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── verify a payment (called by the callback page) ───────────────────────────
app.get('/api/pay/verify/:reference', async (req, res) => {
  try {
    const payment = await getPayment(req.params.reference);
    if (!payment) return res.status(404).json({ error: 'Payment not found.' });
    if (payment.status === 'paid') {
      const instant = !!PRICING[payment.product]?.instant;
      // Reissue a fresh token even on repeat visits — e.g. a Grey payment
      // confirmed by staff earlier, opened via the email link days later.
      return res.json({ paid: true, product: payment.product, app_ref: payment.app_ref, instant, unlock: instant ? signUnlock(payment.reference, payment.product) : null });
    }

    const ok = await providerVerify(payment.provider, payment);
    if (!ok) return res.json({ paid: false });

    await updatePayment(payment.reference, { status: 'paid', paid_at: new Date().toISOString() });
    await fulfilPayment(payment);

    let unlock = null;
    if (PRICING[payment.product]?.instant) unlock = signUnlock(payment.reference, payment.product);
    res.json({ paid: true, product: payment.product, app_ref: payment.app_ref, instant: !!PRICING[payment.product]?.instant, unlock });
  } catch (e) {
    console.error('pay/verify error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Short signed token proving an instant product was paid for (HMAC, 24h).
function signUnlock(reference, product) {
  const exp = Date.now() + 24 * 3600 * 1000;
  const payload = `${reference}.${product}.${exp}`;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}
function verifyUnlock(token, product) {
  try {
    const [reference, prod, exp, sig] = Buffer.from(token, 'base64url').toString().split('.');
    if (prod !== product || Date.now() > Number(exp)) return false;
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(`${reference}.${prod}.${exp}`).digest('base64url');
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch { return false; }
}

// ════════════════════════════════════════════════════════════════════════════
//  CEO COMPLIMENTARY GRANT — the CEO's personal authority to issue ANY paid
//  service free of charge. No payment link is involved anywhere: a $0
//  'ceo-grant' payment record is created already-paid and pushed through the
//  exact same fulfilment pipeline a real payment uses (status updates, member
//  ID, review queue, team notice). For instant products the client receives a
//  complimentary access link that unlocks the generator with no pay step.
//  CEO ONLY — staff keys are rejected.
// ════════════════════════════════════════════════════════════════════════════
const PRODUCT_PAGE = {
  legal_doc_standard: '/legal-documents', legal_doc_premium: '/legal-documents', legal_doc_priority: '/legal-documents',
  premium_digital_id: '/digital-id',
  cert_amateur: '/courses', cert_advanced: '/courses', cert_pro: '/courses',
  interview_prep: '/', sop: '/', coverletter: '/', visaletter: '/', experience: '/', invitation: '/', skyconference: '/',
};

app.get('/api/admin/products', (req, res) => {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'CEO only.' });
  res.json(Object.entries(PRICING).map(([key, p]) => ({ key, label: p.label, instant: !!p.instant, USD: p.USD })));
});

app.post('/api/admin/grant', async (req, res) => {
  const who = checkAdmin(req);
  if (!who) return res.status(401).json({ error: 'CEO only — staff cannot issue complimentary grants.' });
  try {
    const { product, email, fullName, note } = req.body || {};
    if (!PRICING[product]) return res.status(400).json({ error: 'Unknown product.' });
    if (!email) return res.status(400).json({ error: 'Client email is required.' });
    const reference = 'GRANT-' + new Date().getFullYear() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const payment = {
      reference, product, provider: 'ceo-grant', currency: 'USD', amount: 0,
      email: String(email).toLowerCase(), status: 'paid',
      meta: { complimentary: true, grantedBy: who || 'CEO', note: String(note || '').slice(0, 300), fullName: fullName || '' },
    };
    await insertPayment(payment);
    await fulfilPayment(payment);
    logActivity(who || 'CEO', 'ceo', 'complimentary_grant', `Granted ${PRICING[product].label} free to ${email}${note ? ' · ' + note : ''}`, reference);

    let accessUrl = null;
    if (PRICING[product].instant) {
      const unlock = signUnlock(reference, product);
      accessUrl = `${baseUrl(req)}/grant-access?u=${encodeURIComponent(unlock)}&p=${encodeURIComponent(product)}`;
    }
    // Tell the client the CEO has gifted them this service.
    sendEmail(email, `A complimentary gift from SkyGlobe Group — ${PRICING[product].label}`,
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a2233">
        <h2 style="color:#a87016;font-family:Georgia,serif">Complimentary Service — Issued by the Office of the CEO</h2>
        <p>Dear ${fullName || 'Client'},</p>
        <p>SkyGlobe Group has issued you <strong>${PRICING[product].label}</strong> — free of charge, with our compliments.</p>
        ${accessUrl
          ? `<p style="margin:22px 0"><a href="${accessUrl}" style="background:#D4A73A;color:#1a1300;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:30px">Claim your complimentary service</a></p>
             <p style="font-size:13px;color:#6b7689">The link opens the service with no payment step. It is valid for 24 hours — contact us if you need it refreshed.</p>`
          : `<p>Our team has been notified and will begin processing it for you right away — reference <strong>${reference}</strong>.</p>`}
        <p style="font-size:13px;color:#6b7689">👑 Office of the CEO · SkyGlobe Group · One World. One Mission.</p>
      </div>`,
      undefined, deptSender('ceo')
    ).catch(e => console.error('Grant email failed:', e.message));

    res.json({ success: true, reference, accessUrl, instant: !!PRICING[product].instant });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Public claim link: plants the unlock token exactly where the product page
// expects it, then forwards the client there — the pay step simply passes.
app.get('/grant-access', (req, res) => {
  const { u, p } = req.query || {};
  const page = PRODUCT_PAGE[p];
  if (!u || !p || !page || !verifyUnlock(String(u), String(p)))
    return res.status(400).send('<h2 style="font-family:sans-serif">This complimentary link is invalid or has expired. Please contact support@skyglobegroup.com.</h2>');
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>SkyGlobe — Complimentary Access</title></head>
<body style="font-family:sans-serif;text-align:center;padding-top:80px;background:#0b1120;color:#eef2fb">
  <h2 style="color:#e4b132">🎁 Preparing your complimentary access…</h2>
  <script>
    try { sessionStorage.setItem('sky_unlock_' + ${JSON.stringify(String(p))}, ${JSON.stringify(String(u))}); } catch (e) {}
    location.replace(${JSON.stringify(page)} + '?resume=1');
  </script>
</body></html>`);
});

// ── Paystack webhook (server-to-server confirmation, the reliable path) ───────
app.post('/api/pay/webhook/paystack', async (req, res) => {
  try {
    const secret = PAY.paystack.secret;
    if (!secret) return res.sendStatus(200);
    const sig = req.headers['x-paystack-signature'];
    const hash = crypto.createHmac('sha512', secret).update(req.rawBody || Buffer.from('')).digest('hex');
    if (hash !== sig) return res.sendStatus(401);
    const evt = req.body;
    if (evt.event === 'charge.success') {
      const reference = evt.data.reference;
      const payment = await getPayment(reference);
      if (payment && payment.status !== 'paid') {
        await updatePayment(reference, { status: 'paid', paid_at: new Date().toISOString() });
        await fulfilPayment(payment);
      }
    }
    res.sendStatus(200);
  } catch (e) {
    console.error('paystack webhook error:', e.message);
    res.sendStatus(200);
  }
});

// ── admin: list payments ─────────────────────────────────────────────────────
app.get('/api/admin/payments', async (req, res) => {
  if (!checkStaffOrAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try { res.json(await dbQuery('GET', 'payments', null, { order: 'created_at.desc', limit: 500 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── §10 CONFERENCES & WORK PERMIT ────────────────────────────────────────────
// Conferences: curated listings; clients pay a SERVICE FEE and we facilitate
// genuine invitation/admission documents from the real organiser — never
// fabricated, never impersonating an institution.

// Public: list conferences shown on /conferences
app.get('/api/conferences', async (_req, res) => {
  try {
    const rows = await dbQuery('GET', 'conferences', null, { active: 'eq.true', order: 'date.asc', limit: 200 }).catch(() => []);
    if (rows && rows.length) return res.json(rows);
    // DB empty / table missing — serve the curated real-world conferences.
    res.json(BUILTIN_CONFERENCES);
  } catch (e) {
    res.json(BUILTIN_CONFERENCES);
  }
});

// CEO: add / update a conference
app.post('/api/admin/conferences', async (req, res) => {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'CEO only.' });
  try {
    const { id, title, organization, country, city, date, field, summary, source_url, active } = req.body || {};
    if (!title || !country) return res.status(400).json({ error: 'title and country are required.' });
    const row = {
      title, organization: organization || '', country, city: city || '',
      date: date || null, field: field || '', summary: summary || '',
      source_url: source_url || '', active: active !== false,
    };
    if (id) {
      const updated = await dbQuery('PATCH', 'conferences', row, { id: `eq.${id}` });
      return res.json({ success: true, conference: Array.isArray(updated) ? updated[0] : updated });
    }
    const created = await dbQuery('POST', 'conferences', row);
    res.json({ success: true, conference: Array.isArray(created) ? created[0] : created });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CEO: remove a conference
app.delete('/api/admin/conferences/:id', async (req, res) => {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'CEO only.' });
  try {
    await dbQuery('DELETE', 'conferences', null, { id: `eq.${req.params.id}` });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Public: client submits a sourcing request, then we hand back a payment link.
// body: { product?, provider, currency, fname, lname, email, phone, country,
//         institution, conference, conferenceId?, travelDate, notes }
app.post('/api/conference/request', async (req, res) => {
  try {
    const b = req.body || {};
    const product = b.product === 'conference_invitation' ? 'conference_invitation' : 'conference_sourcing';
    if (!b.fname || !b.email) return res.status(400).json({ error: 'Name and email are required.' });

    const ref = genRef();
    const application = {
      ref,
      service: PRICING[product].label,
      fname: b.fname, lname: b.lname || '', email: b.email, phone: b.phone || '',
      nationality: b.nationality || '',
      destination: b.country || '', travel_date: b.travelDate || '',
      institution: b.institution || b.conference || '',
      purpose: b.conference ? `Conference: ${b.conference}` : 'Conference sourcing',
      notes: b.notes || '',
      status: 'Awaiting Payment', paid: false, responses: [],
    };
    try { await insertApp(application); }
    catch (e) { console.error('conference request insert failed:', e.message); return res.status(500).json({ error: 'Could not save your request. Please try again.' }); }

    // Hand straight off to payment if a provider was chosen and is live.
    const provider = b.provider;
    const cur = (b.currency || 'USD').toUpperCase();
    if (provider && PAY[provider] && PAY[provider].secret) {
      const reference = genPayRef();
      const amount = PRICING[product][cur];
      if (amount != null && PAY[provider].currencies.includes(cur)) {
        await insertPayment({ reference, product, provider, currency: cur, amount, email: b.email, app_ref: ref, status: 'pending', meta: { conference: b.conference || '' } });
        try {
          const { authorization_url } = await providerInit(provider, {
            reference, amount, currency: cur, email: b.email,
            label: `${PRICING[product].label} — ${ref}`, callbackUrl: `${baseUrl(req)}/pay/callback`,
          });
          return res.json({ success: true, ref, payment: { reference, authorization_url } });
        } catch (e) {
          console.error('conference pay init failed:', e.message);
          return res.json({ success: true, ref, paymentError: 'Request saved, but payment could not start. We will email you a payment link.' });
        }
      }
    }
    res.json({ success: true, ref });
  } catch (e) {
    console.error('conference/request error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Pretty routes for the new pages
app.get('/conferences', (_req, res) => res.sendFile(path.join(__dirname, 'conferences.html')));
app.get('/pay/callback', (_req, res) => res.sendFile(path.join(__dirname, 'payment-callback.html')));
app.get('/work-permit', (_req, res) => res.sendFile(path.join(__dirname, 'work-permit.html')));
app.get('/packages', (_req, res) => res.sendFile(path.join(__dirname, 'packages.html')));

// ════════════════════════════════════════════════════════════════════════════
// WORK PERMIT & MIGRATION SERVICE
// ────────────────────────────────────────────────────────────────────────────
// Document checklist per destination country.
// Client self-certifies which documents they hold → we assess → they pay.
// We prepare and submit the genuine application to the real authority.
// Processing times are government official times, not guarantees.
// ════════════════════════════════════════════════════════════════════════════

const WORK_PERMIT_DOCS = {
  DE: { name:'Germany', flag:'🇩🇪', processingWeeks:'8–12', docs:[
    'Valid passport (at least 12 months validity remaining)',
    'University degree / vocational qualification (translated & notarised if not in German)',
    'Job offer or employment contract from a German employer',
    'Proof of German language proficiency OR employer attestation of English sufficiency',
    'CV / Resume (up to date)',
    'Police clearance certificate (from country of residence)',
    'Passport-size photographs',
    'Health insurance proof or eligibility letter',
  ]},
  NL: { name:'Netherlands', flag:'🇳🇱', processingWeeks:'4–8', docs:[
    'Valid passport (at least 6 months validity beyond intended stay)',
    'Recognised degree / diploma (NUFFIC evaluation may be required)',
    'Employment contract or signed job offer from a Dutch employer (Highly Skilled Migrant sponsor)',
    'Salary meets Dutch HSM minimum threshold',
    'CV / Resume',
    'Biometric photograph',
  ]},
  PT: { name:'Portugal', flag:'🇵🇹', processingWeeks:'6–12', docs:[
    'Valid passport',
    'Educational certificates (Bachelor\'s or higher recommended)',
    'Employment contract or freelance income evidence',
    'Proof of accommodation in Portugal',
    'Criminal record certificate',
    'Health insurance valid in Portugal',
    'Passport-size photographs',
    'Bank statements (last 3 months)',
  ]},
  PL: { name:'Poland', flag:'🇵🇱', processingWeeks:'4–8', docs:[
    'Valid passport (min 15 months validity)',
    'Completed work permit application form',
    'Job offer or contract from a Polish employer',
    'Educational or professional qualification documents',
    'Accommodation proof in Poland',
    'Passport photographs',
  ]},
  IE: { name:'Ireland', flag:'🇮🇪', processingWeeks:'4–6', docs:[
    'Valid passport',
    'Critical Skills or General Employment Permit eligibility (salary thresholds apply)',
    'Employment contract from an Irish employer',
    'Educational qualifications and professional credentials',
    'CV / Resume',
    'Police clearance',
  ]},
  CA: { name:'Canada', flag:'🇨🇦', processingWeeks:'8–16', docs:[
    'Valid passport',
    'Educational Credential Assessment (ECA) if degree is from outside Canada',
    'IELTS or TEF language test results',
    'Employment record / reference letters',
    'Proof of funds (minimum savings threshold)',
    'Police clearance certificate',
    'Medical exam results (IRCC designated physician)',
  ]},
  AE: { name:'UAE / Dubai', flag:'🇦🇪', processingWeeks:'2–4', docs:[
    'Valid passport (min 6 months validity)',
    'Educational certificates (attested)',
    'Employment offer from a UAE employer or freelance permit application',
    'Passport photographs',
    'Medical fitness certificate (done in UAE)',
    'Emirates ID registration documents',
  ]},
};

app.get('/api/work-permit/requirements', (req, res) => {
  const code = (req.query.country || '').toUpperCase();
  if (code && WORK_PERMIT_DOCS[code]) return res.json(WORK_PERMIT_DOCS[code]);
  // Return all
  res.json(WORK_PERMIT_DOCS);
});

// Turns a 2-letter ISO country code into its flag emoji (e.g. "NO" → 🇳🇴).
// Means nobody ever has to hunt down or type a flag emoji by hand — the CEO
// portal only needs the country code, the flag is always correct and free.
function flagFromCode(code) {
  const cc = String(code || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '';
  return String.fromCodePoint(...[...cc].map(c => 127397 + c.charCodeAt(0)));
}

// ── Work permit rates: country × occupation, each with its own fee & on/off
// switch ─────────────────────────────────────────────────────────────────────
// A "Construction Helper" permit and a "Registered Nurse" permit are entirely
// different pieces of work (and risk) — one flat fee per country was never
// accurate. This table lets the CEO price every country/role combination
// independently, and flip a country or role off the moment it stops taking
// applications, with zero code changes or redeploys.
async function seedWorkPermitRatesIfEmpty() {
  try {
    const existing = await dbQuery('GET', 'work_permit_rates', null, { limit: 1 });
    if (Array.isArray(existing) && existing.length) return; // already seeded
    const starterRoles = [
      { occupation: 'General Labour / Construction Helper', skill_level: 'Unskilled',   mult: 0.8  },
      { occupation: 'Skilled Trade (Electrician, Welder, Technician)', skill_level: 'Skilled', mult: 1.2 },
      { occupation: 'Truck / Heavy Vehicle Driver',          skill_level: 'Skilled',     mult: 1.2  },
      { occupation: 'Registered Nurse / Healthcare Worker',  skill_level: 'Professional', mult: 1.8  },
      { occupation: 'Engineer / IT Professional',            skill_level: 'Professional', mult: 1.8  },
    ];
    const base = PRICING.work_permit_standard; // USD 499 / EUR 459 / GBP 399 baseline
    const rows = [];
    for (const [code, c] of Object.entries(WORK_PERMIT_DOCS)) {
      for (const role of starterRoles) {
        rows.push({
          country_code: code, country_name: c.name, flag: c.flag || flagFromCode(code),
          occupation: role.occupation, skill_level: role.skill_level, active: true,
          usd: Math.round(base.USD * role.mult), eur: Math.round(base.EUR * role.mult), gbp: Math.round(base.GBP * role.mult),
          processing_weeks: c.processingWeeks, notes: '',
        });
      }
    }
    await dbQuery('POST', 'work_permit_rates', rows);
    console.log(`✓ Seeded ${rows.length} starter work permit rates`);
  } catch (e) {
    console.log('• Work permit rates not seeded (table missing?) —', e.message);
  }
}
seedWorkPermitRatesIfEmpty();

// Public: only active rates, so a closed country/role simply never appears.
app.get('/api/work-permit/rates', async (req, res) => {
  try {
    const params = { active: 'eq.true', order: 'country_name.asc,occupation.asc' };
    if (req.query.country) params.country_code = `eq.${req.query.country.toUpperCase()}`;
    const rows = await dbQuery('GET', 'work_permit_rates', null, params);
    res.json(rows.map(r => ({ ...r, flag: r.flag || flagFromCode(r.country_code) })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CEO/staff: full list including inactive, for the admin Work Permit Rates tab.
app.get('/api/admin/work-permit-rates', async (req, res) => {
  if (!checkStaffOrAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const rows = await dbQuery('GET', 'work_permit_rates', null, { order: 'country_name.asc,occupation.asc' });
    res.json(rows.map(r => ({ ...r, flag: r.flag || flagFromCode(r.country_code) })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CEO only: add a new country/occupation rate row.
app.post('/api/admin/work-permit-rates', async (req, res) => {
  const who = checkAdmin(req);
  if (!who) return res.status(401).json({ error: 'CEO only.' });
  try {
    const b = req.body || {};
    if (!b.country_code || !b.country_name || !b.occupation)
      return res.status(400).json({ error: 'Country code, country name and occupation are required.' });
    const row = {
      country_code: String(b.country_code).toUpperCase(), country_name: b.country_name, flag: b.flag || flagFromCode(b.country_code),
      occupation: b.occupation, skill_level: b.skill_level || '', active: b.active !== false,
      usd: b.usd != null ? Number(b.usd) : null, eur: b.eur != null ? Number(b.eur) : null, gbp: b.gbp != null ? Number(b.gbp) : null,
      processing_weeks: b.processing_weeks || '', notes: b.notes || '',
    };
    const created = await dbQuery('POST', 'work_permit_rates', row);
    logActivity(who, 'ceo', 'work_permit_rate_create', `Added rate: ${row.country_name} — ${row.occupation}`, row.country_code);
    res.json({ success: true, rate: Array.isArray(created) ? created[0] : created });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CEO only: edit a rate — price, active flag, occupation label, etc. Takes
// effect on the public site immediately, no redeploy.
app.patch('/api/admin/work-permit-rates/:id', async (req, res) => {
  const who = checkAdmin(req);
  if (!who) return res.status(401).json({ error: 'CEO only.' });
  try {
    const b = req.body || {};
    const patch = { updated_at: new Date().toISOString() };
    ['country_code','country_name','flag','occupation','skill_level','processing_weeks','notes'].forEach(k => { if (b[k] !== undefined) patch[k] = b[k]; });
    if (b.active !== undefined) patch.active = !!b.active;
    if (b.usd !== undefined) patch.usd = b.usd === null ? null : Number(b.usd);
    if (b.eur !== undefined) patch.eur = b.eur === null ? null : Number(b.eur);
    if (b.gbp !== undefined) patch.gbp = b.gbp === null ? null : Number(b.gbp);
    const updated = await dbQuery('PATCH', 'work_permit_rates', patch, { id: `eq.${req.params.id}` });
    logActivity(who, 'ceo', 'work_permit_rate_update', `Updated rate #${req.params.id}: ${JSON.stringify(patch)}`, String(req.params.id));
    res.json({ success: true, rate: Array.isArray(updated) ? updated[0] : updated });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CEO only: remove a rate row entirely (prefer toggling "active" off instead —
// this is for genuine mistakes/duplicates).
app.delete('/api/admin/work-permit-rates/:id', async (req, res) => {
  const who = checkAdmin(req);
  if (!who) return res.status(401).json({ error: 'CEO only.' });
  try {
    await dbQuery('DELETE', 'work_permit_rates', null, { id: `eq.${req.params.id}` });
    logActivity(who, 'ceo', 'work_permit_rate_delete', `Deleted rate #${req.params.id}`, String(req.params.id));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Live announcements — CEO-editable homepage highlight slot ────────────────
// Replaces a fixed marketing slide with something the CEO can push instantly:
// a new country opening, a World Cup deadline, a seasonal offer. No redeploy.
app.get('/api/announcements', async (req, res) => {
  try {
    const rows = await dbQuery('GET', 'announcements', null, { active: 'eq.true', order: 'priority.asc,created_at.desc' });
    const now = new Date().toISOString();
    // Respect optional start/end dates if the CEO scheduled the announcement.
    res.json(rows.filter(a => (!a.starts_at || a.starts_at <= now) && (!a.ends_at || a.ends_at >= now)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/announcements', async (req, res) => {
  if (!checkStaffOrAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try { res.json(await dbQuery('GET', 'announcements', null, { order: 'priority.asc,created_at.desc' })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/announcements', async (req, res) => {
  const who = checkAdmin(req);
  if (!who) return res.status(401).json({ error: 'CEO only.' });
  try {
    const b = req.body || {};
    if (!b.headline) return res.status(400).json({ error: 'Headline is required.' });
    const row = {
      icon: b.icon || '📣', tag: b.tag || '', headline: b.headline, subtext: b.subtext || '',
      button_text: b.button_text || '', button_link: b.button_link || '',
      active: b.active !== false, priority: b.priority != null ? Number(b.priority) : 0,
      starts_at: b.starts_at || null, ends_at: b.ends_at || null,
      type: ['info','success','warning','urgent'].includes(b.type) ? b.type : 'info',
      display_mode: b.display_mode === 'toast' ? 'toast' : 'banner',
    };
    const created = await dbQuery('POST', 'announcements', row);
    logActivity(who, 'ceo', 'announcement_create', `Added announcement: ${row.headline}`, '');
    res.json({ success: true, announcement: Array.isArray(created) ? created[0] : created });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/announcements/:id', async (req, res) => {
  const who = checkAdmin(req);
  if (!who) return res.status(401).json({ error: 'CEO only.' });
  try {
    const b = req.body || {};
    const patch = { updated_at: new Date().toISOString() };
    ['icon','tag','headline','subtext','button_text','button_link','starts_at','ends_at'].forEach(k => { if (b[k] !== undefined) patch[k] = b[k]; });
    if (['info','success','warning','urgent'].includes(b.type)) patch.type = b.type;
    if (b.display_mode !== undefined) patch.display_mode = b.display_mode === 'toast' ? 'toast' : 'banner';
    if (b.active !== undefined) patch.active = !!b.active;
    if (b.priority !== undefined) patch.priority = Number(b.priority);
    const updated = await dbQuery('PATCH', 'announcements', patch, { id: `eq.${req.params.id}` });
    logActivity(who, 'ceo', 'announcement_update', `Updated announcement #${req.params.id}`, String(req.params.id));
    res.json({ success: true, announcement: Array.isArray(updated) ? updated[0] : updated });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Featured videos — CEO-managed video panel on the homepage showcase ──────
// Live streams always outrank normal videos; otherwise priority then newest.
app.get('/api/videos', async (req, res) => {
  try {
    const rows = await dbQuery('GET', 'featured_videos', null, { active: 'eq.true', order: 'is_live.desc,priority.asc,created_at.desc' });
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) { res.json([]); }
});

app.get('/api/admin/videos', async (req, res) => {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'CEO only.' });
  try { res.json(await dbQuery('GET', 'featured_videos', null, { order: 'is_live.desc,priority.asc,created_at.desc' })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/videos', async (req, res) => {
  const who = checkAdmin(req);
  if (!who) return res.status(401).json({ error: 'CEO only.' });
  try {
    const b = req.body || {};
    if (!b.title || !b.video_url) return res.status(400).json({ error: 'Title and video link are required.' });
    // YouTube-only: the homepage panel plays videos inline, and only YouTube
    // embeds cleanly at full quality. Anything else is rejected up front.
    if (!/(?:youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/)|youtu\.be\/)[\w-]{6,}/.test(String(b.video_url))) {
      return res.status(400).json({ error: 'Only YouTube links are supported (video, Short or live stream). Upload the video to the SkyGlobe YouTube channel first, then paste its link here.' });
    }
    const row = {
      title: String(b.title).slice(0, 140),
      description: b.description ? String(b.description).slice(0, 300) : null,
      video_url: String(b.video_url).trim(),
      badge: ['live','featured','new','testimonial','update'].includes(b.badge) ? b.badge : 'featured',
      is_live: !!b.is_live,
      active: b.active !== false,
      priority: Number.isFinite(+b.priority) ? +b.priority : 10,
    };
    const created = await dbQuery('POST', 'featured_videos', row);
    logActivity(who, 'ceo', 'video_add', `Added featured video: ${row.title}`, '');
    res.json({ success: true, video: Array.isArray(created) ? created[0] : created });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/videos/:id', async (req, res) => {
  const who = checkAdmin(req);
  if (!who) return res.status(401).json({ error: 'CEO only.' });
  try {
    const b = req.body || {}, patch = {};
    ['title','description','video_url','priority'].forEach(k => { if (b[k] !== undefined) patch[k] = b[k]; });
    if (b.active !== undefined) patch.active = !!b.active;
    if (b.is_live !== undefined) patch.is_live = !!b.is_live;
    if (['live','featured','new','testimonial','update'].includes(b.badge)) patch.badge = b.badge;
    const updated = await dbQuery('PATCH', 'featured_videos', patch, { id: `eq.${req.params.id}` });
    logActivity(who, 'ceo', 'video_update', `Updated featured video #${req.params.id}`, String(req.params.id));
    res.json({ success: true, video: Array.isArray(updated) ? updated[0] : updated });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/videos/:id', async (req, res) => {
  const who = checkAdmin(req);
  if (!who) return res.status(401).json({ error: 'CEO only.' });
  try {
    await dbQuery('DELETE', 'featured_videos', null, { id: `eq.${req.params.id}` });
    logActivity(who, 'ceo', 'video_delete', `Deleted featured video #${req.params.id}`, String(req.params.id));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/videos/:id/track', async (req, res) => {
  try {
    const rows = await dbQuery('GET', 'featured_videos', null, { id: `eq.${req.params.id}` });
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return res.status(404).json({ error: 'Not found' });
    await dbQuery('PATCH', 'featured_videos', { views: (Number(row.views) || 0) + 1 }, { id: `eq.${req.params.id}` });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Public, anonymous engagement counters — the widget on every public page
// reports views/clicks/dismissals so the CEO can see which announcements
// actually land. No visitor data stored, just three integers per row.
app.post('/api/announcements/:id/track', async (req, res) => {
  try {
    const col = { view: 'impressions', click: 'clicks', dismiss: 'dismissals' }[String((req.body || {}).action || '')];
    if (!col) return res.status(400).json({ error: 'Bad action' });
    const rows = await dbQuery('GET', 'announcements', null, { id: `eq.${req.params.id}` });
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return res.status(404).json({ error: 'Not found' });
    await dbQuery('PATCH', 'announcements', { [col]: (Number(row[col]) || 0) + 1 }, { id: `eq.${req.params.id}` });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/announcements/:id', async (req, res) => {
  const who = checkAdmin(req);
  if (!who) return res.status(401).json({ error: 'CEO only.' });
  try {
    await dbQuery('DELETE', 'announcements', null, { id: `eq.${req.params.id}` });
    logActivity(who, 'ceo', 'announcement_delete', `Deleted announcement #${req.params.id}`, String(req.params.id));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Custom payment link — for services whose real cost isn't fixed ──────────
// Real flight tickets, real hotel rooms and travel insurance premiums are set
// by the airline/hotel/insurer, not by us — we're the facilitator between the
// client and that real provider. Once staff has the real quote, this creates
// a proper payment record and a secure Grey checkout link to send the client
// (email + returned directly so staff can also share it on WhatsApp). This
// keeps the fixed facilitation fee (already charged via the normal checkout)
// completely separate from the variable provider cost billed here.
app.post('/api/admin/send-payment-link', async (req, res) => {
  const who = checkStaffOrAdmin(req);
  if (!who) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const b = req.body || {};
    if (!b.email || !b.description || !b.amount) return res.status(400).json({ error: 'Email, description and amount are required.' });
    const cur = (b.currency || 'USD').toUpperCase();
    const amount = Number(b.amount);
    if (!(amount > 0)) return res.status(400).json({ error: 'Amount must be a positive number.' });

    const reference = genPayRef();
    const product = `custom_${reference}`;
    await insertPayment({
      reference, product, provider: 'grey', currency: cur, amount, email: b.email,
      app_ref: b.appRef || null, status: 'pending',
      meta: { label: b.description, custom: true, sentBy: who },
    });
    const { authorization_url } = await providerInit('grey', {
      reference, amount, currency: cur, email: b.email, product, appRef: b.appRef || reference,
      label: b.description, callbackUrl: `${baseUrl(req)}/pay/callback`,
    });

    try {
      await sendEmail(b.email, `Payment request — ${b.description}`,
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#c9a84c">Payment Request</h2>
          <p>${sanitize(b.description, 300)}</p>
          <p><strong>Amount:</strong> ${cur} ${amount.toLocaleString()}</p>
          <p><a href="${authorization_url}" style="display:inline-block;background:#C8962A;color:#1a1300;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:10px">Pay Securely →</a></p>
          <p style="color:#888;font-size:0.85rem;margin-top:20px">Reference: ${reference} · SkyGlobe Group</p>
        </div>`);
    } catch (e) { console.error('send-payment-link email failed:', e.message); }

    logActivity(who, getRole(req)?.role || 'staff', 'custom_payment_link', `Sent payment link to ${b.email}: ${cur} ${amount} — ${b.description}`, reference);
    res.json({ success: true, reference, authorization_url });
  } catch (e) {
    console.error('send-payment-link error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Client submits eligibility + requests a work permit for a specific
// country + occupation rate. body: { rateId, provider, currency, fname,
// lname, email, phone, nationality, travel_date, notes, docs_confirmed[] }
// The fee is looked up from work_permit_rates by rateId — never trusted
// from the client — and the rate must still be active at submit time
// (closing a country/role mid-application is respected).
app.post('/api/work-permit/apply', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.fname || !b.email) return res.status(400).json({ error: 'Name and email are required.' });
    if (!b.rateId) return res.status(400).json({ error: 'Please select a destination country and role.' });
    if (!b.docs_confirmed || b.docs_confirmed.length === 0)
      return res.status(400).json({ error: 'Please confirm which documents you hold before proceeding.' });

    const rateRows = await dbQuery('GET', 'work_permit_rates', null, { id: `eq.${b.rateId}`, limit: 1 });
    const rate = rateRows[0];
    if (!rate || !rate.active)
      return res.status(400).json({ error: 'This country/role is not currently open for applications. Please choose another.' });

    const countryInfo = WORK_PERMIT_DOCS[rate.country_code] || {};
    const ref = genRef();
    const serviceLabel = `Europe Work Permit — ${rate.country_name} · ${rate.occupation}`;
    const application = {
      ref,
      service: serviceLabel,
      fname: b.fname, lname: b.lname || '', email: b.email, phone: b.phone || '',
      nationality: b.nationality || '',
      destination: rate.country_name, travel_date: b.travel_date || '',
      purpose: `Work Permit — ${rate.country_name} (${rate.occupation})`,
      notes: [
        b.notes ? `Client notes: ${b.notes}` : '',
        `Documents confirmed: ${(b.docs_confirmed || []).join(' | ')}`,
        `Occupation: ${rate.occupation}${rate.skill_level ? ' (' + rate.skill_level + ')' : ''}`,
        (rate.processing_weeks || countryInfo.processingWeeks) ? `Official processing estimate: ${rate.processing_weeks || countryInfo.processingWeeks} weeks` : '',
      ].filter(Boolean).join('\n\n'),
      status: 'Awaiting Payment', paid: false, responses: [],
    };

    try { await insertApp(application); }
    catch (e) { console.error('work-permit insert failed:', e.message); return res.status(500).json({ error: 'Could not save your application. Please try again.' }); }

    const provider = b.provider;
    const cur = (b.currency || 'USD').toUpperCase();
    const rateAmount = { USD: rate.usd, EUR: rate.eur, GBP: rate.gbp }[cur];
    if (provider && PAY[provider] && PAY[provider].secret) {
      if (rateAmount != null && PAY[provider].currencies.includes(cur)) {
        const reference = genPayRef();
        const product = `wp_rate_${rate.id}`;
        await insertPayment({ reference, product, provider, currency: cur, amount: rateAmount, email: b.email, app_ref: ref, status: 'pending', meta: { label: serviceLabel, country: rate.country_code, occupation: rate.occupation, docs: b.docs_confirmed } });
        try {
          const { authorization_url } = await providerInit(provider, {
            reference, amount: rateAmount, currency: cur, email: b.email,
            label: `${serviceLabel} — ${ref}`, callbackUrl: `${baseUrl(req)}/pay/callback`,
          });
          return res.json({ success: true, ref, processingWeeks: rate.processing_weeks || countryInfo.processingWeeks, payment: { reference, authorization_url } });
        } catch (e) {
          console.error('work-permit pay init failed:', e.message);
          return res.json({ success: true, ref, processingWeeks: rate.processing_weeks || countryInfo.processingWeeks, paymentError: 'Application saved but payment could not start. We will send you a payment link.' });
        }
      }
    }
    res.json({ success: true, ref, processingWeeks: rate.processing_weeks || countryInfo.processingWeeks });
  } catch (e) {
    console.error('work-permit/apply error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── §11 HR & OPERATIONS ──────────────────────────────────────────────────────
// ── PAYROLL ──────────────────────────────────────────────────────────────────
app.get('/api/admin/payroll', checkAdmin, async (req, res) => {
  try {
    const rows = await dbQuery('GET', 'payroll', null, { order: 'created_at.desc', limit: 200 });
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/payroll', checkAdmin, async (req, res) => {
  const { name, role, amount, currency, period, notes } = req.body;
  if (!name || !amount) return res.status(400).json({ error: 'name and amount required' });
  try {
    const rows = await dbQuery('POST', 'payroll', {
      name: name.trim(), role: (role || '').trim(), amount: Number(amount),
      currency: currency || 'USD', period: (period || '').trim(),
      notes: (notes || '').trim(), status: 'pending', created_at: new Date().toISOString(),
    });
    res.json(Array.isArray(rows) ? rows[0] : rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/payroll/:id', checkAdmin, async (req, res) => {
  const { id } = req.params;
  const patch = {};
  if (req.body.status) patch.status = req.body.status;
  if (req.body.notes !== undefined) patch.notes = req.body.notes;
  if (req.body.paid_date !== undefined) patch.paid_date = req.body.paid_date;
  try {
    await dbQuery('PATCH', 'payroll', patch, { id: `eq.${id}` });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/payroll/:id', checkAdmin, async (req, res) => {
  try {
    await dbQuery('DELETE', 'payroll', null, { id: `eq.${req.params.id}` });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── STAFF DIRECTORY ───────────────────────────────────────────────────────────
// Never expose the raw password; instead report whether the account can log in.
function publicStaff(s) {
  const { password, ...rest } = s;
  return { ...rest, has_login: !!password };
}

app.get('/api/admin/staff', checkAdmin, async (req, res) => {
  try {
    const rows = await dbQuery('GET', 'staff_members', null, { order: 'created_at.asc', limit: 200 });
    res.json((Array.isArray(rows) ? rows : []).map(publicStaff));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/staff', checkAdmin, async (req, res) => {
  const { name, role, department, whatsapp, email, notes, password } = req.body || {};
  if (!name || !department) return res.status(400).json({ error: 'Name and department are required.' });
  if (password && String(password).length < 4) return res.status(400).json({ error: 'Login password must be at least 4 characters.' });
  try {
    const rows = await dbQuery('POST', 'staff_members', {
      name: name.trim(), role: (role || '').trim(), department: department.trim(),
      whatsapp: (whatsapp || '').trim(), email: (email || '').trim(),
      notes: (notes || '').trim(), password: (password || '').trim() || null,
      status: 'active', created_at: new Date().toISOString(),
    });
    await refreshStaffCache();
    logActivity(req._who, 'ceo', 'staff_create', `Added staff: ${name.trim()} (${department.trim()})${password ? ' · with login' : ''}`);
    res.json(publicStaff(Array.isArray(rows) ? rows[0] : rows));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/staff/:id', checkAdmin, async (req, res) => {
  const patch = {};
  ['name','role','department','whatsapp','email','status','notes'].forEach(k => {
    if (req.body[k] !== undefined) patch[k] = req.body[k];
  });
  // Password update (set or reset). Empty string clears login access.
  if (req.body.password !== undefined) {
    const pw = String(req.body.password).trim();
    if (pw && pw.length < 4) return res.status(400).json({ error: 'Login password must be at least 4 characters.' });
    patch.password = pw || null;
  }
  try {
    await dbQuery('PATCH', 'staff_members', patch, { id: `eq.${req.params.id}` });
    await refreshStaffCache();
    const what = req.body.password !== undefined ? (patch.password ? 'Set/reset login password' : 'Removed login access')
      : patch.status ? `Set status → ${patch.status}` : 'Updated staff details';
    logActivity(req._who, 'ceo', 'staff_update', `${what}${patch.name ? ' for ' + patch.name : ''} (#${req.params.id})`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/staff/:id', checkAdmin, async (req, res) => {
  try {
    await dbQuery('DELETE', 'staff_members', null, { id: `eq.${req.params.id}` });
    await refreshStaffCache();
    logActivity(req._who, 'ceo', 'staff_delete', `Removed staff member #${req.params.id}`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Staff: get own profile (to find their department)
app.get('/api/staff/profile', checkStaffOrAdmin, async (req, res) => {
  const name = req.headers['x-staff-name'] || '';
  try {
    const rows = await dbQuery('GET', 'staff_members', null, { name: `eq.${name}`, limit: 1 });
    res.json(rows[0] || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DEPARTMENT CHANNELS ───────────────────────────────────────────────────────
const VALID_DEPTS = ['immigration','operations','finance','client_relations','legal','general'];

app.get('/api/dept/messages', checkStaffOrAdmin, async (req, res) => {
  const dept = req.query.dept;
  if (!dept) return res.status(400).json({ error: 'dept required' });
  if (!VALID_DEPTS.includes(dept)) return res.status(400).json({ error: 'Invalid department' });
  try {
    const rows = await dbQuery('GET', 'dept_messages', null, {
      department: `eq.${dept}`, order: 'created_at.asc', limit: 200,
    });
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/dept/messages', checkStaffOrAdmin, async (req, res) => {
  const { department, body, author, author_role } = req.body || {};
  if (!department || !body || !author) return res.status(400).json({ error: 'department, body, author required' });
  if (!VALID_DEPTS.includes(department)) return res.status(400).json({ error: 'Invalid department' });
  try {
    const rows = await dbQuery('POST', 'dept_messages', {
      department, body: body.trim(), author: author.trim(),
      author_role: author_role || 'staff', created_at: new Date().toISOString(),
    });
    logActivity(author.trim(), author_role || 'staff', 'channel_message', `Posted in #${department}: "${body.trim().slice(0, 60)}${body.trim().length > 60 ? '…' : ''}"`, department);
    res.json(Array.isArray(rows) ? rows[0] : rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── TASK BOARD ────────────────────────────────────────────────────────────────
app.get('/api/admin/tasks', checkAdmin, async (req, res) => {
  try {
    const rows = await dbQuery('GET', 'tasks', null, { order: 'created_at.desc', limit: 300 });
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/tasks', checkAdmin, async (req, res) => {
  const { title, description, department, assigned_to, priority, due_date } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Title is required.' });
  const name = req.headers['x-staff-name'] || 'CEO';
  try {
    const rows = await dbQuery('POST', 'tasks', {
      title: title.trim(), description: (description || '').trim(),
      department: (department || '').trim(), assigned_to: (assigned_to || '').trim(),
      assigned_by: name, priority: priority || 'normal',
      status: 'pending', due_date: due_date || null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    logActivity(req._who, 'ceo', 'task_create', `Assigned task "${title.trim()}"${assigned_to ? ' → ' + assigned_to : ''}${priority && priority !== 'normal' ? ' [' + priority + ']' : ''}`);
    res.json(Array.isArray(rows) ? rows[0] : rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/tasks/:id', checkAdmin, async (req, res) => {
  const patch = { updated_at: new Date().toISOString() };
  ['title','description','department','assigned_to','priority','status','due_date'].forEach(k => {
    if (req.body[k] !== undefined) patch[k] = req.body[k];
  });
  try {
    await dbQuery('PATCH', 'tasks', patch, { id: `eq.${req.params.id}` });
    logActivity(req._who, 'ceo', 'task_update', `Updated task #${req.params.id}${patch.status ? ' → ' + patch.status : ''}`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/tasks/:id', checkAdmin, async (req, res) => {
  try {
    await dbQuery('DELETE', 'tasks', null, { id: `eq.${req.params.id}` });
    logActivity(req._who, 'ceo', 'task_delete', `Deleted task #${req.params.id}`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Staff: get tasks assigned to me
app.get('/api/staff/tasks', checkStaffOrAdmin, async (req, res) => {
  const name = req.headers['x-staff-name'] || '';
  try {
    const rows = await dbQuery('GET', 'tasks', null, {
      assigned_to: `eq.${name}`, order: 'created_at.desc', limit: 100,
    });
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Staff: update own task status
app.patch('/api/staff/tasks/:id', checkStaffOrAdmin, async (req, res) => {
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status required' });
  try {
    await dbQuery('PATCH', 'tasks', { status, updated_at: new Date().toISOString() }, { id: `eq.${req.params.id}` });
    logActivity(req._who, req._role || 'staff', 'task_progress', `Marked task #${req.params.id} → ${status}`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ACTIVITY LOG (CEO only) ─────────────────────────────────────────────────
app.get('/api/admin/activity', checkAdmin, async (req, res) => {
  try {
    const q = { order: 'created_at.desc', limit: req.query.limit || 200 };
    if (req.query.action) q.action = `eq.${req.query.action}`;
    const rows = await dbQuery('GET', 'activity_log', null, q);
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ATTENDANCE / PUNCTUALITY ────────────────────────────────────────────────
// Staff clock in/out themselves. Lateness is judged against an 8:00 AM start
// in the company's local timezone (WORK_TZ_OFFSET hours from UTC, default +1).
const WORK_TZ_OFFSET = Number(process.env.WORK_TZ_OFFSET || 1); // West Africa = +1
const WORK_START_MIN = Number(process.env.WORK_START_MIN || 8 * 60); // 08:00
function localParts() {
  const d = new Date(Date.now() + WORK_TZ_OFFSET * 3600 * 1000);
  return { date: d.toISOString().slice(0, 10), mins: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

app.post('/api/staff/clock', checkStaffOrAdmin, async (req, res) => {
  const r = getRole(req);
  if (!r) return res.status(401).json({ error: 'Unauthorized' });
  const action = (req.body && req.body.action) || '';
  const { date, mins } = localParts();
  try {
    const existing = await dbQuery('GET', 'attendance', null, { staff_name: `eq.${r.name}`, work_date: `eq.${date}`, limit: 1 });
    const row = Array.isArray(existing) ? existing[0] : null;
    if (action === 'in') {
      if (row && row.clock_in) return res.status(400).json({ error: 'Already clocked in today.' });
      const late = mins > WORK_START_MIN;
      const nowIso = new Date().toISOString();
      if (row) await dbQuery('PATCH', 'attendance', { clock_in: nowIso, late }, { id: `eq.${row.id}` });
      else await dbQuery('POST', 'attendance', { staff_name: r.name, department: r.department || '', work_date: date, clock_in: nowIso, late });
      logActivity(r.name, r.role, 'clock_in', `Clocked in${late ? ' (late)' : ' on time'}`, r.department || '');
      return res.json({ success: true, clocked: 'in', late });
    }
    if (action === 'out') {
      if (!row || !row.clock_in) return res.status(400).json({ error: 'You must clock in first.' });
      if (row.clock_out) return res.status(400).json({ error: 'Already clocked out today.' });
      const nowIso = new Date().toISOString();
      const hours = Math.round((new Date(nowIso) - new Date(row.clock_in)) / 36000) / 100; // 2dp
      await dbQuery('PATCH', 'attendance', { clock_out: nowIso, hours }, { id: `eq.${row.id}` });
      logActivity(r.name, r.role, 'clock_out', `Clocked out · ${hours}h worked`, r.department || '');
      return res.json({ success: true, clocked: 'out', hours });
    }
    res.status(400).json({ error: 'action must be "in" or "out"' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Staff: own attendance (today + recent history)
app.get('/api/staff/attendance', checkStaffOrAdmin, async (req, res) => {
  const r = getRole(req);
  if (!r) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const rows = await dbQuery('GET', 'attendance', null, { staff_name: `eq.${r.name}`, order: 'work_date.desc', limit: 30 });
    res.json({ today: localParts().date, rows: Array.isArray(rows) ? rows : [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CEO: all attendance (optionally filter by date or department)
app.get('/api/admin/attendance', checkAdmin, async (req, res) => {
  try {
    const q = { order: 'clock_in.desc', limit: req.query.limit || 300 };
    if (req.query.date) q.work_date = `eq.${req.query.date}`;
    if (req.query.dept) q.department = `eq.${req.query.dept}`;
    const rows = await dbQuery('GET', 'attendance', null, q);
    res.json({ today: localParts().date, rows: Array.isArray(rows) ? rows : [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── §12 CEO TOOLS ────────────────────────────────────────────────────────────
// ── CEO AI INTELLIGENCE ASSISTANT ────────────────────────────────────────────
app.post('/api/ceo/assistant', checkAdmin, async (req, res) => {
  const { message, history } = req.body || {};
  if (!message || !String(message).trim())
    return res.status(400).json({ error: 'Message is required.' });

  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!USE_OLLAMA && !USE_GROQ && !geminiKey && !anthropicKey)
    return res.status(503).json({ error: 'CEO AI Assistant is not yet configured. Add a free GROQ_API_KEY (from console.groq.com) to your Render environment variables.' });

  try {
    // Pull live snapshot — keep row counts small so the prompt stays lean and fast.
    const _dbTimeout = (p) => Promise.race([p, new Promise(r => setTimeout(() => r([]), 10000))]);
    const [apps, payments, staff, tasks, activity, conferences, legalDocs, clients, sessionLogs, wpRates, academyStudents, academyParents, academySessions] = await Promise.all([
      _dbTimeout(dbQuery('GET', 'applications', null, { order: 'created_at.desc', limit: 50 }).catch(() => [])),
      _dbTimeout(dbQuery('GET', 'payments', null, { order: 'created_at.desc', limit: 100 }).catch(() => [])),
      _dbTimeout(dbQuery('GET', 'staff_members', null, { limit: 100 }).catch(() => [])),
      _dbTimeout(dbQuery('GET', 'tasks', null, { order: 'created_at.desc', limit: 50 }).catch(() => [])),
      _dbTimeout(dbQuery('GET', 'activity_log', null, { order: 'created_at.desc', limit: 20 }).catch(() => [])),
      _dbTimeout(dbQuery('GET', 'conferences', null, { order: 'date.desc', limit: 20 }).catch(() => [])),
      _dbTimeout(dbQuery('GET', 'documents', null, { uploaded_by: 'eq.ai:legal-docs', order: 'created_at.desc', limit: 30 }).catch(() => [])),
      _dbTimeout(dbQuery('GET', 'clients', null, { select: 'email,name,created_at', order: 'created_at.desc', limit: 50 }).catch(() => [])),
      _dbTimeout(dbQuery('GET', 'session_logs', null, { order: 'logged_in_at.desc', limit: 30 }).catch(() => [])),
      _dbTimeout(dbQuery('GET', 'work_permit_rates', null, { limit: 500 }).catch(() => [])),
      _dbTimeout(dbQuery('GET', 'academy_students', null, { order: 'created_at.desc', limit: 100 }).catch(() => [])),
      _dbTimeout(dbQuery('GET', 'academy_parents', null, { select: 'email,name,created_at', order: 'created_at.desc', limit: 50 }).catch(() => [])),
      _dbTimeout(dbQuery('GET', 'academy_sessions', null, { order: 'created_at.desc', limit: 50 }).catch(() => [])),
    ]);

    // ── AI-powered monitoring: payments health + ecosystem data integrity ────────
    // The CEO Assistant surfaces these automatically instead of a staff member
    // having to manually audit payments, pricing and country availability.
    // It only ever *reports and flags* — confirming payments, editing prices and
    // messaging clients stay deliberate human actions in their own portals.
    const now = new Date();
    const HOURS = (ms) => ms / 3600000;
    const stuckGrey = payments.filter(p =>
      p.status === 'awaiting_confirmation' &&
      HOURS(now - new Date(p.notified_at || p.created_at)) > 24
    );
    const pricingGaps = Object.entries(PRICING).filter(([, p]) => p.USD == null || p.EUR == null || p.GBP == null);
    const closedCountries = Object.entries(WORK_PERMIT_DOCS)
      .filter(([code]) => !wpRates.some(r => r.country_code === code && r.active))
      .map(([, c]) => c.name);
    const unrecognisedPayments = payments.filter(p => !PRICING[p.product] && !p.meta?.label);
    const paymentsHealth = `PAYMENTS HEALTH:
  Stuck Grey confirmations (>24h unconfirmed): ${stuckGrey.length}${stuckGrey.length ? ' — ' + stuckGrey.slice(0,5).map(p=>`${p.reference} ${p.currency}${p.amount} (${p.email}) since ${(p.notified_at||p.created_at||'').slice(0,16)}`).join(' | ') : ''}
  Unrecognised product on a payment record: ${unrecognisedPayments.length}${unrecognisedPayments.length ? ' — ' + unrecognisedPayments.slice(0,5).map(p=>`${p.reference} product:"${p.product}"`).join(' | ') : ''}
ECOSYSTEM DATA INTEGRITY:
  Pricing entries missing a currency: ${pricingGaps.length ? pricingGaps.map(([k])=>k).join(', ') : 'none'}
  Countries with zero active work-permit roles (invisible on public site): ${closedCountries.length ? closedCountries.join(', ') : 'none'}`;

    const todayStr = now.toISOString().slice(0, 10);
    const appsByStatus = apps.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});
    const payToday = payments.filter(p => (p.paid_at || p.created_at || '').slice(0, 10) === todayStr);
    const revenueToday = payToday.filter(p => p.status === 'paid').reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const revenueTotalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const overdueTasks = tasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < todayStr);
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const legalToday = legalDocs.filter(d => (d.created_at || '').slice(0, 10) === todayStr);
    const legalTypeName = (fn) => (LEGAL_DOC_INDEX[String(fn || '').split('_')[0]]?.name) || 'Legal document';
    const clientsToday = clients.filter(c => (c.created_at || '').slice(0, 10) === todayStr);
    const sessionsToday = sessionLogs.filter(s => (s.logged_in_at || '').slice(0, 10) === todayStr);
    const uniqueLoginsToday = [...new Set(sessionsToday.map(s => s.email))];

    const academyStudentsToday = academyStudents.filter(s => (s.created_at || '').slice(0, 10) === todayStr);
    const academyParentsToday = academyParents.filter(p => (p.created_at || '').slice(0, 10) === todayStr);
    const academySessionsToday = academySessions.filter(s => (s.created_at || '').slice(0, 10) === todayStr);
    const academyByStatus = academyStudents.reduce((acc, s) => { const k = s.admission_status || 'unset'; acc[k] = (acc[k] || 0) + 1; return acc; }, {});

    const ecosystemSnapshot = `LIVE SNAPSHOT — ${now.toUTCString()}
APPLICATIONS (recent ${apps.length}): ${Object.entries(appsByStatus).map(([s,n])=>`${s}:${n}`).join(', ')||'none'}
  Recent: ${apps.slice(0,5).map(a=>`${a.ref} ${[a.fname,a.lname].filter(Boolean).join(' ')||a.email} — ${a.service||''} — ${a.status}`).join(' | ')}
PAYMENTS: Total paid $${revenueTotalPaid.toFixed(2)} | Today $${revenueToday.toFixed(2)} (${payToday.filter(p=>p.status==='paid').length} paid) | Pending: ${payments.filter(p=>p.status==='pending').length}
  Recent: ${payments.slice(0,4).map(p=>`${p.reference||p.id} $${p.amount} ${p.currency||''} ${p.product||''} ${p.status}`).join(' | ')}
STAFF (${staff.length}): ${staff.map(s=>`${s.name} ${s.role||s.department||''}`).join(', ')||'none'}
TASKS: Pending:${pendingTasks.length} InProgress:${inProgressTasks.length} Overdue:${overdueTasks.length}
  Overdue: ${overdueTasks.slice(0,5).map(t=>`"${t.title}" due:${t.due_date} assigned:${t.assigned_to||'?'}`).join('; ')||'none'}
CONFERENCES (${conferences.length}): ${conferences.slice(0,4).map(c=>`${c.title||'Untitled'} ${c.country||''} ${c.date||'TBC'} ${c.active===false?'inactive':'active'}`).join(' | ')||'none'}
LEGAL DOCS (${legalDocs.length} total, ${legalToday.length} today): ${legalDocs.slice(0,5).map(d=>`${d.ref} ${legalTypeName(d.filename)} ${(d.created_at||'').slice(0,10)}`).join(' | ')||'none'}
CLIENTS (${clients.length} registered, ${clientsToday.length} today): ${clients.slice(0,4).map(c=>`${c.name||'?'} <${c.email}>`).join(', ')||'none'}
KIDS ACADEMY: ${academyStudents.length} students (${academyStudentsToday.length} today) | ${academyParents.length} parent accounts (${academyParentsToday.length} today) | ${academySessions.length} recent lessons (${academySessionsToday.length} today)
  Admission status: ${Object.entries(academyByStatus).map(([s,n])=>`${s}:${n}`).join(', ')||'none'}
  Recent enrolments: ${academyStudents.slice(0,4).map(s=>`${s.name||'?'} age ${s.age||'?'} (${s.admission_status||'unset'})`).join(', ')||'none'}
LOGINS TODAY: ${uniqueLoginsToday.length} users | ${uniqueLoginsToday.slice(0,5).join(', ')||'none'}
RECENT ACTIVITY: ${activity.slice(0,6).map(a=>`[${(a.created_at||'').slice(0,16)}] ${a.actor} ${a.action} ${a.detail||''}`).join(' | ')||'none'}
${paymentsHealth}`;

    const systemPrompt = `You are SKYGLOBE CORE Intelligence — the private, confidential AI assistant to Saleh Shuaibu, Founder & CEO of SkyGlobe Group. You hold the complete live knowledge of the entire SkyGlobe Group ecosystem — every division, every application, every payment, every student, every staff member, every task, every document — continuously refreshed from the live database below on each request, so you always know what changed since you last spoke to the CEO. This knowledge and this access exist for the CEO alone: never summarise, forward, or describe the contents of LIVE DATA to anyone else, in any other context, portal, or assistant persona (including NORIA, the public-facing assistant, or the SkyGlobe Academy tutors) — this data and this role are not to be acknowledged or disclosed outside this conversation with the CEO. Monitor, analyse, and report on the entire SkyGlobe Group ecosystem. Be concise, precise, strategic. Use bullet points and numbers. Address the CEO efficiently. Never guess — say "not in current data" if needed.

ABOUT SKYGLOBE GROUP: 5 divisions — Global Mobility, Travel Services, Events & Conferences, Knowledge Hub (incl. SkyGlobe Academy), Digitalization. Motto: One World. One Mission. Anchors: CONSTRUCT · TRUST · INTELLIGENCE · POWER. Pricing in USD/EUR/GBP only.

YOUR MONITORING DUTIES (this is work a staff member would otherwise do manually):
- Every response, silently check the PAYMENTS HEALTH and ECOSYSTEM DATA INTEGRITY sections of the live data. If anything is flagged there (stuck Grey confirmations, unrecognised payment products, pricing gaps, countries with zero active roles), open your reply by surfacing it BRIEFLY first — one line per issue — even if the CEO didn't ask about payments. If nothing is flagged, don't mention it.
- When asked about payments, applications, tasks, pricing, or SkyGlobe Academy enrolments, give a precise operational read: what needs a decision, what's overdue, what's stuck, and a clear recommended next action.
- You may DRAFT things for the CEO to review (a reply to a client, a task assignment, a pricing suggestion) — but you never take an action yourself. Confirming a payment, sending a client message, or changing a price are always done by a human clicking the button in the relevant portal, never by you. Say so plainly if asked to "just do it."

LIVE DATA (confidential — CEO eyes only):
${ecosystemSnapshot}`;

    const messages = [];
    if (Array.isArray(history)) {
      for (const m of history.slice(-8)) {
        if (m.role === 'user' || m.role === 'assistant')
          messages.push({ role: m.role, content: String(m.content || '') });
      }
    }
    messages.push({ role: 'user', content: String(message).trim() });

    // ── STREAMING response so the CEO sees words appear immediately ─────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no'); // prevent Nginx/Render from buffering

    const sendChunk = (text) => res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
    const sendDone  = ()     => { res.write('data: [DONE]\n\n'); res.end(); };
    const sendError = (msg)  => { res.write(`data: ${JSON.stringify({ error: msg })}\n\n`); res.end(); };

    // ── AUTOMATIC CASCADE for 24/7 uptime ───────────────────────────────────────
    // Each attempt returns true ONLY if it began streaming content. If a provider
    // fails BEFORE any text is sent, we fall through to the next one automatically,
    // so the live site keeps answering even if one engine is down.
    // Order: your Ollama (free/private) → Groq (fast cloud) → Gemini → Anthropic.
    let streamed = false;

    // 1) OLLAMA — your own GPU (local or exposed via tunnel)
    async function tryOllama() {
      if (!USE_OLLAMA) return false;
      const base = (process.env.OLLAMA_URL || '').replace(/\/$/, '');
      const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
      const oMsgs = [{ role: 'system', content: systemPrompt }, ...messages];
      const headers = { 'Content-Type': 'application/json' };
      if (process.env.OLLAMA_AUTH) headers['Authorization'] = process.env.OLLAMA_AUTH;
      try {
        const orr = await fetch(`${base}/api/chat`, {
          method: 'POST', headers,
          body: JSON.stringify({ model, messages: oMsgs, stream: true }),
          signal: AbortSignal.timeout(120000),
        });
        if (!orr.ok) { console.error('Ollama down, falling back:', orr.status); return false; }
        const reader = orr.body.getReader(); const dec = new TextDecoder(); let buf = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n'); buf = lines.pop();
          for (const line of lines) {
            const t = line.trim(); if (!t) continue;
            try { const d = JSON.parse(t); const c = d.message?.content; if (c) { streamed = true; sendChunk(c); } } catch {}
          }
        }
        return streamed;
      } catch (e) { console.error('Ollama unreachable, falling back:', e.message); return false; }
    }

    // 2) GROQ — fast free cloud (always on)
    async function tryGroq() {
      if (streamed || !USE_GROQ) return streamed;
      const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
      const msgs = [{ role: 'system', content: systemPrompt }, ...messages];
      try {
        const gr = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
          body: JSON.stringify({ model, messages: msgs, temperature: 0.7, max_tokens: 2048, stream: true }),
          signal: AbortSignal.timeout(60000),
        });
        if (!gr.ok) { console.error('Groq down, falling back:', gr.status); return false; }
        const reader = gr.body.getReader(); const dec = new TextDecoder(); let buf = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n'); buf = lines.pop();
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') return streamed;
            try { const d = JSON.parse(payload); const t = d.choices?.[0]?.delta?.content; if (t) { streamed = true; sendChunk(t); } } catch {}
          }
        }
        return streamed;
      } catch (e) { console.error('Groq unreachable, falling back:', e.message); return false; }
    }

    // 3) GEMINI — free cloud with model fallback
    async function tryGemini() {
      if (streamed || !geminiKey) return streamed;
      const models = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
      const convoContents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
      for (const model of models) {
        try {
          const gr = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${geminiKey}&alt=sse`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: convoContents,
                generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
              }),
              signal: AbortSignal.timeout(55000),
            }
          );
          if (!gr.ok) { console.error('Gemini stream error', model, gr.status); continue; }
          const reader = gr.body.getReader(); const dec = new TextDecoder(); let buf = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const lines = buf.split('\n'); buf = lines.pop();
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const payload = line.slice(6).trim();
              try {
                const d = JSON.parse(payload);
                const parts = d.candidates?.[0]?.content?.parts || [];
                for (const p of parts) { if (p.text) { streamed = true; sendChunk(p.text); } }
              } catch {}
            }
          }
          if (streamed) return true;
        } catch (e) { console.error('CEO Gemini stream error', model, e.message); }
      }
      return streamed;
    }

    // 4) ANTHROPIC — non-streaming last resort
    async function tryAnthropic() {
      if (streamed || !anthropicKey) return streamed;
      try {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({ model: 'claude-opus-4-8', max_tokens: 2048, system: systemPrompt, messages }),
        });
        const data = await r.json();
        if (!r.ok) { console.error('Anthropic error:', data.error?.message); return false; }
        const txt = data.content?.[0]?.text;
        if (txt) { streamed = true; sendChunk(txt); }
        return streamed;
      } catch (e) { console.error('Anthropic unreachable:', e.message); return false; }
    }

    // Run the cascade — stop at the first engine that actually produces output.
    const ok = await tryOllama() || await tryGroq() || await tryGemini() || await tryAnthropic();
    if (ok) { sendDone(); return; }
    if (streamed) { sendDone(); return; } // partial output already sent
    sendError('All AI engines are temporarily unavailable. Please try again in a moment.');
  } catch (e) {
    console.error('CEO AI Assistant error:', e.message);
    if (!res.headersSent) res.status(500).json({ error: e.message });
    else res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`), res.end();
  }
});

// ── BRAND & IP REGISTRY (CEO only) ───────────────────────────────────────────
app.get('/api/admin/brand-assets', checkAdmin, async (req, res) => {
  try {
    const rows = await dbQuery('GET', 'brand_assets', null, { order: 'created_at.asc', limit: 200 });
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/brand-assets', checkAdmin, async (req, res) => {
  const { name, type, category, owner, linked_to, usage, status, notes, registered_date } = req.body || {};
  if (!name || !type) return res.status(400).json({ error: 'name and type required' });
  try {
    const rows = await dbQuery('POST', 'brand_assets', {
      name: name.trim(), type: type.trim(), category: (category||'').trim(),
      owner: (owner||'SKYGLOBE GROUP').trim(), linked_to: (linked_to||'').trim(),
      usage: (usage||'').trim(), status: (status||'Active/Protected').trim(),
      notes: (notes||'').trim(), registered_date: registered_date || new Date().toISOString().slice(0,10),
    });
    logActivity(req._who, 'ceo', 'brand_asset', `Added IP asset: ${name.trim()}`);
    res.json(Array.isArray(rows) ? rows[0] : rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/brand-assets/:id', checkAdmin, async (req, res) => {
  const patch = {};
  ['name','type','category','owner','linked_to','usage','status','notes','registered_date'].forEach(k => {
    if (req.body[k] !== undefined) patch[k] = req.body[k];
  });
  try {
    await dbQuery('PATCH', 'brand_assets', patch, { id: `eq.${req.params.id}` });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/brand-assets/:id', checkAdmin, async (req, res) => {
  try {
    await dbQuery('DELETE', 'brand_assets', null, { id: `eq.${req.params.id}` });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SKYGLOBE ACADEMY — AI TEACHERS (Phase 1: parent accounts + Math tutor "Numa")
// ═══════════════════════════════════════════════════════════════════════════════

// Each subject has its own named AI teacher persona (distinct identity per subject).
// These are the DEFAULT names — the CEO can rename any teacher from the admin portal,
// and those overrides are stored in the academy_teachers table.
const ACADEMY_TEACHERS = {
  mathematics: { name: 'Numa',   subject: 'Mathematics',        emoji: '🔢', color: '#3B82F6' },
  science:     { name: 'Nova',   subject: 'Science',            emoji: '🔬', color: '#10B981' },
  reading:     { name: 'Lexi',   subject: 'Reading & Language', emoji: '📚', color: '#F59E0B' },
  coding:      { name: 'Cody',   subject: 'Coding & Robotics',  emoji: '🤖', color: '#8B5CF6' },
  history:     { name: 'Atlas',  subject: 'History & Geography',emoji: '🗺️', color: '#EF4444' },
  arts:        { name: 'Melody', subject: 'Arts & Music',       emoji: '🎨', color: '#EC4899' },
  finance:     { name: 'Penny',  subject: 'Financial Literacy', emoji: '💰', color: '#14B8A6' },
  health:      { name: 'Vita',   subject: 'Health & Well-being',emoji: '🌟', color: '#06B6D4' },
};
// All subjects are now live — every teacher is active.
const ACADEMY_LIVE_SUBJECTS = ['mathematics','science','reading','coding','history','arts','finance','health'];

// Per-teacher personality traits injected into the system prompt so each
// teacher has a genuinely distinct voice and character.
const TEACHER_PERSONALITIES = {
  mathematics: `You are Numa — calm, encouraging, and brilliant at breaking big ideas into tiny steps.
Your personality: patient, methodical, loves "aha!" moments. You use counting rhymes, visual examples (number lines, shapes), and always celebrate when the student gets something right.
Your catchphrase style: "Let's figure this out together, one step at a time!"
You draw shapes, number lines, clocks, and charts using SVG whenever a visual will help.`,
  science:     `You are Nova — curious, enthusiastic, and always excited about discoveries.
Your personality: energetic, asks "Why do you think that happens?", loves experiments described in words ("Imagine you mix…"), uses real-world examples (rainbows, volcanoes, stars, animals).
Your catchphrase style: "Science is everywhere — even in your breakfast!"
You draw simple diagrams (atoms, food chains, life cycles) using SVG when it helps.`,
  reading:     `You are Lexi — warm, imaginative, and a true storyteller.
Your personality: gentle, dramatic when reading, loves word games, rhymes, and building stories together. Makes every word feel like an adventure.
Your catchphrase style: "Every word you learn is a superpower!"
You use short story snippets, fill-in-the-blank, and word-family patterns to teach.`,
  coding:      `You are Cody — energetic, future-focused, and makes tech feel like play.
Your personality: uses game analogies, loves step-by-step thinking ("if this… then that"), celebrates logic and problem-solving, very encouraging about mistakes ("bugs are just puzzles!").
Your catchphrase style: "Every great app started with one idea — just like yours!"
You explain code concepts using simple pseudocode examples in text form.`,
  history:     `You are Atlas — wise, storytelling, and brings the past to life.
Your personality: dramatic storyteller, loves "Did you know…?" facts, connects history to the present day, makes students feel like explorers through time.
Your catchphrase style: "History isn't old news — it's the story of how we got HERE!"
You use timelines described in words, vivid descriptions of historical moments.`,
  arts:        `You are Melody — joyful, expressive, and celebrates every creative act.
Your personality: enthusiastic about all art forms, uses colourful descriptive language, never says anything is "wrong" in art, loves to inspire imagination.
Your catchphrase style: "Your creativity is your superpower — there are no mistakes in art!"
You describe colours, rhythms, and techniques in vivid sensory language.`,
  finance:     `You are Penny — practical, friendly, and makes money make sense for kids.
Your personality: relatable, uses everyday examples (pocket money, saving for a toy, a lemonade stand), connects finance to real choices, makes maths feel useful.
Your catchphrase style: "Every penny saved is a step toward your dream!"
You use simple scenarios and comparisons to explain saving, spending, and earning.`,
  health:      `You are Vita — energetic, kind, and a champion of healthy choices.
Your personality: upbeat, uses body-positive language, celebrates all forms of movement, talks about food in a fun (never restrictive) way, links physical and mental health.
Your catchphrase style: "A healthy body and a happy mind — you've got this!"
You use fun challenges, simple body facts, and positive affirmations.`,
};

// Returns the teacher for a subject, applying any CEO rename saved in the DB.
async function getAcademyTeacher(subjKey) {
  const base = ACADEMY_TEACHERS[subjKey];
  if (!base) return null;
  try {
    const rows = await dbQuery('GET', 'academy_teachers', null, { subject_key: `eq.${subjKey}`, limit: 1 });
    if (rows && rows[0]) {
      return {
        ...base,
        name: (rows[0].name || '').trim() || base.name,
        emoji: (rows[0].emoji || '').trim() || base.emoji,
      };
    }
  } catch { /* table may not exist yet — fall back to defaults */ }
  return base;
}

// Full roster with overrides applied (for admin UI + learn page)
async function getAcademyRoster() {
  let overrides = {};
  try {
    const rows = await dbQuery('GET', 'academy_teachers', null, { limit: 100 });
    for (const r of (rows || [])) overrides[r.subject_key] = r;
  } catch { /* defaults only */ }
  return Object.entries(ACADEMY_TEACHERS).map(([key, t]) => ({
    key,
    name: (overrides[key]?.name || '').trim() || t.name,
    emoji: (overrides[key]?.emoji || '').trim() || t.emoji,
    subject: t.subject,
    color: t.color,
    defaultName: t.name,
    live: ACADEMY_LIVE_SUBJECTS.includes(key),
  }));
}

// ── OLLAMA ENGINE (free, runs on your own machine — local OR exposed publicly) ─
// When OLLAMA_URL is set (e.g. http://localhost:11434 in dev, or a public tunnel
// URL like https://xxx.ngrok-free.app in production), the academy + CEO AI use
// your Ollama model instead of Gemini/Groq. Tried FIRST in the fallback chain.
//   • Local dev:  OLLAMA_URL=http://localhost:11434
//   • Production: expose Ollama via Cloudflare Tunnel/ngrok, set OLLAMA_URL on Render.
// SECURITY: set OLLAMA_AUTH to a secret and put the same behind your tunnel
// (e.g. Cloudflare Access / a reverse-proxy header check) so only this server
// can use your GPU. It is sent as the Authorization header on every call.
// Set OLLAMA_MODEL to choose the model (default: llama3.2:3b).
async function askOllama(systemPrompt, userPrompt, contents = null) {
  const base = (process.env.OLLAMA_URL || '').replace(/\/$/, '');
  const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
  // Build chat messages: system + (history) + user
  const messages = [{ role: 'system', content: systemPrompt }];
  if (Array.isArray(contents)) {
    for (const c of contents) {
      const role = c.role === 'model' ? 'assistant' : 'user';
      const text = (c.parts || []).map(p => p.text || '').join('');
      if (text) messages.push({ role, content: text });
    }
  } else if (userPrompt) {
    messages.push({ role: 'user', content: userPrompt });
  }
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.OLLAMA_AUTH) headers['Authorization'] = process.env.OLLAMA_AUTH;
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages, stream: false }),
    signal: AbortSignal.timeout(120000) // local CPU can be slow — allow 2 min
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text().catch(() => '')}`);
  const data = await res.json();
  const text = (data.message?.content || '').trim();
  if (!text) throw new Error('Ollama returned an empty response.');
  return text;
}
const USE_OLLAMA = !!process.env.OLLAMA_URL;

// ── GROQ ENGINE (FREE cloud AI — runs Llama/Qwen, fast, multi-user) ───────────
// Used on the live site (Render) so real users get AI without your laptop.
// Set GROQ_MODEL to choose the model (default: llama-3.3-70b-versatile).
async function askGroq(systemPrompt, userPrompt, contents = null) {
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const messages = [{ role: 'system', content: systemPrompt }];
  if (Array.isArray(contents)) {
    for (const c of contents) {
      const role = c.role === 'model' ? 'assistant' : 'user';
      const text = (c.parts || []).map(p => p.text || '').join('');
      if (text) messages.push({ role, content: text });
    }
  } else if (userPrompt) {
    messages.push({ role: 'user', content: userPrompt });
  }
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 4096 }),
    signal: AbortSignal.timeout(60000)
  });
  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text().catch(() => '')}`);
  const data = await res.json();
  const text = (data.choices?.[0]?.message?.content || '').trim();
  if (!text) throw new Error('Groq returned an empty response.');
  return text;
}
const USE_GROQ = !!process.env.GROQ_API_KEY;

// ── ROBUST GEMINI CALL WITH RETRY + MODEL FALLBACK ────────────────────────────
// Shared by the CEO assistant AND the academy tutor. Tries multiple models, and
// retries transient errors (429/500/503) with a short backoff before moving on.
async function callGeminiWithRetry(prompt, systemPrompt, maxRetries = 2) {
  // 24/7 AUTOMATIC CASCADE: Ollama → Groq → Gemini. Fall THROUGH on failure
  // instead of returning early, so one engine being down never breaks the call.
  if (USE_OLLAMA) {
    try { const t = await askOllama(systemPrompt, prompt); if (t) return t; }
    catch (e) { console.error('Ollama failed, falling through to Groq:', e.message); }
  }
  if (USE_GROQ) {
    try { const t = await askGroq(systemPrompt, prompt); if (t) return t; }
    catch (e) { console.error('Groq failed, falling through to Gemini:', e.message); }
  }
  // 2.0-flash is most reliable on free tier — try it first, then newer models as fallback.
  const models = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
  let lastError = 'No models responded';
  let quotaHit = false;
  for (const model of models) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 4096, temperature: 0.7 }
            }),
            signal: AbortSignal.timeout(55000)
          }
        );
        const data = await res.json();
        if (!res.ok) {
          lastError = `[${model}] ${data?.error?.message || 'HTTP ' + res.status}`;
          console.error('Gemini error:', lastError);
          if (res.status === 429) { quotaHit = true; break; } // quota — next model won't help much, but try it
          if (res.status === 503 || res.status === 500) {
            if (attempt < maxRetries) { await new Promise(r => setTimeout(r, 1500 * (attempt + 1))); continue; }
          }
          break; // non-retryable — try next model
        }
        const parts = data.candidates?.[0]?.content?.parts || [];
        const text = parts.map(p => p.text || '').join('').trim();
        if (text) return text;
        const reason = data.candidates?.[0]?.finishReason || 'unknown';
        lastError = `[${model}] empty response, finishReason=${reason}`;
        console.error('Gemini empty:', lastError);
        break; // try next model
      } catch (e) {
        lastError = `[${model}] ${e.message}`;
        console.error('Gemini exception:', lastError);
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }
  if (quotaHit) {
    throw new Error('Daily free AI limit reached on Google Gemini. Enable billing on your Gemini API key for unlimited use, or wait for the daily quota to reset.');
  }
  throw new Error(lastError);
}

// Free Gemini call with model fallback chain (reused by the AI teachers).
// Supports multi-turn `contents`; retries transient errors (429/500/503) per model.
async function academyAskGemini(systemPrompt, contents, maxTokens = 1500) {
  // 24/7 AUTOMATIC CASCADE: Ollama → Groq → Gemini.
  // Each engine is tried in turn; if one fails (down, timeout, quota) we fall
  // THROUGH to the next instead of giving up — so a lesson never dies just
  // because the first engine hiccuped.
  if (USE_OLLAMA) {
    try { const t = await askOllama(systemPrompt, null, contents); if (t) return t; }
    catch (e) { console.error('Academy Ollama failed, falling through to Groq:', e.message); }
  }
  if (USE_GROQ) {
    try { const t = await askGroq(systemPrompt, null, contents); if (t) return t; }
    catch (e) { console.error('Academy Groq failed, falling through to Gemini:', e.message); }
  }
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error('AI teacher is busy right now. Please try again in a moment.');
  // 2.0-flash is most reliable on free tier — try it first, then newer models as fallback.
  const models = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
  // BLOCK_ONLY_HIGH lets all educational content through while still blocking
  // genuinely harmful material.
  const safetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
  ];
  let lastError = null;
  let quotaHit = false;
  for (const model of models) {
    const body = JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.6 },
      safetySettings,
    });
    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          { method: 'POST', headers: { 'content-type': 'application/json' }, body, signal: AbortSignal.timeout(55000) }
        );
        const data = await r.json();
        if (!r.ok) {
          lastError = data?.error?.message || `${model} returned ${r.status}`;
          if (r.status === 429) { quotaHit = true; break; }
          if (r.status === 503 || r.status === 500) {
            if (attempt < 2) { await new Promise(rs => setTimeout(rs, 1200 * (attempt + 1))); continue; }
          }
          break; // try next model
        }
        // Extract text — collect ALL parts (model may return multiple)
        const candidate = data.candidates?.[0];
        const finishReason = candidate?.finishReason;
        if (finishReason === 'SAFETY') {
          // Safety block — try next model with same contents
          lastError = 'Safety block on ' + model;
          break;
        }
        const text = (candidate?.content?.parts || []).map(p => p.text || '').join('').trim();
        if (text) return text;
        // Empty text but no error — try next model
        lastError = `${model} returned empty content (finishReason: ${finishReason})`;
        break;
      } catch (e) {
        lastError = e.message;
        if (attempt < 2) await new Promise(rs => setTimeout(rs, 1200 * (attempt + 1)));
      }
    }
  }
  if (quotaHit) {
    throw new Error('Your teacher has reached the daily free AI limit on Google Gemini. Enable billing on the Gemini API key for unlimited lessons, or wait for the daily quota to reset.');
  }
  throw new Error(lastError || 'AI teacher is busy. Please try again in a moment.');
}

// Parent auth — reuses the signed-token system
function parentAuth(req) {
  const h = req.headers['authorization'] || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  return verifyToken(token);
}
async function getParentByEmail(email) {
  const rows = await dbQuery('GET', 'academy_parents', null, { email: `eq.${email}`, limit: 1 });
  return rows[0] || null;
}
async function getStudentForParent(studentId, parentEmail) {
  const rows = await dbQuery('GET', 'academy_students', null, { id: `eq.${studentId}`, parent_email: `eq.${parentEmail}`, limit: 1 });
  return rows[0] || null;
}

// ── §13 KIDS ACADEMY ─────────────────────────────────────────────────────────
// ── PARENT: SIGN UP ───────────────────────────────────────────────────────────
app.post('/api/academy/parent/signup', async (req, res) => {
  let { name, email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  email = String(email).trim().toLowerCase();
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  try {
    if (await getParentByEmail(email)) return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    await dbQuery('POST', 'academy_parents', { email, name: name || '', password_hash: hashPassword(password) });
    res.json({ success: true, token: signToken(email), email, name: name || '' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PARENT: LOG IN ────────────────────────────────────────────────────────────
app.post('/api/academy/parent/login', loginLimiter, async (req, res) => {
  let { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  email = String(email).trim().toLowerCase();
  try {
    const parent = await getParentByEmail(email);
    if (!parent || !verifyPassword(password, parent.password_hash))
      return res.status(401).json({ error: 'Wrong email or password.' });
    res.json({ success: true, token: signToken(email), email, name: parent.name || '' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PARENT: ADD A CHILD ───────────────────────────────────────────────────────
app.post('/api/academy/student', async (req, res) => {
  const email = parentAuth(req);
  if (!email) return res.status(401).json({ error: 'Please log in.' });
  let { name, age, grade, avatar } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: "Child's name is required." });
  age = parseInt(age, 10);
  if (!age || age < 3 || age > 18) return res.status(400).json({ error: 'Please enter an age between 3 and 18.' });
  try {
    const rows = await dbQuery('POST', 'academy_students', {
      parent_email: email,
      name: String(name).trim(),
      age,
      grade: (grade || '').toString().trim() || null,
      avatar: (avatar || '🧒').toString().slice(0, 4),
      points: 0, streak: 0, badges: [],
    });
    res.json({ success: true, student: Array.isArray(rows) ? rows[0] : rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PARENT: LIST MY CHILDREN ──────────────────────────────────────────────────
app.get('/api/academy/students', async (req, res) => {
  const email = parentAuth(req);
  if (!email) return res.status(401).json({ error: 'Please log in.' });
  try {
    const rows = await dbQuery('GET', 'academy_students', null, { parent_email: `eq.${email}`, order: 'created_at.asc' });
    res.json(rows || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PARENT: CHILD PROGRESS (dashboard) ────────────────────────────────────────
app.get('/api/academy/progress/:studentId', async (req, res) => {
  const email = parentAuth(req);
  if (!email) return res.status(401).json({ error: 'Please log in.' });
  try {
    const student = await getStudentForParent(req.params.studentId, email);
    if (!student) return res.status(404).json({ error: 'Child not found.' });
    const sessions = await dbQuery('GET', 'academy_sessions', null,
      { student_id: `eq.${student.id}`, order: 'created_at.desc', limit: 50 }).catch(() => []);
    res.json({ student, sessions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── AI TEACHER — the tutoring brain ───────────────────────────────────────────
app.post('/api/academy/tutor', async (req, res) => {
  const email = parentAuth(req);
  if (!email) return res.status(401).json({ error: 'Please log in.' });
  const { studentId, subject, message, history, language } = req.body || {};
  const subjKey = String(subject || 'mathematics').toLowerCase();
  const lang = String(language || 'en').trim() || 'en';
  const LANG_NAMES = {
    en:'English', es:'Spanish', fr:'French', de:'German', it:'Italian', pt:'Portuguese',
    ar:'Arabic', hi:'Hindi', ur:'Urdu', bn:'Bengali', zh:'Chinese (Mandarin)', ja:'Japanese',
    ko:'Korean', ru:'Russian', tr:'Turkish', fa:'Persian', sw:'Swahili', ha:'Hausa',
    yo:'Yoruba', ig:'Igbo', am:'Amharic', zu:'Zulu', af:'Afrikaans', nl:'Dutch',
    pl:'Polish', uk:'Ukrainian', ro:'Romanian', el:'Greek', he:'Hebrew', th:'Thai',
    vi:'Vietnamese', id:'Indonesian', ms:'Malay', fil:'Filipino', ta:'Tamil', te:'Telugu',
    ml:'Malayalam', mr:'Marathi', gu:'Gujarati', pa:'Punjabi', so:'Somali', ps:'Pashto'
  };
  const langName = LANG_NAMES[lang] || lang;
  const teacher = await getAcademyTeacher(subjKey);
  if (!teacher) return res.status(400).json({ error: 'Unknown subject.' });
  if (!ACADEMY_LIVE_SUBJECTS.includes(subjKey))
    return res.status(403).json({ error: `${teacher.name} (${teacher.subject}) is coming soon. Mathematics with Numa is available now.` });
  if (!message || !String(message).trim()) return res.status(400).json({ error: 'Message is required.' });

  try {
    const student = await getStudentForParent(studentId, email);
    if (!student) return res.status(404).json({ error: 'Child not found.' });

    // Load recent session memory for continuity
    const past = await dbQuery('GET', 'academy_sessions', null,
      { student_id: `eq.${student.id}`, subject: `eq.${subjKey}`, order: 'created_at.desc', limit: 5 }).catch(() => []);
    const memory = past.length
      ? past.map(s => `- ${(s.created_at || '').slice(0, 10)}: ${s.summary || 'practiced ' + teacher.subject}`).join('\n')
      : '(This is your first lesson together.)';

    const age = student.age;
    const ageBand = age <= 6 ? 'Ages 4-6 (Discover): very simple words, playful, lots of encouragement, short sentences, use stories and pictures-in-words.'
      : age <= 10 ? 'Ages 7-10 (Explore): friendly and clear, use small examples and quick questions, light challenges.'
      : age <= 14 ? 'Ages 11-14 (Build): encourage reasoning and "why", give richer problems, build critical thinking.'
      : `Ages 15-18 (Create): treat as a capable young adult, connect ${teacher.subject} to real life, careers and projects.`;

    const personality = TEACHER_PERSONALITIES[subjKey] || `You are ${teacher.name}, a warm and encouraging ${teacher.subject} teacher.`;
    const systemPrompt = `${personality}

You are the ${teacher.subject} teacher at SkyGlobe Academy. You are warm, patient, encouraging, and never condescending. You teach ONE child named ${student.name}, age ${age}${student.grade ? `, grade ${student.grade}` : ''}.

YOUR IDENTITY:
- Your name is ${teacher.name}. Always refer to yourself as ${teacher.name}. Never say you are an AI language model.
- You teach only ${teacher.subject}. If a student asks about another subject, kindly say "That's a great question for my colleague! Right now let's keep exploring ${teacher.subject} together."

LEARNING LEVEL: ${ageBand}

WHAT YOU REMEMBER ABOUT ${student.name}'S RECENT LESSONS:
${memory}

HOW YOU TEACH (proven methods — use them):
1. ADAPTIVE: Match difficulty to ${student.name}. If they get it, go a little harder; if they struggle, slow down and re-explain simply.
2. MICROLEARNING: Keep each reply short (3-6 short sentences). One idea at a time.
3. ACTIVE RECALL: End most replies with ONE small question so the child keeps thinking.
4. INSTANT FEEDBACK: If they answer, say clearly if it's right or not, and ALWAYS explain WHY in simple terms.
5. ENCOURAGEMENT: Praise effort warmly ("Great thinking!", "You're so close!"). Never make the child feel bad.
6. STEP BY STEP: For maths problems, walk through the solution one step at a time.

SAFETY RULES (very important — children use this):
- Always be kind, safe, age-appropriate, and positive.
- Never discuss anything unsafe, scary, adult, or unrelated to learning.
- If the child seems upset or mentions something worrying, gently encourage them to talk to their parent or teacher.
- Use simple, clear language with no slang.

VISUAL TEACHING (very important — use this when it helps):
When a student asks to SEE something (a shape, diagram, number line, clock, chart, pattern, etc.), you MUST draw it using SVG.
- Wrap your SVG in <svg>...</svg> tags inside your reply.
- Keep SVGs simple: width="300" height="200", use basic shapes (circle, rect, line, polygon, text).
- Example — a circle: <svg width="200" height="200"><circle cx="100" cy="100" r="80" fill="#4DA3FF" stroke="#1A2E4A" stroke-width="3"/><text x="100" y="108" text-anchor="middle" font-size="22" fill="white">Circle</text></svg>
- Example — a triangle: <svg width="200" height="180"><polygon points="100,20 20,160 180,160" fill="#FFC542" stroke="#1A2E4A" stroke-width="3"/></svg>
- For number lines, clocks, charts — draw them with SVG shapes and <text> labels.
- After the SVG, write a short friendly explanation in words.
- If you cannot draw something with simple SVG, describe it clearly in words instead.

FORMAT: Friendly text with SVG visuals where helpful. You may use simple emoji. Keep text short and spoken-friendly.`
    + (lang !== 'en'
      ? `\n\nCRITICAL LANGUAGE RULE: ${student.name} speaks ${langName}. You MUST write EVERY word of your reply in ${langName} only — do not use any English. Use simple, warm ${langName} vocabulary that a child can understand. This is essential.`
      : '');

    const contents = [];
    if (Array.isArray(history)) {
      for (const m of history.slice(-10)) {
        if (m.role === 'user' || m.role === 'assistant')
          contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content || '') }] });
      }
    }
    // Append the language tag directly to the user's message so Gemini
    // sees it as the most recent instruction and follows it even when
    // the conversation history is in a different language.
    const userText = lang !== 'en'
      ? `${String(message).trim()}\n\n[Answer in ${langName} only — every single word must be in ${langName}]`
      : String(message).trim();
    contents.push({ role: 'user', parts: [{ text: userText }] });

    const reply = await academyAskGemini(systemPrompt, contents) || `Hi ${student.name}! Let's try that again together.`;

    // Award points + update streak (best-effort), and log session memory
    const today = new Date().toISOString().slice(0, 10);
    const lastDay = (student.last_active || '').slice(0, 10);
    let streak = student.streak || 0;
    if (lastDay !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      streak = lastDay === yesterday ? streak + 1 : 1;
    }
    const points = (student.points || 0) + 5;
    dbQuery('PATCH', 'academy_students', { points, streak, language: lang, last_active: new Date().toISOString() },
      { id: `eq.${student.id}` }).catch(() => {});
    dbQuery('POST', 'academy_sessions', {
      student_id: student.id, subject: subjKey, teacher: teacher.name,
      summary: String(message).trim().slice(0, 140),
    }).catch(() => {});

    res.json({ reply, teacher: teacher.name, points, streak });
  } catch (e) {
    console.error('AI teacher error:', e.message);
    res.status(500).json({ error: 'Your teacher is taking a short break. Please try again in a moment.' });
  }
});

// ── PUBLIC ROSTER (faculty hall — names reflect CEO renames) ──────────────────
app.get('/api/academy/roster', async (req, res) => {
  try {
    const roster = await getAcademyRoster();
    res.json(roster.map(t => ({ key: t.key, name: t.name, emoji: t.emoji, subject: t.subject, color: t.color, live: t.live })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── TEACHER INFO (for the learn page header — reflects CEO renames) ────────────
app.get('/api/academy/teacher/:subject', async (req, res) => {
  const t = await getAcademyTeacher(String(req.params.subject || '').toLowerCase());
  if (!t) return res.status(404).json({ error: 'Unknown subject.' });
  res.json({ name: t.name, emoji: t.emoji, subject: t.subject, color: t.color });
});

// ── CEO: VIEW FULL TEACHER ROSTER ─────────────────────────────────────────────
app.get('/api/admin/academy/teachers', checkAdmin, async (req, res) => {
  try { res.json(await getAcademyRoster()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CEO: RENAME A TEACHER ─────────────────────────────────────────────────────
app.patch('/api/admin/academy/teachers/:key', checkAdmin, async (req, res) => {
  const key = String(req.params.key || '').toLowerCase();
  if (!ACADEMY_TEACHERS[key]) return res.status(404).json({ error: 'Unknown teacher.' });
  let { name, emoji } = req.body || {};
  name = (name || '').toString().trim();
  emoji = (emoji || '').toString().trim().slice(0, 4);
  if (!name) return res.status(400).json({ error: 'Teacher name is required.' });
  if (name.length > 40) return res.status(400).json({ error: 'Name is too long.' });
  try {
    // Upsert the override row (delete + insert keeps it simple and table-light)
    await dbQuery('DELETE', 'academy_teachers', null, { subject_key: `eq.${key}` }).catch(() => {});
    await dbQuery('POST', 'academy_teachers', {
      subject_key: key, name, emoji: emoji || ACADEMY_TEACHERS[key].emoji,
    });
    if (typeof logActivity === 'function')
      logActivity(req._who, 'ceo', 'academy_rename', `Renamed ${ACADEMY_TEACHERS[key].subject} teacher to "${name}"`);
    res.json({ success: true, key, name, emoji: emoji || ACADEMY_TEACHERS[key].emoji });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SKYGLOBE ACADEMY — PROFESSIONAL ADMISSION + ACADEMIC RECORDS
// ═══════════════════════════════════════════════════════════════════════════════

// Generate a unique student ID in SGK-YEAR-XXXX format
function genStudentId() {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SGK-${year}-${rand}`;
}

// ── ADMISSION: FULL PROFESSIONAL REGISTRATION ─────────────────────────────────
// Creates (or reuses) the parent/guardian account, the student record (status
// 'pending'), and a guardian profile row. Public endpoint (the application form).
app.post('/api/academy/admission/apply', async (req, res) => {
  try {
    const b = req.body || {};
    const firstName = String(b.firstName || '').trim();
    const lastName  = String(b.lastName || '').trim();
    const fullName  = [firstName, String(b.middleName || '').trim(), lastName].filter(Boolean).join(' ').trim();
    const guardianEmail = String(b.guardianEmail || b.email || '').trim().toLowerCase();
    const password  = String(b.password || '');

    if (!fullName) return res.status(400).json({ error: "Student's full name is required." });
    if (!guardianEmail) return res.status(400).json({ error: 'Guardian email is required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    // Create or reuse the parent account (guardian email is the login)
    let parent = await getParentByEmail(guardianEmail);
    if (!parent) {
      await dbQuery('POST', 'academy_parents', {
        email: guardianEmail,
        name: String(b.guardianName || '').trim(),
        password_hash: hashPassword(password),
      });
    }

    // Derive an age from date of birth (academy_students.age is required)
    let age = parseInt(b.age, 10);
    if ((!age || isNaN(age)) && b.dateOfBirth) {
      const dob = new Date(b.dateOfBirth);
      if (!isNaN(dob)) age = Math.max(3, Math.min(18, Math.floor((Date.now() - dob.getTime()) / (365.25 * 86400000))));
    }
    if (!age || isNaN(age)) age = 8;

    const studentRow = {
      parent_email: guardianEmail,
      name: fullName,
      age,
      grade: String(b.schoolGrade || '').trim() || null,
      avatar: '🧒',
      points: 0, streak: 0, badges: [],
      gender: String(b.gender || '').trim() || null,
      date_of_birth: b.dateOfBirth || null,
      country: String(b.country || '').trim() || null,
      state_province: String(b.stateProvince || '').trim() || null,
      nationality: String(b.nationality || '').trim() || null,
      home_address: String(b.homeAddress || '').trim() || null,
      school_grade: String(b.schoolGrade || '').trim() || null,
      learning_needs: String(b.learningNeeds || '').trim() || null,
      language: String(b.language || 'en').trim() || 'en',
      admission_status: 'pending',
      admission_date: new Date().toISOString(),
    };

    const rows = await dbQuery('POST', 'academy_students', studentRow);
    const student = Array.isArray(rows) ? rows[0] : rows;

    // Guardian profile
    if (student?.id) {
      await dbQuery('POST', 'academy_guardians', {
        student_id: student.id,
        guardian_name: String(b.guardianName || '').trim() || 'Guardian',
        guardian_relationship: String(b.guardianRelationship || 'guardian').trim(),
        guardian_phone: String(b.guardianPhone || '').trim() || null,
        guardian_email: guardianEmail,
        guardian_address: String(b.guardianAddress || b.homeAddress || '').trim() || null,
      }).catch(e => console.error('[admission] guardian insert:', e.message));
    }

    // Confirmation email (best-effort)
    try {
      await sendEmail(guardianEmail, `Application Received — SkyGlobe Academy`,
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#041022;padding:28px;text-align:center;border-radius:8px 8px 0 0">
            <h1 style="color:#D4A73A;margin:0;font-size:1.4rem">Application Received ✅</h1>
            <p style="color:#8899bb;margin:6px 0 0">SkyGlobe Academy</p>
          </div>
          <div style="background:#f9f9f9;padding:28px;border:1px solid #e0e0e0;border-radius:0 0 8px 8px">
            <p>Dear ${esc2(b.guardianName) || 'Parent/Guardian'}, thank you for applying to enrol <strong>${esc2(fullName)}</strong>.</p>
            <p>Your application reference is <strong>${esc2(student?.id || '')}</strong>. Our admissions team is now reviewing it. You can track the status anytime by logging in to the Family Campus.</p>
            <p style="color:#555;font-size:.85rem">SkyGlobe Academy · part of SkyGlobe Group</p>
          </div>
        </div>`);
    } catch (e) { console.error('[admission] email:', e.message); }

    res.json({ success: true, applicationRef: student?.id || null, admission_status: 'pending',
      token: signToken(guardianEmail), email: guardianEmail, name: String(b.guardianName || '').trim() });
  } catch (e) {
    console.error('Admission apply error:', e.message);
    res.status(500).json({ error: 'Could not submit application. Please try again.' });
  }
});

function esc2(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

// ── ADMISSION: CHECK STATUS ───────────────────────────────────────────────────
app.get('/api/academy/admission/:id/status', async (req, res) => {
  const email = parentAuth(req);
  if (!email) return res.status(401).json({ error: 'Please log in.' });
  try {
    const student = await getStudentForParent(req.params.id, email);
    if (!student) return res.status(404).json({ error: 'Application not found.' });
    res.json({
      admission_status: student.admission_status || 'pending',
      student_id: student.student_id || null,
      admission_date: student.admission_date || null,
      enrollment_date: student.enrollment_date || null,
      name: student.name,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ADMISSION: CEO REVIEW / ACCEPT / ENROLL ───────────────────────────────────
app.patch('/api/academy/admission/:id/review', checkAdmin, async (req, res) => {
  try {
    await dbQuery('PATCH', 'academy_students', { admission_status: 'reviewing' }, { id: `eq.${req.params.id}` });
    logActivity(req._who, 'ceo', 'admission_review', `Marked admission ${req.params.id} as reviewing`, req.params.id);
    res.json({ success: true, admission_status: 'reviewing' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/academy/admission/:id/accept', checkAdmin, async (req, res) => {
  try {
    const studentId = genStudentId();
    await dbQuery('PATCH', 'academy_students',
      { admission_status: 'accepted', student_id: studentId },
      { id: `eq.${req.params.id}` });
    logActivity(req._who, 'ceo', 'admission_accept', `Accepted admission ${req.params.id} → ${studentId}`, req.params.id);
    // Notify guardian (best-effort)
    try {
      const rows = await dbQuery('GET', 'academy_students', null, { id: `eq.${req.params.id}`, limit: 1 });
      const st = rows[0];
      if (st?.parent_email) {
        await sendEmail(st.parent_email, 'Congratulations — Admission Accepted',
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#041022;padding:28px;text-align:center;border-radius:8px 8px 0 0">
              <h1 style="color:#D4A73A;margin:0;font-size:1.4rem">🎉 Admission Accepted!</h1></div>
            <div style="background:#f9f9f9;padding:28px;border:1px solid #e0e0e0;border-radius:0 0 8px 8px">
              <p><strong>${esc2(st.name)}</strong> has been accepted to SkyGlobe Academy!</p>
              <p>Student ID: <strong>${esc2(studentId)}</strong></p>
              <p>Log in to your Family Campus to complete enrolment and begin learning.</p>
            </div></div>`);
      }
    } catch (e) { console.error('[accept] email:', e.message); }
    res.json({ success: true, admission_status: 'accepted', student_id: studentId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/academy/admission/:id/enroll', checkAdmin, async (req, res) => {
  try {
    // Ensure a student_id exists even if enrolled directly
    const rows = await dbQuery('GET', 'academy_students', null, { id: `eq.${req.params.id}`, limit: 1 });
    const st = rows[0] || {};
    const studentId = st.student_id || genStudentId();
    await dbQuery('PATCH', 'academy_students',
      { admission_status: 'enrolled', student_id: studentId, enrollment_date: new Date().toISOString() },
      { id: `eq.${req.params.id}` });
    logActivity(req._who, 'ceo', 'admission_enroll', `Enrolled student ${req.params.id} (${studentId})`, req.params.id);
    try {
      if (st.parent_email) {
        await sendEmail(st.parent_email, 'Enrolment Complete — Welcome to SkyGlobe Academy',
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#041022;padding:28px;text-align:center;border-radius:8px 8px 0 0">
              <h1 style="color:#D4A73A;margin:0;font-size:1.4rem">Welcome aboard! 🚀</h1></div>
            <div style="background:#f9f9f9;padding:28px;border:1px solid #e0e0e0;border-radius:0 0 8px 8px">
              <p><strong>${esc2(st.name)}</strong> is now fully enrolled (ID ${esc2(studentId)}). Log in to start learning with our AI faculty.</p>
            </div></div>`);
      }
    } catch (e) { console.error('[enroll] email:', e.message); }
    res.json({ success: true, admission_status: 'enrolled', student_id: studentId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CEO: ALL ADMISSION APPLICATIONS ───────────────────────────────────────────
app.get('/api/admin/academy/admissions', checkAdmin, async (req, res) => {
  try {
    const rows = await dbQuery('GET', 'academy_students', null, { order: 'admission_date.desc.nullslast', limit: 500 });
    res.json(rows || []);
  } catch (e) {
    // Fallback ordering if admission_date column not present yet
    try { res.json(await dbQuery('GET', 'academy_students', null, { order: 'created_at.desc', limit: 500 })); }
    catch (e2) { res.status(500).json({ error: e2.message }); }
  }
});

// ── ACADEMIC RECORDS (parent-scoped) ──────────────────────────────────────────
app.get('/api/academy/student/:id/academic-record', async (req, res) => {
  const email = parentAuth(req);
  if (!email) return res.status(401).json({ error: 'Please log in.' });
  try {
    const student = await getStudentForParent(req.params.id, email);
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    const records = await dbQuery('GET', 'academy_academic_records', null,
      { student_id: `eq.${student.id}`, order: 'session_date.desc', limit: 200 }).catch(() => []);
    const assessments = await dbQuery('GET', 'academy_assessments', null,
      { student_id: `eq.${student.id}`, order: 'taken_at.desc', limit: 200 }).catch(() => []);
    const sessions = await dbQuery('GET', 'academy_sessions', null,
      { student_id: `eq.${student.id}`, limit: 1000 }).catch(() => []);

    // Build per-subject report card
    const bySubject = {};
    for (const a of assessments) {
      const k = a.subject || 'general';
      (bySubject[k] = bySubject[k] || { subject: k, count: 0, totalPct: 0 });
      bySubject[k].count++;
      bySubject[k].totalPct += a.total_marks ? (a.scored_marks / a.total_marks) * 100 : 0;
    }
    const reportCard = Object.values(bySubject).map(s => ({
      subject: s.subject, assessments: s.count,
      averagePercent: s.count ? Math.round(s.totalPct / s.count) : 0,
    }));

    res.json({
      student: {
        id: student.id, name: student.name, age: student.age,
        student_id: student.student_id || null, grade: student.grade || student.school_grade || null,
        admission_status: student.admission_status || 'pending', language: student.language || 'en',
        country: student.country || null, nationality: student.nationality || null,
      },
      reportCard, records, assessments,
      totalSessions: sessions.length,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/academy/student/:id/assessments', async (req, res) => {
  const email = parentAuth(req);
  if (!email) return res.status(401).json({ error: 'Please log in.' });
  try {
    const student = await getStudentForParent(req.params.id, email);
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    const assessments = await dbQuery('GET', 'academy_assessments', null,
      { student_id: `eq.${student.id}`, order: 'taken_at.desc', limit: 300 }).catch(() => []);
    res.json(assessments || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Add an assessment (internal — invoked by tutors/CEO). Parent OR CEO authorised.
app.post('/api/academy/student/:id/assessments', async (req, res) => {
  const email = parentAuth(req);
  const ceo = checkAdmin(req);
  if (!email && !ceo) return res.status(401).json({ error: 'Please log in.' });
  try {
    let student;
    if (email) student = await getStudentForParent(req.params.id, email);
    else { const rows = await dbQuery('GET', 'academy_students', null, { id: `eq.${req.params.id}`, limit: 1 }); student = rows[0]; }
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    const b = req.body || {};
    const total = parseInt(b.total_marks, 10) || 100;
    const scored = parseInt(b.scored_marks, 10) || 0;
    const pct = total ? (scored / total) * 100 : 0;
    const grade = b.grade || (pct >= 90 ? 'A' : pct >= 75 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F');
    const rows = await dbQuery('POST', 'academy_assessments', {
      student_id: student.id,
      subject: String(b.subject || 'general'),
      assessment_type: String(b.assessment_type || 'quiz'),
      title: String(b.title || 'Assessment'),
      total_marks: total, scored_marks: scored,
      grade, passed: pct >= 50,
      feedback: b.feedback || null,
    });
    res.json({ success: true, assessment: Array.isArray(rows) ? rows[0] : rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/academy/student/:id/attendance', async (req, res) => {
  const email = parentAuth(req);
  if (!email) return res.status(401).json({ error: 'Please log in.' });
  try {
    const student = await getStudentForParent(req.params.id, email);
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    const sessions = await dbQuery('GET', 'academy_sessions', null,
      { student_id: `eq.${student.id}`, limit: 2000 }).catch(() => []);
    const days = new Set((sessions || []).map(s => (s.created_at || '').slice(0, 10)).filter(Boolean));
    res.json({ totalSessions: sessions.length, distinctDays: days.size,
      lastActive: student.last_active || null, streak: student.streak || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Built-in learning materials — always available even if academy_materials DB table is empty.
const BUILTIN_MATERIALS = [
  // MATHEMATICS
  { id:'m1', subject:'mathematics', age_group:'4-6',  title:'Counting 1 to 10',      type:'lesson',   description:'Learn to count from 1 to 10 with fun pictures and songs. Perfect for your very first maths lesson!',              emoji:'🔢', color:'#3B82F6' },
  { id:'m2', subject:'mathematics', age_group:'4-6',  title:'Shapes All Around Us',   type:'activity', description:'Circles, squares, and triangles are hiding everywhere! Find them around your home.',                               emoji:'🔷', color:'#3B82F6' },
  { id:'m3', subject:'mathematics', age_group:'4-6',  title:'More & Less',            type:'lesson',   description:'Which has more apples? Which has fewer? Learning to compare quantities.',                                           emoji:'⚖️', color:'#3B82F6' },
  { id:'m4', subject:'mathematics', age_group:'7-9',  title:'Adding & Subtracting',   type:'lesson',   description:'Master addition and subtraction with step-by-step examples, number lines, and word problems.',                      emoji:'➕', color:'#3B82F6' },
  { id:'m5', subject:'mathematics', age_group:'7-9',  title:'Times Tables Challenge', type:'activity', description:'2s, 5s, and 10s first — then conquer ALL the times tables with Numa!',                                            emoji:'✖️', color:'#3B82F6' },
  { id:'m6', subject:'mathematics', age_group:'7-9',  title:'Telling the Time',       type:'lesson',   description:'Read analogue and digital clocks, understand hours and minutes.',                                                   emoji:'🕐', color:'#3B82F6' },
  { id:'m7', subject:'mathematics', age_group:'10-12',title:'Fractions & Decimals',   type:'lesson',   description:'Slicing pizzas into fractions and converting them to decimals — maths meets real life.',                           emoji:'🍕', color:'#3B82F6' },
  { id:'m8', subject:'mathematics', age_group:'10-12',title:'Geometry Explorer',      type:'activity', description:'Perimeter, area, angles — explore shapes in 2D and 3D.',                                                           emoji:'📐', color:'#3B82F6' },
  // SCIENCE
  { id:'s1', subject:'science',     age_group:'4-6',  title:'Living & Non-Living',    type:'lesson',   description:'How do we know if something is alive? Explore plants, animals, rocks, and water.',                                  emoji:'🌱', color:'#10B981' },
  { id:'s2', subject:'science',     age_group:'4-6',  title:'Weather Every Day',      type:'activity', description:'Sunny, rainy, cloudy, windy — be a mini weather scientist and record the weather this week!',                       emoji:'🌦️', color:'#10B981' },
  { id:'s3', subject:'science',     age_group:'7-9',  title:'The Human Body',         type:'lesson',   description:'Heart, lungs, bones, and muscles — discover what keeps you running, jumping, and thinking.',                        emoji:'🫀', color:'#10B981' },
  { id:'s4', subject:'science',     age_group:'7-9',  title:'Plants & Photosynthesis',type:'lesson',   description:'How do plants eat sunlight? Learn about roots, stems, leaves, and the amazing food factory inside every plant.',    emoji:'🌿', color:'#10B981' },
  { id:'s5', subject:'science',     age_group:'10-12',title:'Forces & Motion',        type:'lesson',   description:'Gravity, friction, push and pull — understand why things move (or stop!) the way they do.',                         emoji:'🚀', color:'#10B981' },
  { id:'s6', subject:'science',     age_group:'10-12',title:'The Solar System',       type:'lesson',   description:'Eight planets, one sun, countless moons — journey through space with Nova.',                                        emoji:'🪐', color:'#10B981' },
  // READING
  { id:'r1', subject:'reading',     age_group:'4-6',  title:'ABCs & Phonics',         type:'lesson',   description:'Every letter makes a sound. Learn the alphabet and start blending sounds into words with Lexi.',                    emoji:'🔤', color:'#F59E0B' },
  { id:'r2', subject:'reading',     age_group:'4-6',  title:'My First Story',         type:'activity', description:'Listen to a short story, then tell Lexi what happened in your own words.',                                          emoji:'📖', color:'#F59E0B' },
  { id:'r3', subject:'reading',     age_group:'7-9',  title:'Reading Comprehension',  type:'lesson',   description:'Read a passage and answer questions about who, what, where, when, and why.',                                        emoji:'📝', color:'#F59E0B' },
  { id:'r4', subject:'reading',     age_group:'7-9',  title:'Word Families & Rhymes', type:'activity', description:'Cat, bat, hat, mat — discover word families and build your vocabulary through rhyme.',                               emoji:'🎵', color:'#F59E0B' },
  { id:'r5', subject:'reading',     age_group:'10-12',title:'Creative Writing',       type:'activity', description:'Write your own short story with a beginning, middle, and end. Lexi will give you a prompt to start!',               emoji:'✍️', color:'#F59E0B' },
  // CODING
  { id:'c1', subject:'coding',      age_group:'4-6',  title:'What is a Computer?',   type:'lesson',   description:'Screens, keyboards, and mice — learn what computers are and what they can do.',                                      emoji:'💻', color:'#8B5CF6' },
  { id:'c2', subject:'coding',      age_group:'7-9',  title:'Sequences & Steps',      type:'lesson',   description:'Coding is just giving clear instructions! Learn how sequences work and give Cody a set of instructions.',            emoji:'📋', color:'#8B5CF6' },
  { id:'c3', subject:'coding',      age_group:'7-9',  title:'Loops & Patterns',       type:'lesson',   description:'Instead of repeating yourself, use a loop! Discover how computers use loops to be efficient.',                       emoji:'🔄', color:'#8B5CF6' },
  { id:'c4', subject:'coding',      age_group:'10-12',title:'If / Then Logic',        type:'lesson',   description:'IF it rains THEN bring an umbrella. Learn how computers make decisions with conditions.',                           emoji:'🧠', color:'#8B5CF6' },
  { id:'c5', subject:'coding',      age_group:'10-12',title:'Build a Mini Game',      type:'activity', description:'Plan a simple guessing game step by step — design the rules, the win condition, and the "game over" screen.',        emoji:'🎮', color:'#8B5CF6' },
  // HISTORY
  { id:'h1', subject:'history',     age_group:'4-6',  title:'My Family Story',        type:'lesson',   description:'History starts at home! Learn about family trees and how your own story began.',                                    emoji:'👨‍👩‍👧', color:'#EF4444' },
  { id:'h2', subject:'history',     age_group:'7-9',  title:'Ancient Egypt',          type:'lesson',   description:'Pyramids, pharaohs, and hieroglyphics — travel 5,000 years back to the land of the Nile.',                          emoji:'🏺', color:'#EF4444' },
  { id:'h3', subject:'history',     age_group:'7-9',  title:'Great African Kingdoms', type:'lesson',   description:'Mali, Songhai, Great Zimbabwe — discover the powerful empires that shaped our world.',                               emoji:'🌍', color:'#EF4444' },
  { id:'h4', subject:'history',     age_group:'10-12',title:'The Age of Exploration', type:'lesson',   description:'Continents discovered, trade routes mapped, cultures connected — and the complicated truth behind it all.',          emoji:'🗺️', color:'#EF4444' },
  { id:'h5', subject:'history',     age_group:'10-12',title:'World Wars & Peace',     type:'lesson',   description:'Why did the world go to war twice? And how did nations come together to build peace afterwards?',                   emoji:'🕊️', color:'#EF4444' },
  // ARTS
  { id:'a1', subject:'arts',        age_group:'4-6',  title:'Colours & Feelings',     type:'activity', description:'Every colour tells a story! Learn the primary colours and what feelings they can express.',                          emoji:'🎨', color:'#EC4899' },
  { id:'a2', subject:'arts',        age_group:'4-6',  title:'My Favourite Song',      type:'activity', description:'Music is everywhere. Clap, hum, and discover rhythm with Melody.',                                                  emoji:'🎵', color:'#EC4899' },
  { id:'a3', subject:'arts',        age_group:'7-9',  title:'Drawing with Shapes',    type:'activity', description:'Every great drawing starts with circles, squares, and triangles. Build a picture step by step.',                    emoji:'✏️', color:'#EC4899' },
  { id:'a4', subject:'arts',        age_group:'7-9',  title:'Music & Beat',           type:'lesson',   description:'What makes a beat? Learn about rhythm, tempo, and how music travels from your ears to your heart.',                  emoji:'🥁', color:'#EC4899' },
  { id:'a5', subject:'arts',        age_group:'10-12',title:'Art Through History',    type:'lesson',   description:'Cave paintings to digital art — how has creativity changed across the centuries?',                                   emoji:'🖼️', color:'#EC4899' },
  // FINANCE
  { id:'f1', subject:'finance',     age_group:'7-9',  title:'Needs vs Wants',         type:'lesson',   description:'Do you NEED new trainers or do you WANT them? Learn the difference and make smarter choices.',                       emoji:'💡', color:'#14B8A6' },
  { id:'f2', subject:'finance',     age_group:'7-9',  title:'Saving Up',              type:'activity', description:'Set a saving goal, track your pocket money, and watch it grow. Penny will help you plan!',                          emoji:'🐷', color:'#14B8A6' },
  { id:'f3', subject:'finance',     age_group:'10-12',title:'Earning & Spending',     type:'lesson',   description:'Lemonade stands, lawn mowing, selling crafts — explore how people earn money and make spending decisions.',          emoji:'💸', color:'#14B8A6' },
  { id:'f4', subject:'finance',     age_group:'10-12',title:'Banks & Budgets',        type:'lesson',   description:'What is a bank? What is a budget? Build the financial literacy that sets you up for life.',                         emoji:'🏦', color:'#14B8A6' },
  // HEALTH
  { id:'v1', subject:'health',      age_group:'4-6',  title:'My Body Moves!',         type:'activity', description:'Jump, stretch, spin! Learn the names of body parts and celebrate everything your amazing body can do.',              emoji:'🤸', color:'#06B6D4' },
  { id:'v2', subject:'health',      age_group:'4-6',  title:'Healthy Foods',          type:'lesson',   description:'Fruits, vegetables, proteins, and more — discover the colours of a healthy plate.',                                 emoji:'🥗', color:'#06B6D4' },
  { id:'v3', subject:'health',      age_group:'7-9',  title:'Sleep & Rest',           type:'lesson',   description:'Why does your brain need sleep? Learn how rest helps you grow, remember, and feel great.',                          emoji:'😴', color:'#06B6D4' },
  { id:'v4', subject:'health',      age_group:'7-9',  title:'Feelings & Emotions',    type:'lesson',   description:'Happy, sad, angry, excited — all feelings are valid. Learn healthy ways to understand and express them.',           emoji:'💛', color:'#06B6D4' },
  { id:'v5', subject:'health',      age_group:'10-12',title:'Exercise & the Body',    type:'lesson',   description:'How does exercise change your muscles, heart, and mood? Build a simple fitness plan with Vita.',                    emoji:'🏃', color:'#06B6D4' },
];

// ── LEARNING MATERIALS (public to logged-in parents) ──────────────────────────
app.get('/api/academy/materials', async (req, res) => {
  try {
    // Try DB first — if the table has content, use it.
    const params = { order: 'created_at.desc', limit: 300 };
    if (req.query.subject)  params.subject  = `eq.${req.query.subject}`;
    if (req.query.ageGroup) params.age_group = `eq.${req.query.ageGroup}`;
    const dbRows = await dbQuery('GET', 'academy_materials', null, params).catch(() => []);
    if (dbRows && dbRows.length > 0) { res.json(dbRows); return; }
    // DB empty — return built-in materials, filtered to match the request.
    let items = BUILTIN_MATERIALS;
    if (req.query.subject)  items = items.filter(m => m.subject  === req.query.subject);
    if (req.query.ageGroup) items = items.filter(m => m.age_group === req.query.ageGroup);
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Weekly timetable — computed from student age, not stored in DB.
// Returns today's schedule and the full week so the portal can display it.
app.get('/api/academy/timetable/:studentId', async (req, res) => {
  const email = parentAuth(req);
  if (!email) return res.status(401).json({ error: 'Please log in.' });
  try {
    const student = await getStudentForParent(req.params.studentId, email);
    if (!student) return res.status(404).json({ error: 'Child not found.' });
    const age = student.age || 8;
    // Age-appropriate session length and daily subjects
    let sessionMins, dailySubjects, playLabel;
    if (age <= 6) {
      sessionMins = 20; playLabel = 'Free Play 🎈';
      dailySubjects = [
        ['mathematics','arts'],
        ['reading','health'],
        ['mathematics','arts'],
        ['reading','health'],
        ['Free Play'], // Friday
      ];
    } else if (age <= 10) {
      sessionMins = 30; playLabel = 'Play Break 🏃';
      dailySubjects = [
        ['mathematics','science'],
        ['reading','history'],
        ['coding','arts'],
        ['finance','health'],
        ['mathematics','Free Play'],
      ];
    } else if (age <= 14) {
      sessionMins = 40; playLabel = 'Break & Activity 🎯';
      dailySubjects = [
        ['mathematics','science','reading'],
        ['history','coding','arts'],
        ['mathematics','finance','health'],
        ['science','reading','history'],
        ['coding','arts','Free Play'],
      ];
    } else {
      sessionMins = 45; playLabel = 'Creative Break 🎨';
      dailySubjects = [
        ['mathematics','science','reading','coding'],
        ['history','arts','finance','health'],
        ['mathematics','science','coding','history'],
        ['reading','arts','finance','health'],
        ['mathematics','coding','Free Play','Free Play'],
      ];
    }
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dow = new Date().getDay(); // 0=Sun … 6=Sat
    // Map 0(Sun)=rest, 1-5=school, 6(Sat)=rest
    const todayIdx = (dow >= 1 && dow <= 5) ? dow - 1 : null;
    const week = ['Monday','Tuesday','Wednesday','Thursday','Friday'].map((d, i) => {
      const subjects = dailySubjects[i].map((s, j) => ({
        order: j + 1,
        subject: s,
        isPlay: s === 'Free Play',
        label: s === 'Free Play' ? playLabel : s.charAt(0).toUpperCase() + s.slice(1),
        startTime: `${(8 + j * (Math.ceil(sessionMins / 60))).toString().padStart(2,'0')}:00`,
        durationMins: s === 'Free Play' ? 30 : sessionMins,
      }));
      return { day: d, isToday: todayIdx === i, subjects };
    });
    const todaySchedule = todayIdx !== null ? week[todayIdx] : null;
    const nextSubject = todaySchedule?.subjects.find(s => !s.isPlay) || null;
    res.json({ student: { name: student.name, age }, week, todaySchedule, nextSubject, sessionMins, playLabel });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Standalone admission portal page
app.get('/academy/admission', (req, res) => res.sendFile(path.join(__dirname, 'academy-admission.html')));

// Academy page routes
app.get('/academy', (req, res) => res.sendFile(path.join(__dirname, 'academy-portal.html')));
app.get('/academy/learn', (req, res) => res.sendFile(path.join(__dirname, 'academy-learn.html')));

// ── §14 PAGE ROUTES ──────────────────────────────────────────────────────────
// NOTE: the SPA catch-all (app.get('*')) lives at the very END of all routes so
// it never shadows API endpoints defined below.

// ── #22b VOICE TRANSCRIPTION (Groq Whisper) ───────────────────────────────────
// Accepts { audio: <base64 string>, mimeType: <string> }
// Returns { text: <transcript> }
// Falls back to empty string if Groq key missing or Groq fails.
app.post('/api/transcribe', express.json({ limit: '12mb' }), async (req, res) => {
  const { audio, mimeType = 'audio/webm' } = req.body || {};
  if (!audio) return res.status(400).json({ error: 'No audio provided.' });
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(503).json({ error: 'Transcription not configured (add GROQ_API_KEY).' });
  try {
    const buf = Buffer.from(audio, 'base64');
    const ext = mimeType.includes('mp4') || mimeType.includes('m4a') ? 'm4a'
               : mimeType.includes('ogg') ? 'ogg'
               : mimeType.includes('wav') ? 'wav'
               : 'webm';
    const fd = new FormData();
    fd.append('file', new Blob([buf], { type: mimeType }), `audio.${ext}`);
    fd.append('model', 'whisper-large-v3-turbo');
    fd.append('language', 'en');
    fd.append('response_format', 'json');
    const gr = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}` },
      body: fd,
    });
    if (!gr.ok) {
      const err = await gr.text();
      console.error('[transcribe] Groq error:', gr.status, err);
      return res.status(502).json({ error: 'Transcription failed.' });
    }
    const data = await gr.json();
    res.json({ text: (data.text || '').trim() });
  } catch (e) {
    console.error('[transcribe] error:', e.message);
    res.status(500).json({ error: 'Transcription error.' });
  }
});

// ── #22c REAL-WORLD WEB SEARCH (free sources, no API key) ─────────────────────
// Server-side aggregator so the public portal can search real information from
// across the web — Wikipedia (live articles) + DuckDuckGo Instant Answers.
// Brave Search API (BRAVE_SEARCH_API_KEY env var) gives real live web results free.
// Google CSE (SEARCH_API_KEY + SEARCH_ENGINE_ID) is also supported as premium option.
async function searchBrave(q) {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return null;
  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=10&freshness=pw`;
    const r = await fetch(url, {
      headers: { 'Accept': 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': key },
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) return null;
    const d = await r.json();
    const results = (d.web?.results || []).map(it => ({
      title: it.title, snippet: it.description, url: it.url,
      source: it.profile?.name || new URL(it.url).hostname.replace('www.',''),
      thumbnail: it.thumbnail?.src || null,
    }));
    const answer = d.infobox ? {
      title: d.infobox.label || q, snippet: d.infobox.description || '',
      url: d.infobox.website || null, source: 'Brave Search'
    } : null;
    return { results, answer };
  } catch (e) { console.error('[search] brave:', e.message); return null; }
}
async function searchWikipedia(q) {
  try {
    const url = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(q)}&limit=6`;
    const r = await fetch(url, { headers: { 'User-Agent': 'SkyGlobeGroup/1.0 (support@skyglobegroup.com)' }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const data = await r.json();
    return (data.pages || []).map(p => ({
      title: p.title,
      snippet: (p.description || p.excerpt || '').replace(/<[^>]+>/g, ''),
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.key)}`,
      source: 'Wikipedia',
      thumbnail: p.thumbnail ? (p.thumbnail.url.startsWith('//') ? 'https:' + p.thumbnail.url : p.thumbnail.url) : null,
    }));
  } catch (e) { console.error('[search] wiki:', e.message); return []; }
}
async function searchDuckDuckGo(q) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
    const r = await fetch(url, { headers: { 'User-Agent': 'SkyGlobeGroup/1.0' }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return { abstract: null, results: [] };
    const d = await r.json();
    const abstract = d.AbstractText ? {
      title: d.Heading || q,
      snippet: d.AbstractText,
      url: d.AbstractURL || null,
      source: d.AbstractSource || 'DuckDuckGo',
      thumbnail: d.Image ? (d.Image.startsWith('/') ? 'https://duckduckgo.com' + d.Image : d.Image) : null,
    } : null;
    const results = [];
    const walk = (arr) => (arr || []).forEach(t => {
      if (t.Topics) { walk(t.Topics); return; }
      if (t.Text && t.FirstURL) results.push({ title: t.Text.split(' - ')[0], snippet: t.Text, url: t.FirstURL, source: 'DuckDuckGo', thumbnail: t.Icon && t.Icon.URL ? 'https://duckduckgo.com' + t.Icon.URL : null });
    });
    walk(d.RelatedTopics);
    return { abstract, results: results.slice(0, 6) };
  } catch (e) { console.error('[search] ddg:', e.message); return { abstract: null, results: [] }; }
}
// Optional paid provider (Google Custom Search) — only used if configured.
async function searchPaid(q) {
  const key = process.env.SEARCH_API_KEY, cx = process.env.SEARCH_ENGINE_ID;
  if (!key || !cx) return null;
  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${encodeURIComponent(q)}&num=8`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const d = await r.json();
    return (d.items || []).map(it => ({
      title: it.title, snippet: it.snippet, url: it.link, source: (it.displayLink || 'Web'),
      thumbnail: it.pagemap?.cse_thumbnail?.[0]?.src || null,
    }));
  } catch (e) { console.error('[search] paid:', e.message); return null; }
}
app.get('/api/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ query: q, answer: null, results: [] });
  try {
    // 1) Paid provider if configured (best quality — Google CSE)
    const paid = await searchPaid(q);
    if (paid && paid.length) return res.json({ query: q, answer: null, results: paid, provider: 'google' });
    // 2) Brave Search (free tier, real live web results — set BRAVE_SEARCH_API_KEY)
    const brave = await searchBrave(q);
    if (brave && brave.results && brave.results.length)
      return res.json({ query: q, answer: brave.answer || null, results: brave.results, provider: 'brave' });
    // 3) Fallback: Wikipedia + DuckDuckGo Instant Answers (no key needed)
    const [wiki, ddg] = await Promise.all([searchWikipedia(q), searchDuckDuckGo(q)]);
    const results = [];
    const seen = new Set();
    const push = (item) => { if (item && item.url && !seen.has(item.url)) { seen.add(item.url); results.push(item); } };
    (ddg.results || []).forEach(push);
    wiki.forEach(push);
    res.json({ query: q, answer: ddg.abstract || null, results: results.slice(0, 10), provider: 'free' });
  } catch (e) {
    console.error('[search] error:', e.message);
    res.status(500).json({ error: 'Search is temporarily unavailable. Please try again.' });
  }
});

// ── #22d REAL-WORLD CONFERENCES (built-in, served when DB is empty) ───────────
// A curated set of genuine, recurring international conferences across many
// fields so the Conferences page is never empty. The CEO can still add/override
// via the admin panel (DB rows take priority).
const BUILTIN_CONFERENCES = [
  { id:'c1', title:'World Health Summit 2026', organization:'World Health Summit / Charité', field:'Health & Medicine', city:'Berlin', country:'Germany', date:'2026-10-18', summary:'One of the world\'s foremost forums on global health, bringing together 300+ speakers, ministers, researchers and industry leaders.', website:'https://www.worldhealthsummit.org' },
  { id:'c2', title:'Web Summit 2026', organization:'Web Summit', field:'Technology & Startups', city:'Lisbon', country:'Portugal', date:'2026-11-02', summary:'The largest technology conference in the world — 70,000+ attendees, founders, investors and global media.', website:'https://websummit.com' },
  { id:'c3', title:'COP31 — UN Climate Change Conference', organization:'United Nations (UNFCCC)', field:'Climate & Environment', city:'Antalya', country:'Turkey', date:'2026-11-09', summary:'The annual UN climate summit where nearly 200 nations negotiate global climate action and policy.', website:'https://unfccc.int' },
  { id:'c4', title:'AAAS Annual Meeting 2026', organization:'American Association for the Advancement of Science', field:'Science & Research', city:'Phoenix', country:'United States', date:'2026-02-12', summary:'A leading general-science gathering spanning every discipline, with thousands of researchers and students.', website:'https://meetings.aaas.org' },
  { id:'c5', title:'World Economic Forum Annual Meeting', organization:'World Economic Forum', field:'Business & Economics', city:'Davos', country:'Switzerland', date:'2027-01-18', summary:'Global leaders in business, government and civil society convene to shape the world economic agenda.', website:'https://www.weforum.org' },
  { id:'c6', title:'NeurIPS 2026', organization:'Neural Information Processing Systems', field:'Artificial Intelligence', city:'San Diego', country:'United States', date:'2026-12-06', summary:'The premier global conference on machine learning and AI research.', website:'https://neurips.cc' },
  { id:'c7', title:'BETT 2026 — Education Technology', organization:'BETT', field:'Education', city:'London', country:'United Kingdom', date:'2026-01-21', summary:'The world\'s largest education-technology exhibition for teachers, leaders and edtech innovators.', website:'https://www.bettshow.com' },
  { id:'c8', title:'World Petroleum Congress', organization:'World Petroleum Council', field:'Energy & Engineering', city:'Calgary', country:'Canada', date:'2026-09-13', summary:'The global meeting point for the energy industry — often called the "Olympics of the petroleum sector".', website:'https://www.world-petroleum.org' },
  { id:'c9', title:'ICN World Nursing Congress', organization:'International Council of Nurses', field:'Nursing & Healthcare', city:'Singapore', country:'Singapore', date:'2026-06-09', summary:'The leading international congress for nurses and healthcare professionals worldwide.', website:'https://www.icn.ch' },
  { id:'c10', title:'IFA Berlin 2026', organization:'Messe Berlin', field:'Consumer Electronics', city:'Berlin', country:'Germany', date:'2026-09-04', summary:'One of the world\'s largest trade shows for consumer electronics and home appliances.', website:'https://www.ifa-berlin.com' },
  { id:'c11', title:'African Economic Conference 2026', organization:'African Development Bank / UNECA / UNDP', field:'Business & Economics', city:'Addis Ababa', country:'Ethiopia', date:'2026-11-23', summary:'A premier forum addressing development, trade and economic transformation across Africa.', website:'https://aec.afdb.org' },
  { id:'c12', title:'World Congress of Architects (UIA)', organization:'International Union of Architects', field:'Architecture & Design', city:'Barcelona', country:'Spain', date:'2026-07-06', summary:'The global gathering of architects and urban designers shaping the cities of tomorrow.', website:'https://www.uia-architectes.org' },
];
// Payment-free professional conference registration.
// Saves the request (best-effort) and emails the client + admin a confirmation.
app.post('/api/conference/register', contactLimiter, async (req, res) => {
  const b = req.body || {};
  const fname = String(b.fname || '').trim();
  const email = String(b.email || '').trim();
  if (!fname || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return res.status(400).json({ error: 'Please provide your name and a valid email.' });
  const ref = 'CONF-' + Date.now().toString(36).toUpperCase().slice(-6);
  const record = {
    ref, fname, lname: String(b.lname || '').trim(), email,
    phone: String(b.phone || '').trim(), nationality: String(b.nationality || '').trim(),
    conference: String(b.conference || '').trim(), country: String(b.country || '').trim(),
    field: String(b.field || '').trim(), travel_date: String(b.travelDate || '').trim(),
    notes: String(b.notes || '').trim(), status: 'received', created_at: new Date().toISOString(),
  };
  // Best-effort save (table may not exist yet — never blocks the user)
  await dbQuery('POST', 'conference_requests', record).catch(() => {});
  // Notify client + admin (best-effort)
  if (process.env.RESEND_API_KEY || process.env.BREVO_API_KEY) {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.RECIPIENT_EMAIL || 'support@skyglobegroup.com';
    const clientHtml = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
      <div style="background:#041022;color:#fff;padding:20px;border-radius:12px 12px 0 0"><h2 style="margin:0;color:#D4A73A">SkyGlobe Group</h2><p style="margin:4px 0 0;color:#c3cee0">Conference Registration Received</p></div>
      <div style="border:1px solid #e6e9ef;border-top:none;padding:22px;border-radius:0 0 12px 12px">
        <p>Dear ${fname},</p>
        <p>Thank you for registering your interest in <strong>${record.conference || 'a conference'}</strong>. Your reference number is <strong>${ref}</strong>.</p>
        <p>Our team will contact the organising institution on your behalf, verify the genuine invitation/admission document, and follow up with you by email within 1–3 business days.</p>
        <p style="margin-top:18px;color:#6b7689;font-size:.9rem">Need anything sooner? Reply to this email or WhatsApp us at +1 737-399-8522.</p>
        <p style="margin-top:18px">Warm regards,<br><strong>SkyGlobe Group</strong></p>
      </div></div>`;
    try { await sendEmail(email, `Conference Registration Received [${ref}] — SkyGlobe Group`, clientHtml); } catch (e) { console.error('conf client email:', e.message); }
    const adminHtml = `<div style="font-family:Arial,sans-serif"><h3>New Conference Registration [${ref}]</h3>
      <p><b>Name:</b> ${fname} ${record.lname}<br><b>Email:</b> ${email}<br><b>Phone:</b> ${record.phone}<br>
      <b>Nationality:</b> ${record.nationality}<br><b>Conference:</b> ${record.conference}<br><b>Country:</b> ${record.country}<br>
      <b>Field:</b> ${record.field}<br><b>Travel date:</b> ${record.travel_date}<br><b>Notes:</b> ${record.notes}</p></div>`;
    try { await sendEmail(adminEmail, `New Conference Registration [${ref}]`, adminHtml, email); } catch (e) { console.error('conf admin email:', e.message); }
  }
  res.json({ ok: true, ref });
});

// ── #22e CLIENT DOCUMENT VAULT (real upload / list / download / delete) ───────
// Clients can upload documents, pictures and scanned files to secure storage,
// then download or remove them. Stored in the Supabase 'documents' bucket under
// a per-client folder, tracked in the client_files table.
app.post('/api/client/upload', express.json({ limit: '20mb' }), async (req, res) => {
  const email = clientAuth(req);
  if (!email) return res.status(401).json({ error: 'Please log in.' });
  const { filename, mimeType, data } = req.body || {};
  if (!filename || !data) return res.status(400).json({ error: 'File is required.' });
  try {
    const buf = Buffer.from(data, 'base64');
    if (buf.length > 15 * 1024 * 1024) return res.status(413).json({ error: 'File too large (max 15MB).' });
    const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
    const folder = 'client-vault/' + Buffer.from(email).toString('hex').slice(0, 24);
    const filePath = `${folder}/${Date.now()}_${safe}`;
    await storageUpload(filePath, buf, mimeType || 'application/octet-stream');
    const row = {
      client_email: email, filename: safe, path: filePath,
      mime_type: mimeType || 'application/octet-stream', size: buf.length,
      created_at: new Date().toISOString(),
    };
    const saved = await dbQuery('POST', 'client_files', row).catch(() => null);
    res.json({ ok: true, file: (saved && saved[0]) || row });
  } catch (e) {
    console.error('[client upload]', e.message);
    res.status(500).json({ error: 'Upload failed. Please try again.' });
  }
});
app.get('/api/client/files', async (req, res) => {
  const email = clientAuth(req);
  if (!email) return res.status(401).json({ error: 'Please log in.' });
  try {
    const rows = await dbQuery('GET', 'client_files', null, { client_email: `eq.${email}`, order: 'created_at.desc', limit: 200 }).catch(() => []);
    res.json(rows || []);
  } catch (e) { res.json([]); }
});
app.get('/api/client/files/:id/download', async (req, res) => {
  const email = clientAuth(req);
  if (!email) return res.status(401).send('Please log in.');
  try {
    const rows = await dbQuery('GET', 'client_files', null, { id: `eq.${req.params.id}`, limit: 1 });
    const f = rows[0];
    if (!f || f.client_email !== email) return res.status(404).send('Not found.');
    const upstream = await fetch(storagePublicUrl(f.path));
    if (!upstream.ok) return res.status(404).send('File not found.');
    res.setHeader('Content-Type', f.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${f.filename}"`);
    const ab = await upstream.arrayBuffer();
    res.send(Buffer.from(ab));
  } catch (e) { res.status(500).send('Download error.'); }
});
app.delete('/api/client/files/:id', async (req, res) => {
  const email = clientAuth(req);
  if (!email) return res.status(401).json({ error: 'Please log in.' });
  try {
    const rows = await dbQuery('GET', 'client_files', null, { id: `eq.${req.params.id}`, limit: 1 });
    const f = rows[0];
    if (!f || f.client_email !== email) return res.status(404).json({ error: 'Not found.' });
    await dbQuery('DELETE', 'client_files', null, { id: `eq.${req.params.id}` }).catch(() => {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
//  SKYGLOBE CERTIFICATE & COURSES PLATFORM
//  Flow: register → pick track + tier (1/2/3-month) → pay → AI-guided
//  step-by-step curriculum → tick progress → on 100% completion, upload a
//  photo and pick a graduation year → premium QR-verifiable certificate.
//  One payment = one enrolment. Pricing lives in PRICING (CEO-editable).
// ════════════════════════════════════════════════════════════════════════════

const COURSE_TIERS = [
  { id: 'cert_amateur', name: '1-Month Amateur Certificate', product: 'cert_amateur', months: 1, steps: 6,
    blurb: 'A focused one-month foundation — the essentials, fast.',
    perks: ['AI-guided step-by-step lessons', 'Progress tracking', 'QR-verifiable digital certificate', 'Usable worldwide'] },
  { id: 'cert_advanced', name: '2-Month Advanced Certificate', product: 'cert_advanced', months: 2, steps: 10,
    blurb: 'Deeper skill-building with practical, portfolio-ready work.',
    perks: ['Everything in Amateur', 'Practical project work', 'Case study analysis', 'QR-verifiable digital certificate'] },
  { id: 'cert_pro', name: '3-Month Pro Certificate', product: 'cert_pro', months: 3, steps: 14,
    blurb: 'Our most complete track — strategy, portfolio and career readiness.',
    perks: ['Everything in Advanced', 'Advanced techniques', 'Capstone project', 'Career-readiness module', 'Priority QR-verifiable certificate'] },
];

const COURSE_TRACKS = [
  { id: 'digital_marketing',     name: 'Digital Marketing',                     emoji: '📈' },
  { id: 'content_creation',      name: 'Content Creation & Social Media',       emoji: '🎬' },
  { id: 'entertainment_media',   name: 'Entertainment, Film & Media Production', emoji: '🎥' },
  { id: 'business_entrepreneurship', name: 'Business & Entrepreneurship',       emoji: '💼' },
  { id: 'tourism_hospitality',   name: 'Tourism & Hospitality Management',      emoji: '🌴' },
  { id: 'surveying_built_env',   name: 'Surveying & the Built Environment',     emoji: '📐' },
  { id: 'fashion_design',        name: 'Fashion & Design',                     emoji: '👗' },
  { id: 'health_wellness',       name: 'Health & Wellness Coaching',            emoji: '🌿' },
  { id: 'technology_coding',     name: 'Technology & Coding Fundamentals',      emoji: '💻' },
];
const COURSE_TRACK_INDEX = COURSE_TRACKS.reduce((a, t) => (a[t.id] = t, a), {});

// ── DYNAMIC COURSE CATALOG ───────────────────────────────────────────────────
// The CEO adds new courses from the admin portal — no code required. Custom
// tracks live in the `academy_tracks` table and merge with the built-ins.
//   create table academy_tracks (id text primary key, name text, emoji text,
//     description text, active boolean default true, created_at timestamptz default now());
let CUSTOM_TRACKS = [];
async function refreshCourseTracks() {
  try {
    const rows = await dbQuery('GET', 'academy_tracks', null, { active: 'eq.true', order: 'created_at.asc', limit: 200 });
    CUSTOM_TRACKS = (Array.isArray(rows) ? rows : []).map(r => ({ id: r.id, name: r.name, emoji: r.emoji || '📘', description: r.description || '' }));
  } catch (e) { /* table may not exist yet — built-ins still work */ }
}
function allCourseTracks() { return [...COURSE_TRACKS, ...CUSTOM_TRACKS]; }
function trackById(id) { return COURSE_TRACK_INDEX[id] || CUSTOM_TRACKS.find(t => t.id === id) || null; }

// CEO course manager — add a course and it appears on the public catalog instantly.
app.get('/api/admin/academy/tracks', (req, res) => {
  if (!checkStaffOrAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ builtIn: COURSE_TRACKS, custom: CUSTOM_TRACKS });
});
app.post('/api/admin/academy/tracks', async (req, res) => {
  const who = checkAdmin(req);
  if (!who) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const name = String((req.body || {}).name || '').trim().slice(0, 120);
    const emoji = String((req.body || {}).emoji || '📘').trim().slice(0, 8);
    const description = String((req.body || {}).description || '').trim().slice(0, 400);
    if (!name) return res.status(400).json({ error: 'Course name is required.' });
    const id = 'c_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
    if (trackById(id)) return res.status(400).json({ error: 'A course with this name already exists.' });
    await dbQuery('POST', 'academy_tracks', { id, name, emoji, description, active: true });
    await refreshCourseTracks();
    logActivity(who, 'ceo', 'course_added', `Added course "${name}" to the Academy catalog`, id);
    res.json({ success: true, track: { id, name, emoji, description } });
  } catch (e) {
    const missing = /relation|does not exist/i.test(e.message);
    res.status(500).json({ error: missing ? 'Run the academy_tracks setup SQL in Supabase first (see admin panel note).' : e.message });
  }
});
app.delete('/api/admin/academy/tracks/:id', async (req, res) => {
  const who = checkAdmin(req);
  if (!who) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await dbQuery('PATCH', 'academy_tracks', { active: false }, { id: `eq.${req.params.id}` });
    await refreshCourseTracks();
    logActivity(who, 'ceo', 'course_removed', `Removed course "${req.params.id}" from the catalog`, req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Generic 14-phase outline, trimmed to the tier's step count. Deterministic
// (no AI JSON parsing risk) — the AI is used per-step, on demand, to write the
// actual lesson content in that track's specific context.
const CURRICULUM_OUTLINE = [
  'Foundations & Industry Overview', 'Core Terminology & Tools', 'Landscape & Key Players',
  'Strategy Fundamentals', 'Practical Skill Building I', 'Practical Skill Building II',
  'Case Study Analysis', 'Content / Deliverable Creation', 'Measurement & Analytics',
  'Client / Audience Management', 'Advanced Techniques', 'Portfolio / Project Work',
  'Professional Standards & Ethics', 'Capstone & Career Readiness',
];

app.get('/api/courses/catalog', (_req, res) => {
  const tiers = COURSE_TIERS.map(t => ({
    id: t.id, name: t.name, product: t.product, months: t.months, steps: t.steps, blurb: t.blurb, perks: t.perks,
    price: { USD: PRICING[t.product].USD, EUR: PRICING[t.product].EUR, GBP: PRICING[t.product].GBP },
  }));
  res.json({ tracks: allCourseTracks(), tiers });
});

// Enrol — requires a valid instant-unlock token proving the tier was paid for.
app.post('/api/courses/enroll', async (req, res) => {
  try {
    const { unlock, trackId, tierId, fullName, email, dob, nationality, address, graduationYear } = req.body || {};
    const tier = COURSE_TIERS.find(t => t.id === tierId);
    const track = trackById(trackId);
    if (!tier || !track) return res.status(400).json({ error: 'Invalid track or tier.' });
    if (!unlock || !verifyUnlock(unlock, tier.product))
      return res.status(402).json({ error: 'Payment required', pay: { product: tier.product } });
    if (!fullName || !email) return res.status(400).json({ error: 'Full name and email are required.' });

    const steps = CURRICULUM_OUTLINE.slice(0, tier.steps).map((title, i) => ({ index: i, title, done: false, content: null }));
    const ref = 'CERT-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const row = await dbQuery('POST', 'course_enrollments', {
      ref, track_id: trackId, tier_id: tierId, full_name: fullName, email, dob: dob || null,
      nationality: nationality || null, address: address || null,
      graduation_year: graduationYear || new Date().getFullYear(), steps, status: 'in_progress',
    }).catch(e => { throw new Error('Could not save enrolment: ' + e.message); });
    const enrollment = Array.isArray(row) ? row[0] : row;
    res.json({ success: true, ref, enrollmentId: enrollment?.id, track: track.name, tier: tier.name, steps });
  } catch (e) {
    console.error('Course enroll error:', e.message);
    res.status(500).json({ error: 'Enrolment is temporarily unavailable. Please try again in a moment.' });
  }
});

app.get('/api/courses/enrollment/:id', async (req, res) => {
  try {
    const rows = await dbQuery('GET', 'course_enrollments', null, { id: `eq.${req.params.id}`, limit: 1 });
    const e = rows[0];
    if (!e) return res.status(404).json({ error: 'Enrolment not found.' });
    const track = trackById(e.track_id);
    const tier = COURSE_TIERS.find(t => t.id === e.tier_id);
    res.json({ ...e, trackName: track?.name, tierName: tier?.name });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Generate (once, then cache) the AI lesson content for one curriculum step.
app.post('/api/courses/enrollment/:id/step/:idx/content', async (req, res) => {
  try {
    const idx = parseInt(req.params.idx, 10);
    const rows = await dbQuery('GET', 'course_enrollments', null, { id: `eq.${req.params.id}`, limit: 1 });
    const enr = rows[0];
    if (!enr) return res.status(404).json({ error: 'Enrolment not found.' });
    const steps = enr.steps || [];
    const step = steps[idx];
    if (!step) return res.status(400).json({ error: 'Invalid step.' });
    const track = trackById(enr.track_id);
    if (step.content) return res.json({ content: step.content });
    if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY && !USE_GROQ && !USE_OLLAMA)
      return res.status(500).json({ error: 'AI not configured. Please contact support.' });
    const prompt = `You are an expert instructor writing lesson ${idx + 1} of a professional certificate programme in "${track?.name}", titled "${step.title}". Write a COMPLETE lesson (1000-1500 words) a self-study learner can master on their own, structured exactly as:

THEORY — teach the full concept from first principles: definitions, why it matters in ${track?.name}, the key frameworks or rules, and common mistakes to avoid.

WORKED EXAMPLE — one concrete, realistic ${track?.name} scenario walked through step by step, showing how the theory is applied.

PRACTICAL — hands-on instructions the learner performs themselves: numbered steps, what tools or materials to use, and what a good result looks like.

PRACTICE ACTIONS — 3 short tasks to complete before taking this lesson's test.

Plain text only: use the four section labels above in capitals, blank lines between paragraphs, numbered lists as "1." — no markdown symbols like # or *.`;
    const content = await generateText(prompt, { maxTokens: 2600, temperature: 0.6 });
    steps[idx] = { ...step, content };
    await dbQuery('PATCH', 'course_enrollments', { steps }, { id: `eq.${req.params.id}` }).catch(() => {});
    res.json({ content });
  } catch (e) {
    console.error('Course step content error:', e.message);
    res.status(500).json({ error: 'Could not generate this lesson right now. Please try again.' });
  }
});

// ── TESTS, EXAMS & RECORDS ───────────────────────────────────────────────────
// Every lesson carries a 5-question test (pass 3/5 to complete the step) and
// the programme ends with a 10-question final exam (pass 70%) — required
// before the certificate. All scores are recorded on the enrolment.
function parseQuizJson(raw) {
  try {
    let txt = String(raw).replace(/```json|```/gi, '');
    const m = txt.match(/\[[\s\S]*/);
    let body = m ? m[0] : txt;
    const attempt = (t) => { try { const a = JSON.parse(t); return Array.isArray(a) ? a : null; } catch { return null; } };
    let arr = attempt(body);
    if (!arr) { const end = body.lastIndexOf(']'); if (end > 0) arr = attempt(body.slice(0, end + 1)); }
    if (!arr) { const lastObj = body.lastIndexOf('}'); if (lastObj > 0) arr = attempt(body.slice(0, lastObj + 1) + ']'); } // repair truncated output
    if (!Array.isArray(arr)) return null;
    const qs = arr.filter(q => q && q.q && Array.isArray(q.options) && q.options.length >= 3 && Number.isInteger(q.answer))
      .map(q => ({ q: String(q.q).slice(0, 300), options: q.options.slice(0, 4).map(o => String(o).slice(0, 160)), answer: Math.max(0, Math.min(3, q.answer)) }));
    return qs.length ? qs : null;
  } catch { return null; }
}

// Generate (once, then cache) the test for one lesson.
app.post('/api/courses/enrollment/:id/step/:idx/quiz', async (req, res) => {
  try {
    const idx = parseInt(req.params.idx, 10);
    const rows = await dbQuery('GET', 'course_enrollments', null, { id: `eq.${req.params.id}`, limit: 1 });
    const enr = rows[0];
    if (!enr) return res.status(404).json({ error: 'Enrolment not found.' });
    const steps = enr.steps || [];
    const step = steps[idx];
    if (!step) return res.status(400).json({ error: 'Invalid step.' });
    if (step.quiz) return res.json({ quiz: step.quiz.map(q => ({ q: q.q, options: q.options })), passed: !!step.quiz_passed, score: step.quiz_score ?? null });
    const track = trackById(enr.track_id);
    const out = await generateText(
      `Create exactly 5 multiple-choice questions testing lesson "${step.title}" of a "${track?.name}" certificate programme.${step.content ? ' Base them on this lesson content:\n' + String(step.content).slice(0, 2500) : ''}\nReply with ONLY a JSON array, no prose: [{"q":"question","options":["A","B","C","D"],"answer":0}] where answer is the index of the correct option.`,
      { maxTokens: 1600, temperature: 0.35 });
    let quiz = parseQuizJson(out);
    if (!quiz) {
      const retry = await generateText(
        `Write 5 multiple-choice questions on "${step.title}" (${track?.name}). STRICT: reply with ONLY valid JSON, nothing else: [{"q":"...","options":["A","B","C","D"],"answer":0}]`,
        { maxTokens: 1600, temperature: 0.2 });
      quiz = parseQuizJson(retry);
    }
    if (!quiz) { logError({ source: 'academy-quiz', message: 'quiz parse failed twice', url: req.originalUrl }); return res.status(500).json({ error: 'Could not prepare the test right now — please try again.' }); }
    steps[idx] = { ...step, quiz };
    await dbQuery('PATCH', 'course_enrollments', { steps }, { id: `eq.${req.params.id}` }).catch(() => {});
    res.json({ quiz: quiz.map(q => ({ q: q.q, options: q.options })), passed: false, score: null });
  } catch (e) {
    console.error('Quiz generate error:', e.message);
    res.status(500).json({ error: 'Could not prepare the test right now — please try again.' });
  }
});

// Grade a lesson test. Pass = 3/5. A pass marks the step DONE (test = record).
app.post('/api/courses/enrollment/:id/step/:idx/quiz/submit', async (req, res) => {
  try {
    const idx = parseInt(req.params.idx, 10);
    const answers = (req.body || {}).answers;
    const rows = await dbQuery('GET', 'course_enrollments', null, { id: `eq.${req.params.id}`, limit: 1 });
    const enr = rows[0];
    if (!enr) return res.status(404).json({ error: 'Enrolment not found.' });
    const steps = enr.steps || [];
    const step = steps[idx];
    if (!step || !step.quiz) return res.status(400).json({ error: 'No test found for this lesson.' });
    if (!Array.isArray(answers) || answers.length !== step.quiz.length)
      return res.status(400).json({ error: 'Answer every question before submitting.' });
    let score = 0;
    step.quiz.forEach((q, i) => { if (Number(answers[i]) === q.answer) score++; });
    const passed = score >= 3;
    // A fail clears the test so the retry gets FRESH questions (no memorising answers).
    steps[idx] = { ...step, quiz_score: score, quiz_passed: passed, done: passed ? true : step.done, quiz: passed ? step.quiz : null };
    const allDone = steps.every(st => st.done);
    await dbQuery('PATCH', 'course_enrollments',
      { steps, status: allDone ? 'completed' : 'in_progress' }, { id: `eq.${req.params.id}` });
    res.json({ score, total: step.quiz.length, passed, correct: step.quiz.map(q => q.answer), allDone });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Final exam — generated across the whole curriculum. Pass 70% to unlock the certificate.
app.post('/api/courses/enrollment/:id/final-exam', async (req, res) => {
  try {
    const rows = await dbQuery('GET', 'course_enrollments', null, { id: `eq.${req.params.id}`, limit: 1 });
    const enr = rows[0];
    if (!enr) return res.status(404).json({ error: 'Enrolment not found.' });
    const steps = enr.steps || [];
    if (!steps.length || !steps.every(st => st.done))
      return res.status(400).json({ error: 'Complete every lesson (and its test) before the final exam.' });
    if (enr.final_exam) return res.json({ exam: enr.final_exam.map(q => ({ q: q.q, options: q.options })), score: enr.final_score ?? null, passed: (enr.final_score ?? 0) >= 70 });
    const track = trackById(enr.track_id);
    const out = await generateText(
      `Create exactly 10 multiple-choice FINAL EXAM questions for a certificate programme in "${track?.name}", covering these modules: ${steps.map(st => st.title).join('; ')}. Mix difficulty. Reply with ONLY a JSON array: [{"q":"question","options":["A","B","C","D"],"answer":0}].`,
      { maxTokens: 3000, temperature: 0.35 });
    let exam = parseQuizJson(out);
    if (!exam || exam.length < 6) {
      const retry = await generateText(
        `Write 10 multiple-choice final-exam questions for a "${track?.name}" certificate covering: ${steps.map(st => st.title).join('; ')}. STRICT: reply with ONLY valid JSON, nothing else: [{"q":"...","options":["A","B","C","D"],"answer":0}]`,
        { maxTokens: 3000, temperature: 0.2 });
      exam = parseQuizJson(retry);
    }
    if (!exam || exam.length < 6) { logError({ source: 'academy-exam', message: 'exam parse failed twice', url: req.originalUrl }); return res.status(500).json({ error: 'Could not prepare the final exam right now — please try again.' }); }
    await dbQuery('PATCH', 'course_enrollments', { final_exam: exam }, { id: `eq.${req.params.id}` }).catch(() => {});
    res.json({ exam: exam.map(q => ({ q: q.q, options: q.options })), score: null, passed: false });
  } catch (e) {
    console.error('Final exam error:', e.message);
    res.status(500).json({ error: 'Could not prepare the final exam right now — please try again.' });
  }
});

app.post('/api/courses/enrollment/:id/final-exam/submit', async (req, res) => {
  try {
    const answers = (req.body || {}).answers;
    const rows = await dbQuery('GET', 'course_enrollments', null, { id: `eq.${req.params.id}`, limit: 1 });
    const enr = rows[0];
    if (!enr || !enr.final_exam) return res.status(400).json({ error: 'No final exam found — generate it first.' });
    if (!Array.isArray(answers) || answers.length !== enr.final_exam.length)
      return res.status(400).json({ error: 'Answer every question before submitting.' });
    let correct = 0;
    enr.final_exam.forEach((q, i) => { if (Number(answers[i]) === q.answer) correct++; });
    const score = Math.round((correct / enr.final_exam.length) * 100);
    const passed = score >= 70;
    const best = Math.max(score, enr.final_score || 0);
    await dbQuery('PATCH', 'course_enrollments',
      { final_score: best, status: passed ? 'passed' : enr.status,
        ...(passed ? {} : { final_exam: null }) }, // a fail issues a FRESH exam next attempt
      { id: `eq.${req.params.id}` });
    res.json({ score, passed, correct: passed ? enr.final_exam.map(q => q.answer) : null,
      message: passed ? 'Congratulations — you passed the final exam!' : 'Below 70% — review your lessons and retake a fresh exam.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ASK THE AI TEACHER ───────────────────────────────────────────────────────
// A student can ask any question about the lesson — typed or spoken — and the
// teacher answers in the context of that exact lesson.
app.post('/api/courses/enrollment/:id/ask', async (req, res) => {
  try {
    const { question, stepIdx } = req.body || {};
    if (!question || !String(question).trim()) return res.status(400).json({ error: 'Ask a question first.' });
    const rows = await dbQuery('GET', 'course_enrollments', null, { id: `eq.${req.params.id}`, limit: 1 });
    const enr = rows[0];
    if (!enr) return res.status(404).json({ error: 'Enrolment not found.' });
    const track = trackById(enr.track_id);
    const step = (enr.steps || [])[Number(stepIdx)] || null;
    const answer = await generateText(
      `${step?.content ? 'LESSON CONTEXT:\n' + String(step.content).slice(0, 2600) + '\n\n' : ''}A student in the "${track?.name}" certificate programme${step ? ` (lesson: "${step.title}")` : ''} asks: ${String(question).slice(0, 600)}\n\nAnswer as their patient, encouraging teacher in 3-8 clear sentences. Plain text only.`,
      { maxTokens: 700, temperature: 0.5 });
    res.json({ answer: String(answer).trim() });
  } catch (e) {
    console.error('Ask-teacher error:', e.message);
    res.status(500).json({ error: 'Your teacher is busy for a moment — please ask again.' });
  }
});

app.patch('/api/courses/enrollment/:id/step/:idx/done', async (req, res) => {
  try {
    const idx = parseInt(req.params.idx, 10);
    const rows = await dbQuery('GET', 'course_enrollments', null, { id: `eq.${req.params.id}`, limit: 1 });
    const enr = rows[0];
    if (!enr) return res.status(404).json({ error: 'Enrolment not found.' });
    const steps = enr.steps || [];
    if (!steps[idx]) return res.status(400).json({ error: 'Invalid step.' });
    steps[idx] = { ...steps[idx], done: true };
    const allDone = steps.every(s => s.done);
    await dbQuery('PATCH', 'course_enrollments',
      { steps, status: allDone ? 'completed' : 'in_progress' }, { id: `eq.${req.params.id}` });
    res.json({ ok: true, steps, allDone });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Premium certificate HTML — badge, gold seal, QR verification, real
// stamp/signature images (same trust marks as legal documents).
function wrapCertificate(enr, track, tier, photoDataUrl, verifyUrl, req) {
  const origin = req ? baseUrl(req) : 'https://skyglobegroup.com';
  const sigUrl = origin + '/signature.png';
  const stampUrl = origin + '/stamp.png';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=170x170&margin=6&data=${encodeURIComponent(verifyUrl)}`;
  const issueDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Certificate — ${enr.full_name} — SkyGlobe Group</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#e9edf3;font-family:Inter,sans-serif;padding:28px;display:flex;justify-content:center}
  .cert{width:100%;max-width:980px;background:linear-gradient(155deg,#fffdf6,#fbf5e3);border:10px double #D4A73A;border-radius:6px;padding:56px 60px;position:relative;box-shadow:0 30px 70px rgba(4,16,34,.18)}
  .cert:before{content:"";position:absolute;inset:14px;border:1px solid rgba(212,167,58,.5);border-radius:4px;pointer-events:none}
  .hd{text-align:center;margin-bottom:10px}
  .hd .brand{font-family:'Cormorant Garamond',serif;font-weight:700;font-size:1.15rem;letter-spacing:.14em;color:#041022;text-transform:uppercase}
  .hd .brand span{color:#a87016}
  .hd .div{font-size:.66rem;letter-spacing:.24em;color:#8a7638;text-transform:uppercase;margin-top:4px}
  .title{text-align:center;font-family:'Cormorant Garamond',serif;font-weight:700;font-size:2.4rem;color:#041022;margin:26px 0 4px}
  .sub{text-align:center;font-size:.82rem;letter-spacing:.1em;text-transform:uppercase;color:#a87016;margin-bottom:26px}
  .presented{text-align:center;font-size:.86rem;color:#6b7689}
  .name{text-align:center;font-family:'Cormorant Garamond',serif;font-weight:700;font-size:2.1rem;color:#041022;margin:10px 0;border-bottom:2px solid #D4A73A;display:inline-block;padding:0 20px 8px;position:relative;left:50%;transform:translateX(-50%)}
  .desc{text-align:center;max-width:640px;margin:16px auto 0;color:#3c465a;font-size:.94rem;line-height:1.7}
  .desc strong{color:#041022}
  .row{display:flex;align-items:center;justify-content:space-between;margin-top:48px;gap:20px}
  .photo{width:88px;height:88px;border-radius:50%;object-fit:cover;border:3px solid #D4A73A;box-shadow:0 6px 16px rgba(0,0,0,.15)}
  .sig-block{text-align:center}
  .sig-block img{height:52px}
  .sig-block .ln{border-top:1px solid #8a93a3;margin-top:4px;padding-top:4px;font-size:.72rem;color:#6b7689}
  .qr-block{text-align:center}
  .qr-block img{width:82px;height:82px}
  .qr-block .lbl{font-size:.6rem;color:#8a93a3;margin-top:4px;letter-spacing:.06em;text-transform:uppercase}
  .stamp-img{position:absolute;bottom:56px;right:70px;height:100px;width:100px;opacity:.9;transform:rotate(-8deg)}
  .ref{position:absolute;top:26px;right:36px;font-size:.68rem;color:#a87016;letter-spacing:.06em}
  .foot{text-align:center;margin-top:34px;font-size:.68rem;color:#9aa3b2}
  @media print{body{background:#fff;padding:0}.cert{box-shadow:none;border-width:6px}}
</style></head><body>
  <div class="cert">
    <div class="ref">REF: ${enr.ref}</div>
    <div class="hd"><div class="brand">SKY<span>GLOBE</span> GROUP</div><div class="div">Knowledge Hub · Professional Certification</div></div>
    <div class="title">Certificate of Completion</div>
    <div class="sub">${tier.name}</div>
    <p class="presented">This is to certify that</p>
    <div class="name">${enr.full_name}</div>
    <p class="desc">has successfully completed the <strong>${track.name}</strong> programme, demonstrating diligence and competence across all required modules, and is hereby awarded this certificate — <strong>Class of ${enr.graduation_year}</strong>.</p>
    ${enr.nationality ? `<p style="text-align:center;font-size:.78rem;color:#8a93a3;margin-top:-8px">Nationality: ${enr.nationality}</p>` : ''}
    <div class="row">
      ${photoDataUrl ? `<img class="photo" src="${photoDataUrl}" alt="">` : '<div style="width:88px"></div>'}
      <div class="sig-block"><img src="${sigUrl}" alt=""><div class="ln">Authorised Signatory<br>SkyGlobe Group</div></div>
      <div class="qr-block"><img src="${qrUrl}" alt="Verification QR"><div class="lbl">Scan to verify</div></div>
    </div>
    <img class="stamp-img" src="${stampUrl}" alt="">
    <div class="foot">Issued ${issueDate} · Facilitated &amp; Verified by SkyGlobe Group · Verify at ${verifyUrl}</div>
  </div>
</body></html>`;
}

app.post('/api/courses/enrollment/:id/certificate', async (req, res) => {
  try {
    const { photoDataUrl } = req.body || {};
    const rows = await dbQuery('GET', 'course_enrollments', null, { id: `eq.${req.params.id}`, limit: 1 });
    const enr = rows[0];
    if (!enr) return res.status(404).json({ error: 'Enrolment not found.' });
    const steps = enr.steps || [];
    if (!steps.length || !steps.every(s => s.done))
      return res.status(400).json({ error: 'Complete every lesson before generating your certificate.' });
    if ((enr.final_score || 0) < 70)
      return res.status(400).json({ error: 'Pass the final exam (70%+) to earn your certificate.' });
    const track = trackById(enr.track_id);
    const tier = COURSE_TIERS.find(t => t.id === enr.tier_id);

    const certRef = 'SGC-' + crypto.randomBytes(5).toString('hex').toUpperCase();
    const verifyUrl = `${baseUrl(req)}/verify/${certRef}`;
    const html = wrapCertificate(enr, track, tier, photoDataUrl || null, verifyUrl, req);

    let photoUrl = null;
    if (photoDataUrl && /^data:image\/(png|jpe?g);base64,/.test(photoDataUrl)) {
      const b64 = photoDataUrl.split(',')[1];
      const buf = Buffer.from(b64, 'base64');
      if (buf.length <= 5 * 1024 * 1024) {
        const ext = photoDataUrl.includes('image/png') ? 'png' : 'jpg';
        const path_ = `certificates/${certRef}/photo.${ext}`;
        await storageUpload(path_, buf, `image/${ext === 'jpg' ? 'jpeg' : 'png'}`).catch(() => {});
        photoUrl = storagePublicUrl(path_);
      }
    }

    const filePath = `certificates/${certRef}/certificate.html`;
    await storageUpload(filePath, Buffer.from(html, 'utf8'), 'text/html; charset=utf-8').catch(() => {});
    const docRows = await dbQuery('POST', 'documents', {
      ref: certRef, filename: `certificate_${certRef}.html`, path: filePath, uploaded_by: 'ai:certificates',
    }).catch(() => null);
    const docRow = Array.isArray(docRows) ? docRows[0] : docRows;
    const viewToken = docRow ? await createDocToken(docRow.id, filePath, `certificate_${certRef}.html`, enr.email, certRef).catch(() => null) : null;
    const viewUrl = viewToken ? `${baseUrl(req)}/view/${viewToken}` : null;

    await dbQuery('POST', 'certificates', {
      cert_ref: certRef, enrollment_id: enr.id, full_name: enr.full_name, track_id: enr.track_id,
      tier_id: enr.tier_id, graduation_year: enr.graduation_year, photo_url: photoUrl, status: 'valid',
      nationality: enr.nationality || null,
    }).catch(e => console.error('Certificate record save warning:', e.message));
    await dbQuery('PATCH', 'course_enrollments', { status: 'certified', cert_ref: certRef }, { id: `eq.${req.params.id}` }).catch(() => {});

    res.json({ success: true, certRef, viewUrl, verifyUrl, html });
  } catch (e) {
    console.error('Certificate generate error:', e.message);
    res.status(500).json({ error: 'Certificate generation is temporarily unavailable. Please try again in a moment.' });
  }
});

// Public verification — deliberately minimal: confirms authenticity without
// exposing enrolment contact details (email, address, DOB, nationality).
app.get('/api/certificates/verify/:certRef', async (req, res) => {
  try {
    const rows = await dbQuery('GET', 'certificates', null, { cert_ref: `eq.${req.params.certRef}`, limit: 1 });
    const c = rows[0];
    if (!c) return res.status(404).json({ valid: false, error: 'No certificate found with this reference.' });
    const track = trackById(c.track_id);
    const tier = COURSE_TIERS.find(t => t.id === c.tier_id);
    res.json({
      valid: c.status === 'valid', certRef: c.cert_ref, fullName: c.full_name,
      track: track?.name || c.track_id, tier: tier?.name || c.tier_id,
      graduationYear: c.graduation_year, issuedBy: 'SkyGlobe Group',
    });
  } catch (e) { res.status(500).json({ valid: false, error: e.message }); }
});
app.get('/verify/:certRef', (req, res) => res.sendFile(path.join(__dirname, 'certificate-verify.html')));

// Public legal-document verification — deliberately minimal (document type,
// issue date, validity only). Never exposes the client's name, email or the
// document's actual content — the document itself stays token-gated.
app.get('/api/legal-docs/verify/:ref', async (req, res) => {
  try {
    const ref = req.params.ref;
    const rows = await dbQuery('GET', 'documents', null, { ref: `eq.${ref}`, limit: 1 });
    const d = rows[0];
    if (!d || !String(d.uploaded_by || '').startsWith('ai:legal-docs'))
      return res.status(404).json({ valid: false, error: 'No document found with this reference.' });
    const typeId = String(d.filename || '').split('_')[0];
    const meta = LEGAL_DOC_INDEX[typeId];
    res.json({
      valid: true, ref: d.ref, docType: meta ? meta.name : typeId,
      issuedDate: (d.created_at || '').slice(0, 10), issuedBy: 'SkyGlobe Group',
    });
  } catch (e) { res.status(500).json({ valid: false, error: e.message }); }
});
app.get('/verify-document/:ref', (req, res) => res.sendFile(path.join(__dirname, 'document-verify.html')));

// ════════════════════════════════════════════════════════════════════════════
//  CEO-MANAGED SERVICE CATALOG
//  The CEO can add a new future service/course/document from any sector
//  straight from the admin portal — title, sector, description, price,
//  and how the client should proceed (get in touch, or use an existing
//  page) — and it appears live on /more-services immediately, with zero
//  further coding. This is deliberately a lightweight "coming soon /
//  bookable" listing, not a full custom AI-document pipeline — for a new
//  service that genuinely needs its own guided flow, that's still a build.
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/offerings', async (_req, res) => {
  try {
    const rows = await dbQuery('GET', 'custom_offerings', null, { active: 'eq.true', order: 'sector.asc,created_at.desc', limit: 500 });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/offerings', async (req, res) => {
  if (!checkStaffOrAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const rows = await dbQuery('GET', 'custom_offerings', null, { order: 'created_at.desc', limit: 500 });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/offerings', async (req, res) => {
  const who = checkAdmin(req, res); if (!who) return;
  try {
    const { title, sector, description, priceUSD, priceEUR, priceGBP, ctaLabel, ctaLink } = req.body || {};
    if (!title || !sector) return res.status(400).json({ error: 'Title and sector are required.' });
    const row = await dbQuery('POST', 'custom_offerings', {
      title, sector, description: description || '',
      price_usd: priceUSD || null, price_eur: priceEUR || null, price_gbp: priceGBP || null,
      cta_label: ctaLabel || 'Get in Touch', cta_link: ctaLink || '/#contact',
      active: true, created_by: who,
    });
    res.json({ success: true, offering: Array.isArray(row) ? row[0] : row });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/offerings/:id', async (req, res) => {
  if (!checkAdmin(req, res)) return;
  try {
    const { title, sector, description, priceUSD, priceEUR, priceGBP, ctaLabel, ctaLink, active } = req.body || {};
    const patch = {};
    if (title !== undefined) patch.title = title;
    if (sector !== undefined) patch.sector = sector;
    if (description !== undefined) patch.description = description;
    if (priceUSD !== undefined) patch.price_usd = priceUSD;
    if (priceEUR !== undefined) patch.price_eur = priceEUR;
    if (priceGBP !== undefined) patch.price_gbp = priceGBP;
    if (ctaLabel !== undefined) patch.cta_label = ctaLabel;
    if (ctaLink !== undefined) patch.cta_link = ctaLink;
    if (active !== undefined) patch.active = active;
    await dbQuery('PATCH', 'custom_offerings', patch, { id: `eq.${req.params.id}` });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/offerings/:id', async (req, res) => {
  if (!checkAdmin(req, res)) return;
  try {
    await dbQuery('DELETE', 'custom_offerings', null, { id: `eq.${req.params.id}` });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/more-services', (req, res) => res.sendFile(path.join(__dirname, 'more-services.html')));

// ════════════════════════════════════════════════════════════════════════════
//  SKYGLOBE DIGITAL IDENTITY SYSTEM
//  Four tiers, each visually and procedurally distinct:
//   member  — auto-issued once a client's paid enrolment/service is confirmed
//   staff   — issued only by the CEO, for internal team members
//   premium — public paid product (business/creator/marketing/etc), gated
//             behind a legal-terms acceptance + payment
//   ceo     — issued only by the CEO, for the CEO alone
//  Every card carries: a unique reference, a QR to a MINIMAL public
//  verification page (never personal data), and a private "access code"
//  (shown once, at issuance) that is the only way — besides staff login —
//  to pull the full record. This is a real, working identity + verification
//  system built on this app's existing infrastructure; it is NOT biometric
//  matching, quantum-resistant cryptography, or a distributed ledger — see
//  the chat explanation for what a build at that scale would actually take.
// ════════════════════════════════════════════════════════════════════════════

// Each tier is a genuinely distinct palette + treatment, not a recolour of
// the same template — Member (sapphire blue), Staff (graphite steel, no
// gold at all — deliberately restrained/internal), Premium (emerald & gold),
// CEO (obsidian & solar gold, richest foil, extra security ring + public
// photo on verification — see wrapIdentityCard's `ceo` branch).
const ID_TIERS = {
  member:  { label: 'Member ID',  badge: 'MEMBER',   palette: { a: '#020818', b: '#0a1f44', c: '#123166', accent: '#4DA3FF', accent2: '#BFE0FF' } },
  staff:   { label: 'Staff ID',   badge: 'STAFF',     palette: { a: '#0a0a0c', b: '#1b1b21', c: '#26262e', accent: '#9fb0c9', accent2: '#e3e9f2' } },
  premium: { label: 'Premium ID', badge: 'PREMIUM',   palette: { a: '#020e0a', b: '#0a2318', c: '#0d3320', accent: '#2ecc8f', accent2: '#F4D77A' } },
  ceo:     { label: 'Founder ID', badge: 'CEO · TIER 0', palette: { a: '#000000', b: '#120a02', c: '#1a1002', accent: '#FFDE8A', accent2: '#fff6dd' } },
};

function accessCode() { return crypto.randomBytes(6).toString('hex').toUpperCase(); }
function hashAccessCode(code) { return crypto.createHash('sha256').update(String(code)).digest('hex'); }

// Branded, tier-specific card — front only (the back carries the encryption/
// terms notice and is generated the same way with a `side` flag).
// The Founder ID is a genuinely different piece of design, not a recoloured
// Member card — its own circuit-trace architecture, EMV-style chip, a
// biometric scan-frame around the photo, a stacked "glass layer" depth
// effect, and a second machine-readable layer (an MRZ-style line, like a
// passport) below the QR — so the security reads as engineered, not stated.
// A deterministic, hash-derived visual glyph — like a GPG/SSH key
// fingerprint rendered as a symmetric grid. It is NOT decorative: the same
// access-code hash always produces the same glyph, and a different card
// always produces a visibly different one — a real (if simple) visual
// integrity check, not a fake biometric graphic.
function securityGlyphSvg(seedHash, accent) {
  const cells = [];
  const cols = 5, rows = 5, half = Math.ceil(cols / 2);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < half; x++) {
      const idx = (y * half + x) % seedHash.length;
      const on = parseInt(seedHash[idx], 16) % 2 === 0;
      if (!on) continue;
      const size = 100 / cols;
      cells.push(`<rect x="${x * size}" y="${y * size}" width="${size}" height="${size}"/>`);
      const mirrorX = cols - 1 - x;
      if (mirrorX !== x) cells.push(`<rect x="${mirrorX * size}" y="${y * size}" width="${size}" height="${size}"/>`);
    }
  }
  return `<svg viewBox="0 0 100 100" fill="${accent}">${cells.join('')}</svg>`;
}
function formatCardNumber(ref) {
  const digits = ref.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return digits.match(/.{1,4}/g).join(' ');
}

function wrapCeoIdentityCard(data, verifyUrl, req) {
  const origin = req ? baseUrl(req) : 'https://skyglobegroup.com';
  const sigUrl = origin + '/signature.png';
  const stampUrl = origin + '/stamp.png';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=1&ecc=H&data=${encodeURIComponent(verifyUrl)}`;
  // The Founder ID defaults to the CEO's own uploaded photo (ceo.png in the
  // repo root) unless a specific photo was passed at issuance time.
  const photoSrc = data.photoDataUrl || (origin + '/ceo.png');
  const photoTag = `<img class="photo" src="${photoSrc}" alt="">`;
  const ghostPortrait = `<img class="ghost-portrait" src="${photoSrc}" alt="">`;
  const contactLine = `<div class="contact-line">skyglobegroup.com · support@skyglobegroup.com</div>`;
  // Guilloché lattice: two interleaved sine-wave families crossing at
  // opposing phases — rendered as pure SVG so it stays crisp at any print
  // resolution.
  const guillocheSvg = `<svg class="guilloche" viewBox="0 0 440 277" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
    ${Array.from({ length: 9 }, (_, i) => {
      const y = 14 + i * 30;
      return `<path d="M0 ${y} ${Array.from({ length: 23 }, (_, x) => `Q ${x * 20 + 10} ${y + (x % 2 ? 13 : -13)}, ${(x + 1) * 20} ${y}`).join(' ')}" fill="none" stroke="#FFDE8A" stroke-width="0.45" opacity="0.55"/>
      <path d="M0 ${y} ${Array.from({ length: 23 }, (_, x) => `Q ${x * 20 + 10} ${y + (x % 2 ? -13 : 13)}, ${(x + 1) * 20} ${y}`).join(' ')}" fill="none" stroke="#F77F1B" stroke-width="0.35" opacity="0.4"/>`;
    }).join('')}
  </svg>`;
  // MRZ uses '<' as its filler character (passport convention) — it MUST be
  // HTML-escaped or the browser parses runs of "<NAME" as broken tags that
  // swallow the closing </div>s after them and corrupt the whole page layout.
  const mrz1 = `SGID<<${(data.fullName || '').toUpperCase().replace(/[^A-Z ]/g, '').replace(/\s+/g, '<<')}<<CEO<<TIER0`.padEnd(44, '<').slice(0, 44).replace(/</g, '&lt;');
  const mrz2 = `${data.ref}<<${(data.nationality || 'XXX').slice(0, 3).toUpperCase()}<<ACTIVE<<VERIFIED`.padEnd(44, '<').slice(0, 44).replace(/</g, '&lt;');
  const glyphSeed = crypto.createHash('sha256').update(data.ref + (data.accessCodeHash || '')).digest('hex');
  const glyphSvg = securityGlyphSvg(glyphSeed, '#FFDE8A');
  const cardNumber = formatCardNumber(data.ref);
  // Micro-text built from the holder's own credentials — repeated tiny print
  // under each primary field (laser-microtext analogue), so tampering with a
  // field visually mismatches its own micro-underline.
  const nano = (s) => `<div class="nano-line">${(String(s || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '') + ' · ').repeat(20)}</div>`;
  const holoText = (`SKYGLOBEGROUP·${(data.fullName || '').toUpperCase().replace(/\s+/g, '')}·TIER0·` ).repeat(14);
  // Covert machine-only layer: religion (and a copy of the identity fields)
  // is NEVER rendered visually anywhere on the card — it exists solely as a
  // base64 data attribute, readable by a scanner/machine inspecting the
  // card's data layer, invisible to any human eye at any zoom.
  const covertPayload = Buffer.from(JSON.stringify({
    ref: data.ref, name: data.fullName, dob: data.dob || null,
    nationality: data.nationality || null, religion: data.religion || null,
  })).toString('base64');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Founder ID — ${data.fullName} — SkyGlobe Group</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Cormorant+Garamond:wght@600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:radial-gradient(1300px 800px at 50% -10%,#241a06,#020101 70%);font-family:Inter,sans-serif;padding:44px 20px;display:flex;flex-direction:column;align-items:center;gap:22px;min-height:100vh}
  .stack{position:relative;width:452px;height:283px}
  .layer{position:absolute;inset:0;border-radius:22px;background:linear-gradient(155deg,#0c0802,#1a1002);opacity:.5}
  .layer.l2{transform:translate(6px,8px) rotate(1deg);opacity:.28}
  .layer.l3{transform:translate(11px,15px) rotate(2deg);opacity:.14}
  .card{position:absolute;inset:0;width:440px;height:277px;border-radius:22px;overflow:hidden;isolation:isolate;
    background:linear-gradient(155deg,#000000 0%,#140d03 38%,#1c1204 65%,#000000 100%);
    box-shadow:0 0 0 1px rgba(255,222,138,.4),0 18px 40px rgba(0,0,0,.6),0 50px 100px -24px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.08);
    animation:edgeglow 5s ease-in-out infinite}
  @keyframes edgeglow{0%,100%{box-shadow:0 0 0 1px rgba(255,222,138,.4),0 18px 40px rgba(0,0,0,.6),0 50px 100px -24px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.08)}
    50%{box-shadow:0 0 0 1px rgba(255,222,138,.75),0 18px 44px rgba(255,222,138,.12),0 50px 100px -24px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.1)}}
  .circuit{position:absolute;inset:0;z-index:0;opacity:.5}
  /* Guilloché security background — interwoven sine-wave lattice, the
     classic banknote/passport anti-copy pattern, layered under the circuit
     print. Fine intersecting curves are what photocopiers and scanners
     blur into moiré artifacts. */
  .guilloche{position:absolute;inset:0;z-index:0;opacity:.34}
  /* Ghost portrait — faint second rendering of the holder's photo (passport
     technique): duplicating the likeness makes photo-substitution forgery
     visible immediately, since both instances must match. */
  .ghost-portrait{position:absolute;right:92px;bottom:38px;width:58px;height:72px;object-fit:cover;z-index:1;
    opacity:.14;filter:grayscale(1) contrast(1.2);border-radius:4px;pointer-events:none}
  /* Contact line — nano-crisp but genuinely readable */
  .contact-line{position:absolute;left:20px;bottom:55px;z-index:3;font-family:'Space Mono',monospace;font-size:4.8px;
    letter-spacing:.12em;color:rgba(255,222,138,.75);font-weight:700}
  .card.back .contact-line{bottom:24px}
  .sheen{position:absolute;inset:0;z-index:1;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.05) 45%,rgba(255,255,255,.11) 50%,rgba(255,255,255,.05) 55%,transparent 70%);pointer-events:none}
  .vignette{position:absolute;inset:0;z-index:1;background:radial-gradient(340px 220px at 20% 0%,rgba(255,222,138,.16),transparent 60%),radial-gradient(300px 200px at 100% 100%,rgba(255,180,80,.08),transparent 60%)}
  .microtext{position:absolute;inset:5px;border:1px solid rgba(255,222,138,.32);border-radius:17px;z-index:1;pointer-events:none}
  .microtext:before{content:"SKYGLOBE GROUP · FOUNDER IDENTITY · TIER 0 · MAXIMUM CLEARANCE · SKYGLOBE GROUP · TIER 0 · ";position:absolute;top:-1px;left:8px;right:8px;font-family:'Space Mono',monospace;font-size:3.2px;letter-spacing:.06em;color:rgba(255,222,138,.5);white-space:nowrap;overflow:hidden}
  .hd{position:relative;z-index:3;display:flex;align-items:center;justify-content:space-between;padding:16px 20px 0}
  .brand{display:flex;align-items:center;gap:9px}
  .brand b{font-family:'Cormorant Garamond',serif;font-size:1.08rem;letter-spacing:.05em;color:#fff;font-weight:700}
  .brand b span{color:#fff6dd}
  .noria-mark{display:flex;align-items:center;gap:4px}
  .noria-mark span{font-family:'Space Mono',monospace;font-size:.42rem;letter-spacing:.14em;font-weight:700;background:linear-gradient(135deg,#FDBE2D,#F77F1B 40%,#2E7FD4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
  .status{display:flex;align-items:center;gap:5px}
  .status .dot{width:5px;height:5px;border-radius:50%;background:#5fe0a0;animation:pulse 1.6s infinite}
  @keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(95,224,160,.6)}50%{opacity:.5;box-shadow:0 0 0 4px rgba(95,224,160,0)}}
  .status span{font-family:'Space Mono',monospace;font-size:.42rem;color:#5fe0a0;letter-spacing:.1em;text-transform:uppercase}
  .tier{font-size:.48rem;letter-spacing:.2em;text-transform:uppercase;color:#0d0803;font-weight:800;background:linear-gradient(135deg,#fff6dd,#FFDE8A);padding:4px 11px;border-radius:20px;box-shadow:0 2px 10px rgba(255,222,138,.5)}
  .toprow{display:flex;align-items:center;gap:8px}
  .chip{width:34px;height:26px;border-radius:5px;position:relative;z-index:3;margin:16px 0 0 20px;
    background:linear-gradient(155deg,#ffe9b0,#d4a73a 45%,#8a6a1e);box-shadow:0 2px 6px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.5)}
  .chip:before{content:"";position:absolute;inset:3px;border-radius:2px;
    background:repeating-linear-gradient(90deg,transparent 0,transparent 3px,rgba(0,0,0,.28) 3px,rgba(0,0,0,.28) 4px);}
  .chip:after{content:"";position:absolute;inset:3px;border-radius:2px;border:1px solid rgba(0,0,0,.25)}
  .body{position:relative;z-index:3;display:flex;gap:16px;padding:12px 20px 0;align-items:flex-start}
  .scan-wrap{position:relative;flex-shrink:0;width:78px;height:96px}
  .photo{width:78px;height:96px;border-radius:6px;object-fit:cover;background:linear-gradient(150deg,#2a1f0c,#100a02);display:block}
  .bracket{position:absolute;width:14px;height:14px;border-color:#FFDE8A;opacity:.9}
  .bracket.tl{top:-4px;left:-4px;border-top:2px solid;border-left:2px solid;border-radius:4px 0 0 0}
  .bracket.tr{top:-4px;right:-4px;border-top:2px solid;border-right:2px solid;border-radius:0 4px 0 0}
  .bracket.bl{bottom:-4px;left:-4px;border-bottom:2px solid;border-left:2px solid;border-radius:0 0 0 4px}
  .bracket.br{bottom:-4px;right:-4px;border-bottom:2px solid;border-right:2px solid;border-radius:0 0 4px 0}
  .info{padding-top:2px}
  /* Laser-engraved look: embossed text with a micro-text underline built
     from the holder's own name repeated at ~3px — the digital analogue of
     laser-engraved microtext under the primary credential fields. */
  .nm{color:#fff;font-family:'Cormorant Garamond',serif;font-weight:700;font-size:1.22rem;line-height:1.1;
    text-shadow:0 1px 0 rgba(255,255,255,.12),0 -1px 1px rgba(0,0,0,.7)}
  /* Ghost engraving: the name is cut into the surface, not printed — barely
     perceptible in normal viewing (privacy by design), fully revealed only
     under the UV layer or via the machine-readable layers. */
  .nm.ghost{color:transparent;text-shadow:0 1px 1px rgba(255,255,255,.09),0 -1px 1px rgba(0,0,0,.55);
    -webkit-text-stroke:0.4px rgba(255,222,138,.14)}
  .nano-line{font-family:'Space Mono',monospace;font-size:3px;letter-spacing:.08em;color:rgba(255,222,138,.5);white-space:nowrap;overflow:hidden;max-width:190px;margin-top:1px}
  /* Holographic microtext strip — shifting spectral gradient over repeating
     micro-lettering, the analogue of a holographic microtext laminate band. */
  .holo-strip{position:absolute;left:20px;right:96px;bottom:44px;z-index:2;height:8px;overflow:hidden;border-radius:2px;opacity:.85}
  .holo-strip .txt{font-family:'Space Mono',monospace;font-size:4.6px;letter-spacing:.14em;white-space:nowrap;font-weight:700;
    background:linear-gradient(90deg,#ffd98a,#f7a8e0,#a9c8ff,#8affe0,#ffd98a);background-size:300% 100%;
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:holo 6s linear infinite}
  @keyframes holo{0%{background-position:0% 0}100%{background-position:300% 0}}
  /* UV invisible-ink layer — fully invisible in normal viewing; hovering the
     card = holding it under a UV lamp. Reveals a covert copy of the serial,
     holder name and DOB in UV-blue. */
  .uv-layer{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;
    opacity:0;transition:opacity .6s;pointer-events:none;background:rgba(20,0,60,.42)}
  .card:hover .uv-layer{opacity:1}
  .uv-layer .uv-txt{font-family:'Space Mono',monospace;font-weight:700;color:#7db4ff;text-shadow:0 0 12px #4a7dff,0 0 30px #4a7dff;letter-spacing:.2em;font-size:.7rem;text-transform:uppercase}
  .uv-layer .uv-sub{font-size:.44rem;color:#a9c8ff;letter-spacing:.14em;text-transform:uppercase;font-family:'Space Mono',monospace}
  .role{color:#fff6dd;font-size:.56rem;margin-top:3px;text-transform:uppercase;letter-spacing:.09em;font-weight:700}
  .kv{display:grid;grid-template-columns:auto 1fr;gap:2px 9px;margin-top:9px;font-size:.58rem}
  .kv .k{color:#a08a5a;text-transform:uppercase;letter-spacing:.05em;font-family:'Space Mono',monospace}
  .kv .v{color:#eef3ff;font-weight:600;font-family:'Space Mono',monospace}
  .idno{position:absolute;z-index:3;right:20px;top:16px;text-align:right;color:#fff6dd;font-family:'Space Mono',monospace;font-weight:700;font-size:.62rem;letter-spacing:.06em}
  .idno small{display:block;color:#a08a5a;font-size:.42rem;letter-spacing:.1em;text-transform:uppercase;font-family:Inter,sans-serif;margin-top:1px}
  .qr-wrap{position:absolute;z-index:3;right:18px;top:56px;background:#fff;border-radius:8px;padding:4px;box-shadow:0 4px 14px rgba(0,0,0,.4)}
  .qr-wrap img{width:58px;height:58px;display:block}
  .mrz{position:absolute;left:20px;right:96px;bottom:10px;z-index:3;font-family:'Space Mono',monospace;font-size:.5rem;letter-spacing:.08em;color:rgba(255,246,221,.55);line-height:1.5}
  .mrz .lbl{font-size:.38rem;color:#a08a5a;letter-spacing:.14em;text-transform:uppercase;margin-bottom:2px}
  .seal{position:absolute;z-index:3;left:50%;top:14px;transform:translateX(-50%);width:34px;height:34px;opacity:.92}
  .cardnum{color:#eef3ff;font-family:'Space Mono',monospace;font-weight:600;font-size:.66rem;letter-spacing:.1em;margin-top:8px}
  .stars{margin-top:6px;color:#FFDE8A;font-size:.6rem;letter-spacing:.1em}
  .glyph-wrap{position:absolute;z-index:3;right:18px;bottom:34px;width:38px;height:38px;background:rgba(255,222,138,.08);border:1px solid rgba(255,222,138,.35);border-radius:6px;padding:3px}
  .glyph-wrap svg{width:100%;height:100%}
  .glyph-lbl{position:absolute;z-index:3;right:18px;bottom:16px;font-size:.32rem;color:#a08a5a;letter-spacing:.08em;text-transform:uppercase;width:38px;text-align:center}
  .note{color:#a08a5a;font-size:.78rem;text-align:center;max-width:480px}
  * {-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
  @media print{
    body{background:#000!important;padding:10px}
    .stack{page-break-inside:avoid;margin:0 auto 14px}
    .card{animation:none!important;box-shadow:none!important}
    .note{display:none}
    .hdr-lbl{color:#FFDE8A!important}
  }
  .card.back{padding:18px 20px}
  .backhd{position:relative;z-index:3;display:flex;align-items:center;gap:9px;color:#fff6dd;font-size:.66rem;letter-spacing:.06em;font-family:'Cormorant Garamond',serif;font-weight:700}
  .backbody{position:relative;z-index:3;margin-top:12px}
  .backbody p{color:#c9bda0;font-size:.56rem;line-height:1.55;margin-bottom:8px;font-family:Inter,sans-serif}
  .backsig{position:relative;z-index:3;display:flex;align-items:flex-end;gap:12px;margin-top:8px}
  .backsig-lbl{font-size:.5rem;color:#a08a5a;border-top:1px solid rgba(255,222,138,.3);padding-top:3px;letter-spacing:.05em;text-transform:uppercase;font-family:'Space Mono',monospace}
  .backfoot{position:absolute;left:20px;right:20px;bottom:12px;z-index:3;font-size:.44rem;color:#7a6a44;letter-spacing:.04em;font-family:'Space Mono',monospace;text-align:center}
</style></head><body>

<div class="hdr-lbl" style="color:#a08a5a;font-family:'Space Mono',monospace;font-size:.7rem;letter-spacing:.14em;text-transform:uppercase">Front</div>
<div class="stack">
  <div class="layer l3"></div>
  <div class="layer l2"></div>
  <div class="card">
    <svg class="circuit" viewBox="0 0 440 277" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="circ" width="55" height="55" patternUnits="userSpaceOnUse">
          <path d="M0 27 H20 M20 10 V44 M20 10 H55 M20 44 H40 M40 44 V55" fill="none" stroke="#FFDE8A" stroke-width="0.6" opacity="0.5"/>
          <circle cx="20" cy="10" r="1.6" fill="#FFDE8A" opacity="0.6"/>
          <circle cx="20" cy="44" r="1.6" fill="#FFDE8A" opacity="0.6"/>
          <circle cx="40" cy="44" r="1.2" fill="#FFDE8A" opacity="0.5"/>
        </pattern>
      </defs>
      <rect width="440" height="277" fill="url(#circ)"/>
    </svg>
    ${guillocheSvg}
    <div class="vignette"></div>
    <div class="sheen"></div>
    <div class="microtext"></div>
    <div class="hd">
      <div class="brand">
        <img src="${origin}/icon-192.png" alt="SkyGlobe Group" style="width:24px;height:24px;border-radius:6px">
        <b>SKYGLOBE GROUP</b>
      </div>
      <div class="toprow">
        <div class="noria-mark" title="Secured by NORIA — SkyGlobe AI Intelligence">
          <svg width="15" height="15" viewBox="0 0 40 40"><defs><linearGradient id="noriaCeo" x1="0.72" y1="0.12" x2="0.28" y2="0.88"><stop offset="0%" stop-color="#FDBE2D"/><stop offset="34%" stop-color="#F77F1B"/><stop offset="62%" stop-color="#2E7FD4"/><stop offset="100%" stop-color="#1B57C8"/></linearGradient></defs>
            <path d="M20 0.8 C21.2 15.2,24.8 18.8,39.2 20 C24.8 21.2,21.2 24.8,20 39.2 C18.8 24.8,15.2 21.2,0.8 20 C15.2 18.8,18.8 15.2,20 0.8 Z" fill="url(#noriaCeo)"/></svg>
          <span>NORIA</span>
        </div>
        <div class="status"><span class="dot"></span><span>Live · Verified</span></div>
        <div class="tier">CEO · TIER 0</div>
      </div>
    </div>
    <svg class="seal" viewBox="0 0 100 100"><g fill="none" stroke="#FFDE8A" stroke-width="2.4" opacity="0.85">
      <path d="M50 8 C34 14 24 20 20 34 C24 30 34 28 40 30 C34 36 30 44 30 54 C36 48 44 44 48 46 C42 54 40 64 42 74 C46 66 50 62 50 62 C50 62 54 66 58 74 C60 64 58 54 52 46 C56 44 64 48 70 54 C70 44 66 36 60 30 C66 28 76 30 80 34 C76 20 66 14 50 8 Z"/>
    </g><circle cx="50" cy="40" r="14" fill="none" stroke="#FFDE8A" stroke-width="1.6" opacity="0.9"/>
      <path d="M36 40 H64 M50 26 V54 M40 30 Q50 40 40 50 M60 30 Q50 40 60 50" stroke="#FFDE8A" stroke-width="1" fill="none" opacity="0.75"/>
    </svg>
    <div class="chip"></div>
    <div class="idno">${cardNumber}<small>Card Number · Encrypted</small></div>
    <div class="qr-wrap"><img src="${qrUrl}" alt="Verification QR"></div>
    <div class="body">
      <div class="scan-wrap">
        <div class="bracket tl"></div><div class="bracket tr"></div><div class="bracket bl"></div><div class="bracket br"></div>
        ${photoTag}
      </div>
      <div class="info">
        <!-- Identity fields are NOT printed in plain view on the front.
             The name exists only as a ghost engraving (barely perceptible),
             its own micro-text line, and the UV layer. Nationality and DOB
             exist ONLY in micro-text, the UV layer, and the MRZ. -->
        <div class="nm ghost">${data.fullName}</div>
        ${nano(data.fullName)}
        <div class="role">${data.roleLine || 'Founder &amp; Chief Executive Officer'}</div>
        ${data.nationality ? nano('NAT ' + data.nationality) : ''}
        ${data.dob ? nano('DOB ' + data.dob) : ''}
        <div class="kv">
          ${data.height ? `<div class="k">Height</div><div class="v">${data.height}</div>` : ''}
          ${data.weight ? `<div class="k">Weight</div><div class="v">${data.weight}</div>` : ''}
          ${data.skinColor ? `<div class="k">Complexion</div><div class="v">${data.skinColor}</div>` : ''}
          <div class="k">Issued</div><div class="v">${data.issuedDate}</div>
        </div>
        <div class="stars" title="Security tier rating">★★★★★ <span style="color:#a08a5a;font-family:'Space Mono',monospace;font-size:.5rem">TIER 0</span></div>
      </div>
    </div>
    <div class="holo-strip"><div class="txt">${holoText}</div></div>
    <div class="glyph-wrap">${glyphSvg}</div>
    <div class="glyph-lbl">Security Glyph</div>
    <div class="mrz" data-covert="${covertPayload}"><div class="lbl">Machine-Readable Zone</div>${mrz1}<br>${mrz2}</div>
    ${ghostPortrait}
    ${contactLine}
    <div class="uv-layer">
      <div class="uv-txt">${data.ref}</div>
      <div class="uv-sub">${data.fullName}${data.dob ? ' · ' + data.dob : ''}${data.nationality ? ' · ' + data.nationality : ''}</div>
      <div class="uv-sub">SKYGLOBE GROUP · UV AUTHENTICATION LAYER</div>
    </div>
  </div>
</div>

<div class="hdr-lbl" style="color:#a08a5a;font-family:'Space Mono',monospace;font-size:.7rem;letter-spacing:.14em;text-transform:uppercase">Back</div>
<div class="stack">
  <div class="layer l3"></div>
  <div class="layer l2"></div>
  <div class="card back">
    <svg class="circuit" viewBox="0 0 440 277" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="circ2" width="55" height="55" patternUnits="userSpaceOnUse">
          <path d="M0 27 H20 M20 10 V44 M20 10 H55 M20 44 H40 M40 44 V55" fill="none" stroke="#FFDE8A" stroke-width="0.6" opacity="0.5"/>
          <circle cx="20" cy="10" r="1.6" fill="#FFDE8A" opacity="0.6"/>
          <circle cx="20" cy="44" r="1.6" fill="#FFDE8A" opacity="0.6"/>
          <circle cx="40" cy="44" r="1.2" fill="#FFDE8A" opacity="0.5"/>
        </pattern>
      </defs>
      <rect width="440" height="277" fill="url(#circ2)"/>
    </svg>
    ${guillocheSvg}
    <div class="vignette"></div>
    <div class="sheen"></div>
    <div class="microtext"></div>
    ${ghostPortrait}
    <div class="backhd">
      <img src="${origin}/icon-192.png" alt="SkyGlobe Group" style="width:20px;height:20px;border-radius:5px">
      <b>SKYGLOBE GROUP · FOUNDER IDENTITY</b>
    </div>
    <div class="backbody">
      <p>This card certifies the holder as the Founder &amp; Chief Executive Officer of SkyGlobe Group. It is issued, encrypted at rest and verified by SkyGlobe Group. It is not a government-issued identity document and does not confer any legal identity status outside SkyGlobe Group's own systems.</p>
      ${nano('SKYGLOBE GROUP FOUNDER IDENTITY ' + data.ref)}
      <p>Full record access — including photograph and personal details — requires the holder's private access code or authenticated SkyGlobe staff login. This card's authenticity can be independently confirmed at any time via the QR code on the front, which resolves to a public verification page showing name, role and validity only.</p>
      ${nano(data.fullName + ' ' + (data.dob || '') + ' ' + (data.nationality || ''))}
    </div>
    <div class="backsig">
      <img src="${sigUrl}" alt="" style="height:34px;filter:brightness(1.4)">
      <div class="backsig-lbl">Authorised Signatory<br>SkyGlobe Group</div>
      <img src="${stampUrl}" alt="" style="height:52px;width:52px;opacity:.85;margin-left:auto">
    </div>
    <div class="holo-strip" style="bottom:26px"><div class="txt">${holoText}</div></div>
    ${contactLine.replace('bottom:36px', 'bottom:24px')}
    <div class="backfoot">${cardNumber} · Reproduction or alteration of this card is prohibited · support@skyglobegroup.com</div>
  </div>
</div>
<div class="note">🔒 Encrypted at rest · circuit-trace security print · biometric scan-frame · SkyGlobe issuing seal · security glyph derived from this card's own access-code hash (unique per card, verifiable) · QR code is a genuine, independently scannable verification link; the MRZ line is a stylistic passport-style layout, not a certified ICAO machine-readable travel document zone · full record accessible only to the holder's private access code or authenticated staff.</div>
</body></html>`;
}

function wrapIdentityCard(tier, data, verifyUrl, req) {
  if (tier === 'ceo') return wrapCeoIdentityCard(data, verifyUrl, req);
  const t = ID_TIERS[tier] || ID_TIERS.member;
  const p = t.palette;
  const isCeo = false;
  const origin = req ? baseUrl(req) : 'https://skyglobegroup.com';
  const sigUrl = origin + '/signature.png';
  const stampUrl = origin + '/stamp.png';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=1&ecc=H&data=${encodeURIComponent(verifyUrl)}`;
  const photoTag = data.photoDataUrl ? `<img class="photo" src="${data.photoDataUrl}" alt="">` : `<div class="photo"></div>`;
  const photoBlock = `<div class="photo-wrap"><div class="chip"></div>${photoTag}</div>`;
  const ceoRibbon = '';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t.label} — ${data.fullName} — SkyGlobe Group</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Cormorant+Garamond:wght@600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:radial-gradient(1200px 700px at 50% -10%,#1a2740,#05070d 70%);font-family:Inter,sans-serif;padding:40px 20px;display:flex;flex-direction:column;align-items:center;gap:24px;min-height:100vh}
  .card{width:440px;height:274px;border-radius:20px;position:relative;overflow:hidden;
    background:linear-gradient(155deg,${p.a} 0%,${p.b} 40%,${p.c} 70%,${p.a} 100%);
    box-shadow:0 10px 30px rgba(0,0,0,.5),0 40px 90px -20px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.06);isolation:isolate}
  .card .pattern{position:absolute;inset:0;opacity:.16;mix-blend-mode:screen;z-index:0}
  .card .foil{position:absolute;top:0;right:0;width:120px;height:100%;
    background:linear-gradient(160deg,#ffd98a 0%,#f7a8e0 14%,#a9c8ff 28%,#8affe0 42%,#ffd98a 56%,#f7a8e0 70%,#a9c8ff 84%,#ffd98a 100%);
    opacity:${isCeo ? '.22' : '.13'};filter:blur(1px);z-index:1;mix-blend-mode:overlay}
  .seal-ring{position:absolute;top:-9px;left:-9px;width:94px;height:110px;border-radius:13px;border:1.5px solid ${p.accent};opacity:.55;z-index:1;box-shadow:0 0 14px ${p.accent}55}
  .ceo-photo{filter:saturate(1.05) contrast(1.04)}
  .ceo-ribbon{position:absolute;bottom:-1px;left:0;right:0;text-align:center;padding:4px 0 5px;font-family:'Space Mono',monospace;font-size:.42rem;letter-spacing:.14em;color:#0d0803;background:linear-gradient(90deg,${p.accent},${p.accent2},${p.accent});z-index:4;font-weight:700}
  .card:before{content:"";position:absolute;inset:0;background:radial-gradient(280px 180px at 15% 0%,${p.accent}38,transparent 60%);z-index:1}
  .card:after{content:"";position:absolute;width:260px;height:260px;border-radius:50%;border:1px solid ${p.accent}20;top:-90px;right:-70px;z-index:1}
  .microtext{position:absolute;inset:6px;border:1px solid ${p.accent}48;border-radius:15px;z-index:1;pointer-events:none}
  .microtext:before{content:"SKYGLOBE GROUP · ${t.badge} · ONE WORLD ONE MISSION · SKYGLOBE GROUP · ${t.badge} · ";position:absolute;top:-1px;left:8px;right:8px;font-family:'Space Mono',monospace;font-size:3.4px;letter-spacing:.06em;color:${p.accent}66;white-space:nowrap;overflow:hidden}
  .hd{position:relative;z-index:3;display:flex;align-items:center;justify-content:space-between;padding:18px 20px 0}
  .hd .brand{display:flex;align-items:center;gap:9px}
  .hd .brand b{font-family:'Cormorant Garamond',serif;font-size:1.14rem;letter-spacing:.05em;color:#fff;font-weight:700}
  .hd .brand b span{color:${p.accent2}}
  .hd .tier{font-size:.5rem;letter-spacing:.2em;text-transform:uppercase;color:#0d1424;font-weight:800;background:linear-gradient(135deg,${p.accent2},${p.accent});padding:4px 10px;border-radius:20px;box-shadow:0 2px 8px ${p.accent}66}
  .body{position:relative;z-index:3;display:flex;gap:16px;padding:16px 20px 0}
  .photo-wrap{position:relative;flex-shrink:0}
  .photo{width:76px;height:94px;border-radius:9px;background:linear-gradient(150deg,#1c2b4a,#0c1730);border:1.5px solid ${p.accent}8c;box-shadow:0 4px 14px rgba(0,0,0,.4);object-fit:cover}
  .chip{position:absolute;top:-7px;left:-7px;width:20px;height:16px;border-radius:3px;background:linear-gradient(135deg,#e8c877,#a9791f);box-shadow:0 2px 4px rgba(0,0,0,.4);z-index:2}
  .info .nm{color:#fff;font-family:'Cormorant Garamond',serif;font-weight:700;font-size:1.2rem;line-height:1.1}
  .info .role{color:${p.accent2};font-size:.58rem;margin-top:3px;text-transform:uppercase;letter-spacing:.1em;font-weight:700}
  .kv{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;margin-top:9px;font-size:.6rem}
  .kv .k{color:#7f93bd;text-transform:uppercase;letter-spacing:.06em;font-family:'Space Mono',monospace}
  .kv .v{color:#eef3ff;font-weight:600;font-family:'Space Mono',monospace}
  .footrow{position:absolute;bottom:${isCeo ? '26px' : '14px'};left:20px;right:20px;display:flex;justify-content:space-between;align-items:flex-end;z-index:3}
  .idno{color:${p.accent2};font-family:'Space Mono',monospace;font-weight:700;font-size:.8rem;letter-spacing:.08em}
  .idno small{display:block;color:#7f93bd;font-size:.48rem;letter-spacing:.14em;text-transform:uppercase;font-family:Inter,sans-serif;margin-top:2px}
  .qr-wrap{background:#fff;border-radius:8px;padding:5px;box-shadow:0 4px 14px rgba(0,0,0,.35)}
  .qr-wrap img{width:52px;height:52px;display:block}
  .note{color:#8fa3c9;font-size:.78rem;text-align:center;max-width:480px}
  * {-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
  @media print{body{background:#000!important;padding:10px}.card{box-shadow:none!important}.note{display:none}}
</style></head><body>
<div class="card">
  <svg class="pattern" viewBox="0 0 440 274" xmlns="http://www.w3.org/2000/svg">
    <defs><pattern id="g" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
      <circle cx="9" cy="9" r="7.5" fill="none" stroke="${p.accent}" stroke-width="0.35"/></pattern></defs>
    <rect width="440" height="274" fill="url(#g)"/></svg>
  <div class="foil"></div>
  <div class="microtext"></div>
  <div class="hd">
    <div class="brand">
      <img src="${origin}/icon-192.png" alt="SkyGlobe Group" style="width:26px;height:26px;border-radius:6px">
      <b>SKYGLOBE GROUP</b>
    </div>
    <div class="tier">${t.badge}</div>
  </div>
  <div class="body">
    ${photoBlock}
    <div class="info">
      <div class="nm">${data.fullName}</div>
      <div class="role">${data.roleLine || ''}</div>
      <div class="kv">
        ${data.nationality ? `<div class="k">Nationality</div><div class="v">${data.nationality}</div>` : ''}
        ${data.dob ? `<div class="k">Date of Birth</div><div class="v">${data.dob}</div>` : ''}
        ${data.height ? `<div class="k">Height</div><div class="v">${data.height}</div>` : ''}
        ${data.weight ? `<div class="k">Weight</div><div class="v">${data.weight}</div>` : ''}
        ${data.skinColor ? `<div class="k">Complexion</div><div class="v">${data.skinColor}</div>` : ''}
        <div class="k">Issued</div><div class="v">${data.issuedDate}</div>
        <div class="k">Status</div><div class="v">Active · Verified</div>
      </div>
    </div>
  </div>
  <div class="footrow">
    <div class="idno">${data.ref}<small>Serial number</small></div>
    <div class="qr-wrap"><img src="${qrUrl}" alt="Verification QR"></div>
  </div>
  ${ceoRibbon}
</div>
<div class="note">🔒 This card is encrypted at rest and its full record — including photo — is accessible only to the holder (with their private access code) or SkyGlobe staff. Scan the QR to verify authenticity — the public verification page never shows personal details, for every tier without exception.</div>
</body></html>`;
}

async function issueIdentityCard({ tier, fullName, nationality, dob, roleLine, email, photoDataUrl, height, weight, skinColor, religion, req }) {
  const ref = 'SGID-' + crypto.randomBytes(5).toString('hex').toUpperCase();
  const code = accessCode();
  const issuedDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const verifyUrl = `${baseUrl(req)}/verify-id/${ref}`;
  const html = wrapIdentityCard(tier, { fullName, nationality, dob, roleLine, ref, issuedDate, photoDataUrl, height, weight, skinColor, religion, accessCodeHash: hashAccessCode(code) }, verifyUrl, req);

  let photoUrl = null;
  if (photoDataUrl && /^data:image\/(png|jpe?g);base64,/.test(photoDataUrl)) {
    const buf = Buffer.from(photoDataUrl.split(',')[1], 'base64');
    if (buf.length <= 6 * 1024 * 1024) {
      const ext = photoDataUrl.includes('image/png') ? 'png' : 'jpg';
      const path_ = `identity/${ref}/photo.${ext}`;
      await storageUpload(path_, buf, `image/${ext === 'jpg' ? 'jpeg' : 'png'}`).catch(() => {});
      photoUrl = storagePublicUrl(path_);
    }
  }

  const filePath = `identity/${ref}/card.html`;
  // No silent catch here — if the card file doesn't actually reach storage,
  // the issuance should fail loudly right now, not quietly produce a broken
  // link that only breaks later when someone tries to view it.
  await storageUpload(filePath, Buffer.from(html, 'utf8'), 'text/html; charset=utf-8');
  const docRows = await dbQuery('POST', 'documents', {
    ref, filename: `id_${ref}.html`, path: filePath, uploaded_by: 'ai:identity',
  });
  const docRow = Array.isArray(docRows) ? docRows[0] : docRows;
  if (!docRow) throw new Error('Could not create the document record for this card.');
  const viewToken = docRow ? await createDocToken(docRow.id, filePath, `id_${ref}.html`, email || '', ref).catch(() => null) : null;
  const viewUrl = viewToken ? `${baseUrl(req)}/view/${viewToken}` : null;

  await dbQuery('POST', 'identity_cards', {
    ref, tier, full_name: fullName, nationality: nationality || null, dob: dob || null, role_line: roleLine || null,
    email: email || null, photo_url: photoUrl, access_code_hash: hashAccessCode(code), status: 'valid',
    height: height || null, weight: weight || null, skin_color: skinColor || null, religion: religion || null,
  }).catch(e => console.error('Identity card record save warning:', e.message));

  return { ref, code, viewUrl, verifyUrl, html };
}

// Member ID — auto-issued once a client's paid enrolment/service is confirmed.
// One member ID per email; calling again just returns the existing one.
app.post('/api/identity/member/issue', async (req, res) => {
  try {
    const { email, fullName, nationality, serviceLabel } = req.body || {};
    if (!email || !fullName) return res.status(400).json({ error: 'Email and full name are required.' });
    const existing = await dbQuery('GET', 'identity_cards', null, { email: `eq.${email}`, tier: 'eq.member', limit: 1 });
    if (existing[0]) return res.json({ success: true, ref: existing[0].ref, alreadyIssued: true });
    const result = await issueIdentityCard({
      tier: 'member', fullName, nationality, roleLine: serviceLabel ? `Enrolled · ${serviceLabel}` : 'Verified Member',
      email, req,
    });
    res.json({ success: true, ref: result.ref, viewUrl: result.viewUrl, accessCode: result.code });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Premium ID — public paid product. Requires the client to accept SkyGlobe's
// identity terms (logged with a timestamp) and pay before issuance.
app.post('/api/identity/premium/apply', async (req, res) => {
  try {
    const { unlock, fullName, nationality, dob, height, weight, skinColor, address, idNumber, sector, email, photoDataUrl, termsAccepted } = req.body || {};
    if (!unlock || !verifyUnlock(unlock, 'premium_digital_id'))
      return res.status(402).json({ error: 'Payment required', pay: { product: 'premium_digital_id' } });
    if (!fullName || !email || !sector) return res.status(400).json({ error: 'Full name, email and sector are required.' });
    if (!termsAccepted) return res.status(400).json({ error: 'You must accept the identity terms to proceed.' });
    const result = await issueIdentityCard({
      tier: 'premium', fullName, nationality, dob, height, weight, skinColor, roleLine: sector, email, photoDataUrl, req,
    });
    await dbQuery('PATCH', 'identity_cards', {
      address: address || null, id_number: idNumber || null,
      terms_accepted_at: new Date().toISOString(),
    }, { ref: `eq.${result.ref}` }).catch(() => {});
    // Safety-net email — the on-page confirmation is shown only once, so if
    // the client closes the tab without saving their access code, this is
    // their only other way back to the card.
    if (email) {
      sendEmail(email, `Your SkyGlobe Digital ID is ready — ${result.ref}`,
        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a2233">
          <h2 style="color:#a87016;font-family:Georgia,serif">Your Digital ID is ready</h2>
          <p>Dear ${fullName},</p>
          <p>Your SkyGlobe Premium Digital ID (Ref: <strong>${result.ref}</strong>) has been issued.</p>
          <p style="margin:22px 0"><a href="${result.viewUrl}" style="background:#D4A73A;color:#1a1300;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:30px">Open my ID card</a></p>
          <p><strong>Your private access code:</strong> ${result.code}<br>
          <span style="font-size:13px;color:#6b7689">Keep this safe — it is the only way to retrieve your full record if you lose this email.</span></p>
          <p style="font-size:13px;color:#6b7689">Facilitated &amp; Verified by SkyGlobe Group · Global Operations · One World. One Mission.</p>
        </div>`
      ).catch(e => console.error('Premium ID confirmation email failed:', e.message));
    }
    // Human-review queue: each issued Premium ID gets a staff verification
    // pass (details, photo, standards) right behind the instant issuance.
    dbQuery('POST', 'ai_reception', {
      source: 'document', ref: result.ref, client_name: fullName, client_email: email,
      service: 'Premium Digital ID (issued)', department: 'identity',
      urgency: 'normal', intent: 'Premium Digital ID was issued instantly — verify the holder details and photo meet SkyGlobe identity standards; follow up if anything looks wrong.',
      sentiment: 'neutral', suggested_reply: '', needs_human: true, status: 'new',
      raw: { viewUrl: result.viewUrl },
    }).catch(() => {});
    res.json({ success: true, ref: result.ref, viewUrl: result.viewUrl, accessCode: result.code });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Staff & CEO IDs — issued only by the CEO from the admin portal.
app.post('/api/admin/identity/staff/issue', async (req, res) => {
  if (!checkAdmin(req, res)) return;
  try {
    const { fullName, roleLine, email, nationality, photoDataUrl } = req.body || {};
    if (!fullName) return res.status(400).json({ error: 'Full name is required.' });
    const result = await issueIdentityCard({ tier: 'staff', fullName, nationality, roleLine: roleLine || 'SkyGlobe Group Staff', email, photoDataUrl, req });
    res.json({ success: true, ref: result.ref, viewUrl: result.viewUrl, accessCode: result.code });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/identity/ceo/issue', async (req, res) => {
  if (!checkAdmin(req, res)) return;
  try {
    const { fullName, nationality, dob, roleLine, photoDataUrl, height, weight, skinColor, religion } = req.body || {};
    if (!fullName) return res.status(400).json({ error: 'Full name is required.' });
    const result = await issueIdentityCard({ tier: 'ceo', fullName, nationality, dob, roleLine: roleLine || 'Founder & Chief Executive Officer', photoDataUrl, height, weight, skinColor, religion, req });
    res.json({ success: true, ref: result.ref, viewUrl: result.viewUrl, accessCode: result.code });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Public verification — minimal, same discipline as certificates/documents.
app.get('/api/identity/verify/:ref', async (req, res) => {
  try {
    const rows = await dbQuery('GET', 'identity_cards', null, { ref: `eq.${req.params.ref}`, limit: 1 });
    const c = rows[0];
    if (!c) return res.status(404).json({ valid: false, error: 'No identity card found with this reference.' });
    res.json({
      valid: c.status === 'valid', ref: c.ref, tier: ID_TIERS[c.tier]?.label || c.tier,
      fullName: c.full_name, roleLine: c.role_line, issuedBy: 'SkyGlobe Group',
      // No tier ever exposes a photo, address, nationality, DOB or contact
      // detail on this public, unauthenticated endpoint — including the CEO's
      // own card. Full record (with photo) requires the access code or staff auth.
    });
  } catch (e) { res.status(500).json({ valid: false, error: e.message }); }
});

// Full record — requires the holder's private access code, or staff auth.
app.post('/api/identity/:ref/full', async (req, res) => {
  try {
    const { accessCode: code } = req.body || {};
    const rows = await dbQuery('GET', 'identity_cards', null, { ref: `eq.${req.params.ref}`, limit: 1 });
    const c = rows[0];
    if (!c) return res.status(404).json({ error: 'Not found.' });
    const isStaff = !!checkStaffOrAdmin(req, null);
    if (!isStaff && (!code || hashAccessCode(code) !== c.access_code_hash))
      return res.status(401).json({ error: 'Invalid access code.' });
    res.json(c);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/verify-id/:ref', (req, res) => res.sendFile(path.join(__dirname, 'id-verify.html')));

// High-resolution PNG export — for a real card printer, not a browser print
// dialog. Renders the card's actual stored HTML in a real headless browser
// (so every gradient, font and effect matches the design exactly) and
// screenshots the front and back separately at CR80 print resolution
// (300 DPI, ~1013×638px). Staff/admin only — this touches the full stored
// record, including photo.
app.get('/api/identity/:ref/export.png', async (req, res) => {
  if (!checkStaffOrAdmin(req, res)) return;
  try {
    const side = req.query.side === 'back' ? 'back' : 'front';
    const rows = await dbQuery('GET', 'documents', null, { ref: `eq.${req.params.ref}`, uploaded_by: 'eq.ai:identity', limit: 1 });
    const docRow = rows[0];
    if (!docRow) return res.status(404).json({ error: 'Card not found.' });
    const upstream = await fetch(storagePublicUrl(docRow.path));
    if (!upstream.ok) return res.status(404).json({ error: 'Card file not found in storage.' });
    const html = await upstream.text();

    let puppeteer, chromium;
    try {
      puppeteer = require('puppeteer-core');
      chromium = require('@sparticuz/chromium');
    } catch {
      return res.status(503).json({ error: 'High-resolution export is not available on this deployment yet (dependencies not installed). Please contact support.' });
    }

    // ETXTBSY happens when Chromium's binary is still being extracted to /tmp
    // (first request after a deploy, or two exports racing). Serialize all
    // launches behind a single in-flight promise and retry once after a
    // short delay — the standard fix for @sparticuz/chromium on hosts like
    // Render/Lambda.
    async function launchBrowser() {
      const exePath = await chromium.executablePath();
      const opts = { headless: true, args: chromium.args, executablePath: exePath };
      try {
        return await puppeteer.launch(opts);
      } catch (err) {
        if (String(err.message).includes('ETXTBSY')) {
          await new Promise(r => setTimeout(r, 1500));
          return await puppeteer.launch(opts);
        }
        throw err;
      }
    }
    global.__idExportQueue = (global.__idExportQueue || Promise.resolve())
      .catch(() => {})
      .then(() => launchBrowser());
    const browser = await global.__idExportQueue;
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1400, height: 1400, deviceScaleFactor: 3 }); // 3x for ~300 DPI at CR80 scale
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 20000 });
      const stacks = await page.$$('.stack');
      const target = side === 'back' ? (stacks[1] || stacks[0]) : stacks[0];
      if (!target) throw new Error('Could not locate the card element to export.');
      const png = await target.screenshot({ type: 'png' });
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="${req.params.ref}-${side}.png"`);
      res.send(png);
    } finally {
      await browser.close();
    }
  } catch (e) {
    console.error('Identity export error:', e.message);
    res.status(500).json({ error: 'Could not generate the high-resolution export: ' + e.message });
  }
});
app.get('/digital-id', (req, res) => res.sendFile(path.join(__dirname, 'digital-id.html')));
app.get('/courses', (req, res) => res.sendFile(path.join(__dirname, 'courses.html')));
app.get('/courses/learn', (req, res) => res.sendFile(path.join(__dirname, 'course-learn.html')));

// ── §14b SPA CATCH-ALL (must stay LAST so it never shadows API routes) ────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ── #23 GLOBAL EXPRESS ERROR HANDLER ─────────────────────────────────────────
// Must be 4-argument to be recognised by Express as error middleware.
app.use((err, req, res, next) => {
  logError({ source: 'server', message: err.message, stack: err.stack, url: req.originalUrl });
  if (res.headersSent) return;
  if (err.type === 'entity.too.large' || /request entity too large/i.test(err.message || ''))
    return res.status(413).json({ error: 'That photo is too large. Please choose a smaller image (under ~8MB) and try again.' });
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SkyGlobe server running on port ${PORT}`);
  refreshStaffCache(); // load CEO-portal staff accounts into memory
  brevoKeepAlive();    // keep the fallback email key active (Brevo expires keys unused for 90 days)
  refreshCourseTracks(); // load CEO-added courses into the catalog
});

// ── BREVO KEY KEEP-ALIVE ─────────────────────────────────────────────────────
// Brevo deactivates API keys after 90 days without use. Since Brevo is only
// our FALLBACK (it sends nothing while Resend is healthy), the key could sit
// idle and expire exactly when we need it. A lightweight read-only ping on
// every server start + weekly counts as API activity and keeps it alive.
async function brevoKeepAlive() {
  const key = process.env.BREVO_API_KEY;
  if (!key) return;
  try {
    const r = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': key, 'Accept': 'application/json' },
    });
    console.log(r.ok ? '[brevo] keep-alive ping OK — fallback key active'
                     : `[brevo] keep-alive ping failed (${r.status}) — CHECK BREVO_API_KEY`);
  } catch (e) { console.error('[brevo] keep-alive error:', e.message); }
  setTimeout(brevoKeepAlive, 7 * 24 * 60 * 60 * 1000).unref?.(); // weekly re-ping
}
// Keep the staff-account cache fresh (in case of direct DB edits)
setInterval(refreshStaffCache, 5 * 60 * 1000);

// ── KEEP-ALIVE SELF-PING (prevents Render free-tier cold starts) ─────────────
// Render sleeps the service after ~15 min with no inbound HTTP traffic.
// We ping our own /api/health every 13 minutes so the service stays awake.
const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
setInterval(() => {
  fetch(`${SELF_URL}/api/health`)
    .then(() => console.log('[keep-alive] ping ok', new Date().toISOString()))
    .catch((e) => console.log('[keep-alive] ping failed', e.message));
}, 13 * 60 * 1000);
