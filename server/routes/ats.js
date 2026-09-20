const express = require('express');
const router  = express.Router();
const { pool } = require('../database');

router.get('/', async (req, res) => {
  try {
    const { categoria, tipo } = req.query;
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const t      = tipo || 'ats';

    let result, countResult;
    if (categoria) {
      [result, countResult] = await Promise.all([
        pool.query(
          'SELECT * FROM ats WHERE categoria=$1 AND tipo=$2 ORDER BY id DESC LIMIT $3 OFFSET $4',
          [categoria, t, limit, offset]
        ),
        pool.query('SELECT COUNT(*) FROM ats WHERE categoria=$1 AND tipo=$2', [categoria, t]),
      ]);
    } else {
      [result, countResult] = await Promise.all([
        pool.query('SELECT * FROM ats WHERE tipo=$1 ORDER BY id DESC LIMIT $2 OFFSET $3', [t, limit, offset]),
        pool.query('SELECT COUNT(*) FROM ats WHERE tipo=$1', [t]),
      ]);
    }

    const total = parseInt(countResult.rows[0].count);
    res.json({
      data:  result.rows.map(parseAts),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
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
    const { nombre, categoria, estado, filas, observaciones, tipo, emergencia } = req.body;
    if (!nombre || !categoria) return res.status(400).json({ error: 'nombre y categoria requeridos' });
    const result = await pool.query(
      `INSERT INTO ats (nombre, categoria, estado, filas, observaciones, tipo, emergencia)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        nombre, categoria, estado||'borrador',
        JSON.stringify(filas||[]), observaciones||'',
        tipo||'ats', JSON.stringify(emergencia||{}),
      ]
    );
    res.status(201).json(parseAts(result.rows[0]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { nombre, categoria, estado, filas, observaciones, tipo, emergencia } = req.body;
    if (!nombre || !categoria) return res.status(400).json({ error: 'nombre y categoria requeridos' });
    const result = await pool.query(
      `UPDATE ats SET nombre=$1, categoria=$2, estado=$3, filas=$4, observaciones=$5,
       tipo=$6, emergencia=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [
        nombre, categoria, estado||'guardado',
        JSON.stringify(filas||[]), observaciones||'',
        tipo||'ats', JSON.stringify(emergencia||{}),
        req.params.id,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(parseAts(result.rows[0]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM ats WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

function parseAts(row) {
  return {
    ...row,
    filas:      (() => { try { return JSON.parse(row.filas      || '[]'); } catch(_) { return []; } })(),
    emergencia: (() => { try { return JSON.parse(row.emergencia || '{}'); } catch(_) { return {}; } })(),
  };
}

module.exports = router;
