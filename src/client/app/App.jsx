// Marco de la app: barra azul con las vistas (general, por comunicación y comparar), el periodo, el buscador, tema y
// «Actualizar datos»; abajo, la bandeja de comunicaciones elegidas.
import { useEffect, useState } from 'preact/hooks';
import { view, overview, notice, loadOverview, refreshOverview } from '@/state/app.mjs';
import { theme, setTheme, THEMES } from '@/state/theme.mjs';
import { waitingCalls } from '@/services/transport.mjs';
import { cx } from '@/lib/format.mjs';
import { Icon } from '@/ui/Icon.jsx';
import { GeneralView } from '@/features/general/GeneralView.jsx';
import { CommunicationView } from '@/features/communication/CommunicationView.jsx';
import { PeriodNav } from '@/features/period/PeriodNav.jsx';
import { SearchBox } from '@/features/search/SearchBox.jsx';
import { CompareView } from '@/features/compare/CompareView.jsx';
import { SelectionTray } from '@/features/compare/SelectionTray.jsx';
import { selected } from '@/state/search.mjs';
import { openView } from '@/state/period.mjs';

const THEME_ICON = { light: 'sun', dark: 'moon', system: 'monitor' };
const isLocal = () => import.meta.env.DEV && !globalThis.google?.script?.run;

function ThemeButton() {
  const index = THEMES.findIndex(([id]) => id === theme.value);
  const [nextId, nextName] = THEMES[(index + 1) % THEMES.length];
  const current = THEMES[index]?.[1] || 'Claro';
  return (
    <button type="button" class="chrome-btn w-9 justify-center px-0" title={`Tema: ${current}. Cambiar a ${nextName}`}
      aria-label={`Tema ${current}. Cambiar a ${nextName}`} onClick={() => setTheme(nextId)}>
      <Icon name={THEME_ICON[theme.value] || 'sun'} size={16} />
    </button>
  );
}

function Header() {
  const [refreshing, setRefreshing] = useState(false);
  const refresh = () => {
    setRefreshing(true);
    refreshOverview().finally(() => setRefreshing(false));
  };
  const tabs = [['general', 'Vista general'], ['comm', 'Por comunicación'], ['compare', 'Comparar']];
  const count = selected.value.length;
  return (
    <header class="bg-chrome text-white">
      <div class="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-4 gap-y-3 px-6 py-3 max-sm:px-4">
        <nav aria-label="Vistas" class="inline-flex h-9 overflow-hidden rounded-xl border border-white/25">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" aria-current={view.value === id ? 'page' : undefined} onClick={() => openView(id)}
              class={cx('inline-flex items-center gap-1.5 px-3.5 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white max-sm:px-2 max-sm:text-[13px]',
                view.value === id ? 'bg-white/15 font-bold text-white' : 'font-semibold text-white/80 hover:bg-white/10')}>
              {label}
              {id === 'compare' && count > 0 && (
                <span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11.5px] font-extrabold text-chrome" aria-label={`${count} elegidas`}>{count}</span>
              )}
            </button>
          ))}
        </nav>
        {view.value !== 'compare' && <PeriodNav />}
        <SearchBox />
        <span class="flex-1" />
        {isLocal() && <span class="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">Datos de ejemplo</span>}
        <button type="button" class="chrome-btn" onClick={refresh} disabled={refreshing} title="Volver a leer la hoja">
          <Icon name="refresh" size={16} class={refreshing ? 'animate-spin' : ''} />{refreshing ? 'Actualizando…' : 'Actualizar datos'}
        </button>
        <ThemeButton />
      </div>
      {waitingCalls.value > 0 && <div class="h-0.5 w-full animate-pulse bg-white/60" aria-hidden="true" />}
    </header>
  );
}

function Notice() {
  const value = notice.value;
  if (!value) return null;
  // Sobre la bandeja de elegidas, si está a la vista.
  const lifted = selected.value.length > 0 && view.value !== 'compare';
  const tone = value.level === 'error' ? 'bg-danger-soft text-danger-ink' : value.level === 'warning' ? 'bg-warning-soft text-warning-ink' : 'bg-success-soft text-success';
  return (
    <div role="status" class={cx('fixed left-1/2 z-50', lifted ? 'bottom-24' : 'bottom-5', ' -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-float', tone)}>
      {value.text}
    </div>
  );
}

export function App() {
  useEffect(() => { loadOverview(); }, []);
  return (
    <div class="min-h-screen bg-canvas text-ink">
      <Header />
      {overview.value.stale && (
        <p class="bg-warning-soft px-6 py-1.5 text-center text-xs font-semibold text-warning-ink">Mostrando lo guardado en este navegador mientras llegan los datos nuevos.</p>
      )}
      <main class={cx('mx-auto flex max-w-[1360px] flex-col gap-4 px-6 pt-5 max-sm:px-4', selected.value.length && view.value !== 'compare' ? 'pb-28' : 'pb-5')}>
        {view.value === 'general' ? <GeneralView /> : view.value === 'compare' ? <CompareView /> : <CommunicationView />}
      </main>
      <SelectionTray />
      <Notice />
    </div>
  );
}
