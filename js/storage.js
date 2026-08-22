/* ================================================================
   SGAS — storage.js
   Abstracción automática:
   - Modo RED:   detecta servidor → usa API REST
   - Modo LOCAL: sin servidor     → usa IndexedDB
   ================================================================ */

const Storage = (() => {

  /* ── Configuración ── */
  // Cambiá esta URL por la URL de tu servidor en Render
  const SERVER_URL = 'https://sgas-server.onrender.com';

  let modoRed = false;
  let db      = null;  // IndexedDB (modo local)

  /* ================================================================
     DETECCIÓN AUTOMÁTICA DE MODO
     ================================================================ */
  async function init() {
    try {
      const res = await fetch(`${SERVER_URL}/api/ping`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        modoRed = true;
        console.log('SGAS: Modo RED activo →', SERVER_URL);
        return;
      }
    } catch(e) {
      // Servidor no disponible, usar local
    }
    // Inicializar IndexedDB local
    await initIndexedDB();
    console.log('SGAS: Modo LOCAL activo (IndexedDB)');
  }

  function getModo() { return modoRed ? 'red' : 'local'; }

  /* ================================================================
     FETCH HELPER (modo red)
     ================================================================ */
  async function apiFetch(path, options = {}) {
    const res = await fetch(`${SERVER_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  }

  /* ================================================================
     INDEXEDDB (modo local)
     ================================================================ */
  const DB_NAME    = 'SGAS_DB';
  const DB_VERSION = 1;

  function initIndexedDB() {
    return new Promise((resolve, reject) => {
      if (db) { resolve(db); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains('ats')) {
          const s = database.createObjectStore('ats', { keyPath: 'id', autoIncrement: true });
          s.createIndex('categoria', 'categoria', { unique: false });
        }
        if (!database.objectStoreNames.contains('emergencias'))
          database.createObjectStore('emergencias', { keyPath: 'id', autoIncrement: true });
        if (!database.objectStoreNames.contains('documentos'))
          database.createObjectStore('documentos', { keyPath: 'id', autoIncrement: true });
        if (!database.objectStoreNames.contains('config'))
          database.createObjectStore('config', { keyPath: 'key' });
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      req.onerror   = (e) => reject(e.target.error);
    });
  }

  function idbStore(storeName, mode = 'readonly') {
    return db.transaction(storeName, mode).objectStore(storeName);
  }
  function idbGetAll(storeName) {
    return new Promise((res, rej) => {
      const r = idbStore(storeName).getAll();
      r.onsuccess = () => res(r.result);
      r.onerror   = () => rej(r.error);
    });
  }
  function idbGet(storeName, id) {
    return new Promise((res, rej) => {
      const r = idbStore(storeName).get(id);
      r.onsuccess = () => res(r.result);
      r.onerror   = () => rej(r.error);
    });
  }
  function idbGetByIndex(storeName, indexName, value) {
    return new Promise((res, rej) => {
      const r = idbStore(storeName).index(indexName).getAll(value);
      r.onsuccess = () => res(r.result);
      r.onerror   = () => rej(r.error);
    });
  }
  function idbSave(storeName, record) {
    return new Promise((res, rej) => {
      const store = idbStore(storeName, 'readwrite');
      const r     = record.id ? store.put(record) : store.add(record);
      r.onsuccess = () => res(r.result);
      r.onerror   = () => rej(r.error);
    });
  }
  function idbRemove(storeName, id) {
    return new Promise((res, rej) => {
      const r = idbStore(storeName, 'readwrite').delete(id);
      r.onsuccess = () => res();
      r.onerror   = () => rej(r.error);
    });
  }

  /* ================================================================
     API PÚBLICA — ATS
     ================================================================ */
  const ATS = {
    getAll: async () => {
      if (modoRed) return apiFetch('/api/ats');
      return idbGetAll('ats');
    },
    getByCategoria: async (cat) => {
      if (modoRed) return apiFetch(`/api/ats?categoria=${encodeURIComponent(cat)}`);
      return idbGetByIndex('ats', 'categoria', cat);
    },
    getById: async (id) => {
      if (modoRed) return apiFetch(`/api/ats/${id}`);
      return idbGet('ats', id);
    },
    save: async (record) => {
      if (modoRed) {
        if (record.id) {
          const r = await apiFetch(`/api/ats/${record.id}`, { method: 'PUT', body: record });
          return r.id;
        } else {
          const r = await apiFetch('/api/ats', { method: 'POST', body: record });
          record.id = r.id;
          return r.id;
        }
      }
      return idbSave('ats', record);
    },
    remove: async (id) => {
      if (modoRed) return apiFetch(`/api/ats/${id}`, { method: 'DELETE' });
      return idbRemove('ats', id);
    },
  };

  /* ================================================================
     API PÚBLICA — EMERGENCIAS
     ================================================================ */
  const Emergencias = {
    getAll: async () => {
      if (modoRed) return apiFetch('/api/emergencias');
      return idbGetAll('emergencias');
    },
    getById: async (id) => {
      if (modoRed) return apiFetch(`/api/emergencias/${id}`);
      return idbGet('emergencias', id);
    },
    save: async (record) => {
      if (modoRed) {
        if (record.id) {
          const r = await apiFetch(`/api/emergencias/${record.id}`, { method: 'PUT', body: record });
          return r.id;
        } else {
          const r = await apiFetch('/api/emergencias', { method: 'POST', body: record });
          record.id = r.id;
          return r.id;
        }
      }
      return idbSave('emergencias', record);
    },
    remove: async (id) => {
      if (modoRed) return apiFetch(`/api/emergencias/${id}`, { method: 'DELETE' });
      return idbRemove('emergencias', id);
    },
  };

  /* ================================================================
     API PÚBLICA — DOCUMENTOS
     ================================================================ */
  const Documentos = {
    getAll: async () => {
      if (modoRed) return apiFetch('/api/documentos');
      return idbGetAll('documentos');
    },
    getById: async (id) => {
      if (modoRed) return apiFetch(`/api/documentos/${id}`);
      return idbGet('documentos', id);
    },
    save: async (record) => {
      if (modoRed) {
        const r = await apiFetch('/api/documentos', { method: 'POST', body: record });
        record.id = r.id;
        return r.id;
      }
      return idbSave('documentos', record);
    },
    remove: async (id) => {
      if (modoRed) return apiFetch(`/api/documentos/${id}`, { method: 'DELETE' });
      return idbRemove('documentos', id);
    },
  };

  /* ================================================================
     API PÚBLICA — CONFIG
     ================================================================ */
  const Config = {
    getAll: async () => {
      if (modoRed) return apiFetch('/api/config');
      return idbGetAll('config');
    },
    get: async (key) => {
      if (modoRed) {
        const all = await apiFetch('/api/config');
        return all.find(c => c.key === key) || null;
      }
      return idbGet('config', key);
    },
    set: async (key, value) => {
      if (modoRed) return apiFetch('/api/config', { method: 'POST', body: { key, value } });
      return idbSave('config', { key, value });
    },
  };

  return { init, getModo, ATS, Emergencias, Documentos, Config };

})();
