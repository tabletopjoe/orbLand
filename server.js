const express = require('express');
const path = require('path');
const { handleContact } = require('./lib/contact');

const app = express();
const PORT = process.env.PORT || 3000;

// Vercel sits in front of the app; trust its X-Forwarded-For so req.ip is the visitor.
app.set('trust proxy', true);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/orbs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'orbs.html'));
});

app.get('/about', (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, noarchive');
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.post('/api/contact', express.json({ limit: '16kb' }), handleContact);

// Malformed / oversized JSON bodies: answer in JSON instead of Express's HTML error page.
app.use('/api', (err, req, res, next) => {
  res.status(err.status || 500).json({ ok: false, error: 'Invalid request.' });
});

app.listen(PORT, () => {
  console.log(`orbLand running at http://localhost:${PORT}`);
});
