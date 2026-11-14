// Pestaña Funnel (la que abre por defecto): el «Funnel de procesamiento de audiencia» del reporte original, en pequeño.
// Cuatro niveles (origen, procesamiento, cuatro pilares, engagement y desgloses) unidos por conectores en escuadra del
// color del destino, y debajo la tabla de motivos del reporte original, agrupada por origen. Sirve de puente para quien venía de esa pantalla.
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { cx, fmtInt, fmtPct } from '@/lib/format.mjs';

// Qué caja se une con cuál (de izquierda a derecha) y el color de cada flecha: el del destino.
const LINKS = [
  ['aud', 'env', '--color-ent'], ['aud', 'nenv', '--color-line-strong'],
  ['env', 'ent', '--color-ent'], ['env', 'reb', '--color-reb'],
  ['nenv', 'asl', '--color-asl'], ['nenv', 'blq', '--color-blq'],
  ['ent', 'eng', '--color-ent'], ['reb', 'dreb', '--color-reb'], ['asl', 'dasl', '--color-asl'], ['blq', 'dblq', '--color-blq']
];
// Debajo de este ancho los niveles se apilan y las flechas no se dibujan.
const WIDE = 900;

/** Flechas medidas sobre las cajas reales: siempre apuntan al centro aunque una caja crezca. */
function useArrows(container, nodes) {
  const [state, setState] = useState({ wide: true, paths: [] });
  useLayoutEffect(() => {
    const box = container.current;
    if (!box) return undefined;
    const measure = () => {
      const outer = box.getBoundingClientRect();
      const wide = outer.width >= WIDE;
      const paths = wide ? LINKS.map(([from, to, color]) => {
        const a = nodes.current[from]?.getBoundingClientRect();
        const b = nodes.current[to]?.getBoundingClientRect();
        if (!a || !b) return null;
        // Conector en escuadra: sale del borde, baja o sube por el medio del espacio entre columnas (esquinas
        // redondeadas) y entra recto a la caja. Sin curvas que se crucen.
        const x1 = Math.round(a.right - outer.left);
        const y1 = Math.round(a.top + a.height / 2 - outer.top);
        const x2 = Math.round(b.left - outer.left - 3);
        const y2 = Math.round(b.top + b.height / 2 - outer.top);
        const mid = Math.round((x1 + x2) / 2);
        const dy = y2 - y1;
        const radius = Math.min(10, Math.abs(dy) / 2, (x2 - x1) / 4);
        const turn = Math.sign(dy) * radius;
        const d = Math.abs(dy) < 2
          ? `M${x1},${y1} H${x2}`
          : `M${x1},${y1} H${mid - radius} Q${mid},${y1} ${mid},${y1 + turn} V${y2 - turn} Q${mid},${y2} ${mid + radius},${y2} H${x2}`;
        return { key: `${from}-${to}`, color, x1, y1, d, tip: `M${x2 - 6},${y2 - 5} L${x2},${y2} L${x2 - 6},${y2 + 5}` };
      }).filter(Boolean) : [];
      setState({ wide, paths });
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(box);
    return () => observer?.disconnect();
  }, []);
  return state;
}

/** Caja del funnel. tone: borde y fondo (por defecto, borde gris sobre blanco); va aparte para que no choquen clases. */
function Box({ id, refs, tone = 'border-line bg-surface', class: className = '', style, children }) {
  return <div ref={element => { refs.current[id] = element; }} class={cx('flex flex-col gap-1 rounded-[10px] border px-3 py-2.5', tone, className)} style={style}>{children}</div>;
}

const Label = ({ dot, children, class: className = '' }) => (
  <span class={cx('flex items-center gap-2 text-[13px] font-semibold', className)}>{dot && <span class={cx('size-[9px] flex-none rounded-[3px]', dot)} />}{children}</span>
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
  ['asl', 'Autosupresión (CRM)', 'bg-asl', 'Listas del CRM que excluyen a propósito.'],
  ['blq', 'Bloqueo preventivo (Marketing Cloud)', 'bg-blq', 'Estados en los que Marketing Cloud no intenta entregar.']
];
const SORTS = {
  name: (a, b) => a.name.localeCompare(b.name, 'es'),
  count: (a, b) => b.count - a.count
};

// Filas visibles de entrada en cada grupo: el resto con «Ver los N».
const FIRST_ROWS = 6;

/** Tabla de motivos agrupada por origen (cada grupo con su subtotal) y ordenada dentro de cada grupo. */
function MotivesTable({ detail }) {
  const [sort, setSort] = useState('count');
  const [open, setOpen] = useState({});
  const base = detail.record.base || 1;
  const notSent = detail.record.notSent || 1;
  const groups = ORIGINS.map(([origin, label, swatch, note]) => {
    const list = detail.motives.filter(motive => motive.origin === origin).sort(SORTS[sort]);
    return { origin, label, swatch, note, list, total: list.reduce((sum, motive) => sum + motive.count, 0) };
  }).filter(group => group.list.length).sort((a, b) => b.total - a.total);
  const header = (key, label, className = '') => (
    <th scope="col" aria-sort={sort === key ? (key === 'name' ? 'ascending' : 'descending') : undefined} class={cx('px-2.5 py-2 font-semibold', className)}>
      <button type="button" onClick={() => setSort(key)} class={cx('hover:text-ink', sort === key && 'text-ink')}>{label}</button>
    </th>
  );
  return (
    <section aria-labelledby="mt-t" class="section-rule">
      <div>
        <h2 id="mt-t" class="text-[15px] font-bold">Mapeo de motivos de caída</h2>
        <p class="mt-0.5 text-[12.5px] text-ink-muted">
          Cada lista de autosupresión y cada estado de Marketing Cloud que dejó personas sin envío, agrupados por origen y de mayor a menor. Toca un encabezado para ordenar.
        </p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[860px] border-collapse text-[13px]">
          <thead>
            <tr class="text-left text-xs text-ink-muted">
              {header('name', 'Columna o motivo de caída', 'pl-0')}
              {header('count', 'Volumen caído', 'text-right')}
              <th scope="col" class="px-2.5 py-2 text-right font-semibold">% sobre caídas</th>
              <th scope="col" class="px-2.5 py-2 text-right font-semibold">% audiencia total</th>
              <th scope="col" class="py-2 pl-2.5 font-semibold">Descripción</th>
            </tr>
          </thead>
          {groups.map(group => {
            const all = open[group.origin];
            const rows = all ? group.list : group.list.slice(0, FIRST_ROWS);
            return (
              <tbody key={group.origin}>
                <tr class="border-t border-line-strong bg-surface-muted">
                  <th scope="rowgroup" class="py-2.5 pr-2.5 pl-2.5 text-left">
                    <span class="flex items-center gap-2 font-bold"><span class={cx('size-2.5 flex-none rounded-[3px]', group.swatch)} />{group.label}</span>
                  </th>
                  <td class="px-2.5 py-2.5 text-right font-bold">{fmtInt(group.total)}</td>
                  <td class="px-2.5 py-2.5 text-right font-semibold">{fmtPct(group.total / notSent, 2)}</td>
                  <td class="px-2.5 py-2.5 text-right font-semibold text-ink-muted">{fmtPct(group.total / base, 2)}</td>
                  <td class="py-2.5 pl-2.5 text-xs text-ink-muted">{group.note}</td>
                </tr>
                {rows.map(motive => (
                  <tr key={motive.code} class="border-t border-line align-top">
                    <td class="py-2.5 pr-2.5 pl-[30px]"><span class="flex flex-col"><b class="font-semibold">{motive.name}</b><span class="text-[11.5px] text-ink-muted">{motive.code}</span></span></td>
                    <td class="px-2.5 py-2.5 text-right font-bold">{fmtInt(motive.count)}</td>
                    <td class="px-2.5 py-2.5 text-right">{fmtPct(motive.share, 2)}</td>
                    <td class="px-2.5 py-2.5 text-right text-ink-muted">{fmtPct(motive.count / base, 2)}</td>
                    <td class="max-w-[360px] py-2.5 pl-2.5 text-ink-muted">{motive.description || '—'}</td>
                  </tr>
                ))}
                {group.list.length > FIRST_ROWS && (
                  <tr class="border-t border-line">
                    <td colSpan={5} class="py-2 pl-[30px]">
                      <button type="button" onClick={() => setOpen({ ...open, [group.origin]: !all })} class="text-[13px] font-semibold text-brand-text hover:underline">
                        {all ? `Ver solo los ${FIRST_ROWS} principales` : `Ver los ${group.list.length} motivos de ${group.origin === 'blq' ? 'bloqueo' : 'autosupresión'}`}
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

export function FunnelTab({ detail }) {
  const container = useRef(null);
  const nodes = useRef({});
  const { wide, paths } = useArrows(container, nodes);
  const r = detail.record;
  const base = r.base || 1;
  const sends = r.sends || 0;
  const notSent = r.notSent || 0;
  const pct = (value, total, digits) => fmtPct(total ? value / total : null, digits);
  const level = 'text-[12.5px] font-semibold text-ink-muted';
  const place = (column, row) => (wide ? { gridColumn: column, gridRow: row } : undefined);
  return (
    <div class="flex flex-col gap-6">
      <section aria-labelledby="fu-t" class="flex flex-col gap-1.5">
        <h2 id="fu-t" class="text-[15px] font-bold">Funnel de procesamiento de audiencia</h2>
        <p class="mb-2.5 text-[13px] text-ink-muted">De la audiencia total a los cuatro pilares: entregas efectivas, rebotes, listas de autosupresión y bloqueos preventivos.</p>
        <div ref={container} class={cx('relative', wide ? 'grid grid-cols-[1fr_1.05fr_1.05fr_1.15fr] gap-x-10 gap-y-2' : 'flex flex-col gap-2')}>
          {wide && paths.length > 0 && (
            <svg aria-hidden="true" class="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
              {paths.map(path => (
                <g key={path.key} fill="none" stroke={`var(${path.color})`} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d={path.d} />
                  <path d={path.tip} />
                  <circle cx={path.x1} cy={path.y1} r="3" fill={`var(${path.color})`} stroke="none" />
                </g>
              ))}
            </svg>
          )}
          {wide && <>
            <span class={level} style={place(1, 1)}>Nivel 0: origen</span>
            <span class={level} style={place(2, 1)}>Nivel 1: procesamiento</span>
            <span class={level} style={place(3, 1)}>Nivel 2: cuatro pilares</span>
            <span class={level} style={place(4, 1)}>Nivel 3: engagement y desgloses</span>
          </>}

          <Box id="aud" refs={nodes} tone="border-chrome bg-chrome" class="justify-between p-3.5 text-white" style={place(1, '2 / span 4')}>
            <span class="flex flex-col gap-1.5">
              <Label>Audiencia total</Label>
              <span class="text-[26px] leading-none font-extrabold">{fmtInt(r.base)}</span>
              <span class="text-xs leading-snug text-white/75">Todos los contactos seleccionados para la comunicación, antes de cualquier filtro.</span>
            </span>
            <span class="mt-3 flex justify-between gap-2 border-t border-white/20 pt-2 text-xs font-semibold"><span>Enviados y no enviados</span><span>100%</span></span>
          </Box>

          <Box id="env" refs={nodes} tone="border-ent bg-surface" class="justify-center" style={place(2, '2 / span 2')}>
            <span class="flex justify-between gap-2"><Label dot="bg-ent">Enviados</Label><b class="text-xs">{pct(sends, base)}</b></span>
            <Big>{fmtInt(sends)}</Big>
            <span class="mt-1 h-1 rounded-sm bg-surface-muted"><span class="block h-full rounded-sm bg-ent" style={{ width: `${(sends / base) * 100}%` }} /></span>
            <Note>Marketing Cloud intentó enviarles el correo.</Note>
          </Box>
          <Box id="nenv" refs={nodes} tone="border-line-strong bg-surface" style={place(2, '4 / span 2')}>
            <span class="flex justify-between gap-2"><Label dot="bg-ink-muted">No enviados</Label><b class="text-xs">{pct(notSent, base)}</b></span>
            <Big>{fmtInt(notSent)}</Big>
            <span class="mt-1 h-1 rounded-sm bg-surface-muted"><span class="block h-full rounded-sm bg-ink-muted" style={{ width: `${(notSent / base) * 100}%` }} /></span>
            <Note>Excluidos antes del envío.</Note>
            {/* Lado a lado si caben; si la caja es angosta, una debajo de otra (no se encima el texto). */}
            <span class="mt-1.5 grid grid-cols-[repeat(auto-fit,minmax(104px,1fr))] gap-1.5 text-[11.5px] font-semibold">
              <span class="flex min-w-0 flex-col rounded-lg bg-asl-soft px-2 py-1.5 text-asl-ink">Autosupresión<b class="text-[13px]">{fmtInt(detail.asl)}</b></span>
              <span class="flex min-w-0 flex-col rounded-lg bg-blq-soft px-2 py-1.5 text-blq-ink">Bloqueos<b class="text-[13px]">{fmtInt(detail.blq)}</b></span>
            </span>
          </Box>

          <Box id="ent" refs={nodes} style={place(3, 2)}>
            <Label dot="bg-ent">Entregados</Label>
            <Big>{fmtInt(r.deliv)}</Big>
            <Note><b class="text-ink">{pct(r.deliv, sends)}</b> de enviados. Llegaron a la bandeja de entrada.</Note>
          </Box>
          <Box id="eng" refs={nodes} style={place(4, 2)}>
            <Label>Aperturas y clics</Label>
            <Mini rows={[['Tasa de apertura (OR)', pct(r.opens, r.deliv)], ['Aperturas únicas', fmtInt(r.opens)], ['Aperturas totales', fmtInt(r.opensCum)],
              ['CTOR', pct(r.clicks, r.opens)], ['Clics únicos', fmtInt(r.clicks)], ['Clics totales', fmtInt(r.clicksCum)]]} />
          </Box>

          <Box id="reb" refs={nodes} style={place(3, 3)}>
            <Label dot="bg-reb">Rebotes</Label>
            <Big>{fmtInt(r.bounces)}</Big>
            <Note><b class="text-ink">{pct(r.bounces, sends, 2)}</b> de enviados. No se pudieron entregar.</Note>
          </Box>
          <Box id="dreb" refs={nodes} style={place(4, 3)}>
            <Label>Desglose de rebotes</Label>
            <Mini rows={[['Hard', fmtInt(r.hard)], ['Soft', fmtInt(r.soft)], ['Desconocido', fmtInt(r.unknown)], ['Técnico', fmtInt(r.tech)], ['Bloqueo', fmtInt(r.block)]]} />
          </Box>

          <Box id="asl" refs={nodes} tone="border-transparent bg-asl-soft" style={place(3, 4)}>
            <Label dot="bg-asl" class="text-asl-ink">Listas de autosupresión</Label>
            <Big>{fmtInt(detail.asl)}</Big>
            <Note><b class="text-ink">{pct(detail.asl, notSent)}</b> de no enviados. Reglas del CRM que excluyen a propósito.</Note>
          </Box>
          <Box id="dasl" refs={nodes} style={place(4, 4)}>
            <Label>Desglose de autosupresión</Label>
            <Mini rows={topOf(detail.motives, 'asl', detail.asl, 'Otras listas')} />
          </Box>

          <Box id="blq" refs={nodes} tone="border-transparent bg-blq-soft" style={place(3, 5)}>
            <Label dot="bg-blq" class="text-blq-ink">Bloqueos preventivos</Label>
            <Big>{fmtInt(detail.blq)}</Big>
            <Note><b class="text-ink">{pct(detail.blq, notSent)}</b> de no enviados. Marketing Cloud no intenta entregar: bajas, retenidos y similares.</Note>
          </Box>
          <Box id="dblq" refs={nodes} style={place(4, 5)}>
            <Label>Desglose de bloqueos</Label>
            <Mini rows={topOf(detail.motives, 'blq', detail.blq, 'Otros')} />
          </Box>
        </div>
      </section>
      <MotivesTable detail={detail} />
    </div>
  );
}
