// Barra de estado (abajo, siempre visible; como la del cronograma). A la izquierda, de qué se habla: cuántos envíos hay
// en la hoja y qué se está viendo. A la derecha, el estado de los datos («Leídos de la hoja 10:42», «La hoja cambió»,
// «No se pudo leer la hoja»), «Actualizar» y «Actividad»: lo que pasó en esta sesión, con su hora.
import { useEffect, useRef } from 'preact/hooks';
import { cx, fmtInt, monthLong, monthShort, periodText } from '@/lib/format.mjs';
import {
  activity, activityOpen, clockOf, markActivitySeen, overview, refreshOverview, refreshing, sheetChanged, unseenActivity, view
} from '@/state/app.mjs';
import { commMonth, periodRange } from '@/state/period.mjs';
import { selected } from '@/state/search.mjs';
import { Icon } from '@/ui/Icon.jsx';
import { Popover } from '@/ui/Popover.jsx';

const isLocal = () => import.meta.env.DEV && !globalThis.google?.script?.run;
const ACTION = 'flex h-7 flex-none items-center gap-1.5 rounded-md px-2 text-[13px] font-semibold text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand-text disabled:opacity-60';
const LEVEL_DOT = { success: 'bg-success', error: 'bg-danger', warning: 'bg-warning', info: 'bg-brand-text' };
const TONES = { ok: 'text-success', muted: 'text-ink-muted', warn: 'text-warning-ink', bad: 'text-danger' };
const time = date => date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });

/** Estado de los datos: texto, tono, ayuda y si está trabajando. */
function dataStatus() {
  const state = overview.value;
  if (refreshing.value) return { text: 'Leyendo la hoja…', tone: 'muted', busy: true };
  if (state.status === 'loading') return { text: 'Cargando los datos…', tone: 'muted', busy: true };
  if (state.status === 'error') return { text: 'No se pudo leer la hoja', tone: 'bad', title: state.error };
  if (sheetChanged.value) return { text: 'La hoja cambió: actualiza para verlo', tone: 'warn', title: 'Alguien cambió la hoja después de cargar los datos.' };
  if (state.stale) return { text: 'Datos guardados en este navegador', tone: 'muted', busy: true, title: 'Se muestran mientras llegan los datos nuevos.' };
  const readAt = state.data?.readAt;
  if (!readAt) return { text: 'Datos al día', tone: 'ok' };
  const today = state.data.today === readAt.slice(0, 10);
  return {
    text: `Leídos de la hoja ${today ? '' : `el ${readAt.slice(8, 10)}/${readAt.slice(5, 7)} a las `}${clockOf(readAt)}`,
    tone: 'ok',
    title: 'Se vuelven a leer solos cuando alguien cambia la hoja; con Actualizar, en el momento.'
  };
}

/** Qué se está viendo, en una frase corta. */
function viewingText() {
  const data = overview.value.data;
  if (!data) return '';
  if (view.value === 'compare') {
    const count = selected.value.length;
    return count ? `${count} ${count === 1 ? 'comunicación elegida' : 'comunicaciones elegidas'}` : '';
  }
  if (view.value === 'comm') return commMonth.value ? `Viendo ${monthLong(commMonth.value)}` : '';
  const range = periodRange.value;
  if (!range) return '';
  const cut = range.to === data.current ? Number(String(data.today).slice(8, 10)) : null;
  return `Viendo ${periodText(range.from, range.to, cut)}`;
}

function ActivityPanel() {
  const anchor = useRef(null);
  const open = activityOpen.value;
  const unseen = unseenActivity.value;
  const entries = activity.value;
  useEffect(() => { if (open) markActivitySeen(); }, [open, entries]);
  const hasError = entries.slice(0, unseen).some(entry => entry.level === 'error');
  return (
    <div ref={anchor} class="relative">
      <button type="button" class={cx(ACTION, open && 'bg-surface-muted')} aria-expanded={open} onClick={() => { activityOpen.value = !open; }}
        title="Actividad de esta sesión" aria-label={unseen ? `Actividad: ${unseen} sin ver` : 'Actividad'}>
        <Icon name="history" size={14} class="text-ink-muted" /><span class="max-sm:hidden">Actividad</span>
        {unseen > 0 && <span class={cx('min-w-[18px] rounded-full px-1 text-center text-xs font-extrabold', hasError ? 'bg-danger-soft text-danger-ink' : 'bg-brand-soft text-brand-text')}>{unseen}</span>}
      </button>
      <Popover open={open} onClose={() => { activityOpen.value = false; }} anchor={anchor} placement="top" align="right" label="Actividad de esta sesión" class="w-96 overflow-hidden">
        <p class="border-b border-line px-4 py-2.5 text-sm font-bold">Actividad de esta sesión</p>
        <ul class="max-h-80 divide-y divide-line overflow-y-auto">
          {!entries.length && <li class="px-4 py-6 text-center text-sm text-ink-muted">Aquí verás cuándo se actualizan los datos y si algo necesita tu atención.</li>}
          {entries.map(entry => (
            <li key={entry.id} class="flex gap-3 px-4 py-2.5 text-[13px]">
              <span class={cx('mt-1.5 size-2 flex-none rounded-full', LEVEL_DOT[entry.level] || LEVEL_DOT.info)} aria-hidden="true" />
              <span class="min-w-0 flex-1">{entry.text}</span>
              <time class="flex-none text-xs text-ink-muted">{time(entry.at)}</time>
            </li>
          ))}
        </ul>
        {sheetChanged.value && (
          <div class="border-t border-line bg-warning-soft px-4 py-2.5">
            <button type="button" class="text-[13px] font-bold text-warning-ink hover:underline" onClick={() => { activityOpen.value = false; refreshOverview(); }}>Actualizar ahora</button>
          </div>
        )}
      </Popover>
    </div>
  );
}

export function StatusBar() {
  const data = overview.value.data;
  const months = data?.available?.months || [];
  const status = dataStatus();
  const viewing = viewingText();
  return (
    <footer aria-label="Estado de los datos"
      class="fixed inset-x-0 bottom-0 z-30 flex h-10 items-center gap-1.5 border-t border-line bg-surface/95 px-4 text-[13px] backdrop-blur max-sm:px-2">
      {isLocal() && <span class="flex-none rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-bold text-warning-ink max-md:hidden">Datos de ejemplo</span>}
      {data && (
        <span class="flex min-w-0 items-center gap-1.5 truncate text-ink-muted max-lg:hidden">
          <Icon name="sheet" size={14} class="flex-none" />
          <span class="truncate"><b class="text-ink">{fmtInt(data.total)}</b> envíos en la hoja{months.length ? `, de ${monthShort(months[months.length - 1])} a ${monthShort(months[0])}` : ''}</span>
        </span>
      )}
      {viewing && <>
        <span class="mx-1 h-4 w-px flex-none bg-line max-lg:hidden" aria-hidden="true" />
        <span class="flex min-w-0 items-center gap-1.5 truncate text-ink-muted max-md:hidden"><Icon name="calendar" size={14} class="flex-none" /><span class="truncate">{viewing}</span></span>
      </>}
      <span class="flex-1" />
      <span role="status" aria-live="polite" title={status.title} class={cx('flex min-w-0 items-center gap-1.5 truncate', TONES[status.tone])}>
        {/* Al día: la hora de lectura (reloj); con aviso o error: atención. */}
        {!status.busy && <Icon name={status.tone === 'ok' ? 'clock' : status.tone === 'muted' ? 'info' : 'alert'} size={14} class="flex-none" />}
        <span class="truncate">{status.text}</span>
      </span>
      <button type="button" class={ACTION} onClick={refreshOverview} disabled={refreshing.value} title="Volver a leer la hoja">
        <Icon name="refresh" size={14} class={cx('text-ink-muted', status.busy && 'animate-spin')} /><span class="max-sm:hidden">Actualizar</span>
      </button>
      <span class="mx-1 h-4 w-px flex-none bg-line" aria-hidden="true" />
      <ActivityPanel />
    </footer>
  );
}
