const express      = require('express');
const router       = express.Router();
const { pool }     = require('../database');
const { validarId } = require('./helpers');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM emergencias ORDER BY nombre ASC');
    res.json(result.rows.map(parseArea));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  if (!validarId(req, res)) return;
  try {
    const result = await pool.query('SELECT * FROM emergencias WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(parseArea(result.rows[0]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { nombre, extintores, duchas, alarmas } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre requerido' });
    const result = await pool.query(
      `INSERT INTO emergencias (nombre, extintores, duchas, alarmas) VALUES ($1,$2,$3,$4) RETURNING *`,
      [nombre, JSON.stringify(extintores||[]), JSON.stringify(duchas||[]), JSON.stringify(alarmas||[])]
    );
    res.status(201).json(parseArea(result.rows[0]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  if (!validarId(req, res)) return;
  try {
    const { nombre, extintores, duchas, alarmas } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre requerido' });
    const result = await pool.query(
      `UPDATE emergencias SET nombre=$1, extintores=$2, duchas=$3, alarmas=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [nombre, JSON.stringify(extintores||[]), JSON.stringify(duchas||[]), JSON.stringify(alarmas||[]), req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(parseArea(result.rows[0]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  if (!validarId(req, res)) return;
  try {
    const result = await pool.query('DELETE FROM emergencias WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

function parseArea(row) {
  return {
    ...row,
    extintores: (() => { try { return JSON.parse(row.extintores || '[]'); } catch(_) { return []; } })(),
    duchas:     (() => { try { return JSON.parse(row.duchas     || '[]'); } catch(_) { return []; } })(),
    alarmas:    (() => { try { return JSON.parse(row.alarmas    || '[]'); } catch(_) { return []; } })(),
  };
}

module.exports = router;
