/* ================================================================
   SGAS — storage.js
   Abstracción de almacenamiento: IndexedDB local (Fase 1)
   Fase 2: detecta servidor y usa fetch API automáticamente.
   ================================================================ */

const Storage = (() => {
  const DB_NAME    = 'SGAS_DB';
  const DB_VERSION = 1;
  let db = null;

  // Stores (tablas) de IndexedDB
  const STORES = {
    ATS:          'ats',          // fichas ATS por categoría
    EMERGENCIAS:  'emergencias',  // áreas de emergencia
    DOCUMENTOS:   'documentos',   // registros de PDFs cargados
    CONFIG:       'config',       // configuración visual
  };

  /* ── Inicializar DB ── */
  function init() {
    return new Promise((resolve, reject) => {
      if (db) { resolve(db); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const database = e.target.result;

        // ATS: keyPath = id autoincrement, índice por categoría
        if (!database.objectStoreNames.contains(STORES.ATS)) {
          const store = database.createObjectStore(STORES.ATS, { keyPath: 'id', autoIncrement: true });
          store.createIndex('categoria', 'categoria', { unique: false });
        }

        // Emergencias: keyPath = id autoincrement
        if (!database.objectStoreNames.contains(STORES.EMERGENCIAS)) {
          database.createObjectStore(STORES.EMERGENCIAS, { keyPath: 'id', autoIncrement: true });
        }

        // Documentos: keyPath = id autoincrement
        if (!database.objectStoreNames.contains(STORES.DOCUMENTOS)) {
          database.createObjectStore(STORES.DOCUMENTOS, { keyPath: 'id', autoIncrement: true });
        }

        // Config: keyPath = 'key' (clave única por setting)
        if (!database.objectStoreNames.contains(STORES.CONFIG)) {
          database.createObjectStore(STORES.CONFIG, { keyPath: 'key' });
        }
      };

      req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      req.onerror   = (e) => reject(e.target.error);
    });
  }

  /* ── Helper: obtener store ── */
  function getStore(storeName, mode = 'readonly') {
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  /* ── CRUD genérico ── */

  function getAll(storeName) {
    return new Promise((resolve, reject) => {
      const req = getStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  function getById(storeName, id) {
    return new Promise((resolve, reject) => {
      const req = getStore(storeName).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  function getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const index = getStore(storeName).index(indexName);
      const req   = index.getAll(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  function save(storeName, record) {
    return new Promise((resolve, reject) => {
      // Si tiene id → put (actualizar), si no → add (crear)
      const store = getStore(storeName, 'readwrite');
      const req   = record.id ? store.put(record) : store.add(record);
      req.onsuccess = () => resolve(req.result);   // devuelve id asignado
      req.onerror   = () => reject(req.error);
    });
  }

  function remove(storeName, id) {
    return new Promise((resolve, reject) => {
      const req = getStore(storeName, 'readwrite').delete(id);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  /* ── API específica por entidad ── */

  // ATS
  const ATS = {
    getByCategoria: (cat) => getByIndex(STORES.ATS, 'categoria', cat),
    getById:        (id)  => getById(STORES.ATS, id),
    save:           (rec) => save(STORES.ATS, rec),
    remove:         (id)  => remove(STORES.ATS, id),
    getAll:         ()    => getAll(STORES.ATS),
  };

  // Emergencias (áreas)
  const Emergencias = {
    getAll:  ()    => getAll(STORES.EMERGENCIAS),
    getById: (id)  => getById(STORES.EMERGENCIAS, id),
    save:    (rec) => save(STORES.EMERGENCIAS, rec),
    remove:  (id)  => remove(STORES.EMERGENCIAS, id),
  };

  // Documentos
  const Documentos = {
    getAll:  ()    => getAll(STORES.DOCUMENTOS),
    save:    (rec) => save(STORES.DOCUMENTOS, rec),
    remove:  (id)  => remove(STORES.DOCUMENTOS, id),
  };

  // Config
  const Config = {
    get: (key) => getById(STORES.CONFIG, key),
    set: (key, value) => save(STORES.CONFIG, { key, value }),
    getAll: () => getAll(STORES.CONFIG),
  };

  return { init, ATS, Emergencias, Documentos, Config, STORES };
})();
