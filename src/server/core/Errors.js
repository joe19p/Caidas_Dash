/**
 * Errores de dominio. Se lanzan con messageError(código, parámetros) de shared/messages.mjs.
 * google.script.run solo entrega el mensaje al navegador, así que runApi_ lo envuelve con el
 * código en JSON y el cliente lo decodifica (services/transport.mjs).
 */

const APP_FAILURE_PREFIX = 'APP_FAILURE:';

function assert_(condition, code, params) {
  if (!condition) throw messageError(code, params || {});
}

/** Ejecuta una función pública: los errores salen con código estable y los inesperados quedan en el log. */
function runApi_(task) {
  // Cada llamada empieza leyendo las hojas de nuevo (la memoria es solo de esta llamada).
  forgetTables_();
  try {
    return task();
  } catch (error) {
    const failure = messageFailure(error);
    if (failure.code === 'UNEXPECTED_ERROR') console.error(error && error.stack ? error.stack : error);
    throw new Error(APP_FAILURE_PREFIX + JSON.stringify(failure), { cause: error });
  }
}
