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
  'equipos':              () => Views.equipos(),
  'config':               () => Views.config(),
  'talleres':             () => Views.genericoLista('talleres',             'ATS de Talleres'),
  'rescatista':           () => Views.genericoLista('rescatista',           'Rescatista'),
  'actividades-criticas': () => Views.genericoLista('actividades-criticas', 'Actividades Críticas'),
};

/* ── Router ── */
function route(hash) {
  hash = hash || location.hash.slice(1) || 'inicio';
  if (hash.startsWith('ats/') && !hash.startsWith('ats/ficha')) {
    const cat = decodeURIComponent(hash.slice(4));
    Views.atsLista(cat);
    return;
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
      const div = document.createElement('div');
      div.className = 'sub-item';
      div.dataset.cat = cat.nombre;
      div.innerHTML = `
        <span style="flex:1" onclick="navigate('ats/${encodeURIComponent(cat.nombre)}')">${escapeHtml(cat.nombre)}</span>
        <span style="font-size:11px;opacity:.5;cursor:pointer;padding:0 6px"
              onclick="event.stopPropagation();eliminarCategoria(${cat.id},'${escapeHtml(cat.nombre)}')"
              title="Eliminar categoría">✕</span>`;
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
        toast('Error al crear categoría', 'error');
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
    toast('Error al eliminar', 'error');
  }
}

/* ── Init ── */
async function init() {
  try { await Storage.init(); } catch(e) { console.error('Storage:', e); }

  initSidebar();

  // Cargar categorías dinámicas en sidebar
  await cargarCategoriasSidebar();

  // Abrir submenú ATS por defecto
  const subATS = document.getElementById('subATS');
  if (subATS) {
    subATS.classList.add('open');
    document.querySelector('[data-toggle="subATS"]')?.classList.add('open');
  }

  if (typeof loadConfig === 'function') loadConfig().catch(() => {});

  route(location.hash.slice(1) || 'inicio');
}

document.addEventListener('DOMContentLoaded', init);

window.nuevaCategoria      = nuevaCategoria;
window.eliminarCategoria   = eliminarCategoria;
window.cargarCategoriasSidebar = cargarCategoriasSidebar;
