/* ================================================================
   SGAS — equipos.js
   Sección Equipos / TAG:
   - Carga archivo Excel (.xlsx) con SheetJS
   - Tabla con todas las columnas
   - Búsqueda general + filtro por columna
   - Paginación (100 filas por página)
   - Datos guardados en IndexedDB local
   ================================================================ */

const EquiposState = {
  datos:        [],      // todos los registros
  columnas:     [],      // nombres de columnas
  filtrados:    [],      // registros después de filtros
  pagina:       1,
  porPagina:    100,
  busqueda:     '',
  filtrosCols:  {},      // { col: valor }
};

/* ================================================================
   RENDER VISTA PRINCIPAL
   ================================================================ */
async function renderEquipos() {
  setBreadcrumb([
    { label: 'Inicio', hash: 'inicio' },
    { label: 'Equipos / TAG' },
  ]);

  // Intentar cargar datos guardados
  await cargarDatosGuardados();
  mostrarTablaEquipos();
  showView('equipos');
}

/* ================================================================
   CARGAR DESDE INDEXEDDB
   ================================================================ */
async function cargarDatosGuardados() {
  try {
    const saved = await idbGetEquipos();
    if (saved && saved.columnas && saved.datos) {
      EquiposState.columnas = saved.columnas;
      EquiposState.datos    = saved.datos;
      EquiposState.filtrados = saved.datos;
    }
  } catch(e) {
    console.log('Sin datos de equipos guardados');
  }
}

/* ── IndexedDB helpers para equipos (datos grandes) ── */
function idbGetEquipos() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('SGAS_EQUIPOS', 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('equipos', { keyPath: 'id' });
    };
    req.onsuccess = (e) => {
      const db  = e.target.result;
      const tx  = db.transaction('equipos', 'readonly');
      const r   = tx.objectStore('equipos').get('main');
      r.onsuccess = () => resolve(r.result);
      r.onerror   = () => reject(r.error);
    };
    req.onerror = () => reject(req.error);
  });
}

function idbSaveEquipos(data) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('SGAS_EQUIPOS', 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('equipos', { keyPath: 'id' });
    };
    req.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction('equipos', 'readwrite');
      const r  = tx.objectStore('equipos').put({ id: 'main', ...data });
      r.onsuccess = () => resolve();
      r.onerror   = () => reject(r.error);
    };
    req.onerror = () => reject(req.error);
  });
}

/* ================================================================
   CARGAR EXCEL
   ================================================================ */
function cargarExcelEquipos() {
  const input = document.createElement('input');
  input.type   = 'file';
  input.accept = '.xlsx,.xls,.csv';
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const btn = document.getElementById('btn-cargar-excel');
    if (btn) { btn.textContent = '⏳ Cargando...'; btn.disabled = true; }

    try {
      const buffer = await file.arrayBuffer();
      const wb     = XLSX.read(buffer, { type: 'array' });
      const ws     = wb.Sheets[wb.SheetNames[0]]; // primera hoja
      const json   = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!json || json.length === 0) {
        toast('El archivo está vacío o no tiene datos', 'error');
        return;
      }

      EquiposState.columnas  = Object.keys(json[0]);
      EquiposState.datos     = json;
      EquiposState.filtrados = json;
      EquiposState.pagina    = 1;
      EquiposState.busqueda  = '';
      EquiposState.filtrosCols = {};

      // Guardar en IndexedDB
      await idbSaveEquipos({
        columnas: EquiposState.columnas,
        datos:    EquiposState.datos,
      });

      mostrarTablaEquipos();
      toast(`✓ ${json.length.toLocaleString()} equipos cargados`);

    } catch(err) {
      toast('Error al leer el archivo', 'error');
      console.error(err);
    } finally {
      if (btn) { btn.textContent = '📂 Cargar Excel'; btn.disabled = false; }
    }
  });
  input.click();
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
        <div style="font-size:13px">Hacé clic en <strong>Cargar Excel</strong> para importar tu archivo</div>
      </div>`;
    document.getElementById('equipos-info').textContent = '';
    document.getElementById('equipos-paginacion').innerHTML = '';
    return;
  }

  aplicarFiltros();
}

/* ================================================================
   FILTROS
   ================================================================ */
function buscarEquipos(q) {
  EquiposState.busqueda = q.toLowerCase();
  EquiposState.pagina   = 1;
  aplicarFiltros();
}

function aplicarFiltros() {
  let result = EquiposState.datos;

  // Búsqueda general
  if (EquiposState.busqueda) {
    const q = EquiposState.busqueda;
    result = result.filter(row =>
      EquiposState.columnas.some(col =>
        String(row[col] || '').toLowerCase().includes(q)
      )
    );
  }

  // Filtros por columna
  Object.entries(EquiposState.filtrosCols).forEach(([col, val]) => {
    if (val) {
      result = result.filter(row =>
        String(row[col] || '').toLowerCase().includes(val.toLowerCase())
      );
    }
  });

  EquiposState.filtrados = result;
  renderTablaEquipos();
}

function filtrarColumna(col, val) {
  EquiposState.filtrosCols[col] = val;
  EquiposState.pagina = 1;
  aplicarFiltros();
}

/* ================================================================
   RENDER TABLA CON PAGINACIÓN
   ================================================================ */
function renderTablaEquipos() {
  const wrap = document.getElementById('equipos-tabla-wrap');
  if (!wrap) return;

  const { filtrados, columnas, pagina, porPagina } = EquiposState;
  const total  = filtrados.length;
  const inicio = (pagina - 1) * porPagina;
  const fin    = Math.min(inicio + porPagina, total);
  const paginas = Math.ceil(total / porPagina);
  const filasPagina = filtrados.slice(inicio, fin);

  // Info
  document.getElementById('equipos-info').textContent =
    `${total.toLocaleString()} equipos encontrados — mostrando ${inicio+1}–${fin}`;

  // Tabla
  let html = `<div style="overflow-x:auto"><table class="equip-table">
    <thead>
      <tr>
        ${columnas.map(col => `
          <th>
            <div class="equip-th-wrap">
              <span>${escapeHtml(col)}</span>
              <input class="equip-col-filter" type="text"
                placeholder="Filtrar..."
                value="${escapeHtml(EquiposState.filtrosCols[col] || '')}"
                oninput="filtrarColumna('${escapeHtml(col)}', this.value)"
                onclick="event.stopPropagation()" />
            </div>
          </th>`).join('')}
      </tr>
    </thead>
    <tbody>`;

  filasPagina.forEach(row => {
    html += '<tr>' + columnas.map(col =>
      `<td>${escapeHtml(String(row[col] ?? ''))}</td>`
    ).join('') + '</tr>';
  });

  html += '</tbody></table></div>';
  wrap.innerHTML = html;

  // Paginación
  renderPaginacion(paginas, pagina);
}

function renderPaginacion(totalPaginas, actual) {
  const cont = document.getElementById('equipos-paginacion');
  if (!cont || totalPaginas <= 1) { if(cont) cont.innerHTML = ''; return; }

  let html = '';
  const delta = 2;
  const pages = [];

  pages.push(1);
  for (let i = Math.max(2, actual - delta); i <= Math.min(totalPaginas - 1, actual + delta); i++) {
    pages.push(i);
  }
  if (totalPaginas > 1) pages.push(totalPaginas);

  // Dedup
  const uniq = [...new Set(pages)];

  html += `<button class="eq-pg-btn" ${actual===1?'disabled':''} onclick="irPagina(${actual-1})">‹</button>`;

  let prev = 0;
  uniq.forEach(p => {
    if (p - prev > 1) html += `<span class="eq-pg-dots">…</span>`;
    html += `<button class="eq-pg-btn ${p===actual?'active':''}" onclick="irPagina(${p})">${p}</button>`;
    prev = p;
  });

  html += `<button class="eq-pg-btn" ${actual===totalPaginas?'disabled':''} onclick="irPagina(${actual+1})">›</button>`;

  cont.innerHTML = html;
}

function irPagina(p) {
  const maxP = Math.ceil(EquiposState.filtrados.length / EquiposState.porPagina);
  if (p < 1 || p > maxP) return;
  EquiposState.pagina = p;
  renderTablaEquipos();
  // Scroll al top de la tabla
  document.getElementById('equipos-tabla-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Registrar vista ── */
Views.equipos = () => renderEquipos();

/* ── Exponer globalmente ── */
window.renderEquipos      = renderEquipos;
window.cargarExcelEquipos = cargarExcelEquipos;
window.buscarEquipos      = buscarEquipos;
window.filtrarColumna     = filtrarColumna;
window.irPagina           = irPagina;
