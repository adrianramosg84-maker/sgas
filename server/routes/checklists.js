const express = require('express');
const router  = express.Router();
const { pool } = require('../database');

router.get('/', async (req, res) => {
  try {
    const { categoria } = req.query;
    let result;
    if (categoria) {
      result = await pool.query(
        'SELECT id, nombre, fecha, mime_type, categoria, created_at FROM checklists WHERE categoria=$1 ORDER BY id DESC',
        [categoria]
      );
    } else {
      result = await pool.query(
        'SELECT id, nombre, fecha, mime_type, categoria, created_at FROM checklists ORDER BY id DESC'
      );
    }
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Conteo de checklists agrupado por categoría — evita N requests desde el home
router.get('/count-by-categoria', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT categoria, COUNT(*)::int AS total FROM checklists GROUP BY categoria'
    );
    // Devuelve { "General": 3, "Seguridad": 5, ... }
    const counts = {};
    result.rows.forEach(r => { counts[r.categoria] = r.total; });
    res.json(counts);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM checklists WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(result.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { nombre, fecha, base64, mimeType, categoria } = req.body;
    if (!nombre || !base64) return res.status(400).json({ error: 'nombre y base64 requeridos' });
    const result = await pool.query(
      `INSERT INTO checklists (nombre, fecha, base64, mime_type, categoria)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, nombre, fecha, mime_type, categoria, created_at`,
      [
        nombre,
        fecha || new Date().toLocaleDateString('es-AR'),
        base64,
        mimeType || 'application/pdf',
        categoria || 'General',
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM checklists WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
