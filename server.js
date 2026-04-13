const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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

app.listen(PORT, () => {
  console.log(`orbLand running at http://localhost:${PORT}`);
});
