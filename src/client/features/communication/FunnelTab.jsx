// Pestaña Funnel (la que abre por defecto): el «Funnel de procesamiento de audiencia» del reporte original, en pequeño.
// Abre hasta el nivel 2 (se elige hasta qué nivel ver y cada pilar abre su desglose); las columnas entran en orden.
// Cuatro niveles (origen, procesamiento, cuatro pilares, engagement y desgloses) unidos por conectores en escuadra del
// color del destino, y debajo la tabla de motivos del reporte original, agrupada por origen. Sirve de puente para quien venía de esa pantalla.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { cx, fmtInt, fmtPct } from '@/lib/format.mjs';
import { metricFold } from '@shared/metrics.mjs';
import { Icon } from '@/ui/Icon.jsx';
import { DESTINATION_ICONS, motiveIcon } from '@/lib/icons.mjs';
import { Segmented } from '@/ui/Segmented.jsx';
import { readStored, writeStored } from '@/services/storage.mjs';

// Qué caja se une con cuál (de izquierda a derecha) y el color de cada flecha: el del destino.
// El último número es la columna de destino (para escalonar la animación de entrada).
const LINKS = [
  ['aud', 'env', '--color-ent', 2], ['aud', 'nenv', '--color-line-strong', 2],
  ['env', 'ent', '--color-ent', 3], ['env', 'reb', '--color-reb', 3],
  ['nenv', 'asl', '--color-asl', 3], ['nenv', 'blq', '--color-blq', 3],
  ['ent', 'eng', '--color-ent', 4], ['reb', 'dreb', '--color-reb', 4], ['asl', 'dasl', '--color-asl', 4], ['blq', 'dblq', '--color-blq', 4]
];
// Debajo de este ancho los niveles se apilan y las flechas no se dibujan.
const WIDE = 900;

/**
 * Flechas medidas sobre las cajas reales: siempre apuntan al centro aunque una caja crezca. Se miden con la posición
 * final de cada caja (offset*, sin la transformación de la animación de entrada) y de nuevo cuando cambia lo que se ve
 * (layoutKey: niveles y desgloses abiertos).
 */
function useArrows(container, nodes, layoutKey) {
  const [state, setState] = useState({ wide: true, paths: [] });
  useLayoutEffect(() => {
    const box = container.current;
    if (!box) return undefined;
    const measure = () => {
      const wide = box.clientWidth >= WIDE;
      const rect = element => element && element.isConnected
        ? { left: element.offsetLeft, top: element.offsetTop, right: element.offsetLeft + element.offsetWidth, height: element.offsetHeight }
        : null;
      const paths = wide ? LINKS.map(([from, to, color, column]) => {
        const a = rect(nodes.current[from]);
        const b = rect(nodes.current[to]);
        if (!a || !b) return null;
        // Conector en escuadra: sale del borde, baja o sube por el medio del espacio entre columnas (esquinas
        // redondeadas) y entra recto a la caja. Sin curvas que se crucen.
        const x1 = Math.round(a.right);
        const y1 = Math.round(a.top + a.height / 2);
        const x2 = Math.round(b.left - 3);
        const y2 = Math.round(b.top + b.height / 2);
        const mid = Math.round((x1 + x2) / 2);
        const dy = y2 - y1;
        const radius = Math.min(10, Math.abs(dy) / 2, (x2 - x1) / 4);
        const turn = Math.sign(dy) * radius;
        const d = Math.abs(dy) < 2
          ? `M${x1},${y1} H${x2}`
          : `M${x1},${y1} H${mid - radius} Q${mid},${y1} ${mid},${y1 + turn} V${y2 - turn} Q${mid},${y2} ${mid + radius},${y2} H${x2}`;
        // len: largo del trazo (para dibujarlo de a poco en la entrada).
        return { key: `${from}-${to}`, color, column, x1, y1, d, len: Math.abs(x2 - x1) + Math.abs(dy) + 20, tip: `M${x2 - 6},${y2 - 5} L${x2},${y2} L${x2 - 6},${y2 + 5}` };
      }).filter(Boolean) : [];
      setState({ wide, paths });
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(box);
    return () => observer?.disconnect();
  }, [layoutKey]);
  return state;
}

/** Caja del funnel. tone: borde y fondo (por defecto, borde gris sobre blanco); va aparte para que no choquen clases. */
function Box({ id, refs, tone = 'border-line bg-surface', class: className = '', style, children }) {
  return <div ref={element => { refs.current[id] = element; }} class={cx('flex flex-col gap-1 rounded-[10px] border px-3 py-2.5', tone, className)} style={style}>{children}</div>;
}

/** Nombre de una caja con el ícono de su destino (icon, en el color iconClass). */
const Label = ({ icon, iconClass = 'text-ink-muted', children, class: className = '' }) => (
  <span class={cx('flex items-center gap-2 text-[13px] font-semibold', className)}>{icon && <Icon name={icon} size={16} class={cx('flex-none', iconClass)} />}{children}</span>
);
const Big = ({ children }) => <span class="text-xl leading-tight font-bold">{children}</span>;
const Note = ({ children }) => <span class="text-xs leading-snug text-ink-muted">{children}</span>;

/** Lista nombre → cifra de un desglose (nombre recortado con el código al pasar el mouse). */
function Mini({ rows }) {
  return (
    <div class="mt-0.5 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-[3px] text-[12.5px]">
      {rows.map(([name, value, code]) => [
        <span key={`${name}-n`} class="truncate text-ink-muted" title={code || name}>{name}</span>,
        <b key={`${name}-v`} class="text-right font-semibold">{value}</b>
      ])}
    </div>
  );
}

/** Los tres motivos de más volumen de un origen y el resto junto. */
function topOf(motives, origin, total, otherLabel) {
  const list = motives.filter(motive => motive.origin === origin);
  const top = list.slice(0, 3).map(motive => [motive.name, fmtInt(motive.count), motive.code]);
  const rest = total - list.slice(0, 3).reduce((sum, motive) => sum + motive.count, 0);
  if (list.length > 3 && rest > 0) top.push([otherLabel, fmtInt(rest)]);
  return top;
}

const ORIGINS = [
  ['asl', 'Autosupresión (CRM)', 'bg-asl', 'Listas del CRM que excluyen a propósito.', 'autosupresión'],
  ['blq', 'Bloqueo preventivo (Marketing Cloud)', 'bg-blq', 'Estados en los que Marketing Cloud no intenta entregar.', 'bloqueo']
];

/** Columnas que ordenan: valor de cada motivo y sentido de entrada (texto de A a Z, cifras de mayor a menor). */
const SORT_COLUMNS = {
  name: { label: 'Columna o motivo de caída', value: motive => motive.name, first: 1 },
  count: { label: 'Volumen caído', value: motive => motive.count, first: -1 },
  share: { label: '% sobre caídas', value: motive => motive.share, first: -1 },
  audience: { label: '% audiencia total', value: (motive, base) => motive.count / base, first: -1 }
};

// Filas visibles de entrada en cada grupo: el resto con «Ver los N».
const FIRST_ROWS = 6;

/**
 * Tabla de motivos en su propio bloque: agrupada por origen (cada grupo con su subtotal, se contrae desde su fila),
 * ordenable por cualquier columna dentro de cada grupo, con buscador (nombre, código y descripción, sin tildes) y el
 * encabezado fijo al recorrerla. Al buscar se ven todas las coincidencias, aunque el grupo esté contraído.
 */
function MotivesTable({ detail }) {
  const [sort, setSort] = useState({ key: 'count', dir: -1 });
  const [collapsed, setCollapsed] = useState({});
  const [expanded, setExpanded] = useState({});
  const [query, setQuery] = useState('');
  const scroller = useRef(null);
  // Al cambiar la búsqueda, la tabla vuelve arriba: lo encontrado no queda fuera de la vista.
  const search = value => { setQuery(value); if (scroller.current) scroller.current.scrollTop = 0; };
  const needle = metricFold(query.trim());
  const matches = motive => !needle || metricFold(`${motive.name}
${motive.code}
${motive.description || ''}`).includes(needle);
  const base = detail.record.base || 1;
  const notSent = detail.record.notSent || 1;
  const column = SORT_COLUMNS[sort.key];
  const compare = (a, b) => {
    const x = column.value(a, base);
    const y = column.value(b, base);
    return (typeof x === 'string' ? x.localeCompare(y, 'es') : x - y) * sort.dir;
  };
  const groups = ORIGINS.map(([origin, label, swatch, note, noun]) => {
    const all = detail.motives.filter(motive => motive.origin === origin);
    const list = all.filter(matches).sort(compare);
    // El subtotal es siempre el del grupo completo: buscar filtra filas, no cambia lo que cayó.
    return { origin, label, swatch, note, noun, list, size: all.length, total: all.reduce((sum, motive) => sum + motive.count, 0) };
  }).filter(group => group.list.length).sort((a, b) => b.total - a.total);
  const found = groups.reduce((sum, group) => sum + group.list.length, 0);
  const allCollapsed = groups.every(group => collapsed[group.origin]);
  const toggleAll = () => setCollapsed(Object.fromEntries(groups.map(group => [group.origin, !allCollapsed])));
  const onSort = key => setSort(previous => ({ key, dir: previous.key === key ? -previous.dir : SORT_COLUMNS[key].first }));
  const header = (key, className = '') => {
    const on = sort.key === key;
    return (
      <th scope="col" aria-sort={on ? (sort.dir < 0 ? 'descending' : 'ascending') : 'none'} class={cx('bg-surface px-2.5 py-2.5 font-semibold', className)}>
        <button type="button" onClick={() => onSort(key)} class={cx('inline-flex items-center gap-1 hover:text-ink', on && 'text-brand-text')}
          title={`Ordenar por ${SORT_COLUMNS[key].label.toLowerCase()}`}>
          {SORT_COLUMNS[key].label}
          <Icon name="down" size={12} class={cx(!on && 'opacity-0', on && sort.dir > 0 && 'rotate-180')} />
        </button>
      </th>
    );
  };
  return (
    <section aria-labelledby="mt-t" class="section-rule">
      <div class="flex flex-wrap items-start justify-between gap-2.5">
        <div class="min-w-0">
          <h2 id="mt-t" class="text-[15px] font-bold">Mapeo de motivos de caída</h2>
          <p class="mt-0.5 text-[12.5px] text-ink-muted">
            Cada lista de autosupresión y cada estado de Marketing Cloud que dejó personas sin envío, agrupados por origen. Toca un encabezado para ordenar y un grupo para contraerlo.
          </p>
        </div>
        <span class="flex flex-wrap items-center gap-2">
          <label class="relative flex w-64 items-center max-sm:w-full">
            <span class="sr-only">Buscar motivo</span>
            <Icon name="search" size={15} class="pointer-events-none absolute left-2.5 text-ink-muted" />
            <input type="text" value={query} autocomplete="off" spellcheck={false} placeholder="Buscar motivo, código o descripción…"
              onInput={event => search(event.currentTarget.value)} onKeyDown={event => { if (event.key === 'Escape') search(''); }}
              class="field h-8 pr-8 pl-8 text-[13px]" />
            {query && (
              <button type="button" class="absolute right-1.5 rounded-md p-1 text-ink-muted hover:bg-surface-muted hover:text-ink" aria-label="Borrar la búsqueda" onClick={() => search('')}>
                <Icon name="close" size={13} />
              </button>
            )}
          </label>
          {!needle && <button type="button" class="btn h-8 px-3 text-[13px]" onClick={toggleAll}>{allCollapsed ? 'Expandir todo' : 'Contraer todo'}</button>}
        </span>
      </div>
      {needle && (
        <p aria-live="polite" class="-mt-1 text-[12.5px] text-ink-muted">
          {found ? <><b class="text-ink">{found}</b> de {detail.motives.length} motivos coinciden con «{query.trim()}».</> : <>Ningún motivo coincide con «{query.trim()}».</>}
        </p>
      )}
      {/* Con alto máximo, el encabezado queda fijo al recorrer la tabla. */}
      <div ref={scroller} class="max-h-[70vh] overflow-auto rounded-lg border border-line">
        <table class="w-full min-w-[820px] border-collapse text-[13px]">
          <thead class="sticky top-0 z-10 shadow-[0_1px_0_var(--color-line)]">
            <tr class="text-left text-xs text-ink-muted">
              {header('name', 'pl-3.5')}
              {header('count', 'text-right')}
              {header('share', 'text-right')}
              {header('audience', 'text-right')}
              <th scope="col" class="bg-surface py-2.5 pr-3.5 pl-2.5 font-semibold">Descripción</th>
            </tr>
          </thead>
          {groups.map(group => {
            // Al buscar se abre todo: lo encontrado no queda escondido en un grupo contraído o en «Ver los N».
            const closed = !needle && collapsed[group.origin];
            const all = needle || expanded[group.origin];
            const rows = closed ? [] : all ? group.list : group.list.slice(0, FIRST_ROWS);
            return (
              <tbody key={group.origin}>
                <tr class="border-t border-line bg-surface-muted">
                  <th scope="rowgroup" class="py-0 pr-2.5 pl-1.5 text-left">
                    <button type="button" aria-expanded={!closed} onClick={() => setCollapsed({ ...collapsed, [group.origin]: !closed })}
                      class="flex w-full items-center gap-2 rounded-md py-2.5 pr-2 pl-2 text-left font-bold hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-text">
                      <Icon name="down" size={14} class={cx('flex-none text-ink-muted transition-transform', closed && '-rotate-90')} />
                      <span class={cx('size-2.5 flex-none rounded-[3px]', group.swatch)} />
                      {group.label}
                      <span class="font-medium text-ink-muted">({needle ? `${group.list.length} de ${group.size}` : group.size})</span>
                    </button>
                  </th>
                  <td class="px-2.5 py-2.5 text-right font-bold">{fmtInt(group.total)}</td>
                  <td class="px-2.5 py-2.5 text-right font-semibold">{fmtPct(group.total / notSent, 2)}</td>
                  <td class="px-2.5 py-2.5 text-right font-semibold text-ink-muted">{fmtPct(group.total / base, 2)}</td>
                  <td class="py-2.5 pr-3.5 pl-2.5 text-xs text-ink-muted">{group.note}</td>
                </tr>
                {rows.map(motive => (
                  <tr key={motive.code} class="border-t border-line align-top hover:bg-surface-muted/60">
                    <td class="py-2.5 pr-2.5 pl-[34px]">
                      <span class="flex items-start gap-2">
                        <Icon name={motiveIcon(motive.code, motive.origin)} size={15} class={cx('mt-0.5 flex-none', motive.origin === 'blq' ? 'text-blq' : 'text-asl')} />
                        <span class="flex flex-col"><b class="font-semibold">{motive.name}</b><span class="text-[11.5px] text-ink-muted">{motive.code}</span></span>
                      </span>
                    </td>
                    <td class="px-2.5 py-2.5 text-right font-bold">{fmtInt(motive.count)}</td>
                    <td class="px-2.5 py-2.5 text-right">{fmtPct(motive.share, 2)}</td>
                    <td class="px-2.5 py-2.5 text-right text-ink-muted">{fmtPct(motive.count / base, 2)}</td>
                    <td class="max-w-[360px] py-2.5 pr-3.5 pl-2.5 text-ink-muted">{motive.description || '—'}</td>
                  </tr>
                ))}
                {!closed && !needle && group.list.length > FIRST_ROWS && (
                  <tr class="border-t border-line">
                    <td colSpan={5} class="py-2 pl-[42px]">
                      <button type="button" onClick={() => setExpanded({ ...expanded, [group.origin]: !all })} class="text-[13px] font-semibold text-brand-text hover:underline">
                        {all ? `Ver solo los ${FIRST_ROWS} principales` : `Ver los ${group.list.length} motivos de ${group.noun}`}
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            );
          })}
        </table>
      </div>
    </section>
  );
}

const DEPTHS = [{ value: 1, label: 'Hasta nivel 1' }, { value: 2, label: 'Hasta nivel 2' }, { value: 3, label: 'Todos los niveles' }];
// Entrada escalonada: cada columna aparece este tiempo después de la anterior (solo al abrir la pestaña).
const STEP_MS = 140;

/** Botón «Ver desglose» de un pilar, cuando no se ven todos los niveles. */
function DetailToggle({ open, onToggle, label }) {
  return (
    <button type="button" aria-expanded={open} onClick={onToggle}
      class="mt-1 inline-flex items-center gap-1 self-start text-xs font-bold text-brand-text hover:underline focus-visible:outline-2 focus-visible:outline-brand-text"
      title={`${open ? 'Ocultar' : 'Ver'} el desglose de ${label}`}>
      {open ? 'Ocultar desglose' : 'Ver desglose'}<Icon name={open ? 'left' : 'right'} size={13} />
    </button>
  );
}

export function FunnelTab({ detail }) {
  const container = useRef(null);
  const nodes = useRef({});
  const [depth, setDepthState] = useState(() => { const stored = readStored('funnel_depth', 2); return [1, 2, 3].includes(stored) ? stored : 2; });
  const [open, setOpen] = useState({});
  const setDepth = value => { setDepthState(value); setOpen({}); writeStored('funnel_depth', value); };
  const show2 = depth >= 2;
  const show3 = key => depth >= 3 || Boolean(open[key]);
  const any3 = depth >= 3 || Object.values(open).some(Boolean);
  // Al abrir la pestaña, las columnas entran en orden; lo que se abre después aparece sin esperar.
  const first = useRef(true);
  useEffect(() => { first.current = false; }, []);
  const delay = column => ({ '--delay': `${first.current ? (column - 1) * STEP_MS : 0}ms` });
  const layoutKey = `${depth}:${Object.keys(open).filter(key => open[key]).join(',')}`;
  const { wide, paths } = useArrows(container, nodes, layoutKey);
  const r = detail.record;
  const base = r.base || 1;
  const sends = r.sends || 0;
  const notSent = r.notSent || 0;
  const pct = (value, total, digits) => fmtPct(total ? value / total : null, digits);
  const level = 'funnel-enter text-[12.5px] font-semibold text-ink-muted';
  const place = (column, row) => ({ ...(wide ? { gridColumn: column, gridRow: row } : {}), ...delay(column) });
  const toggle = key => setOpen({ ...open, [key]: !open[key] });
  const pillarToggle = (key, label) => depth < 3 && <DetailToggle open={Boolean(open[key])} onToggle={() => toggle(key)} label={label} />;
  // Columnas según lo que se ve (clases literales: Tailwind solo emite las que encuentra escritas).
  const columns = !show2 ? 'grid-cols-[1fr_1.4fr]' : any3 ? 'grid-cols-[1fr_1.05fr_1.05fr_1.15fr]' : 'grid-cols-[1fr_1.1fr_1.25fr]';
  return (
    <div class="flex flex-col gap-6">
      <section aria-labelledby="fu-t" class="flex flex-col gap-1.5">
        <div class="mb-2.5 flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-[1_1_360px]">
            <h2 id="fu-t" class="text-[15px] font-bold">Funnel de procesamiento de audiencia</h2>
            <p class="mt-1.5 text-[13px] text-ink-muted">De la audiencia total a los cuatro pilares: entregas efectivas, rebotes, listas de autosupresión y bloqueos preventivos.{depth < 3 && show2 ? ' Toca «Ver desglose» en un pilar para abrir su detalle.' : ''}</p>
          </div>
          <span class="flex items-center gap-2.5">
            <span class="text-[13px] font-semibold text-ink-muted">Mostrar</span>
            <Segmented label="Niveles del funnel a mostrar" value={depth} onChange={setDepth} options={DEPTHS} />
          </span>
        </div>
        <div ref={container} class={cx('relative', wide ? `grid ${columns} gap-x-10 gap-y-2` : 'flex flex-col gap-2')}>
          {wide && paths.length > 0 && (
            <svg aria-hidden="true" class="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
              {paths.map(path => (
                <g key={path.key} fill="none" stroke={`var(${path.color})`} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path class="funnel-draw" style={{ '--len': path.len, '--delay': `${first.current ? (path.column - 1) * STEP_MS + 120 : 0}ms` }} d={path.d} />
                  <path class="funnel-fade" style={{ '--delay': `${first.current ? (path.column - 1) * STEP_MS + 480 : 200}ms` }} d={path.tip} />
                  <circle class="funnel-fade" style={{ '--delay': `${first.current ? (path.column - 1) * STEP_MS + 120 : 0}ms` }} cx={path.x1} cy={path.y1} r="3" fill={`var(${path.color})`} stroke="none" />
                </g>
              ))}
            </svg>
          )}
          {wide && <>
            <span class={level} style={place(1, 1)}>Nivel 0: origen</span>
            <span class={level} style={place(2, 1)}>Nivel 1: procesamiento</span>
            {show2 && <span class={level} style={place(3, 1)}>Nivel 2: cuatro pilares</span>}
            {any3 && <span class={level} style={place(4, 1)}>Nivel 3: engagement y desgloses</span>}
          </>}

          <Box id="aud" refs={nodes} tone="border-chrome bg-chrome" class="funnel-enter justify-between p-3.5 text-white" style={place(1, '2 / span 4')}>
            <span class="flex flex-col gap-1.5">
              <Label icon="users" iconClass="text-white">Audiencia total</Label>
              <span class="text-[26px] leading-none font-extrabold">{fmtInt(r.base)}</span>
              <span class="text-xs leading-snug text-white/75">Todos los contactos seleccionados para la comunicación, antes de cualquier filtro.</span>
            </span>
            <span class="mt-3 flex justify-between gap-2 border-t border-white/20 pt-2 text-xs font-semibold"><span>Enviados y no enviados</span><span>100%</span></span>
          </Box>

          <Box id="env" refs={nodes} tone="border-ent bg-surface" class="funnel-enter justify-center" style={place(2, '2 / span 2')}>
            <span class="flex justify-between gap-2"><Label icon="send" iconClass="text-ent">Enviados</Label><b class="text-xs">{pct(sends, base)}</b></span>
            <Big>{fmtInt(sends)}</Big>
            <span class="mt-1 h-1 rounded-sm bg-surface-muted"><span class="block h-full rounded-sm bg-ent" style={{ width: `${(sends / base) * 100}%` }} /></span>
            <Note>Marketing Cloud intentó enviarles el correo.</Note>
          </Box>
          <Box id="nenv" refs={nodes} tone="border-line-strong bg-surface" class="funnel-enter" style={place(2, '4 / span 2')}>
            <span class="flex justify-between gap-2"><Label icon="funnel">No enviados</Label><b class="text-xs">{pct(notSent, base)}</b></span>
            <Big>{fmtInt(notSent)}</Big>
            <span class="mt-1 h-1 rounded-sm bg-surface-muted"><span class="block h-full rounded-sm bg-ink-muted" style={{ width: `${(notSent / base) * 100}%` }} /></span>
            <Note>Excluidos antes del envío.</Note>
            {/* Lado a lado si caben; si la caja es angosta, una debajo de otra (no se encima el texto). */}
            <span class="mt-1.5 grid grid-cols-[repeat(auto-fit,minmax(104px,1fr))] gap-1.5 text-[11.5px] font-semibold">
              <span class="flex min-w-0 flex-col rounded-lg bg-asl-soft px-2 py-1.5 text-asl-ink">Autosupresión<b class="text-[13px]">{fmtInt(detail.asl)}</b></span>
              <span class="flex min-w-0 flex-col rounded-lg bg-blq-soft px-2 py-1.5 text-blq-ink">Bloqueos<b class="text-[13px]">{fmtInt(detail.blq)}</b></span>
            </span>
          </Box>

          {show2 && <>
            <Box id="ent" refs={nodes} class="funnel-enter" style={place(3, 2)}>
              <Label icon={DESTINATION_ICONS.ent} iconClass="text-ent">Entregados</Label>
              <Big>{fmtInt(r.deliv)}</Big>
              <Note><b class="text-ink">{pct(r.deliv, sends)}</b> de enviados. Llegaron a la bandeja de entrada.</Note>
              {pillarToggle('ent', 'entregados')}
            </Box>
            {show3('ent') && (
              <Box id="eng" refs={nodes} class="funnel-enter" style={place(4, 2)}>
                <Label icon="mailOpen">Aperturas y clics</Label>
                <Mini rows={[['Tasa de apertura (OR)', pct(r.opens, r.deliv)], ['Aperturas únicas', fmtInt(r.opens)], ['Aperturas totales', fmtInt(r.opensCum)],
                  ['CTOR', pct(r.clicks, r.opens)], ['Clics únicos', fmtInt(r.clicks)], ['Clics totales', fmtInt(r.clicksCum)]]} />
              </Box>
            )}

            <Box id="reb" refs={nodes} class="funnel-enter" style={place(3, 3)}>
              <Label icon={DESTINATION_ICONS.reb} iconClass="text-reb">Rebotes</Label>
              <Big>{fmtInt(r.bounces)}</Big>
              <Note><b class="text-ink">{pct(r.bounces, sends, 2)}</b> de enviados. No se pudieron entregar.</Note>
              {pillarToggle('reb', 'rebotes')}
            </Box>
            {show3('reb') && (
              <Box id="dreb" refs={nodes} class="funnel-enter" style={place(4, 3)}>
                <Label icon={DESTINATION_ICONS.reb}>Desglose de rebotes</Label>
                <Mini rows={[['Hard', fmtInt(r.hard)], ['Soft', fmtInt(r.soft)], ['Desconocido', fmtInt(r.unknown)], ['Técnico', fmtInt(r.tech)], ['Bloqueo', fmtInt(r.block)]]} />
              </Box>
            )}

            <Box id="asl" refs={nodes} tone="border-transparent bg-asl-soft" class="funnel-enter" style={place(3, 4)}>
              <Label icon={DESTINATION_ICONS.asl} iconClass="text-asl" class="text-asl-ink">Listas de autosupresión</Label>
              <Big>{fmtInt(detail.asl)}</Big>
              <Note><b class="text-ink">{pct(detail.asl, notSent)}</b> de no enviados. Reglas del CRM que excluyen a propósito.</Note>
              {pillarToggle('asl', 'autosupresión')}
            </Box>
            {show3('asl') && (
              <Box id="dasl" refs={nodes} class="funnel-enter" style={place(4, 4)}>
                <Label icon={DESTINATION_ICONS.asl}>Desglose de autosupresión</Label>
                <Mini rows={topOf(detail.motives, 'asl', detail.asl, 'Otras listas')} />
              </Box>
            )}

            <Box id="blq" refs={nodes} tone="border-transparent bg-blq-soft" class="funnel-enter" style={place(3, 5)}>
              <Label icon={DESTINATION_ICONS.blq} iconClass="text-blq" class="text-blq-ink">Bloqueos preventivos</Label>
              <Big>{fmtInt(detail.blq)}</Big>
              <Note><b class="text-ink">{pct(detail.blq, notSent)}</b> de no enviados. Marketing Cloud no intenta entregar: bajas, retenidos y similares.</Note>
              {pillarToggle('blq', 'bloqueos')}
            </Box>
            {show3('blq') && (
              <Box id="dblq" refs={nodes} class="funnel-enter" style={place(4, 5)}>
                <Label icon={DESTINATION_ICONS.blq}>Desglose de bloqueos</Label>
                <Mini rows={topOf(detail.motives, 'blq', detail.blq, 'Otros')} />
              </Box>
            )}
          </>}
        </div>
      </section>
      <MotivesTable detail={detail} />
    </div>
  );
}
