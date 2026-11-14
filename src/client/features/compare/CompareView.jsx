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

/** Columnas de la tabla: valor para ordenar y texto. */
const COLUMNS = [
  { key: 'base', label: 'Audiencia', value: item => item.base, text: value => fmtInt(value) },
  { key: 'sent', label: 'Enviado', value: item => share(item.sends, item), text: value => fmtPct(value) },
  { key: 'drop', label: 'No enviado', value: item => item.rates.drop, text: value => fmtPct(value) },
  { key: 'asl', label: 'Autosupresión', value: item => share(item.asl, item), text: value => fmtPct(value) },
  { key: 'blq', label: 'Bloqueos', value: item => share(item.blq, item), text: value => fmtPct(value) },
  { key: 'bounce', label: 'Rebote', value: item => item.rates.bounce, text: value => fmtPct(value, 2) },
  { key: 'or', label: 'Apertura', value: item => item.rates.or, text: value => fmtPct(value) },
  { key: 'ctor', label: 'CTOR', value: item => item.rates.ctor, text: value => fmtPct(value, 2) }
];

// Escala de la matriz (5 pasos, como el calendario de calor; en oscuro, más caída es más claro). Clases literales:
// Tailwind solo emite las que encuentra escritas.
const STEP = ['', 'bg-s1 text-on-s1', 'bg-s2 text-on-s2', 'bg-s3 text-on-s3', 'bg-s4 text-on-s4', 'bg-s5 text-on-s5'];
const SWATCHES = ['bg-s1', 'bg-s2', 'bg-s3', 'bg-s4', 'bg-s5'];

function sortItems(items, sort) {
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

function CompareTable({ items, sort, onSort, worst }) {
  return (
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-[13px]">
        <thead>
          <tr class="text-xs text-ink-muted">
            <th scope="col" class="py-2 pr-3 text-left font-semibold">Comunicación</th>
            {COLUMNS.map(column => {
              const on = sort.key === column.key;
              return (
                <th key={column.key} scope="col" class="px-2.5 py-2 text-right font-semibold whitespace-nowrap"
                  aria-sort={on ? (sort.dir < 0 ? 'descending' : 'ascending') : 'none'}>
                  <button type="button" class={cx('inline-flex items-center gap-1 hover:text-ink', on && 'text-brand-text')} onClick={() => onSort(column.key)}>
                    {column.label}{on && <Icon name="down" size={12} class={sort.dir > 0 ? 'rotate-180' : ''} />}
                  </button>
                </th>
              );
            })}
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
                return (
                  <td key={column.key} class={cx('px-2.5 py-2.5 text-right whitespace-nowrap', column.key === 'drop' && value === worst && 'font-bold text-danger')}>
                    {column.text(value)}
                  </td>
                );
              })}
              <td class="min-w-[160px] py-2.5 pl-2.5 text-xs">
                {item.top ? <><b class="text-[13px]">{item.top.name}</b><br /><span class="text-ink-muted">{fmtPct(share(item.top.count, item))} de la audiencia</span></> : '—'}
              </td>
              <td class="py-2 pl-1">
                <button type="button" class="rounded-md p-1 text-ink-muted hover:bg-surface-muted hover:text-ink" aria-label={`Quitar ${item.name}`} title="Quitar de la comparación"
                  onClick={() => unselect(item.job)}><Icon name="close" size={14} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MotiveMatrix({ items, motives }) {
  const values = items.flatMap(item => item.shares.concat(item.others));
  const max = Math.max(...values, 0.0001);
  const step = value => (value < 0.0005 ? 0 : Math.min(5, 1 + Math.floor((value / max) * 5)));
  const columns = motives.map(motive => ({ name: motive.name, origin: motive.origin, key: motive.code })).concat([{ name: 'Otros motivos', origin: '', key: 'otros' }]);
  return (
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-[13px]">
        <thead>
          <tr class="text-xs text-ink-muted">
            <th scope="col" class="py-2 pr-3 text-left font-semibold">Comunicación</th>
            {columns.map(column => (
              <th key={column.key} scope="col" class="min-w-[76px] px-1 py-2 text-center align-bottom font-semibold">
                {column.origin && <Icon name={motiveIcon(column.key, column.origin)} size={14} class={cx('mx-auto mb-1 block', column.origin === 'blq' ? 'text-blq' : 'text-asl')} />}
                {column.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.job} class="border-t border-line">
              <td class="min-w-[220px] py-2 pr-3"><Who item={item} /></td>
              {item.shares.concat(item.others).map((value, index) => {
                const level = step(value);
                return (
                  <td key={columns[index].key} class="p-1">
                    <span title={`${columns[index].name}: ${fmtPct(value)} de la audiencia`}
                      class={cx('flex h-[34px] items-center justify-center rounded-md text-xs', level ? `${STEP[level]} font-bold` : 'text-line-strong')}>
                      {level ? fmtPct(value, 0) : '—'}
                    </span>
                  </td>
                );
              })}
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
  const onSort = key => setSort(previous => ({ key, dir: previous.key === key ? -previous.dir : -1 }));
  return (
    <div class={cx('flex flex-col gap-5 transition-opacity', state.status === 'loading' && 'opacity-60')} aria-busy={state.status === 'loading'}>
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-[22px] font-bold">Comparar {items.length} comunicaciones</h1>
          <p class="mt-1 text-[13px] text-ink-muted">
            {spanText(items)}. Ordenadas por {column.label.toLowerCase()}, de {sort.dir < 0 ? 'mayor a menor' : 'menor a mayor'}. Cada una se mira por separado: no se suman personas entre ellas.
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
          ? <><CompareTable items={items} sort={sort} onSort={onSort} worst={worst} /><p class="text-xs text-ink-muted">Toca un encabezado para ordenar y un nombre para abrir la comunicación.</p></>
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
