const express = require('express');
const router  = express.Router();
const { pool } = require('../database');

router.get('/', async (req, res) => {
  try {
    const { categoria } = req.query;
    const result = categoria
      ? await pool.query('SELECT * FROM ats WHERE categoria = $1 ORDER BY id DESC', [categoria])
      : await pool.query('SELECT * FROM ats ORDER BY id DESC');
    res.json(result.rows.map(parseAts));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ats WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(parseAts(result.rows[0]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { nombre, categoria, estado, filas, observaciones } = req.body;
    if (!nombre || !categoria) return res.status(400).json({ error: 'nombre y categoria requeridos' });
    const result = await pool.query(
      `INSERT INTO ats (nombre, categoria, estado, filas, observaciones)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [nombre, categoria, estado||'borrador', JSON.stringify(filas||[]), observaciones||'']
    );
    res.status(201).json(parseAts(result.rows[0]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { nombre, categoria, estado, filas, observaciones } = req.body;
    const result = await pool.query(
      `UPDATE ats SET nombre=$1, categoria=$2, estado=$3, filas=$4, observaciones=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [nombre, categoria, estado||'guardado', JSON.stringify(filas||[]), observaciones||'', req.params.id]
    );
    res.json(parseAts(result.rows[0]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM ats WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

function parseAts(row) {
  return { ...row, filas: JSON.parse(row.filas || '[]') };
}

module.exports = router;
