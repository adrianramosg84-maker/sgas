/* ================================================================
   SGAS — ats.js
   Lógica de fichas ATS para todas las categorías incluyendo
   Talleres, Rescatista y Actividades Críticas.
   ================================================================ */

const AtsState = {
  categoria: '',
  tipo:      'ats',
  fichaActual: null,
  modo: 'edit',
};

/* ================================================================
   LISTA DE FICHAS
   ================================================================ */
async function renderAtsLista(categoria, tipo = 'ats') {
  AtsState.categoria = categoria;
  AtsState.tipo      = tipo;

  const prefijo = tipo === 'parada' ? 'parada' : 'ats';

  setBreadcrumb([
    { label: 'Inicio', hash: 'inicio' },
    { label: tipo === 'parada' ? 'Parada de Planta' : categoria, hash: tipo === 'parada' ? null : null },
    { label: categoria },
  ]);

  document.getElementById('ats-lista-titulo').textContent = categoria;

  // Botón nueva ficha
  document.getElementById('btn-nueva-ficha').onclick = () =>
    openModal('Nueva Ficha ATS', 'Nombre del ATS',
      'Ej: Trabajos en caliente — Caldera 3', crearNuevaFicha);

  // Cargar fichas filtradas por categoria Y tipo
  let fichas = [];
  try { fichas = await Storage.ATS.getByCategoria(categoria, AtsState.tipo); } catch(e) {}

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
          <button class="icon-btn ib-xls"  onclick="exportarExcelAts(${ficha.id})" title="Descargar Excel">📊</button>
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
    categoria:   AtsState.categoria,
    tipo:        AtsState.tipo || 'ats',
    estado:      'borrador',
    filas:       [
      { paso: '', peligro: '', control: '' },
      { paso: '', peligro: '', control: '' },
      { paso: '', peligro: '', control: '' },
    ],
    observaciones: '',
    emergencia:  {},
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

  // Campos de emergencia
  const emerg = ficha.emergencia || {};
  const emergFields = [
    ['f-emerg-reunion',    emerg.reunion    || ''],
    ['f-emerg-alarmas',    emerg.alarmas    || ''],
    ['f-emerg-extintores', emerg.extintores || ''],
    ['f-emerg-lavaojos',   emerg.lavaojos   || ''],
    ['f-emerg-contacto',   emerg.contacto   || ''],
  ];
  emergFields.forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) { el.value = val; el.disabled = !editable; }
  });

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

  ficha.filas         = leerFilasDOM();
  ficha.observaciones = document.getElementById('f-observaciones')?.value.trim() || '';
  ficha.emergencia    = {
    reunion:    document.getElementById('f-emerg-reunion')?.value.trim()    || '',
    alarmas:    document.getElementById('f-emerg-alarmas')?.value.trim()    || '',
    extintores: document.getElementById('f-emerg-extintores')?.value.trim() || '',
    lavaojos:   document.getElementById('f-emerg-lavaojos')?.value.trim()   || '',
    contacto:   document.getElementById('f-emerg-contacto')?.value.trim()   || '',
  };
  ficha.estado = 'guardado';

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
    doc.rect(0, 0, pageW, pg === 1 ? 14 : 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(pg === 1 ? 10 : 7.5);
    doc.text('SGAS', 6, pg === 1 ? 9 : 6);
    doc.setFontSize(pg === 1 ? 8.5 : 7);
    doc.text('ANÁLISIS DE TRABAJO SEGURO (ATS)', pageW / 2, pg === 1 ? 9 : 6, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(fechaHoy, pageW - 6, pg === 1 ? 9 : 6, { align: 'right' });
  };

  dibujarHeader(1);

  // Subtítulo
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Categoría: ${ficha.categoria}`, 6, 19);
  doc.setFont('helvetica', 'bold');
  const nombreLines = doc.splitTextToSize(`Tarea: ${ficha.nombre}`, pageW - 12);
  doc.text(nombreLines, 6, 24);

  // Tabla con autoTable
  const body = (ficha.filas || []).map((f) => [
    textoAPdf(f.paso),
    textoAPdf(f.peligro),
    textoAPdf(f.control),
  ]);

  doc.autoTable({
    startY: 29,
    head: [[
      'PASOS DE LA TAREA\nDescribe los pasos a seguir para ejecutar la actividad',
      'PELIGROS IDENTIFICADOS\nDetalla los peligros asociados a cada paso',
      'MEDIDAS DE CONTROL\nEspecifique acciones a tomar para prevenir o mitigar cada riesgo',
    ]],
    body,
    styles: {
      fontSize: 6.5,
      cellPadding: { top: 1.5, right: 2.5, bottom: 1.5, left: 2.5 },
      valign: 'top',
      lineColor: [180, 180, 180],
      lineWidth: 0.2,
      overflow: 'linebreak',
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [45, 74, 110],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.5,
      valign: 'middle',
      halign: 'left',
      cellPadding: { top: 2, right: 2.5, bottom: 2, left: 2.5 },
    },
    columnStyles: {},
    tableWidth: 'auto',
    alternateRowStyles: { fillColor: [248, 250, 252] },
    rowPageBreak: 'auto',
    showHead: 'firstPage',
    margin: { top: 12, left: 6, right: 6, bottom: 10 },
    didDrawPage: (data) => {
      const pg = doc.internal.getCurrentPageInfo().pageNumber;
      if (pg > 1) dibujarHeader(pg);
      // Pie
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${ficha.categoria} — ${ficha.nombre}`, 6, pageH - 3.5);
      doc.text(`Página ${pg}`, pageW / 2, pageH - 3.5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 106, 79);
      doc.text('ESTADO: APROBADO', pageW - 6, pageH - 3.5, { align: 'right' });
    },
  });

  // Observaciones
  if (ficha.observaciones) {
    const finalY = (doc.lastAutoTable?.finalY || 29) + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.text('Observaciones / Recomendaciones:', 6, finalY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const lines = doc.splitTextToSize(ficha.observaciones, pageW - 12);
    doc.text(lines, 6, finalY + 4);
  }

  doc.save(nombreArchivo);
}

/* ================================================================
   EXPORTAR EXCEL — ExcelJS → .xlsx nativo con estilos reales
   ================================================================ */
async function exportarExcelAts(id) {
  let ficha = AtsState.fichaActual;
  if (id) { try { ficha = await Storage.ATS.getById(id); } catch(e) {} }
  if (!ficha) return;

  /* ── Cargar ExcelJS dinámicamente si no está disponible aún ── */
  if (!window.ExcelJS) {
    toast('Cargando librería Excel...');
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src     = 'https://unpkg.com/exceljs@4.4.0/dist/exceljs.min.js';
      s.onload  = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    }).catch(() => null);
  }

  const EJS = window.ExcelJS;
  if (!EJS || !EJS.Workbook) {
    toast('No se pudo cargar la librería Excel. Verificá tu conexión.', 'error');
    return;
  }

  const fechaHoy      = new Date().toLocaleDateString('es-AR');
  const nombreArchivo = `ATS_${ficha.categoria}_${fechaHoy.replace(/\//g, '-')}.xlsx`;
  const filas         = ficha.filas || [];

  /* ── Helpers de estilo ── */
  const AZUL    = { argb: 'FF2D4A6E' };
  const VERDE   = { argb: 'FF4A6741' };
  const GRIS    = { argb: 'FFEEF2F7' };
  const GRIS2   = { argb: 'FFE8EDF5' };
  const BLANCO  = { argb: 'FFFFFFFF' };
  const GRISF   = { argb: 'FFF8FAFB' };
  const AMARILL = { argb: 'FFFFFBEA' };
  const NEGRO   = { argb: 'FF1A1A1A' };
  const BLANCOT = { argb: 'FFFFFFFF' };

  const borde = {
    top:    { style: 'thin', color: { argb: 'FFB4B4B4' } },
    left:   { style: 'thin', color: { argb: 'FFB4B4B4' } },
    bottom: { style: 'thin', color: { argb: 'FFB4B4B4' } },
    right:  { style: 'thin', color: { argb: 'FFB4B4B4' } },
  };

  function estilo(fgColor, fontColor, bold = false, vAlign = 'middle', hAlign = 'left') {
    return {
      font:      { name: 'Calibri', size: 10, bold, color: { argb: fontColor.argb } },
      fill:      { type: 'pattern', pattern: 'solid', fgColor },
      alignment: { vertical: vAlign, horizontal: hAlign, wrapText: true },
      border:    borde,
    };
  }

  const sTitulo   = estilo(AZUL,    BLANCOT, true,  'middle', 'center');
  const sMeta     = estilo(GRIS,    NEGRO,   false, 'middle', 'left');
  const sCabecera = estilo(AZUL,    BLANCOT, true,  'middle', 'center');
  const sPaso     = estilo(GRIS2,   NEGRO,   true,  'middle', 'left');
  const sDato     = estilo(BLANCO,  NEGRO,   false, 'top',    'left');
  const sDatoAlt  = estilo(GRISF,   NEGRO,   false, 'top',    'left');
  const sObsHead  = estilo(VERDE,   BLANCOT, true,  'middle', 'left');
  const sObsBody  = estilo(AMARILL, NEGRO,   false, 'top',    'left');

  /* ── Crear libro y hoja ── */
  const wb = new EJS.Workbook();
  wb.creator = 'SGAS';
  const ws = wb.addWorksheet('ATS', {
    views: [{ showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  /* ── Anchos de columna ── */
  ws.columns = [
    { width: 38 },  // A — Etapas
    { width: 42 },  // B — Peligros
    { width: 42 },  // C — Medidas
  ];

  /* ── Helper para agregar fila con estilo ── */
  function agregarFila(valores, estilos, altura = 18) {
    const row = ws.addRow(valores);
    row.height = altura;
    estilos.forEach((s, i) => {
      if (s) Object.assign(row.getCell(i + 1), s);
    });
    return row;
  }

  function aplicarEstilo(cell, s) {
    cell.style = s;
  }

  /* ── Fila 1: Título (merge A-C) ── */
  agregarFila(['ANÁLISIS DE TRABAJO SEGURO (ATS)', '', ''], [sTitulo, sTitulo, sTitulo], 28);
  ws.mergeCells('A1:C1');

  /* ── Fila 2: Metadatos ── */
  agregarFila(
    [`Categoría: ${ficha.categoria}`, `Fecha: ${fechaHoy}`, `Estado: ${ficha.estado === 'guardado' ? 'Guardado' : 'Borrador'}`],
    [sMeta, sMeta, sMeta], 18
  );

  /* ── Fila 3: Nombre tarea (merge A-C) ── */
  agregarFila([`Tarea: ${ficha.nombre}`, '', ''], [sMeta, sMeta, sMeta], 18);
  ws.mergeCells(`A3:C3`);

  /* ── Fila 4: Cabeceras (merge A-C vacío intermedio) ── */
  agregarFila(
    [
      'Etapas de la Tarea\n(describa paso a paso las actividades)',
      'Peligros / Consecuencias\n(Escriba lo que puede suceder si no se implementan controles)',
      'Medidas de control requeridas',
    ],
    [sCabecera, sCabecera, sCabecera], 36
  );

  /* ── Filas de datos ── */
  // Agrupa filas consecutivas con el mismo texto de paso (merge vertical)
  const grupos = [];
  filas.forEach((f) => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.paso === (f.paso || '') && (f.paso || '').trim() !== '') {
      ultimo.items.push(f);
    } else {
      grupos.push({ paso: f.paso || '', items: [f] });
    }
  });

  let rowIdx = 5; // siguiente fila disponible (1-indexed)

  grupos.forEach((grupo, gi) => {
    const sFilaDato = gi % 2 === 0 ? sDato : sDatoAlt;
    const filaInicio = rowIdx;

    grupo.items.forEach((item) => {
      const row = ws.addRow([grupo.paso, item.peligro || '', item.control || '']);
      row.height = 60;
      aplicarEstilo(row.getCell(1), sPaso);
      aplicarEstilo(row.getCell(2), sFilaDato);
      aplicarEstilo(row.getCell(3), sFilaDato);
      rowIdx++;
    });

    // Merge vertical en columna A si hay más de 1 peligro para este paso
    if (grupo.items.length > 1) {
      ws.mergeCells(`A${filaInicio}:A${filaInicio + grupo.items.length - 1}`);
    }
  });

  /* ── Observaciones ── */
  if (ficha.observaciones && ficha.observaciones.trim()) {
    // Fila separadora
    const sepRow = ws.addRow(['', '', '']);
    sepRow.height = 6;
    rowIdx++;

    // Encabezado observaciones
    const headRow = ws.addRow(['Observaciones / Recomendaciones:', '', '']);
    headRow.height = 20;
    aplicarEstilo(headRow.getCell(1), sObsHead);
    aplicarEstilo(headRow.getCell(2), sObsHead);
    aplicarEstilo(headRow.getCell(3), sObsHead);
    ws.mergeCells(`A${rowIdx}:C${rowIdx}`);
    rowIdx++;

    // Contenido observaciones
    const obsRow = ws.addRow([ficha.observaciones, '', '']);
    obsRow.height = 60;
    aplicarEstilo(obsRow.getCell(1), sObsBody);
    aplicarEstilo(obsRow.getCell(2), sObsBody);
    aplicarEstilo(obsRow.getCell(3), sObsBody);
    ws.mergeCells(`A${rowIdx}:C${rowIdx}`);
  }

  /* ── Descargar ── */
  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  toast('✓ Excel descargado');
}

/* ── Registrar vistas en el router ── */
Views.atsLista = (cat, tipo) => renderAtsLista(cat, tipo || 'ats');
Views.genericoLista = (slug, label) => {
  AtsState.categoria = label;
  AtsState.tipo      = 'ats';
  renderAtsLista(label, 'ats');
};

/* ── Exponer globalmente ── */
window.agregarFila      = agregarFila;
window.eliminarFila     = eliminarFila;
window.guardarFicha     = guardarFicha;
window.editarFicha      = editarFicha;
window.eliminarFicha    = eliminarFicha;
window.abrirFichaSaved  = abrirFichaSaved;
window.abrirFichaEdit   = abrirFichaEdit;
window.exportarPdfAts   = exportarPdfAts;
window.exportarExcelAts = exportarExcelAts;
window.renderAtsLista   = renderAtsLista;
window.crearNuevaFicha  = crearNuevaFicha;

/* ── escapeHtml se define en js/utils.js (cargado antes que este módulo) ── */
