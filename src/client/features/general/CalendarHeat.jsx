// Calendario de los 3 meses que terminan en el periodo elegido, lado a lado: cada día con sus comunicaciones o su
// apertura, en una escala de 5 pasos. Debajo, el día elegido (con el enlace a sus comunicaciones) y el promedio por día
// de la semana.
import { useState } from 'preact/hooks';
import { cx, fmtPct, dayLong, dayShort, weekdayIndex, monthRange, monthLong, shiftMonth, daysInMonth, WEEKDAYS } from '@/lib/format.mjs';
import { Segmented } from '@/ui/Segmented.jsx';
import { Panel } from '@/ui/Panel.jsx';
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
  const valueOf = day => {
    const info = calendar.days[day];
    if (!info) return null;
    return metric === 'comms' ? info.comms : info.or;
  };
  const cuts = cutsOf(Object.keys(calendar.days).map(valueOf).filter(value => value != null));
  const step = value => 1 + cuts.filter(cut => value > cut).length;
  const months = [calendar.from, shiftMonth(calendar.from, 1), calendar.to].filter((month, index, list) => list.indexOf(month) === index && month <= calendar.to);
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
    <Panel boxed id="calendar" class="h-full" title={`Calendario de envíos: ${monthRange(calendar.from, calendar.to)}`}
      subtitle="Los 3 meses que terminan en el periodo elegido. Más oscuro, más. Elige un día para ver su resumen e ir a sus comunicaciones."
      actions={<Segmented label="Qué mostrar en el calendario" value={metric} onChange={setMetric}
        options={[{ value: 'comms', label: 'Comunicaciones por día' }, { value: 'or', label: 'Apertura' }]} />}>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(min(250px,100%),1fr))] gap-x-6 gap-y-5">
        {months.map(month => {
          const first = `${month}-01`;
          const blanks = weekdayIndex(first);
          const total = daysInMonth(month);
          return (
            <div key={month} class="flex min-w-0 flex-col gap-1.5">
              <b class="text-sm first-letter:uppercase">{monthLong(month)}</b>
              <div class="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-ink-muted">
                {WEEKDAYS.map(name => <span key={name}>{name}</span>)}
              </div>
              <div class="grid grid-cols-7 gap-1">
                {Array.from({ length: blanks }, (_, index) => <span key={`b${index}`} />)}
                {Array.from({ length: total }, (_, index) => {
                  const date = `${month}-${String(index + 1).padStart(2, '0')}`;
                  const value = valueOf(date);
                  const has = value != null;
                  const label = `${dayShort(date)}: ${has ? `${calendar.days[date].comms} comunicaciones, apertura ${fmtPct(calendar.days[date].or)}` : 'sin envíos'}`;
                  return (
                    <button key={date} type="button" aria-label={label} title={label} aria-pressed={chosen === date} disabled={!has}
                      onClick={() => setSelected(date)} onMouseEnter={() => has && setSelected(date)}
                      class={cx('flex h-11 min-w-0 flex-col items-start justify-between rounded-[7px] px-1.5 py-1 text-left',
                        has ? `${STEP[step(value)]} cursor-pointer` : 'border border-dashed border-line text-ink-muted',
                        chosen === date && 'outline-[2.5px] outline-offset-2 outline-ink')}>
                      <span class="text-[10.5px] leading-none font-semibold opacity-80">{index + 1}</span>
                      <span class="text-[12.5px] leading-none font-bold">{text(value)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div class="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
        {metric === 'comms' ? 'Pocas' : 'Menor apertura'}
        {SWATCH.map(swatch => <span key={swatch} class={cx('h-[11px] w-[26px] rounded-[3px]', swatch)} />)}
        {metric === 'comms' ? 'Más comunicaciones' : 'Mayor apertura'}
        <span class="ml-3 h-[11px] w-[26px] rounded-[3px] border border-dashed border-line-strong" />Sin envíos
      </div>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-4 border-t border-line pt-3.5">
        {info ? (
          <div aria-live="polite" class="flex flex-col gap-1 rounded-xl bg-surface-muted px-4 py-3">
            <span class="text-[12.5px] font-semibold text-ink-muted first-letter:uppercase">{dayLong(chosen)}</span>
            <span class="flex items-baseline gap-2"><b class="text-[26px] font-extrabold">{info.comms}</b><span class="text-[13px] text-ink-muted">comunicaciones</span></span>
            <span class="text-[13px]">{info.sends} envíos, con apertura mediana de <b>{fmtPct(info.or)}</b></span>
            <button type="button" class="mt-1 self-start text-[13px] font-semibold text-brand-text hover:underline" onClick={() => openCommunication({ day: chosen })}>
              Ver las comunicaciones de este día
            </button>
          </div>
        ) : <p class="text-[13px] text-ink-muted">No hay envíos en estos meses.</p>}
        <div class="flex flex-col gap-1.5">
          <span class="text-[13px] font-bold">{metric === 'comms' ? 'Comunicaciones promedio por día de la semana' : 'Apertura promedio por día de la semana'}</span>
          {WEEKDAYS.map((name, index) => (
            <div key={name} class="grid grid-cols-[34px_minmax(0,1fr)_52px] items-center gap-2.5 text-[12.5px]">
              <span class="font-semibold text-ink-muted">{name}</span>
              <span class="h-2 rounded bg-surface-muted"><span class={cx('block h-full rounded', averages[index] === topAverage ? 'bg-s5' : 'bg-s3')} style={{ width: `${(averages[index] / topAverage) * 100}%` }} /></span>
              <b class="text-right">{counts[index] ? (metric === 'comms' ? averages[index].toFixed(1) : fmtPct(averages[index])) : '—'}</b>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
