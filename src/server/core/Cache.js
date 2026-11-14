/**
 * Caché del servidor (CacheService): guarda un JSON grande partido en trozos (cada valor admite ~100 KB).
 * La clave lleva la versión de los datos, así una escritura (bumpDataVersion_) deja la copia anterior sin uso
 * y no hace falta borrarla. Si la caché falla, se calcula de nuevo: nunca es la fuente de verdad.
 */

const CACHE_SECONDS = 6 * 60 * 60;
const CACHE_CHUNK = 90000;
// CacheService admite claves de hasta 250 caracteres; los trozos agregan «:N».
const CACHE_KEY_MAX = 200;

/** Huella corta (FNV-1a, base 36) de un texto: para claves largas (una comparación de 50 envíos, una búsqueda larga). */
function cacheFingerprint_(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(36);
}

function cachedJson_(name, build) {
  // Con el formato en la clave: tras publicar una versión con otra forma de datos, no se lee lo de la anterior.
  const full = `s${APP.CACHE_SCHEMA}:${name}`;
  const key = full.length > CACHE_KEY_MAX ? `${full.slice(0, 120)}~${full.length}~${cacheFingerprint_(full)}` : full;
  const cache = CacheService.getScriptCache();
  try {
    const count = Number(cache.get(key));
    if (count > 0) {
      const keys = Array.from({ length: count }, (_, index) => `${key}:${index}`);
      const parts = cache.getAll(keys);
      if (keys.every(part => typeof parts[part] === 'string')) return JSON.parse(keys.map(part => parts[part]).join(''));
    }
  } catch (error) {
    console.warn(`Caché ilegible (${key}): ${error && error.message}`);
  }
  const value = build();
  try {
    const text = JSON.stringify(value);
    const chunks = {};
    for (let index = 0; index * CACHE_CHUNK < text.length; index++) chunks[`${key}:${index}`] = text.slice(index * CACHE_CHUNK, (index + 1) * CACHE_CHUNK);
    cache.putAll(chunks, CACHE_SECONDS);
    // La cabecera va al final: quien lee nunca ve una copia a medias.
    cache.put(key, String(Object.keys(chunks).length), CACHE_SECONDS);
  } catch (error) {
    console.warn(`No se pudo guardar en caché (${key}): ${error && error.message}`);
  }
  return value;
}
