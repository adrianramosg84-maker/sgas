/* ================================================================
   SGAS — routes/documentos.js
   ================================================================ */

const express = require('express');
const router  = express.Router();
const { query, run, queryOne, lastId } = require('../database');

router.get('/', (req, res) => {
  try {
    res.json(query('SELECT id, nombre, fecha, mime_type, created_at FROM documentos ORDER BY id DESC'));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', (req, res) => {
  try {
    const row = queryOne('SELECT * FROM documentos WHERE id = ?', [+req.params.id]);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(row);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const { nombre, fecha, base64, mimeType } = req.body;
    if (!nombre || !base64) return res.status(400).json({ error: 'nombre y base64 requeridos' });
    run(
      `INSERT INTO documentos (nombre, fecha, base64, mime_type) VALUES (?,?,?,?)`,
      [nombre, fecha || new Date().toLocaleDateString('es-AR'), base64, mimeType || 'application/pdf']
    );
    const row = queryOne('SELECT id, nombre, fecha, mime_type, created_at FROM documentos WHERE id = ?', [lastId()]);
    res.status(201).json(row);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', (req, res) => {
  try {
    run('DELETE FROM documentos WHERE id = ?', [+req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
