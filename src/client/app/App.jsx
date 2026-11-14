// Marco de la app: barra azul fija con las vistas (general, por comunicación y comparar), el periodo, el buscador y el
// grupo de cuenta (avisos y usuario); abajo, la barra de estado (datos, Actualizar y Actividad) y, sobre ella, la
// bandeja de comunicaciones elegidas.
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import { view, notice, loadOverview, dismissNotice } from '@/state/app.mjs';
import { Icon } from '@/ui/Icon.jsx';
import { TooltipLayer } from '@/ui/TooltipLayer.jsx';
import { waitingCalls } from '@/services/transport.mjs';
import { cx } from '@/lib/format.mjs';
import { GeneralView } from '@/features/general/GeneralView.jsx';
import { CommunicationView } from '@/features/communication/CommunicationView.jsx';
import { PeriodNav } from '@/features/period/PeriodNav.jsx';
import { SearchBox } from '@/features/search/SearchBox.jsx';
import { CompareView } from '@/features/compare/CompareView.jsx';
import { SelectionTray } from '@/features/compare/SelectionTray.jsx';
import { AccountCluster } from '@/features/account/AccountCluster.jsx';
import { StatusBar } from '@/features/status/StatusBar.jsx';
import { selected } from '@/state/search.mjs';
import { openView } from '@/state/period.mjs';

/** Comparar aparece desde 2 elegidas (con una no hay nada que comparar); si ya se está en ella, se mantiene. */
const COMPARE_MIN = 2;

function Header() {
  const count = selected.value.length;
  const tabs = [['general', 'Vista general', 'dashboard'], ['comm', 'Por comunicación', 'mail'], ['compare', 'Comparar', 'columns']]
    .filter(([id]) => id !== 'compare' || count >= COMPARE_MIN || view.value === 'compare');
  // La barra queda fija arriba; su alto (cambia al pasar de línea en pantallas angostas) va en --header-h para que lo
  // que también queda fijo (la columna de «Por comunicación») se ubique debajo y no quede tapado.
  const bar = useRef(null);
  useLayoutEffect(() => {
    const element = bar.current;
    if (!element) return undefined;
    const update = () => document.documentElement.style.setProperty('--header-h', `${element.offsetHeight}px`);
    update();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    observer?.observe(element);
    return () => observer?.disconnect();
  }, []);
  return (
    // Fija desde 640 px: en un celular ocupa varias filas y fija se comería buena parte de la pantalla.
    <header ref={bar} class="z-30 bg-chrome text-white shadow-[0_1px_0_var(--color-line)] sm:sticky sm:top-0">
      {/* A todo el ancho de la pantalla (sin tope): vistas y periodo a la izquierda; buscador y cuenta a la derecha. */}
      <div class="flex flex-wrap items-center gap-x-4 gap-y-3 px-6 py-2.5 max-sm:px-4">
        <nav aria-label="Vistas" class="inline-flex h-9 overflow-hidden rounded-xl border border-white/25">
          {tabs.map(([id, label, icon]) => (
            <button key={id} type="button" aria-current={view.value === id ? 'page' : undefined} onClick={() => openView(id)}
              class={cx('inline-flex items-center gap-1.5 px-3.5 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white max-sm:px-2 max-sm:text-[13px]',
                view.value === id ? 'bg-white/15 font-bold text-white' : 'font-semibold text-white/80 hover:bg-white/10')}>
              <Icon name={icon} size={16} class="flex-none max-sm:hidden" />{label}
              {id === 'compare' && count > 0 && (
                <span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11.5px] font-extrabold text-chrome" aria-label={`${count} elegidas`}>{count}</span>
              )}
            </button>
          ))}
        </nav>
        {view.value !== 'compare' && <PeriodNav />}
        <span class="flex-1" />
        {/* A la derecha, junto a la cuenta. */}
        <SearchBox />
        <AccountCluster />
      </div>
      {waitingCalls.value > 0 && <div class="h-0.5 w-full animate-pulse bg-white/60" aria-hidden="true" />}
    </header>
  );
}

const TONES = {
  success: 'bg-success-soft text-success', info: 'bg-brand-soft text-brand-text',
  warning: 'bg-warning-soft text-warning-ink', error: 'bg-danger-soft text-danger-ink'
};
const ICONS = { success: 'check', info: 'info', warning: 'alert', error: 'alert' };

function Notice() {
  const value = notice.value;
  if (!value) return null;
  // Sobre la barra de estado y, si está a la vista, sobre la bandeja de elegidas.
  const lifted = selected.value.length > 0 && view.value !== 'compare';
  const tone = TONES[value.level] || TONES.success;
  return (
    <div role="status" aria-live="polite" class={cx('fixed left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-float', lifted ? 'bottom-32' : 'bottom-14', tone)}>
      {/* De carga: ícono girando; los demás, el de su tipo. */}
      <Icon name={value.busy ? 'refresh' : ICONS[value.level] || 'check'} size={16} class={cx('flex-none', value.busy && 'animate-spin')} />
      {value.text}
      {!value.busy && <button type="button" class="-mr-1.5 rounded-md p-1 opacity-70 hover:opacity-100" aria-label="Cerrar el aviso" onClick={dismissNotice}><Icon name="close" size={14} /></button>}
    </div>
  );
}

export function App() {
  useEffect(() => { loadOverview(); }, []);
  return (
    <div class="min-h-screen bg-canvas text-ink">
      <Header />
      {/* Abajo queda lugar para la barra de estado (y la bandeja, si hay elegidas). */}
      <main class={cx('mx-auto flex max-w-[1360px] flex-col gap-4 px-6 pt-5 max-sm:px-4', selected.value.length && view.value !== 'compare' ? 'pb-36' : 'pb-16')}>
        {view.value === 'general' ? <GeneralView /> : view.value === 'compare' ? <CompareView /> : <CommunicationView />}
      </main>
      <SelectionTray />
      <Notice />
      <StatusBar />
      <TooltipLayer />
    </div>
  );
}
