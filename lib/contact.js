/**
 * POST /api/contact — saves an inquiry to orbland.contact_submissions and emails it via Resend.
 *
 * Env:
 *   DATABASE_URL     Neon connection string (injected by the Vercel Storage integration)
 *   RESEND_API_KEY   enables email notifications
 *   CONTACT_TO       notification recipient (default below)
 *   CONTACT_FROM     verified Resend sender, e.g. "orbLand <contact@schlnkr.com>"
 */
const { neon } = require('@neondatabase/serverless');

const DEFAULT_CONTACT_TO = 'consult@dianilo.onmicrosoft.com';
const DEFAULT_CONTACT_FROM = 'orbLand <onboarding@resend.dev>';

const INTERESTS = [
  'Microsoft 365',
  'Power Platform',
  'SharePoint',
  'Teams',
  'Custom web solutions',
  'Something else',
];

const LIMITS = { name: 100, email: 254, message: 5000 };
/** Submissions faster than this after the form opened are treated as bots. */
const MIN_FILL_MS = 2000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;

/** Per-instance only (serverless instances don't share memory) — a speed bump, not a guarantee. */
const recentByIp = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const hits = (recentByIp.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.push(now);
  recentByIp.set(ip, hits);
  return hits.length > RATE_MAX;
}

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validate(body) {
  const data = {
    name: clean(body.name, LIMITS.name),
    email: clean(body.email, LIMITS.email),
    interest: INTERESTS.includes(body.interest) ? body.interest : null,
    message: clean(body.message, LIMITS.message),
  };
  const errors = {};
  if (!data.name) errors.name = 'Please enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Please enter a valid email address.';
  if (!data.message) errors.message = 'Please include a short message.';
  return { data, errors };
}

async function saveSubmission(data) {
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`
    INSERT INTO orbland.contact_submissions (name, email, interest, message)
    VALUES (${data.name}, ${data.email}, ${data.interest}, ${data.message})
    RETURNING id`;
  return rows[0].id;
}

async function markEmailSent(id) {
  const sql = neon(process.env.DATABASE_URL);
  await sql`UPDATE orbland.contact_submissions SET email_sent = true WHERE id = ${id}`;
}

async function sendNotification(data) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM || DEFAULT_CONTACT_FROM,
      to: [process.env.CONTACT_TO || DEFAULT_CONTACT_TO],
      reply_to: data.email,
      subject: `New inquiry: ${data.interest || 'General'} — ${data.name}`,
      text: [
        `Name: ${data.name}`,
        `Email: ${data.email}`,
        `Interest: ${data.interest || '(not specified)'}`,
        '',
        data.message,
      ].join('\n'),
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }
}

async function handleContact(req, res) {
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  // Bots: filled the hidden honeypot field, or submitted implausibly fast. Pretend success.
  if (clean(body.website, 200) || Number(body.elapsedMs) < MIN_FILL_MS) {
    return res.json({ ok: true });
  }

  if (rateLimited(req.ip)) {
    return res.status(429).json({ ok: false, error: 'Too many messages — please try again later.' });
  }

  const { data, errors } = validate(body);
  if (Object.keys(errors).length) {
    return res.status(400).json({ ok: false, error: 'Please check the highlighted fields.', fields: errors });
  }

  const hasDb = Boolean(process.env.DATABASE_URL);
  const hasEmail = Boolean(process.env.RESEND_API_KEY);
  if (!hasDb && !hasEmail) {
    if (process.env.VERCEL) {
      console.error('[contact] neither DATABASE_URL nor RESEND_API_KEY is configured');
      return res.status(503).json({ ok: false, error: 'The contact form is temporarily unavailable.' });
    }
    console.log('[contact] (dev, no storage configured)', data);
    return res.json({ ok: true });
  }

  let id = null;
  let saved = false;
  let emailed = false;
  if (hasDb) {
    try {
      id = await saveSubmission(data);
      saved = true;
    } catch (err) {
      console.error('[contact] save failed:', err.message);
    }
  }
  if (hasEmail) {
    try {
      await sendNotification(data);
      emailed = true;
      if (saved) await markEmailSent(id);
    } catch (err) {
      console.error('[contact] email failed:', err.message);
    }
  }

  if (!saved && !emailed) {
    return res.status(502).json({ ok: false, error: 'Something went wrong sending your message.' });
  }
  return res.json({ ok: true });
}

module.exports = { handleContact, INTERESTS };
