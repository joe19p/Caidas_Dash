// google.script.run como promesas. Sin Apps Script (npm run dev) usa el backend local de src/local,
// que ejecuta el mismo Code.gs en el navegador.
import { signal } from '@preact/signals';
import { messageFromError, messageText } from '@shared/messages.mjs';

const FAILURE_PREFIX = 'APP_FAILURE:';
let localBackend = null;

/**
 * El servidor lanza "APP_FAILURE:{json}" (runApi_); Apps Script puede anteponer "Error: " o
 * "Exception: ". Devuelve un Error con code, params y text (el mensaje para mostrar).
 */
export function decodeFailure(error) {
  const raw = String(error?.message ?? error ?? '');
  const start = raw.indexOf(FAILURE_PREFIX);
  if (start === -1) {
    const plain = error instanceof Error ? error : new Error(raw);
    plain.text = plain.text || plain.message;
    return plain;
  }
  try {
    const failure = JSON.parse(raw.slice(start + FAILURE_PREFIX.length));
    const decoded = new Error(failure.message);
    decoded.code = failure.code;
    decoded.params = failure.params || {};
    decoded.text = messageFromError(decoded).text;
    return decoded;
  } catch {
    const fallback = new Error(raw);
    fallback.text = raw;
    return fallback;
  }
}

async function local() {
  if (!localBackend) {
    const { createLocalBackend } = await import('@local/backend.mjs');
    localBackend = createLocalBackend();
  }
  return localBackend;
}

/** Herramientas del backend local (cambiar de usuario, reiniciar datos). null fuera de desarrollo. */
export async function localDevTools() {
  if (!import.meta.env.DEV || globalThis.google?.script?.run) return null;
  return (await local()).__dev;
}

/** Llamadas al servidor en curso que alguien está esperando ver (la barra de carga de arriba). */
export const waitingCalls = signal(0);
const READS = /^(get|refresh)/;

/** Si la barra de carga debe contar esta llamada. */
export function isWaited(method) {
  return READS.test(method);
}

/** Llama a una función pública del servidor (las que se esperan, con la barra de carga). */
export function callServer(method, ...args) {
  if (!isWaited(method)) return rawCall(method, ...args);
  waitingCalls.value += 1;
  return rawCall(method, ...args).finally(() => { waitingCalls.value -= 1; });
}

function rawCall(method, ...args) {
  const run = globalThis.google?.script?.run;
  if (run) {
    return new Promise((resolve, reject) => {
      run.withSuccessHandler(resolve).withFailureHandler(error => reject(decodeFailure(error)))[method](...args);
    });
  }
  // El backend local solo existe en desarrollo: el build de Apps Script lo descarta.
  if (import.meta.env.DEV) {
    return local().then(backend => {
      // Asíncrono como google.script.run, y con copia: el cliente no comparte objetos con el "servidor".
      try {
        return structuredClone(backend[method](...args));
      } catch (error) {
        throw decodeFailure(error);
      }
    });
  }
  return Promise.reject(new Error(messageText('SCRIPT_RUN_UNAVAILABLE')));
}
