// Estado de la app: vista visible, datos de la vista general y lo elegido en la vista por comunicación.
import { computed, effect, signal } from '@preact/signals';
import { api } from '@/services/api.mjs';
import { localCache } from '@/services/localCache.mjs';
import { readStored, removeStored, writeStored } from '@/services/storage.mjs';
import { messageText } from '@shared/messages.mjs';
import { dayLong } from '@/lib/format.mjs';

export const view = signal('general');
/** Vista general: { status: 'loading' | 'ready' | 'error', data, error, stale }. stale = lo guardado mientras llega lo nuevo. */
export const overview = signal({ status: 'loading', data: null, error: '', stale: false });
/** Clave de los datos vigente: entra en la clave de cada carga, así «Actualizar datos» vuelve a pedir lo abierto. */
export const dataKey = computed(() => overview.value.data?.cacheKey || '');
/** Aviso corto abajo (actualizar, errores): { text, level } o null. Cada aviso queda también en la actividad. */
export const notice = signal(null);

/** Actividad de esta sesión (barra de estado): { id, level, text, at }, la más reciente primero. */
export const activity = signal([]);
/** Cuántas entradas llegaron sin que se viera la actividad. */
export const unseenActivity = signal(0);
export const activityOpen = signal(false);
/** «Actualizar datos» en curso. */
export const refreshing = signal(false);
/** La hoja cambió después de cargar los datos (se revisa cada pocos minutos): hay que actualizar para verlo. */
export const sheetChanged = signal(false);
/** Correo de quien usa la app (viene con la página; en desarrollo, del backend local). */
export const userEmail = signal(String(globalThis.APP_BOOT?.email || ''));

const ACTIVITY_MAX = 50;
let activityId = 0;
/** Anota algo en la actividad. quiet: no suma a «sin ver» (lo que pasa solo, como la carga inicial). */
export function logActivity(text, level = 'info', { quiet = false } = {}) {
  activityId += 1;
  activity.value = [{ id: activityId, level, text, at: new Date() }, ...activity.value].slice(0, ACTIVITY_MAX);
  if (!quiet && !activityOpen.value) unseenActivity.value += 1;
}

export function markActivitySeen() {
  unseenActivity.value = 0;
}

/** Hora «10:42» de un ISO con zona («2026-11-14T10:42:05-05:00»), tal como la dio el servidor (hora de Lima). */
export const clockOf = iso => String(iso || '').slice(11, 16);

/** Lo elegido en «Por comunicación»: mes, día, búsqueda, envío y pestaña (la pestaña se recuerda entre visitas). */
export const pick = signal({ month: '', day: '', q: '', job: '', tab: readStored('tab', 'funnel') });
// computed solo avisa cuando cambia la pestaña: escribir en el buscador no toca localStorage.
const pickedTab = computed(() => pick.value.tab);
effect(() => { writeStored('tab', pickedTab.value); });

const CACHED_OVERVIEW = 'overview';
// La vista general iba en localStorage; ahora va en la caché del navegador (IndexedDB).
removeStored('overview_v1');

/** Vista general recién llegada del servidor: se muestra, se guarda y se precarga el mes más reciente. */
let warnedHeaders = '';
/** Columnas que faltan en la hoja: quedan en la actividad (una vez por versión de los datos). */
function warnHeaders(data) {
  const issues = data.headerIssues || [];
  if (!issues.length || warnedHeaders === data.cacheKey) return;
  warnedHeaders = data.cacheKey;
  issues.forEach(issue => logActivity(messageText('HEADERS_MISSING', { sheet: issue.sheet, columns: issue.missing.join(', ') }), 'warning'));
}

function setOverview(data) {
  overview.value = { status: 'ready', data, error: '', stale: false };
  warnHeaders(data);
  sheetChanged.value = false;
  watchSheet();
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
/**
 * «Información nueva disponible» si la hoja cambió desde la última visita (otra versión de los datos). Si solo cambió el
 * día (mismos datos) o es la primera visita, no se avisa.
 */
function announceNew(previousKey, data) {
  if (!previousKey || versionOf(previousKey) === versionOf(data.cacheKey)) return;
  const last = data.available?.lastDay;
  showNotice(last ? messageText('DATA_NEW', { day: dayLong(last) }) : messageText('DATA_REFRESHED'), 'info');
}

export async function loadOverview() {
  if (!userEmail.value) api.getServerInfo().then(info => { userEmail.value = info.email || ''; }).catch(() => {});
  const boot = globalThis.APP_BOOT?.overview;
  if (boot) {
    // Vino con la página: se muestra ya. Lo guardado (leído antes de reemplazarlo) dice si es información nueva.
    const before = localCache.peek(CACHED_OVERVIEW);
    setOverview(boot);
    before.then(stored => announceNew(stored?.dataKey, boot));
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
      warnHeaders(stored.data);
      prefetchLatestMonth(stored.data);
      watchSheet();
      return;
    }
    // Sin nada guardado o con otra versión de la hoja: aviso de carga. Si solo cambió el día, se carga en silencio.
    const newSheet = !stored || !key || versionOf(key) !== versionOf(stored.dataKey);
    if (stored) overview.value = { ...overview.value, stale: true };
    if (newSheet) showNotice(messageText(stored ? 'DATA_LOADING_NEW' : 'DATA_LOADING'), 'info', { busy: true });
    const data = await api.getOverview();
    setOverview(data);
    if (!stored) showNotice(messageText('DATA_READY'), 'success');
    else if (newSheet) { announceNew(stored.dataKey, data); if (notice.value?.busy) dismissNotice(); }
  } catch (error) {
    if (stored) {
      overview.value = { ...overview.value, stale: true };
      showNotice(error.text || messageText('SCREEN_FAILED'), 'error');
    } else {
      dismissNotice();
      overview.value = { status: 'error', data: null, error: error.text || messageText('SCREEN_FAILED'), stale: false };
    }
  }
}

export function refreshOverview() {
  if (refreshing.value) return Promise.resolve();
  refreshing.value = true;
  return api.refreshData().then(data => {
    setOverview(data);
    showNotice(messageText('DATA_REFRESHED'), 'success');
  }).catch(error => showNotice(error.text || messageText('SCREEN_FAILED'), 'error'))
    .finally(() => { refreshing.value = false; });
}

// Cada cuánto se pregunta si la hoja cambió (solo la clave de los datos: es liviano) y solo con la pestaña a la vista.
const WATCH_MS = 2 * 60 * 1000;
let watching = false;
/** Versión de los datos de una clave «s4:v12:2026-11-14» (sin el día: cambiar de día no es un cambio de la hoja). */
const versionOf = key => String(key || '').split(':').slice(0, 2).join(':');
function watchSheet() {
  if (watching) return;
  watching = true;
  setInterval(() => {
    if (sheetChanged.value || refreshing.value || globalThis.document?.visibilityState === 'hidden') return;
    const current = dataKey.value;
    api.getCacheKey().then(key => {
      if (key && current && versionOf(key) !== versionOf(current) && !sheetChanged.value) {
        sheetChanged.value = true;
        logActivity(messageText('SHEET_CHANGED'), 'warning');
      }
    }).catch(() => {});
  }, WATCH_MS);
}

let noticeTimer = null;
/**
 * Aviso corto abajo; queda también en la actividad. busy: de carga (con su ícono girando), queda hasta que lo reemplace
 * otro aviso y no va a la actividad.
 */
export function showNotice(text, level = 'success', { busy = false } = {}) {
  notice.value = { text, level, busy };
  clearTimeout(noticeTimer);
  if (busy) return;
  logActivity(text, level);
  noticeTimer = setTimeout(() => { notice.value = null; }, level === 'info' ? 8000 : 5000);
}

export function dismissNotice() {
  clearTimeout(noticeTimer);
  notice.value = null;
}

/** Abre la vista por comunicación en un día (y, si se indica, en un envío), en la última pestaña usada. */
export function openCommunication({ day, job = '', tab = pick.value.tab }) {
  pick.value = { month: day.slice(0, 7), day, q: '', job, tab };
  view.value = 'comm';
  globalThis.scrollTo?.({ top: 0 });
}
