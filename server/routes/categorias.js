const express = require('express');
const router  = express.Router();
const { pool } = require('../database');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categorias ORDER BY nombre ASC');
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre requerido' });
    const result = await pool.query(
      'INSERT INTO categorias (nombre) VALUES ($1) ON CONFLICT (nombre) DO UPDATE SET nombre=$1 RETURNING *',
      [nombre]
    );
    res.status(201).json(result.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const catResult = await client.query('SELECT nombre FROM categorias WHERE id = $1', [req.params.id]);
    if (catResult.rows[0]) {
      await client.query('DELETE FROM ats WHERE categoria = $1', [catResult.rows[0].nombre]);
    }
    await client.query('DELETE FROM categorias WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch(e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

module.exports = router;
