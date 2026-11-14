// Caché del navegador (IndexedDB): lo que ya se pidió al servidor (vista general, meses, comunicaciones) queda
// guardado entre visitas, atado a la clave de los datos (versión y día, ver clientCacheKey_ en el servidor). Si la
// clave cambia, lo anterior se borra. Sin IndexedDB (bloqueado o en pruebas) no guarda nada y todo va al servidor:
// nunca es la fuente de verdad.

const DB_NAME = 'caidas_dash';
const STORE = 'entries';
const OPEN_TIMEOUT_MS = 3000;

/**
 * Caché sobre un almacén { get(id), put(entry), prune(dataKey) } que abre `openStore` (una vez, al primer uso).
 * Cada entrada es { id, dataKey, savedAt, data }.
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

  return {
    /** Clave de los datos vigente (null hasta que el servidor la da). */
    get dataKey() {
      return dataKey;
    },
    /** Fija la clave vigente y borra lo guardado con otra. */
    setDataKey(next) {
      if (!next || next === dataKey) return Promise.resolve();
      dataKey = next;
      return safely(target => target.prune(next));
    },
    /** Lo guardado con la clave vigente, o null. */
    get(id) {
      if (!dataKey) return Promise.resolve(null);
      return safely(async target => {
        const entry = await target.get(id);
        return entry && entry.dataKey === dataKey ? entry.data : null;
      }, null);
    },
    /** Lo guardado con cualquier clave ({ dataKey, data } o null): para mostrar algo mientras llega lo vigente. */
    peek(id) {
      return safely(async target => {
        const entry = await target.get(id);
        return entry ? { dataKey: entry.dataKey, data: entry.data } : null;
      }, null);
    },
    /** Guarda con la clave vigente (sin clave no guarda: no sabría cuándo deja de valer). */
    put(id, data) {
      if (!dataKey) return Promise.resolve();
      const key = dataKey;
      return safely(target => target.put({ id, dataKey: key, savedAt: Date.now(), data }));
    }
  };
}

/** Almacén en memoria (pruebas, o como modelo del de IndexedDB). */
export function createMemoryStore() {
  const entries = new Map();
  return {
    get: async id => entries.get(id) ?? null,
    put: async entry => { entries.set(entry.id, structuredClone(entry)); },
    prune: async dataKey => {
      for (const [id, entry] of entries) if (entry.dataKey !== dataKey) entries.delete(id);
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
      prune: dataKey => new Promise((resolve, reject) => {
        const cursorRequest = objects('readwrite').openCursor();
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) return resolve();
          if (cursor.value.dataKey !== dataKey) cursor.delete();
          cursor.continue();
        };
        cursorRequest.onerror = () => reject(cursorRequest.error);
      })
    };
  });
}

/** La caché de la app. */
export const localCache = createLocalCache(() => openIndexedDbStore());
