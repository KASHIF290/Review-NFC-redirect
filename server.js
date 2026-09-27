const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const DATA_FILE = path.join(__dirname, 'links.json');

function loadLinks() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveLinks(links) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(links, null, 2));
}

// This is the URL printed as the QR / written to the NFC chip:
// yourdomain.in/r/CODE  -> redirects to that client's actual Google review link
app.get('/r/:code', (req, res) => {
  const links = loadLinks();
  const entry = links[req.params.code];
  if (!entry) return res.status(404).send('Card not set up yet');

  entry.scans = (entry.scans || 0) + 1;
  entry.lastScan = new Date().toISOString();
  saveLinks(links);

  res.redirect(302, entry.target);
});

app.use(express.json());

// Add or update which client a card code points to.
// POST /admin/link  { "code": "cafe123", "target": "https://g.page/r/XXXX/review", "apiKey": "..." }
app.post('/admin/link', (req, res) => {
  const { code, target, apiKey } = req.body;
  if (apiKey !== process.env.ADMIN_KEY) return res.sendStatus(403);
  if (!code || !target) return res.status(400).json({ error: 'code and target required' });

  const links = loadLinks();
  links[code] = { target, scans: links[code]?.scans || 0 };
  saveLinks(links);
  res.json({ ok: true, code, target });
});

// Check scan count for one card
app.get('/admin/stats/:code', (req, res) => {
  const links = loadLinks();
  res.json(links[req.params.code] || { error: 'not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Redirect service running on port ${PORT}`));
