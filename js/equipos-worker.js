/* ================================================================
   SGAS — equipos-worker.js
   Web Worker: procesa el Excel sin bloquear la UI
   ================================================================ */

importScripts('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');

self.onmessage = function(e) {
  try {
    const { buffer } = e.data;
    
    self.postMessage({ tipo: 'progreso', msg: 'Leyendo archivo...' });
    
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    
    self.postMessage({ tipo: 'progreso', msg: 'Procesando filas...' });
    
    const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
    
    if (!json || json.length === 0) {
      self.postMessage({ tipo: 'error', msg: 'El archivo está vacío' });
      return;
    }

    const columnas = Object.keys(json[0]);
    
    self.postMessage({ tipo: 'progreso', msg: `${json.length.toLocaleString()} filas encontradas...` });
    
    self.postMessage({
      tipo: 'ok',
      columnas,
      datos: json,
      total: json.length,
    });
    
  } catch(err) {
    self.postMessage({ tipo: 'error', msg: err.message });
  }
};
