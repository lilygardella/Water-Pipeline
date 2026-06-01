const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const DATA_FILE = path.join(__dirname, 'data', 'pipeline.json');
const PORT = process.env.PORT || 3000;

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

app.get('/api/deals', (req, res) => {
  res.json(readData());
});

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

app.listen(PORT, () => console.log(`West Water Pipeline running on http://localhost:${PORT}`));
