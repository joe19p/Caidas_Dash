// Vista Comparar: las comunicaciones elegidas lado a lado, cada una por separado (no se suman personas entre ellas).
// Arriba, «de cada 100 personas» de cada una; abajo, en pestañas, la tabla ordenable y la matriz de motivos (qué
// parte de la audiencia de cada comunicación cayó por cada motivo).
import { useEffect, useState } from 'preact/hooks';
import { cx, dayLong, dayShort, fmtInt, fmtPct, hourOf } from '@/lib/format.mjs';
import { useLoad } from '@/lib/useLoad.mjs';
import { api } from '@/services/api.mjs';
import { dataKey, openCommunication } from '@/state/app.mjs';
import { selected, unselect, clearSelected, openSearch, fillSelected } from '@/state/search.mjs';
import { csvName, downloadCsv } from '@/lib/csv.mjs';
import { BreakableName } from '@/ui/BreakableName.jsx';
import { Icon } from '@/ui/Icon.jsx';
import { DESTINATION_ICONS, motiveIcon } from '@/lib/icons.mjs';
import { Panel } from '@/ui/Panel.jsx';
import { Skeleton, EmptyState, ErrorState } from '@/ui/States.jsx';

const share = (part, item) => (item.base ? part / item.base : null);

/** Columnas de la tabla: valor para ordenar, texto, grupo (0 sin grupo, 1 audiencia, 2 envío), qué conviene (better) y
 *  el ícono, en el color de su destino en «De cada 100 personas». */
const COLUMNS = [
  { key: 'base', label: 'Audiencia', group: 0, icon: 'users', tone: 'text-ink-muted', value: item => item.base, text: value => fmtInt(value) },
  { key: 'sent', label: 'Enviado', group: 1, better: 'up', icon: 'mailSend', tone: 'text-ent', value: item => share(item.sends, item), text: value => fmtPct(value) },
  { key: 'drop', label: 'No enviado', group: 1, better: 'down', icon: 'mailX', tone: 'text-ink-muted', value: item => item.rates.drop, text: value => fmtPct(value) },
  { key: 'asl', label: 'Autosupresión', group: 1, better: 'down', icon: DESTINATION_ICONS.asl, tone: 'text-asl', value: item => share(item.asl, item), text: value => fmtPct(value) },
  { key: 'blq', label: 'Bloqueos', group: 1, better: 'down', icon: DESTINATION_ICONS.blq, tone: 'text-blq', value: item => share(item.blq, item), text: value => fmtPct(value) },
  { key: 'bounce', label: 'Rebote', group: 2, better: 'down', icon: DESTINATION_ICONS.reb, tone: 'text-reb', value: item => item.rates.bounce, text: value => fmtPct(value, 2) },
  { key: 'or', label: 'Apertura', group: 2, better: 'up', icon: 'mailOpen', tone: 'text-ent', value: item => item.rates.or, text: value => fmtPct(value) },
  { key: 'ctor', label: 'CTOR', group: 2, better: 'up', icon: 'click', tone: 'text-ent', value: item => item.rates.ctor, text: value => fmtPct(value, 2) }
];
// La primera columna de cada grupo lleva la línea que separa los grupos.
const GROUP_START = new Set(['sent', 'bounce']);
const GROUPS = [['Qué pasó con la audiencia', 4], ['Cómo le fue al envío', 3]];

// Escala de la matriz (5 pasos, como el calendario de calor; en oscuro, más caída es más claro). Clases literales:
// Tailwind solo emite las que encuentra escritas.
const STEP = ['', 'bg-s1 text-on-s1', 'bg-s2 text-on-s2', 'bg-s3 text-on-s3', 'bg-s4 text-on-s4', 'bg-s5 text-on-s5'];
const SWATCHES = ['bg-s1', 'bg-s2', 'bg-s3', 'bg-s4', 'bg-s5'];

function sortItems(items, sort) {
  if (sort.key === 'name') return [...items].sort((a, b) => a.name.localeCompare(b.name, 'es') * sort.dir);
  const column = COLUMNS.find(item => item.key === sort.key) || COLUMNS[2];
  return [...items].sort((a, b) => {
    const x = column.value(a);
    const y = column.value(b);
    if (x == null || y == null) return x == null ? 1 : -1;
    return (x - y) * sort.dir;
  });
}

/** Desde cuándo hasta cuándo son los envíos elegidos. */
function spanText(items) {
  const days = items.map(item => item.start.slice(0, 10)).sort();
  const [first, last] = [days[0], days[days.length - 1]];
  if (first === last) return `Todas del ${dayLong(first)} de ${first.slice(0, 4)}`;
  const sameYear = first.slice(0, 4) === last.slice(0, 4);
  return `Envíos del ${dayShort(first)}${sameYear ? '' : ` de ${first.slice(0, 4)}`} al ${dayShort(last)} de ${last.slice(0, 4)}`;
}

function Who({ item }) {
  return (
    <span class="flex min-w-0 flex-col gap-0.5">
      <button type="button" class="text-left text-[13px] font-semibold wrap-break-word hover:underline" title="Abrir en «Por comunicación»"
        onClick={() => openCommunication({ day: item.start.slice(0, 10), job: item.job })}>
        <BreakableName name={item.name} />
      </button>
      <span class="text-xs text-ink-muted"><span class="first-letter:uppercase inline-block">{dayLong(item.start)}</span>, {hourOf(item.start)}. JobID <span class="font-mono">{item.job}</span></span>
    </span>
  );
}

function Per100({ items, worst }) {
  return (
    <Panel boxed id="per100" title="De cada 100 personas" subtitle="Qué pasó con la audiencia de cada comunicación: cuánto se entregó y cuánto cayó, y por qué lado.">
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
        {/* El ícono de cada destino, en el color de su tramo de la barra. */}
        <span class="flex items-center gap-1.5"><Icon name={DESTINATION_ICONS.ent} size={14} class="text-ent" />Entregados</span>
        <span class="flex items-center gap-1.5"><Icon name={DESTINATION_ICONS.reb} size={14} class="text-reb" />Rebotes</span>
        <span class="flex items-center gap-1.5"><Icon name={DESTINATION_ICONS.blq} size={14} class="text-blq" />Bloqueo preventivo (Marketing Cloud)</span>
        <span class="flex items-center gap-1.5"><Icon name={DESTINATION_ICONS.asl} size={14} class="text-asl" />Autosupresión (CRM)</span>
      </div>
      <ul class="flex flex-col gap-3">
        {items.map(item => {
          const base = item.base || 1;
          const parts = [['bg-ent', Math.max(0, item.deliv) / base, 'entregados'], ['bg-reb', item.bounces / base, 'rebotes'],
            ['bg-blq', item.blq / base, 'bloqueos'], ['bg-asl', item.asl / base, 'autosupresión']];
          const label = parts.map(([, value, name]) => `${fmtPct(value)} ${name}`).join(', ');
          return (
            <li key={item.job} class="grid grid-cols-[minmax(0,260px)_minmax(0,1fr)_72px] items-center gap-x-3.5 gap-y-1.5 max-sm:grid-cols-[minmax(0,1fr)_64px]">
              <Who item={item} />
              <span role="img" aria-label={label} title={label} class="flex h-[22px] gap-0.5 overflow-hidden rounded-md max-sm:order-last max-sm:col-span-2">
                {parts.map(([color, value]) => <span key={color} class={color} style={{ width: `${value * 100}%` }} />)}
              </span>
              <span class={cx('text-right text-[13px]', item.rates.drop === worst ? 'font-bold text-danger' : 'text-ink-muted')}>
                {fmtPct(item.rates.drop)} cae
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/** Mediana de una lista (sin vacíos), o null. */
function median(values) {
  const sorted = values.filter(value => value != null).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Mejor y peor de cada columna con «better», desde 3 comunicaciones (con 2, todo sería mejor o peor); si todas valen
 *  lo mismo, ninguno. */
function extremesOf(items) {
  const result = {};
  COLUMNS.filter(column => column.better).forEach(column => {
    const values = items.map(column.value).filter(value => value != null);
    if (values.length < 3) return;
    const high = Math.max(...values);
    const low = Math.min(...values);
    if (high === low) return;
    result[column.key] = column.better === 'up' ? { best: high, worst: low } : { best: low, worst: high };
  });
  return result;
}

function CompareTable({ items, sort, onSort }) {
  const extremes = extremesOf(items);
  const header = (key, label, className, content) => {
    const on = sort.key === key;
    return (
      <th key={key} scope="col" aria-sort={on ? (sort.dir < 0 ? 'descending' : 'ascending') : 'none'} class={cx('py-2 font-semibold whitespace-nowrap', className)}>
        <button type="button" title={`Ordenar por ${label.toLowerCase()}`} onClick={() => onSort(key)}
          class={cx('inline-flex items-center gap-1.5 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-text', on && 'text-brand-text')}>
          {content}
          {/* La flecha siempre ocupa su lugar: el encabezado no cambia de ancho al ordenar. */}
          <Icon name="down" size={12} class={cx('flex-none', !on && 'opacity-0', on && sort.dir > 0 && 'rotate-180')} />
        </button>
      </th>
    );
  };
  const divider = key => GROUP_START.has(key) && 'border-l border-line';
  return (
    <div class="overflow-x-auto">
      <table class="w-full min-w-[1080px] border-collapse text-[13px]">
        <thead>
          <tr class="text-xs">
            <th colSpan={2} />
            {GROUPS.map(([label, span]) => (
              <th key={label} colSpan={span} scope="colgroup" class="border-l border-line px-2.5 pt-1 font-bold text-ink">
                <span class="block border-b-2 border-line-strong pb-1.5 text-center">{label}</span>
              </th>
            ))}
            <th colSpan={2} />
          </tr>
          <tr class="text-xs text-ink-muted">
            {header('name', 'Comunicación', 'pr-3 text-left', 'Comunicación')}
            {COLUMNS.map(column => header(column.key, column.label, cx('px-2.5 text-right', divider(column.key)),
              <><Icon name={column.icon} size={18} class={cx('flex-none', column.tone)} />{column.label}</>))}
            <th scope="col" class="py-2 pl-2.5 text-left font-semibold">Motivo principal</th>
            <th scope="col"><span class="sr-only">Quitar</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.job} class="border-t border-line align-top">
              <td class="min-w-[240px] py-2.5 pr-3"><Who item={item} /></td>
              {COLUMNS.map(column => {
                const value = column.value(item);
                const mark = extremes[column.key];
                const tone = mark && value === mark.best ? 'bg-success-soft text-success' : mark && value === mark.worst ? 'bg-danger-soft text-danger-ink' : '';
                return (
                  <td key={column.key} class={cx('px-2.5 py-2.5 text-right whitespace-nowrap', divider(column.key))}>
                    {tone ? <b class={cx('rounded-md px-1.5 py-0.5', tone)}>{column.text(value)}</b> : column.text(value)}
                  </td>
                );
              })}
              <td class="min-w-[180px] py-2.5 pl-2.5 text-xs">
                {item.top ? (
                  <span class="flex items-start gap-2">
                    <Icon name={motiveIcon(item.top.code, item.top.origin)} size={19} class={cx('flex-none', item.top.origin === 'blq' ? 'text-blq' : 'text-asl')} />
                    <span><b class="text-[13px]">{item.top.name}</b><br /><span class="text-ink-muted">{fmtPct(share(item.top.count, item))} de la audiencia</span></span>
                  </span>
                ) : '—'}
              </td>
              <td class="py-2 pl-1">
                <button type="button" class="rounded-md p-1 text-ink-muted hover:bg-surface-muted hover:text-ink" aria-label={`Quitar ${item.name}`} title="Quitar de la comparación"
                  onClick={() => unselect(item.job)}><Icon name="close" size={14} /></button>
              </td>
            </tr>
          ))}
          {/* Referencia: la mediana de cada tasa entre las elegidas (no suma personas entre comunicaciones). */}
          <tr class="border-t-2 border-line-strong bg-surface-muted font-semibold text-ink-muted">
            <td class="py-2.5 pr-3 pl-2 text-ink">Mediana de las elegidas</td>
            {COLUMNS.map(column => (
              <td key={column.key} class={cx('px-2.5 py-2.5 text-right whitespace-nowrap', divider(column.key))}>{column.text(median(items.map(column.value)))}</td>
            ))}
            <td colSpan={2} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Cifra de una celda: «—» si no cae nadie, con un decimal bajo 1 % (así 0.4 % no parece 0 %) y entera desde ahí. */
const cellText = value => (value < 0.0005 ? '—' : fmtPct(value, value < 0.01 ? 1 : 0));

function MotiveMatrix({ items, motives }) {
  const [sort, setSort] = useState(null);
  const values = items.flatMap(item => item.shares.concat(item.others));
  const max = Math.max(...values, 0.0001);
  const step = value => (value < 0.0005 ? 0 : Math.min(5, 1 + Math.floor((value / max) * 5)));
  // Columnas agrupadas por origen (primero autosupresión, luego bloqueos) y «Otros motivos» al final. index: posición
  // del motivo en item.shares.
  const byOrigin = origin => motives.map((motive, index) => ({ name: motive.name, origin: motive.origin, key: motive.code, index })).filter(column => column.origin === origin);
  const groups = [['asl', 'Autosupresión del CRM', DESTINATION_ICONS.asl, 'text-asl'], ['blq', 'Bloqueos de Marketing Cloud', DESTINATION_ICONS.blq, 'text-blq']]
    .map(([origin, label, icon, tone]) => ({ label, icon, tone, columns: byOrigin(origin) })).filter(group => group.columns.length);
  const columns = groups.flatMap(group => group.columns).concat([{ name: 'Otros motivos', origin: '', key: 'otros', index: -1 }]);
  const starts = new Set([columns[0].key, ...groups.map(group => group.columns[0].key), 'otros']);
  const valueOf = (item, key) => {
    if (key === 'name') return item.name;
    if (key === 'total') return item.rates.drop;
    const column = columns.find(entry => entry.key === key);
    return column.index < 0 ? item.others : item.shares[column.index];
  };
  const rows = sort ? [...items].sort((a, b) => {
    const x = valueOf(a, sort.key);
    const y = valueOf(b, sort.key);
    if (x == null || y == null) return x == null ? 1 : -1;
    return (typeof x === 'string' ? x.localeCompare(y, 'es') : x - y) * sort.dir;
  }) : items;
  const onSort = key => setSort(previous => ({ key, dir: previous?.key === key ? -previous.dir : key === 'name' ? 1 : -1 }));
  const arrow = key => <Icon name="down" size={12} class={cx('flex-none', sort?.key !== key && 'opacity-0', sort?.key === key && sort.dir > 0 && 'rotate-180')} />;
  const ariaSort = key => (sort?.key === key ? (sort.dir < 0 ? 'descending' : 'ascending') : 'none');
  const divider = key => starts.has(key) && 'border-l border-line';
  return (
    <div class="overflow-x-auto">
      {/* Ancho fijo por columna: todas las celdas de motivos miden lo mismo, sin importar lo largo del nombre. */}
      <table class="w-full min-w-[1100px] table-fixed border-collapse text-[13px]">
        <colgroup>
          <col class="w-[260px]" />
          {columns.map(column => <col key={column.key} />)}
          <col class="w-[112px]" />
        </colgroup>
        <thead>
          <tr class="text-xs">
            <th />
            {groups.map(group => (
              <th key={group.label} colSpan={group.columns.length} scope="colgroup" class="border-l border-line px-1 pt-1 font-bold text-ink">
                <span class="flex items-center justify-center gap-1.5 border-b-2 border-line-strong pb-1.5"><Icon name={group.icon} size={15} class={group.tone} />{group.label}</span>
              </th>
            ))}
            <th class="border-l border-line" />
            <th class="border-l border-line" />
          </tr>
          <tr class="text-xs text-ink-muted">
            <th scope="col" aria-sort={ariaSort('name')} class="py-2 pr-3 text-left align-top font-semibold">
              <button type="button" onClick={() => onSort('name')} title="Ordenar por comunicación"
                class={cx('inline-flex items-center gap-1 pt-[30px] hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-text', sort?.key === 'name' && 'text-brand-text')}>
                Comunicación{arrow('name')}
              </button>
            </th>
            {columns.map(column => (
              <th key={column.key} scope="col" aria-sort={ariaSort(column.key)} class={cx('px-1 py-2 align-top font-semibold', divider(column.key))}>
                {/* Ícono arriba en un alto fijo: queda alineado en todas las columnas aunque el nombre ocupe una o dos líneas. */}
                <button type="button" onClick={() => onSort(column.key)} title={`Ordenar por ${column.name.toLowerCase()}`}
                  class={cx('flex w-full flex-col items-center gap-1.5 text-center leading-tight hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-text', sort?.key === column.key && 'text-brand-text')}>
                  <span class="flex h-[22px] items-center">
                    {column.origin && <Icon name={motiveIcon(column.key, column.origin)} size={22} class={column.origin === 'blq' ? 'text-blq' : 'text-asl'} />}
                  </span>
                  <span>{column.name}</span>
                  {arrow(column.key)}
                </button>
              </th>
            ))}
            <th scope="col" aria-sort={ariaSort('total')} class="border-l border-line py-2 pl-2 align-top font-semibold">
              <button type="button" onClick={() => onSort('total')} title="Ordenar por lo que no recibe"
                class={cx('ml-auto flex flex-col items-end gap-1.5 pt-[30px] hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-text', sort?.key === 'total' && 'text-brand-text')}>
                No recibe{arrow('total')}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(item => (
            <tr key={item.job} class="border-t border-line hover:bg-surface-muted/60">
              <td class="py-2 pr-3"><Who item={item} /></td>
              {columns.map(column => {
                const value = valueOf(item, column.key);
                const level = step(value);
                return (
                  <td key={column.key} class={cx('p-1', divider(column.key))}>
                    <span title={`${column.name}: ${fmtPct(value, 2)} de la audiencia`}
                      class={cx('flex h-[36px] items-center justify-center rounded-md text-[12.5px]', level ? `${STEP[level]} font-bold` : 'text-line-strong')}>
                      {cellText(value)}
                    </span>
                  </td>
                );
              })}
              {/* Total de la misma comunicación (su «no enviado»): no suma personas entre comunicaciones. */}
              <td class="border-l border-line py-2 pr-1 pl-2 text-right">
                <b class="block text-sm">{fmtPct(item.rates.drop)}</b>
                <span class="text-[11.5px] text-ink-muted">de la audiencia</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Comparación para Excel: una fila por comunicación, con sus tasas y la parte de la audiencia de cada motivo. */
function exportCompare(items, motives) {
  const columns = [
    { label: 'Comunicación', value: item => item.name },
    { label: 'JobID', value: item => item.job },
    { label: 'Familia', value: item => item.family },
    { label: 'Envío', value: item => String(item.start).replace('T', ' ') },
    ...COLUMNS.map(column => ({ label: column.label, value: column.value })),
    ...motives.map((motive, index) => ({ label: `${motive.name} (${motive.code})`, value: item => item.shares[index] })),
    { label: 'Otros motivos', value: item => item.others }
  ];
  downloadCsv(csvName('Comparación', `${items.length} comunicaciones`), columns, items);
}

export function CompareView() {
  const [sort, setSort] = useState({ key: 'drop', dir: -1 });
  const [tab, setTab] = useState('tabla');
  const chosen = selected.value;
  const jobs = chosen.map(item => item.job);
  const [state, retry] = useLoad(jobs.length >= 2 ? `${dataKey.value}|${jobs.join(',')}` : '', () => api.getCompare(jobs), { keepPrevious: true });
  // Las que llegaron desde un enlace (solo con su JobID) reciben su nombre y fecha.
  useEffect(() => { if (state.data) fillSelected(state.data.items); }, [state.data]);
  if (jobs.length < 2) {
    return (
      <EmptyState icon="columns" title="Elige al menos dos comunicaciones"
        text="Búscalas en la barra de arriba (en el mes o en todos los meses) o márcalas en la lista del día, y vuelve aquí para verlas lado a lado.">
        <button type="button" class="btn-primary" onClick={openSearch}><Icon name="search" size={16} />Buscar comunicaciones</button>
      </EmptyState>
    );
  }
  if (state.status === 'error') return <ErrorState text={state.error} onRetry={retry} />;
  if (!state.data) return <div class="flex flex-col gap-4"><Skeleton class="h-16" /><Skeleton class="h-64" /><Skeleton class="h-80" /></div>;
  // Solo las que siguen elegidas (al quitar una, se ve al instante sin esperar al servidor).
  const items = sortItems(state.data.items.filter(item => jobs.includes(item.job)), sort);
  const worst = Math.max(...items.map(item => item.rates.drop ?? -1));
  const column = COLUMNS.find(item => item.key === sort.key);
  const onSort = key => setSort(previous => ({ key, dir: previous.key === key ? -previous.dir : key === 'name' ? 1 : -1 }));
  return (
    <div class={cx('flex flex-col gap-5 transition-opacity', state.status === 'loading' && 'opacity-60')} aria-busy={state.status === 'loading'}>
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-[22px] font-bold">Comparar {items.length} comunicaciones</h1>
          <p class="mt-1 text-[13px] text-ink-muted">
            {spanText(items)}. Ordenadas {column ? `por ${column.label.toLowerCase()}, de ${sort.dir < 0 ? 'mayor a menor' : 'menor a mayor'}` : `por nombre, de la ${sort.dir > 0 ? 'A a la Z' : 'Z a la A'}`}. Cada una se mira por separado: no se suman personas entre ellas.
          </p>
        </div>
        <span class="flex flex-wrap gap-2">
          <button type="button" class="btn" onClick={openSearch}><Icon name="search" size={16} />Agregar más</button>
          <button type="button" class="btn" title="Descargar la comparación para abrirla en Excel" onClick={() => exportCompare(items, state.data.motives)}>
            <Icon name="download" size={16} />Descargar
          </button>
          <button type="button" class="btn" onClick={clearSelected}>Quitar todas</button>
        </span>
      </div>

      {state.data.missing.length > 0 && (
        <p role="status" class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-warning-soft px-3.5 py-2.5 text-[13px] text-warning-ink">
          {state.data.missing.length === 1 ? 'Una comunicación elegida ya no está en la hoja.' : `${state.data.missing.length} comunicaciones elegidas ya no están en la hoja.`}
          <button type="button" class="font-semibold underline" onClick={() => state.data.missing.forEach(unselect)}>Quitarlas</button>
        </p>
      )}

      <Per100 items={items} worst={worst} />

      <section aria-label="Detalle de la comparación" class="panel flex flex-col gap-3.5 p-4">
        <div role="group" aria-label="Cómo comparar" class="flex flex-wrap border-b border-line">
          {[['tabla', 'Tabla'], ['matriz', 'Matriz de motivos']].map(([id, label]) => (
            <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}
              class={cx('-mb-px mr-5.5 inline-flex h-[42px] items-center border-b-2 px-1 text-sm',
                tab === id ? 'border-brand-text font-bold text-brand-text' : 'border-transparent font-semibold text-ink-muted hover:text-ink')}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'tabla'
          ? <>
            <CompareTable items={items} sort={sort} onSort={onSort} />
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-muted">
              {items.length > 2 && <span class="flex items-center gap-1.5"><b class="rounded-md bg-success-soft px-1.5 py-0.5 text-success">Verde</b>la mejor de la columna</span>}
              {items.length > 2 && <span class="flex items-center gap-1.5"><b class="rounded-md bg-danger-soft px-1.5 py-0.5 text-danger-ink">Rojo</b>la peor</span>}
              <span>Toca un encabezado para ordenar y un nombre para abrir la comunicación.</span>
            </div>
          </>
          : <>
            <MotiveMatrix items={items} motives={state.data.motives} />
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">
              <span>Cada celda es la parte de la audiencia de esa comunicación que cayó por ese motivo. Así se ve qué regla le pega a cuál.</span>
              <span class="flex items-center gap-1.5">Menos caída{SWATCHES.map(swatch => <span key={swatch} class={cx('h-[11px] w-[22px] rounded-[3px]', swatch)} />)}Más caída</span>
            </div>
          </>}
      </section>
    </div>
  );
}
