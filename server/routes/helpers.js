/* ================================================================
   SGAS — helpers.js
   Utilidades compartidas por todas las rutas Express.
   ================================================================ */

/**
 * Valida que req.params.id sea un entero positivo.
 * Si no lo es, responde 400 y retorna false.
 * Uso: if (!validarId(req, res)) return;
 */
function validarId(req, res) {
  const id = parseInt(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'ID inválido' });
    return false;
  }
  return true;
}

module.exports = { validarId };
