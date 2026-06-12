require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
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

// ── RESEND EMAIL ──────────────────────────────────────────────────────────────
async function sendEmail(to, subject, html, replyTo) {
  const body = {
    from: 'SkyGlobe Limited <onboarding@resend.dev>',
    to: [to],
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

  const recipientEmail = process.env.RECIPIENT_EMAIL || 'insights.skyglobe@gmail.com';
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#0a1628;padding:24px;border-radius:8px 8px 0 0">
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
  const recipientEmail = process.env.RECIPIENT_EMAIL || 'insights.skyglobe@gmail.com';

  const adminHtml = `
    <div style="font-family:sans-serif;max-width:660px;margin:0 auto">
      <div style="background:#0a1628;padding:24px;border-radius:8px 8px 0 0">
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
        Skyglobe Limited · insights.skyglobe@gmail.com
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
        const recipientEmail = process.env.RECIPIENT_EMAIL || 'insights.skyglobe@gmail.com';
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

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// ── TEST ──────────────────────────────────────────────────────────────────────
app.get('/api/test', async (req, res) => {
  const key = process.env.RESEND_API_KEY;
  const to  = process.env.RECIPIENT_EMAIL || 'insights.skyglobe@gmail.com';
  if (!key) return res.json({ ok: false, error: 'RESEND_API_KEY env var is missing' });
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'SkyGlobe Test <onboarding@resend.dev>', to: [to], subject: 'SkyGlobe — Email Test', html: '<p>✅ Email is working!</p>' }),
    });
    res.json({ ok: r.ok, status: r.status, resend_response: await r.json() });
  } catch (err) { res.json({ ok: false, error: err.message }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SkyGlobe server running on port ${PORT}`));
