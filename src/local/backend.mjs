// Backend local para `npm run dev`: ejecuta el Code.gs real (módulo virtual:gas-server) sobre el emulador de Apps
// Script, con datos de ejemplo de src/local/sampleData.mjs. La app solo lee la hoja, así que no se guarda nada: cada
// recarga parte de los mismos datos. Nunca se publica (verify-build busca la marca app_local_backend_cd1).
import serverCode from 'virtual:gas-server';
import { createFakeSpreadsheet, createGasGlobals } from './gasEmulator.mjs';
import { sampleSpreadsheet } from './sampleData.mjs';

export const LOCAL_BACKEND_MARK = 'app_local_backend_cd1';

/** Huella numérica (FNV-1a) de un texto. */
function fingerprint(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return hash >>> 0;
}

export function createLocalBackend() {
  const sample = sampleSpreadsheet(new Date());
  const fake = createFakeSpreadsheet(sample);
  // La versión de los datos sale de los datos de ejemplo: si cambian (otro día, otro generador), la caché del
  // navegador deja de valer; si son los mismos, se aprovecha entre recargas como en Apps Script.
  const properties = { APP_DATA_VERSION: String(fingerprint(JSON.stringify(sample))) };
  const gas = createGasGlobals({ spreadsheet: fake, activeEmail: 'maria.quispe@local.test', properties });
  const names = Object.keys(gas.globals);
  // Code.gs declara funciones globales: un eval dentro del mismo ámbito las expone por nombre.
  const resolve = new Function(...names, `${serverCode}\nreturn function (name) { return eval(name); };`)(...names.map(name => gas.globals[name]));
  resolve('setupApplication')();
  const dev = { mark: LOCAL_BACKEND_MARK, rows: () => fake.rows('EmailSummary_NotSent').length - 1 };
  return new Proxy({}, {
    get(_, method) {
      if (method === '__dev') return dev;
      // 'then' indefinido: el proxy no debe parecer una promesa.
      if (typeof method !== 'string' || method === 'then' || !/^[a-z][A-Za-z]*$/.test(method)) return undefined;
      return (...args) => {
        let fn;
        try { fn = resolve(method); } catch { fn = null; }
        if (typeof fn !== 'function') throw new Error(`El servidor no tiene la función ${method}.`);
        return fn(...args);
      };
    }
  });
}
