// services/mailer.js
const nodemailer = require('nodemailer');

const {
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
  MAIL_FROM = 'no-reply@example.com',
  MAIL_DEFAULT_TO
} = process.env;

let transporter = null;
let emailEnabled = false;

// Si hay configuración SMTP válida, crea el transporter
if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465, // true para 465, false para 587/25
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  emailEnabled = true;
  console.log('[mailer] SMTP habilitado');
} else {
  console.warn('[mailer] SMTP NO configurado. Se hará fallback a console.log');
}

async function sendMail({ to, subject, html, text }) {
  // Fallback: no cortar el flujo si no hay SMTP
  if (!emailEnabled) {
    console.log('[mailer:fallback] to:', to || MAIL_DEFAULT_TO);
    console.log('[mailer:fallback] subject:', subject);
    if (text) console.log('[mailer:fallback] text:', text);
    if (html) console.log('[mailer:fallback] html:', html);
    return { ok: true, fallback: true };
  }

  const info = await transporter.sendMail({
    from: MAIL_FROM,
    to: to || MAIL_DEFAULT_TO,
    subject,
    text,
    html,
  });

  console.log('[mailer] messageId:', info.messageId);
  return { ok: true, messageId: info.messageId };
}

module.exports = { sendMail, emailEnabled };
