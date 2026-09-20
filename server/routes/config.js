const express = require('express');
const router  = express.Router();
const { pool } = require('../database');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM config');
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'key requerido' });
    await pool.query(
      'INSERT INTO config (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2',
      [key, value]
    );
    res.json({ key, value });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Guardar múltiples claves en un solo request
router.post('/bulk', async (req, res) => {
  try {
    const entries = req.body; // [{ key, value }, ...]
    if (!Array.isArray(entries) || entries.length === 0)
      return res.status(400).json({ error: 'Se esperaba un array de { key, value }' });
    // Construir upsert bulk con un solo query
    const values = entries.map((e, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ');
    const params = entries.flatMap(e => [e.key, e.value]);
    await pool.query(
      `INSERT INTO config (key, value) VALUES ${values}
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      params
    );
    res.json({ ok: true, saved: entries.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
