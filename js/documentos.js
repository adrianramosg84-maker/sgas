/* ================================================================
   SGAS — documentos.js
   Gestión de Planos y Documentos PDF:
   - Cargar PDF (almacena nombre + fecha + base64)
   - Listar documentos
   - Abrir en pestaña nueva
   - Eliminar
   ================================================================ */

/* ================================================================
   RENDER LISTA DE DOCUMENTOS
   ================================================================ */
async function renderDocumentos() {
  setBreadcrumb([
    { label: 'Inicio', hash: 'inicio' },
    { label: 'Planos y Documentos' },
  ]);

  let docs = [];
  try { docs = await Storage.Documentos.getAll(); } catch(e) {}

  const grid = document.getElementById('doc-grid');
  grid.innerHTML = '';

  // Ordenar por fecha descendente
  docs.sort((a, b) => b.id - a.id).forEach(doc => {
    const card = document.createElement('div');
    card.className = 'doc-card';
    card.innerHTML = `
      <button class="doc-del" title="Eliminar documento"
        onclick="event.stopPropagation(); eliminarDocumento(${doc.id})">✕</button>
      <div class="doc-icon">📄</div>
      <div class="doc-name">${escapeHtml(doc.nombre)}</div>
      <div class="doc-date">${doc.fecha || ''}</div>`;
    card.addEventListener('click', () => abrirDocumento(doc));
    grid.appendChild(card);
  });

  // Tarjeta "Cargar documento"
  const addCard = document.createElement('div');
  addCard.className = 'doc-card doc-add';
  addCard.innerHTML = `<div style="font-size:28px">＋</div><div style="font-size:12px;margin-top:6px">Cargar documento</div>`;
  addCard.addEventListener('click', cargarDocumento);
  grid.appendChild(addCard);

  showView('planos');
}

/* ================================================================
   CARGAR PDF
   ================================================================ */
function cargarDocumento() {
  const input = document.createElement('input');
  input.type   = 'file';
  input.accept = 'application/pdf';
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Pedir nombre personalizado via modal
    const nombreSugerido = file.name.replace(/\.pdf$/i, '');
    openModal(
      'Nombre del documento',
      'Asignar nombre al documento',
      nombreSugerido,
      async (nombre) => {
        try {
          const base64 = await fileToBase64(file);
          const doc = {
            nombre,
            fecha:    new Date().toLocaleDateString('es-AR'),
            base64,
            mimeType: 'application/pdf',
          };
          await Storage.Documentos.save(doc);
          toast('✓ Documento cargado');
          renderDocumentos();
        } catch(e) {
          toast('Error al cargar el documento', 'error');
        }
      }
    );
    // Pre-rellenar el input del modal con el nombre sugerido
    setTimeout(() => {
      const input = document.getElementById('modal-input');
      if (input) { input.value = nombreSugerido; input.select(); }
    }, 130);
  });
  input.click();
}

/* ── Convertir File a base64 ── */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/* ================================================================
   ABRIR DOCUMENTO
   ================================================================ */
async function abrirDocumento(doc) {
  try {
    // En modo RED el listado no trae base64, hay que pedirlo por ID
    let base64 = doc.base64;
    if (!base64 && doc.id) {
      toast('Cargando documento...');
      const completo = await Storage.Documentos.getById(doc.id);
      base64 = completo?.base64;
    }
    if (!base64) { toast('Documento no disponible', 'error'); return; }

    // Convertir base64 a Blob y abrir en nueva pestaña
    const byteString  = atob(base64.split(',')[1] || base64);
    const ab          = new ArrayBuffer(byteString.length);
    const ia          = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob        = new Blob([ab], { type: 'application/pdf' });
    const url         = URL.createObjectURL(blob);
    const win         = window.open(url, '_blank');
    if (!win) toast('Permitir popups para abrir documentos', 'error');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch(e) {
    toast('Error al abrir el documento', 'error');
  }
}

/* ================================================================
   ELIMINAR DOCUMENTO
   ================================================================ */
async function eliminarDocumento(id) {
  if (!confirm('¿Eliminar este documento?')) return;
  try {
    await Storage.Documentos.remove(id);
    toast('Documento eliminado');
    renderDocumentos();
  } catch(e) { toast('Error al eliminar', 'error'); }
}

/* ── Registrar en el router ── */
Views.planos = () => renderDocumentos();

window.renderDocumentos  = renderDocumentos;
window.cargarDocumento   = cargarDocumento;
window.abrirDocumento    = abrirDocumento;
window.eliminarDocumento = eliminarDocumento;
