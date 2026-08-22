/* ================================================================
   SGAS — routes/config.js
   ================================================================ */

const express = require('express');
const router  = express.Router();
const { query, run } = require('../database');

router.get('/', (req, res) => {
  try {
    res.json(query('SELECT * FROM config'));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'key requerido' });
    run('INSERT OR REPLACE INTO config (key, value) VALUES (?,?)', [key, value]);
    res.json({ key, value });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
