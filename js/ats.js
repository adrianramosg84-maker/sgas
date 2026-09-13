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
        <td>
          <a href="#ats/ficha/${ficha.id}" 
             onclick="event.preventDefault();abrirFichaSaved(${ficha.id})"
             style="color:var(--text);text-decoration:none;cursor:pointer"
             onmouseover="this.style.color='var(--accent)'"
             onmouseout="this.style.color='var(--text)'"
          >${escapeHtml(ficha.nombre)}</a>
        </td>
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
  } catch(e) {
    const { texto } = Storage.mensajeError(e);
    toast(`Error al abrir ficha: ${texto}`, 'error');
  }
}

async function abrirFichaEdit(id) {
  try {
    const ficha = await Storage.ATS.getById(id);
    if (!ficha) return;
    AtsState.fichaActual = ficha;
    AtsState.modo = 'edit';
    renderFicha();
  } catch(e) {
    const { texto } = Storage.mensajeError(e);
    toast(`Error al abrir ficha: ${texto}`, 'error');
  }
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
  // Sincronizar DOM → array ANTES de agregar, para no perder lo que el usuario escribió
  AtsState.fichaActual.filas = leerFilasDOM();
  AtsState.fichaActual.filas.push({ paso: '', peligro: '', control: '' });
  const i = AtsState.fichaActual.filas.length - 1;
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
  // Sincronizar DOM → array ANTES de eliminar, para no perder lo que el usuario escribió
  AtsState.fichaActual.filas = leerFilasDOM();
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
  } catch(e) {
    const { texto } = Storage.mensajeError(e);
    toast(`Error al guardar: ${texto}`, 'error');
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
  } catch(e) {
    const { texto } = Storage.mensajeError(e);
    toast(`Error al eliminar: ${texto}`, 'error');
  }
}

/* ================================================================
   EXPORTAR PDF — jsPDF + autoTable (sin cortes de fila)
   ================================================================ */

function textoAPdf(str) {
  if (!str) return '';
  return String(str);
}

async function exportarPdfAts(id) {
  let ficha = AtsState.fichaActual;
  if (id) { try { ficha = await Storage.ATS.getById(id); } catch(e) {} }
  if (!ficha) return;

  if (!window.jspdf) {
    toast('Librería PDF no cargada, intentá de nuevo', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const fechaHoy = new Date().toLocaleDateString('es-AR');
  const nombreArchivo = `ATS_${ficha.categoria}_${fechaHoy.replace(/\//g,'-')}.pdf`;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Encabezado página 1
  const dibujarHeader = (pg) => {
    doc.setFillColor(45, 74, 110);
    doc.rect(0, 0, pageW, pg === 1 ? 16 : 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(pg === 1 ? 11 : 8);
    doc.text('SGAS', 8, pg === 1 ? 10 : 7);
    doc.setFontSize(pg === 1 ? 9 : 7.5);
    doc.text('ANÁLISIS DE TRABAJO SEGURO (ATS)', pageW / 2, pg === 1 ? 10 : 7, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(fechaHoy, pageW - 8, pg === 1 ? 10 : 7, { align: 'right' });
  };

  dibujarHeader(1);

  // Subtítulo
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Categoría: ${ficha.categoria}`, 10, 23);
  doc.setFont('helvetica', 'bold');
  const nombreLines = doc.splitTextToSize(`Tarea: ${ficha.nombre}`, pageW - 20);
  doc.text(nombreLines, 10, 28);

  // Tabla con autoTable
  const body = (ficha.filas || []).map((f, i) => [
    i + 1,
    textoAPdf(f.paso),
    textoAPdf(f.peligro),
    textoAPdf(f.control),
  ]);

  doc.autoTable({
    startY: 33,
    head: [[
      '#',
      'PASOS DE LA TAREA\nDescribe los pasos a seguir para ejecutar la actividad',
      'PELIGROS IDENTIFICADOS\nDetalla los peligros asociados a cada paso',
      'MEDIDAS DE CONTROL\nEspecifique acciones a tomar para prevenir o mitigar cada riesgo',
    ]],
    body,
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 2.5, right: 4, bottom: 2.5, left: 4 },
      valign: 'top',
      lineColor: [180, 180, 180],
      lineWidth: 0.3,
      overflow: 'linebreak',
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [45, 74, 110],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      valign: 'middle',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 8,   halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 72 },
      2: { cellWidth: 95 },
      3: { cellWidth: 95 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    margin: { top: 14, left: 8, right: 8, bottom: 12 },
    didDrawPage: (data) => {
      const pg = doc.internal.getCurrentPageInfo().pageNumber;
      if (pg > 1) dibujarHeader(pg);
      // Pie
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`${ficha.categoria} — ${ficha.nombre}`, 8, pageH - 4);
      doc.text(`Página ${pg}`, pageW / 2, pageH - 4, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 106, 79);
      doc.text('ESTADO: APROBADO', pageW - 8, pageH - 4, { align: 'right' });
    },
  });

  // Observaciones
  if (ficha.observaciones) {
    const finalY = (doc.lastAutoTable?.finalY || 33) + 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('Observaciones / Recomendaciones:', 8, finalY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const lines = doc.splitTextToSize(ficha.observaciones, pageW - 16);
    doc.text(lines, 8, finalY + 4.5);
  }

  doc.save(nombreArchivo);
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
