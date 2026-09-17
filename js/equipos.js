/* ================================================================
   SGAS — equipos.js
   Equipos / TAG: gestor de links a Google Sheets
   - Agregar sheets con nombre y URL
   - Abrir en nueva pestaña
   - Eliminar
   ================================================================ */

/* ================================================================
   RENDER VISTA
   ================================================================ */
async function renderEquipos() {
  setBreadcrumb([
    { label: 'Inicio', hash: 'inicio' },
    { label: 'Equipos / TAG' },
  ]);

  let sheets = [];
  try { sheets = await Storage.Sheets.getAll(); } catch(e) {}

  const lista = document.getElementById('sheets-lista');
  if (!lista) { showView('equipos'); return; }

  if (!sheets || sheets.length === 0) {
    lista.innerHTML = `
      <div style="text-align:center;padding:60px;color:var(--text-dim)">
        <div style="font-size:40px;margin-bottom:16px">📊</div>
        <div style="font-size:15px;margin-bottom:8px">No hay Sheets cargados</div>
        <div style="font-size:13px">Hacé clic en <strong>＋ Agregar Sheet</strong> para agregar un Google Sheet</div>
      </div>`;
  } else {
    lista.innerHTML = '';
    sheets.forEach(sheet => {
      const card = document.createElement('div');
      card.className = 'sheet-card';
      card.innerHTML = `
        <div class="sheet-icon">📊</div>
        <div class="sheet-info">
          <div class="sheet-nombre">${escapeHtml(sheet.nombre)}</div>
          <div class="sheet-url">${escapeHtml(sheet.url)}</div>
        </div>
        <div class="sheet-actions">
          <button class="btn btn-primary btn-sm" onclick="abrirSheet('${escapeHtml(sheet.url).replace(/'/g,"\\'")}')">
            🔗 Abrir
          </button>
          <button class="icon-btn ib-del" onclick="eliminarSheet(${sheet.id})" title="Eliminar">🗑️</button>
        </div>`;
      lista.appendChild(card);
    });
  }

  showView('equipos');
}

/* ================================================================
   AGREGAR SHEET
   ================================================================ */
function agregarSheet() {
  // Usamos el modal en dos pasos: primero nombre, luego URL
  openModal(
    'Nuevo Google Sheet',
    'Nombre del Sheet',
    'Ej: Equipos Planta Norte, Instrumentos Área 3...',
    async (nombre) => {
      // Segundo modal para la URL
      openModal(
        'Link de Google Sheets',
        'URL del Sheet',
        'Pegá el link completo de Google Sheets...',
        async (url) => {
          try {
            await Storage.Sheets.save({ nombre, url });
            toast('✓ Sheet agregado');
            renderEquipos();
          } catch(e) {
            const { texto } = Storage.mensajeError(e);
            toast(`Error al guardar: ${texto}`, 'error');
          }
        }
      );
      // Pre-rellenar con URL vacía
      setTimeout(() => {
        const input = document.getElementById('modal-input');
        if (input) { input.value = ''; input.focus(); }
      }, 130);
    }
  );
}

/* ================================================================
   ABRIR SHEET EN NUEVA PESTAÑA
   ================================================================ */
function abrirSheet(url) {
  if (!url) { toast('URL no válida', 'error'); return; }
  // Convertir cualquier formato de URL de Sheets a /view para apertura limpia
  let finalUrl = url.trim();
  // Si es un link de edición, convertirlo a vista pública
  if (finalUrl.includes('/edit')) {
    finalUrl = finalUrl.replace(/\/edit.*$/, '/view');
  }
  window.open(finalUrl, '_blank', 'noopener,noreferrer');
}

/* ================================================================
   ELIMINAR SHEET
   ================================================================ */
async function eliminarSheet(id) {
  if (!confirm('¿Eliminar este Sheet?')) return;
  try {
    await Storage.Sheets.remove(id);
    toast('Sheet eliminado');
    renderEquipos();
  } catch(e) {
    const { texto } = Storage.mensajeError(e);
    toast(`Error al eliminar: ${texto}`, 'error');
  }
}

/* ── Registrar vista ── */
Views.equipos = () => renderEquipos();

/* ── Exponer globalmente ── */
window.renderEquipos = renderEquipos;
window.agregarSheet  = agregarSheet;
window.abrirSheet    = abrirSheet;
window.eliminarSheet = eliminarSheet;
