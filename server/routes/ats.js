/* ================================================================
   SGAS — routes/ats.js
   ================================================================ */

const express          = require('express');
const router           = express.Router();
const { query, run, queryOne, lastId } = require('../database');

router.get('/', (req, res) => {
  try {
    const { categoria } = req.query;
    const rows = categoria
      ? query('SELECT * FROM ats WHERE categoria = ? ORDER BY id DESC', [categoria])
      : query('SELECT * FROM ats ORDER BY id DESC');
    res.json(rows.map(parseAts));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', (req, res) => {
  try {
    const row = queryOne('SELECT * FROM ats WHERE id = ?', [+req.params.id]);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(parseAts(row));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const { nombre, categoria, estado, filas, observaciones } = req.body;
    if (!nombre || !categoria) return res.status(400).json({ error: 'nombre y categoria requeridos' });
    run(
      `INSERT INTO ats (nombre, categoria, estado, filas, observaciones) VALUES (?,?,?,?,?)`,
      [nombre, categoria, estado||'borrador', JSON.stringify(filas||[]), observaciones||'']
    );
    const id  = lastId();
    const row = queryOne('SELECT * FROM ats WHERE id = ?', [id]);
    res.status(201).json(parseAts(row));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', (req, res) => {
  try {
    const { nombre, categoria, estado, filas, observaciones } = req.body;
    run(
      `UPDATE ats SET nombre=?, categoria=?, estado=?, filas=?, observaciones=?, updated_at=datetime('now') WHERE id=?`,
      [nombre, categoria, estado||'guardado', JSON.stringify(filas||[]), observaciones||'', +req.params.id]
    );
    const row = queryOne('SELECT * FROM ats WHERE id = ?', [+req.params.id]);
    res.json(parseAts(row));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', (req, res) => {
  try {
    run('DELETE FROM ats WHERE id = ?', [+req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

function parseAts(row) {
  return { ...row, filas: JSON.parse(row.filas || '[]') };
}

module.exports = router;
