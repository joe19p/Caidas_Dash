// Pestaña Simulador: qué pasaría si esta comunicación no aplicara una lista de autosupresión. Estimación con los
// supuestos de shared/simulator.mjs, a la vista del usuario. Las listas van en una tabla ordenable y con buscador: de
// entrada, primero las que tienen candado (no se pueden apagar) y luego el resto, de mayor a menor.
import { useState } from 'preact/hooks';
import { cx, fmtInt, fmtPct, fmtPts } from '@/lib/format.mjs';
import { Icon } from '@/ui/Icon.jsx';
import { simLists, simulate, simRisk } from '@shared/simulator.mjs';
import { metricFold } from '@shared/metrics.mjs';

function Switch({ checked, label, onToggle }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onToggle}
      class={cx('relative h-6 w-10 flex-none rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-text', checked ? 'bg-asl' : 'bg-track')}>
      <span class={cx('absolute top-[3px] size-[18px] rounded-full bg-white shadow-sm transition-[left]', checked ? 'left-[19px]' : 'left-[3px]')} />
    </button>
  );
}

function Compare({ label, now, sim, max, delta, deltaClass, danger }) {
  return (
    <div class="flex flex-col gap-2 rounded-xl border border-line px-4 py-3.5">
      <div class="flex items-baseline justify-between gap-2">
        <span class="text-[13px] font-bold">{label}</span>
        <b class={cx('text-lg', deltaClass)}>{delta}</b>
      </div>
      <div class="grid grid-cols-[70px_minmax(0,1fr)_96px] items-center gap-x-2.5 gap-y-1.5 text-[12.5px]">
        <span class="text-ink-muted">Hoy</span>
        <span class="h-2.5 rounded-full bg-surface-muted"><span class="block h-full rounded-full bg-line-strong" style={{ width: `${max ? (now.value / max) * 100 : 0}%` }} /></span>
        <span class="text-right">{now.text}</span>
        <span class="font-bold">Simulado</span>
        <span class="h-2.5 rounded-full bg-surface-muted"><span class={cx('block h-full rounded-full', danger ? 'bg-danger' : 'bg-ent')} style={{ width: `${max ? (Math.min(sim.value, max) / max) * 100 : 0}%` }} /></span>
        <b class="text-right">{sim.text}</b>
      </div>
    </div>
  );
}

// Orden de la tabla. 'default': primero las listas con candado (no se pueden apagar) y luego el resto, de mayor a menor.
const SIM_COLUMNS = {
  apply: { label: 'Aplicar', value: (list, isOff) => (list.lock ? 0 : isOff(list) ? 2 : 1), first: 1 },
  name: { label: 'Lista de autosupresión', value: list => list.name, first: 1 },
  count: { label: 'Excluye', value: list => list.count, first: -1 },
  open: { label: 'Apertura esp.', value: list => (list.lock ? -1 : list.expectedOpen), first: -1 }
};
const byDefault = (a, b) => (Boolean(b.lock) - Boolean(a.lock)) || b.count - a.count;

/** Tabla de listas: ordenable por cualquier columna, con buscador (nombre, código o motivo del candado, sin tildes). */
function ListTable({ lists, off, onToggle }) {
  const [sort, setSort] = useState({ key: 'default', dir: 1 });
  const [query, setQuery] = useState('');
  const isOff = list => !list.lock && Boolean(off[list.code]);
  const needle = metricFold(query.trim());
  const shown = lists.filter(list => !needle || metricFold(`${list.name}\n${list.code}\n${list.lock || ''}`).includes(needle));
  const column = SIM_COLUMNS[sort.key];
  const rows = [...shown].sort((a, b) => {
    if (!column) return byDefault(a, b);
    const x = column.value(a, isOff);
    const y = column.value(b, isOff);
    return ((typeof x === 'string' ? x.localeCompare(y, 'es') : x - y) * sort.dir) || byDefault(a, b);
  });
  const onSort = key => setSort(previous => ({ key, dir: previous.key === key ? -previous.dir : SIM_COLUMNS[key].first }));
  const locked = lists.filter(list => list.lock).length;
  const header = (key, className = '') => {
    const on = sort.key === key;
    return (
      <th scope="col" aria-sort={on ? (sort.dir < 0 ? 'descending' : 'ascending') : 'none'} class={cx('bg-surface px-2.5 py-2.5 font-semibold', className)}>
        <button type="button" onClick={() => onSort(key)} class={cx('inline-flex items-center gap-1 hover:text-ink', on && 'text-brand-text')}
          title={`Ordenar por ${SIM_COLUMNS[key].label.toLowerCase()}`}>
          {SIM_COLUMNS[key].label}
          <Icon name="down" size={12} class={cx(!on && 'opacity-0', on && sort.dir > 0 && 'rotate-180')} />
        </button>
      </th>
    );
  };
  return (
    <div class="flex min-w-0 flex-[1_1_520px] flex-col gap-2.5">
      <div class="flex flex-wrap items-center gap-2">
        <label class="relative flex w-72 items-center max-sm:w-full">
          <span class="sr-only">Buscar lista</span>
          <Icon name="search" size={15} class="pointer-events-none absolute left-2.5 text-ink-muted" />
          <input type="text" value={query} autocomplete="off" spellcheck={false} placeholder="Buscar lista o código…"
            onInput={event => setQuery(event.currentTarget.value)} onKeyDown={event => { if (event.key === 'Escape') setQuery(''); }}
            class="field h-8 pr-8 pl-8 text-[13px]" />
          {query && (
            <button type="button" class="absolute right-1.5 rounded-md p-1 text-ink-muted hover:bg-surface-muted hover:text-ink" aria-label="Borrar la búsqueda" onClick={() => setQuery('')}>
              <Icon name="close" size={13} />
            </button>
          )}
        </label>
        <span aria-live="polite" class="text-[12.5px] text-ink-muted">
          {needle ? `${shown.length} de ${lists.length} listas` : `${lists.length} listas, ${locked} con candado`}
        </span>
        {sort.key !== 'default' && (
          <button type="button" class="ml-auto text-[13px] font-semibold text-brand-text hover:underline" onClick={() => setSort({ key: 'default', dir: 1 })}>
            Orden inicial: candados primero
          </button>
        )}
      </div>
      {/* Con alto máximo, el encabezado queda fijo al recorrer la tabla. */}
      <div class="max-h-[70vh] overflow-auto rounded-lg border border-line">
        <table class="w-full min-w-[520px] border-collapse text-[13px]">
          <thead class="sticky top-0 z-10 shadow-[0_1px_0_var(--color-line)]">
            <tr class="text-left text-xs text-ink-muted">
              {header('apply', 'w-[84px] pl-3.5')}
              {header('name')}
              {header('count', 'text-right')}
              {header('open', 'pr-3.5 text-right')}
            </tr>
          </thead>
          <tbody>
            {rows.map(list => {
              const offNow = isOff(list);
              return (
                <tr key={list.code} class={cx('border-t border-line', offNow && 'bg-brand-soft', list.lock && 'bg-surface-muted/60')}>
                  <td class="py-2 pr-2.5 pl-3.5">
                    {list.lock
                      ? <span title={list.lock} class="inline-flex w-10 justify-center text-ink-muted"><Icon name="lock" size={16} label="No se puede quitar" /></span>
                      : <Switch checked={!offNow} label={`${offNow ? 'Aplicar' : 'Dejar de aplicar'} ${list.name}`} onToggle={() => onToggle(list.code)} />}
                  </td>
                  <td class="px-2.5 py-2">
                    <span class={cx('block text-[13px] font-semibold', list.lock ? 'text-ink-muted' : 'text-ink')} title={list.code}>{list.name}</span>
                    <span class="block text-[11.5px] text-ink-muted">{list.lock || `Excluye el ${fmtPct(list.share)} de lo no enviado`}</span>
                  </td>
                  <td class={cx('px-2.5 py-2 text-right font-semibold', list.lock ? 'text-ink-muted' : 'text-ink')}>{fmtInt(list.count)}</td>
                  <td class="py-2 pr-3.5 pl-2.5 text-right text-[12.5px] text-ink-muted">{list.lock ? '—' : fmtPct(list.expectedOpen)}</td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={4} class="px-3.5 py-6 text-center text-ink-muted">Ninguna lista coincide con «{query.trim()}».</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const RISK = {
  sano: ['bg-surface-muted text-success', 'Entregabilidad sana', 'La tasa de rebote se mantiene bajo el 3 %.'],
  vigilar: ['bg-warning-soft text-warning-ink', 'Vigilar la entregabilidad', 'La tasa de rebote supera el 3 %: conviene probar con un grupo pequeño primero.'],
  riesgo: ['bg-danger-soft text-danger-ink', 'Riesgo para la reputación', 'Con más de 5 % de rebote los proveedores de correo pueden bloquear el dominio.']
};

export function SimulatorTab({ detail }) {
  const [off, setOff] = useState({});
  const lists = simLists(detail);
  const result = simulate(detail, off);
  const record = detail.record;
  const risk = RISK[simRisk(result.bounceRateSim)];
  const bounceDelta = result.bounceRateSim - result.bounceRate;
  return (
    <section aria-labelledby="si-t" class="section-rule gap-3.5">
      <div>
        <h2 id="si-t" class="text-xl font-extrabold">¿Qué pasaría si esta comunicación no aplicara una lista?</h2>
        <p class="mt-1 text-[13px] text-ink-muted">Es una estimación: apaga una lista y mira el efecto. Los supuestos están al final.</p>
      </div>
      {!lists.length ? <p class="text-[13px] text-ink-muted">Esta comunicación no tiene listas de autosupresión aplicadas.</p> : (
        <div class="flex flex-wrap items-start gap-7">
          <ListTable lists={lists} off={off} onToggle={code => setOff({ ...off, [code]: !off[code] })} />
          <div class="flex min-w-0 flex-[1_1_340px] flex-col gap-3">
            <Compare label="Personas que reciben el envío" max={Math.max(record.sends, result.sends)}
              now={{ value: record.sends, text: fmtInt(record.sends) }} sim={{ value: result.sends, text: fmtInt(result.sends) }}
              delta={`${result.added > 0 ? '+' : ''}${fmtInt(result.added)}`} deltaClass={result.added > 0 ? 'text-success' : 'text-ink-muted'} />
            <Compare label="Aperturas estimadas" max={Math.max(record.opens, result.opens)}
              now={{ value: record.opens, text: fmtInt(record.opens) }} sim={{ value: result.opens, text: fmtInt(result.opens) }}
              delta={`${result.addedOpens > 0 ? '+' : ''}${fmtInt(result.addedOpens)} (${record.opens ? ((result.addedOpens / record.opens) * 100).toFixed(1) : '0.0'}%)`}
              deltaClass={result.addedOpens > 0 ? 'text-success' : 'text-ink-muted'} />
            <Compare label="Tasa de rebote" max={0.1}
              now={{ value: result.bounceRate, text: fmtPct(result.bounceRate, 2) }} sim={{ value: result.bounceRateSim, text: fmtPct(result.bounceRateSim, 2) }}
              delta={fmtPts(bounceDelta, 2)} deltaClass={bounceDelta > 0.0005 ? 'text-danger' : 'text-ink-muted'} danger={result.bounceRateSim > 0.03} />
            <div class={cx('flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px]', risk[0])}>
              <Icon name="alert" size={18} class="flex-none" />
              <span class="flex flex-col gap-0.5"><b>{risk[1]}</b><span class="text-[12.5px]">{risk[2]}</span></span>
            </div>
            <p class="text-[11.5px] leading-snug text-ink-muted">
              Supuestos por validar: entrega igual a la de este envío (70 % si tuvo rebote soft) y la apertura esperada de cada lista como fracción de la de este envío.
              No cuenta a quienes caerían en otra lista activa. Los bloqueos de Marketing Cloud no se pueden quitar, y las listas con candado tampoco (ley, reputación o fallecidos).
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
