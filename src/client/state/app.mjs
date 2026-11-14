// Estado de la app: vista visible, datos de la vista general y lo elegido en la vista por comunicación.
import { signal } from '@preact/signals';
import { api } from '@/services/api.mjs';
import { readStored, writeStored } from '@/services/storage.mjs';
import { messageText } from '@shared/messages.mjs';

export const view = signal('general');
/** Vista general: { status: 'loading' | 'ready' | 'error', data, error, stale }. stale = lo guardado mientras llega lo nuevo. */
export const overview = signal({ status: 'loading', data: null, error: '', stale: false });
/** Aviso corto abajo (actualizar, errores): { text, level } o null. */
export const notice = signal(null);

/** Lo elegido en «Por comunicación»: mes, día, búsqueda, envío y pestaña. */
export const pick = signal({ month: '', day: '', q: '', job: '', tab: 'resumen' });

const STORED_OVERVIEW = 'overview_v1';

function setOverview(data, stale = false) {
  overview.value = { status: 'ready', data, error: '', stale };
  if (!stale) writeStored(STORED_OVERVIEW, data);
}

/** Al abrir: lo que vino con la página o lo guardado, y detrás lo nuevo. */
export function loadOverview() {
  const boot = globalThis.APP_BOOT?.overview;
  if (boot) {
    setOverview(boot);
    return Promise.resolve();
  }
  const stored = readStored(STORED_OVERVIEW);
  if (stored) setOverview(stored, true);
  return api.getOverview().then(data => setOverview(data)).catch(error => {
    if (stored) {
      overview.value = { ...overview.value, stale: true };
      showNotice(error.text || messageText('SCREEN_FAILED'), 'error');
    } else {
      overview.value = { status: 'error', data: null, error: error.text || messageText('SCREEN_FAILED'), stale: false };
    }
  });
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

/** Abre la vista por comunicación en un día (y, si se indica, en un envío). */
export function openCommunication({ day, job = '', tab = 'resumen' }) {
  pick.value = { month: day.slice(0, 7), day, q: '', job, tab };
  view.value = 'comm';
  globalThis.scrollTo?.({ top: 0 });
}
