/* ================================================================
   SGAS — checklists.js
   Gestión de Checklists PDF:
   - Cargar PDF (almacena nombre + fecha + base64)
   - Listar en grid de tarjetas
   - Abrir en nueva pestaña para imprimir
   - Eliminar
   ================================================================ */

async function renderChecklists() {
  setBreadcrumb([
    { label: 'Inicio', hash: 'inicio' },
    { label: 'Checklists' },
  ]);

  let docs = [];
  try { docs = await Storage.Checklists.getAll(); } catch(e) {}

  const grid = document.getElementById('checklist-grid');
  grid.innerHTML = '';

  // Ordenar por id descendente
  docs.sort((a, b) => b.id - a.id).forEach(doc => {
    const card = document.createElement('div');
    card.className = 'doc-card';
    card.innerHTML = `
      <button class="doc-del" title="Eliminar"
        onclick="event.stopPropagation(); eliminarChecklist(${doc.id})">✕</button>
      <div class="doc-icon">✅</div>
      <div class="doc-name">${escapeHtml(doc.nombre)}</div>
      <div class="doc-date">${doc.fecha || ''}</div>`;
    card.addEventListener('click', () => abrirChecklist(doc));
    grid.appendChild(card);
  });

  // Tarjeta cargar
  const addCard = document.createElement('div');
  addCard.className = 'doc-card doc-add';
  addCard.innerHTML = `<div style="font-size:28px">＋</div><div style="font-size:12px;margin-top:6px">Cargar checklist</div>`;
  addCard.addEventListener('click', cargarChecklist);
  grid.appendChild(addCard);

  showView('checklists');
}

/* ── Cargar PDF ── */
function cargarChecklist() {
  const input = document.createElement('input');
  input.type   = 'file';
  input.accept = 'application/pdf';
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast('El archivo supera el límite de 20MB', 'error');
      return;
    }

    const nombreSugerido = file.name.replace(/\.pdf$/i, '');
    openModal(
      'Nombre del checklist',
      'Asignar nombre al checklist',
      nombreSugerido,
      async (nombre) => {
        try {
          const base64 = await fileToBase64Checklist(file);
          const doc = {
            nombre,
            fecha:    new Date().toLocaleDateString('es-AR'),
            base64,
            mimeType: 'application/pdf',
          };
          await Storage.Checklists.save(doc);
          toast('✓ Checklist cargado');
          renderChecklists();
        } catch(e) {
          const { texto } = Storage.mensajeError(e);
          toast(`Error al cargar: ${texto}`, 'error');
        }
      }
    );
    setTimeout(() => {
      const input = document.getElementById('modal-input');
      if (input) { input.value = nombreSugerido; input.select(); }
    }, 130);
  });
  input.click();
}

function fileToBase64Checklist(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/* ── Abrir en nueva pestaña ── */
async function abrirChecklist(doc) {
  try {
    let base64 = doc.base64;
    if (!base64 && doc.id) {
      toast('Cargando checklist...');
      const completo = await Storage.Checklists.getById(doc.id);
      base64 = completo?.base64;
    }
    if (!base64) { toast('Checklist no disponible', 'error'); return; }

    const byteString = atob(base64.split(',')[1] || base64);
    const ab  = new ArrayBuffer(byteString.length);
    const ia  = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: 'application/pdf' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (!win) toast('Permitir popups para abrir checklists', 'error');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch(e) {
    const { texto } = Storage.mensajeError(e);
    toast(`Error al abrir: ${texto}`, 'error');
  }
}

/* ── Eliminar ── */
async function eliminarChecklist(id) {
  if (!confirm('¿Eliminar este checklist?')) return;
  try {
    await Storage.Checklists.remove(id);
    toast('Checklist eliminado');
    renderChecklists();
  } catch(e) {
    const { texto } = Storage.mensajeError(e);
    toast(`Error al eliminar: ${texto}`, 'error');
  }
}

/* ── Registrar vista ── */
Views.checklists = () => renderChecklists();

window.renderChecklists  = renderChecklists;
window.cargarChecklist   = cargarChecklist;
window.abrirChecklist    = abrirChecklist;
window.eliminarChecklist = eliminarChecklist;
