// localStorage con try/catch: en ventanas privadas o con datos bloqueados puede fallar o venir vacío.
const PREFIX = 'cd_';

export function readStored(key, fallback = null) {
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeStored(key, value) {
  try {
    globalThis.localStorage?.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStored(key) {
  try {
    globalThis.localStorage?.removeItem(PREFIX + key);
  } catch {
    /* Sin almacenamiento: no hay nada que borrar. */
  }
}
