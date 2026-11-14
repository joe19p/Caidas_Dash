// Encabezado de columna que ordena al tocarlo (lista con role="table"), y el estado del orden. Toda lista con
// encabezados ordena: la primera vez, las cifras de mayor a menor y los nombres de la A a la Z.
import { useState } from 'preact/hooks';
import { cx } from '@/lib/format.mjs';
import { Icon } from './Icon.jsx';

/** Orden de filas: value(fila, clave) da el valor; los vacíos van al final. */
export function useSort(rows, value, initial) {
  const [sort, setSort] = useState(initial);
  const sorted = sort ? [...rows].sort((a, b) => {
    const x = value(a, sort.key);
    const y = value(b, sort.key);
    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
    return (typeof x === 'string' ? x.localeCompare(y, 'es') : x - y) * sort.dir;
  }) : rows;
  const onSort = (key, first = -1) => setSort(previous => ({ key, dir: previous?.key === key ? -previous.dir : first }));
  return [sorted, sort, onSort];
}

export function SortHeader({ label, column, sort, onSort, first = -1, align = 'right', class: className = '' }) {
  const on = sort?.key === column;
  return (
    <span role="columnheader" aria-sort={on ? (sort.dir < 0 ? 'descending' : 'ascending') : 'none'} class={cx(align === 'right' && 'text-right', className)}>
      <button type="button" onClick={() => onSort(column, first)} title={`Ordenar por ${label.toLowerCase()}`}
        class={cx('inline-flex items-center gap-1 whitespace-nowrap hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-text', align === 'right' && 'flex-row-reverse', on && 'text-brand-text')}>
        {label}
        <Icon name="down" size={12} class={cx('flex-none', !on && 'opacity-0', on && sort.dir > 0 && 'rotate-180')} />
      </button>
    </span>
  );
}
