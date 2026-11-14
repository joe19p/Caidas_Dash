/**
 * Errores de dominio. Se lanzan con messageError(código, parámetros) de shared/messages.mjs.
 * google.script.run solo entrega el mensaje al navegador, así que runApi_ lo envuelve con el
 * código en JSON y el cliente lo decodifica (services/transport.mjs).
 */

const APP_FAILURE_PREFIX = 'APP_FAILURE:';

function assert_(condition, code, params) {
  if (!condition) throw messageError(code, params || {});
}

/** Desde cuántos milisegundos una llamada queda anotada como lenta en el registro de ejecuciones. */
const API_SLOW_MS = 4000;

/**
 * Ejecuta una función pública (name: su nombre, para el registro): los errores salen con código estable; los
 * inesperados y las llamadas lentas quedan en el registro de ejecuciones de Apps Script con su nombre y duración.
 */
function runApi_(task, name) {
  // Cada llamada empieza leyendo las hojas de nuevo (la memoria es solo de esta llamada).
  forgetTables_();
  const started = Date.now();
  const label = name || 'api';
  try {
    const result = task();
    const elapsed = Date.now() - started;
    if (elapsed >= API_SLOW_MS) console.warn(`Lenta: ${label} tardó ${(elapsed / 1000).toFixed(1)} s`);
    return result;
  } catch (error) {
    const failure = messageFailure(error);
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    if (failure.code === 'UNEXPECTED_ERROR') console.error(`${label} falló a los ${elapsed} s: ${error && error.stack ? error.stack : error}`);
    else console.info(`${label}: ${failure.code}`);
    throw new Error(APP_FAILURE_PREFIX + JSON.stringify(failure), { cause: error });
  }
}
