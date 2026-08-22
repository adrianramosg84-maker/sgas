/* ================================================================
   SGAS — routes/categorias.js
   ================================================================ */

const express = require('express');
const router  = express.Router();
const { query, run, queryOne, lastId } = require('../database');

router.get('/', (req, res) => {
  try {
    res.json(query('SELECT * FROM categorias ORDER BY nombre ASC'));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre requerido' });
    const existe = queryOne('SELECT id FROM categorias WHERE LOWER(nombre) = LOWER(?)', [nombre]);
    if (existe) return res.status(201).json(existe); // devolver la existente
    run('INSERT INTO categorias (nombre) VALUES (?)', [nombre]);
    const id  = lastId();
    const row = queryOne('SELECT * FROM categorias WHERE id = ?', [id]);
    if (!row) return res.status(201).json({ id, nombre }); // fallback
    res.status(201).json(row);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', (req, res) => {
  try {
    run('DELETE FROM categorias WHERE id = ?', [+req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
