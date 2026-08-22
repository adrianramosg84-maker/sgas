/* ================================================================
   SGAS — ats.js
   Lógica completa de fichas ATS:
   lista por categoría, nueva ficha, editar, guardar, PDF.
   Aplica también a Talleres, Rescatista y Actividades Críticas.
   ================================================================ */

/* ── CATEGORÍAS del sidebar ── */
const CATEGORIAS = [
  'Aislamiento Térmico', 'Andamios',
  'Aplicación de Pintura', 'Prep. Superficie y Aplicación', 'Garnet Prep. Superficie',
  'Civil', 'Lavado Industrial', 'Trabajos Verticales',
  'Izaje', 'Mecánica', 'Estructural', 'Reparaciones',
  'Talleres', 'Rescatista', 'Actividades Críticas',
];

/* ── Estado local del módulo ── */
const AtsState = {
  categoria:    '',
  fichaActual:  null,  // objeto ficha en edición
  modo:         'edit', // 'edit' | 'saved'
};

/* ================================================================
   LISTA DE FICHAS
   ================================================================ */
async function renderAtsLista(categoria) {
  AtsState.categoria = categoria;

  // Determinar ruta hash y breadcrumb según si es categoría especial
  const especiales = { 'Talleres': 'talleres', 'Rescatista': 'rescatista', 'Actividades Críticas': 'actividades-criticas' };
  const esEspecial  = !!especiales[categoria];
  const hash        = esEspecial ? especiales[categoria] : `ats/${encodeURIComponent(categoria)}`;

  setBreadcrumb(esEspecial
    ? [{ label: 'Inicio', hash: 'inicio' }, { label: categoria }]
    : [{ label: 'Inicio', hash: 'inicio' }, { label: 'ATS', hash: 'ats/lista' }, { label: categoria }]
  );

  // Cargar fichas desde storage
  let fichas = [];
  try { fichas = await Storage.ATS.getByCategoria(categoria); } catch(e) {}

  // Renderizar tabla
  const tbody = document.getElementById('ats-lista-tbody');
  tbody.innerHTML = '';

  if (fichas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:28px">
      No hay fichas en esta categoría. Creá la primera con <strong>+ Nueva Ficha</strong>.
    </td></tr>`;
  } else {
    fichas.sort((a, b) => b.id - a.id).forEach(ficha => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="cursor:pointer" onclick="abrirFichaSaved(${ficha.id})">${escapeHtml(ficha.nombre)}</td>
        <td><span class="badge ${ficha.estado === 'guardado' ? 'badge-saved' : 'badge-draft'}">
          ${ficha.estado === 'guardado' ? 'Guardado' : 'Borrador'}
        </span></td>
        <td class="td-actions">
          <button class="icon-btn ib-edit" title="Editar" onclick="abrirFichaEdit(${ficha.id})">✏️</button>
          <button class="icon-btn ib-pdf"  title="Descargar PDF" onclick="exportarPdfAts(${ficha.id})">📄</button>
          <button class="icon-btn ib-del"  title="Eliminar" onclick="eliminarFicha(${ficha.id})">🗑️</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  // Título y botón nueva ficha
  document.getElementById('ats-lista-titulo').textContent = categoria;
  document.getElementById('btn-nueva-ficha').onclick = () =>
    openModal('Nueva Ficha ATS', 'Nombre del ATS', 'Ej: Trabajos en caliente — Caldera 3', (nombre) => {
      crearNuevaFicha(nombre);
    });

  showView('ats_lista');
}

/* ================================================================
   FICHA — ABRIR / CREAR
   ================================================================ */
async function crearNuevaFicha(nombre) {
  AtsState.fichaActual = {
    nombre,
    categoria: AtsState.categoria,
    estado: 'borrador',
    filas: [{ paso: '', peligro: '', control: '' }, { paso: '', peligro: '', control: '' }, { paso: '', peligro: '', control: '' }],
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
  const cat      = ficha.categoria;

  setBreadcrumb([
    { label: 'Inicio', hash: 'inicio' },
    { label: cat, hash: `ats/${encodeURIComponent(cat)}` },
    { label: ficha.nombre || 'Nueva Ficha' },
  ]);

  // Título
  document.getElementById('ficha-titulo').textContent = ficha.nombre || 'Nueva Ficha';

  // Nombre del ATS
  const inputNombre = document.getElementById('f-nombre');
  inputNombre.value    = ficha.nombre || '';
  inputNombre.disabled = !editable;

  // Observaciones
  const obsEl = document.getElementById('f-observaciones');
  if (obsEl) {
    obsEl.value    = ficha.observaciones || '';
    obsEl.disabled = !editable;
  }

  // Botones
  document.getElementById('ficha-actions-saved').style.display = editable ? 'none' : '';
  document.getElementById('ficha-actions-edit').style.display  = editable ? '' : 'none';
  document.getElementById('btn-add-row').style.display         = editable ? '' : 'none';
  // Tabla
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
      <td><textarea ${editable?'':'disabled'} data-col="paso" lang="es" spellcheck="true">${escapeHtml(fila.paso || '')}</textarea></td>
      <td><textarea ${editable?'':'disabled'} data-col="peligro" lang="es" spellcheck="true">${escapeHtml(fila.peligro || '')}</textarea></td>
      <td><textarea ${editable?'':'disabled'} data-col="control" lang="es" spellcheck="true">${escapeHtml(fila.control || '')}</textarea></td>
      <td class="td-del">
        <button class="row-del-btn" style="${editable?'':'display:none'}"
          onclick="eliminarFila(${i})" title="Eliminar fila">✕</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

/* ================================================================
   FICHA — ACCIONES DE TABLA
   ================================================================ */
function agregarFila() {
  if (!AtsState.fichaActual) return;
  AtsState.fichaActual.filas = AtsState.fichaActual.filas || [];
  AtsState.fichaActual.filas.push({ paso: '', peligro: '', control: '' });
  // Agregar fila al DOM sin re-renderizar todo
  const tbody = document.getElementById('ats-tbody');
  const i = AtsState.fichaActual.filas.length - 1;
  const tr = document.createElement('tr');
  tr.dataset.index = i;
  tr.innerHTML = `
    <td class="td-num">${i + 1}</td>
    <td><textarea data-col="paso" lang="es" spellcheck="true" placeholder="Describir el paso..."></textarea></td>
    <td><textarea data-col="peligro" lang="es" spellcheck="true" placeholder="Peligros asociados..."></textarea></td>
    <td><textarea data-col="control" lang="es" spellcheck="true" placeholder="Medidas preventivas..."></textarea></td>
    <td class="td-del">
      <button class="row-del-btn" onclick="eliminarFila(${i})" title="Eliminar fila">✕</button>
    </td>`;
  tbody.appendChild(tr);
  // Foco en el primer campo
  tr.querySelector('textarea')?.focus();
}

function eliminarFila(index) {
  if (!AtsState.fichaActual?.filas) return;
  AtsState.fichaActual.filas.splice(index, 1);
  renderTablaAts(AtsState.fichaActual.filas, true);
}

/* ── Leer filas del DOM antes de guardar ── */
function leerFilasDOM() {
  const filas = [];
  document.querySelectorAll('#ats-tbody tr').forEach(tr => {
    const paso    = tr.querySelector('[data-col="paso"]')?.value.trim()    || '';
    const peligro = tr.querySelector('[data-col="peligro"]')?.value.trim() || '';
    const control = tr.querySelector('[data-col="control"]')?.value.trim() || '';
    filas.push({ paso, peligro, control });
  });
  return filas;
}

/* ================================================================
   FICHA — GUARDAR / EDITAR
   ================================================================ */
async function guardarFicha() {
  const ficha = AtsState.fichaActual;
  if (!ficha) return;

  // Leer nombre actual del input
  ficha.nombre = document.getElementById('f-nombre').value.trim();
  if (!ficha.nombre) {
    document.getElementById('f-nombre').style.borderColor = 'var(--btn-del)';
    document.getElementById('f-nombre').focus();
    return;
  }
  document.getElementById('f-nombre').style.borderColor = '';

  // Leer filas del DOM
  ficha.filas  = leerFilasDOM();
  ficha.estado = 'guardado';

  // Leer observaciones
  const obsEl = document.getElementById('f-observaciones');
  if (obsEl) ficha.observaciones = obsEl.value.trim();

  try {
    const id = await Storage.ATS.save(ficha);
    if (!ficha.id) ficha.id = id;
    AtsState.modo = 'saved';
    renderFicha();
    toast('✓ Ficha guardada correctamente');
  } catch(e) {
    toast('Error al guardar', 'error');
  }
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
  if (id) {
    try { ficha = await Storage.ATS.getById(id); } catch(e) {}
  }
  if (!ficha) return;

  const fechaHoy = new Date().toLocaleDateString('es-AR');
  const nombreArchivo = `ATS_${ficha.categoria}_${fechaHoy.replace(/\//g,'-')}.pdf`;

  // Construir HTML para PDF
  const filasHtml = (ficha.filas || []).map((f, i) => `
    <tr>
      <td style="text-align:center;width:32px">${i+1}</td>
      <td>${escapeHtml(f.paso)}</td>
      <td>${escapeHtml(f.peligro)}</td>
      <td>${escapeHtml(f.control)}</td>
    </tr>`).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;padding:20px;color:#000">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #2d4a6e;padding-bottom:10px;margin-bottom:16px">
        <div style="font-size:20px;font-weight:900;color:#2d4a6e">SGAS</div>
        <div style="text-align:center;font-size:14px;font-weight:700">ANÁLISIS DE TRABAJO SEGURO</div>
        <div style="text-align:right;font-size:11px;color:#555">${fechaHoy}</div>
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
      <div style="margin-top:20px;border-top:1px solid #ccc;padding-top:10px;display:flex;justify-content:space-between;font-size:10px;color:#555">
        <span>Categoría: ${escapeHtml(ficha.categoria)}</span>
        <span>Fecha emisión: ${fechaHoy}</span>
        <span style="font-weight:700;color:#2d6a4f">ESTADO: APROBADO</span>
      </div>
    </div>`;

  if (typeof html2pdf !== 'undefined') {
    html2pdf().set({
      margin: 10,
      filename: nombreArchivo,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    }).from(html).save();
  } else {
    // Fallback: ventana de impresión
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${nombreArchivo}</title></head><body>${html}</body></html>`);
    win.document.close();
    win.print();
  }
}

/* ================================================================
   VISTAS — registrar en el router
   ================================================================ */
Views.atsLista = (cat) => renderAtsLista(cat);

Views.genericoLista = (slug, label) => {
  AtsState.categoria = label;
  renderAtsLista(label);
};

/* ── Helpers expuestos globalmente ── */
window.agregarFila      = agregarFila;
window.eliminarFila     = eliminarFila;
window.guardarFicha     = guardarFicha;
window.editarFicha      = editarFicha;
window.eliminarFicha    = eliminarFicha;
window.abrirFichaSaved  = abrirFichaSaved;
window.abrirFichaEdit   = abrirFichaEdit;
window.exportarPdfAts   = exportarPdfAts;
window.renderAtsLista   = renderAtsLista;
window.crearNuevaFicha  = crearNuevaFicha;

/* ── Utility ── */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
window.escapeHtml = escapeHtml;
