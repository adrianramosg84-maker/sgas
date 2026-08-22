/* ================================================================
   SGAS — routes/config.js
   ================================================================ */

const express = require('express');
const router  = express.Router();
const db      = require('../database');

router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM config').all();
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'key es requerido' });
  try {
    db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value);
    res.json({ key, value });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
