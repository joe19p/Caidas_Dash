// Pestaña Motivos: Pareto de lo que no se envió en esta comunicación (barras de mayor a menor y su acumulado), con una
// raya que marca el peso normal de cada motivo, y debajo la tabla de todos los motivos (ordenable y para Excel).
// Al pasar el mouse nada cambia de tamaño: se aclaran las otras barras y se marca la fila (y al revés).
import { useState } from 'preact/hooks';
import { cx, fmtInt, fmtPct, fmtPts } from '@/lib/format.mjs';
import { csvName, downloadCsv } from '@/lib/csv.mjs';
import { motiveIcon } from '@/lib/icons.mjs';
import { Icon } from '@/ui/Icon.jsx';
import { SortHeader, useSort } from '@/ui/SortHeader.jsx';

// PT deja lugar arriba para la cifra del acumulado en 100 %.
const W = 1000, PL = 60, PR = 990, PT = 30, PB = 300;
// Barras que se dibujan: las de más peso; el resto (motivos de poco volumen) va junto en «Otros».
const MAX_BARS = 14;
const BAR_STEP_MS = 22;

/** Barras del gráfico: hasta MAX_BARS y, si sobran, una más con la suma del resto. */
function groupSmall(motives) {
  if (motives.length <= MAX_BARS + 1) return motives;
  const rest = motives.slice(MAX_BARS);
  const sum = key => rest.reduce((total, motive) => total + motive[key], 0);
  return [...motives.slice(0, MAX_BARS), { code: '_otros', name: `Otros ${rest.length} motivos`, origin: 'asl', count: sum('count'), share: sum('share'), normal: sum('normal'), cum: rest[rest.length - 1].cum, grouped: true }];
}

const originText = origin => (origin === 'blq' ? 'bloqueo' : 'autosupresión');
const VALUE = { name: row => row.name, count: row => row.count, share: row => row.share, cum: row => row.cum, normal: row => row.normal, diff: row => row.share - row.normal };
const COLS = 'grid grid-cols-[minmax(240px,1fr)_96px_130px_150px_90px_100px] items-center gap-3';

export function ParetoTab({ detail }) {
  // hover: posición del motivo en la lista completa (las del grupo «Otros» marcan esa barra).
  const [hover, setHover] = useState(null);
  let accumulated = 0;
  let n80 = 0;
  const all = detail.motives.map((motive, index) => {
    accumulated += motive.share;
    if (!n80 && accumulated >= 0.8 - 1e-9) n80 = index + 1;
    return { ...motive, index, cum: accumulated };
  });
  n80 ||= all.length;
  const [rows, sort, onSort] = useSort(all, (row, column) => VALUE[column](row), null);
  if (!all.length) return <p class="py-4 text-[13px] text-ink-muted">Esta comunicación se envió a toda su base: no hay motivos de no envío.</p>;
  const motives = groupSmall(all);
  const barOf = index => (index == null ? null : Math.min(index, motives.length - 1));
  const hot = barOf(hover);
  const y = share => PB - share * (PB - PT);
  const band = (PR - PL) / motives.length;
  const barWidth = Math.min(30, band * 0.6);
  const bars = motives.map((motive, index) => ({ ...motive, cx: PL + band * index + band / 2 }));
  // Entrada: barras una tras otra y, al terminar, el acumulado de izquierda a derecha.
  const lineDelay = bars.length * BAR_STEP_MS + 100;
  const exportRows = () => downloadCsv(csvName('Motivos de no envío', detail.record.name, String(detail.record.start).slice(0, 10)), [
    { label: 'Motivo', value: row => row.name }, { label: 'Código', value: row => row.code }, { label: 'Origen', value: row => originText(row.origin) },
    { label: 'Personas', value: row => row.count }, { label: 'De lo no enviado', value: row => row.share }, { label: 'Acumulado', value: row => row.cum },
    { label: 'Lo normal', value: row => row.normal }, { label: 'Vs lo normal', value: row => row.share - row.normal }
  ], rows);
  return (
    <section aria-labelledby="pa-t" class="section-rule">
      <div>
        <h2 id="pa-t" class="text-xl font-extrabold"><span class="text-asl-ink">{n80 === 1 ? '1 motivo explica' : `${n80} motivos explican`}</span> el 80 % de lo que no se envió</h2>
        <p class="mt-1 text-[13px] text-ink-muted">De {fmtInt(detail.record.notSent)} personas no enviadas en esta comunicación. La raya negra marca el peso normal de cada motivo.</p>
      </div>
      <svg role="img" aria-label="Diagrama de Pareto de los motivos de no envío de esta comunicación, de mayor a menor, con el acumulado" viewBox={`0 0 ${W} 460`}
        class="block h-auto max-h-[480px] w-full" onMouseLeave={() => setHover(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map(tick => (
          <g key={tick}>
            <line x1={PL} x2={PR} y1={y(tick)} y2={y(tick)} stroke="var(--color-line)" />
            <text x={PL - 8} y={y(tick)} text-anchor="end" dominant-baseline="middle" font-size="12" fill="var(--color-ink-muted)">{tick * 100}%</text>
          </g>
        ))}
        <rect x={PL} y={PT} width={band * Math.min(n80, motives.length)} height={PB - PT} rx="8" fill="var(--color-brand-soft)" opacity="0.55" />
        <line x1={PL} x2={PR} y1={y(0.8)} y2={y(0.8)} stroke="var(--color-ink)" stroke-width="1.5" stroke-dasharray="5 5" opacity="0.55" />
        <text x={PR} y={y(0.8) - 8} text-anchor="end" font-size="12.5" font-weight="700" fill="var(--color-ink)">80 %</text>
        {bars.map((bar, index) => (
          <g key={bar.code} onMouseEnter={() => setHover(bar.grouped ? MAX_BARS : index)} class="cursor-pointer transition-opacity duration-150"
            opacity={hot != null && hot !== index ? 0.35 : 1}
            data-tip={`${bar.name}${bar.grouped ? '' : ` (${originText(bar.origin)})`}: ${fmtInt(bar.count)} personas, ${fmtPct(bar.share)} de lo no enviado. Acumulado ${fmtPct(bar.cum)}. Lo normal ${fmtPct(bar.normal)}.`}>
            <rect x={PL + band * index} y={PT} width={band} height={PB - PT} fill="transparent" />
            <rect x={bar.cx - barWidth / 2} y={y(bar.share)} width={barWidth} height={Math.max(2, bar.share * (PB - PT))} rx="4"
              fill={bar.grouped ? 'var(--color-line-strong)' : bar.origin === 'blq' ? 'var(--color-blq)' : 'var(--color-asl)'}
              class="anim-grow-y" style={{ '--delay': `${index * BAR_STEP_MS}ms` }} />
            <line x1={bar.cx - barWidth / 2 - 4} x2={bar.cx + barWidth / 2 + 4} y1={y(bar.normal)} y2={y(bar.normal)} stroke="var(--color-ink)" stroke-width="2.5" stroke-linecap="round" />
            {bar.share >= 0.01 && <text x={bar.cx} y={y(Math.max(bar.share, bar.normal)) - 8} text-anchor="middle" font-size="12" font-weight="700" fill="var(--color-ink)">{Math.round(bar.share * 100)}%</text>}
            <text x={bar.cx} y="318" text-anchor="end" transform={`rotate(-38 ${bar.cx.toFixed(1)} 318)`} font-size="12.5" font-weight="600" fill="var(--color-ink)">{bar.name}</text>
          </g>
        ))}
        <polyline points={bars.map(bar => `${bar.cx.toFixed(1)},${y(bar.cum).toFixed(1)}`).join(' ')} fill="none" stroke="var(--color-ink)" stroke-width="2" stroke-linejoin="round"
          pathLength="1" class="anim-draw" pointer-events="none" style={{ '--delay': `${lineDelay}ms` }} />
        {bars.map((bar, index) => (
          <g key={bar.code} pointer-events="none" class="anim-fade" style={{ '--delay': `${lineDelay + 60 + index * 25}ms` }}>
            <circle cx={bar.cx} cy={y(bar.cum)} r="4" fill="var(--color-surface)" stroke="var(--color-ink)" stroke-width="2" />
            {/* Cifra del acumulado en cada punto (la del primero ya está sobre su barra), con contorno del fondo para que se lea
                sobre la línea y la franja. */}
            {index > 0 && (
              <text x={bar.cx} y={y(bar.cum) - 11} text-anchor="middle" font-size="11.5" font-weight="600" fill="var(--color-ink-muted)"
                paint-order="stroke" stroke="var(--color-surface)" stroke-width="4" stroke-linejoin="round">{Math.round(bar.cum * 100)}%</text>
            )}
          </g>
        ))}
      </svg>
      <ul class="flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-ink-muted">
        <li class="flex items-center gap-1.5"><span class="size-2.5 rounded-[3px] bg-asl" />Lista de autosupresión</li>
        <li class="flex items-center gap-1.5"><span class="size-2.5 rounded-[3px] bg-blq" />Bloqueo preventivo</li>
        <li class="flex items-center gap-1.5"><span class="h-[3px] w-4 rounded-sm bg-ink" />Peso normal del motivo</li>
        <li class="flex items-center gap-1.5"><span class="relative h-0.5 w-5 bg-ink"><span class="absolute -top-[3px] left-[6px] size-2 rounded-full border-2 border-ink bg-surface" /></span>Acumulado</li>
      </ul>

      <div class="flex flex-col gap-2.5 border-t border-line-strong pt-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 class="text-[15px] font-bold">{all.length === 1 ? 'El motivo' : `Los ${all.length} motivos`}</h3>
          <button type="button" class="btn" onClick={exportRows}><Icon name="download" size={16} />Descargar para Excel</button>
        </div>
        <div class="overflow-x-auto">
          <div role="table" aria-label="Motivos de no envío de esta comunicación" class="min-w-[840px] text-[13px]" onMouseLeave={() => setHover(null)}>
            <div role="row" class={cx(COLS, 'border-b border-line px-2 pb-2 text-xs font-semibold text-ink-muted')}>
              <SortHeader label="Motivo" column="name" sort={sort} onSort={onSort} first={1} align="left" />
              <SortHeader label="Personas" column="count" sort={sort} onSort={onSort} />
              <SortHeader label="De lo no enviado" column="share" sort={sort} onSort={onSort} />
              <SortHeader label="Acumulado" column="cum" sort={sort} onSort={onSort} />
              <SortHeader label="Lo normal" column="normal" sort={sort} onSort={onSort} />
              <SortHeader label="Vs lo normal" column="diff" sort={sort} onSort={onSort} />
            </div>
            {rows.map(row => {
              const diff = row.share - row.normal;
              return (
                <div key={row.code} role="row" onMouseEnter={() => setHover(row.index)}
                  class={cx(COLS, 'border-b border-line px-2 py-2', hot != null && barOf(row.index) === hot && 'bg-surface-muted')}>
                  <span role="cell" class="flex min-w-0 items-center gap-2" title={row.description || row.code}>
                    <Icon name={motiveIcon(row.code, row.origin)} size={19} class={cx('flex-none', row.origin === 'blq' ? 'text-blq' : 'text-asl')} />
                    <b class="truncate font-semibold">{row.name}</b>
                    <span class="flex-none text-xs text-ink-muted">{originText(row.origin)}</span>
                    {row.index < n80 && <span class="flex-none rounded-full bg-brand-soft px-2 text-[11px] font-bold text-brand-text">80 %</span>}
                  </span>
                  <span role="cell" class="text-right">{fmtInt(row.count)}</span>
                  <b role="cell" class="text-right">{fmtPct(row.share)}</b>
                  <span role="cell" class="flex items-center justify-end gap-2">
                    <span class="h-2 w-[72px] flex-none rounded bg-surface-muted"><span class="block h-full rounded bg-ink-muted" style={{ width: `${Math.min(1, row.cum) * 100}%` }} /></span>
                    {fmtPct(row.cum)}
                  </span>
                  <span role="cell" class="text-right text-ink-muted">{fmtPct(row.normal)}</span>
                  <span role="cell" class={cx('text-right text-xs font-semibold', Math.abs(diff) < 0.01 ? 'text-ink-muted' : diff > 0 ? 'text-danger' : 'text-success')}>{fmtPts(diff)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
