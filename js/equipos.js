/* ================================================================
   SGAS — equipos.js
   Sección Equipos / TAG:
   - Carga Excel con Web Worker (no bloquea la UI)
   - Búsqueda general + filtro por columna
   - Paginación 200 filas por página
   - Datos en memoria (sesión) + IndexedDB como caché
   ================================================================ */

const EquiposState = {
  datos:       [],
  columnas:    [],
  filtrados:   [],
  pagina:      1,
  porPagina:   200,
  busqueda:    '',
  filtrosCols: {},
};

/* ================================================================
   RENDER VISTA
   ================================================================ */
async function renderEquipos() {
  setBreadcrumb([
    { label: 'Inicio', hash: 'inicio' },
    { label: 'Equipos / TAG' },
  ]);

  // Si ya hay datos en memoria, mostrar directo
  if (EquiposState.datos.length > 0) {
    mostrarTablaEquipos();
    showView('equipos');
    return;
  }

  // Intentar cargar desde IndexedDB
  try {
    const saved = await idbGetEquipos();
    if (saved && saved.datos && saved.datos.length > 0) {
      EquiposState.columnas  = saved.columnas;
      EquiposState.datos     = saved.datos;
      EquiposState.filtrados = saved.datos;
      mostrarTablaEquipos();
      showView('equipos');
      return;
    }
  } catch(e) {}

  mostrarTablaEquipos();
  showView('equipos');
}

/* ================================================================
   INDEXEDDB
   ================================================================ */
function abrirDBEquipos() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('SGAS_EQUIPOS', 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('equipos', { keyPath: 'id' });
    };
    req.onsuccess  = (e) => resolve(e.target.result);
    req.onerror    = ()  => reject(req.error);
  });
}

async function idbGetEquipos() {
  const db = await abrirDBEquipos();
  return new Promise((resolve, reject) => {
    const r = db.transaction('equipos','readonly').objectStore('equipos').get('main');
    r.onsuccess = () => resolve(r.result);
    r.onerror   = () => reject(r.error);
  });
}

async function idbSaveEquipos(data) {
  const db = await abrirDBEquipos();
  return new Promise((resolve, reject) => {
    const r = db.transaction('equipos','readwrite').objectStore('equipos').put({ id:'main', ...data });
    r.onsuccess = () => resolve();
    r.onerror   = () => reject(r.error);
  });
}

/* ================================================================
   CARGAR EXCEL (con Web Worker)
   ================================================================ */
function cargarExcelEquipos() {
  const input = document.createElement('input');
  input.type   = 'file';
  input.accept = '.xlsx,.xls,.csv';
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    mostrarProgreso('Leyendo archivo...');

    try {
      const buffer = await file.arrayBuffer();

      // Usar Web Worker para no bloquear UI
      const workerUrl = 'js/equipos-worker.js';
      const worker    = new Worker(workerUrl);

      worker.onmessage = async (ev) => {
        const msg = ev.data;

        if (msg.tipo === 'progreso') {
          mostrarProgreso(msg.msg);
          return;
        }

        if (msg.tipo === 'error') {
          ocultarProgreso();
          toast(msg.msg || 'Error al procesar el archivo', 'error');
          worker.terminate();
          return;
        }

        if (msg.tipo === 'ok') {
          worker.terminate();

          EquiposState.columnas    = msg.columnas;
          EquiposState.datos       = msg.datos;
          EquiposState.filtrados   = msg.datos;
          EquiposState.pagina      = 1;
          EquiposState.busqueda    = '';
          EquiposState.filtrosCols = {};

          // Limpiar filtros en UI
          const search = document.getElementById('equipos-search');
          if (search) search.value = '';

          mostrarProgreso('Guardando en caché...');
          try {
            await idbSaveEquipos({
              columnas: EquiposState.columnas,
              datos:    EquiposState.datos,
            });
          } catch(e) {
            console.warn('No se pudo guardar en IndexedDB (datos muy grandes), se usará solo en memoria');
          }

          ocultarProgreso();
          mostrarTablaEquipos();
          toast(`✓ ${msg.total.toLocaleString()} equipos cargados`);
        }
      };

      worker.onerror = (err) => {
        ocultarProgreso();
        // Fallback: procesar en hilo principal si el worker falla
        procesarExcelDirecto(buffer, file.name);
        worker.terminate();
      };

      worker.postMessage({ buffer }, [buffer]);

    } catch(err) {
      ocultarProgreso();
      toast('Error al leer el archivo', 'error');
    }
  });
  input.click();
}

/* ── Fallback: procesar sin worker ── */
async function procesarExcelDirecto(buffer, nombre) {
  try {
    mostrarProgreso('Procesando (modo directo)...');
    const wb   = XLSX.read(buffer, { type: 'array', cellDates: true });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (!json || json.length === 0) {
      toast('El archivo está vacío', 'error');
      ocultarProgreso();
      return;
    }

    EquiposState.columnas    = Object.keys(json[0]);
    EquiposState.datos       = json;
    EquiposState.filtrados   = json;
    EquiposState.pagina      = 1;
    EquiposState.busqueda    = '';
    EquiposState.filtrosCols = {};

    ocultarProgreso();
    mostrarTablaEquipos();
    toast(`✓ ${json.length.toLocaleString()} equipos cargados`);
  } catch(e) {
    ocultarProgreso();
    toast('Error al procesar el archivo', 'error');
  }
}

/* ── Indicador de progreso ── */
function mostrarProgreso(msg) {
  const wrap = document.getElementById('equipos-tabla-wrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div style="text-align:center;padding:60px;color:var(--text-dim)">
      <div style="font-size:32px;margin-bottom:16px;animation:spin 1s linear infinite;display:inline-block">⏳</div>
      <div style="font-size:14px;margin-top:8px">${msg}</div>
    </div>`;
}
function ocultarProgreso() {
  // Se limpia al llamar mostrarTablaEquipos
}

/* ================================================================
   FILTROS
   ================================================================ */
function buscarEquipos(q) {
  EquiposState.busqueda = q.toLowerCase();
  EquiposState.pagina   = 1;
  aplicarFiltros();
}

function filtrarColumna(col, val) {
  EquiposState.filtrosCols[col] = val;
  EquiposState.pagina = 1;
  aplicarFiltros();
}

function aplicarFiltros() {
  let result = EquiposState.datos;

  if (EquiposState.busqueda) {
    const q = EquiposState.busqueda;
    result = result.filter(row =>
      EquiposState.columnas.some(col =>
        String(row[col] ?? '').toLowerCase().includes(q)
      )
    );
  }

  Object.entries(EquiposState.filtrosCols).forEach(([col, val]) => {
    if (val) {
      const v = val.toLowerCase();
      result = result.filter(row =>
        String(row[col] ?? '').toLowerCase().includes(v)
      );
    }
  });

  EquiposState.filtrados = result;
  renderTablaEquipos();
}

function limpiarFiltros() {
  EquiposState.busqueda    = '';
  EquiposState.filtrosCols = {};
  EquiposState.pagina      = 1;
  const search = document.getElementById('equipos-search');
  if (search) search.value = '';
  aplicarFiltros();
}

/* ================================================================
   MOSTRAR TABLA
   ================================================================ */
function mostrarTablaEquipos() {
  const wrap = document.getElementById('equipos-tabla-wrap');
  if (!wrap) return;

  if (!EquiposState.datos || EquiposState.datos.length === 0) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:60px;color:var(--text-dim)">
        <div style="font-size:40px;margin-bottom:16px">📋</div>
        <div style="font-size:15px;margin-bottom:8px">No hay datos cargados</div>
        <div style="font-size:13px">Hacé clic en <strong>📂 Cargar Excel</strong> para importar tu archivo</div>
      </div>`;
    document.getElementById('equipos-info').textContent = '';
    document.getElementById('equipos-paginacion').innerHTML = '';
    return;
  }

  aplicarFiltros();
}

function renderTablaEquipos() {
  const wrap = document.getElementById('equipos-tabla-wrap');
  if (!wrap) return;

  const { filtrados, columnas, pagina, porPagina } = EquiposState;
  const total   = filtrados.length;
  const inicio  = (pagina - 1) * porPagina;
  const fin     = Math.min(inicio + porPagina, total);
  const paginas = Math.ceil(total / porPagina);
  const filas   = filtrados.slice(inicio, fin);

  // Info
  const infoEl = document.getElementById('equipos-info');
  if (infoEl) infoEl.textContent =
    `${total.toLocaleString()} equipos encontrados — mostrando ${inicio+1}–${fin}`;

  // Tabla
  const thead = columnas.map(col => `
    <th>
      <div class="equip-th-wrap">
        <span title="${escapeHtml(col)}">${escapeHtml(col)}</span>
        <input class="equip-col-filter" type="text"
          placeholder="Filtrar..."
          value="${escapeHtml(EquiposState.filtrosCols[col] || '')}"
          oninput="filtrarColumna('${escapeHtml(col).replace(/'/g,"\\'")}', this.value)"
          onclick="event.stopPropagation()" />
      </div>
    </th>`).join('');

  const tbody = filas.map(row =>
    '<tr>' + columnas.map(col =>
      `<td title="${escapeHtml(String(row[col]??''))}">${escapeHtml(String(row[col]??''))}</td>`
    ).join('') + '</tr>'
  ).join('');

  wrap.innerHTML = `<div style="overflow-x:auto">
    <table class="equip-table">
      <thead><tr>${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>
  </div>`;

  renderPaginacion(paginas, pagina);
}

/* ================================================================
   PAGINACIÓN
   ================================================================ */
function renderPaginacion(totalPaginas, actual) {
  const cont = document.getElementById('equipos-paginacion');
  if (!cont) return;
  if (totalPaginas <= 1) { cont.innerHTML = ''; return; }

  const delta = 2;
  const pages = new Set([1, totalPaginas]);
  for (let i = Math.max(2, actual-delta); i <= Math.min(totalPaginas-1, actual+delta); i++) pages.add(i);
  const sorted = [...pages].sort((a,b) => a-b);

  let html = `<button class="eq-pg-btn" ${actual===1?'disabled':''} onclick="irPagina(${actual-1})">‹ Ant</button>`;
  let prev = 0;
  sorted.forEach(p => {
    if (p - prev > 1) html += `<span class="eq-pg-dots">…</span>`;
    html += `<button class="eq-pg-btn ${p===actual?'active':''}" onclick="irPagina(${p})">${p}</button>`;
    prev = p;
  });
  html += `<button class="eq-pg-btn" ${actual===totalPaginas?'disabled':''} onclick="irPagina(${actual+1})">Sig ›</button>`;

  cont.innerHTML = html;
}

function irPagina(p) {
  const max = Math.ceil(EquiposState.filtrados.length / EquiposState.porPagina);
  if (p < 1 || p > max) return;
  EquiposState.pagina = p;
  renderTablaEquipos();
  document.getElementById('equipos-tabla-wrap')?.scrollIntoView({ behavior:'smooth', block:'start' });
}

/* ── Animación spinner ── */
const spinStyle = document.createElement('style');
spinStyle.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(spinStyle);

/* ── Registrar vista ── */
Views.equipos = () => renderEquipos();

/* ── Exponer globalmente ── */
window.renderEquipos      = renderEquipos;
window.cargarExcelEquipos = cargarExcelEquipos;
window.buscarEquipos      = buscarEquipos;
window.filtrarColumna     = filtrarColumna;
window.limpiarFiltros     = limpiarFiltros;
window.irPagina           = irPagina;
