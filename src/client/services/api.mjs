// Funciones del servidor que usa el cliente. Meses y detalles no cambian hasta que cambia la clave de los datos, así
// que se recuerdan en memoria (en esta visita) y en la caché del navegador (entre visitas): volver a un día o a una
// comunicación es instantáneo.
import { callServer, callServerQuietly } from './transport.mjs';
import { localCache, scopedKey } from './localCache.mjs';

const memory = new Map();

function remembered(key, load) {
  if (!memory.has(key)) memory.set(key, load().catch(error => { memory.delete(key); throw error; }));
  return memory.get(key);
}

/**
 * Lo guardado en el navegador o, si no hay, lo del servidor (y se guarda). scope: de qué depende ('version', 'month'
 * o 'day', ver localCache.mjs): al día siguiente solo se vuelve a pedir lo que depende del día.
 */
async function cached(key, load, scope) {
  const stored = await localCache.get(key);
  if (stored) return stored;
  const data = await load();
  localCache.put(key, data, scope);
  return data;
}

/** Un periodo cerrado vale todo el mes; el que llega al mes en curso, solo el día (se corta hoy). */
const periodScope = to => (to < scopedKey(localCache.dataKey).split(':')[2]?.slice(0, 7) ? 'month' : 'day');

const month = (call, value) => remembered(`month:${value}`, () => cached(`month:${value}`, () => call('getMonth', value), 'version'));

export const api = {
  getOverview: () => callServer('getOverview'),
  getCacheKey: () => callServerQuietly('getCacheKey'),
  /** Quién usa la app y en qué entorno (sin barra de carga). */
  getServerInfo: () => callServerQuietly('getServerInfo'),
  /** Un periodo a elección (los que terminan en el mes en curso ya vienen en la vista general). */
  getPeriod: (from, to) => remembered(`period:${from}:${to}`, () => cached(`period:${from}:${to}`, () => callServer('getPeriod', from, to), periodScope(to))),
  /** Búsqueda en todos los meses (palabras separadas por coma; 'O' alguna, 'Y' todas). */
  searchAll: (query, mode) => remembered(`search:${mode}:${query}`, () => cached(`search:${mode}:${query}`, () => callServer('searchCommunications', query, mode), 'version')),
  /** Varias comunicaciones lado a lado. */
  getCompare: jobs => remembered(`compare:${jobs.join(',')}`, () => cached(`compare:${jobs.join(',')}`, () => callServer('getCompare', jobs), 'version')),
  getMonth: value => month(callServer, value),
  /** Igual que getMonth, sin barra de carga: para tenerlo listo antes de que se pida. */
  prefetchMonth: value => month(callServerQuietly, value),
  getCommunication: job => remembered(`job:${job}`, () => cached(`job:${job}`, () => callServer('getCommunication', job), 'month')),
  /** Relee la hoja: olvida lo recordado y devuelve la vista general nueva (con su clave nueva). */
  refreshData: () => {
    memory.clear();
    return callServer('refreshData');
  }
};
