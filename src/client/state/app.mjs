// Estado de la app: vista visible, datos de la vista general y lo elegido en la vista por comunicación.
import { computed, effect, signal } from '@preact/signals';
import { api } from '@/services/api.mjs';
import { localCache } from '@/services/localCache.mjs';
import { readStored, removeStored, writeStored } from '@/services/storage.mjs';
import { messageText } from '@shared/messages.mjs';

export const view = signal('general');
/** Vista general: { status: 'loading' | 'ready' | 'error', data, error, stale }. stale = lo guardado mientras llega lo nuevo. */
export const overview = signal({ status: 'loading', data: null, error: '', stale: false });
/** Clave de los datos vigente: entra en la clave de cada carga, así «Actualizar datos» vuelve a pedir lo abierto. */
export const dataKey = computed(() => overview.value.data?.cacheKey || '');
/** Aviso corto abajo (actualizar, errores): { text, level } o null. */
export const notice = signal(null);

/** Lo elegido en «Por comunicación»: mes, día, búsqueda, envío y pestaña (la pestaña se recuerda entre visitas). */
export const pick = signal({ month: '', day: '', q: '', job: '', tab: readStored('tab', 'funnel') });
// computed solo avisa cuando cambia la pestaña: escribir en el buscador no toca localStorage.
const pickedTab = computed(() => pick.value.tab);
effect(() => { writeStored('tab', pickedTab.value); });

const CACHED_OVERVIEW = 'overview';
// La vista general iba en localStorage; ahora va en la caché del navegador (IndexedDB).
removeStored('overview_v1');

/** Vista general recién llegada del servidor: se muestra, se guarda y se precarga el mes más reciente. */
function setOverview(data) {
  overview.value = { status: 'ready', data, error: '', stale: false };
  localCache.setDataKey(data.cacheKey).then(() => localCache.put(CACHED_OVERVIEW, data));
  prefetchLatestMonth(data);
}

let prefetched = '';
/** Deja listo el mes más reciente para «Por comunicación», cuando el navegador esté libre. */
function prefetchLatestMonth(data) {
  const month = data.available?.months?.[0];
  if (!month || prefetched === `${data.cacheKey}:${month}`) return;
  prefetched = `${data.cacheKey}:${month}`;
  const run = () => { api.prefetchMonth(month).catch(() => { prefetched = ''; }); };
  // Con tiempo máximo: en una pestaña en segundo plano el navegador puede no quedar nunca «libre».
  if (globalThis.requestIdleCallback) globalThis.requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 1500);
}

/**
 * Al abrir: lo que vino con la página; si no vino, lo guardado en el navegador al instante y se confirma con el
 * servidor (si la clave de los datos no cambió, no hace falta pedir la vista general otra vez).
 */
export async function loadOverview() {
  const boot = globalThis.APP_BOOT?.overview;
  if (boot) {
    setOverview(boot);
    return;
  }
  const stored = await localCache.peek(CACHED_OVERVIEW);
  // Lo guardado se muestra al instante y sin aviso: casi siempre sigue vigente.
  if (stored) overview.value = { status: 'ready', data: stored.data, error: '', stale: false };
  try {
    const key = stored ? await api.getCacheKey().catch(() => null) : null;
    if (key && key === stored.dataKey) {
      // Vigente: no se vuelve a dibujar ni a guardar; solo se fija la clave para leer meses y comunicaciones.
      await localCache.setDataKey(key);
      prefetchLatestMonth(stored.data);
      return;
    }
    // Cambió (o no se pudo confirmar): el aviso sale solo mientras llega lo nuevo.
    if (stored) overview.value = { ...overview.value, stale: true };
    setOverview(await api.getOverview());
  } catch (error) {
    if (stored) {
      overview.value = { ...overview.value, stale: true };
      showNotice(error.text || messageText('SCREEN_FAILED'), 'error');
    } else {
      overview.value = { status: 'error', data: null, error: error.text || messageText('SCREEN_FAILED'), stale: false };
    }
  }
}

export function refreshOverview() {
  return api.refreshData().then(data => {
    setOverview(data);
    showNotice(messageText('DATA_REFRESHED'), 'success');
  }).catch(error => showNotice(error.text || messageText('SCREEN_FAILED'), 'error'));
}

let noticeTimer = null;
export function showNotice(text, level = 'success') {
  notice.value = { text, level };
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice.value = null; }, 5000);
}

/** Abre la vista por comunicación en un día (y, si se indica, en un envío), en la última pestaña usada. */
export function openCommunication({ day, job = '', tab = pick.value.tab }) {
  pick.value = { month: day.slice(0, 7), day, q: '', job, tab };
  view.value = 'comm';
  globalThis.scrollTo?.({ top: 0 });
}
