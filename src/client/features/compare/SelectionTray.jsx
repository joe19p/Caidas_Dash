// Bandeja de comunicaciones elegidas (abajo, flotando): cuántas hay, sus JobID, «Quitar todas» y «Comparar».
// No se muestra en la vista Comparar, que ya las lista.
import { view } from '@/state/app.mjs';
import { openView } from '@/state/period.mjs';
import { selected, unselect, clearSelected } from '@/state/search.mjs';
import { Icon } from '@/ui/Icon.jsx';

const SHOWN = 4;

export function SelectionTray() {
  const items = selected.value;
  if (!items.length || view.value === 'compare') return null;
  return (
    <section aria-label="Comunicaciones elegidas"
      class="fixed bottom-14 left-1/2 z-30 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center gap-x-3.5 gap-y-2 rounded-card border border-line bg-surface py-2.5 pr-2.5 pl-4 text-ink shadow-float">
      <b class="text-sm">{items.length} {items.length === 1 ? 'elegida' : 'elegidas'}</b>
      {/* La pestaña Comparar aparece desde 2: con una, se dice qué falta. */}
      {items.length === 1 && <span class="text-[13px] text-ink-muted">Elige otra para comparar</span>}
      <ul class="flex flex-wrap gap-1.5 max-sm:hidden">
        {items.slice(0, SHOWN).map(item => (
          <li key={item.job} class="inline-flex items-center gap-0.5 rounded-full bg-brand-soft py-0.5 pr-1 pl-2.5 text-xs font-semibold" title={item.name}>
            <span class="font-mono">{item.job}</span>
            <button type="button" class="rounded-full p-0.5 text-ink-muted hover:bg-surface hover:text-ink" aria-label={`Quitar ${item.name}`} onClick={() => unselect(item.job)}>
              <Icon name="close" size={12} />
            </button>
          </li>
        ))}
        {items.length > SHOWN && <li class="self-center text-xs text-ink-muted">y {items.length - SHOWN} más</li>}
      </ul>
      <span class="flex gap-2">
        <button type="button" class="btn" onClick={clearSelected}>Quitar todas</button>
        <button type="button" class="btn-primary" disabled={items.length < 2} title={items.length < 2 ? 'Elige al menos dos' : undefined}
          onClick={() => { openView('compare'); globalThis.scrollTo?.({ top: 0 }); }}>
          <Icon name="compare" size={16} />Comparar
        </button>
      </span>
    </section>
  );
}
