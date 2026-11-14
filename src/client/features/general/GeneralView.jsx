// Vista general: lo que la gerencia puede usar sin dudas. Protagonistas: comunicaciones distintas enviadas y open rate
// frente a su histórico. Todo en tasas (no se suman personas entre comunicaciones). El periodo se elige en la barra
// de arriba (state/period.mjs); el mes en curso va hasta hoy y se compara con los mismos días del periodo anterior.
import { useRef, useState } from 'preact/hooks';
import { overview, loadOverview, openCommunication, dataKey } from '@/state/app.mjs';
import { periodRange } from '@/state/period.mjs';
import { api } from '@/services/api.mjs';
import { useLoad } from '@/lib/useLoad.mjs';
import { cx, fmtInt, fmtPct, fmtPts, monthShort, dayShort, periodText, monthCount, daysInMonth } from '@/lib/format.mjs';
import { Segmented } from '@/ui/Segmented.jsx';
import { Sparkline } from '@/ui/Sparkline.jsx';
import { Panel } from '@/ui/Panel.jsx';
import { MetricIcon } from '@/ui/MetricIcon.jsx';
import { Trend } from '@/ui/Trend.jsx';
import { deltaTone } from '@/ui/Delta.jsx';
import { Skeleton, EmptyState, ErrorState } from '@/ui/States.jsx';
import { messageText } from '@shared/messages.mjs';
import { METRICS, SECONDARY, rateOf, valueOf, formatValue } from './metricsDefs.mjs';
import { Timeline } from './Timeline.jsx';
import { CalendarHeat } from './CalendarHeat.jsx';
import { DropsChart } from './DropsChart.jsx';
import { FamiliesTable, FamilyScatter } from './FamiliesPanel.jsx';
import { Highlights } from './Highlights.jsx';

/** Meses del periodo, con el mes en curso contado por la parte que va (14 de 30 días = 0.47). */
const monthsIn = period => monthCount(period.from, period.to) - (period.cut ? 1 - period.cut / daysInMonth(period.to) : 0);
/** Si un mes del historial cae en el periodo. */
const inPeriod = (month, period) => month >= period.from && month <= period.to;
/** Indicadores que se eligen sobre la línea de tiempo (los mismos que se tocan en las tarjetas). */
const TIMELINE_OPTIONS = ['comms', 'or', ...SECONDARY].map(key => ({ value: key, label: METRICS[key].label }));
const MODES = [
  { value: 'com', label: 'Por comunicación', help: 'Cada comunicación pesa igual (mediana)' },
  { value: 'vol', label: 'Por volumen', help: 'Las comunicaciones grandes pesan más' }
];

/** Variación de un indicador: % para comunicaciones, puntos para tasas. */
function deltaText(key, now, before) {
  if (now == null || before == null) return { text: 'Sin periodo anterior para comparar', tone: 'text-ink-muted' };
  if (key === 'comms') {
    if (!before) return { text: 'Sin periodo anterior para comparar', tone: 'text-ink-muted' };
    const change = (now - before) / before;
    if (Math.abs(change) < 0.005) return { text: 'Igual que el periodo anterior', tone: 'text-ink-muted' };
    return { text: `${Math.abs(change * 100).toFixed(0)}% vs periodo anterior`, tone: 'text-ink-muted', delta: change };
  }
  const delta = now - before;
  const digits = key === 'deliv' || key === 'or' ? 1 : 2;
  return { text: `${fmtPts(Math.abs(delta), digits).replace('+', '')} vs anterior`, tone: deltaTone(delta, METRICS[key].better), delta: delta || 0.000001 };
}

function HeroComms({ period, history, active, onPick }) {
  const delta = deltaText('comms', period.kpis.comms, period.prev.sends ? period.prev.comms : null);
  const max = Math.max(...history.map(item => item.comms), 1);
  const width = 520 / history.length;
  const several = monthCount(period.from, period.to) > 1;
  return (
    <button type="button" aria-pressed={active} onClick={onPick}
      class={cx('panel flex flex-col gap-2 px-6 pt-5 pb-3.5 text-left', active ? 'border-brand-text ring-3 ring-brand-soft' : '')}>
      <span class="flex items-center gap-2 text-[13px] font-bold text-ink-muted"><MetricIcon metric="comms" />Comunicaciones distintas enviadas</span>
      <span class="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5">
        <b class="text-[52px] leading-none font-extrabold tracking-tight">{fmtInt(period.kpis.comms)}</b>
        <span class="text-sm text-ink-muted">
          {several ? <>unas <b class="text-ink">{fmtInt(period.kpis.comms / monthsIn(period))}</b> por mes, en </> : period.cut ? `en los primeros ${period.cut} días, en ` : 'en '}
          {fmtInt(period.kpis.sends)} envíos
        </span>
      </span>
      <Trend delta={delta.delta} class={cx('text-[13px] font-semibold', delta.tone)}>{delta.text}</Trend>
      <svg role="img" aria-label="Comunicaciones por mes, últimos 24 meses y el mes en curso" viewBox="0 0 520 110" class="mt-1 block h-auto w-full">
        {/* El mes en curso va a medias: rayado. */}
        <defs>
          <pattern id="partial-month" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--color-brand-soft)" />
            <rect width="3" height="6" fill="var(--color-series)" />
          </pattern>
        </defs>
        {history.map((item, index) => {
          const height = (item.comms / max) * 92;
          const fill = !inPeriod(item.month, period) ? 'var(--color-line-strong)' : item.partial ? 'url(#partial-month)' : 'var(--color-series)';
          return (
            <rect key={item.month} x={index * width + 2} y={96 - height} width={Math.max(1, width - 4)} height={height} rx="3" fill={fill}
              data-tip={`${monthShort(item.month)}: ${item.comms} comunicaciones${item.partial ? ' (mes en curso, hasta hoy)' : ''}`} />
          );
        })}
        <text x="0" y="108" font-size="11" fill="var(--color-ink-muted)">{monthShort(history[0].month)}</text>
        <text x="520" y="108" text-anchor="end" font-size="11" fill="var(--color-ink-muted)">{monthShort(history[history.length - 1].month)}</text>
      </svg>
    </button>
  );
}

function HeroOpen({ period, historic, history, mode, active, onPick }) {
  const value = rateOf(period.kpis.metrics.or, mode);
  const hist = rateOf(historic.metrics.or, mode);
  const diff = value != null && hist != null ? value - hist : null;
  const series = history.map(item => rateOf(item.metrics.or, mode));
  const known = series.filter(item => item != null);
  const low = Math.min(...known, hist ?? 1) - 0.01;
  const high = Math.max(...known, hist ?? 0) + 0.01;
  const ox = index => 6 + (index / (series.length - 1 || 1)) * 508;
  const oy = rate => 92 - ((rate - low) / (high - low || 1)) * 84;
  const line = series.map((rate, index) => (rate == null ? null : `${ox(index).toFixed(1)},${oy(rate).toFixed(1)}`)).filter(Boolean).join(' ');
  const lastIndex = series.length - 1;
  const inside = history.map((item, index) => (inPeriod(item.month, period) ? index : -1)).filter(index => index >= 0);
  const partialLast = history[lastIndex]?.partial;
  return (
    <button type="button" aria-pressed={active} onClick={onPick}
      class={cx('panel flex flex-col gap-2 px-6 pt-5 pb-3.5 text-left', active ? 'border-brand-text ring-3 ring-brand-soft' : '')}>
      <span class="flex items-center gap-2 text-[13px] font-bold text-ink-muted"><MetricIcon metric="or" />Open rate del periodo</span>
      <span class="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5">
        <b class="text-[52px] leading-none font-extrabold tracking-tight">{fmtPct(value)}</b>
        <span class="text-sm text-ink-muted">promedio histórico <b class="text-ink">{fmtPct(hist)}</b></span>
      </span>
      <span class={cx('text-[13px] font-semibold', deltaTone(diff, 'up'))}>
        <Trend delta={diff == null || Math.abs(diff) < 0.001 ? null : diff}>
          {diff == null ? 'Sin histórico para comparar' : Math.abs(diff) < 0.001 ? 'Igual a su promedio histórico' : `${fmtPts(Math.abs(diff)).replace('+', '')} frente a su promedio histórico`}
        </Trend>
      </span>
      <svg role="img" aria-label="Open rate por mes frente al promedio histórico" viewBox="0 0 520 110" class="mt-1 block h-auto w-full">
        {inside.length > 0 && <rect x={ox(inside[0]) - 10} y="0" width={ox(inside[inside.length - 1]) - ox(inside[0]) + 20} height="96" rx="4" fill="var(--color-brand-soft)" opacity="0.6" />}
        {hist != null && <>
          <line x1="0" x2="520" y1={oy(hist)} y2={oy(hist)} stroke="var(--color-ink-muted)" stroke-width="1.5" stroke-dasharray="5 5" />
          <text x="4" y={oy(hist) - 6} font-size="11" font-weight="600" fill="var(--color-ink-muted)">Histórico {fmtPct(hist)}</text>
        </>}
        <polyline points={line} fill="none" stroke="var(--color-series)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
        {/* El mes en curso, hueco: va a medias. */}
        {series[lastIndex] != null && <circle cx={ox(lastIndex)} cy={oy(series[lastIndex])} r="4.5" fill={partialLast ? 'var(--color-surface)' : 'var(--color-series)'}
          stroke={partialLast ? 'var(--color-series)' : 'var(--color-surface)'} stroke-width="2" />}
        <text x="0" y="108" font-size="11" fill="var(--color-ink-muted)">{monthShort(history[0].month)}</text>
        <text x="520" y="108" text-anchor="end" font-size="11" fill="var(--color-ink-muted)">{monthShort(history[lastIndex].month)}</text>
      </svg>
    </button>
  );
}

function Kpi({ metricKey, period, history, mode, active, onPick }) {
  const now = valueOf(period.kpis, metricKey, mode);
  const before = period.prev.sends ? valueOf(period.prev, metricKey, mode) : null;
  const delta = deltaText(metricKey, now, before);
  return (
    <button type="button" aria-pressed={active} onClick={onPick}
      class={cx('flex flex-col justify-between gap-2 rounded-2xl border bg-surface px-4 py-3.5 text-left', active ? 'border-brand-text ring-3 ring-brand-soft' : 'border-line hover:border-line-strong')}>
      <span class="flex items-center gap-2 text-[12.5px] font-semibold text-ink-muted"><MetricIcon metric={metricKey} size="size-6" iconSize={14} />{METRICS[metricKey].label}</span>
      <span class="flex items-end justify-between gap-2">
        <b class="text-[26px] leading-none font-bold">{formatValue(metricKey, now)}</b>
        <Sparkline values={history.map(item => valueOf(item, metricKey, mode))} />
      </span>
      <Trend delta={delta.delta} class={cx('text-xs font-semibold', delta.tone)}>{delta.text}</Trend>
    </button>
  );
}

function RulesPanel({ rules, mode }) {
  return (
    <Panel boxed id="rules" class="h-full" title="Reglas de protección aplicadas"
      subtitle="Peso de cada regla del CRM y de Marketing Cloud en lo que no se envió, y cómo cambia.">
      <div class="grid grid-cols-[minmax(0,1fr)_56px_100px_72px] items-center gap-x-3 border-b border-line pb-1.5 text-xs font-semibold text-ink-muted">
        <span>Regla</span><span class="text-right">Peso</span><span>24 meses</span><span class="text-right">vs anterior</span>
      </div>
      {rules.map(rule => {
        const share = rule.share[mode];
        const delta = share - rule.prev[mode];
        return (
          <div key={rule.code || 'otros'} class="grid grid-cols-[minmax(0,1fr)_56px_100px_72px] items-center gap-x-3">
            <span class="flex min-w-0 items-center gap-2 text-[13px] font-semibold">
              <span class={cx('size-[9px] flex-none rounded-[3px]', rule.origin === 'blq' ? 'bg-blq' : 'bg-asl')} />
              <span class="truncate" title={rule.code || ''}>{rule.name}</span>
            </span>
            <b class="text-right text-[13px]">{fmtPct(share)}</b>
            <Sparkline values={rule.series} width={100} height={26} stroke={rule.origin === 'blq' ? 'var(--color-blq)' : 'var(--color-asl)'} />
            <Trend delta={Math.abs(delta) < 0.0005 ? null : delta} class="justify-end text-right text-xs font-semibold text-ink-muted">{Math.abs(delta) < 0.0005 ? 'Igual' : fmtPts(Math.abs(delta)).replace('+', '')}</Trend>
          </div>
        );
      })}
      <div class="flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-2.5 text-xs text-ink-muted">
        <span class="flex items-center gap-1.5"><span class="size-[9px] rounded-[3px] bg-asl" />Lista de autosupresión del CRM</span>
        <span class="flex items-center gap-1.5"><span class="size-[9px] rounded-[3px] bg-blq" />Estado de Marketing Cloud</span>
      </div>
    </Panel>
  );
}

const REVIEW_TEXT = { or: ['apertura', 'bajo'], ctor: ['CTOR', 'bajo'], bounce: ['rebote', 'sobre'], unsub: ['bajas', 'sobre'] };

function ReviewPanel({ review }) {
  return (
    <Panel boxed id="review" class="h-full" title="Comunicaciones a revisar" subtitle="Las que más se alejan de lo normal en su familia durante el periodo. Toca una para verla en detalle.">
      {review.length ? (
        <div class="flex flex-col gap-2">
          {review.map(item => {
            const [metric, side] = REVIEW_TEXT[item.metric];
            const digits = item.metric === 'or' ? 1 : 2;
            return (
              <button key={item.job} type="button" onClick={() => openCommunication({ day: item.start.slice(0, 10), job: item.job })}
                class="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 rounded-xl border border-line px-3.5 py-2.5 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand-text">
                <span class="truncate text-[13px] font-semibold" title={item.name}>{item.name}</span>
                <b class="text-lg leading-tight">{fmtPct(item.value, digits)}</b>
                <span class="truncate text-xs text-ink-muted">{dayShort(item.start)}, {item.family}</span>
                <span class="text-right text-xs text-ink-muted">{metric}</span>
                <span class="col-span-2 text-xs font-semibold text-danger">{fmtPts(Math.abs(item.value - item.familyValue), digits).replace('+', '')} {side} su familia ({fmtPct(item.familyValue, digits)})</span>
              </button>
            );
          })}
        </div>
      ) : <p class="text-[13px] text-ink-muted">Ninguna comunicación se aleja de lo normal en este periodo.</p>}
    </Panel>
  );
}

/** Qué periodo se ve y contra qué se compara, en una frase. */
function PeriodSentence({ period }) {
  const now = periodText(period.from, period.to, period.cut);
  if (!period.prev.sends) return <>{now}. No hay envíos en el periodo anterior para comparar.</>;
  return (
    <>
      {now}, comparado con {periodText(period.prevFrom, period.prevTo, period.cut)}.
      {period.cut ? ` El mes en curso va hasta hoy, así que el periodo anterior también llega hasta el día ${period.cut}.` : ''}
    </>
  );
}

/**
 * El periodo de la barra: los que terminan en el mes en curso vienen con la vista general; los demás se piden
 * (getPeriod, con caché). Mientras llega uno nuevo se sigue viendo el anterior, atenuado.
 */
function usePeriod(data) {
  const range = periodRange.value;
  const inline = data && range ? Object.values(data.periods).find(item => item.from === range.from && item.to === range.to) : null;
  const key = data && range && !inline ? `${dataKey.value}|${range.from}:${range.to}` : '';
  const [state, retry] = useLoad(key, () => api.getPeriod(range.from, range.to), { keepPrevious: true });
  const shown = useRef(null);
  const period = inline || (state.status === 'ready' ? state.data : null);
  if (period) shown.current = period;
  return {
    period: period || shown.current,
    loading: !inline && state.status === 'loading',
    error: !inline && state.status === 'error' ? state.error : '',
    retry
  };
}

export function GeneralView() {
  const [mode, setMode] = useState('com');
  const [metric, setMetric] = useState('or');
  const state = overview.value;
  const { period, loading, error, retry } = usePeriod(state.data);
  if (state.status === 'loading') return <div class="flex flex-col gap-4"><Skeleton class="h-12" /><div class="grid gap-4 md:grid-cols-2"><Skeleton class="h-56" /><Skeleton class="h-56" /></div><Skeleton class="h-80" /></div>;
  if (state.status === 'error') return <ErrorState text={state.error} onRetry={loadOverview} />;
  const data = state.data;
  if (!data.total) return <EmptyState icon="sheet" title="Todavía no hay envíos" text={messageText('NO_DATA')} />;
  if (error) return <ErrorState text={error} onRetry={retry} />;
  if (!period) return <div class="flex flex-col gap-4"><Skeleton class="h-12" /><div class="grid gap-4 md:grid-cols-2"><Skeleton class="h-56" /><Skeleton class="h-56" /></div></div>;
  return (
    <div class={cx('flex flex-col gap-4 transition-opacity', loading && 'opacity-60')} aria-busy={loading}>
      <div class="panel flex flex-wrap items-center gap-x-6 gap-y-2.5 px-4 py-2.5">
        <div class="flex min-w-0 flex-[1_1_420px] flex-col gap-0.5">
          <p class="text-[13.5px] font-semibold first-letter:uppercase" aria-live="polite"><PeriodSentence period={period} /></p>
          <p class="text-[12.5px] text-ink-muted">
            {mode === 'vol' ? 'Las tasas están ponderadas por volumen: una comunicación grande pesa más que una pequeña.' : 'Las tasas son la mediana por comunicación: cada envío pesa igual, sea grande o pequeño.'}
            {' '}No sumamos personas entre comunicaciones: una misma persona puede estar en muchas.
          </p>
        </div>
        <span class="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
          <span class="text-[13px] font-semibold text-ink-muted">Promediar</span>
          <Segmented label="Cómo promediar" value={mode} onChange={setMode} options={MODES} />
        </span>
      </div>

      <section aria-label="Lo principal del periodo" class="grid grid-cols-12 gap-4">
        <div class="col-span-12 grid md:col-span-6 xl:col-span-4">
          <HeroComms period={period} history={data.history} active={metric === 'comms'} onPick={() => setMetric('comms')} />
        </div>
        <div class="col-span-12 grid md:col-span-6 xl:col-span-4">
          <HeroOpen period={period} historic={data.historic} history={data.history} mode={mode} active={metric === 'or'} onPick={() => setMetric('or')} />
        </div>
        <div aria-label="Otros indicadores del periodo" role="group" class="col-span-12 grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:col-span-4 xl:grid-cols-2">
          {SECONDARY.map(key => (
            <Kpi key={key} metricKey={key} period={period} history={data.history} mode={mode} active={metric === key} onPick={() => setMetric(key)} />
          ))}
        </div>
      </section>

      <div class="grid grid-cols-12 gap-4">
        <section id="timeline" aria-label="Línea de tiempo" class="panel col-span-12 flex flex-col gap-3 p-4 xl:col-span-8">
          <div class="overflow-x-auto"><Segmented label="Indicador de la línea de tiempo" value={metric} onChange={setMetric} options={TIMELINE_OPTIONS} size="sm" /></div>
          <Timeline history={data.history} metric={metric} mode={mode} period={period} />
        </section>
        <div class="col-span-12 xl:col-span-4"><Highlights period={period} history={data.history} mode={mode} onMetric={setMetric} /></div>
      </div>

      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 xl:col-span-8"><DropsChart history={data.history} period={period} /></div>
        <div class="col-span-12 xl:col-span-4"><RulesPanel rules={period.rules} mode={mode} /></div>
      </div>

      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 xl:col-span-8"><CalendarHeat calendar={period.calendar} /></div>
        <div class="col-span-12 xl:col-span-4"><ReviewPanel review={period.review} /></div>
      </div>

      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 min-w-0 xl:col-span-8"><FamiliesTable families={period.families} period={period} mode={mode} /></div>
        <div class="col-span-12 xl:col-span-4"><FamilyScatter families={period.families} period={period} mode={mode} /></div>
      </div>
    </div>
  );
}
