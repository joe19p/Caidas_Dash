// Navegación de periodo en la barra azul, como la del cronograma: [Este mes] [Largo ▾] [Periodo ▾] [‹] [›].
// En «Por comunicación» no hay largo: solo el mes. Teclado: H (mes en curso), ← y → (periodo anterior o siguiente) y,
// en la vista general, M, 3, 6, 1 (12 meses) y R (rango).
import { useEffect, useRef, useState } from 'preact/hooks';
import { cx, monthLong, monthShort, MONTHS } from '@/lib/format.mjs';
import { view } from '@/state/app.mjs';
import { LENGTHS, bounds, canShift, commMonth, goCurrent, periodRange, pickEnd, pickRange, setCommMonth, setLength, shiftPeriod } from '@/state/period.mjs';
import { Dropdown } from '@/ui/Dropdown.jsx';
import { Icon } from '@/ui/Icon.jsx';
import { Popover } from '@/ui/Popover.jsx';

const monthOf = (year, index) => `${year}-${String(index + 1).padStart(2, '0')}`;
const capital = text => text.charAt(0).toUpperCase() + text.slice(1);
// Lo que no debe mover el periodo al teclear: campos, menús, paneles abiertos y controles con flechas propias.
const KEEP_KEYS = 'input, textarea, select, [contenteditable], [role="dialog"], [role="menu"], [role="slider"], [role="switch"]';

/**
 * Calendario de meses (un año por vista). mode: 'one' (un mes), 'end' (último mes de 3, 6 o 12) o 'range' (inicio y
 * final). Los meses sin envíos o futuros no se eligen; el punto marca el mes en curso.
 */
function MonthPanel({ mode, from, to, onPick, onRange }) {
  const limits = bounds.value;
  const [start, setStart] = useState('');
  const [cursor, setCursor] = useState(to);
  const year = Number(cursor.slice(0, 4));
  const grid = useRef(null);
  useEffect(() => { grid.current?.querySelector(`[data-month="${cursor}"]`)?.focus(); }, [cursor]);
  const usable = month => month <= limits.current && limits.months.has(month);
  const choose = month => {
    if (mode !== 'range') { onPick(month); return; }
    if (!start) { setStart(month); return; }
    onRange(start, month);
  };
  const move = delta => {
    const [y, m] = cursor.split('-').map(Number);
    const index = y * 12 + m - 1 + delta;
    setCursor(monthOf(Math.floor(index / 12), index % 12));
  };
  const onKey = event => {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3, PageUp: -12, PageDown: 12 }[event.key];
    if (delta) { event.preventDefault(); event.stopPropagation(); move(delta); }
  };
  const [lo, hi] = mode === 'range' && start ? [start, start] : [from, to];
  const hint = mode === 'range' ? (start ? 'Ahora elige el mes final.' : 'Elige el mes de inicio y luego el final.')
    : mode === 'end' ? 'Elige el último mes del periodo.' : 'Elige un mes. Los meses sin envíos no se pueden elegir.';
  return (
    <div class="w-80 p-4">
      <div class="mb-3 flex items-center justify-between">
        <button type="button" class="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted disabled:opacity-30" aria-label="Año anterior"
          disabled={year <= Number(limits.first.slice(0, 4))} onClick={() => move(-12)}><Icon name="left" size={18} /></button>
        <strong class="text-brand-text" aria-live="polite">{year}</strong>
        <button type="button" class="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted disabled:opacity-30" aria-label="Año siguiente"
          disabled={year >= Number(limits.current.slice(0, 4))} onClick={() => move(12)}><Icon name="right" size={18} /></button>
      </div>
      <div ref={grid} role="grid" aria-label={`Meses de ${year}`} onKeyDown={onKey} class="grid grid-cols-3 gap-y-1">
        {MONTHS.map((name, index) => {
          const month = monthOf(year, index);
          const column = index % 3;
          const inside = month >= lo && month <= hi;
          const edge = month === lo || month === hi;
          return (
            <button key={month} type="button" role="gridcell" data-month={month} disabled={!usable(month)} tabIndex={month === cursor ? 0 : -1}
              aria-selected={inside} aria-current={month === limits.current ? 'date' : undefined}
              aria-label={`${capital(monthLong(month))}${month === limits.current ? ', mes en curso' : ''}${usable(month) ? '' : ', sin envíos'}`}
              onClick={() => choose(month)}
              class={cx('relative flex h-10 items-center justify-center text-sm focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-brand-text',
                !usable(month) ? 'cursor-default text-line-strong' : 'text-ink',
                inside && edge && 'bg-brand font-semibold text-white!',
                inside && !edge && 'bg-brand-soft',
                inside && lo !== hi ? cx((month === lo || column === 0) && 'rounded-l-lg', (month === hi || column === 2) && 'rounded-r-lg') : 'rounded-lg',
                !inside && usable(month) && 'hover:bg-brand-soft')}>
              {capital(name)}
              {month === limits.current && <span class={cx('absolute bottom-1.5 size-1 rounded-full', inside && edge ? 'bg-white' : 'bg-brand-text')} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <p class="mt-3 border-t border-line pt-3 text-xs text-ink-muted">{hint}</p>
    </div>
  );
}

export function PeriodNav() {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);
  const range = periodRange.value;
  const limits = bounds.value;
  const comm = view.value === 'comm';

  useEffect(() => {
    const onKey = event => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.target.closest?.(KEEP_KEYS)) return;
      const { key } = event;
      if (key === 'ArrowLeft' || key === 'ArrowRight') {
        // Las flechas solo mueven el periodo si nada en la página las usa (foco en el cuerpo o en esta barra).
        if (event.target !== document.body && !event.target.closest?.('[data-period-nav]')) return;
        event.preventDefault();
        shiftPeriod(key === 'ArrowLeft' ? -1 : 1);
      } else if (key === 'h' || key === 'H') goCurrent();
      else if (view.value === 'general') {
        const len = { m: 1, M: 1, 3: 3, 6: 6, 1: 12 }[key];
        if (len) setLength(len);
        else if (key === 'r' || key === 'R') { setLength('range'); setOpen(true); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { setOpen(false); }, [view.value]);

  if (!range) return null;
  const month = comm ? commMonth.value : range.to;
  const single = comm || range.len === 1;
  const label = single ? capital(monthLong(month)) : `${monthShort(range.from)} – ${monthShort(range.to)}`;
  // En pantallas angostas la barra entera debe caber: etiqueta corta («nov 26», «set 26–nov 26»).
  const shortLabel = single ? monthShort(month) : `${monthShort(range.from)}–${monthShort(range.to)}`;
  const lengthLabel = range.len === 'range' ? 'Rango' : LENGTHS.find(item => item.id === range.len).label;
  const atCurrent = comm ? month === limits.current : range.len === 1 && range.to === limits.current;
  const mode = comm || range.len === 1 ? 'one' : range.len === 'range' ? 'range' : 'end';
  const close = () => { setOpen(false); pickerRef.current?.querySelector('button')?.focus(); };
  return (
    <div data-period-nav class="flex shrink-0 items-center divide-x divide-white/25 rounded-xl border border-white/25">
      <button type="button" class="header-btn rounded-l-[11px] max-sm:px-2" disabled={atCurrent} onClick={goCurrent} title="Mes en curso (H)">Este mes</button>
      {!comm && (
        <Dropdown label="Largo del periodo"
          items={[
            ...LENGTHS.map(item => ({ label: item.label, hint: item.key, active: range.len === item.id, onSelect: () => setLength(item.id) })),
            'separator',
            { label: 'Rango a elección…', hint: 'R', active: range.len === 'range', onSelect: () => { setLength('range'); setOpen(true); } }
          ]}
          renderTrigger={(props, menuOpen) => (
            <button type="button" class="header-btn w-[118px] justify-between max-sm:w-auto max-sm:px-2" {...props}>
              {lengthLabel}<Icon name="down" size={14} class={cx('transition-transform', menuOpen && 'rotate-180')} />
            </button>
          )} />
      )}
      <div ref={pickerRef} class="relative">
        <button type="button" class="header-btn min-w-[150px] justify-between font-semibold max-sm:min-w-0 max-sm:px-2" aria-haspopup="dialog" aria-expanded={open}
          title="Elegir mes" onClick={() => setOpen(!open)}>
          <span class="max-sm:hidden">{label}</span><span class="sm:hidden">{shortLabel}</span>
          <Icon name="down" size={14} class={cx('transition-transform', open && 'rotate-180')} />
        </button>
        <Popover open={open} onClose={() => setOpen(false)} anchor={pickerRef} label={mode === 'range' ? 'Elegir rango de meses' : 'Elegir mes'}>
          {/* key: al reabrir o cambiar de modo, el panel parte del periodo elegido. */}
          <MonthPanel key={`${mode}:${range.from}:${month}`} mode={mode} from={comm ? month : range.from} to={month}
            onPick={picked => { if (comm) setCommMonth(picked); else pickEnd(picked); close(); }}
            onRange={(a, b) => { pickRange(a, b); close(); }} />
        </Popover>
      </div>
      <button type="button" class="header-btn px-2" aria-label={comm ? 'Mes anterior (←)' : 'Periodo anterior (←)'} title={comm ? 'Mes anterior (←)' : 'Periodo anterior (←)'}
        disabled={!canShift(-1)} onClick={() => shiftPeriod(-1)}><Icon name="left" size={18} /></button>
      <button type="button" class="header-btn rounded-r-[11px] px-2" aria-label={comm ? 'Mes siguiente (→)' : 'Periodo siguiente (→)'} title={comm ? 'Mes siguiente (→)' : 'Periodo siguiente (→)'}
        disabled={!canShift(1)} onClick={() => shiftPeriod(1)}><Icon name="right" size={18} /></button>
    </div>
  );
}
