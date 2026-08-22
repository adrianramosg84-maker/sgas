/* ================================================================
   SGAS — routes/emergencias.js
   ================================================================ */

const express = require('express');
const router  = express.Router();
const db      = require('../database');

router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM emergencias ORDER BY nombre ASC').all();
    res.json(rows.map(parseArea));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM emergencias WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(parseArea(row));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  const { nombre, extintores, duchas, alarmas } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
  try {
    const info = db.prepare(`
      INSERT INTO emergencias (nombre, extintores, duchas, alarmas, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(nombre, JSON.stringify(extintores||[]), JSON.stringify(duchas||[]), JSON.stringify(alarmas||[]));
    const row = db.prepare('SELECT * FROM emergencias WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(parseArea(row));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', (req, res) => {
  const { nombre, extintores, duchas, alarmas } = req.body;
  try {
    const existing = db.prepare('SELECT id FROM emergencias WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'No encontrado' });
    db.prepare(`
      UPDATE emergencias SET nombre=?, extintores=?, duchas=?, alarmas=?, updated_at=datetime('now')
      WHERE id=?
    `).run(nombre, JSON.stringify(extintores||[]), JSON.stringify(duchas||[]), JSON.stringify(alarmas||[]), req.params.id);
    const row = db.prepare('SELECT * FROM emergencias WHERE id = ?').get(req.params.id);
    res.json(parseArea(row));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM emergencias WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

function parseArea(row) {
  return {
    ...row,
    extintores: JSON.parse(row.extintores || '[]'),
    duchas:     JSON.parse(row.duchas     || '[]'),
    alarmas:    JSON.parse(row.alarmas    || '[]'),
  };
}

module.exports = router;
