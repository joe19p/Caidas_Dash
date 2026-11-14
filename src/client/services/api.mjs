// Funciones del servidor que usa el cliente. Lo ya pedido se recuerda en memoria (meses y detalles no cambian hasta
// «Actualizar datos»), así volver a un día o a una comunicación es instantáneo.
import { callServer } from './transport.mjs';

const memory = new Map();

function remembered(key, load) {
  if (!memory.has(key)) memory.set(key, load().catch(error => { memory.delete(key); throw error; }));
  return memory.get(key);
}

export const api = {
  getOverview: () => callServer('getOverview'),
  getMonth: month => remembered(`month:${month}`, () => callServer('getMonth', month)),
  getCommunication: job => remembered(`job:${job}`, () => callServer('getCommunication', job)),
  /** Relee la hoja: olvida lo recordado y devuelve la vista general nueva. */
  refreshData: () => {
    memory.clear();
    return callServer('refreshData');
  }
};
