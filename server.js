require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json({ limit: '15mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));
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

// ── AUTH (role-based) ────────────────────────────────────────────────────────
// ADMIN_PASSWORDS  → CEO-level access (full portal: analytics, exports, everything)
// STAFF_PASSWORDS  → Staff-level access (work queue only: applications, messages, docs)
// Format for both: "Name:password,Name2:password2"  (name optional)
// Returns { role:'ceo'|'staff', name } or null
function getRole(req) {
  const supplied = req.headers['x-admin-key'] || '';
  if (!supplied) return null;
  const ceoRaw = process.env.ADMIN_PASSWORDS || process.env.ADMIN_PASSWORD || '';
  for (const entry of ceoRaw.split(',').map(s => s.trim()).filter(Boolean)) {
    const [a, b] = entry.includes(':') ? entry.split(':') : [null, entry];
    if (supplied === b) return { role: 'ceo', name: a || 'CEO' };
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
app.post('/api/admin/login', (req, res) => {
  const fakeReq = { headers: { 'x-admin-key': (req.body && req.body.password) || '' } };
  const who = checkAdmin(fakeReq);
  if (!who) return res.status(401).json({ error: 'Wrong password.' });
  res.json({ success: true, name: who, role: 'ceo' });
});

// Staff portal login — accepts staff OR CEO passwords
app.post('/api/staff/login', (req, res) => {
  const fakeReq = { headers: { 'x-admin-key': (req.body && req.body.password) || '' } };
  const r = getRole(fakeReq);
  if (!r) return res.status(401).json({ error: 'Wrong password.' });
  res.json({ success: true, name: r.name, role: r.role });
});

app.get('/api/admin/applications', async (req, res) => {
  if (!checkStaffOrAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try { res.json(await getAllApps()); }
  catch (e) { res.status(500).json({ error: e.message }); }
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

// ---- Official Letterhead AI writer (CEO / authorised staff only) ----
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

// ---- Country AI Research endpoint ----
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

// ---- Country Comparison endpoint ----
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

// ---- AI Interview Prep endpoint ----
app.post('/api/interview-prep', async (req, res) => {
  const { type = 'visa', target = '', nationality = '', background = '', payToken = '' } = req.body || {};
  // Optional paywall: set PAYWALL_INTERVIEW=on in Render to require payment.
  // Off by default so the current free experience is unchanged.
  if (process.env.PAYWALL_INTERVIEW === 'on' && !verifyUnlock(payToken, 'interview_prep'))
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
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 0 }
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

// ════════════════════════════════════════════════════════════════════════════
// PAYMENTS + CONFERENCE SOURCING
// ────────────────────────────────────────────────────────────────────────────
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
};

const PAY = {
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
async function providerInit(provider, { reference, amount, currency, email, label, callbackUrl }) {
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
        customizations: { title: 'SKYGLOBE LIMITED', description: label },
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
          await sendEmail(team, `💰 PAID request ${payment.app_ref} — ${PRICING[payment.product]?.label || payment.product}`,
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
              <h2 style="color:#c9a84c">Paid request needs action</h2>
              <p><strong>Reference:</strong> ${payment.app_ref}</p>
              <p><strong>Service:</strong> ${PRICING[payment.product]?.label || payment.product}</p>
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
    const amount = prod[cur];
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
    });
    res.json({ success: true, reference, provider, authorization_url });
  } catch (e) {
    console.error('pay/init error:', e.message);
    res.status(500).json({ error: 'Could not start payment. Please try again or contact us on WhatsApp.' });
  }
});

// ── verify a payment (called by the callback page) ───────────────────────────
app.get('/api/pay/verify/:reference', async (req, res) => {
  try {
    const payment = await getPayment(req.params.reference);
    if (!payment) return res.status(404).json({ error: 'Payment not found.' });
    if (payment.status === 'paid')
      return res.json({ paid: true, product: payment.product, app_ref: payment.app_ref, instant: !!PRICING[payment.product]?.instant });

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

// ════════════════════════════════════════════════════════════════════════════
// CONFERENCE SOURCING
// ────────────────────────────────────────────────────────────────────────────
// We publish curated conferences. A client picks one, fills the form and pays a
// SERVICE FEE. Behind the scenes we contact the REAL organiser, obtain the
// GENUINE invitation/admission document, verify it, add our "Facilitated &
// Verified by SKYGLOBE LIMITED" stamp (NOT an issuing stamp) and deliver it.
// We never fabricate a document or impersonate an institution.
// ════════════════════════════════════════════════════════════════════════════

// Public: list conferences shown on /conferences
app.get('/api/conferences', async (_req, res) => {
  try {
    const rows = await dbQuery('GET', 'conferences', null, { active: 'eq.true', order: 'date.asc', limit: 200 });
    res.json(rows);
  } catch (e) {
    // If the table doesn't exist yet, return an empty list instead of erroring.
    res.json([]);
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

// Client submits eligibility + requests a work permit / migration service
// body: { product, provider, currency, fname, lname, email, phone, nationality,
//         destination_country, docs_confirmed (array), notes, package? }
app.post('/api/work-permit/apply', async (req, res) => {
  try {
    const b = req.body || {};
    const product = PRICING[b.product] ? b.product : 'work_permit_standard';
    if (!b.fname || !b.email) return res.status(400).json({ error: 'Name and email are required.' });
    if (!b.docs_confirmed || b.docs_confirmed.length === 0)
      return res.status(400).json({ error: 'Please confirm which documents you hold before proceeding.' });

    const country = (b.destination_country || '').toUpperCase();
    const countryInfo = WORK_PERMIT_DOCS[country] || {};
    const ref = genRef();
    const application = {
      ref,
      service: PRICING[product].label,
      fname: b.fname, lname: b.lname || '', email: b.email, phone: b.phone || '',
      nationality: b.nationality || '',
      destination: countryInfo.name || b.destination_country || '',
      travel_date: b.travel_date || '',
      purpose: `Work Permit / Migration — ${countryInfo.name || b.destination_country || 'Europe'}`,
      notes: [
        b.notes ? `Client notes: ${b.notes}` : '',
        `Documents confirmed: ${(b.docs_confirmed || []).join(' | ')}`,
        `Package: ${PRICING[product].label}`,
        countryInfo.processingWeeks ? `Official processing estimate: ${countryInfo.processingWeeks} weeks` : '',
      ].filter(Boolean).join('\n\n'),
      status: 'Awaiting Payment', paid: false, responses: [],
    };

    try { await insertApp(application); }
    catch (e) { console.error('work-permit insert failed:', e.message); return res.status(500).json({ error: 'Could not save your application. Please try again.' }); }

    const provider = b.provider;
    const cur = (b.currency || 'USD').toUpperCase();
    if (provider && PAY[provider] && PAY[provider].secret) {
      const amount = PRICING[product][cur];
      if (amount != null && PAY[provider].currencies.includes(cur)) {
        const reference = genPayRef();
        await insertPayment({ reference, product, provider, currency: cur, amount, email: b.email, app_ref: ref, status: 'pending', meta: { country, docs: b.docs_confirmed } });
        try {
          const { authorization_url } = await providerInit(provider, {
            reference, amount, currency: cur, email: b.email,
            label: `${PRICING[product].label} — ${ref}`, callbackUrl: `${baseUrl(req)}/pay/callback`,
          });
          return res.json({ success: true, ref, processingWeeks: countryInfo.processingWeeks, payment: { reference, authorization_url } });
        } catch (e) {
          console.error('work-permit pay init failed:', e.message);
          return res.json({ success: true, ref, processingWeeks: countryInfo.processingWeeks, paymentError: 'Application saved but payment could not start. We will send you a payment link.' });
        }
      }
    }
    res.json({ success: true, ref, processingWeeks: countryInfo.processingWeeks });
  } catch (e) {
    console.error('work-permit/apply error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

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
app.get('/api/admin/staff', checkAdmin, async (req, res) => {
  try {
    const rows = await dbQuery('GET', 'staff_members', null, { order: 'created_at.asc', limit: 200 });
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/staff', checkAdmin, async (req, res) => {
  const { name, role, department, whatsapp, email, notes } = req.body || {};
  if (!name || !department) return res.status(400).json({ error: 'Name and department are required.' });
  try {
    const rows = await dbQuery('POST', 'staff_members', {
      name: name.trim(), role: (role || '').trim(), department: department.trim(),
      whatsapp: (whatsapp || '').trim(), email: (email || '').trim(),
      notes: (notes || '').trim(), status: 'active', created_at: new Date().toISOString(),
    });
    res.json(Array.isArray(rows) ? rows[0] : rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/staff/:id', checkAdmin, async (req, res) => {
  const patch = {};
  ['name','role','department','whatsapp','email','status','notes'].forEach(k => {
    if (req.body[k] !== undefined) patch[k] = req.body[k];
  });
  try {
    await dbQuery('PATCH', 'staff_members', patch, { id: `eq.${req.params.id}` });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/staff/:id', checkAdmin, async (req, res) => {
  try {
    await dbQuery('DELETE', 'staff_members', null, { id: `eq.${req.params.id}` });
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
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/tasks/:id', checkAdmin, async (req, res) => {
  try {
    await dbQuery('DELETE', 'tasks', null, { id: `eq.${req.params.id}` });
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
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
