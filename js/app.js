/* ================================================================
   SGAS — app.js
   Navegación principal, routing por hash, estado global, UI shell.
   ================================================================ */

const App = {
  currentView:     'inicio',
  currentCategory: '',
  currentModule:   '',
};

const Views = {
  inicio:        () => { setBreadcrumb([{ label: 'Inicio' }]); showView('inicio'); },
  emergencias:   () => {},
  planos:        () => {},
  checklists:    () => {},
  equipos:       () => {},
  config:        () => {},
  atsLista:      () => {},
  genericoLista: () => {},
};

/* ── Rutas fijas ── */
const ROUTES = {
  'inicio':               () => Views.inicio(),
  'emergencias':          () => Views.emergencias(),
  'planos':               () => Views.planos(),
  'checklists':           () => Views.checklists(),
  'equipos':              () => Views.equipos(),
  'config':               () => Views.config(),
  'semanales':            () => Views.genericoLista('semanales',            'ATS Semanales'),
  'rescatista':           () => Views.genericoLista('rescatista',           'Rescatista'),
  'actividades-criticas': () => Views.genericoLista('actividades-criticas', 'Actividades Críticas'),
};

/* ── Rutas de checklists por categoría ── */
// Registradas dinámicamente en route() para manejar cualquier nombre de categoría

/* ── Router ── */
function route(hash) {
  hash = hash || location.hash.slice(1) || 'inicio';
  if (hash.startsWith('ats/ficha/')) {
    const id = parseInt(hash.slice(10));
    if (id) { abrirFichaSaved(id); return; }
  }
  if (hash.startsWith('ats/') && !hash.startsWith('ats/ficha')) {
    const cat = decodeURIComponent(hash.slice(4));
    Views.atsLista(cat, 'ats');
    return;
  }
  if (hash.startsWith('parada/')) {
    const cat = decodeURIComponent(hash.slice(7));
    Views.atsLista(cat, 'parada');
    return;
  }
  if (hash.startsWith('checklists/')) {
    const cat = decodeURIComponent(hash.slice(11));
    if (cat && typeof renderChecklistsLista === 'function') {
      renderChecklistsLista(cat);
      return;
    }
  }
  if (hash.startsWith('ats/ficha')) return;
  const fn = ROUTES[hash];
  if (fn) fn(); else Views.inicio();
}

function navigate(hash, pushState = true) {
  if (pushState) history.pushState({ hash }, '', '#' + hash);
  route(hash);
}

window.addEventListener('popstate', (e) => {
  route(e.state?.hash || location.hash.slice(1) || 'inicio');
});

/* ── Mostrar vista ── */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById('view-' + id);
  if (el) el.classList.add('active');
  App.currentView = id;
}

/* ── Breadcrumb ── */
function setBreadcrumb(parts) {
  const bc = document.getElementById('breadcrumb');
  bc.innerHTML = parts.map((p, i) => {
    if (i < parts.length - 1 && p.hash)
      return `<span class="bc-link" onclick="navigate('${p.hash}')">${p.label}</span>`;
    return `<span class="bc-current">${p.label}</span>`;
  }).join('<span class="bc-sep">›</span>');
}

/* ── Toggle submenú ── */
function toggleSub(id, triggerEl) {
  const sub = document.getElementById(id);
  if (!sub) return;
  sub.classList.toggle('open');
  if (triggerEl) triggerEl.classList.toggle('open');
}

/* ── Sidebar colapsar ── */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const btn     = document.getElementById('sidebarToggle');
  btn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    btn.textContent = sidebar.classList.contains('collapsed') ? '›' : '‹';
    btn.style.left  = sidebar.classList.contains('collapsed') ? '36px' : '222px';
  });
}

/* ── Toast ── */
function toast(msg, type = 'ok') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = type === 'error' ? 'toast-error' : '';
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ── Modal genérico ── */
function openModal(title, label, placeholder, onConfirm) {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-label').textContent = label;
  const input = document.getElementById('modal-input');
  input.placeholder = placeholder;
  input.value = '';
  input.style.borderColor = '';
  overlay.classList.add('show');
  setTimeout(() => input.focus(), 120);
  overlay._onConfirm = onConfirm;
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
}

function confirmModal() {
  const input = document.getElementById('modal-input');
  const val   = input.value.trim();
  if (!val) { input.style.borderColor = 'var(--btn-del)'; return; }
  const cb = document.getElementById('modal-overlay')._onConfirm;
  closeModal();
  if (cb) cb(val);
}

/* ================================================================
   CATEGORÍAS DINÁMICAS EN SIDEBAR
   ================================================================ */
async function cargarCategoriasSidebar() {
  const container = document.getElementById('sub-ats-categorias');
  if (!container) return;
  container.innerHTML = '<div style="padding:6px 16px 6px 40px;font-size:11px;color:var(--text-dim)">Cargando...</div>';

  try {
    const cats = await Storage.Categorias.getAll();
    container.innerHTML = '';

    if (cats.length === 0) {
      container.innerHTML = '<div style="padding:6px 16px 6px 40px;font-size:11px;color:var(--text-dim)">Sin categorías aún</div>';
      return;
    }

    cats.forEach(cat => {
      const div = document.createElement('a');
      div.className = 'sub-item';
      div.href = `#ats/${encodeURIComponent(cat.nombre)}`;
      div.dataset.cat = cat.nombre;

      const spanNombre = document.createElement('span');
      spanNombre.style.flex = '1';
      spanNombre.textContent = cat.nombre;
      spanNombre.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(`ats/${encodeURIComponent(cat.nombre)}`);
      });

      const spanDel = document.createElement('span');
      spanDel.style.cssText = 'font-size:11px;opacity:.5;cursor:pointer;padding:0 6px';
      spanDel.title = 'Eliminar categoría';
      spanDel.textContent = '✕';
      spanDel.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        eliminarCategoria(cat.id, cat.nombre);
      });

      div.appendChild(spanNombre);
      div.appendChild(spanDel);
      container.appendChild(div);
    });
  } catch(e) {
    container.innerHTML = '<div style="padding:6px 16px 6px 40px;font-size:11px;color:#f87171">Error al cargar</div>';
  }
}

async function nuevaCategoria() {
  openModal(
    'Nueva Categoría ATS',
    'Nombre de la categoría',
    'Ej: Pintura, Andamios, Civil...',
    async (nombre) => {
      try {
        await Storage.Categorias.save({ nombre });
        await cargarCategoriasSidebar();
        toast('✓ Categoría creada');
        navigate(`ats/${encodeURIComponent(nombre)}`);
      } catch(e) {
        const { texto } = Storage.mensajeError(e);
        toast(`Error al crear categoría: ${texto}`, 'error');
      }
    }
  );
}

async function eliminarCategoria(id, nombre) {
  if (!confirm(`¿Eliminar la categoría "${nombre}"?\nSe eliminarán también todas sus fichas ATS.`)) return;
  try {
    // En modo local hacer cascade manual (en modo red el servidor lo hace en transacción)
    if (Storage.getModo() === 'local') {
      const fichas = await Storage.ATS.getByCategoria(nombre, 'ats');
      await Promise.all(fichas.map(f => Storage.ATS.remove(f.id)));
    }
    await Storage.Categorias.remove(id);
    await cargarCategoriasSidebar();
    toast('Categoría eliminada');
    navigate('inicio');
  } catch(e) {
    const { texto } = Storage.mensajeError(e);
    toast(`Error al eliminar: ${texto}`, 'error');
  }
}

/* ── Reconectar al servidor ── */
async function intentarReconectar() {
  const btn = document.querySelector('.conn-retry');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Conectando...'; }
  const ok = await Storage.reconectar();
  if (ok) {
    // Verificar si hay datos en modo local que podrían no estar en el servidor
    try {
      const localAts = await Storage.ATS.getAll('ats');
      const localAtsParada = await Storage.ATS.getAll('parada');
      const totalLocal = localAts.length + localAtsParada.length;
      if (totalLocal > 0) {
        toast(`✓ Conectado. Nota: tenés ${totalLocal} fichas en modo local que no están en el servidor.`);
      } else {
        toast('✓ Conectado al servidor. Recargando datos...');
      }
    } catch(e) {
      toast('✓ Conectado al servidor. Recargando datos...');
    }
    await cargarCategoriasSidebar();
    await cargarCategoriasParada();
    await cargarCategoriasChecklistSidebar();
    route(location.hash.slice(1) || 'inicio');
  } else {
    toast('No se pudo conectar. Intentá en 30 segundos.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Reintentar'; }
  }
}
window.intentarReconectar       = intentarReconectar;
window.quitarAccesoRapido       = quitarAccesoRapido;
window.abrirPersonalizarDashboard = abrirPersonalizarDashboard;
window.guardarPersonalizacion   = guardarPersonalizacion;
window.eliminarDelHistorial     = eliminarDelHistorial;

/* ── Init ── */
async function init() {
  try { await Storage.init(); } catch(e) { console.error('Storage:', e); }

  initSidebar();
  actualizarSidebar(); // ocultar del sidebar los que están en accesos rápidos

  // Event listeners del modal
  document.getElementById('modal-input').addEventListener('keydown', e => {
    if (e.key === 'Enter')  confirmModal();
    if (e.key === 'Escape') closeModal();
  });
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Cargar categorías dinámicas en sidebar
  await cargarCategoriasSidebar();
  await cargarCategoriasParada();
  await cargarCategoriasChecklistSidebar();

  // Los submenús ATS arrancan cerrados — el usuario los abre con clic

  if (typeof loadConfig === 'function') loadConfig().catch(() => {});

  route(location.hash.slice(1) || 'inicio');
}

document.addEventListener('DOMContentLoaded', init);

window.nuevaCategoria          = nuevaCategoria;
window.eliminarCategoria       = eliminarCategoria;
window.cargarCategoriasSidebar = cargarCategoriasSidebar;

/* ── Filtro búsqueda ATS (movido desde index.html) ── */
function filtrarTablaAts(q) {
  q = q.toLowerCase();
  document.querySelectorAll('#ats-lista-tbody tr').forEach(tr => {
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}
window.filtrarTablaAts = filtrarTablaAts;

/* ================================================================
   DASHBOARD — Accesos rápidos + Historial + Stats
   ================================================================ */

// Definición de todos los accesos rápidos posibles
const ACCESOS_RAPIDOS = [
  { id: 'emergencias',        label: 'Puntos de Emergencia', icon: '🚨', hash: 'emergencias',        sidebarId: 'sidebar-emergencias' },
  { id: 'rescatista',         label: 'Rescatista',           icon: '🦺', hash: 'rescatista',          sidebarId: 'sidebar-rescatista'  },
  { id: 'actividades',        label: 'Actividades Críticas', icon: '⚠️', hash: 'actividades-criticas', sidebarId: 'sidebar-actividades' },
  { id: 'planos',             label: 'Planos y Documentos',  icon: '📁', hash: 'planos',              sidebarId: 'sidebar-planos'      },
  { id: 'checklists',         label: 'Checklists',           icon: '✅', hash: 'checklists',          sidebarId: 'sidebar-checklists'  },
  { id: 'equipos',            label: 'Equipos / TAG',        icon: '🔧', hash: 'equipos',             sidebarId: 'sidebar-equipos'     },
];

const DASH_STORAGE_KEY = 'sgas_dash_accesos'; // qué accesos están activos en el dashboard
const HIST_STORAGE_KEY = 'sgas_historial';    // últimas 5 fichas abiertas

// Retorna los IDs de accesos activos en el dashboard (por defecto todos activos)
function getAccesosActivos() {
  try {
    const saved = localStorage.getItem(DASH_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch(_) {}
  return ACCESOS_RAPIDOS.map(a => a.id); // por defecto todos activos
}

function setAccesosActivos(ids) {
  localStorage.setItem(DASH_STORAGE_KEY, JSON.stringify(ids));
}

// Historial de fichas abiertas
function getHistorial() {
  try { return JSON.parse(localStorage.getItem(HIST_STORAGE_KEY) || '[]'); } catch(_) { return []; }
}

function setHistorial(hist) {
  localStorage.setItem(HIST_STORAGE_KEY, JSON.stringify(hist.slice(0, 5)));
}

function agregarAlHistorial(ficha) {
  let hist = getHistorial();
  hist = hist.filter(h => h.id !== ficha.id); // evitar duplicados
  hist.unshift({ id: ficha.id, titulo: (ficha.codigo ? ficha.codigo + ' — ' : '') + ficha.nombre, hash: `ats/ficha/${ficha.id}` });
  setHistorial(hist);
}

function actualizarSidebar() {
  const activos = getAccesosActivos();
  ACCESOS_RAPIDOS.forEach(a => {
    const el = document.getElementById(a.sidebarId);
    if (!el) return;
    // Si está en accesos rápidos → ocultar del sidebar; si no → mostrar en sidebar
    el.style.display = activos.includes(a.id) ? 'none' : '';
    // Para checklists también ocultar el submenú
    if (a.id === 'checklists') {
      const sub = document.getElementById('subChecklists');
      if (sub) sub.style.display = activos.includes(a.id) ? 'none' : '';
    }
  });
}

function renderAccesosRapidos() {
  const container = document.getElementById('dash-accesos');
  if (!container) return;
  container.innerHTML = '';
  const activos = getAccesosActivos();
  const accesosVisibles = ACCESOS_RAPIDOS.filter(a => activos.includes(a.id));

  if (accesosVisibles.length === 0) {
    container.innerHTML = `<div style="color:var(--text-dim);font-size:13px;padding:8px 0">
      No hay accesos rápidos. Hacé clic en ⚙️ Personalizar para agregarlos.
    </div>`;
    return;
  }

  accesosVisibles.forEach(a => {
    const card = document.createElement('div');
    card.className = 'quick-card';
    card.style.cssText = 'position:relative;text-align:center;padding:16px 12px;cursor:pointer';
    card.innerHTML = `
      <div style="font-size:26px;margin-bottom:8px">${a.icon}</div>
      <div style="font-size:12px;color:var(--text-dim);font-weight:600">${a.label}</div>
      <button onclick="event.stopPropagation();quitarAccesoRapido('${a.id}')"
        style="position:absolute;top:6px;right:6px;background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:13px;opacity:.5;line-height:1"
        title="Quitar del dashboard">✕</button>`;
    card.addEventListener('click', () => navigate(a.hash));
    container.appendChild(card);
  });
}

function quitarAccesoRapido(id) {
  const activos = getAccesosActivos().filter(a => a !== id);
  setAccesosActivos(activos);
  renderAccesosRapidos();
  actualizarSidebar();
}

function abrirPersonalizarDashboard() {
  const activos = getAccesosActivos();
  const items = ACCESOS_RAPIDOS.map(a => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:20px">${a.icon}</span>
      <span style="flex:1;font-size:13px">${a.label}</span>
      <label style="cursor:pointer;display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-dim)">
        <input type="checkbox" id="dash-check-${a.id}" ${activos.includes(a.id) ? 'checked' : ''}
          style="width:16px;height:16px;accent-color:var(--accent)" />
        En dashboard
      </label>
    </div>`).join('');

  // Usar el modal existente adaptado — creamos un modal propio
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.id = 'modal-personalizar';
  overlay.innerHTML = `
    <div class="modal-box" style="width:460px">
      <h3>⚙️ Personalizar Dashboard</h3>
      <p style="font-size:12px;color:var(--text-dim);margin-bottom:16px">
        Seleccioná qué accesos mostrar en el dashboard. Los que no estén acá aparecen en el sidebar.
      </p>
      <div style="max-height:320px;overflow-y:auto">${items}</div>
      <div class="modal-actions" style="margin-top:20px">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-personalizar').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarPersonalizacion()">✓ Guardar</button>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function guardarPersonalizacion() {
  const activos = ACCESOS_RAPIDOS.filter(a => {
    const cb = document.getElementById(`dash-check-${a.id}`);
    return cb && cb.checked;
  }).map(a => a.id);
  setAccesosActivos(activos);
  document.getElementById('modal-personalizar')?.remove();
  renderAccesosRapidos();
  actualizarSidebar();
  toast('✓ Dashboard personalizado');
}

function renderHistorial() {
  const container = document.getElementById('dash-historial');
  if (!container) return;
  const hist = getHistorial();
  if (hist.length === 0) {
    container.innerHTML = `<div style="font-size:13px;color:var(--text-dim);padding:8px 0">
      Aún no abriste ninguna ficha.
    </div>`;
    return;
  }
  container.innerHTML = '';
  hist.forEach((item, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)';
    row.innerHTML = `
      <span style="font-size:12px;color:var(--text-dim);min-width:16px">${i+1}</span>
      <a href="#${item.hash}" onclick="event.preventDefault();abrirFichaSaved(${item.id})"
         style="flex:1;font-size:13px;color:var(--text);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
         onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--text)'">
        ${escapeHtml(item.titulo)}
      </a>
      <button onclick="eliminarDelHistorial(${item.id})"
        style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:13px;opacity:.5;padding:2px 6px"
        title="Eliminar del historial">✕</button>`;
    container.appendChild(row);
  });
}

function eliminarDelHistorial(id) {
  const hist = getHistorial().filter(h => h.id !== id);
  setHistorial(hist);
  renderHistorial();
}

/* ── Dashboard: Views.inicio con stats (movido desde index.html) ── */
Views.inicio = async () => {
  setBreadcrumb([{ label: 'Inicio' }]);
  showView('inicio');

  // Renderizar accesos rápidos e historial
  renderAccesosRapidos();
  actualizarSidebar();
  renderHistorial();

  // Cargar stats
  try {
    const [ats, parada, semanales] = await Promise.all([
      Storage.ATS.getAll('ats'),
      Storage.ATS.getAll('parada'),
      Storage.ATS.getByCategoria('ATS Semanales', 'ats'),
    ]);
    document.getElementById('stat-ats').textContent      = ats.length;
    document.getElementById('stat-parada').textContent   = parada.length;
    document.getElementById('stat-semanales').textContent = semanales.length;
  } catch(e) {}
};

/* ================================================================
   CATEGORÍAS CHECKLISTS EN SIDEBAR
   ================================================================ */
async function cargarCategoriasChecklistSidebar() {
  const container = document.getElementById('sub-checklists-categorias');
  if (!container) return;
  container.innerHTML = '<div style="padding:6px 16px 6px 40px;font-size:11px;color:var(--text-dim)">Cargando...</div>';

  try {
    const cats = await Storage.Categorias.getAll('checklist');
    container.innerHTML = '';

    // Siempre mostrar "General" como primer ítem fijo
    // Filtrar "General" de la lista dinámica para evitar duplicados
    const divGeneral = document.createElement('a');
    divGeneral.className = 'sub-item';
    divGeneral.href = '#checklists/General';
    divGeneral.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('checklists/General');
    });
    const spanGeneral = document.createElement('span');
    spanGeneral.style.flex = '1';
    spanGeneral.textContent = 'General';
    divGeneral.appendChild(spanGeneral);
    container.appendChild(divGeneral);

    cats.filter(c => c.nombre.toLowerCase() !== 'general').forEach(cat => {
      const div = document.createElement('a');
      div.className = 'sub-item';
      div.href = `#checklists/${encodeURIComponent(cat.nombre)}`;
      div.dataset.cat = cat.nombre;

      const spanNombre = document.createElement('span');
      spanNombre.style.flex = '1';
      spanNombre.textContent = cat.nombre;
      spanNombre.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(`checklists/${encodeURIComponent(cat.nombre)}`);
      });

      const spanDel = document.createElement('span');
      spanDel.style.cssText = 'font-size:11px;opacity:.5;cursor:pointer;padding:0 6px';
      spanDel.title = 'Eliminar categoría';
      spanDel.textContent = '✕';
      spanDel.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (typeof eliminarCategoriaChecklist === 'function')
          eliminarCategoriaChecklist(cat.id, cat.nombre);
      });

      div.appendChild(spanNombre);
      div.appendChild(spanDel);
      container.appendChild(div);
    });
  } catch(e) {
    container.innerHTML = '<div style="padding:6px 16px 6px 40px;font-size:11px;color:#f87171">Error al cargar</div>';
  }
}

async function nuevaCategoriaChecklistSidebar() {
  if (typeof nuevaCategoriaChecklist === 'function') nuevaCategoriaChecklist();
}

window.cargarCategoriasChecklistSidebar = cargarCategoriasChecklistSidebar;
window.nuevaCategoriaChecklistSidebar   = nuevaCategoriaChecklistSidebar;

/* ================================================================
   CATEGORÍAS PARADA DE PLANTA
   ================================================================ */
async function cargarCategoriasParada() {
  const container = document.getElementById('sub-parada-categorias');
  if (!container) return;
  container.innerHTML = '<div style="padding:6px 16px 6px 40px;font-size:11px;color:var(--text-dim)">Cargando...</div>';

  try {
    const cats = await Storage.Categorias.getAll('parada');
    container.innerHTML = '';

    if (cats.length === 0) {
      container.innerHTML = '<div style="padding:6px 16px 6px 40px;font-size:11px;color:var(--text-dim)">Sin categorías aún</div>';
      return;
    }

    cats.forEach(cat => {
      const div = document.createElement('a');
      div.className = 'sub-item';
      div.href = `#parada/${encodeURIComponent(cat.nombre)}`;
      div.dataset.cat = cat.nombre;

      const spanNombre = document.createElement('span');
      spanNombre.style.flex = '1';
      spanNombre.textContent = cat.nombre;
      spanNombre.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(`parada/${encodeURIComponent(cat.nombre)}`);
      });

      const spanDel = document.createElement('span');
      spanDel.style.cssText = 'font-size:11px;opacity:.5;cursor:pointer;padding:0 6px';
      spanDel.title = 'Eliminar categoría';
      spanDel.textContent = '✕';
      spanDel.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        eliminarCategoriaParada(cat.id, cat.nombre);
      });

      div.appendChild(spanNombre);
      div.appendChild(spanDel);
      container.appendChild(div);
    });
  } catch(e) {
    container.innerHTML = '<div style="padding:6px 16px 6px 40px;font-size:11px;color:#f87171">Error al cargar</div>';
  }
}

async function nuevaCategoriaParada() {
  openModal(
    'Nueva Categoría — Parada de Planta',
    'Nombre de la categoría',
    'Ej: Área Calderas, Línea 3...',
    async (nombre) => {
      try {
        await Storage.Categorias.save({ nombre, tipo: 'parada' });
        await cargarCategoriasParada();
        toast('✓ Categoría creada');
        navigate(`parada/${encodeURIComponent(nombre)}`);
      } catch(e) {
        const { texto } = Storage.mensajeError(e);
        toast(`Error al crear categoría: ${texto}`, 'error');
      }
    }
  );
}

async function eliminarCategoriaParada(id, nombre) {
  if (!confirm(`¿Eliminar la categoría "${nombre}"?\nSe eliminarán también todas sus fichas ATS.`)) return;
  try {
    // En modo local hacer cascade manual (en modo red el servidor lo hace en transacción)
    if (Storage.getModo() === 'local') {
      const fichas = await Storage.ATS.getByCategoria(nombre, 'parada');
      await Promise.all(fichas.map(f => Storage.ATS.remove(f.id)));
    }
    await Storage.Categorias.remove(id);
    await cargarCategoriasParada();
    toast('Categoría eliminada');
    navigate('inicio');
  } catch(e) {
    const { texto } = Storage.mensajeError(e);
    toast(`Error al eliminar: ${texto}`, 'error');
  }
}

window.nuevaCategoriaParada    = nuevaCategoriaParada;
window.eliminarCategoriaParada = eliminarCategoriaParada;
window.cargarCategoriasParada  = cargarCategoriasParada;
