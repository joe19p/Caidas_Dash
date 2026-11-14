// Grupo de cuenta a la derecha de la barra azul (como AccountCluster del cronograma): la campana de avisos (punto ámbar
// si la hoja cambió o hubo un error sin ver; abre la actividad) y el avatar con su menú: quién eres, Actualizar datos,
// Atajos de teclado (también con «?»), Sobre los datos y el tema.
import { useEffect, useRef, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { cx } from '@/lib/format.mjs';
import { activity, activityOpen, clockOf, overview, refreshOverview, refreshing, sheetChanged, unseenActivity, userEmail } from '@/state/app.mjs';
import { THEMES, setTheme, theme } from '@/state/theme.mjs';
import { Dialog } from '@/ui/Dialog.jsx';
import { Icon } from '@/ui/Icon.jsx';
import { Popover } from '@/ui/Popover.jsx';

const THEME_ICON = { light: 'sun', dark: 'moon', system: 'monitor' };
const isLocal = () => import.meta.env.DEV && !globalThis.google?.script?.run;
/** Diálogo abierto: '' | 'shortcuts' | 'data'. */
const dialog = signal('');

/** «maria.quispe@empresa.pe» → «Maria Quispe» (sin el nombre real a mano, se arma del correo). */
export function nameFromEmail(email) {
  const local = String(email || '').split('@')[0];
  return local.split(/[._-]+/).filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

const initialsOf = name => name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';

function Avatar({ name, size }) {
  return <span class={cx('flex flex-none items-center justify-center rounded-full bg-white font-extrabold text-chrome', size)} aria-hidden="true">{initialsOf(name)}</span>;
}

const SHORTCUTS = [
  ['/', 'Buscar comunicación o JobID'],
  ['H', 'Ir al mes en curso'],
  ['← →', 'Periodo anterior o siguiente (en «Por comunicación», el mes)'],
  ['M, 3, 6, 1', 'Largo del periodo: mes, 3, 6 o 12 meses (vista general)'],
  ['R', 'Rango a elección (vista general)'],
  ['Esc', 'Cerrar un panel, un menú o la búsqueda'],
  ['?', 'Ver estos atajos']
];

function ShortcutsDialog() {
  return (
    <Dialog open={dialog.value === 'shortcuts'} onClose={() => { dialog.value = ''; }} title="Atajos de teclado">
      <ul class="flex flex-col divide-y divide-line">
        {SHORTCUTS.map(([keys, text]) => (
          <li key={keys} class="flex items-center justify-between gap-4 py-2.5">
            <span>{text}</span>
            <kbd class="flex-none rounded-md border border-line-strong bg-surface-muted px-2 py-0.5 font-sans text-xs font-bold">{keys}</kbd>
          </li>
        ))}
      </ul>
      <p class="mt-3 text-xs text-ink-muted">Los atajos no se activan mientras escribes en un campo.</p>
    </Dialog>
  );
}

function DataDialog() {
  const readAt = overview.value.data?.readAt;
  return (
    <Dialog open={dialog.value === 'data'} onClose={() => { dialog.value = ''; }} title="Sobre los datos">
      <div class="flex flex-col gap-3 leading-relaxed">
        <p>Los datos salen de la hoja vinculada: el reporte de Marketing Cloud (<b>EmailSummary_NotSent</b>, o <b>EmailSummary</b> con <b>NotSentData</b>) y los catálogos de motivos (<b>ASL_Catalog</b> y <b>NotSent_Catalog</b>).</p>
        <p>{readAt ? <>Se leyeron de la hoja a las <b>{clockOf(readAt)}</b> del {readAt.slice(8, 10)}/{readAt.slice(5, 7)}. </> : ''}Lo calculado se guarda: cuando alguien cambia la hoja se vuelve a leer sola, y con <b>Actualizar</b> se lee en el momento. La barra de abajo avisa si la hoja cambió mientras mirabas.</p>
        <p>En la vista general las tasas son la mediana por comunicación o el ponderado por volumen, y nunca se suman personas entre comunicaciones. El mes en curso cuenta hasta hoy y se compara con los mismos días del periodo anterior.</p>
        {isLocal() && <p class="rounded-lg bg-warning-soft px-3 py-2 text-warning-ink">Estás en desarrollo: son datos de ejemplo, no los de la hoja real.</p>}
      </div>
    </Dialog>
  );
}

function UserMenu() {
  const [open, setOpen] = useState(false);
  const anchor = useRef(null);
  const email = userEmail.value;
  const name = nameFromEmail(email) || 'Usuario';
  const run = action => { setOpen(false); action(); };
  const item = 'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13.5px] hover:bg-surface-muted focus:bg-surface-muted focus:outline-none disabled:opacity-50';
  const icon = 'flex size-7 flex-none items-center justify-center rounded-lg bg-surface-muted text-ink-muted';
  return (
    <div ref={anchor} class="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={`Cuenta de ${name}`} title={email || name} onClick={() => setOpen(!open)}
        class="flex items-center gap-1.5 rounded-full py-[3px] pr-2 pl-[3px] text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
        <Avatar name={name} size="size-8 text-[13px]" />
        <Icon name="down" size={14} class={cx('transition-transform', open && 'rotate-180')} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchor={anchor} role="menu" label="Cuenta" align="right" class="w-[300px] p-1.5">
        <div class="flex items-center gap-3 px-2.5 pt-2 pb-2.5">
          <span class="flex size-10 flex-none items-center justify-center rounded-full bg-chrome text-[15px] font-extrabold text-white" aria-hidden="true">{initialsOf(name)}</span>
          <span class="min-w-0">
            <b class="block truncate text-sm">{name}</b>
            <span class="block truncate text-xs text-ink-muted">{email || 'Sin correo'}</span>
          </span>
        </div>
        <div class="mx-1 my-1.5 border-t border-line" />
        <button type="button" role="menuitem" class={item} disabled={refreshing.value} onClick={() => run(refreshOverview)}>
          <span class={icon}><Icon name="refresh" size={15} class={refreshing.value ? 'animate-spin' : ''} /></span>
          <span>Actualizar datos<span class="block text-xs text-ink-muted">Volver a leer la hoja ahora</span></span>
        </button>
        <button type="button" role="menuitem" class={item} onClick={() => run(() => { dialog.value = 'shortcuts'; })}>
          <span class={icon}><Icon name="keyboard" size={15} /></span>
          <span>Atajos de teclado<span class="block text-xs text-ink-muted">/, H, ← →, M, 3, 6, 1, R</span></span>
          <kbd class="ml-auto rounded border border-line px-1.5 font-sans text-xs text-ink-muted">?</kbd>
        </button>
        <button type="button" role="menuitem" class={item} onClick={() => run(() => { dialog.value = 'data'; })}>
          <span class={icon}><Icon name="info" size={15} /></span>
          <span>Sobre los datos<span class="block text-xs text-ink-muted">De dónde salen y cuándo se leen</span></span>
        </button>
        <div class="mx-1 my-1.5 border-t border-line" />
        <p class="px-2.5 pb-1 text-xs font-semibold text-ink-muted">Tema</p>
        {/* El tema se aplica al momento y el menú sigue abierto para compararlo. */}
        <div role="group" aria-label="Tema" class="mx-1 mb-1 grid grid-cols-3 gap-0.5 rounded-lg bg-surface-muted p-0.5">
          {THEMES.map(([id, label]) => (
            <button key={id} type="button" role="menuitemradio" aria-checked={theme.value === id} onClick={() => setTheme(id)}
              class={cx('flex h-8 items-center justify-center gap-1.5 rounded-md text-xs focus-visible:outline-2 focus-visible:outline-brand-text',
                theme.value === id ? 'bg-surface font-bold text-ink shadow-sm' : 'text-ink-muted hover:text-ink')}>
              <Icon name={THEME_ICON[id]} size={14} />{label}
            </button>
          ))}
        </div>
      </Popover>
    </div>
  );
}

export function AccountCluster() {
  // «?» abre los atajos (salvo escribiendo en un campo).
  useEffect(() => {
    const onKey = event => {
      if (event.key !== '?' || event.ctrlKey || event.metaKey || event.altKey || event.target.closest?.('input, textarea, [contenteditable]')) return;
      event.preventDefault();
      dialog.value = 'shortcuts';
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const hasError = unseenActivity.value > 0 && activity.value.slice(0, unseenActivity.value).some(entry => entry.level === 'error');
  const alert = sheetChanged.value || hasError;
  return (
    <div class="flex h-[42px] flex-none items-center gap-0.5 rounded-full border border-white/25 px-1">
      <button type="button" onClick={() => { activityOpen.value = true; }}
        aria-label={sheetChanged.value ? 'Avisos: la hoja cambió' : hasError ? 'Avisos: hubo un error' : 'Avisos'} title="Avisos y actividad"
        class="relative flex h-[34px] w-9 items-center justify-center rounded-full text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
        <Icon name="bell" size={18} />
        {alert && <span class={cx('absolute top-1 right-1.5 size-2 rounded-full ring-2 ring-chrome', hasError ? 'bg-danger' : 'bg-warning')} aria-hidden="true" />}
      </button>
      <span class="h-[22px] w-px bg-white/25" aria-hidden="true" />
      <UserMenu />
      <ShortcutsDialog />
      <DataDialog />
    </div>
  );
}
