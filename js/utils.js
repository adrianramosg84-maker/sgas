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

/**
 * Genera los controles de paginación HTML y los inserta en un contenedor.
 * @param {string} containerId - ID del elemento donde insertar los controles
 * @param {object} pag  - { page, pages, total }
 * @param {string} fnAnterior - nombre de función global para página anterior
 * @param {string} fnSiguiente - nombre de función global para página siguiente
 */
function renderPaginacion(containerId, pag, fnAnterior, fnSiguiente) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!pag || pag.pages <= 1) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:16px 0">
      <button class="btn btn-ghost btn-sm" ${pag.page <= 1 ? 'disabled' : ''}
        onclick="${fnAnterior}()">‹ Anterior</button>
      <span style="font-size:12px;color:var(--text-dim);padding:0 10px">
        Página ${pag.page} de ${pag.pages} &nbsp;·&nbsp; ${pag.total} registros
      </span>
      <button class="btn btn-ghost btn-sm" ${pag.page >= pag.pages ? 'disabled' : ''}
        onclick="${fnSiguiente}()">Siguiente ›</button>
    </div>`;
}

window.renderPaginacion = renderPaginacion;

/**
 * Genera los controles de paginación HTML y los inserta en un contenedor.
 * @param {string} containerId - ID del elemento donde insertar los controles
 * @param {object} pag - { page, pages, total } retornado por el servidor
 * @param {function} onPageChange - callback(nuevaPagina) al hacer clic
 */
function renderPaginacion(containerId, pag, onPageChange) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!pag || pag.pages <= 1) { el.innerHTML = ''; return; }

  const btns = [];
  // Anterior
  btns.push(`<button class="btn btn-ghost btn-sm" ${pag.page <= 1 ? 'disabled' : ''}
    onclick="(${onPageChange.name || '(p)=>{}'})(${pag.page - 1})">‹ Anterior</button>`);
  // Info
  btns.push(`<span style="font-size:12px;color:var(--text-dim);padding:0 10px">
    Página ${pag.page} de ${pag.pages} &nbsp;·&nbsp; ${pag.total} registros
  </span>`);
  // Siguiente
  btns.push(`<button class="btn btn-ghost btn-sm" ${pag.page >= pag.pages ? 'disabled' : ''}
    onclick="(${onPageChange.name || '(p)=>{}'})(${pag.page + 1})">Siguiente ›</button>`);

  el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:16px 0">${btns.join('')}</div>`;
}

window.renderPaginacion = renderPaginacion;
