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
    toast('✓ Conectado al servidor. Recargando datos...');
    await cargarCategoriasSidebar();
    await cargarCategoriasParada();
    await cargarCategoriasChecklistSidebar();
    route(location.hash.slice(1) || 'inicio');
  } else {
    toast('No se pudo conectar. Intentá en 30 segundos.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Reintentar'; }
  }
}
window.intentarReconectar = intentarReconectar;

/* ── Init ── */
async function init() {
  try { await Storage.init(); } catch(e) { console.error('Storage:', e); }

  initSidebar();

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

/* ── Dashboard: Views.inicio con stats (movido desde index.html) ── */
Views.inicio = async () => {
  setBreadcrumb([{ label: 'Inicio' }]);
  showView('inicio');
  try {
    const [ats, parada, areas, docs] = await Promise.all([
      Storage.ATS.getAll('ats'),
      Storage.ATS.getAll('parada'),
      Storage.Emergencias.getAll(),
      Storage.Documentos.getAll(),
    ]);
    document.getElementById('stat-ats').textContent   = ats.length + parada.length;
    document.getElementById('stat-areas').textContent = areas.length;
    document.getElementById('stat-docs').textContent  = docs.length;
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
