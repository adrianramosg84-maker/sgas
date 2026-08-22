/* ================================================================
   SGAS — config.js
   Personalización visual: colores, fuente, tamaño.
   Persiste en Storage.Config y aplica en tiempo real.
   ================================================================ */

const CONFIG_DEFAULTS = {
  colorBg:      '#1e2640',
  colorSidebar: '#1a2035',
  colorHeader:  '#2d4a6e',
  colorAccent:  '#00b4d8',
  colorSave:    '#2d6a4f',
  colorDel:     '#9b2335',
  colorEdit:    '#b5560a',
  font:         'Segoe UI',
  size:         'normal',
};

const FONT_MAP = {
  'Segoe UI':   "'Segoe UI', sans-serif",
  'Inter':      "'Inter', sans-serif",
  'Roboto':     "'Roboto', sans-serif",
  'Open Sans':  "'Open Sans', sans-serif",
  'Lato':       "'Lato', sans-serif",
  'Source Sans': "'Source Sans Pro', sans-serif",
};

const SIZE_MAP = {
  'pequeño': '12px',
  'normal':  '14px',
  'grande':  '16px',
};

let currentConfig = { ...CONFIG_DEFAULTS };

/* ================================================================
   CARGAR y APLICAR CONFIG
   ================================================================ */
async function loadConfig() {
  try {
    const entries = await Storage.Config.getAll();
    entries.forEach(e => {
      if (e.key in currentConfig) currentConfig[e.key] = e.value;
    });
  } catch(e) {
    // Sin config guardada: usar defaults
  }
  applyConfig(currentConfig);
}

function applyConfig(cfg) {
  const root = document.documentElement;
  root.style.setProperty('--bg',       cfg.colorBg);
  root.style.setProperty('--sidebar',  cfg.colorSidebar);
  root.style.setProperty('--header',   cfg.colorHeader);
  root.style.setProperty('--accent',   cfg.colorAccent);
  root.style.setProperty('--btn-save', cfg.colorSave);
  root.style.setProperty('--btn-del',  cfg.colorDel);
  root.style.setProperty('--btn-edit', cfg.colorEdit);
  root.style.setProperty('--font',     FONT_MAP[cfg.font] || FONT_MAP['Segoe UI']);
  root.style.setProperty('--font-size', SIZE_MAP[cfg.size] || SIZE_MAP['normal']);
}

/* ================================================================
   RENDER PANEL DE CONFIGURACIÓN
   ================================================================ */
async function renderConfig() {
  setBreadcrumb([
    { label: 'Inicio', hash: 'inicio' },
    { label: 'Configuración' },
  ]);

  await loadConfig();
  buildColorPickers();
  buildFontSelector();
  buildSizeSelector();
  updatePreview();
  showView('config');
}

/* ── Color pickers ── */
function buildColorPickers() {
  const fields = [
    { key: 'colorBg',      label: 'Fondo general' },
    { key: 'colorSidebar', label: 'Sidebar' },
    { key: 'colorHeader',  label: 'Header' },
    { key: 'colorAccent',  label: 'Acento / Activo' },
    { key: 'colorSave',    label: 'Botón Guardar' },
    { key: 'colorDel',     label: 'Botón Eliminar' },
    { key: 'colorEdit',    label: 'Botón Editar' },
  ];

  const container = document.getElementById('config-colors');
  container.innerHTML = '';
  fields.forEach(f => {
    const row = document.createElement('div');
    row.className = 'color-row';
    row.innerHTML = `
      <span>${f.label}</span>
      <div class="color-picker-wrap">
        <div class="color-swatch" style="background:${currentConfig[f.key]}" id="swatch-${f.key}">
          <input type="color" value="${currentConfig[f.key]}" data-key="${f.key}"
            oninput="onColorChange(this)" />
        </div>
        <span class="color-hex" id="hex-${f.key}">${currentConfig[f.key]}</span>
      </div>`;
    container.appendChild(row);
  });
}

function onColorChange(input) {
  const key = input.dataset.key;
  const val = input.value;
  currentConfig[key] = val;
  document.getElementById(`swatch-${key}`).style.background = val;
  document.getElementById(`hex-${key}`).textContent = val;
  applyConfig(currentConfig);
  updatePreview();
}

/* ── Font selector ── */
function buildFontSelector() {
  const container = document.getElementById('config-fonts');
  container.innerHTML = '';
  Object.keys(FONT_MAP).forEach(name => {
    const btn = document.createElement('div');
    btn.className = 'font-opt' + (currentConfig.font === name ? ' active' : '');
    btn.textContent = name;
    btn.style.fontFamily = FONT_MAP[name];
    btn.addEventListener('click', () => {
      currentConfig.font = name;
      container.querySelectorAll('.font-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyConfig(currentConfig);
      updatePreview();
    });
    container.appendChild(btn);
  });
}

/* ── Size selector ── */
function buildSizeSelector() {
  const container = document.getElementById('config-sizes');
  container.innerHTML = '';
  ['pequeño','normal','grande'].forEach(s => {
    const btn = document.createElement('div');
    btn.className = 'size-opt' + (currentConfig.size === s ? ' active' : '');
    btn.textContent = s.charAt(0).toUpperCase() + s.slice(1);
    btn.addEventListener('click', () => {
      currentConfig.size = s;
      container.querySelectorAll('.size-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyConfig(currentConfig);
      updatePreview();
    });
    container.appendChild(btn);
  });
}

/* ── Vista previa ── */
function updatePreview() {
  const cfg = currentConfig;
  const p = document.getElementById('config-preview');
  if (!p) return;
  p.innerHTML = `
    <div class="preview-card">
      <div class="prev-header" style="background:${cfg.colorHeader};color:${cfg.colorAccent}">
        SGAS — Sistema de Gestión
      </div>
      <div class="prev-body">
        <div class="prev-sb" style="background:${cfg.colorSidebar}">
          <div class="prev-nav ap" style="background:${cfg.colorAccent}88"></div>
          <div class="prev-nav"></div>
          <div class="prev-nav"></div>
        </div>
        <div class="prev-ct" style="background:${cfg.colorBg}">
          <div class="prev-line" style="background:${cfg.colorSidebar}"></div>
          <div class="prev-line" style="width:70%;background:${cfg.colorSidebar}"></div>
          <div class="prev-btn-mini" style="background:${cfg.colorAccent}">Guardar</div>
        </div>
      </div>
    </div>
    <div style="margin-top:14px;font-size:12px;color:var(--text-dim);line-height:2">
      <div>Acento: <strong style="color:${cfg.colorAccent}">${cfg.colorAccent}</strong></div>
      <div>Fuente: <strong style="color:var(--text)">${cfg.font} — ${cfg.size}</strong></div>
    </div>`;
}

/* ================================================================
   GUARDAR CONFIG
   ================================================================ */
async function guardarConfig() {
  try {
    for (const [key, value] of Object.entries(currentConfig)) {
      await Storage.Config.set(key, value);
    }
    toast('✓ Configuración guardada');
  } catch(e) { toast('Error al guardar configuración', 'error'); }
}

/* ── Restaurar defaults ── */
async function restaurarConfig() {
  if (!confirm('¿Restaurar todos los valores por defecto?')) return;
  currentConfig = { ...CONFIG_DEFAULTS };
  applyConfig(currentConfig);
  buildColorPickers();
  buildFontSelector();
  buildSizeSelector();
  updatePreview();
  // Guardar defaults en storage
  for (const [key, value] of Object.entries(currentConfig)) {
    await Storage.Config.set(key, value);
  }
  toast('✓ Valores restaurados');
}

/* ── Registrar en el router ── */
Views.config = () => renderConfig();

window.renderConfig    = renderConfig;
window.guardarConfig   = guardarConfig;
window.restaurarConfig = restaurarConfig;
window.onColorChange   = onColorChange;
window.loadConfig      = loadConfig;
