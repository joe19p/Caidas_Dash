// Vista por comunicación: (1) se elige el día en el calendario del mes, (2) se busca y elige la comunicación, y se ve
// solo lo de ella en tres pestañas: Resumen, Motivos de no envío (Pareto) y Simulador.
import { useState } from 'preact/hooks';
import { overview, pick, dataKey } from '@/state/app.mjs';
import { readStored, writeStored } from '@/services/storage.mjs';
import { commMonth } from '@/state/period.mjs';
import { useLoad } from '@/lib/useLoad.mjs';
import { selectedJobs, toggleSelected, SELECTION_MAX } from '@/state/search.mjs';
import { Checkbox } from '@/ui/Checkbox.jsx';
import { DestinationBar } from '@/ui/DestinationBar.jsx';
import { BreakableName } from '@/ui/BreakableName.jsx';
import { api } from '@/services/api.mjs';
import { cx, fmtInt, fmtPct, hourOf, monthLong, weekdayIndex, addDays, dayLong } from '@/lib/format.mjs';
import { Icon } from '@/ui/Icon.jsx';
import { Skeleton, EmptyState, ErrorState } from '@/ui/States.jsx';
import { SummaryTab } from './SummaryTab.jsx';
import { FunnelTab } from './FunnelTab.jsx';
import { ParetoTab } from './ParetoTab.jsx';
import { SimulatorTab } from './SimulatorTab.jsx';

const setPick = partial => { pick.value = { ...pick.value, ...partial }; };

const pickDay = date => setPick({ day: date, job: '', q: '' });

/**
 * Calendario de días del mes elegido en la barra de arriba (el mes se cambia allí, no aquí). Se puede contraer a una
 * línea (día elegido y flechas al día con envíos anterior o siguiente) para que la lista gane alto; se recuerda.
 */
function DayPicker({ month, days, day }) {
  const [compact, setCompact] = useState(() => readStored('calendar_compact', false) === true);
  const toggle = () => { setCompact(!compact); writeStored('calendar_compact', !compact); };
  const first = `${month}-01`;
  const [year, monthNumber] = month.split('-').map(Number);
  const total = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const blanks = weekdayIndex(first);
  const sendDays = Object.keys(days).sort();
  const at = sendDays.indexOf(day);
  const [before, after] = [sendDays[at - 1], sendDays[at + 1]];
  const arrow = 'inline-flex size-[30px] flex-none items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted disabled:opacity-30';
  const header = (
    <div class="flex items-center justify-between gap-2">
      <span class="flex items-center gap-2 text-[13px] font-bold"><span class="inline-flex size-5 items-center justify-center rounded-full bg-brand text-[11.5px] text-white">1</span>Día de envío</span>
      <span class="flex items-center gap-1">
        {!compact && <span class="text-[13px] font-semibold text-ink-muted first-letter:uppercase">{monthLong(month)}</span>}
        <button type="button" class={arrow} aria-expanded={!compact} onClick={toggle}
          aria-label={compact ? 'Mostrar el calendario' : 'Contraer el calendario'} title={compact ? 'Mostrar el calendario' : 'Contraer el calendario'}>
          <Icon name="down" size={16} class={cx('transition-transform', !compact && 'rotate-180')} />
        </button>
      </span>
    </div>
  );
  if (compact) {
    return (
      <section class="panel flex flex-col gap-2 px-4 py-3">
        {header}
        <div class="flex items-center justify-between gap-2">
          <button type="button" class={arrow} disabled={!before} onClick={() => pickDay(before)} aria-label="Día con envíos anterior" title="Día con envíos anterior"><Icon name="left" size={16} /></button>
          <span class="min-w-0 text-center text-sm font-bold first-letter:uppercase">{day ? dayLong(day) : 'Sin envíos este mes'}
            {day && <span class="block text-xs font-medium text-ink-muted">{days[day]} {days[day] === 1 ? 'envío' : 'envíos'}</span>}</span>
          <button type="button" class={arrow} disabled={!after} onClick={() => pickDay(after)} aria-label="Día con envíos siguiente" title="Día con envíos siguiente"><Icon name="right" size={16} /></button>
        </div>
      </section>
    );
  }
  return (
    <section class="panel flex flex-col gap-2.5 px-4 py-3.5">
      {header}
      <div class="grid grid-cols-7 gap-1 text-center text-[11.5px] font-semibold text-ink-muted">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((letter, position) => <span key={position}>{letter}</span>)}
      </div>
      <div class="grid grid-cols-7 gap-1">
        {Array.from({ length: blanks }, (_, position) => <span key={`b${position}`} />)}
        {Array.from({ length: total }, (_, offset) => {
          const date = addDays(first, offset);
          const count = days[date] || 0;
          const on = date === day;
          return (
            <button key={date} type="button" disabled={!count} aria-pressed={on} onClick={() => pickDay(date)}
              aria-label={`${dayLong(date)}: ${count ? `${count} envíos` : 'sin envíos'}`}
              class={cx('flex h-[38px] flex-col items-center justify-center gap-0.5 rounded-lg text-[13px]',
                on ? 'bg-brand font-semibold text-white' : count ? 'font-semibold text-ink hover:bg-surface-muted' : 'text-line-strong')}>
              <span>{offset + 1}</span>
              <span class={cx('size-1 rounded-full', count ? (on ? 'bg-white' : 'bg-brand-text') : 'bg-transparent')} />
            </button>
          );
        })}
      </div>
      <span class="text-xs text-ink-muted">El punto marca los días con envíos.</span>
    </section>
  );
}

function CommList({ items, day, q, job }) {
  const query = q.trim().toLowerCase();
  const list = items.filter(item => item.start.slice(0, 10) === day && (!query || item.name.toLowerCase().includes(query)))
    .sort((a, b) => b.base - a.base);
  const total = items.filter(item => item.start.slice(0, 10) === day).length;
  return (
    <section class="panel flex flex-col overflow-hidden xl:min-h-0 xl:flex-1">
      <div class="flex flex-col gap-2.5 px-4 pt-3.5 pb-2.5">
        <span class="flex items-center gap-2 text-[13px] font-bold">
          <span class="inline-flex size-5 items-center justify-center rounded-full bg-brand text-[11.5px] text-white">2</span>
          Comunicación <span class="font-medium text-ink-muted">{list.length} de {total}</span>
        </span>
        <label class="relative flex items-center">
          <span class="sr-only">Filtrar las comunicaciones de este día</span>
          <Icon name="search" size={16} class="pointer-events-none absolute left-2.5 text-ink-muted" />
          <input type="search" value={q} onInput={event => setPick({ q: event.currentTarget.value })} placeholder="Filtrar este día: CYBER, PROMO…"
            autocomplete="off" class="field h-[38px] pl-8" />
        </label>
      </div>
      {/* Misma sangría que el buscador (px-4): la fila elegida no sobresale ni toca el borde de la tarjeta. */}
      <ul aria-label="Comunicaciones del día" class="flex max-h-[560px] flex-col gap-0.5 overflow-y-auto px-4 pt-0.5 pb-3 xl:max-h-none xl:min-h-0 xl:flex-1">
        {list.map(item => {
          const on = item.job === job;
          const base = item.base || 1;
          const chosen = selectedJobs.value.has(item.job);
          return (
            // La casilla va fuera del botón de la fila: elige para comparar sin abrir la comunicación.
            <li key={item.job} class={cx('flex items-start gap-2 rounded-[10px] pl-2.5', on ? 'bg-brand-soft ring-1 ring-brand-text ring-inset' : 'hover:bg-surface-muted')}>
              <Checkbox class="mt-[11px]" checked={chosen} onChange={() => toggleSelected(item)}
                disabled={!chosen && selectedJobs.value.size >= SELECTION_MAX}
                label={chosen ? `Quitar ${item.name} de las elegidas` : `Elegir ${item.name} para comparar`} />
              <button type="button" aria-current={on ? 'true' : undefined} onClick={() => setPick({ job: item.job })}
                class="flex min-w-0 flex-1 flex-col gap-1.5 py-2.5 pr-2.5 text-left">
                <span class="flex items-start justify-between gap-2">
                  {/* Dos líneas, cortando en los «_»: el final del nombre (segmento, versión) distingue un envío de otro. */}
                  <span class="line-clamp-2 min-w-0 text-[13px] font-semibold wrap-break-word" title={item.name}><BreakableName name={item.name} /></span>
                  <span class="flex-none text-xs text-ink-muted">{hourOf(item.start)}</span>
                </span>
                <DestinationBar item={item} />
                <span class="flex justify-between text-xs text-ink-muted">
                  <span>{fmtInt(item.base)} personas</span>
                  <span><b class="text-ink">{fmtPct(item.sends / base)}</b> enviado</span>
                </span>
              </button>
            </li>
          );
        })}
        {!list.length && <li class="px-2.5 py-4 text-center text-[13px] text-ink-muted">{q ? `Ninguna comunicación de este día coincide con «${q}».` : 'Este día no tiene envíos.'}</li>}
      </ul>
    </section>
  );
}

const TABS = [['funnel', 'Funnel', 'funnel'], ['resumen', 'Resumen', 'grid'], ['motivos', 'Motivos de no envío', 'bars'], ['simulador', 'Simulador', 'sliders']];

function Detail({ job }) {
  const [state, retry] = useLoad(job && `${dataKey.value}|${job}`, () => api.getCommunication(job));
  const tab = pick.value.tab;
  if (state.status === 'loading' && !state.data) return <div class="flex flex-col gap-4"><Skeleton class="h-24" /><Skeleton class="h-28" /><Skeleton class="h-72" /></div>;
  if (state.status === 'error') return <ErrorState text={state.error} onRetry={retry} />;
  const detail = state.data;
  const record = detail.record;
  return (
    <div class="flex flex-col gap-4">
      <div class="panel flex flex-wrap items-center gap-x-6 gap-y-2.5 px-5.5 py-4.5">
        <div class="flex min-w-0 flex-[1_1_360px] flex-col gap-1">
          <span class="text-[13px] font-semibold text-brand-text">Familia {record.family}</span>
          <h1 class="text-xl font-bold break-all">{record.name}</h1>
          <span class="text-[13px] text-ink-muted">
            <span class="inline-block first-letter:uppercase">{dayLong(record.start)}</span>, de {hourOf(record.start)}{record.end ? ` a ${hourOf(record.end)}` : ''}. JobID <span class="font-mono">{record.job}</span>{record.client ? `, ${record.client}` : ''}.
          </span>
        </div>
        <span class="flex flex-col items-end gap-0.5 text-right">
          <span class="text-xs text-ink-muted">Comparado con</span>
          <b class="text-[13px]">lo normal de los últimos 3 meses cerrados</b>
        </span>
      </div>
      {/* Un solo bloque: las pestañas arriba (la activa, con la línea de abajo) y su contenido dentro. Dentro, las
          secciones se separan con una línea (section-rule); la primera, no, porque ya está la línea de las pestañas. */}
      <div class="panel overflow-hidden">
        <div role="group" aria-label="Secciones de la comunicación" class="flex flex-wrap gap-x-5.5 border-b border-line px-4">
          {TABS.map(([id, label, icon]) => (
            <button key={id} type="button" aria-pressed={tab === id} onClick={() => setPick({ tab: id })}
              class={cx('-mb-px inline-flex h-[46px] items-center gap-2 border-b-2 px-1 text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-text',
                tab === id ? 'border-brand-text font-bold text-brand-text' : 'border-transparent font-semibold text-ink-muted hover:text-ink')}>
              <Icon name={icon} size={16} />{label}
            </button>
          ))}
        </div>
        <div class="flex flex-col gap-5 p-4 [&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">
          {tab === 'resumen' ? <SummaryTab detail={detail} onAllMotives={() => setPick({ tab: 'motivos' })} />
            : tab === 'motivos' ? <ParetoTab detail={detail} />
              : tab === 'simulador' ? <SimulatorTab key={record.job} detail={detail} />
                : <FunnelTab key={record.job} detail={detail} />}
        </div>
      </div>
    </div>
  );
}

export function CommunicationView() {
  const months = overview.value.data?.available?.months || [];
  const current = pick.value;
  // El mes se elige en la barra de arriba (state/period.mjs); la clave de los datos recarga tras «Actualizar datos».
  const month = commMonth.value;
  const [state, retry] = useLoad(month && `${dataKey.value}|${month}`, () => api.getMonth(month));
  if (overview.value.status === 'loading') return <Skeleton class="h-96" />;
  if (!months.length) return <EmptyState title="Todavía no hay envíos" text="Cuando la hoja tenga envíos, aquí se eligen por día." />;
  if (state.status === 'error') return <ErrorState text={state.error} onRetry={retry} />;
  const data = state.data;
  const days = data?.days || {};
  const sendDays = Object.keys(days).sort();
  const day = current.day && days[current.day] ? current.day : sendDays[sendDays.length - 1] || '';
  const ofDay = (data?.items || []).filter(item => item.start.slice(0, 10) === day).sort((a, b) => b.base - a.base);
  const job = current.job && ofDay.some(item => item.job === current.job) ? current.job : ofDay[0]?.job || '';
  return (
    <div class="flex flex-wrap items-start gap-4">
      {/* En pantallas anchas (lado a lado) la columna queda fija al hacer scroll, entre la barra azul (--header-h) y la de estado (40 px), y ocupa ese alto: el
          calendario mantiene su tamaño y la tarjeta de la lista llega hasta el fondo (la lista se recorre por dentro).
          Apilado (pantallas angostas), no se fija. */}
      <aside aria-label="Elegir comunicación" class="flex min-w-0 max-w-[380px] flex-[1_1_340px] flex-col gap-3 xl:sticky xl:top-[calc(var(--header-h,0px)+1rem)] xl:h-[calc(100vh-var(--header-h,0px)-2rem-40px)]">
        {data ? <>
          <DayPicker month={month} days={days} day={day} />
          <CommList items={data.items} day={day} q={current.q} job={job} />
        </> : <><Skeleton class="h-72" /><Skeleton class="h-96" /></>}
      </aside>
      <section class="flex min-w-0 flex-[999_1_640px] flex-col gap-4">
        {job ? <Detail job={job} /> : data && <EmptyState title="Elige un día con envíos" text="Los días con un punto tienen comunicaciones." />}
      </section>
    </div>
  );
}
