require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

app.post('/api/contact', async (req, res) => {
  const { fname, lname, email, phone, service, destination, message } = req.body;

  if (!fname || !email || !service) {
    return res.status(400).json({ error: 'Name, email and service are required.' });
  }

  const recipientEmail = process.env.RECIPIENT_EMAIL || 'insights.skyglobe@gmail.com';

  const mailOptions = {
    from: `"SkyGlobe Contact Form" <${process.env.MAIL_USER}>`,
    to: recipientEmail,
    replyTo: email,
    subject: `New Consultation Request — ${service}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0a1628;padding:24px;border-radius:8px 8px 0 0">
          <h2 style="color:#c9a84c;margin:0">New Consultation Request</h2>
        </div>
        <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e0e0e0">
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#555;width:160px"><strong>Name</strong></td><td style="padding:8px 0">${fname} ${lname || ''}</td></tr>
            <tr><td style="padding:8px 0;color:#555"><strong>Email</strong></td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:8px 0;color:#555"><strong>Phone</strong></td><td style="padding:8px 0">${phone || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#555"><strong>Service</strong></td><td style="padding:8px 0">${service}</td></tr>
            <tr><td style="padding:8px 0;color:#555"><strong>Destination</strong></td><td style="padding:8px 0">${destination || '—'}</td></tr>
          </table>
          ${message ? `<hr style="margin:16px 0;border:none;border-top:1px solid #ddd">
          <p style="color:#555;margin:0 0 8px"><strong>Message</strong></p>
          <p style="color:#333;margin:0;line-height:1.6">${message.replace(/\n/g, '<br>')}</p>` : ''}
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (err) {
    console.error('Mail error:', err.message);
    res.status(500).json({ error: 'Failed to send email. Please try again.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SkyGlobe server running on http://localhost:${PORT}`));
