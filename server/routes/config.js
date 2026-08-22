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

module.exports = router;
