// Cuántas de cada 100 personas no reciben el correo, por mes (24 meses y el mes en curso): autosupresión del CRM,
// bloqueos de Marketing Cloud y rebotes, apilados. Siempre ponderado por volumen (shared/metrics.mjs → metricDrops).
import { monthShort, monthLong } from '@/lib/format.mjs';
import { Panel } from '@/ui/Panel.jsx';
import { Icon } from '@/ui/Icon.jsx';
import { DESTINATION_ICONS } from '@/lib/icons.mjs';

const W = 800, H = 230, L = 40, R = 792, T = 10, B = 200;
// De abajo hacia arriba.
const PARTS = [
  { key: 'asl', label: 'Autosupresión del CRM', fill: 'var(--color-asl)', swatch: 'bg-asl', text: 'text-asl-ink' },
  { key: 'blq', label: 'Bloqueos de Marketing Cloud', fill: 'var(--color-blq)', swatch: 'bg-blq', text: 'text-blq-ink' },
  { key: 'reb', label: 'Rebotes', fill: 'var(--color-reb)', swatch: 'bg-reb', text: 'text-danger-ink' }
];
const per100 = value => (value * 100).toFixed(1);

export function DropsChart({ history, period }) {
  const totals = history.map(item => (item.drops ? item.drops.total * 100 : 0));
  const step = Math.max(...totals) > 40 ? 10 : 5;
  const top = Math.max(step, Math.ceil((Math.max(...totals) * 1.08) / step) * step);
  const Y = value => B - (value / top) * (B - T);
  const slot = (R - L) / history.length;
  const ticks = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);
  const inside = history.map((item, index) => (item.month >= period.from && item.month <= period.to ? index : -1)).filter(index => index >= 0);
  const now = period.drops;
  const before = period.prev.sends ? period.prevDrops : null;
  const diff = now && before ? (now.total - before.total) * 100 : null;
  return (
    <Panel boxed id="drops" class="h-full" title="Cuántas de cada 100 personas no reciben el correo"
      subtitle={now
        ? <>Por mes y por destino, ponderado por volumen. En el periodo no reciben <b class="text-ink">{per100(now.total)} de cada 100</b>
          {diff == null ? '.' : Math.abs(diff) < 0.05 ? ', igual que en el periodo anterior.' : `, ${Math.abs(diff).toFixed(1)} ${diff < 0 ? 'menos' : 'más'} que en el periodo anterior.`}</>
        : 'Por mes y por destino, ponderado por volumen.'}
      actions={
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
          {[...PARTS].reverse().map(part => (
            <span key={part.key} class="flex items-center gap-1.5">
              <span class={`size-2.5 rounded-[3px] ${part.swatch}`} />
              <Icon name={DESTINATION_ICONS[part.key]} size={13} class={part.text} />{part.label}
            </span>
          ))}
        </div>
      }>
      <svg role="img" aria-label="Personas de cada 100 que no reciben el correo, por mes y destino" viewBox={`0 0 ${W} ${H}`} class="block h-auto w-full">
        {inside.length > 0 && <rect x={L + inside[0] * slot} y={T - 6} width={inside.length * slot} height={B - T + 6} rx="6" fill="var(--color-brand-soft)" opacity="0.6" />}
        {ticks.map(value => (
          <g key={value}>
            <line x1={L} x2={R} y1={Y(value)} y2={Y(value)} stroke="var(--color-line)" />
            <text x={L - 8} y={Y(value)} text-anchor="end" dominant-baseline="middle" font-size="12" fill="var(--color-ink-muted)">{value}</text>
          </g>
        ))}
        {history.map((item, index) => {
          if (!item.drops) return null;
          const x = L + index * slot + slot * 0.18;
          const width = slot * 0.64;
          let base = 0;
          const tip = `${monthLong(item.month)}${item.partial ? ' (hasta hoy)' : ''}: no reciben ${per100(item.drops.total)} de cada 100 (autosupresión ${per100(item.drops.asl)}, bloqueos ${per100(item.drops.blq)}, rebotes ${per100(item.drops.reb)})`;
          return (
            <g key={item.month} data-tip={tip}>
              {PARTS.map(part => {
                const value = item.drops[part.key] * 100;
                const y = Y(base + value);
                const height = Y(base) - y;
                base += value;
                return <rect key={part.key} x={x} y={y} width={width} height={Math.max(0, height)} fill={part.fill} />;
              })}
              {/* Zona tocable de todo el mes, para el tooltip. */}
              <rect x={L + index * slot} y={T} width={slot} height={B - T} fill="transparent" />
            </g>
          );
        })}
        {history.map((item, index) => (index % 3 === 0 || index === history.length - 1) && (
          <text key={item.month} x={L + index * slot + slot / 2} y="222" text-anchor="middle" font-size="12" fill="var(--color-ink-muted)">{monthShort(item.month)}</text>
        ))}
      </svg>
    </Panel>
  );
}
