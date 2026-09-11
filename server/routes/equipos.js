const express = require('express');
const router  = express.Router();
const { pool } = require('../database');

/* ── GET — obtener equipos (solo metadatos, sin datos) ── */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, total, columnas, created_at FROM equipos ORDER BY created_at DESC'
    );
    res.json(result.rows.map(r => ({
      ...r,
      columnas: JSON.parse(r.columnas || '[]'),
    })));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── GET /:id — obtener equipos con datos completos ── */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM equipos WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'No encontrado' });
    const row = result.rows[0];
    res.json({
      ...row,
      columnas: JSON.parse(row.columnas || '[]'),
      datos:    JSON.parse(row.datos    || '[]'),
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── POST — guardar/reemplazar dataset de equipos ── */
router.post('/', async (req, res) => {
  try {
    const { nombre, columnas, datos } = req.body;
    if (!nombre || !datos) return res.status(400).json({ error: 'nombre y datos requeridos' });

    // Eliminar versiones anteriores antes de insertar la nueva
    await pool.query('DELETE FROM equipos');

    const result = await pool.query(
      `INSERT INTO equipos (nombre, total, columnas, datos)
       VALUES ($1, $2, $3, $4) RETURNING id, nombre, total, columnas, created_at`,
      [nombre, datos.length, JSON.stringify(columnas || []), JSON.stringify(datos)]
    );
    res.status(201).json(result.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── DELETE /:id — eliminar dataset ── */
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM equipos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
