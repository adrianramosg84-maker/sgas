/* ================================================================
   SGAS — app.js
   Navegación principal, routing por hash, estado global, UI shell.
   ================================================================ */

/* ── Estado global ── */
const App = {
  currentView:     'inicio',
  currentCategory: '',       // categoría ATS activa
  currentModule:   '',       // módulo activo (talleres, rescatista, etc.)
};

/* ── Objeto Views: cada módulo registra sus vistas aquí ── */
const Views = {
  inicio:      () => {
    setBreadcrumb([{ label: 'Inicio' }]);
    showView('inicio');
  },
  emergencias: () => {},   // sobreescrito por emergencias.js
  planos:      () => {},   // sobreescrito por documentos.js
  config:      () => {},   // sobreescrito por config.js
  atsLista:    () => {},   // sobreescrito por ats.js
  genericoLista: () => {}, // sobreescrito por ats.js
};

/* ── Mapa de rutas hash ── */
const ROUTES = {
  'inicio':               () => Views.inicio(),
  'emergencias':          () => Views.emergencias(),
  'planos':               () => Views.planos(),
  'config':               () => Views.config(),
  'talleres':             () => Views.genericoLista('talleres',    'ATS de Talleres'),
  'rescatista':           () => Views.genericoLista('rescatista',  'Rescatista'),
  'actividades-criticas': () => Views.genericoLista('actividades-criticas', 'Actividades Críticas'),
};

/* ── Router principal ── */
function route(hash) {
  hash = hash || location.hash.slice(1) || 'inicio';

  // ATS por categoría: ats/pintura, ats/andamios, etc.
  if (hash.startsWith('ats/') && !hash.startsWith('ats/ficha')) {
    const cat = decodeURIComponent(hash.slice(4));
    Views.atsLista(cat);
    return;
  }
  if (hash.startsWith('ats/ficha')) {
    // La ficha se abre programáticamente desde atsLista, no por hash directo
    return;
  }

  const fn = ROUTES[hash];
  if (fn) fn();
  else Views.inicio();
}

/* ── Navegación ── */
function navigate(hash, pushState = true) {
  if (pushState) history.pushState({ hash }, '', '#' + hash);
  route(hash);
}

window.addEventListener('popstate', (e) => {
  const hash = e.state?.hash || location.hash.slice(1) || 'inicio';
  route(hash);
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
  // parts: array de {label, hash?}
  const bc = document.getElementById('breadcrumb');
  bc.innerHTML = parts.map((p, i) => {
    if (i < parts.length - 1 && p.hash) {
      return `<span class="bc-link" onclick="navigate('${p.hash}')">${p.label}</span>`;
    }
    return `<span class="bc-current">${p.label}</span>`;
  }).join('<span class="bc-sep">›</span>');
}

/* ── Activar nav item en sidebar ── */
function setActiveNav(selector) {
  document.querySelectorAll('.nav-item, .sub-item, .sub-sub-item')
    .forEach(el => el.classList.remove('active'));
  const el = document.querySelector(selector);
  if (el) el.classList.add('active');
}

/* ── Toggle submenú sidebar ── */
function toggleSub(id, triggerEl) {
  const sub = document.getElementById(id);
  if (!sub) return;
  sub.classList.toggle('open');
  if (triggerEl) triggerEl.classList.toggle('open');
}

/* ── Sidebar colapsar/expandir ── */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const btn     = document.getElementById('sidebarToggle');
  btn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    btn.textContent  = sidebar.classList.contains('collapsed') ? '›' : '‹';
    btn.style.left   = sidebar.classList.contains('collapsed') ? '36px' : '222px';
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

/* ── Modal genérico de texto ── */
function openModal(title, label, placeholder, onConfirm) {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent   = title;
  document.getElementById('modal-label').textContent   = label;
  const input = document.getElementById('modal-input');
  input.placeholder = placeholder;
  input.value = '';
  input.style.borderColor = '';
  overlay.classList.add('show');
  setTimeout(() => input.focus(), 120);

  // guardar callback
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

/* ── Init ── */
async function init() {
  try {
    await Storage.init();
  } catch (e) {
    console.error('Storage init error:', e);
  }

  initSidebar();

  // Abrir submenú ATS por defecto
  const subATS = document.getElementById('subATS');
  if (subATS) {
    subATS.classList.add('open');
    document.querySelector('[data-toggle="subATS"]')?.classList.add('open');
  }

  // Aplicar config guardada
  if (typeof loadConfig === 'function') {
    loadConfig().catch(() => {});
  }

  // Rutar al hash inicial
  const hash = location.hash.slice(1) || 'inicio';
  route(hash);
}

document.addEventListener('DOMContentLoaded', init);
