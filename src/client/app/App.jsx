// Marco de la app: barra azul con las dos vistas (general y por comunicación), tema y «Actualizar datos».
import { useEffect, useState } from 'preact/hooks';
import { view, overview, notice, loadOverview, refreshOverview } from '@/state/app.mjs';
import { theme, setTheme, THEMES } from '@/state/theme.mjs';
import { waitingCalls } from '@/services/transport.mjs';
import { cx } from '@/lib/format.mjs';
import { Icon } from '@/ui/Icon.jsx';
import { GeneralView } from '@/features/general/GeneralView.jsx';
import { CommunicationView } from '@/features/communication/CommunicationView.jsx';

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
  const tabs = [['general', 'Vista general'], ['comm', 'Por comunicación']];
  return (
    <header class="bg-chrome text-white">
      <div class="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-5 gap-y-3 px-6 py-3">
        <div class="flex items-center gap-2.5">
          <span class="inline-flex size-[34px] items-center justify-center rounded-[10px] bg-white/15"><Icon name="mail" /></span>
          <div class="flex flex-col leading-tight">
            <strong class="text-base font-bold">Caídas de email</strong>
            <span class="text-xs text-white/75">Marketing Cloud · envíos y entrega</span>
          </div>
        </div>
        <nav aria-label="Vistas" class="inline-flex h-9 overflow-hidden rounded-xl border border-white/25">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" aria-current={view.value === id ? 'page' : undefined} onClick={() => { view.value = id; }}
              class={cx('px-3.5 text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white',
                view.value === id ? 'bg-white/15 font-bold text-white' : 'font-semibold text-white/80 hover:bg-white/10')}>
              {label}
            </button>
          ))}
        </nav>
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
  const tone = value.level === 'error' ? 'bg-danger-soft text-danger-ink' : value.level === 'warning' ? 'bg-warning-soft text-warning-ink' : 'bg-success-soft text-success';
  return (
    <div role="status" class={cx('fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-float', tone)}>
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
      <main class="mx-auto flex max-w-[1360px] flex-col gap-4 px-6 py-5">
        {view.value === 'general' ? <GeneralView /> : <CommunicationView />}
      </main>
      <Notice />
    </div>
  );
}
