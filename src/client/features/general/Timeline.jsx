// Línea de tiempo mensual (24 meses cerrados y el mes en curso, punteado porque va a medias) del indicador elegido:
// mediana, mitad central de las comunicaciones, promedio de los 24 meses cerrados y el periodo elegido sombreado. Al pasar el mouse, el mes con su valor.
import { useState } from 'preact/hooks';
import { monthShort, monthLong } from '@/lib/format.mjs';
import { METRICS, formatValue } from './metricsDefs.mjs';

const W = 1200, H = 300, L = 56, R = 1184, T = 14, B = 262;

function niceStep(span, key) {
  if (key === 'comms') return span > 400 ? 200 : span > 160 ? 100 : 50;
  const steps = [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1];
  return steps.find(step => span / step <= 6) || 0.2;
}

export function Timeline({ history, metric, mode, period }) {
  const [hover, setHover] = useState(null);
  const def = METRICS[metric];
  const isRate = metric !== 'comms';
  const band = isRate && mode === 'com';
  const points = history.map(item => {
    const summary = isRate ? item.metrics[metric] : null;
    const v = isRate ? (summary ? (mode === 'vol' ? summary.vol : summary.com) : null) : item.comms;
    return { month: item.month, v, lo: band && summary ? summary.lo : v, hi: band && summary ? summary.hi : v, comms: item.comms, partial: Boolean(item.partial) };
  });
  const known = points.filter(point => point.v != null);
  if (!known.length) return <p class="py-10 text-center text-sm text-ink-muted">Sin envíos en los últimos 24 meses.</p>;
  const lows = known.map(point => point.lo);
  const highs = known.map(point => point.hi);
  let min = Math.min(...lows);
  const max = Math.max(...highs);
  const span = max - min || Math.abs(max) || 1;
  const step = niceStep(span, metric);
  if (metric === 'comms') min = 0;
  const y0 = metric === 'comms' ? 0 : Math.max(0, Math.floor((min - span * 0.08) / step) * step);
  const y1 = Math.ceil((max + span * 0.08) / step) * step || step;
  const last = points.length - 1 || 1;
  const X = index => L + (index / last) * (R - L);
  const Y = value => B - ((value - y0) / (y1 - y0 || 1)) * (B - T);
  const half = (R - L) / last / 2;
  const ticks = [];
  for (let value = y0; value <= y1 + step / 2; value += step) ticks.push(value);
  const coord = index => `${X(index).toFixed(1)},${Y(points[index].v).toFixed(1)}`;
  // Línea llena hasta el último mes cerrado; el mes en curso se une con un tramo punteado.
  const closedIndexes = points.map((point, index) => (point.v != null && !point.partial ? index : -1)).filter(index => index >= 0);
  const line = closedIndexes.map(coord).join(' ');
  const partialIndex = points[last]?.partial && points[last].v != null ? last : -1;
  const lastClosed = closedIndexes[closedIndexes.length - 1];
  const bandPath = band
    ? `M${points.map((point, index) => (point.v == null ? null : `${X(index).toFixed(1)},${Y(point.hi).toFixed(1)}`)).filter(Boolean).join(' L')} L${
      points.map((point, index) => (point.v == null ? null : `${X(index).toFixed(1)},${Y(point.lo).toFixed(1)}`)).filter(Boolean).reverse().join(' L')} Z`
    : '';
  const closedKnown = known.filter(point => !point.partial);
  const avg = (closedKnown.length ? closedKnown : known).reduce((sum, point) => sum + point.v, 0) / (closedKnown.length || known.length);
  const active = hover ?? points.length - 1;
  const current = points[active];
  const inside = points.map((point, index) => (point.month >= period.from && point.month <= period.to ? index : -1)).filter(index => index >= 0);
  const tickFormat = value => (metric === 'comms' ? String(Math.round(value)) : `${(value * 100).toFixed(step < 0.001 ? 2 : step < 0.01 ? 1 : 0)}%`);
  return (
    <div class="flex flex-col gap-2.5">
      <div class="flex flex-wrap items-start justify-between gap-2.5">
        <div>
          <h2 class="text-base font-bold">{def.title}, últimos 24 meses y el mes en curso</h2>
          <p class="mt-0.5 text-[12.5px] text-ink-muted">{def.sub}</p>
        </div>
        <div aria-live="polite" class="flex flex-col items-end gap-0.5 text-[13px]">
          <span class="text-ink-muted first-letter:uppercase">{monthLong(current.month)}{current.partial ? ' (hasta hoy)' : ''}: {current.comms} comunicaciones</span>
          <span><b class="text-lg">{formatValue(metric, current.v)}</b>
            {band && current.v != null && <span class="text-ink-muted"> (mitad central {formatValue(metric, current.lo)} – {formatValue(metric, current.hi)})</span>}
          </span>
        </div>
      </div>
      <svg role="img" aria-label={`${def.title} por mes, de ${monthLong(points[0].month)} a ${monthLong(points[last].month)}`} viewBox={`0 0 ${W} ${H}`}
        class="block h-auto w-full" onMouseLeave={() => setHover(null)}>
        {inside.length > 0 && <>
          <rect x={X(inside[0]) - half} y="10" width={X(inside[inside.length - 1]) - X(inside[0]) + 2 * half} height={B - 8} rx="6" fill="var(--color-brand-soft)" opacity="0.6" />
          <text x={X(inside[inside.length - 1]) + half - 8} y="28" text-anchor="end" font-size="12" font-weight="700" fill="var(--color-brand-text)">{inside.length > 2 ? 'Periodo elegido' : 'Elegido'}</text>
        </>}
        {ticks.map(value => (
          <g key={value}>
            <line x1={L} x2={R} y1={Y(value)} y2={Y(value)} stroke="var(--color-line)" />
            <text x={L - 10} y={Y(value)} text-anchor="end" dominant-baseline="middle" font-size="12" fill="var(--color-ink-muted)">{tickFormat(value)}</text>
          </g>
        ))}
        {points.map((point, index) => (index % 3 === 0 || index === last) && (
          <text key={point.month} x={X(index)} y="290" text-anchor="middle" font-size="12" fill="var(--color-ink-muted)">{monthShort(point.month)}</text>
        ))}
        {band && <path d={bandPath} fill="var(--color-series)" opacity="0.14" />}
        <line x1={L} x2={R} y1={Y(avg)} y2={Y(avg)} stroke="var(--color-ink-muted)" stroke-width="1.5" stroke-dasharray="5 5" />
        <polyline points={line} fill="none" stroke="var(--color-series)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
        {partialIndex >= 0 && lastClosed != null && (
          <polyline points={`${coord(lastClosed)} ${coord(partialIndex)}`} fill="none" stroke="var(--color-series)" stroke-width="2.5" stroke-dasharray="4 5" stroke-linecap="round" />
        )}
        {current.v != null && <>
          <line x1={X(active)} x2={X(active)} y1="10" y2={B} stroke="var(--color-ink)" opacity="0.35" />
          <circle cx={X(active)} cy={Y(current.v)} r="5.5" fill="var(--color-series)" stroke="var(--color-surface)" stroke-width="2.5" />
        </>}
        {points.map((point, index) => (
          <rect key={point.month} x={X(index) - half} y="10" width={2 * half} height={H - 20} fill="transparent" class="cursor-crosshair"
            onMouseEnter={() => setHover(index)} />
        ))}
      </svg>
      <div class="flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-ink-muted">
        <span class="flex items-center gap-1.5"><span class="h-[3px] w-[18px] rounded-full bg-series" />{metric === 'comms' ? 'Comunicaciones por mes' : mode === 'vol' ? 'Ponderado por volumen' : 'Mediana mensual'}</span>
        {band && <span class="flex items-center gap-1.5"><span class="h-2.5 w-[18px] rounded-[3px] bg-series opacity-25" />Mitad central de las comunicaciones (del 25 % al 75 %)</span>}
        <span class="flex items-center gap-1.5"><span class="w-[18px] border-t-2 border-dashed border-ink-muted" />Promedio de los 24 meses cerrados</span>
        {partialIndex >= 0 && <span class="flex items-center gap-1.5"><span class="w-[18px] border-t-2 border-dotted border-series" />Mes en curso, hasta hoy</span>}
      </div>
    </div>
  );
}
