// «Lo que cambió en el periodo»: las frases de shared/highlights.mjs, cada una con su enlace (a una sección de la
// página, a la línea de tiempo con su indicador o a una comunicación).
import { cx } from '@/lib/format.mjs';
import { openCommunication } from '@/state/app.mjs';
import { buildHighlights } from '@shared/highlights.mjs';
import { Panel } from '@/ui/Panel.jsx';
import { Icon } from '@/ui/Icon.jsx';

const TONES = {
  good: 'bg-success-soft text-success',
  bad: 'bg-danger-soft text-danger-ink',
  info: 'bg-brand-soft text-brand-text'
};

/** Lleva a una sección de la página, debajo de la barra azul fija (sin animación si el equipo pide menos movimiento). */
function goTo(section) {
  const target = globalThis.document?.getElementById(section);
  if (!target) return;
  const bar = globalThis.document.querySelector('header')?.offsetHeight || 0;
  const still = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  globalThis.scrollTo({ top: target.getBoundingClientRect().top + globalThis.scrollY - bar - 16, behavior: still ? 'auto' : 'smooth' });
}

export function Highlights({ period, history, mode, onMetric }) {
  const items = buildHighlights({ period, history, mode });
  const follow = link => {
    if (link.job) return openCommunication({ day: link.day, job: link.job });
    if (link.metric) onMetric(link.metric);
    goTo(link.section);
  };
  return (
    <Panel boxed id="highlights" class="h-full" title="Lo que cambió en el periodo" subtitle="Lo más llamativo de las cifras de esta página, de lo más a lo menos importante.">
      {items.length ? (
        <ul class="flex flex-col">
          {items.map((item, index) => (
            <li key={item.text} class={cx('flex gap-3 py-3', index > 0 && 'border-t border-line')}>
              <span class={cx('inline-flex size-7 flex-none items-center justify-center rounded-lg', TONES[item.tone])} aria-hidden="true"><Icon name={item.icon} size={15} /></span>
              <span class="flex min-w-0 flex-col gap-1">
                <span class="text-[13.5px] leading-snug">{item.text}</span>
                <button type="button" onClick={() => follow(item.link)} class="self-start text-[12.5px] font-semibold text-brand-text hover:underline focus-visible:outline-2 focus-visible:outline-brand-text">
                  {item.link.label}
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : <p class="text-[13px] text-ink-muted">Nada se movió lo suficiente para destacarlo en este periodo.</p>}
    </Panel>
  );
}
