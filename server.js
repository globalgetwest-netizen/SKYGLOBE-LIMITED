require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

// ── EMAIL TRANSPORTER (Nodemailer + Gmail) ────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
  tls: { rejectUnauthorized: false },
});

// Verify connection on startup
transporter.verify((err) => {
  if (err) {
    console.error('⚠️  Email connection failed:', err.message);
    console.error('    Check MAIL_USER and MAIL_PASS env vars in Render dashboard.');
  } else {
    console.log('✅ Email transporter ready —', process.env.MAIL_USER);
  }
});

async function sendEmail(to, subject, html, replyTo) {
  const mailOptions = {
    from: `"SkyGlobe Limited" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  };
  if (replyTo) mailOptions.replyTo = replyTo;
  return transporter.sendMail(mailOptions);
}

// ── APPLICATIONS STORAGE ──────────────────────────────────────────────────────
const APPS_FILE = path.join(__dirname, 'applications.json');

function readApps() {
  try { return JSON.parse(fs.readFileSync(APPS_FILE, 'utf8')); }
  catch { return []; }
}

function saveApps(apps) {
  try { fs.writeFileSync(APPS_FILE, JSON.stringify(apps, null, 2)); }
  catch (e) { console.error('Could not save applications:', e.message); }
}

function genRef() {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SKY-${year}-${rand}`;
}

// ── CONTACT / CONSULTATION FORM ───────────────────────────────────────────────
// Helper: wrap any promise with a timeout
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms))
  ]);
}

app.post('/api/contact', async (req, res) => {
  const { fname, lname, email, phone, service, destination, message } = req.body;

  if (!fname || !email || !service) {
    return res.status(400).json({ error: 'Name, email and service are required.' });
  }

  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.error('MAIL_USER or MAIL_PASS env vars not set!');
    return res.status(500).json({ error: 'Server email not configured. Please contact us via WhatsApp.' });
  }

  const recipientEmail = process.env.RECIPIENT_EMAIL || process.env.MAIL_USER;

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
    await withTimeout(sendEmail(recipientEmail, `New Consultation Request — ${service}`, html, email), 18000);
    res.json({ success: true });
  } catch (err) {
    console.error('Mail error:', err.message);
    res.status(500).json({ error: 'Email failed: ' + err.message + '. Please contact us via WhatsApp.' });
  }
});

// ── SUBMIT APPLICATION ────────────────────────────────────────────────────────
app.post('/api/apply', async (req, res) => {
  const {
    service, fname, lname, email, phone, dob, nationality, passport, passportExpiry,
    destination, travelDate, duration, purpose, institution, employer,
    hotelCity, checkin, checkout, coverage, docType, scholarship, notes
  } = req.body;

  if (!fname || !email || !service) {
    return res.status(400).json({ error: 'Name, email, and service are required.' });
  }

  const ref = genRef();
  const timestamp = new Date().toISOString();
  const application = {
    ref, service,
    fname, lname: lname || '', email, phone: phone || '',
    dob: dob || '', nationality: nationality || '',
    passport: passport || '', passportExpiry: passportExpiry || '',
    destination: destination || '', travelDate: travelDate || '',
    duration: duration || '', purpose: purpose || '',
    institution: institution || '', employer: employer || '',
    hotelCity: hotelCity || '', checkin: checkin || '', checkout: checkout || '',
    coverage: coverage || '', docType: docType || '',
    scholarship: scholarship || '', notes: notes || '',
    timestamp, status: 'Received'
  };

  const apps = readApps();
  apps.push(application);
  saveApps(apps);

  const recipientEmail = process.env.RECIPIENT_EMAIL || process.env.MAIL_USER;

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
        Skyglobe Limited · 123 Fifth Avenue, New York, NY · insights.skyglobe@gmail.com
      </div>
    </div>`;

  try {
    await withTimeout(sendEmail(recipientEmail, `New Application [${ref}] — ${service}`, adminHtml, email), 18000);
  } catch (e) { console.error('Admin email failed:', e.message); }

  try {
    await withTimeout(sendEmail(email, `Application Confirmed [${ref}] — Skyglobe Limited`, userHtml), 18000);
  } catch (e) { console.error('User email failed:', e.message); }

  res.json({ success: true, ref, status: 'Received' });
});

// ── GET APPLICATION BY REFERENCE ──────────────────────────────────────────────
app.get('/api/apply/:ref', (req, res) => {
  const apps = readApps();
  const found = apps.find(a => a.ref === req.params.ref.toUpperCase());
  if (!found) return res.status(404).json({ error: 'Application not found.' });
  const { passport, passportExpiry, ...safe } = found;
  res.json(safe);
});

// ── GET ALL APPLICATIONS BY EMAIL ─────────────────────────────────────────────
app.get('/api/apply', (req, res) => {
  if (!req.query.email) return res.status(400).json({ error: 'Email required.' });
  const apps = readApps();
  const found = apps
    .filter(a => a.email.toLowerCase() === req.query.email.toLowerCase())
    .map(({ passport, passportExpiry, ...safe }) => safe);
  res.json(found);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SkyGlobe server running on http://localhost:${PORT}`));
