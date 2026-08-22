/* ================================================================
   SGAS — storage.js
   Abstracción automática:
   - Modo RED:   detecta servidor → usa API REST
   - Modo LOCAL: sin servidor     → usa IndexedDB
   ================================================================ */

const Storage = (() => {

  const SERVER_URL = 'https://sgas-server.onrender.com';
  let modoRed = false;
  let db      = null;

  async function init() {
    try {
      const res = await fetch(`${SERVER_URL}/api/ping`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) { modoRed = true; console.log('SGAS: Modo RED activo →', SERVER_URL); return; }
    } catch(e) {}
    await initIndexedDB();
    console.log('SGAS: Modo LOCAL activo (IndexedDB)');
  }

  function getModo() { return modoRed ? 'red' : 'local'; }

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

  const DB_NAME = 'SGAS_DB';
  const DB_VERSION = 3;

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
        if (!database.objectStoreNames.contains('categorias'))
          database.createObjectStore('categorias', { keyPath: 'id', autoIncrement: true });
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
      const r = record.id ? store.put(record) : store.add(record);
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

  const ATS = {
    getAll: async () => modoRed ? apiFetch('/api/ats') : idbGetAll('ats'),
    getByCategoria: async (cat) => modoRed ? apiFetch(`/api/ats?categoria=${encodeURIComponent(cat)}`) : idbGetByIndex('ats', 'categoria', cat),
    getById: async (id) => modoRed ? apiFetch(`/api/ats/${id}`) : idbGet('ats', id),
    save: async (record) => {
      if (modoRed) {
        if (record.id) { const r = await apiFetch(`/api/ats/${record.id}`, { method: 'PUT', body: record }); return r.id; }
        else { const r = await apiFetch('/api/ats', { method: 'POST', body: record }); record.id = r.id; return r.id; }
      }
      return idbSave('ats', record);
    },
    remove: async (id) => modoRed ? apiFetch(`/api/ats/${id}`, { method: 'DELETE' }) : idbRemove('ats', id),
  };

  const Emergencias = {
    getAll: async () => modoRed ? apiFetch('/api/emergencias') : idbGetAll('emergencias'),
    getById: async (id) => modoRed ? apiFetch(`/api/emergencias/${id}`) : idbGet('emergencias', id),
    save: async (record) => {
      if (modoRed) {
        if (record.id) { const r = await apiFetch(`/api/emergencias/${record.id}`, { method: 'PUT', body: record }); return r.id; }
        else { const r = await apiFetch('/api/emergencias', { method: 'POST', body: record }); record.id = r.id; return r.id; }
      }
      return idbSave('emergencias', record);
    },
    remove: async (id) => modoRed ? apiFetch(`/api/emergencias/${id}`, { method: 'DELETE' }) : idbRemove('emergencias', id),
  };

  const Documentos = {
    getAll: async () => modoRed ? apiFetch('/api/documentos') : idbGetAll('documentos'),
    getById: async (id) => modoRed ? apiFetch(`/api/documentos/${id}`) : idbGet('documentos', id),
    save: async (record) => {
      if (modoRed) { const r = await apiFetch('/api/documentos', { method: 'POST', body: record }); record.id = r.id; return r.id; }
      return idbSave('documentos', record);
    },
    remove: async (id) => modoRed ? apiFetch(`/api/documentos/${id}`, { method: 'DELETE' }) : idbRemove('documentos', id),
  };

  const Config = {
    getAll: async () => modoRed ? apiFetch('/api/config') : idbGetAll('config'),
    get: async (key) => {
      if (modoRed) { const all = await apiFetch('/api/config'); return all.find(c => c.key === key) || null; }
      return idbGet('config', key);
    },
    set: async (key, value) => modoRed ? apiFetch('/api/config', { method: 'POST', body: { key, value } }) : idbSave('config', { key, value }),
  };

  const Categorias = {
    getAll: async () => modoRed ? apiFetch('/api/categorias') : idbGetAll('categorias'),
    save: async (record) => {
      if (modoRed) {
        if (record.id) return apiFetch(`/api/categorias/${record.id}`, { method: 'PUT', body: record });
        const r = await apiFetch('/api/categorias', { method: 'POST', body: record });
        record.id = r.id; return r.id;
      }
      return idbSave('categorias', record);
    },
    remove: async (id) => modoRed ? apiFetch(`/api/categorias/${id}`, { method: 'DELETE' }) : idbRemove('categorias', id),
  };

  return { init, getModo, ATS, Emergencias, Documentos, Config, Categorias };

})();
