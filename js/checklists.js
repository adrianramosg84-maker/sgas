/* ================================================================
   SGAS — checklists.js
   Gestión de Checklists PDF con categorías:
   - Home: tarjetas de categorías (incluyendo "General" con los
     checklists sin categoría asignada)
   - Lista por categoría: grilla de checklists de esa categoría
   - Cargar PDF dentro de una categoría
   - Abrir en nueva pestaña para imprimir
   - Eliminar
   ================================================================ */

const ChecklistState = {
  categoriaActual: null,
};

/* ================================================================
   HOME — TARJETAS DE CATEGORÍAS
   ================================================================ */
async function renderChecklistsHome() {
  setBreadcrumb([
    { label: 'Inicio', hash: 'inicio' },
    { label: 'Checklists' },
  ]);

  // Actualizar header de la vista
  const titleEl = document.getElementById('checklists-titulo');
  if (titleEl) titleEl.textContent = 'Checklists';

  const actionsEl = document.getElementById('checklists-actions');
  if (actionsEl) {
    actionsEl.innerHTML = `
      <button class="btn btn-primary" onclick="nuevaCategoriaChecklist()">＋ Nueva Categoría</button>`;
  }

  // Cargar categorías tipo 'checklist' desde storage
  let cats = [];
  try { cats = await Storage.Categorias.getAll('checklist'); } catch(e) {}

  // Siempre mostrar "General" primero, luego las categorías creadas
  const todasLasCats = [
    { id: '__general__', nombre: 'General', _esFija: true },
    ...cats,
  ];

  const grid = document.getElementById('checklist-grid');
  grid.innerHTML = '';
  grid.style.display = '';

  for (const cat of todasLasCats) {
    // Contar checklists de esta categoría
    let count = 0;
    try {
      const items = await Storage.Checklists.getByCategoria(cat.nombre);
      count = items.length;
    } catch(e) {}

    const card = document.createElement('div');
    card.className = 'doc-card checklist-cat-card';
    card.style.cssText = 'cursor:pointer;flex-direction:column;align-items:flex-start;gap:6px;padding:18px 20px;';
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;width:100%">
        <div class="doc-icon" style="font-size:22px">📂</div>
        <div style="flex:1;min-width:0">
          <div class="doc-name" style="font-size:14px;font-weight:600">${escapeHtml(cat.nombre)}</div>
          <div class="doc-date">${count} checklist${count !== 1 ? 's' : ''}</div>
        </div>
        ${!cat._esFija ? `
        <button class="doc-del" title="Eliminar categoría"
          onclick="event.stopPropagation();eliminarCategoriaChecklist(${cat.id},'${escapeHtml(cat.nombre).replace(/'/g,"\\'")}')">✕</button>
        ` : ''}
      </div>`;
    card.addEventListener('click', () => {
      navigate(`checklists/${encodeURIComponent(cat.nombre)}`);
    });
    grid.appendChild(card);
  }

  showView('checklists');
}

/* ================================================================
   LISTA DE CHECKLISTS POR CATEGORÍA
   ================================================================ */
async function renderChecklistsLista(categoria) {
  ChecklistState.categoriaActual = categoria;

  setBreadcrumb([
    { label: 'Inicio',      hash: 'inicio' },
    { label: 'Checklists',  hash: 'checklists' },
    { label: categoria },
  ]);

  const titleEl = document.getElementById('checklists-titulo');
  if (titleEl) titleEl.textContent = categoria;

  const actionsEl = document.getElementById('checklists-actions');
  if (actionsEl) {
    actionsEl.innerHTML = `
      <button class="btn btn-primary" onclick="cargarChecklist()">📎 Cargar PDF</button>`;
  }

  let docs = [];
  try { docs = await Storage.Checklists.getByCategoria(categoria); } catch(e) {}

  const grid = document.getElementById('checklist-grid');
  grid.innerHTML = '';
  grid.style.display = '';

  // Ordenar por id descendente
  docs.sort((a, b) => b.id - a.id).forEach(doc => {
    const card = document.createElement('div');
    card.className = 'doc-card';
    card.innerHTML = `
      <div class="doc-icon">✅</div>
      <div class="doc-info">
        <div class="doc-name">${escapeHtml(doc.nombre)}</div>
        <div class="doc-date">${doc.fecha || ''}</div>
      </div>
      <button class="doc-del" title="Eliminar"
        onclick="event.stopPropagation(); eliminarChecklist(${doc.id})">✕</button>`;
    card.addEventListener('click', () => abrirChecklist(doc));
    grid.appendChild(card);
  });

  // Tarjeta "Cargar PDF"
  const addCard = document.createElement('div');
  addCard.className = 'doc-card doc-add';
  addCard.innerHTML = `<div class="doc-icon">＋</div><div style="font-size:12px">Cargar checklist</div>`;
  addCard.addEventListener('click', cargarChecklist);
  grid.appendChild(addCard);

  showView('checklists');
}

/* ================================================================
   CATEGORÍAS — CREAR / ELIMINAR
   ================================================================ */
async function nuevaCategoriaChecklist() {
  openModal(
    'Nueva Categoría — Checklists',
    'Nombre de la categoría',
    'Ej: Área Calderas, Línea 3, Seguridad...',
    async (nombre) => {
      try {
        await Storage.Categorias.save({ nombre, tipo: 'checklist' });
        await cargarCategoriasChecklistSidebar();
        toast('✓ Categoría creada');
        navigate(`checklists/${encodeURIComponent(nombre)}`);
      } catch(e) {
        const { texto } = Storage.mensajeError(e);
        toast(`Error al crear categoría: ${texto}`, 'error');
      }
    }
  );
}

async function eliminarCategoriaChecklist(id, nombre) {
  if (!confirm(`¿Eliminar la categoría "${nombre}"?\nLos checklists de esta categoría también serán eliminados.`)) return;
  try {
    // Eliminar los checklists de la categoría primero (modo local)
    // En modo red el servidor no tiene cascada para checklists, los eliminamos manualmente
    const items = await Storage.Checklists.getByCategoria(nombre);
    await Promise.all(items.map(item => Storage.Checklists.remove(item.id)));
    await Storage.Categorias.remove(id);
    await cargarCategoriasChecklistSidebar();
    toast('Categoría eliminada');
    navigate('checklists');
  } catch(e) {
    const { texto } = Storage.mensajeError(e);
    toast(`Error al eliminar: ${texto}`, 'error');
  }
}

/* ================================================================
   CARGAR PDF (dentro de la categoría activa)
   ================================================================ */
function cargarChecklist() {
  const categoria = ChecklistState.categoriaActual || 'General';
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
            fecha:     new Date().toLocaleDateString('es-AR'),
            base64,
            mimeType:  'application/pdf',
            categoria,
          };
          await Storage.Checklists.save(doc);
          toast('✓ Checklist cargado');
          renderChecklistsLista(categoria);
        } catch(e) {
          const { texto } = Storage.mensajeError(e);
          toast(`Error al cargar: ${texto}`, 'error');
        }
      }
    );
    setTimeout(() => {
      const inp = document.getElementById('modal-input');
      if (inp) { inp.value = nombreSugerido; inp.select(); }
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

/* ================================================================
   ABRIR EN NUEVA PESTAÑA
   ================================================================ */
async function abrirChecklist(doc) {
  try {
    let base64 = doc.base64;
    if (!base64 && doc.id) {
      toast('Cargando checklist...');
      const completo = await Storage.Checklists.getById(doc.id);
      base64 = completo?.base64;
    }
    if (!base64) { toast('Checklist no disponible', 'error'); return; }
    if (!abrirBase64EnPestana(base64)) toast('Permitir popups para abrir checklists', 'error');
  } catch(e) {
    const { texto } = Storage.mensajeError(e);
    toast(`Error al abrir: ${texto}`, 'error');
  }
}

/* ================================================================
   ELIMINAR CHECKLIST
   ================================================================ */
async function eliminarChecklist(id) {
  if (!confirm('¿Eliminar este checklist?')) return;
  try {
    await Storage.Checklists.remove(id);
    toast('Checklist eliminado');
    // Volver a renderizar la lista de la categoría actual
    if (ChecklistState.categoriaActual) {
      renderChecklistsLista(ChecklistState.categoriaActual);
    } else {
      renderChecklistsHome();
    }
  } catch(e) {
    const { texto } = Storage.mensajeError(e);
    toast(`Error al eliminar: ${texto}`, 'error');
  }
}

/* ================================================================
   REGISTRAR VISTAS Y EXPORTAR
   ================================================================ */
Views.checklists = () => renderChecklistsHome();

window.renderChecklistsHome    = renderChecklistsHome;
window.renderChecklistsLista   = renderChecklistsLista;
window.nuevaCategoriaChecklist = nuevaCategoriaChecklist;
window.eliminarCategoriaChecklist = eliminarCategoriaChecklist;
window.cargarChecklist         = cargarChecklist;
window.abrirChecklist          = abrirChecklist;
window.eliminarChecklist       = eliminarChecklist;
