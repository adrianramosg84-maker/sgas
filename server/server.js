/* ================================================================
   SGAS — server.js
   API REST Node.js + Express + sql.js (SQLite puro JS)
   ================================================================ */

const express = require('express');
const cors    = require('cors');
const { getDb } = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* ── Inicializar DB antes de arrancar ── */
getDb().then(() => {

  app.use('/api/ats',         require('./routes/ats'));
  app.use('/api/emergencias', require('./routes/emergencias'));
  app.use('/api/documentos',  require('./routes/documentos'));
  app.use('/api/config',      require('./routes/config'));

  app.get('/api/ping', (req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.listen(PORT, () => {
    console.log(`SGAS Server corriendo en puerto ${PORT}`);
  });

}).catch(err => {
  console.error('Error iniciando DB:', err);
  process.exit(1);
});
