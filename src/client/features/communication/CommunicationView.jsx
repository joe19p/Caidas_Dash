// Vista por comunicación: (1) se elige el día en el calendario del mes, (2) se busca y elige la comunicación, y se ve
// solo lo de ella en tres pestañas: Resumen, Motivos de no envío (Pareto) y Simulador.
import { useEffect, useState } from 'preact/hooks';
import { overview, pick } from '@/state/app.mjs';
import { api } from '@/services/api.mjs';
import { cx, fmtInt, fmtPct, hourOf, monthLong, weekdayIndex, addDays, dayLong } from '@/lib/format.mjs';
import { Icon } from '@/ui/Icon.jsx';
import { Skeleton, EmptyState, ErrorState } from '@/ui/States.jsx';
import { SummaryTab } from './SummaryTab.jsx';
import { ParetoTab } from './ParetoTab.jsx';
import { SimulatorTab } from './SimulatorTab.jsx';

const setPick = partial => { pick.value = { ...pick.value, ...partial }; };

/** Carga con estado: { status, data, error } y reintento. */
function useLoad(key, load) {
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!key) return undefined;
    let alive = true;
    setState(previous => ({ status: 'loading', data: previous.key === key ? previous.data : null, error: '', key }));
    load().then(data => { if (alive) setState({ status: 'ready', data, error: '', key }); })
      .catch(error => { if (alive) setState({ status: 'error', data: null, error: error.text || error.message, key }); });
    return () => { alive = false; };
  }, [key, attempt]);
  return [state, () => setAttempt(value => value + 1)];
}

function DayPicker({ month, months, days, day }) {
  const index = months.indexOf(month);
  const older = months[index + 1];
  const newer = index > 0 ? months[index - 1] : null;
  const first = `${month}-01`;
  const [year, monthNumber] = month.split('-').map(Number);
  const total = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const blanks = weekdayIndex(first);
  const goMonth = target => setPick({ month: target, day: '', job: '', q: '' });
  return (
    <section class="panel flex flex-col gap-2.5 px-4 py-3.5">
      <div class="flex items-center justify-between">
        <span class="flex items-center gap-2 text-[13px] font-bold"><span class="inline-flex size-5 items-center justify-center rounded-full bg-brand text-[11.5px] text-white">1</span>Día de envío</span>
        <span class="flex items-center gap-0.5">
          <button type="button" aria-label="Mes anterior" disabled={!older} onClick={() => goMonth(older)} class="inline-flex size-[30px] items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted disabled:opacity-30"><Icon name="left" size={16} /></button>
          <b class="min-w-[124px] text-center text-[13px] first-letter:uppercase">{monthLong(month)}</b>
          <button type="button" aria-label="Mes siguiente" disabled={!newer} onClick={() => goMonth(newer)} class="inline-flex size-[30px] items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted disabled:opacity-30"><Icon name="right" size={16} /></button>
        </span>
      </div>
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
            <button key={date} type="button" disabled={!count} aria-pressed={on} onClick={() => setPick({ day: date, job: '', q: '' })}
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
    <section class="panel flex flex-col overflow-hidden">
      <div class="flex flex-col gap-2.5 px-4 pt-3.5 pb-2.5">
        <span class="flex items-center gap-2 text-[13px] font-bold">
          <span class="inline-flex size-5 items-center justify-center rounded-full bg-brand text-[11.5px] text-white">2</span>
          Comunicación <span class="font-medium text-ink-muted">· {list.length} de {total}</span>
        </span>
        <label class="relative flex items-center">
          <span class="sr-only">Buscar comunicación</span>
          <Icon name="search" size={16} class="pointer-events-none absolute left-2.5 text-ink-muted" />
          <input type="search" value={q} onInput={event => setPick({ q: event.currentTarget.value })} placeholder="Buscar: CYBER, PROMO, ONBOARDING…"
            autocomplete="off" class="field h-[38px] pl-8" />
        </label>
      </div>
      <ul role="listbox" aria-label="Comunicaciones del día" class="flex max-h-[560px] flex-col gap-0.5 overflow-y-auto px-2 pb-2">
        {list.map(item => {
          const on = item.job === job;
          const base = item.base || 1;
          const delivered = Math.max(0, item.deliv);
          return (
            <li key={item.job} role="option" aria-selected={on}>
              <button type="button" onClick={() => setPick({ job: item.job })}
                class={cx('flex w-full flex-col gap-1.5 rounded-[10px] p-2.5 text-left hover:bg-surface-muted', on && 'bg-brand-soft ring-1 ring-brand-text hover:bg-brand-soft')}>
                <span class="flex items-baseline justify-between gap-2">
                  <span class="truncate font-mono text-xs" title={item.name}>{item.name}</span>
                  <span class="flex-none text-xs text-ink-muted">{hourOf(item.start)}</span>
                </span>
                <span class="flex h-1.5 gap-0.5" aria-hidden="true">
                  <span class="rounded-l-[3px] bg-ent" style={{ width: `${(delivered / base) * 100}%` }} />
                  <span class="bg-reb" style={{ width: `${(item.bounces / base) * 100}%` }} />
                  <span class="bg-blq" style={{ width: `${(item.blq / base) * 100}%` }} />
                  <span class="flex-1 rounded-r-[3px] bg-asl" />
                </span>
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

const TABS = [['resumen', 'Resumen', 'grid'], ['motivos', 'Motivos de no envío', 'bars'], ['simulador', 'Simulador', 'sliders']];

function Detail({ job }) {
  const [state, retry] = useLoad(job, () => api.getCommunication(job));
  const tab = pick.value.tab;
  if (state.status === 'loading' && !state.data) return <div class="flex flex-col gap-4"><Skeleton class="h-24" /><Skeleton class="h-28" /><Skeleton class="h-72" /></div>;
  if (state.status === 'error') return <ErrorState text={state.error} onRetry={retry} />;
  const detail = state.data;
  const record = detail.record;
  return (
    <div class="flex flex-col gap-4">
      <div class="panel flex flex-wrap items-center gap-x-6 gap-y-2.5 px-5.5 py-4.5">
        <div class="flex min-w-0 flex-[1_1_360px] flex-col gap-1">
          <span class="eyebrow">{record.family}</span>
          <h1 class="font-mono text-xl font-medium break-all">{record.name}</h1>
          <span class="text-[13px] text-ink-muted">
            {dayLong(record.start)} · {hourOf(record.start)}{record.end ? ` → ${hourOf(record.end)}` : ''} · JobID {record.job}{record.client ? ` · ${record.client}` : ''}
          </span>
        </div>
        <span class="flex flex-col items-end gap-0.5 text-right">
          <span class="text-xs text-ink-muted">Comparado con</span>
          <b class="text-[13px]">lo normal de los últimos 3 meses cerrados</b>
        </span>
      </div>
      <div role="group" aria-label="Secciones de la comunicación" class="-mt-1 flex flex-wrap border-b border-line">
        {TABS.map(([id, label, icon]) => (
          <button key={id} type="button" aria-pressed={tab === id} onClick={() => setPick({ tab: id })}
            class={cx('-mb-px mr-5.5 inline-flex h-[42px] items-center gap-2 border-b-2 px-1 text-sm',
              tab === id ? 'border-brand-text font-bold text-brand-text' : 'border-transparent font-semibold text-ink-muted hover:text-ink')}>
            <Icon name={icon} size={16} />{label}
          </button>
        ))}
      </div>
      {tab === 'motivos' ? <ParetoTab detail={detail} /> : tab === 'simulador' ? <SimulatorTab key={record.job} detail={detail} /> : <SummaryTab detail={detail} onAllMotives={() => setPick({ tab: 'motivos' })} />}
    </div>
  );
}

export function CommunicationView() {
  const available = overview.value.data?.available;
  const months = available?.months || [];
  const current = pick.value;
  const month = current.month && months.includes(current.month) ? current.month : months[0];
  const [state, retry] = useLoad(month, () => api.getMonth(month));
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
      <aside aria-label="Elegir comunicación" class="flex min-w-0 max-w-[380px] flex-[1_1_340px] flex-col gap-3">
        {data ? <>
          <DayPicker month={month} months={months} days={days} day={day} />
          <CommList items={data.items} day={day} q={current.q} job={job} />
        </> : <><Skeleton class="h-72" /><Skeleton class="h-96" /></>}
      </aside>
      <section class="flex min-w-0 flex-[999_1_640px] flex-col gap-4">
        {job ? <Detail job={job} /> : data && <EmptyState title="Elige un día con envíos" text="Los días con un punto tienen comunicaciones." />}
      </section>
    </div>
  );
}
