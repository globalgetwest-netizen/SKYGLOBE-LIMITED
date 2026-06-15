require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json({ limit: '15mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname)));

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
    'Prefer': method === 'POST' ? 'return=representation' : 'return=representation',
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
    from: 'SkyGlobe Limited <support@skyglobegroup.com>',
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

// ── CONTACT / CONSULTATION FORM ───────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { fname, lname, email, phone, service, destination, message } = req.body;
  if (!fname || !email || !service)
    return res.status(400).json({ error: 'Name, email and service are required.' });
  if (!process.env.RESEND_API_KEY)
    return res.status(500).json({ error: 'Email service not configured. Contact us via WhatsApp.' });

  const recipientEmail = process.env.RECIPIENT_EMAIL ? process.env.RECIPIENT_EMAIL.split(',').map(s => s.trim()) : ['support@skyglobegroup.com', 'insights.skyglobe@gmail.com'];
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#0a1628;padding:24px;border-radius:8px 8px 0 0">
        <img src="https://skyglobegroup.com/logo.png" alt="SkyGlobe Limited" style="height:64px;width:auto;border-radius:10px;margin-bottom:10px"><br>
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
app.post('/api/apply', async (req, res) => {
  const {
    service, fname, lname, email, phone, dob, nationality, passport, passportExpiry,
    destination, travelDate, duration, purpose, institution, employer,
    hotelCity, checkin, checkout, coverage, docType, scholarship, notes
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
        <img src="https://skyglobegroup.com/logo.png" alt="SkyGlobe Limited" style="height:64px;width:auto;border-radius:10px;margin-bottom:10px"><br>
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
        <img src="https://skyglobegroup.com/logo.png" alt="SkyGlobe Limited" style="height:64px;width:auto;border-radius:10px;margin-bottom:10px"><br>
        <h1 style="color:#c9a84c;margin:0 0 8px;font-size:1.6rem">Application Received ✅</h1>
        <p style="color:#8899bb;margin:0">SKYGLOBE LIMITED</p>
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
        Skyglobe Limited · support@skyglobegroup.com
      </div>
    </div>`;

  try { await sendEmail(recipientEmail, `New Application [${ref}] — ${service}`, adminHtml, email); }
  catch (e) { console.error('Admin email failed:', e.message); }

  try { await sendEmail(email, `Application Confirmed [${ref}] — Skyglobe Limited`, userHtml); }
  catch (e) { console.error('User email failed:', e.message); }

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

// ── ADMIN ─────────────────────────────────────────────────────────────────────
function checkAdmin(req) {
  const raw = process.env.ADMIN_PASSWORDS || process.env.ADMIN_PASSWORD || '';
  if (!raw) return null;
  const supplied = req.headers['x-admin-key'] || '';
  for (const entry of raw.split(',').map(s => s.trim()).filter(Boolean)) {
    const [a, b] = entry.includes(':') ? entry.split(':') : [null, entry];
    if (supplied === b) return a || 'admin';
  }
  return null;
}

app.post('/api/admin/login', (req, res) => {
  const fakeReq = { headers: { 'x-admin-key': (req.body && req.body.password) || '' } };
  const who = checkAdmin(fakeReq);
  if (!who) return res.status(401).json({ error: 'Wrong password.' });
  res.json({ success: true, name: who });
});

app.get('/api/admin/applications', async (req, res) => {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try { res.json(await getAllApps()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/update', async (req, res) => {
  const who = checkAdmin(req);
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
            <img src="https://skyglobegroup.com/logo.png" alt="SkyGlobe Limited" style="height:64px;width:auto;border-radius:10px;margin-bottom:10px"><br>
            <h1 style="color:#c9a84c;margin:0;font-size:1.4rem">Application Update</h1>
            <p style="color:#8899bb;margin:6px 0 0">SKYGLOBE LIMITED</p>
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

    res.json({ success: true, emailed, emailError: emailed ? null : 'Could not email applicant directly — a fallback notification was sent to your admin email. To fix permanently, verify a domain on Resend.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DOCUMENTS ─────────────────────────────────────────────────────────────────
// Upload a document. Body: { ref, filename, contentType, data (base64) }
// Users upload from the tracking page; admins (with x-admin-key) from the dashboard.
app.post('/api/documents', async (req, res) => {
  const { ref, filename, contentType, data } = req.body || {};
  if (!ref || !filename || !data)
    return res.status(400).json({ error: 'ref, filename and data are required.' });

  const who = checkAdmin(req); // null = regular applicant
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

    res.json({ success: true, document: Array.isArray(rows) ? rows[0] : rows, url: storagePublicUrl(filePath) });
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

// Admin: delete a document
app.delete('/api/documents/:id', async (req, res) => {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const rows = await dbQuery('GET', 'documents', null, { id: `eq.${req.params.id}`, limit: 1 });
    if (!rows[0]) return res.status(404).json({ error: 'Document not found.' });
    await fetch(`${SUPA_URL}/storage/v1/object/documents/${rows[0].path}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` },
    });
    await dbQuery('DELETE', 'documents', null, { id: `eq.${req.params.id}` });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// ── AI CHAT ───────────────────────────────────────────────────────────────────
const SKYGLOBE_SYSTEM = `You are the AI assistant for SkyGlobe Limited, a premium global travel and immigration consultancy. You are knowledgeable, professional, warm, and concise.

Company facts:
- Founded 2016, based in New York City
- 12,400+ visas approved, 98% success rate, 47 countries served
- Phone/WhatsApp: +1 737-399-8522
- Email: support@skyglobegroup.com
- Website: https://skyglobegroup.com
- TikTok: @skyglobe_limited (https://www.tiktok.com/@skyglobe_limited)

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

Answer any question the user has about immigration, visas, studying abroad, working abroad, travel, or SkyGlobe's services. If a question is completely unrelated to these topics, politely redirect. Keep answers helpful, accurate, and not too long. Use bullet points or line breaks for clarity. Always encourage users to book a free consultation or WhatsApp for personalised advice.`;

app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body || {};
  if (!message || !String(message).trim())
    return res.status(400).json({ error: 'Message is required.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return res.status(500).json({ error: 'AI assistant is not configured yet. Please WhatsApp us at +1 737-399-8522 for help.' });

  try {
    const safeHistory = Array.isArray(history) ? history.slice(-10) : [];
    // Convert history to Gemini format (role: user/model)
    const contents = safeHistory.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    contents.push({ role: 'user', parts: [{ text: String(message).trim() }] });

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SKYGLOBE_SYSTEM }] },
          contents,
          generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
        }),
      }
    );

    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || `API error ${r.status}`);

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
    res.json({ reply });
  } catch (e) {
    console.error('AI chat error:', e.message);
    res.status(500).json({ error: 'AI assistant is temporarily unavailable. Please WhatsApp us at +1 737-399-8522.' });
  }
});

// ── TEST ──────────────────────────────────────────────────────────────────────
app.get('/api/test-ai', async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.json({ ok: false, error: 'GEMINI_API_KEY is NOT set on Render. Please add it in Environment settings.' });
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Say: AI is working!' }] }] }),
      }
    );
    const data = await r.json();
    if (!r.ok) return res.json({ ok: false, error: data.error?.message || `API returned ${r.status}`, hint: 'Check your Gemini API key at aistudio.google.com' });
    res.json({ ok: true, reply: data.candidates?.[0]?.content?.parts?.[0]?.text });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
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
    // 30-day expiry
    if (Date.now() - data.iat > 30 * 24 * 60 * 60 * 1000) return null;
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

// ── SIGN UP ───────────────────────────────────────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
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
app.post('/api/auth/login', async (req, res) => {
  let { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  email = String(email).trim().toLowerCase();
  try {
    const client = await getClientByEmail(email);
    if (!client || !verifyPassword(password, client.password_hash))
      return res.status(401).json({ error: 'Wrong email or password.' });
    const token = signToken(email);
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
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const all = await dbQuery('GET', 'messages', null, { order: 'created_at.asc', limit: 1000 });
    res.json(all);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ADMIN: REPLY TO A CLIENT ─────────────────────────────────────────────────────
app.post('/api/admin/messages', async (req, res) => {
  const who = checkAdmin(req);
  if (!who) return res.status(401).json({ error: 'Unauthorized' });
  const { client_email, body } = req.body || {};
  if (!client_email || !body || !String(body).trim())
    return res.status(400).json({ error: 'client_email and body are required.' });
  try {
    const rows = await dbQuery('POST', 'messages', { client_email: String(client_email).toLowerCase(), sender: 'admin', body: String(body).trim(), read: false });
    // Email the client that they have a reply
    try {
      await sendEmail(client_email, 'You have a new message from SkyGlobe Limited',
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#0a1628;padding:24px;border-radius:8px 8px 0 0;text-align:center">
            <img src="https://skyglobegroup.com/logo.png" alt="SkyGlobe" style="height:56px;border-radius:10px"><br>
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

// ── DOCUMENT GENERATOR (SOP / Cover Letter / Visa Letter) ────────────────────
// Lightweight endpoint the front-end pings to wake the server from sleep.
app.get('/api/health', (req, res) => res.json({ ok: true, t: Date.now() }));

app.post('/api/generate-doc', async (req, res) => {
  const { docType, fullName, nationality, email, phone, address, city,
          visaPurpose, destination, institution, program,
          background, experience, whyHere, goals, extraNotes } = req.body || {};

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
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

    skyconference: `You are the official communications officer of SkyGlobe Limited, an international travel and immigration consultancy based in the United Kingdom. Write a formal Letter of Invitation issued BY SkyGlobe Limited inviting an individual to attend one of our international events.
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
2. Formally introduces SkyGlobe Limited (registered immigration and travel consultancy, UK) and confirms we are inviting ${fullName} to ${institution}
3. States the event dates, venue, and the attendee's role
4. Confirms the professional or educational purpose of the event
5. States accommodation/cost arrangements
6. Requests that the visa officer grant the necessary visa and offers to provide further information
Write in formal third person, from SkyGlobe Limited's point of view. Do NOT write the signature block or letterhead (added by system). Do NOT use placeholders.
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

  // Abort the Gemini call if it hangs, so we always return a clean JSON error
  // rather than letting the client connection time out (which shows as a NetworkError).
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
          generationConfig: { maxOutputTokens: 2048, temperature: 0.72 },
        }),
        signal: ctrl.signal,
      }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || `API error ${r.status}`);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) throw new Error('Empty response from AI');
    res.json({ text });
  } catch (e) {
    console.error('Doc gen error:', e.message);
    const aborted = e.name === 'AbortError';
    res.status(aborted ? 504 : 500).json({
      error: aborted
        ? 'The AI took too long to respond. Please try again.'
        : 'Document generation failed. Please try again.'
    });
  } finally {
    clearTimeout(timer);
  }
});

// ---- AI Tips endpoint ----
app.post('/api/ai-tips', async (req, res) => {
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

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SkyGlobe server running on port ${PORT}`));

// ---- Keep-alive self-ping (prevents Render free-tier cold starts) ----
// Render sleeps the service after ~15 min with no inbound HTTP traffic.
// We ping our own /api/health every 13 minutes so the service stays awake,
// which means users never hit the "server is waking up" delay.
const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
setInterval(() => {
  fetch(`${SELF_URL}/api/health`)
    .then(() => console.log('[keep-alive] ping ok', new Date().toISOString()))
    .catch((e) => console.log('[keep-alive] ping failed', e.message));
}, 13 * 60 * 1000);
