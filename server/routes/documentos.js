const express = require('express');
const router  = express.Router();
const { pool } = require('../database');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre, fecha, mime_type, created_at FROM documentos ORDER BY id DESC');
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM documentos WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(result.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { nombre, fecha, base64, mimeType } = req.body;
    if (!nombre || !base64) return res.status(400).json({ error: 'nombre y base64 requeridos' });
    const result = await pool.query(
      `INSERT INTO documentos (nombre, fecha, base64, mime_type) VALUES ($1,$2,$3,$4) RETURNING id, nombre, fecha, mime_type, created_at`,
      [nombre, fecha || new Date().toLocaleDateString('es-AR'), base64, mimeType || 'application/pdf']
    );
    res.status(201).json(result.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM documentos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
