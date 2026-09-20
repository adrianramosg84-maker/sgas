const express = require('express');
const router  = express.Router();
const { pool } = require('../database');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sheets ORDER BY created_at DESC');
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { nombre, url } = req.body;
    if (!nombre || !url) return res.status(400).json({ error: 'nombre y url requeridos' });

    // Validar que la URL tenga protocolo http o https (previene javascript: y otros esquemas)
    let urlParsed;
    try { urlParsed = new URL(url); } catch(_) {
      return res.status(400).json({ error: 'La URL no es válida' });
    }
    if (!['http:', 'https:'].includes(urlParsed.protocol)) {
      return res.status(400).json({ error: 'La URL debe comenzar con http:// o https://' });
    }

    const result = await pool.query(
      'INSERT INTO sheets (nombre, url) VALUES ($1, $2) RETURNING *',
      [nombre, url]
    );
    res.status(201).json(result.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sheets WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
