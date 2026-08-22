/* ================================================================
   SGAS — routes/documentos.js
   ================================================================ */

const express = require('express');
const router  = express.Router();
const db      = require('../database');

router.get('/', (req, res) => {
  try {
    // No devolver base64 en el listado (muy pesado)
    const rows = db.prepare('SELECT id, nombre, fecha, mime_type, created_at FROM documentos ORDER BY id DESC').all();
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM documentos WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(row);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  const { nombre, fecha, base64, mimeType } = req.body;
  if (!nombre || !base64) return res.status(400).json({ error: 'nombre y base64 son requeridos' });
  try {
    const info = db.prepare(`
      INSERT INTO documentos (nombre, fecha, base64, mime_type)
      VALUES (?, ?, ?, ?)
    `).run(nombre, fecha || new Date().toLocaleDateString('es-AR'), base64, mimeType || 'application/pdf');
    const row = db.prepare('SELECT id, nombre, fecha, mime_type, created_at FROM documentos WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM documentos WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
