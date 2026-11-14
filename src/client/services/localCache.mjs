// Caché del navegador (IndexedDB): lo que ya se pidió al servidor (vista general, meses, comunicaciones) queda
// guardado entre visitas, atado a la clave de los datos («s4:v12:2026-11-14»: formato, versión y día; ver
// clientCacheKey_ en el servidor). Cada entrada depende solo de lo que la cambia (scope):
//   - 'version': la lista de un mes, una búsqueda, una comparación (cambian solo si cambia la hoja);
//   - 'month': un periodo cerrado, el detalle de una comunicación («lo normal» son los 3 meses cerrados);
//   - 'day': la vista general y un periodo que llega a hoy.
// Al cambiar el día se descarta solo lo que dependía del día; al cambiar la hoja, todo. Sin IndexedDB (bloqueado o en
// pruebas) no guarda nada y todo va al servidor: nunca es la fuente de verdad.

const DB_NAME = 'caidas_dash';
const STORE = 'entries';
const OPEN_TIMEOUT_MS = 3000;
const SCOPES = ['version', 'month', 'day'];

/** La parte de la clave de los datos de la que depende un scope. */
export function scopedKey(dataKey, scope = 'day') {
  const [schema = '', version = '', day = ''] = String(dataKey || '').split(':');
  if (scope === 'version') return `${schema}:${version}`;
  if (scope === 'month') return `${schema}:${version}:${day.slice(0, 7)}`;
  return `${schema}:${version}:${day}`;
}

/**
 * Caché sobre un almacén { get(id), put(entry), prune(isCurrent) } que abre `openStore` (una vez, al primer uso).
 * Cada entrada es { id, scope, dataKey (la clave de su scope), savedAt, data }.
 */
export function createLocalCache(openStore) {
  let dataKey = null;
  let opening = null;
  const store = () => (opening ||= Promise.resolve().then(openStore).catch(() => null));
  const safely = async (run, fallback) => {
    try {
      const target = await store();
      return target ? await run(target) : fallback;
    } catch {
      return fallback;
    }
  };
  const isCurrent = entry => SCOPES.includes(entry.scope || 'day') && entry.dataKey === scopedKey(dataKey, entry.scope || 'day');

  return {
    /** Clave de los datos vigente (null hasta que el servidor la da). */
    get dataKey() {
      return dataKey;
    },
    /** Fija la clave vigente y borra lo que ya no vale con ella (según el scope de cada entrada). */
    setDataKey(next) {
      if (!next || next === dataKey) return Promise.resolve();
      dataKey = next;
      return safely(target => target.prune(isCurrent));
    },
    /** Lo guardado que sigue valiendo con la clave vigente, o null. */
    get(id) {
      if (!dataKey) return Promise.resolve(null);
      return safely(async target => {
        const entry = await target.get(id);
        return entry && isCurrent(entry) ? entry.data : null;
      }, null);
    },
    /** Lo guardado con cualquier clave ({ dataKey, data } o null): para mostrar algo mientras llega lo vigente. */
    peek(id) {
      return safely(async target => {
        const entry = await target.get(id);
        return entry ? { dataKey: entry.dataKey, data: entry.data } : null;
      }, null);
    },
    /** Guarda con la clave vigente de su scope (sin clave no guarda: no sabría cuándo deja de valer). */
    put(id, data, scope = 'day') {
      if (!dataKey) return Promise.resolve();
      const key = scopedKey(dataKey, scope);
      return safely(target => target.put({ id, scope, dataKey: key, savedAt: Date.now(), data }));
    }
  };
}

/** Almacén en memoria (pruebas, o como modelo del de IndexedDB). */
export function createMemoryStore() {
  const entries = new Map();
  return {
    get: async id => entries.get(id) ?? null,
    put: async entry => { entries.set(entry.id, structuredClone(entry)); },
    prune: async isCurrent => {
      for (const [id, entry] of entries) if (!isCurrent(entry)) entries.delete(id);
    },
    size: () => entries.size
  };
}

const request = req => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

/** Almacén en IndexedDB. Falla (y la caché queda apagada) si no existe, está bloqueado o no abre a tiempo. */
export function openIndexedDbStore(factory = globalThis.indexedDB) {
  if (!factory) return Promise.reject(new Error('Sin IndexedDB'));
  const opened = new Promise((resolve, reject) => {
    const req = factory.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB bloqueado'));
  });
  // Algunos navegadores en modo privado dejan la apertura colgada.
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('IndexedDB no respondió')), OPEN_TIMEOUT_MS));
  return Promise.race([opened, timeout]).then(db => {
    const objects = mode => db.transaction(STORE, mode).objectStore(STORE);
    return {
      get: id => request(objects('readonly').get(id)).then(entry => entry ?? null),
      put: entry => request(objects('readwrite').put(entry)),
      prune: isCurrent => new Promise((resolve, reject) => {
        const cursorRequest = objects('readwrite').openCursor();
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) return resolve();
          if (!isCurrent(cursor.value)) cursor.delete();
          cursor.continue();
        };
        cursorRequest.onerror = () => reject(cursorRequest.error);
      })
    };
  });
}

/** La caché de la app. */
export const localCache = createLocalCache(() => openIndexedDbStore());
