const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');

const app = express();
const DATA_FILE = path.join(__dirname, 'data', 'pipeline.json');
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function nextId(data) {
  const max = data.reduce((m, d) => Math.max(m, parseInt(d.id) || 0), 0);
  return String(max + 1);
}

// ── CRUD ──
app.get('/api/deals', (req, res) => res.json(readData()));

app.post('/api/deals', (req, res) => {
  const data = readData();
  const deal = { ...req.body, id: nextId(data) };
  data.push(deal);
  writeData(data);
  res.status(201).json(deal);
});

app.put('/api/deals/:id', (req, res) => {
  const data = readData();
  const idx = data.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data[idx] = { ...data[idx], ...req.body, id: req.params.id };
  writeData(data);
  res.json(data[idx]);
});

app.delete('/api/deals/:id', (req, res) => {
  const data = readData();
  const idx = data.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.splice(idx, 1);
  writeData(data);
  res.json({ ok: true });
});

// ── EXCEL IMPORT ──
const STATE_MAP = {
  CA: ['california','san diego','los angeles','ladwp','la dwp','metropolitan water district','west basin',
       'inland empire','san francisco','sfpuc','sacramento','mwdoc','east bay','ebmud','mwd','irvine',
       'contra costa','orange county','san jose','santa clara','southern california','la county','bay area'],
  WA: ['seattle','washington state','tacoma','puget sound','king county','washington water'],
  TX: ['san antonio','dallas','fort worth','houston','trinity','ntmwd','texas water','north texas'],
  VA: ['loudoun water','fairfax water','virginia water','newport news'],
  DC: ['dc water','district of columbia','dc water and sewer','washington dc'],
  NY: ['new york city','nyc dep','new york city dep','city of new york'],
  PA: ['philadelphia water','pennsylvania','philadelphia'],
  FL: ['florida','southwest florida','orlando utilities','tampa','miami','broward'],
  OH: ['westerville','ohio water','columbus water'],
  AZ: ['arizona','phoenix','central arizona project','cap ','tucson','tempe','mesa'],
  NM: ['new mexico','albuquerque','santa fe'],
  CO: ['colorado','denver water','aurora water','boulder'],
  OR: ['oregon','portland water','tualatin'],
  UT: ['utah','salt lake','provo'],
  ID: ['idaho','boise','nampa'],
  NV: ['nevada','las vegas valley','lvvwd','henderson'],
  MD: ['maryland','baltimore','wssc'],
  GA: ['georgia','atlanta','gwinnett'],
  IL: ['chicago','illinois','mwrd'],
  MN: ['minnesota','minneapolis','saint paul'],
};

function detectState(client, opp, desc) {
  const text = ((client||'') + ' ' + (opp||'') + ' ' + (desc||'')).toLowerCase();
  for (const [state, keywords] of Object.entries(STATE_MAP)) {
    if (keywords.some(k => text.includes(k))) return state;
  }
  return 'NLI';
}

function xlDateToStr(v) {
  if (!v) return 'TBD';
  const n = parseFloat(v);
  if (isNaN(n)) return String(v).trim() || 'TBD';
  const d = new Date(Math.round((n - 25569) * 86400 * 1000));
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function parseValue(v) {
  if (!v) return { str: 'TBD', num: 0 };
  const s = String(v).trim();
  if (!s || ['n/a', 'tbd', ''].includes(s.toLowerCase())) return { str: 'TBD', num: 0 };
  const n = parseFloat(s.replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return { str: s, num: 0 };
  if (n >= 1e6) return { str: `$${(n/1e6).toFixed(1)}M`, num: n };
  if (n >= 1000) return { str: `$${(n/1000).toFixed(0)}K`, num: n };
  return { str: `$${n.toLocaleString()}`, num: n };
}

function clean(v) {
  if (v === null || v === undefined) return '';
  const s = String(v).trim().replace(/​|‌/g, '');
  return ['n/a', ' n/a'].includes(s.toLowerCase()) ? '' : s;
}

app.post('/api/import', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });

    // Find the Pipeline Tracker sheet
    const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('pipeline tracker'))
      || wb.SheetNames[3];
    if (!sheetName) return res.status(400).json({ error: 'Pipeline Tracker sheet not found' });

    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Find header row (row with 'Client' in column H = index 7)
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      if (String(rows[i][7] || '').toLowerCase() === 'client') {
        headerRowIdx = i;
        break;
      }
    }
    if (headerRowIdx === -1) {
      return res.status(400).json({ error: 'Could not find header row. Make sure this is the Pipeline Tracker sheet.' });
    }

    const SKIP_STATUSES = new Set(['abandoned', '']);
    const imported = [];
    let uid = 1;

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      const status = clean(row[1]);  // col B
      if (SKIP_STATUSES.has(status.toLowerCase())) continue;

      const client = clean(row[7]);  // col H
      if (!client) continue;

      const opp   = clean(row[8]);   // col I
      const desc  = clean(row[9]);   // col J
      const { str: valStr, num: valNum } = parseValue(row[11]); // col L
      const closeDateRaw = clean(row[15]); // col P
      const closeDate = closeDateRaw && !['tbd','n/a'].includes(closeDateRaw.toLowerCase())
        ? xlDateToStr(closeDateRaw) : 'TBD';
      const jupiter = clean(row[19]) || 'Hold'; // col T

      const teamParts = [row[18], row[21], row[22], row[23]].map(clean).filter(p => p); // S,V,W,X
      const team = teamParts.join(', ');

      const notesC  = clean(row[2]);  // col C
      const notesAI = clean(row[34]); // col AI
      const notes = [notesC, notesAI].filter(p => p).join('\n');

      const state = detectState(client, opp, desc);

      imported.push({
        id: String(uid++),
        account: state,
        client,
        opportunity: opp,
        description: desc ? desc.substring(0, 300) : '',
        close_date: closeDate,
        value: valStr,
        status,
        notes,
        next_step: '',
        team,
        must_win: '',
        jupiter,
        alliances: '',
        valueNum: valNum,
        pwin: clean(row[10]) || '',  // col K
        service_area: clean(row[5]) || '',  // col F
        sub_category: clean(row[6]) || '',  // col G
      });
    }

    if (imported.length === 0) {
      return res.status(400).json({ error: 'No active deals found in the file.' });
    }

    const mode = req.body.mode || 'replace';
    if (mode === 'replace') {
      writeData(imported);
    } else {
      // merge: keep existing, append new ones not already present
      const existing = readData();
      const existingKeys = new Set(existing.map(d => d.client + '|' + d.opportunity));
      const toAdd = imported.filter(d => !existingKeys.has(d.client + '|' + d.opportunity));
      writeData([...existing, ...toAdd]);
    }

    res.json({ ok: true, count: imported.length, mode });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Failed to parse file: ' + err.message });
  }
});

app.listen(PORT, () => console.log(`West Water Pipeline running on http://localhost:${PORT}`));
