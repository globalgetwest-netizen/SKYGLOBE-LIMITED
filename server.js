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
//  §13  Kids Academy             (parents, students, teachers, admissions, records)
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
      "frame-ancestors 'none'",
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

app.use(express.json({ limit: '2mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(cors());

// ── #20 STATIC CACHING HEADERS ────────────────────────────────────────────────
// Repeat visitors re-use cached assets instead of re-downloading them.
//  • HTML  → always revalidate (users always get the newest page)
//  • CSS/JS → 1 hour (fresh enough to pick up edits, still fast on repeat hits)
//  • images/fonts/icons → 30 days (these rarely change)
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

// ── RESEND EMAIL ──────────────────────────────────────────────────────────────
async function sendEmail(to, subject, html, replyTo) {
  const body = {
    from: 'SkyGlobe Group <support@skyglobegroup.com>',
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
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
  try {
    return await geminiGenerate(prompt, opts);
  } catch (gemErr) {
    console.warn('[AI] Gemini failed, falling back to Claude:', gemErr.message);
    try {
      return await claudeGenerate(prompt, opts);
    } catch (claudeErr) {
      console.error('[AI] Both engines failed. Gemini:', gemErr.message, '| Claude:', claudeErr.message);
      throw new Error('Both AI engines unavailable: ' + claudeErr.message);
    }
  }
}

// ── §4 PUBLIC ROUTES ─────────────────────────────────────────────────────────
// ── CONTACT / CONSULTATION FORM ───────────────────────────────────────────────
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
  if (!process.env.RESEND_API_KEY)
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
app.get('/packages', (req, res) => res.sendFile(path.join(__dirname, 'packages.html')));
app.get('/work-permit', (req, res) => res.sendFile(path.join(__dirname, 'work-permit.html')));
app.get('/kids-academy', (req, res) => res.sendFile(path.join(__dirname, 'skyglobe-kids-academy.html')));
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
- Kids Academy educational programmes

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
  try {
    const r = await fetch('https://noria-engine.onrender.com/v1/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: String(message).trim(),
        history: Array.isArray(history) ? history.slice(-10) : [],
      }),
      signal: AbortSignal.timeout(25000),
    });
    const data = await r.json();
    res.json({ reply: data.answer || skyglobeFaqAnswer(String(message).trim()), source: 'noria' });
  } catch (e) {
    console.error('NORIA proxy error:', e.message);
    const isTimeout = e.name === 'TimeoutError' || e.name === 'AbortError';
    const fallback = isTimeout
      ? '__NORIA_WARMING__'
      : skyglobeFaqAnswer(String(message).trim());
    res.json({ reply: fallback, source: isTimeout ? 'warming' : 'faq' });
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
    upstream.body.pipe(res);
  } catch (e) { res.status(500).send('Error loading document.'); }
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
  const key = process.env.RESEND_API_KEY;
  const to  = process.env.RECIPIENT_EMAIL || 'support@skyglobegroup.com';
  if (!key) return res.json({ ok: false, error: 'RESEND_API_KEY env var is missing' });
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'SkyGlobe Test <support@skyglobegroup.com>', to: [to], subject: 'SkyGlobe — Email Test', html: '<p>✅ Email is working!</p>' }),
    });
    res.json({ ok: r.ok, status: r.status, resend_response: await r.json() });
  } catch (err) { res.json({ ok: false, error: err.message }); }
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
app.get('/api/client/documents', async (req, res) => {
  const email = clientAuth(req);
  if (!email) return res.status(401).json({ error: 'Not logged in.' });
  try {
    const apps = await dbQuery('GET', 'applications', null, { email: `eq.${email}`, select: 'ref', limit: 100 });
    if (!apps.length) return res.json([]);
    const allDocs = [];
    for (const app of apps) {
      const docs = await dbQuery('GET', 'documents', null, { ref: `eq.${app.ref}`, order: 'created_at.desc', limit: 50 });
      const staffDocs = docs.filter(d => d.uploaded_by && (String(d.uploaded_by).startsWith('admin') || String(d.uploaded_by).startsWith('staff')));
      for (const d of staffDocs) {
        // look up secure token for this doc
        const trows = await dbQuery('GET', 'document_tokens', null, { document_id: `eq.${d.id}`, limit: 1 }).catch(() => []);
        const tok = trows[0];
        const expired = tok && new Date(tok.expires_at) < new Date();
        allDocs.push({ ...d, application_ref: app.ref, view_token: tok && !expired ? tok.token : null, token_expires: tok?.expires_at || null });
      }
    }
    allDocs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(allDocs);
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
};

function buildLegalPrompt(docId, fields) {
  const meta = LEGAL_DOC_INDEX[docId];
  const guidance = LEGAL_DOC_GUIDANCE[docId];
  const f = fields || {};
  return `You are a senior legal documentation specialist at SkyGlobe Group. ${guidance}

Use ONLY these real details supplied by the client — never invent names, institutions, figures, registration numbers, dates or facts that are not provided:
- Full name of the principal person: ${f.fullName || 'Not provided'}
- Nationality / country: ${f.nationality || 'Not provided'}
- Other party (host / employer / sponsor / organisation / recipient): ${f.counterparty || 'Not provided'}
- Relevant dates / period: ${f.dates || 'Not provided'}
- Place / destination / address: ${f.location || 'Not provided'}
- Specific facts and details for this document: ${f.details || 'Not provided'}

STRICT RULES:
- NEVER use bracketed placeholders such as [Name], [Date], [Address]. The body must read as complete prose.
- Do NOT write a sender address block, date line, letterhead, reference number, signature name or job title — these are added automatically by our system. Begin directly with the salutation or opening line.
- Do NOT fabricate any qualification, employment, enrolment, financial figure or official outcome that was not supplied. If a detail is missing, write gracefully around it.
- Never claim that SkyGlobe Group issues, certifies or guarantees the instrument — SkyGlobe only facilitates and verifies the document.
- Output plain text only: no markdown, asterisks or headings. Separate paragraphs with a blank line. Keep it formal, precise and well-structured.`;
}

// Branded, verified HTML wrapper rendered into the secure viewer.
function wrapLegalDoc(title, bodyText, ref) {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const paras = String(bodyText).trim().split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</p>`).join('\n');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — SkyGlobe Group</title>
<style>
  body{font-family:"Georgia","Times New Roman",serif;color:#1a2233;background:#fff;margin:0;padding:48px 56px;line-height:1.7;max-width:820px;margin:0 auto}
  .lh{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #D4A73A;padding-bottom:16px;margin-bottom:8px}
  .lh .b{font-family:Arial,sans-serif;font-weight:700;letter-spacing:.08em;color:#041022;font-size:1.3rem}
  .lh .b small{display:block;color:#a87016;font-size:.6rem;letter-spacing:.24em;font-weight:600}
  .lh .meta{text-align:right;font-family:Arial,sans-serif;font-size:.72rem;color:#6b7689;line-height:1.5}
  h1{font-size:1.2rem;text-transform:uppercase;letter-spacing:.06em;color:#041022;margin:26px 0 18px;font-family:Arial,sans-serif}
  p{margin:0 0 14px}
  .stamp{margin-top:46px;border-top:1px solid #e6e9ef;padding-top:18px;display:flex;align-items:center;gap:14px}
  .seal{width:64px;height:64px;border-radius:50%;border:2px solid #D4A73A;display:flex;align-items:center;justify-content:center;text-align:center;font-family:Arial,sans-serif;font-size:.52rem;font-weight:700;color:#a87016;letter-spacing:.04em;line-height:1.25;flex:none}
  .stamp .t{font-family:Arial,sans-serif;font-size:.78rem;color:#3c465a}
  .stamp .t strong{color:#041022}
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
    <div class="seal">FACILITATED &amp; VERIFIED · SKYGLOBE GROUP</div>
    <div class="t"><strong>Facilitated &amp; Verified by SkyGlobe Group</strong><br>This document was prepared and verified by SkyGlobe Group. SkyGlobe does not issue or certify instruments it did not witness.</div>
  </div>
  <div class="foot">© ${new Date().getFullYear()} SkyGlobe Group · Global Operations · support@skyglobegroup.com · One World. One Mission.</div>
</body></html>`;
}

// Public catalogue for the front-end (document types + tiers + live prices).
app.get('/api/legal-docs/catalog', (_req, res) => {
  const tiers = LEGAL_TIERS.map(t => ({
    id: t.id, name: t.name, product: t.product, blurb: t.blurb, perks: t.perks,
    price: { USD: PRICING[t.product].USD, EUR: PRICING[t.product].EUR, GBP: PRICING[t.product].GBP },
  }));
  res.json({ groups: LEGAL_DOC_TYPES, tiers });
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
    if (!f.fullName || !f.details)
      return res.status(400).json({ error: 'Full name and document details are required.' });
    if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY)
      return res.status(500).json({ error: 'AI not configured. Please contact support.' });

    const body = await generateText(buildLegalPrompt(docId, f), { maxTokens: 2048, temperature: 0.55 });
    const ref = 'SGL-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const html = wrapLegalDoc(meta.name, body, ref);

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
};

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
  return process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}`;
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
      }
    } catch (e) { console.error('fulfilPayment app update failed:', e.message); }
  }
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
    const { reference, name, email, phone, note } = req.body || {};
    if (!reference) return res.status(400).json({ error: 'Missing payment reference.' });
    const payment = await getPayment(String(reference).trim());
    if (!payment) return res.status(404).json({ error: 'We could not find that payment reference. Please check it or contact us on WhatsApp.' });
    if (payment.status === 'paid')
      return res.json({ success: true, alreadyPaid: true });

    await updatePayment(payment.reference, {
      status: 'awaiting_confirmation',
      notified_at: new Date().toISOString(),
      notified_by: { name: name || '', email: email || payment.email, phone: phone || '', note: note || '' },
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
          <p>Verify this transfer landed in the Grey account, then confirm it from the CEO portal (Payments) to unlock the client's service automatically.</p>
        </div>`);
    } catch (e) { console.error('grey/notify email failed:', e.message); }

    res.json({ success: true });
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
    if (b.active !== undefined) patch.active = !!b.active;
    if (b.priority !== undefined) patch.priority = Number(b.priority);
    const updated = await dbQuery('PATCH', 'announcements', patch, { id: `eq.${req.params.id}` });
    logActivity(who, 'ceo', 'announcement_update', `Updated announcement #${req.params.id}`, String(req.params.id));
    res.json({ success: true, announcement: Array.isArray(updated) ? updated[0] : updated });
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
    const [apps, payments, staff, tasks, activity, conferences, legalDocs, clients, sessionLogs] = await Promise.all([
      _dbTimeout(dbQuery('GET', 'applications', null, { order: 'created_at.desc', limit: 50 }).catch(() => [])),
      _dbTimeout(dbQuery('GET', 'payments', null, { order: 'created_at.desc', limit: 50 }).catch(() => [])),
      _dbTimeout(dbQuery('GET', 'staff_members', null, { limit: 100 }).catch(() => [])),
      _dbTimeout(dbQuery('GET', 'tasks', null, { order: 'created_at.desc', limit: 50 }).catch(() => [])),
      _dbTimeout(dbQuery('GET', 'activity_log', null, { order: 'created_at.desc', limit: 20 }).catch(() => [])),
      _dbTimeout(dbQuery('GET', 'conferences', null, { order: 'date.desc', limit: 20 }).catch(() => [])),
      _dbTimeout(dbQuery('GET', 'documents', null, { uploaded_by: 'eq.ai:legal-docs', order: 'created_at.desc', limit: 30 }).catch(() => [])),
      _dbTimeout(dbQuery('GET', 'clients', null, { select: 'email,name,created_at', order: 'created_at.desc', limit: 50 }).catch(() => [])),
      _dbTimeout(dbQuery('GET', 'session_logs', null, { order: 'logged_in_at.desc', limit: 30 }).catch(() => [])),
    ]);

    const now = new Date();
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
LOGINS TODAY: ${uniqueLoginsToday.length} users | ${uniqueLoginsToday.slice(0,5).join(', ')||'none'}
RECENT ACTIVITY: ${activity.slice(0,6).map(a=>`[${(a.created_at||'').slice(0,16)}] ${a.actor} ${a.action} ${a.detail||''}`).join(' | ')||'none'}`;

    const systemPrompt = `You are SKYGLOBE CORE Intelligence — private AI assistant to Saleh Shuaibu, Founder & CEO of SkyGlobe Group. Monitor, analyse, and report on the entire SkyGlobe Group ecosystem. Use the live data below. Be concise, precise, strategic. Use bullet points and numbers. Address the CEO efficiently. Never guess — say "not in current data" if needed.

ABOUT SKYGLOBE GROUP: 5 divisions — Global Mobility, Travel Services, Events & Conferences, Knowledge Hub (incl. Kids Academy), Digitalization. Motto: One World. One Mission. Anchors: CONSTRUCT · TRUST · INTELLIGENCE · POWER. Pricing in USD/EUR/GBP only.

LIVE DATA:
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
// SKYGLOBE KIDS ACADEMY — AI TEACHERS (Phase 1: parent accounts + Math tutor "Numa")
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

You are the ${teacher.subject} teacher at SkyGlobe Kids Academy. You are warm, patient, encouraging, and never condescending. You teach ONE child named ${student.name}, age ${age}${student.grade ? `, grade ${student.grade}` : ''}.

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
// SKYGLOBE KIDS ACADEMY — PROFESSIONAL ADMISSION + ACADEMIC RECORDS
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
      await sendEmail(guardianEmail, `Application Received — SkyGlobe Kids Academy`,
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#041022;padding:28px;text-align:center;border-radius:8px 8px 0 0">
            <h1 style="color:#D4A73A;margin:0;font-size:1.4rem">Application Received ✅</h1>
            <p style="color:#8899bb;margin:6px 0 0">SkyGlobe Kids Academy</p>
          </div>
          <div style="background:#f9f9f9;padding:28px;border:1px solid #e0e0e0;border-radius:0 0 8px 8px">
            <p>Dear ${esc2(b.guardianName) || 'Parent/Guardian'}, thank you for applying to enrol <strong>${esc2(fullName)}</strong>.</p>
            <p>Your application reference is <strong>${esc2(student?.id || '')}</strong>. Our admissions team is now reviewing it. You can track the status anytime by logging in to the Family Campus.</p>
            <p style="color:#555;font-size:.85rem">SkyGlobe Kids Academy · part of SkyGlobe Group</p>
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
              <p><strong>${esc2(st.name)}</strong> has been accepted to SkyGlobe Kids Academy!</p>
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
        await sendEmail(st.parent_email, 'Enrolment Complete — Welcome to SkyGlobe Kids Academy',
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
  if (process.env.RESEND_API_KEY) {
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

// ── §14b SPA CATCH-ALL (must stay LAST so it never shadows API routes) ────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ── #23 GLOBAL EXPRESS ERROR HANDLER ─────────────────────────────────────────
// Must be 4-argument to be recognised by Express as error middleware.
app.use((err, req, res, next) => {
  logError({ source: 'server', message: err.message, stack: err.stack, url: req.originalUrl });
  if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SkyGlobe server running on port ${PORT}`);
  refreshStaffCache(); // load CEO-portal staff accounts into memory
});
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
