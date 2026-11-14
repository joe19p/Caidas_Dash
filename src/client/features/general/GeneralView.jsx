// Vista general: lo que la gerencia puede usar sin dudas. Protagonistas: comunicaciones distintas enviadas y open rate
// frente a su histórico. Todo en tasas (no se suman personas entre comunicaciones) y por meses cerrados.
import { useState } from 'preact/hooks';
import { overview, loadOverview, openCommunication } from '@/state/app.mjs';
import { cx, fmtInt, fmtPct, fmtPts, monthRange, monthShort, dayShort } from '@/lib/format.mjs';
import { Segmented } from '@/ui/Segmented.jsx';
import { Sparkline } from '@/ui/Sparkline.jsx';
import { Panel } from '@/ui/Panel.jsx';
import { Icon } from '@/ui/Icon.jsx';
import { deltaTone } from '@/ui/Delta.jsx';
import { Skeleton, EmptyState, ErrorState } from '@/ui/States.jsx';
import { messageText } from '@shared/messages.mjs';
import { METRICS, SECONDARY, rateOf, valueOf, formatValue } from './metricsDefs.mjs';
import { Timeline } from './Timeline.jsx';
import { CalendarHeat } from './CalendarHeat.jsx';

const PERIODS = [{ value: 1, label: 'Mes cerrado' }, { value: 3, label: 'U3M' }, { value: 6, label: 'U6M' }, { value: 12, label: 'U12M' }];
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
    return { text: `${change >= 0 ? '▲' : '▼'} ${Math.abs(change * 100).toFixed(0)}% vs periodo anterior`, tone: 'text-ink-muted' };
  }
  const delta = now - before;
  const digits = key === 'deliv' || key === 'or' ? 1 : 2;
  return { text: `${delta >= 0 ? '▲' : '▼'} ${fmtPts(Math.abs(delta), digits).replace('+', '')} vs anterior`, tone: deltaTone(delta, METRICS[key].better) };
}

function HeroComms({ period, history, months, active, onPick }) {
  const delta = deltaText('comms', period.kpis.comms, period.prev.sends ? period.prev.comms : null);
  const max = Math.max(...history.map(item => item.comms), 1);
  const width = 520 / history.length;
  return (
    <button type="button" aria-pressed={active} onClick={onPick}
      class={cx('panel flex flex-col gap-2 px-6 pt-5 pb-3.5 text-left', active ? 'border-brand-text ring-3 ring-brand-soft' : '')}>
      <span class="text-[13px] font-bold text-ink-muted">Comunicaciones distintas enviadas</span>
      <span class="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5">
        <b class="text-[52px] leading-none font-extrabold tracking-tight">{fmtInt(period.kpis.comms)}</b>
        <span class="text-sm text-ink-muted">≈ <b class="text-ink">{fmtInt(period.kpis.comms / months)}</b> por mes · {fmtInt(period.kpis.sends)} envíos</span>
      </span>
      <span class={cx('text-[13px] font-semibold', delta.tone)}>{delta.text}</span>
      <svg role="img" aria-label="Comunicaciones por mes, últimos 24 meses" viewBox="0 0 520 110" class="mt-1 block h-auto w-full">
        {history.map((item, index) => {
          const height = (item.comms / max) * 92;
          return (
            <rect key={item.month} x={index * width + 2} y={96 - height} width={Math.max(1, width - 4)} height={height} rx="3"
              fill={index >= history.length - months ? 'var(--color-series)' : 'var(--color-line-strong)'}>
              <title>{`${monthShort(item.month)}: ${item.comms} comunicaciones`}</title>
            </rect>
          );
        })}
        <text x="0" y="108" font-size="11" fill="var(--color-ink-muted)">{monthShort(history[0].month)}</text>
        <text x="520" y="108" text-anchor="end" font-size="11" fill="var(--color-ink-muted)">{monthShort(history[history.length - 1].month)}</text>
      </svg>
    </button>
  );
}

function HeroOpen({ period, historic, history, months, mode, active, onPick }) {
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
  return (
    <button type="button" aria-pressed={active} onClick={onPick}
      class={cx('panel flex flex-col gap-2 px-6 pt-5 pb-3.5 text-left', active ? 'border-brand-text ring-3 ring-brand-soft' : '')}>
      <span class="text-[13px] font-bold text-ink-muted">Open rate del periodo</span>
      <span class="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5">
        <b class="text-[52px] leading-none font-extrabold tracking-tight">{fmtPct(value)}</b>
        <span class="text-sm text-ink-muted">promedio histórico <b class="text-ink">{fmtPct(hist)}</b></span>
      </span>
      <span class={cx('text-[13px] font-semibold', deltaTone(diff, 'up'))}>
        {diff == null ? 'Sin histórico para comparar' : Math.abs(diff) < 0.001 ? 'Igual a su promedio histórico' : `${diff > 0 ? '▲' : '▼'} ${fmtPts(Math.abs(diff)).replace('+', '')} frente a su promedio histórico`}
      </span>
      <svg role="img" aria-label="Open rate por mes frente al promedio histórico" viewBox="0 0 520 110" class="mt-1 block h-auto w-full">
        <rect x={ox(series.length - months) - 10} y="0" width={ox(lastIndex) - ox(series.length - months) + 20} height="96" rx="4" fill="var(--color-brand-soft)" opacity="0.6" />
        {hist != null && <>
          <line x1="0" x2="520" y1={oy(hist)} y2={oy(hist)} stroke="var(--color-ink-muted)" stroke-width="1.5" stroke-dasharray="5 5" />
          <text x="4" y={oy(hist) - 6} font-size="11" font-weight="600" fill="var(--color-ink-muted)">Histórico {fmtPct(hist)}</text>
        </>}
        <polyline points={line} fill="none" stroke="var(--color-series)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
        {series[lastIndex] != null && <circle cx={ox(lastIndex)} cy={oy(series[lastIndex])} r="4.5" fill="var(--color-series)" stroke="var(--color-surface)" stroke-width="2" />}
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
      class={cx('flex flex-col gap-2 rounded-2xl border bg-surface px-4 py-3.5 text-left', active ? 'border-brand-text ring-3 ring-brand-soft' : 'border-line hover:border-line-strong')}>
      <span class="text-[12.5px] font-semibold text-ink-muted">{METRICS[metricKey].label}</span>
      <span class="flex items-end justify-between gap-2">
        <b class="text-[26px] leading-none font-bold">{formatValue(metricKey, now)}</b>
        <Sparkline values={history.map(item => valueOf(item, metricKey, mode))} />
      </span>
      <span class={cx('text-xs font-semibold', delta.tone)}>{delta.text}</span>
    </button>
  );
}

function RulesPanel({ rules, mode }) {
  return (
    <Panel id="rules" title="Reglas de protección aplicadas"
      subtitle="Qué reglas del CRM y de Marketing Cloud cuidan la base (frecuencia, reputación y consentimiento), y cómo cambia su peso.">
      <div class="grid grid-cols-[minmax(0,1fr)_64px_130px_80px] items-center gap-x-3.5 border-b border-line pb-1.5 text-xs font-semibold text-ink-muted">
        <span>Regla</span><span class="text-right">Peso</span><span>24 meses</span><span class="text-right">vs anterior</span>
      </div>
      {rules.map(rule => {
        const share = rule.share[mode];
        const delta = share - rule.prev[mode];
        return (
          <div key={rule.code || 'otros'} class="grid grid-cols-[minmax(0,1fr)_64px_130px_80px] items-center gap-x-3.5">
            <span class="flex min-w-0 items-center gap-2 text-[13px] font-semibold">
              <span class={cx('size-[9px] flex-none rounded-[3px]', rule.origin === 'blq' ? 'bg-blq' : 'bg-asl')} />
              <span class="truncate" title={rule.code || ''}>{rule.name}</span>
            </span>
            <b class="text-right text-[13px]">{fmtPct(share)}</b>
            <Sparkline values={rule.series} width={130} height={28} stroke={rule.origin === 'blq' ? 'var(--color-blq)' : 'var(--color-asl)'} />
            <span class="text-right text-xs font-semibold text-ink-muted">{Math.abs(delta) < 0.0005 ? 'Igual' : `${delta > 0 ? '▲' : '▼'} ${fmtPts(Math.abs(delta)).replace('+', '')}`}</span>
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

function FamiliesPanel({ families, mode }) {
  return (
    <Panel id="families" title="Por familia de comunicación" subtitle="Cada familia en el periodo. La familia sale del nombre de la maqueta (CYBER, PROMO, ONBOARDING…).">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-[13px]">
          <thead>
            <tr class="text-right text-xs text-ink-muted">
              <th scope="col" class="py-1.5 pr-2 text-left font-semibold">Familia</th>
              <th scope="col" class="px-2 py-1.5 font-semibold">Comunic.</th>
              <th scope="col" class="px-2 py-1.5 font-semibold">Entrega</th>
              <th scope="col" class="px-2 py-1.5 font-semibold">Apertura</th>
              <th scope="col" class="px-2 py-1.5 font-semibold">CTOR</th>
              <th scope="col" class="py-1.5 pl-2 text-left font-semibold">Apertura, 24 meses</th>
            </tr>
          </thead>
          <tbody>
            {families.map(family => (
              <tr key={family.name} class="border-t border-line">
                <th scope="row" class="py-2.5 pr-2 text-left font-semibold">{family.name}</th>
                <td class="px-2 py-2.5 text-right">{fmtInt(family.comms)}</td>
                <td class="px-2 py-2.5 text-right">{fmtPct(rateOf(family.deliv, mode))}</td>
                <td class="px-2 py-2.5 text-right font-bold">{fmtPct(rateOf(family.or, mode))}</td>
                <td class="px-2 py-2.5 text-right">{fmtPct(rateOf(family.ctor, mode), 2)}</td>
                <td class="py-2.5 pl-2"><Sparkline values={family.orSeries} width={110} height={24} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

const REVIEW_TEXT = { or: ['apertura', 'bajo'], ctor: ['CTOR', 'bajo'], bounce: ['rebote', 'sobre'], unsub: ['bajas', 'sobre'] };

function ReviewPanel({ review }) {
  return (
    <Panel id="review" title="Comunicaciones a revisar" subtitle="Las que más se alejan de lo normal en su familia durante el periodo. Toca una para verla en detalle.">
      {review.length ? (
        <div class="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2.5">
          {review.map(item => {
            const [metric, side] = REVIEW_TEXT[item.metric];
            const digits = item.metric === 'or' ? 1 : 2;
            return (
              <button key={item.job} type="button" onClick={() => openCommunication({ day: item.start.slice(0, 10), job: item.job })}
                class="flex flex-col gap-1.5 rounded-xl border border-line px-3.5 py-3 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand-text">
                <span class="truncate font-mono text-xs" title={item.name}>{item.name}</span>
                <span class="text-xs text-ink-muted">{dayShort(item.start)} · {item.family}</span>
                <span class="flex items-baseline gap-2"><b class="text-xl">{fmtPct(item.value, digits)}</b><span class="text-[12.5px] text-ink-muted">{metric}</span></span>
                <span class="text-xs font-semibold text-danger">{fmtPts(Math.abs(item.value - item.familyValue), digits).replace('+', '')} {side} su familia ({fmtPct(item.familyValue, digits)})</span>
              </button>
            );
          })}
        </div>
      ) : <p class="text-[13px] text-ink-muted">Ninguna comunicación se aleja de lo normal en este periodo.</p>}
    </Panel>
  );
}

export function GeneralView() {
  const [months, setMonths] = useState(3);
  const [mode, setMode] = useState('com');
  const [metric, setMetric] = useState('or');
  const state = overview.value;
  if (state.status === 'loading') return <div class="flex flex-col gap-4"><Skeleton class="h-12" /><div class="grid gap-4 md:grid-cols-2"><Skeleton class="h-56" /><Skeleton class="h-56" /></div><Skeleton class="h-80" /></div>;
  if (state.status === 'error') return <ErrorState text={state.error} onRetry={loadOverview} />;
  const data = state.data;
  if (!data.total) return <EmptyState title="Todavía no hay envíos" text={messageText('NO_DATA')} />;
  const period = data.periods[months];
  return (
    <>
      <div class="panel flex flex-wrap items-center gap-x-3.5 gap-y-2.5 px-4 py-2.5">
        <Segmented label="Periodo" value={months} onChange={setMonths} options={PERIODS} />
        <span class="text-[13px] text-ink-muted">
          {monthRange(period.from, period.to)} · comparado con {monthRange(period.prevFrom, period.prevTo)} · el mes en curso entra al cerrar
        </span>
        <span class="flex-1" />
        <span class="text-[13px] font-semibold text-ink-muted">Promediar</span>
        <Segmented label="Cómo promediar" value={mode} onChange={setMode} options={MODES} />
      </div>

      <p class="flex items-start gap-2.5 rounded-xl bg-brand-soft px-3.5 py-2.5 text-[13px] leading-snug">
        <Icon name="info" size={18} class="mt-px flex-none text-brand-text" />
        <span>
          {mode === 'vol' ? 'Las tasas están ponderadas por volumen: una comunicación grande pesa más que una pequeña.' : 'Las tasas son la mediana por comunicación: cada envío pesa igual, sea grande o pequeño.'}
          {' '}No sumamos personas entre comunicaciones: una misma persona puede estar en muchas.
        </span>
      </p>

      <section aria-label="Lo principal del periodo" class="grid grid-cols-[repeat(auto-fit,minmax(460px,1fr))] gap-4">
        <HeroComms period={period} history={data.history} months={months} active={metric === 'comms'} onPick={() => setMetric('comms')} />
        <HeroOpen period={period} historic={data.historic} history={data.history} months={months} mode={mode} active={metric === 'or'} onPick={() => setMetric('or')} />
      </section>

      <section aria-label="Otros indicadores del periodo" class="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-2.5">
        {SECONDARY.map(key => (
          <Kpi key={key} metricKey={key} period={period} history={data.history} mode={mode} active={metric === key} onPick={() => setMetric(key)} />
        ))}
      </section>

      <section class="panel px-5.5 py-4.5"><Timeline history={data.history} metric={metric} mode={mode} months={months} /></section>

      <CalendarHeat calendar={data.calendar} />

      <div class="grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] gap-4">
        <FamiliesPanel families={period.families} mode={mode} />
        <RulesPanel rules={period.rules} mode={mode} />
      </div>

      <ReviewPanel review={period.review} />
    </>
  );
}
