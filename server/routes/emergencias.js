/* ================================================================
   SGAS — routes/emergencias.js
   ================================================================ */

const express = require('express');
const router  = express.Router();
const { query, run, queryOne, lastId } = require('../database');

router.get('/', (req, res) => {
  try {
    res.json(query('SELECT * FROM emergencias ORDER BY nombre ASC').map(parseArea));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', (req, res) => {
  try {
    const row = queryOne('SELECT * FROM emergencias WHERE id = ?', [+req.params.id]);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(parseArea(row));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const { nombre, extintores, duchas, alarmas } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre requerido' });
    run(
      `INSERT INTO emergencias (nombre, extintores, duchas, alarmas) VALUES (?,?,?,?)`,
      [nombre, JSON.stringify(extintores||[]), JSON.stringify(duchas||[]), JSON.stringify(alarmas||[])]
    );
    const row = queryOne('SELECT * FROM emergencias WHERE id = ?', [lastId()]);
    res.status(201).json(parseArea(row));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', (req, res) => {
  try {
    const { nombre, extintores, duchas, alarmas } = req.body;
    run(
      `UPDATE emergencias SET nombre=?, extintores=?, duchas=?, alarmas=?, updated_at=datetime('now') WHERE id=?`,
      [nombre, JSON.stringify(extintores||[]), JSON.stringify(duchas||[]), JSON.stringify(alarmas||[]), +req.params.id]
    );
    const row = queryOne('SELECT * FROM emergencias WHERE id = ?', [+req.params.id]);
    res.json(parseArea(row));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', (req, res) => {
  try {
    run('DELETE FROM emergencias WHERE id = ?', [+req.params.id]);
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
