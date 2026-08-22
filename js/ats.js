/* ================================================================
   SGAS — ats.js
   Lógica de fichas ATS para todas las categorías incluyendo
   Talleres, Rescatista y Actividades Críticas.
   ================================================================ */

const AtsState = {
  categoria: '',
  fichaActual: null,
  modo: 'edit',
};

/* ================================================================
   LISTA DE FICHAS
   ================================================================ */
async function renderAtsLista(categoria) {
  AtsState.categoria = categoria;

  setBreadcrumb([
    { label: 'Inicio', hash: 'inicio' },
    { label: categoria },
  ]);

  document.getElementById('ats-lista-titulo').textContent = categoria;

  // Botón nueva ficha
  document.getElementById('btn-nueva-ficha').onclick = () =>
    openModal('Nueva Ficha ATS', 'Nombre del ATS',
      'Ej: Trabajos en caliente — Caldera 3', crearNuevaFicha);

  // Cargar fichas
  let fichas = [];
  try { fichas = await Storage.ATS.getByCategoria(categoria); } catch(e) {}

  const tbody = document.getElementById('ats-lista-tbody');
  tbody.innerHTML = '';

  if (!fichas || fichas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:32px">
      No hay fichas en esta categoría. Creá la primera con <strong>＋ Nueva Ficha</strong>.
    </td></tr>`;
  } else {
    fichas.forEach(ficha => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="cursor:pointer" onclick="abrirFichaSaved(${ficha.id})">${escapeHtml(ficha.nombre)}</td>
        <td><span class="badge ${ficha.estado === 'guardado' ? 'badge-saved' : 'badge-draft'}">
          ${ficha.estado === 'guardado' ? 'Guardado' : 'Borrador'}
        </span></td>
        <td class="td-actions">
          <button class="icon-btn ib-edit" onclick="abrirFichaEdit(${ficha.id})">✏️</button>
          <button class="icon-btn ib-pdf"  onclick="exportarPdfAts(${ficha.id})">📄</button>
          <button class="icon-btn ib-del"  onclick="eliminarFicha(${ficha.id})">🗑️</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  showView('ats_lista');
}

/* ================================================================
   FICHA — CREAR / ABRIR
   ================================================================ */
async function crearNuevaFicha(nombre) {
  AtsState.fichaActual = {
    nombre,
    categoria: AtsState.categoria,
    estado: 'borrador',
    filas: [
      { paso: '', peligro: '', control: '' },
      { paso: '', peligro: '', control: '' },
      { paso: '', peligro: '', control: '' },
    ],
    observaciones: '',
  };
  AtsState.modo = 'edit';
  renderFicha();
}

async function abrirFichaSaved(id) {
  try {
    const ficha = await Storage.ATS.getById(id);
    if (!ficha) return;
    AtsState.fichaActual = ficha;
    AtsState.modo = 'saved';
    renderFicha();
  } catch(e) { toast('Error al abrir ficha', 'error'); }
}

async function abrirFichaEdit(id) {
  try {
    const ficha = await Storage.ATS.getById(id);
    if (!ficha) return;
    AtsState.fichaActual = ficha;
    AtsState.modo = 'edit';
    renderFicha();
  } catch(e) { toast('Error al abrir ficha', 'error'); }
}

/* ================================================================
   FICHA — RENDER
   ================================================================ */
function renderFicha() {
  const ficha    = AtsState.fichaActual;
  const editable = AtsState.modo === 'edit';

  setBreadcrumb([
    { label: 'Inicio', hash: 'inicio' },
    { label: ficha.categoria, hash: `ats/${encodeURIComponent(ficha.categoria)}` },
    { label: ficha.nombre || 'Nueva Ficha' },
  ]);

  document.getElementById('ficha-titulo').textContent = ficha.nombre || 'Nueva Ficha';

  const inputNombre = document.getElementById('f-nombre');
  inputNombre.value    = ficha.nombre || '';
  inputNombre.disabled = !editable;

  const obsEl = document.getElementById('f-observaciones');
  if (obsEl) {
    obsEl.value    = ficha.observaciones || '';
    obsEl.disabled = !editable;
  }

  document.getElementById('ficha-actions-saved').style.display = editable ? 'none' : '';
  document.getElementById('ficha-actions-edit').style.display  = editable ? '' : 'none';
  document.getElementById('btn-add-row').style.display         = editable ? '' : 'none';

  renderTablaAts(ficha.filas || [], editable);
  showView('ats_ficha');
}

function renderTablaAts(filas, editable) {
  const tbody = document.getElementById('ats-tbody');
  tbody.innerHTML = '';
  filas.forEach((fila, i) => {
    const tr = document.createElement('tr');
    tr.dataset.index = i;
    tr.innerHTML = `
      <td class="td-num">${i + 1}</td>
      <td><textarea ${editable?'':'disabled'} data-col="paso" lang="es" spellcheck="true">${escapeHtml(fila.paso||'')}</textarea></td>
      <td><textarea ${editable?'':'disabled'} data-col="peligro" lang="es" spellcheck="true">${escapeHtml(fila.peligro||'')}</textarea></td>
      <td><textarea ${editable?'':'disabled'} data-col="control" lang="es" spellcheck="true">${escapeHtml(fila.control||'')}</textarea></td>
      <td class="td-del">
        <button class="row-del-btn" style="${editable?'':'display:none'}"
          onclick="eliminarFila(${i})">✕</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

/* ================================================================
   FICHA — ACCIONES
   ================================================================ */
function agregarFila() {
  if (!AtsState.fichaActual) return;
  AtsState.fichaActual.filas = AtsState.fichaActual.filas || [];
  const i = AtsState.fichaActual.filas.length;
  AtsState.fichaActual.filas.push({ paso: '', peligro: '', control: '' });
  const tbody = document.getElementById('ats-tbody');
  const tr = document.createElement('tr');
  tr.dataset.index = i;
  tr.innerHTML = `
    <td class="td-num">${i + 1}</td>
    <td><textarea data-col="paso" lang="es" spellcheck="true" placeholder="Describir el paso..."></textarea></td>
    <td><textarea data-col="peligro" lang="es" spellcheck="true" placeholder="Peligros asociados..."></textarea></td>
    <td><textarea data-col="control" lang="es" spellcheck="true" placeholder="Medidas preventivas..."></textarea></td>
    <td class="td-del"><button class="row-del-btn" onclick="eliminarFila(${i})">✕</button></td>`;
  tbody.appendChild(tr);
  tr.querySelector('textarea')?.focus();
}

function eliminarFila(index) {
  if (!AtsState.fichaActual?.filas) return;
  AtsState.fichaActual.filas.splice(index, 1);
  renderTablaAts(AtsState.fichaActual.filas, true);
}

function leerFilasDOM() {
  const filas = [];
  document.querySelectorAll('#ats-tbody tr').forEach(tr => {
    filas.push({
      paso:    tr.querySelector('[data-col="paso"]')?.value.trim()    || '',
      peligro: tr.querySelector('[data-col="peligro"]')?.value.trim() || '',
      control: tr.querySelector('[data-col="control"]')?.value.trim() || '',
    });
  });
  return filas;
}

/* ================================================================
   FICHA — GUARDAR / EDITAR
   ================================================================ */
async function guardarFicha() {
  const ficha = AtsState.fichaActual;
  if (!ficha) return;

  ficha.nombre = document.getElementById('f-nombre').value.trim();
  if (!ficha.nombre) {
    document.getElementById('f-nombre').style.borderColor = 'var(--btn-del)';
    document.getElementById('f-nombre').focus();
    return;
  }
  document.getElementById('f-nombre').style.borderColor = '';

  ficha.filas        = leerFilasDOM();
  ficha.observaciones = document.getElementById('f-observaciones')?.value.trim() || '';
  ficha.estado       = 'guardado';

  try {
    const id = await Storage.ATS.save(ficha);
    if (!ficha.id) ficha.id = id;
    AtsState.modo = 'saved';
    renderFicha();
    toast('✓ Ficha guardada correctamente');
  } catch(e) { toast('Error al guardar', 'error'); }
}

function editarFicha() {
  AtsState.modo = 'edit';
  renderFicha();
}

async function eliminarFicha(id) {
  if (!confirm('¿Eliminar esta ficha? Esta acción no se puede deshacer.')) return;
  try {
    await Storage.ATS.remove(id);
    toast('Ficha eliminada');
    renderAtsLista(AtsState.categoria);
  } catch(e) { toast('Error al eliminar', 'error'); }
}

/* ================================================================
   EXPORTAR PDF
   ================================================================ */
async function exportarPdfAts(id) {
  let ficha = AtsState.fichaActual;
  if (id) { try { ficha = await Storage.ATS.getById(id); } catch(e) {} }
  if (!ficha) return;

  const fechaHoy = new Date().toLocaleDateString('es-AR');
  const filasHtml = (ficha.filas || []).map((f, i) => `
    <tr>
      <td style="text-align:center;width:32px;border:1px solid #ccc;padding:6px">${i+1}</td>
      <td style="border:1px solid #ccc;padding:6px">${escapeHtml(f.paso)}</td>
      <td style="border:1px solid #ccc;padding:6px">${escapeHtml(f.peligro)}</td>
      <td style="border:1px solid #ccc;padding:6px">${escapeHtml(f.control)}</td>
    </tr>`).join('');

  const obsHtml = ficha.observaciones
    ? `<div style="margin-top:16px"><strong>Observaciones:</strong><p style="margin-top:6px">${escapeHtml(ficha.observaciones)}</p></div>`
    : '';

  const html = `
    <div style="font-family:Arial,sans-serif;padding:20px;color:#000">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #2d4a6e;padding-bottom:10px;margin-bottom:16px">
        <div style="font-size:20px;font-weight:900;color:#2d4a6e">SGAS</div>
        <div style="font-size:14px;font-weight:700">ANÁLISIS DE TRABAJO SEGURO</div>
        <div style="font-size:11px;color:#555">${fechaHoy}</div>
      </div>
      <div style="margin-bottom:14px">
        <strong>Categoría:</strong> ${escapeHtml(ficha.categoria)} &nbsp;&nbsp;
        <strong>Tarea:</strong> ${escapeHtml(ficha.nombre)}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead>
          <tr>
            <th style="background:#2d4a6e;color:#fff;padding:8px;border:1px solid #ccc;width:32px">#</th>
            <th style="background:#2d4a6e;color:#fff;padding:8px;border:1px solid #ccc">Pasos de la tarea</th>
            <th style="background:#2d4a6e;color:#fff;padding:8px;border:1px solid #ccc">Peligros identificados</th>
            <th style="background:#2d4a6e;color:#fff;padding:8px;border:1px solid #ccc">Medidas de control</th>
          </tr>
        </thead>
        <tbody>${filasHtml}</tbody>
      </table>
      ${obsHtml}
      <div style="margin-top:20px;border-top:1px solid #ccc;padding-top:10px;display:flex;justify-content:space-between;font-size:10px;color:#555">
        <span>Categoría: ${escapeHtml(ficha.categoria)}</span>
        <span>Fecha: ${fechaHoy}</span>
        <span style="font-weight:700;color:#2d6a4f">ESTADO: APROBADO</span>
      </div>
    </div>`;

  const nombreArchivo = `ATS_${ficha.categoria}_${fechaHoy.replace(/\//g,'-')}.pdf`;

  if (typeof html2pdf !== 'undefined') {
    html2pdf().set({
      margin: 10, filename: nombreArchivo,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    }).from(html).save();
  } else {
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${nombreArchivo}</title></head><body>${html}</body></html>`);
    win.document.close(); win.print();
  }
}

/* ── Registrar vistas en el router ── */
Views.atsLista = (cat) => renderAtsLista(cat);
Views.genericoLista = (slug, label) => {
  AtsState.categoria = label;
  renderAtsLista(label);
};

/* ── Exponer globalmente ── */
window.agregarFila     = agregarFila;
window.eliminarFila    = eliminarFila;
window.guardarFicha    = guardarFicha;
window.editarFicha     = editarFicha;
window.eliminarFicha   = eliminarFicha;
window.abrirFichaSaved = abrirFichaSaved;
window.abrirFichaEdit  = abrirFichaEdit;
window.exportarPdfAts  = exportarPdfAts;
window.renderAtsLista  = renderAtsLista;
window.crearNuevaFicha = crearNuevaFicha;

/* ── Utility ── */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
window.escapeHtml = escapeHtml;
