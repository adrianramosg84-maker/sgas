const express = require('express');
const router  = express.Router();
const { pool } = require('../database');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM emergencias ORDER BY nombre ASC');
    res.json(result.rows.map(parseArea));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
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
  try {
    const { nombre, extintores, duchas, alarmas } = req.body;
    const result = await pool.query(
      `UPDATE emergencias SET nombre=$1, extintores=$2, duchas=$3, alarmas=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [nombre, JSON.stringify(extintores||[]), JSON.stringify(duchas||[]), JSON.stringify(alarmas||[]), req.params.id]
    );
    res.json(parseArea(result.rows[0]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM emergencias WHERE id = $1', [req.params.id]);
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
