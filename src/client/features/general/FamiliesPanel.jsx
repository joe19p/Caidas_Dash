// Por familia de comunicación: tabla ordenable con todas las tasas del periodo (y su descarga para Excel) y la
// dispersión de apertura frente a clic sobre apertura, con el tamaño de cada familia según sus comunicaciones.
import { useState } from 'preact/hooks';
import { cx, fmtInt, fmtPct, periodText } from '@/lib/format.mjs';
import { csvName, downloadCsv } from '@/lib/csv.mjs';
import { familyIcon } from '@/lib/icons.mjs';
import { Panel } from '@/ui/Panel.jsx';
import { Icon } from '@/ui/Icon.jsx';
import { Sparkline } from '@/ui/Sparkline.jsx';
import { rateOf } from './metricsDefs.mjs';

// first: dirección al tocar por primera vez (las cifras, de mayor a menor; el nombre, de la A a la Z).
const COLUMNS = {
  name: { label: 'Familia', first: 1, value: family => family.name },
  comms: { label: 'Comunic.', first: -1, value: family => family.comms },
  sends: { label: 'Envíos', first: -1, value: family => family.sends },
  deliv: { label: 'Entrega', first: -1, rate: 'deliv', digits: 1 },
  or: { label: 'Apertura', first: -1, rate: 'or', digits: 1 },
  ctor: { label: 'CTOR', first: -1, rate: 'ctor', digits: 2 },
  bounce: { label: 'Rebote', first: -1, rate: 'bounce', digits: 2 },
  unsub: { label: 'Bajas', first: -1, rate: 'unsub', digits: 2 },
  drop: { label: 'No reciben', first: -1, rate: 'drop', digits: 1 }
};
const valueOf = (family, key, mode) => (COLUMNS[key].rate ? rateOf(family[COLUMNS[key].rate], mode) : COLUMNS[key].value(family));

export function FamiliesTable({ families, period, mode }) {
  const [sort, setSort] = useState({ key: 'comms', dir: -1 });
  const rows = [...families].sort((a, b) => {
    const x = valueOf(a, sort.key, mode);
    const y = valueOf(b, sort.key, mode);
    if (x == null || y == null) return x == null ? 1 : -1;
    return (typeof x === 'string' ? x.localeCompare(y, 'es') : x - y) * sort.dir;
  });
  const onSort = key => setSort(previous => ({ key, dir: previous.key === key ? -previous.dir : COLUMNS[key].first }));
  const exportRows = () => downloadCsv(csvName('Familias', periodText(period.from, period.to, period.cut), mode === 'vol' ? 'por volumen' : 'por comunicación'),
    Object.keys(COLUMNS).map(key => ({ label: COLUMNS[key].label === 'Comunic.' ? 'Comunicaciones' : COLUMNS[key].label, value: family => valueOf(family, key, mode) })), rows);
  const header = key => {
    const on = sort.key === key;
    return (
      <th key={key} scope="col" aria-sort={on ? (sort.dir < 0 ? 'descending' : 'ascending') : 'none'} class={cx('py-1.5 font-semibold', key === 'name' ? 'pr-2 text-left' : 'px-2 text-right')}>
        <button type="button" onClick={() => onSort(key)} title={`Ordenar por ${COLUMNS[key].label.toLowerCase()}`}
          class={cx('inline-flex items-center gap-1 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-text', on && 'text-brand-text')}>
          {COLUMNS[key].label}
          <Icon name="down" size={12} class={cx(!on && 'opacity-0', on && sort.dir > 0 && 'rotate-180')} />
        </button>
      </th>
    );
  };
  return (
    <Panel boxed id="families" class="h-full" title="Por familia de comunicación"
      subtitle="Todas las tasas de cada familia en el periodo. La familia sale del nombre de la maqueta (CYBER, PROMO, ONBOARDING…)."
      actions={<button type="button" class="btn" onClick={exportRows}><Icon name="download" size={16} />Descargar para Excel</button>}>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-[13px] whitespace-nowrap">
          <thead>
            <tr class="text-xs text-ink-muted">
              {Object.keys(COLUMNS).map(header)}
              <th scope="col" class="py-1.5 pl-2 text-left font-semibold">Apertura, 24 meses</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(family => (
              <tr key={family.name} class="border-t border-line">
                <th scope="row" class="py-2.5 pr-2 text-left font-semibold">
                  <span class="flex items-center gap-2"><Icon name={familyIcon(family.name)} size={15} class="flex-none text-ink-muted" />{family.name}</span>
                </th>
                <td class="px-2 py-2.5 text-right">{fmtInt(family.comms)}</td>
                <td class="px-2 py-2.5 text-right">{fmtInt(family.sends)}</td>
                {['deliv', 'or', 'ctor', 'bounce', 'unsub', 'drop'].map(key => (
                  <td key={key} class={cx('px-2 py-2.5 text-right', key === 'or' && 'font-bold')}>{fmtPct(valueOf(family, key, mode), COLUMNS[key].digits)}</td>
                ))}
                <td class="py-2.5 pl-2"><Sparkline values={family.orSeries} width={110} height={24} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p class="text-xs text-ink-muted">«No reciben» es la parte de la audiencia que no recibió el correo (autosupresión y bloqueos).</p>
    </Panel>
  );
}

const SW = 380, SH = 290, SL = 44, SR = 370, ST = 14, SB = 250;

/** Escala con un poco de aire alrededor de los valores, en pasos redondos. */
function axis(values, step) {
  const low = Math.floor((Math.min(...values) - step / 2) / step) * step;
  const high = Math.ceil((Math.max(...values) + step / 2) / step) * step;
  const ticks = [];
  for (let value = Math.max(0, low); value <= high + step / 2; value += step) ticks.push(value);
  return { low: Math.max(0, low), high, ticks };
}

export function FamilyScatter({ families, period, mode }) {
  const points = families.map(family => ({ family, or: rateOf(family.or, mode), ctor: rateOf(family.ctor, mode) })).filter(point => point.or != null && point.ctor != null);
  const midOr = rateOf(period.kpis.metrics.or, mode);
  const midCtor = rateOf(period.kpis.metrics.ctor, mode);
  if (points.length < 2 || midOr == null || midCtor == null) {
    return (
      <Panel boxed id="scatter" class="h-full" title="Apertura y clic por familia">
        <p class="text-[13px] text-ink-muted">Hacen falta al menos dos familias con envíos para compararlas.</p>
      </Panel>
    );
  }
  const xs = axis([...points.map(point => point.or), midOr], 0.05);
  const ys = axis([...points.map(point => point.ctor), midCtor], 0.02);
  const X = value => SL + ((value - xs.low) / (xs.high - xs.low || 1)) * (SR - SL);
  const Y = value => SB - ((value - ys.low) / (ys.high - ys.low || 1)) * (SB - ST);
  const maxComms = Math.max(...points.map(point => point.family.comms), 1);
  const radius = comms => 6 + Math.sqrt(comms / maxComms) * 16;
  return (
    <Panel boxed id="scatter" class="h-full" title="Apertura y clic por familia"
      subtitle="Cada círculo es una familia; su tamaño, cuántas comunicaciones tuvo. Las líneas punteadas son las del periodo.">
      <svg role="img" aria-label="Apertura frente a clic sobre apertura, por familia" viewBox={`0 0 ${SW} ${SH}`} class="mx-auto block h-auto max-h-[440px] w-full">
        <rect x={X(midOr)} y={ST} width={SR - X(midOr)} height={Y(midCtor) - ST} fill="var(--color-success-soft)" opacity="0.8" />
        <text x={SR - 4} y={ST + 14} text-anchor="end" font-size="11" font-weight="600" fill="var(--color-success)">Más apertura y más clic</text>
        <line x1={SL} x2={SR} y1={SB} y2={SB} stroke="var(--color-line-strong)" />
        <line x1={SL} x2={SL} y1={ST} y2={SB} stroke="var(--color-line-strong)" />
        {xs.ticks.map(value => <text key={value} x={X(value)} y={SB + 16} text-anchor="middle" font-size="11" fill="var(--color-ink-muted)">{Math.round(value * 100)}%</text>)}
        {ys.ticks.map(value => <text key={value} x={SL - 6} y={Y(value)} text-anchor="end" dominant-baseline="middle" font-size="11" fill="var(--color-ink-muted)">{Math.round(value * 100)}%</text>)}
        <line x1={X(midOr)} x2={X(midOr)} y1={ST} y2={SB} stroke="var(--color-ink-muted)" stroke-dasharray="4 4" />
        <line x1={SL} x2={SR} y1={Y(midCtor)} y2={Y(midCtor)} stroke="var(--color-ink-muted)" stroke-dasharray="4 4" />
        <text x={(SL + SR) / 2} y={SH - 4} text-anchor="middle" font-size="11" font-weight="600" fill="var(--color-ink-muted)">Apertura</text>
        <text transform={`translate(11 ${(ST + SB) / 2}) rotate(-90)`} text-anchor="middle" font-size="11" font-weight="600" fill="var(--color-ink-muted)">Clic sobre apertura</text>
        {[...points].sort((a, b) => b.family.comms - a.family.comms).map(point => {
          const x = X(point.or);
          const y = Y(point.ctor);
          const r = radius(point.family.comms);
          const left = x > SR - 90;
          return (
            <g key={point.family.name} data-tip={`${point.family.name}: apertura ${fmtPct(point.or, 1)}, CTOR ${fmtPct(point.ctor, 2)}, ${fmtInt(point.family.comms)} comunicaciones`}>
              <circle cx={x} cy={y} r={r} fill="var(--color-series)" fill-opacity="0.25" stroke="var(--color-series)" stroke-width="1.5" />
              <text x={left ? x - r - 4 : x + r + 4} y={y} text-anchor={left ? 'end' : 'start'} dominant-baseline="middle" font-size="11.5" font-weight="600" fill="var(--color-ink)">{point.family.name}</text>
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}
