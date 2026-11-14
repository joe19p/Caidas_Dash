/**
 * Caché del servidor (CacheService): guarda un JSON grande partido en trozos (cada valor admite ~100 KB).
 * La clave lleva la versión de los datos, así una escritura (bumpDataVersion_) deja la copia anterior sin uso
 * y no hace falta borrarla. Si la caché falla, se calcula de nuevo: nunca es la fuente de verdad.
 */

const CACHE_SECONDS = 6 * 60 * 60;
const CACHE_CHUNK = 90000;

function cachedJson_(key, build) {
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
