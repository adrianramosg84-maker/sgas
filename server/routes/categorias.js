const express      = require('express');
const router       = express.Router();
const { pool }     = require('../database');
const { validarId } = require('./helpers');

router.get('/', async (req, res) => {
  try {
    const tipo = req.query.tipo || 'ats';
    const result = await pool.query(
      'SELECT * FROM categorias WHERE tipo=$1 ORDER BY nombre ASC',
      [tipo]
    );
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { nombre, tipo } = req.body;
    const t = tipo || 'ats';
    if (!nombre) return res.status(400).json({ error: 'nombre requerido' });

    // Upsert atómico — evita race condition del SELECT+INSERT manual
    const result = await pool.query(
      `INSERT INTO categorias (nombre, tipo)
       VALUES ($1, $2)
       ON CONFLICT (nombre, tipo) DO UPDATE SET nombre = EXCLUDED.nombre
       RETURNING *`,
      [nombre, t]
    );
    res.status(201).json(result.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  if (!validarId(req, res)) return;
  try {
    const { nombre, tipo } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre requerido' });
    const t = tipo || 'ats';
    const result = await pool.query(
      `UPDATE categorias SET nombre=$1, tipo=$2 WHERE id=$3 RETURNING *`,
      [nombre, t, req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(result.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  if (!validarId(req, res)) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const catResult = await client.query(
      'SELECT nombre, tipo FROM categorias WHERE id = $1', [req.params.id]
    );
    if (catResult.rows[0]) {
      const { nombre, tipo } = catResult.rows[0];
      // Cascade fichas ATS de esta categoría
      if (tipo === 'ats' || tipo === 'parada') {
        await client.query(
          'DELETE FROM ats WHERE categoria=$1 AND tipo=$2', [nombre, tipo]
        );
      }
      // Cascade checklists de esta categoría
      if (tipo === 'checklist') {
        await client.query(
          'DELETE FROM checklists WHERE categoria=$1', [nombre]
        );
      }
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
