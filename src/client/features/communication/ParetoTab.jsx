// Pestaña Motivos: Pareto de lo que no se envió en esta comunicación (barras de mayor a menor y su acumulado), con una
// raya que marca el peso normal de cada motivo. Dice cuántos motivos explican el 80 %.
import { useState } from 'preact/hooks';
import { cx, fmtInt, fmtPct } from '@/lib/format.mjs';

const W = 1000, PL = 110, PR = 990, PT = 16, PB = 300;
// Barras que se dibujan: las de más peso; el resto (motivos de poco volumen) va junto en «Otros».
const MAX_BARS = 14;

/** Motivos para el gráfico: hasta MAX_BARS y, si sobran, uno más con la suma del resto. */
function groupSmall(motives) {
  if (motives.length <= MAX_BARS + 1) return motives;
  const rest = motives.slice(MAX_BARS);
  const sum = key => rest.reduce((total, motive) => total + motive[key], 0);
  return [...motives.slice(0, MAX_BARS), { code: '_otros', name: `Otros ${rest.length} motivos`, origin: 'asl', count: sum('count'), share: sum('share'), normal: sum('normal'), grouped: true }];
}

export function ParetoTab({ detail }) {
  const [hover, setHover] = useState(0);
  const motives = groupSmall(detail.motives);
  if (!motives.length) return <p class="panel p-6 text-[13px] text-ink-muted">Esta comunicación se envió a toda su base: no hay motivos de no envío.</p>;
  const y = share => PB - share * (PB - PT);
  const band = (PR - PL) / motives.length;
  const barWidth = Math.min(30, band * 0.6);
  let accumulated = 0;
  let n80 = 0;
  const bars = motives.map((motive, index) => {
    accumulated += motive.share;
    if (!n80 && accumulated >= 0.8 - 1e-9) n80 = index + 1;
    return { ...motive, cx: PL + band * index + band / 2, cum: accumulated };
  });
  n80 ||= motives.length;
  const current = bars[Math.min(hover, bars.length - 1)];
  const diff = current.share - current.normal;
  return (
    <section aria-labelledby="pa-t" class="panel flex flex-col gap-3 p-5">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0 flex-[1_1_360px]">
          <h2 id="pa-t" class="text-xl font-extrabold"><span class="text-asl-ink">{n80 === 1 ? '1 motivo explica' : `${n80} motivos explican`}</span> el 80 % de lo que no se envió</h2>
          <p class="mt-1 text-[13px] text-ink-muted">De {fmtInt(detail.record.notSent)} personas no enviadas en esta comunicación. La raya negra marca el peso normal de cada motivo.</p>
        </div>
        <div aria-live="polite" class="flex min-h-[92px] flex-[0_1_300px] flex-col gap-0.5 rounded-xl bg-surface-muted px-3.5 py-3 text-[13px]">
          <b class="text-sm">{current.name}{current.grouped ? '' : ` · ${current.origin === 'blq' ? 'bloqueo' : 'autosupresión'}`}</b>
          <span>{fmtInt(current.count)} personas · {fmtPct(current.share)} de lo no enviado</span>
          <span class="text-ink-muted">Acumulado hasta aquí: {fmtPct(current.cum)}</span>
          <span class={cx('text-[12.5px] font-semibold', Math.abs(diff) < 0.01 ? 'text-ink-muted' : diff > 0 ? 'text-danger' : 'text-success')}>
            {Math.abs(diff) < 0.01 ? `Como de costumbre (${fmtPct(current.normal)})` : `${diff > 0 ? 'Pesa más' : 'Pesa menos'} que de costumbre: ${fmtPct(current.normal)} normal`}
          </span>
        </div>
      </div>
      <svg role="img" aria-label="Diagrama de Pareto de los motivos de no envío de esta comunicación, de mayor a menor, con el acumulado" viewBox={`0 0 ${W} 480`} class="block h-auto w-full">
        {[0, 0.25, 0.5, 0.75, 1].map(tick => (
          <g key={tick}>
            <line x1={PL} x2={PR} y1={y(tick)} y2={y(tick)} stroke="var(--color-line)" />
            <text x={PL - 8} y={y(tick)} text-anchor="end" dominant-baseline="middle" font-size="12" fill="var(--color-ink-muted)">{tick * 100}%</text>
          </g>
        ))}
        <rect x={PL} y={PT} width={band * n80} height={PB - PT} rx="8" fill="var(--color-brand-soft)" opacity="0.55" />
        <line x1={PL} x2={PR} y1={y(0.8)} y2={y(0.8)} stroke="var(--color-ink)" stroke-width="1.5" stroke-dasharray="5 5" opacity="0.55" />
        <text x={PR} y={y(0.8) - 8} text-anchor="end" font-size="12.5" font-weight="700" fill="var(--color-ink)">80 %</text>
        {bars.map((bar, index) => {
          const top = index < n80;
          const on = index === hover;
          return (
            <g key={bar.code} onMouseEnter={() => setHover(index)} class="cursor-pointer">
              <rect x={PL + band * index} y={PT} width={band} height={PB - PT} fill="transparent" />
              <rect x={bar.cx - barWidth / 2} y={y(bar.share)} width={barWidth} height={Math.max(2, bar.share * (PB - PT))} rx="4"
                fill={bar.grouped ? 'var(--color-line-strong)' : bar.origin === 'blq' ? 'var(--color-blq)' : 'var(--color-asl)'} opacity={top || on ? 1 : 0.4}>
                <title>{`${bar.name}: ${fmtInt(bar.count)}`}</title>
              </rect>
              <line x1={bar.cx - barWidth / 2 - 4} x2={bar.cx + barWidth / 2 + 4} y1={y(bar.normal)} y2={y(bar.normal)} stroke="var(--color-ink)" stroke-width="2.5" stroke-linecap="round" />
              {bar.share >= 0.01 && <text x={bar.cx} y={y(Math.max(bar.share, bar.normal)) - 8} text-anchor="middle" font-size="12" font-weight="700" fill="var(--color-ink)" opacity={top || on ? 1 : 0.55}>{Math.round(bar.share * 100)}%</text>}
              <text x={bar.cx} y="318" text-anchor="end" transform={`rotate(-38 ${bar.cx.toFixed(1)} 318)`} font-size="12.5"
                fill={on ? 'var(--color-ink)' : 'var(--color-ink-muted)'} font-weight={on || top ? 600 : 400}>{bar.name}</text>
            </g>
          );
        })}
        <polyline points={bars.map(bar => `${bar.cx.toFixed(1)},${y(bar.cum).toFixed(1)}`).join(' ')} fill="none" stroke="var(--color-ink)" stroke-width="2" stroke-linejoin="round" />
        {bars.map((bar, index) => (
          <circle key={bar.code} cx={bar.cx} cy={y(bar.cum)} r={index === hover ? 6 : 4} fill="var(--color-surface)" stroke="var(--color-ink)" stroke-width="2" pointer-events="none" />
        ))}
      </svg>
      <ul class="flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-ink-muted">
        <li class="flex items-center gap-1.5"><span class="size-2.5 rounded-[3px] bg-asl" />Lista de autosupresión</li>
        <li class="flex items-center gap-1.5"><span class="size-2.5 rounded-[3px] bg-blq" />Bloqueo preventivo</li>
        <li class="flex items-center gap-1.5"><span class="h-[3px] w-4 rounded-sm bg-ink" />Peso normal del motivo</li>
        <li class="flex items-center gap-1.5"><span class="relative h-0.5 w-5 bg-ink"><span class="absolute -top-[3px] left-[6px] size-2 rounded-full border-2 border-ink bg-surface" /></span>Acumulado</li>
      </ul>
    </section>
  );
}
