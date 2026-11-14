// Calendario de los últimos 3 meses cerrados: cada día con sus comunicaciones o su apertura, en una escala de 5 pasos.
// Al elegir un día se ve su resumen y el enlace a sus comunicaciones.
import { useState } from 'preact/hooks';
import { cx, fmtPct, dayLong, dayShort, addDays, weekdayIndex, monthRange, MONTHS, WEEKDAYS } from '@/lib/format.mjs';
import { Segmented } from '@/ui/Segmented.jsx';
import { openCommunication } from '@/state/app.mjs';

// Clases literales: Tailwind solo emite las que encuentra escritas.
const STEP = ['', 'bg-s1 text-on-s1', 'bg-s2 text-on-s2', 'bg-s3 text-on-s3', 'bg-s4 text-on-s4', 'bg-s5 text-on-s5'];
const SWATCH = ['bg-s1', 'bg-s2', 'bg-s3', 'bg-s4', 'bg-s5'];

/** Cortes de la escala por cuantiles de los días con envíos (así se ve el contraste aunque cambie el volumen). */
function cutsOf(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return [0, 0, 0, 0];
  return [0.2, 0.4, 0.6, 0.8].map(q => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]);
}

export function CalendarHeat({ calendar }) {
  const [metric, setMetric] = useState('comms');
  const [selected, setSelected] = useState('');
  const first = `${calendar.from}-01`;
  const [ty, tm] = calendar.to.split('-').map(Number);
  const lastDay = new Date(Date.UTC(ty, tm, 0)).toISOString().slice(0, 10);
  const start = addDays(first, -weekdayIndex(first));
  const weeks = Math.ceil(((Date.parse(lastDay) - Date.parse(start)) / 864e5 + 1) / 7);
  const valueOf = day => {
    const info = calendar.days[day];
    if (!info) return null;
    return metric === 'comms' ? info.comms : info.or;
  };
  const cuts = cutsOf(Object.keys(calendar.days).map(valueOf).filter(value => value != null));
  const step = value => 1 + cuts.filter(cut => value > cut).length;
  const cells = [];
  const monthLabels = [];
  for (let week = 0; week < weeks; week++) {
    let label = '';
    for (let day = 0; day < 7; day++) {
      const date = addDays(start, week * 7 + day);
      if (date.slice(8) === '01' && date <= lastDay) label = MONTHS[Number(date.slice(5, 7)) - 1];
      cells.push(date);
    }
    monthLabels.push(label);
  }
  const days = Object.keys(calendar.days).sort();
  const chosen = calendar.days[selected] ? selected : days[days.length - 1] || '';
  const sums = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  days.forEach(day => {
    const value = valueOf(day);
    if (value == null) return;
    sums[weekdayIndex(day)] += value;
    counts[weekdayIndex(day)] += 1;
  });
  const averages = sums.map((sum, index) => (counts[index] ? sum / counts[index] : 0));
  const topAverage = Math.max(...averages) || 1;
  const text = value => (value == null ? '' : metric === 'comms' ? String(value) : (value * 100).toFixed(1));
  const info = calendar.days[chosen];
  return (
    <section aria-labelledby="cal-t" class="section-rule gap-3.5">
      <div class="flex flex-wrap items-start justify-between gap-2.5">
        <div>
          <h2 id="cal-t" class="text-base font-bold">Calendario de envíos: {monthRange(calendar.from, calendar.to)}</h2>
          <p class="mt-0.5 text-[12.5px] text-ink-muted">Últimos 3 meses cerrados. Elige un día para ver su resumen e ir a sus comunicaciones.</p>
        </div>
        <Segmented label="Qué mostrar en el calendario" value={metric} onChange={setMetric}
          options={[{ value: 'comms', label: 'Comunicaciones por día' }, { value: 'or', label: 'Apertura' }]} />
      </div>
      <div class="flex flex-wrap items-start gap-7">
        <div class="flex min-w-0 flex-[999_1_760px] flex-col gap-2 overflow-x-auto">
          <div class="grid min-w-[700px] gap-[5px] text-xs font-bold text-ink-muted" style={{ gridTemplateColumns: `36px repeat(${weeks}, minmax(40px, 1fr))` }}>
            <span />
            {monthLabels.map((label, index) => <span key={index}>{label}</span>)}
          </div>
          <div class="grid min-w-[700px] grid-flow-col gap-[5px]" style={{ gridTemplateColumns: `36px repeat(${weeks}, minmax(40px, 1fr))`, gridTemplateRows: 'repeat(7, 40px)' }}>
            {WEEKDAYS.map(name => <span key={name} class="flex items-center text-xs font-semibold text-ink-muted">{name}</span>)}
            {cells.map(date => {
              const inRange = date >= first && date <= lastDay;
              const value = valueOf(date);
              const has = value != null;
              const label = inRange ? `${dayShort(date)}: ${has ? `${calendar.days[date].comms} comunicaciones, apertura ${fmtPct(calendar.days[date].or)}` : 'sin envíos'}` : '';
              return (
                <button key={date} type="button" aria-label={label} title={label} aria-pressed={chosen === date} disabled={!has}
                  onClick={() => setSelected(date)} onMouseEnter={() => has && setSelected(date)}
                  class={cx('flex flex-col items-start justify-between rounded-[7px] px-1.5 py-1 text-left',
                    !inRange ? 'invisible' : has ? `${STEP[step(value)]} cursor-pointer` : 'border border-dashed border-line-strong text-ink-muted',
                    chosen === date && 'outline-[2.5px] outline-offset-2 outline-ink')}>
                  <span class="text-[10.5px] font-semibold opacity-80">{inRange ? Number(date.slice(8)) : ''}</span>
                  <span class="text-[12.5px] font-bold">{text(value)}</span>
                </button>
              );
            })}
          </div>
          <div class="ml-[42px] flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
            {metric === 'comms' ? 'Pocas' : 'Menor apertura'}
            {SWATCH.map(swatch => <span key={swatch} class={cx('h-[11px] w-[26px] rounded-[3px]', swatch)} />)}
            {metric === 'comms' ? 'Más comunicaciones' : 'Mayor apertura'}
            <span class="ml-3 h-[11px] w-[26px] rounded-[3px] border border-dashed border-line-strong" />Sin envíos
          </div>
        </div>
        <aside class="flex min-w-0 flex-[1_1_260px] flex-col gap-3.5">
          {info && (
            <div aria-live="polite" class="flex flex-col gap-1 rounded-xl bg-surface-muted px-4 py-3.5">
              <span class="text-[12.5px] font-semibold text-ink-muted first-letter:uppercase">{dayLong(chosen)}</span>
              <span class="flex items-baseline gap-2"><b class="text-[28px] font-extrabold">{info.comms}</b><span class="text-[13px] text-ink-muted">comunicaciones</span></span>
              <span class="text-[13px]">{info.sends} envíos, con apertura mediana de <b>{fmtPct(info.or)}</b></span>
              <button type="button" class="mt-1.5 self-start text-[13px] font-semibold text-brand-text hover:underline" onClick={() => openCommunication({ day: chosen })}>
                Ver las comunicaciones de este día
              </button>
            </div>
          )}
          <div class="flex flex-col gap-2">
            <span class="text-[13px] font-bold">{metric === 'comms' ? 'Comunicaciones promedio por día de la semana' : 'Apertura promedio por día de la semana'}</span>
            {WEEKDAYS.map((name, index) => (
              <div key={name} class="grid grid-cols-[34px_minmax(0,1fr)_52px] items-center gap-2.5 text-[12.5px]">
                <span class="font-semibold text-ink-muted">{name}</span>
                <span class="h-2 rounded bg-surface-muted"><span class={cx('block h-full rounded', averages[index] === topAverage ? 'bg-s5' : 'bg-s3')} style={{ width: `${(averages[index] / topAverage) * 100}%` }} /></span>
                <b class="text-right">{counts[index] ? (metric === 'comms' ? averages[index].toFixed(0) : fmtPct(averages[index])) : '—'}</b>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
