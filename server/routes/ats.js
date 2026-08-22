/* ================================================================
   SGAS — routes/ats.js
   Endpoints para fichas ATS
   ================================================================ */

const express = require('express');
const router  = express.Router();
const db      = require('../database');

/* ── Listar por categoría ── */
router.get('/', (req, res) => {
  const { categoria } = req.query;
  try {
    const rows = categoria
      ? db.prepare('SELECT * FROM ats WHERE categoria = ? ORDER BY id DESC').all(categoria)
      : db.prepare('SELECT * FROM ats ORDER BY id DESC').all();
    // Parsear JSON fields
    const result = rows.map(parseAts);
    res.json(result);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Obtener por ID ── */
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM ats WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(parseAts(row));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Crear ── */
router.post('/', (req, res) => {
  const { nombre, categoria, estado, filas, observaciones } = req.body;
  if (!nombre || !categoria) return res.status(400).json({ error: 'nombre y categoria son requeridos' });
  try {
    const stmt = db.prepare(`
      INSERT INTO ats (nombre, categoria, estado, filas, observaciones, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    const info = stmt.run(
      nombre,
      categoria,
      estado || 'borrador',
      JSON.stringify(filas || []),
      observaciones || ''
    );
    const row = db.prepare('SELECT * FROM ats WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(parseAts(row));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Actualizar ── */
router.put('/:id', (req, res) => {
  const { nombre, categoria, estado, filas, observaciones } = req.body;
  try {
    const existing = db.prepare('SELECT id FROM ats WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'No encontrado' });
    db.prepare(`
      UPDATE ats SET nombre=?, categoria=?, estado=?, filas=?, observaciones=?, updated_at=datetime('now')
      WHERE id=?
    `).run(
      nombre,
      categoria,
      estado || 'guardado',
      JSON.stringify(filas || []),
      observaciones || '',
      req.params.id
    );
    const row = db.prepare('SELECT * FROM ats WHERE id = ?').get(req.params.id);
    res.json(parseAts(row));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Eliminar ── */
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM ats WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Helper ── */
function parseAts(row) {
  return {
    ...row,
    filas: JSON.parse(row.filas || '[]'),
  };
}

module.exports = router;
