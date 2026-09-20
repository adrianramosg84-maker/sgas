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

/**
 * Convierte un string base64 (data URL o base64 puro) en un Blob URL
 * y lo abre en una nueva pestaña del browser.
 * Usado por documentos.js y checklists.js para abrir PDFs.
 *
 * @param {string} base64   - data URL completa ("data:application/pdf;base64,...")
 *                            o base64 puro sin prefijo
 * @param {string} mimeType - MIME type del archivo (default: 'application/pdf')
 * @returns {boolean}       - true si se abrió correctamente, false si el popup fue bloqueado
 */
function abrirBase64EnPestana(base64, mimeType = 'application/pdf') {
  const datos      = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteString = atob(datos);
  const ab         = new ArrayBuffer(byteString.length);
  const ia         = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
  const blob = new Blob([ab], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 120000);
  return !!win;
}

window.abrirBase64EnPestana = abrirBase64EnPestana;

/**
 * Convierte un File a string base64 (data URL).
 * Usado por documentos.js y checklists.js al cargar PDFs.
 *
 * @param {File} file
 * @returns {Promise<string>}
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

window.fileToBase64 = fileToBase64;
