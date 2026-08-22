/* ================================================================
   SGAS — emergencias.js
   Puntos de Emergencia:
   - Lista de Áreas (igual que lista ATS)
   - Detalle de Área con 3 sub-tablas: Extintores / Duchas-Lavaojos / HS-Alarmas
   ================================================================ */

const EmergState = {
  areaActual: null,
  modo: 'saved', // 'edit' | 'saved'
};

/* ================================================================
   LISTA DE ÁREAS
   ================================================================ */
async function renderEmergLista() {
  setBreadcrumb([
    { label: 'Inicio', hash: 'inicio' },
    { label: 'Puntos de Emergencia' },
  ]);

  let areas = [];
  try { areas = await Storage.Emergencias.getAll(); } catch(e) {}

  const container = document.getElementById('emerg-lista-container');
  container.innerHTML = '';

  if (areas.length === 0) {
    container.innerHTML = `<div style="text-align:center;color:var(--text-dim);padding:40px">
      No hay áreas de emergencia. Creá la primera con <strong>+ Nueva Área</strong>.
    </div>`;
  } else {
    areas.sort((a,b) => a.nombre.localeCompare(b.nombre)).forEach(area => {
      const totalPuntos =
        (area.extintores?.length || 0) +
        (area.duchas?.length    || 0) +
        (area.alarmas?.length   || 0);

      const card = document.createElement('div');
      card.className = 'emerg-area-card';
      card.innerHTML = `
        <div style="flex:1;min-width:0;cursor:pointer" onclick="abrirAreaDetalle(${area.id})">
          <div class="emerg-area-name">🏭 ${escapeHtml(area.nombre)}</div>
          <div class="emerg-area-meta">
            🧯 ${area.extintores?.length || 0} extintores &nbsp;·&nbsp;
            🚿 ${area.duchas?.length    || 0} duchas/lavaojos &nbsp;·&nbsp;
            🔔 ${area.alarmas?.length   || 0} alarmas
          </div>
        </div>
        <div class="emerg-area-actions">
          <button class="icon-btn ib-edit" title="Editar" onclick="event.stopPropagation();abrirAreaEdit(${area.id})">✏️</button>
          <button class="icon-btn ib-pdf"  title="Descargar PDF" onclick="event.stopPropagation();exportarPdfArea(${area.id})">📄</button>
          <button class="icon-btn ib-del"  title="Eliminar" onclick="event.stopPropagation();eliminarArea(${area.id})">🗑️</button>
        </div>`;
      container.appendChild(card);
    });
  }

  showView('emergencias');
}

/* ================================================================
   DETALLE DE ÁREA
   ================================================================ */
async function abrirAreaDetalle(id) {
  try {
    const area = await Storage.Emergencias.getById(id);
    if (!area) return;
    EmergState.areaActual = area;
    EmergState.modo = 'saved';
    renderAreaDetalle();
  } catch(e) { toast('Error al abrir área', 'error'); }
}

async function abrirAreaEdit(id) {
  try {
    const area = await Storage.Emergencias.getById(id);
    if (!area) return;
    EmergState.areaActual = area;
    EmergState.modo = 'edit';
    renderAreaDetalle();
  } catch(e) { toast('Error al abrir área', 'error'); }
}

function renderAreaDetalle() {
  const area     = EmergState.areaActual;
  const editable = EmergState.modo === 'edit';

  setBreadcrumb([
    { label: 'Inicio', hash: 'inicio' },
    { label: 'Puntos de Emergencia', hash: 'emergencias' },
    { label: area.nombre },
  ]);

  document.getElementById('area-detalle-titulo').textContent = '🏭 ' + area.nombre;

  // Botones
  document.getElementById('area-btn-editar').style.display  = editable ? 'none' : '';
  document.getElementById('area-btn-guardar').style.display = editable ? '' : 'none';

  // Renderizar las 3 sub-tablas
  renderSubTabla('ext',  area.extintores || [], editable, 'EXT', 'TAG Extintor');
  renderSubTabla('lav',  area.duchas     || [], editable, 'DL',  'TAG Ducha/Lavaojos');
  renderSubTabla('hs',   area.alarmas    || [], editable, 'HS',  'TAG Alarma');

  // Botones agregar fila
  ['ext','lav','hs'].forEach(tipo => {
    document.getElementById(`btn-add-${tipo}`).style.display = editable ? '' : 'none';
  });

  showView('emerg_detalle');
}

function renderSubTabla(tipo, filas, editable, prefix, tagLabel) {
  const tbody = document.getElementById(`tbody-${tipo}`);
  tbody.innerHTML = '';
  filas.forEach((fila, i) => {
    const tr = document.createElement('tr');
    tr.dataset.index = i;
    tr.innerHTML = `
      <td class="etd-num">${i+1}</td>
      <td><input value="${escapeHtml(fila.tag || '')}" data-col="tag"
          ${editable?'':'disabled'} placeholder="${prefix}-00${i+1}" /></td>
      <td><input value="${escapeHtml(fila.ubicacion || '')}" data-col="ubicacion"
          ${editable?'':'disabled'} placeholder="Ubicación..." /></td>
      <td><input value="${escapeHtml(fila.zona || '')}" data-col="zona"
          ${editable?'':'disabled'} placeholder="Zona..." /></td>
      <td class="etd-del">
        <button class="row-del-btn" style="${editable?'':'display:none'}"
          onclick="eliminarFilaEmerg('${tipo}',${i})">✕</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

/* ── Agregar fila en sub-tabla ── */
function agregarFilaEmerg(tipo) {
  const area = EmergState.areaActual;
  if (!area) return;
  const key = tipo === 'ext' ? 'extintores' : tipo === 'lav' ? 'duchas' : 'alarmas';
  area[key] = area[key] || [];
  area[key].push({ tag: '', ubicacion: '', zona: '' });
  renderSubTabla(tipo, area[key], true,
    tipo === 'ext' ? 'EXT' : tipo === 'lav' ? 'DL' : 'HS',
    tipo === 'ext' ? 'TAG Extintor' : tipo === 'lav' ? 'TAG Ducha/Lavaojos' : 'TAG Alarma');
  // Foco en último input TAG
  const tbody = document.getElementById(`tbody-${tipo}`);
  tbody.lastElementChild?.querySelector('input')?.focus();
}

function eliminarFilaEmerg(tipo, index) {
  const area = EmergState.areaActual;
  if (!area) return;
  const key = tipo === 'ext' ? 'extintores' : tipo === 'lav' ? 'duchas' : 'alarmas';
  area[key]?.splice(index, 1);
  renderSubTabla(tipo, area[key] || [], true,
    tipo === 'ext' ? 'EXT' : tipo === 'lav' ? 'DL' : 'HS',
    tipo === 'ext' ? 'TAG Extintor' : tipo === 'lav' ? 'TAG Ducha/Lavaojos' : 'TAG Alarma');
}

/* ── Leer filas del DOM ── */
function leerFilasEmerg(tipo) {
  const filas = [];
  document.querySelectorAll(`#tbody-${tipo} tr`).forEach(tr => {
    filas.push({
      tag:       tr.querySelector('[data-col="tag"]')?.value.trim()       || '',
      ubicacion: tr.querySelector('[data-col="ubicacion"]')?.value.trim() || '',
      zona:      tr.querySelector('[data-col="zona"]')?.value.trim()      || '',
    });
  });
  return filas;
}

/* ================================================================
   GUARDAR ÁREA
   ================================================================ */
async function guardarArea() {
  const area = EmergState.areaActual;
  if (!area) return;

  area.extintores = leerFilasEmerg('ext');
  area.duchas     = leerFilasEmerg('lav');
  area.alarmas    = leerFilasEmerg('hs');

  try {
    const id = await Storage.Emergencias.save(area);
    if (!area.id) area.id = id;
    EmergState.modo = 'saved';
    renderAreaDetalle();
    toast('✓ Área guardada correctamente');
  } catch(e) { toast('Error al guardar', 'error'); }
}

function editarArea() {
  EmergState.modo = 'edit';
  renderAreaDetalle();
}

/* ================================================================
   CREAR NUEVA ÁREA
   ================================================================ */
function nuevaArea() {
  openModal('Nueva Área de Emergencia', 'Nombre del Área',
    'Ej: Biodiesel, USLD, Bullets...', (nombre) => {
      EmergState.areaActual = {
        nombre,
        extintores: [],
        duchas:     [],
        alarmas:    [],
      };
      EmergState.modo = 'edit';
      renderAreaDetalle();
    });
}

/* ================================================================
   ELIMINAR ÁREA
   ================================================================ */
async function eliminarArea(id) {
  if (!confirm('¿Eliminar esta área? Esta acción no se puede deshacer.')) return;
  try {
    await Storage.Emergencias.remove(id);
    toast('Área eliminada');
    renderEmergLista();
  } catch(e) { toast('Error al eliminar', 'error'); }
}

/* ================================================================
   EXPORTAR PDF ÁREA
   ================================================================ */
async function exportarPdfArea(id) {
  let area = EmergState.areaActual;
  if (id) {
    try { area = await Storage.Emergencias.getById(id); } catch(e) {}
  }
  if (!area) return;

  const fechaHoy = new Date().toLocaleDateString('es-AR');
  const nombreArchivo = `Emergencias_${area.nombre}_${fechaHoy.replace(/\//g,'-')}.pdf`;

  const tablaHtml = (filas, titulo) => {
    const rows = filas.map((f,i) => `
      <tr>
        <td style="text-align:center;width:28px">${i+1}</td>
        <td>${escapeHtml(f.tag)}</td>
        <td>${escapeHtml(f.ubicacion)}</td>
        <td>${escapeHtml(f.zona)}</td>
      </tr>`).join('');
    return `
      <h3 style="margin:14px 0 6px;font-size:12px;color:#2d4a6e">${titulo}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px">
        <thead>
          <tr>
            <th style="background:#2d4a6e;color:#fff;padding:6px;border:1px solid #ccc">#</th>
            <th style="background:#2d4a6e;color:#fff;padding:6px;border:1px solid #ccc">TAG</th>
            <th style="background:#2d4a6e;color:#fff;padding:6px;border:1px solid #ccc">Ubicación</th>
            <th style="background:#2d4a6e;color:#fff;padding:6px;border:1px solid #ccc">Zona</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  };

  const html = `
    <div style="font-family:Arial,sans-serif;padding:20px;color:#000">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #2d4a6e;padding-bottom:10px;margin-bottom:14px">
        <div style="font-size:20px;font-weight:900;color:#2d4a6e">SGAS</div>
        <div style="font-size:13px;font-weight:700">PUNTOS DE EMERGENCIA</div>
        <div style="font-size:11px;color:#555">${fechaHoy}</div>
      </div>
      <div style="font-size:15px;font-weight:700;margin-bottom:14px">Área: ${escapeHtml(area.nombre)}</div>
      ${tablaHtml(area.extintores || [], '🧯 Extintores')}
      ${tablaHtml(area.duchas     || [], '🚿 Duchas y Lavaojos')}
      ${tablaHtml(area.alarmas    || [], '🔔 HS / Puntos de Alarma')}
      <div style="margin-top:16px;border-top:1px solid #ccc;padding-top:8px;display:flex;justify-content:space-between;font-size:10px;color:#555">
        <span>Área: ${escapeHtml(area.nombre)}</span>
        <span>Fecha: ${fechaHoy}</span>
        <span style="font-weight:700;color:#2d6a4f">ESTADO: VIGENTE</span>
      </div>
    </div>`;

  if (typeof html2pdf !== 'undefined') {
    html2pdf().set({
      margin: 10,
      filename: nombreArchivo,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(html).save();
  } else {
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${nombreArchivo}</title></head><body>${html}</body></html>`);
    win.document.close();
    win.print();
  }
}

/* ── Registrar en el router ── */
Views.emergencias = () => renderEmergLista();

window.renderEmergLista   = renderEmergLista;
window.abrirAreaDetalle   = abrirAreaDetalle;
window.abrirAreaEdit      = abrirAreaEdit;
window.nuevaArea          = nuevaArea;
window.guardarArea        = guardarArea;
window.editarArea         = editarArea;
window.eliminarArea       = eliminarArea;
window.exportarPdfArea    = exportarPdfArea;
window.agregarFilaEmerg   = agregarFilaEmerg;
window.eliminarFilaEmerg  = eliminarFilaEmerg;
