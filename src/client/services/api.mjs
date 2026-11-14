// Funciones del servidor que usa el cliente. Meses y detalles no cambian hasta que cambia la clave de los datos, así
// que se recuerdan en memoria (en esta visita) y en la caché del navegador (entre visitas): volver a un día o a una
// comunicación es instantáneo.
import { callServer, callServerQuietly } from './transport.mjs';
import { localCache } from './localCache.mjs';

const memory = new Map();

function remembered(key, load) {
  if (!memory.has(key)) memory.set(key, load().catch(error => { memory.delete(key); throw error; }));
  return memory.get(key);
}

/** Lo guardado en el navegador o, si no hay, lo del servidor (y se guarda). */
async function cached(key, load) {
  const stored = await localCache.get(key);
  if (stored) return stored;
  const data = await load();
  localCache.put(key, data);
  return data;
}

const month = (call, value) => remembered(`month:${value}`, () => cached(`month:${value}`, () => call('getMonth', value)));

export const api = {
  getOverview: () => callServer('getOverview'),
  getCacheKey: () => callServerQuietly('getCacheKey'),
  getMonth: value => month(callServer, value),
  /** Igual que getMonth, sin barra de carga: para tenerlo listo antes de que se pida. */
  prefetchMonth: value => month(callServerQuietly, value),
  getCommunication: job => remembered(`job:${job}`, () => cached(`job:${job}`, () => callServer('getCommunication', job))),
  /** Relee la hoja: olvida lo recordado y devuelve la vista general nueva (con su clave nueva). */
  refreshData: () => {
    memory.clear();
    return callServer('refreshData');
  }
};
