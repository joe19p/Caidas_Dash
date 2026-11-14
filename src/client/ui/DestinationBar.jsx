// Mini barra del destino de la audiencia de un envío: entregados, rebotes, bloqueos y autosupresión (colores validados
// para daltonismo). item: { base, deliv, bounces, blq } de la lista del mes, la búsqueda o la comparación.
import { cx } from '@/lib/format.mjs';

export function DestinationBar({ item, class: className = 'h-1.5' }) {
  const base = item.base || 1;
  return (
    <span class={cx('flex gap-0.5', className)} aria-hidden="true">
      <span class="rounded-l-[3px] bg-ent" style={{ width: `${(Math.max(0, item.deliv) / base) * 100}%` }} />
      <span class="bg-reb" style={{ width: `${(item.bounces / base) * 100}%` }} />
      <span class="bg-blq" style={{ width: `${(item.blq / base) * 100}%` }} />
      <span class="flex-1 rounded-r-[3px] bg-asl" />
    </span>
  );
}
