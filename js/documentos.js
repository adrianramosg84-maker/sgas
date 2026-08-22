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
function abrirDocumento(doc) {
  if (!doc.base64) { toast('Documento no disponible', 'error'); return; }
  // Abrir en pestaña nueva desde base64
  const win = window.open();
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head><title>${escapeHtml(doc.nombre)}</title></head>
    <body style="margin:0;padding:0;height:100vh">
      <iframe src="${doc.base64}" style="width:100%;height:100vh;border:none"></iframe>
    </body>
    </html>`);
  win.document.close();
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
