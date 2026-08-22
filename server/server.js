/* ================================================================
   SGAS — server.js
   API REST Node.js + Express + SQLite
   ================================================================ */

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ── */
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 50mb para documentos PDF en base64
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* ── Rutas API ── */
app.use('/api/ats',         require('./routes/ats'));
app.use('/api/emergencias', require('./routes/emergencias'));
app.use('/api/documentos',  require('./routes/documentos'));
app.use('/api/config',      require('./routes/config'));

/* ── Health check ── */
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

/* ── Iniciar servidor ── */
app.listen(PORT, () => {
  console.log(`SGAS Server corriendo en puerto ${PORT}`);
});
