/* ================================================================
   SGAS — config.js
   Personalización visual: colores, fuente, tamaño.
   Persiste en Storage.Config y aplica en tiempo real.
   ================================================================ */

const CONFIG_DEFAULTS = {
  colorBg:        '#1e2640',
  colorSidebar:   '#1a2035',
  colorHeader:    '#2d4a6e',
  colorAccent:    '#00b4d8',
  colorSave:      '#2d6a4f',
  colorDel:       '#9b2335',
  colorEdit:      '#b5560a',
  colorText:      '#e8eaf0',
  colorTextDim:   '#9aa3b8',
  colorCard:      '#243050',
  colorBorder:    '#2e3a55',
  colorBtnSave:   '#2d6a4f',
  font:           'Segoe UI',
  fontSize:       '14',   // valor numérico en px como string
};

const FONT_MAP = {
  'Segoe UI':       "'Segoe UI', sans-serif",
  'Inter':          "'Inter', sans-serif",
  'Roboto':         "'Roboto', sans-serif",
  'Open Sans':      "'Open Sans', sans-serif",
  'Lato':           "'Lato', sans-serif",
  'Source Sans':    "'Source Sans Pro', sans-serif",
  'Montserrat':     "'Montserrat', sans-serif",
  'Poppins':        "'Poppins', sans-serif",
  'Nunito':         "'Nunito', sans-serif",
  'Raleway':        "'Raleway', sans-serif",
  'Ubuntu':         "'Ubuntu', sans-serif",
  'Merriweather':   "'Merriweather', serif",
  'Playfair Display': "'Playfair Display', serif",
  'PT Sans':        "'PT Sans', sans-serif",
  'Fira Sans':      "'Fira Sans', sans-serif",
};

// Fuentes que requieren Google Fonts
const GOOGLE_FONTS = {
  'Inter':            'Inter',
  'Roboto':           'Roboto',
  'Open Sans':        'Open+Sans',
  'Lato':             'Lato',
  'Source Sans':      'Source+Sans+3',
  'Montserrat':       'Montserrat',
  'Poppins':          'Poppins',
  'Nunito':           'Nunito',
  'Raleway':          'Raleway',
  'Ubuntu':           'Ubuntu',
  'Merriweather':     'Merriweather',
  'Playfair Display': 'Playfair+Display',
  'PT Sans':          'PT+Sans',
  'Fira Sans':        'Fira+Sans',
};

function cargarFuenteGoogle(nombre) {
  const gFont = GOOGLE_FONTS[nombre];
  if (!gFont) return;
  const id = `gfont-${nombre.replace(/\s/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id   = id;
  link.rel  = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${gFont}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
}

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
  } catch(e) {}
  applyConfig(currentConfig);
}

function applyConfig(cfg) {
  const root = document.documentElement;
  cargarFuenteGoogle(cfg.font);
  root.style.setProperty('--bg',        cfg.colorBg);
  root.style.setProperty('--sidebar',   cfg.colorSidebar);
  root.style.setProperty('--header',    cfg.colorHeader);
  root.style.setProperty('--accent',    cfg.colorAccent);
  root.style.setProperty('--btn-save',  cfg.colorSave);
  root.style.setProperty('--btn-del',   cfg.colorDel);
  root.style.setProperty('--btn-edit',  cfg.colorEdit);
  root.style.setProperty('--text',      cfg.colorText      || CONFIG_DEFAULTS.colorText);
  root.style.setProperty('--text-dim',  cfg.colorTextDim   || CONFIG_DEFAULTS.colorTextDim);
  root.style.setProperty('--card',      cfg.colorCard      || CONFIG_DEFAULTS.colorCard);
  root.style.setProperty('--border',    cfg.colorBorder    || CONFIG_DEFAULTS.colorBorder);
  root.style.setProperty('--font',      FONT_MAP[cfg.font] || FONT_MAP['Segoe UI']);
  // Tamaño: puede ser valor numérico (nuevo) o string legacy ('normal','pequeño','grande')
  const legacySize = { 'pequeño': '12', 'normal': '14', 'grande': '16' };
  const px = legacySize[cfg.fontSize] || legacySize[cfg.size] || cfg.fontSize || '14';
  root.style.setProperty('--font-size', px + 'px');
}

/* ================================================================
   RENDER PANEL
   ================================================================ */
async function renderConfig() {
  setBreadcrumb([
    { label: 'Inicio', hash: 'inicio' },
    { label: 'Configuración' },
  ]);
  await loadConfig();
  buildColorPickers();
  buildFontSelector();
  buildSizeSlider();
  updatePreview();
  showView('config');
}

/* ── Definición de colores ── */
const COLOR_FIELDS = [
  { key: 'colorBg',      label: 'Fondo general',     group: 'Base' },
  { key: 'colorSidebar', label: 'Sidebar',            group: 'Base' },
  { key: 'colorHeader',  label: 'Header',             group: 'Base' },
  { key: 'colorCard',    label: 'Tarjetas',           group: 'Base' },
  { key: 'colorBorder',  label: 'Bordes',             group: 'Base' },
  { key: 'colorAccent',  label: 'Acento / Activo',    group: 'Acento' },
  { key: 'colorText',    label: 'Texto principal',    group: 'Texto' },
  { key: 'colorTextDim', label: 'Texto secundario',   group: 'Texto' },
  { key: 'colorSave',    label: 'Botón Guardar',      group: 'Botones' },
  { key: 'colorDel',     label: 'Botón Eliminar',     group: 'Botones' },
  { key: 'colorEdit',    label: 'Botón Editar',       group: 'Botones' },
];

/* ── Color pickers ── */
function buildColorPickers() {
  const container = document.getElementById('config-colors');
  if (!container) return;
  container.innerHTML = '';

  // Agrupar por grupo
  const grupos = [...new Set(COLOR_FIELDS.map(f => f.group))];
  grupos.forEach(grupo => {
    const groupDiv = document.createElement('div');
    groupDiv.style.cssText = 'margin-bottom:16px';
    groupDiv.innerHTML = `<div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${grupo}</div>`;

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px';

    COLOR_FIELDS.filter(f => f.group === grupo).forEach(f => {
      const val = currentConfig[f.key] || CONFIG_DEFAULTS[f.key] || '#000000';
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:7px 10px';
      row.innerHTML = `
        <div style="position:relative;width:28px;height:28px;border-radius:6px;overflow:hidden;border:2px solid rgba(255,255,255,.15);flex-shrink:0;background:${val}" id="swatch-${f.key}">
          <input type="color" value="${val}" data-key="${f.key}"
            oninput="onColorChange(this)"
            style="position:absolute;inset:-4px;width:140%;height:140%;opacity:0;cursor:pointer;border:none;padding:0" />
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;color:var(--text-dim);margin-bottom:2px">${f.label}</div>
          <div style="font-size:11px;font-family:monospace;color:var(--text)" id="hex-${f.key}">${val}</div>
        </div>`;
      grid.appendChild(row);
    });

    groupDiv.appendChild(grid);
    container.appendChild(groupDiv);
  });
}

function onColorChange(input) {
  const key = input.dataset.key;
  const val = input.value;
  currentConfig[key] = val;
  const swatch = document.getElementById(`swatch-${key}`);
  const hex    = document.getElementById(`hex-${key}`);
  if (swatch) swatch.style.background = val;
  if (hex)    hex.textContent = val;
  applyConfig(currentConfig);
  updatePreview();
}

/* ── Font selector — dropdown con preview ── */
function buildFontSelector() {
  const container = document.getElementById('config-fonts');
  if (!container) return;
  container.innerHTML = '';

  const select = document.createElement('select');
  select.style.cssText = `
    width:100%;background:var(--card);border:1px solid var(--border);
    border-radius:6px;padding:8px 12px;color:var(--text);
    font-size:14px;cursor:pointer;appearance:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%239aa3b8' d='M6 8L0 0h12z'/%3E%3C/svg%3E");
    background-repeat:no-repeat;background-position:right 12px center;padding-right:32px;`;

  Object.keys(FONT_MAP).forEach(name => {
    const opt = document.createElement('option');
    opt.value    = name;
    opt.text     = name;
    opt.selected = currentConfig.font === name;
    select.appendChild(opt);
  });

  // Preview debajo del select
  const preview = document.createElement('div');
  preview.id = 'font-preview';
  preview.style.cssText = 'margin-top:10px;padding:10px 14px;background:var(--card);border:1px solid var(--border);border-radius:6px;font-size:15px;color:var(--text)';
  preview.style.fontFamily = FONT_MAP[currentConfig.font];
  preview.textContent = 'Vista previa — ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789';

  select.addEventListener('change', () => {
    const name = select.value;
    currentConfig.font = name;
    cargarFuenteGoogle(name);
    preview.style.fontFamily = FONT_MAP[name];
    applyConfig(currentConfig);
    updatePreview();
  });

  container.appendChild(select);
  container.appendChild(preview);
}

/* ── Slider de tamaño ── */
function buildSizeSlider() {
  const container = document.getElementById('config-sizes');
  if (!container) return;
  container.innerHTML = '';

  const legacyMap = { 'pequeño': '12', 'normal': '14', 'grande': '16' };
  const current   = legacyMap[currentConfig.fontSize] || legacyMap[currentConfig.size] || currentConfig.fontSize || '14';
  const val       = parseInt(current) || 14;

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px">
      <span style="font-size:11px;color:var(--text-dim)">1px</span>
      <input type="range" id="size-slider" min="1" max="100" value="${val}"
        style="flex:1;accent-color:var(--accent);cursor:pointer;height:4px" />
      <span style="font-size:11px;color:var(--text-dim)">100px</span>
    </div>
    <div style="text-align:center;margin-top:8px;font-size:13px;color:var(--accent);font-weight:700" id="size-label">
      ${val}px
    </div>
    <div style="margin-top:8px;padding:8px 12px;background:var(--card);border:1px solid var(--border);border-radius:6px">
      <span id="size-preview" style="font-size:${val}px;color:var(--text)">Texto de muestra — ${val}px</span>
    </div>`;

  document.getElementById('size-slider').addEventListener('input', (e) => {
    const px = e.target.value;
    document.getElementById('size-label').textContent   = `${px}px`;
    const prev = document.getElementById('size-preview');
    if (prev) { prev.style.fontSize = `${px}px`; prev.textContent = `Texto de muestra — ${px}px`; }
    currentConfig.fontSize = px;
    applyConfig(currentConfig);
    updatePreview();
  });
}

/* ── Vista previa ── */
function updatePreview() {
  const cfg = currentConfig;
  const p   = document.getElementById('config-preview');
  if (!p) return;
  const legacyMap = { 'pequeño': '12', 'normal': '14', 'grande': '16' };
  const px = legacyMap[cfg.fontSize] || legacyMap[cfg.size] || cfg.fontSize || '14';
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
    <div style="margin-top:12px;font-size:12px;color:var(--text-dim);line-height:2">
      <div>Acento: <strong style="color:${cfg.colorAccent}">${cfg.colorAccent}</strong></div>
      <div>Fuente: <strong style="color:var(--text);font-family:${FONT_MAP[cfg.font]}">${cfg.font}</strong></div>
      <div>Tamaño: <strong style="color:var(--text)">${px}px</strong></div>
    </div>`;
}

/* ================================================================
   GUARDAR CONFIG
   ================================================================ */
async function guardarConfig() {
  try {
    const entries = Object.entries(currentConfig).map(([key, value]) => ({ key, value }));
    await Storage.Config.setBulk(entries);
    toast('✓ Configuración guardada');
  } catch(e) { toast('Error al guardar configuración', 'error'); }
}

async function restaurarConfig() {
  if (!confirm('¿Restaurar todos los valores por defecto?')) return;
  currentConfig = { ...CONFIG_DEFAULTS };
  applyConfig(currentConfig);
  buildColorPickers();
  buildFontSelector();
  buildSizeSlider();
  updatePreview();
  const entries = Object.entries(currentConfig).map(([key, value]) => ({ key, value }));
  await Storage.Config.setBulk(entries);
  toast('✓ Valores restaurados');
}

/* ── Registrar en el router ── */
Views.config = () => renderConfig();

window.renderConfig    = renderConfig;
window.guardarConfig   = guardarConfig;
window.restaurarConfig = restaurarConfig;
window.onColorChange   = onColorChange;
window.loadConfig      = loadConfig;
