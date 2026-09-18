/* ================================================================
   SGAS — utils.js
   Utilidades globales compartidas por todos los módulos.
   Debe cargarse ANTES que cualquier otro módulo JS de la app.
   ================================================================ */

/**
 * Escapa caracteres especiales HTML para evitar que contenido
 * de texto del usuario rompa el markup o cause XSS.
 * Usada en ats.js, emergencias.js, documentos.js, checklists.js y equipos.js.
 *
 * @param {*} str - Valor a escapar (se convierte a string)
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.escapeHtml = escapeHtml;
