// Pestaña Resumen de una comunicación: indicadores contra lo normal y dos filas: «de cada 100 personas» con la entrega
// (anillo y tabla), y por qué no se envió (una línea por motivo) con la interacción (cada tasa contra lo normal y tabla).
import { useState } from 'preact/hooks';
import { cx, fmtInt, fmtPct, fmtPts, largestRemainder } from '@/lib/format.mjs';
import { Panel } from '@/ui/Panel.jsx';
import { MetricIcon } from '@/ui/MetricIcon.jsx';
import { Trend } from '@/ui/Trend.jsx';
import { Icon } from '@/ui/Icon.jsx';
import { motiveIcon } from '@/lib/icons.mjs';
import { deltaTone } from '@/ui/Delta.jsx';
import { SortHeader, useSort } from '@/ui/SortHeader.jsx';

const GROUPS = [
  ['abr', 'Abren', 'bg-ent'],
  ['ent', 'Reciben y no abren', 'bg-ent-2'],
  ['reb', 'Rebotan', 'bg-reb'],
  ['blq', 'Bloqueo preventivo', 'bg-blq'],
  ['asl', 'Autosupresión', 'bg-asl']
];

function Kpi({ label, value, delta, better, note, order = 0, metric }) {
  const tone = delta == null ? 'text-ink-muted' : deltaTone(delta, better);
  const same = delta != null && Math.abs(delta) < 0.0005;
  const text = delta == null ? note : same ? 'Igual a lo normal' : `${fmtPts(Math.abs(delta)).replace('+', '')} vs lo normal`;
  return (
    <div class="anim-rise flex flex-col gap-1.5 border-l-2 border-line-strong py-1 pl-3.5" style={{ '--delay': `${order * 35}ms` }}>
      <span class="flex items-center gap-2 text-[12.5px] font-semibold text-ink-muted"><MetricIcon metric={metric} size="size-8" iconSize={18} />{label}</span>
      <b class="text-[22px] leading-none font-bold">{value}</b>
      <Trend delta={delta == null || same ? null : delta} class={cx('text-xs font-semibold', tone)}>{text}</Trend>
    </div>
  );
}

// Columnas justas para su contenido: la tabla queda pegada a la cuadrícula, sin espacio de sobra en «Destino».
const DEST_COLS = 'grid grid-cols-[minmax(0,1fr)_84px_72px_80px] items-center gap-2';

function Waffle({ detail, class: className }) {
  const [focus, setFocus] = useState(null);
  const record = detail.record;
  const people = { abr: record.opens, ent: Math.max(0, record.deliv - record.opens), reb: record.bounces, blq: detail.blq, asl: detail.asl };
  const counts = largestRemainder(GROUPS.map(([key]) => people[key]));
  const normal = largestRemainder(GROUPS.map(([key]) => detail.normal.per100[key]));
  const cells = GROUPS.flatMap(([key, , color], index) => Array.from({ length: counts[index] }, () => [key, color]));
  const [rows, sort, onSort] = useSort(GROUPS.map(([key, label, color], index) => ({ key, label, color, per100: counts[index], normal: normal[index], people: people[key] })),
    (row, column) => row[column], null);
  return (
    <Panel id="w" class={className} title={`De cada 100 personas de esta comunicación, ${counts[0] === 1 ? '1 abre' : `${counts[0]} abren`}`}>
      {/* Desde 44rem, la cuadrícula de 10×10 y la tabla lado a lado; más angosto, la cuadrícula en 20×5 arriba y la tabla
          debajo, las dos a lo ancho (así no queda espacio vacío al lado de la cuadrícula). */}
      <div class="@container"><div class="flex flex-col items-start gap-5 @[44rem]:flex-row @[44rem]:gap-6">
        {/* El mouse se escucha en toda la cuadrícula: pasar por el espacio entre dos cuadros del mismo grupo no lo suelta
            (antes cada cuadro tenía su entrada y salida, y el color parpadeaba al cruzar el espacio). */}
        <div role="img" aria-label={GROUPS.map(([, label], index) => `${counts[index]} ${label.toLowerCase()}`).join(', ')}
          onMouseOver={event => { const key = event.target.dataset?.group; if (key && key !== focus) setFocus(key); }}
          onMouseLeave={() => setFocus(null)}
          class="grid w-full max-w-[560px] flex-none grid-cols-[repeat(20,minmax(0,1fr))] gap-[5px] @[44rem]:w-auto @[44rem]:grid-cols-[repeat(10,20px)]">
          {cells.map(([key, color], index) => (
            <span key={index} data-group={key} style={{ '--delay': `${80 + index * 3}ms` }}
              class={cx('anim-pop aspect-square w-full rounded-md transition-opacity duration-150', color, focus && focus !== key && 'opacity-20')} />
          ))}
        </div>
        <div role="table" aria-label="Destino de la audiencia de esta comunicación" class="flex w-full max-w-[560px] min-w-0 flex-col text-[13px] @[44rem]:w-[430px]">
          <div role="row" class={cx(DEST_COLS, 'border-b border-line px-2.5 pb-2 text-xs font-semibold text-ink-muted')}>
            <SortHeader label="Destino" column="label" sort={sort} onSort={onSort} first={1} align="left" />
            <SortHeader label="De cada 100" column="per100" sort={sort} onSort={onSort} />
            <SortHeader label="Lo normal" column="normal" sort={sort} onSort={onSort} />
            <SortHeader label="Personas" column="people" sort={sort} onSort={onSort} />
          </div>
          {rows.map(row => (
            <div key={row.key} role="row" onMouseEnter={() => setFocus(row.key)} onMouseLeave={() => setFocus(null)}
              class={cx(DEST_COLS, 'border-b border-line p-2.5 transition-opacity', focus === row.key && 'bg-surface-muted', focus && focus !== row.key && 'opacity-45')}>
              <span role="cell" class="flex min-w-0 items-center gap-2.5 font-semibold"><span class={cx('size-2.5 flex-none rounded-[3px]', row.color)} /><span class="min-w-0 leading-tight">{row.label}</span></span>
              <b role="cell" class="text-right">{row.per100}</b>
              <span role="cell" class="text-right text-ink-muted">{row.normal}</span>
              <span role="cell" class="text-right text-ink-muted">{fmtInt(row.people)}</span>
            </div>
          ))}
          <p class="mt-3 px-2.5 text-xs text-ink-muted">
            Cada cuadro es 1 % de la audiencia de esta comunicación ({fmtInt(record.base / 100)} personas). «Lo normal» es el promedio de los últimos 3 meses cerrados.
          </p>
        </div>
      </div></div>
    </Panel>
  );
}

// Columnas de los motivos: nombre, barra, %, contra lo normal y personas. Angosto: la barra baja a su propia línea y
// las personas se ocultan.
const MOTIVE_COLS = 'grid grid-cols-[minmax(0,1fr)_56px_72px] items-center gap-x-3 @xl:grid-cols-[minmax(150px,220px)_minmax(0,1fr)_56px_72px_80px]';

const MOTIVE_VALUE = { name: motive => motive.name, share: motive => motive.share, diff: motive => motive.share - motive.normal, count: motive => motive.count };

function Motives({ detail, onAll, class: className }) {
  const top = detail.motives.slice(0, 8);
  const scale = Math.max(0.6, Math.ceil(Math.max(...top.map(motive => Math.max(motive.share, motive.normal)), 0) * 10) / 10);
  const [rows, sort, onSort] = useSort(top, (motive, column) => MOTIVE_VALUE[column](motive), null);
  return (
    <Panel id="m" class={className} title="Por qué no se envió"
      actions={detail.motives.length > 8 && <button type="button" onClick={onAll} class="text-[13px] font-semibold text-brand-text hover:underline">Ver los {detail.motives.length} motivos</button>}>
      {top.length ? (
        <div role="table" aria-label="Motivos con más peso en lo no enviado" class="@container text-[13px]">
          <div role="row" class={cx(MOTIVE_COLS, 'border-b border-line pb-2 text-xs font-semibold text-ink-muted')}>
            <SortHeader label="Motivo" column="name" sort={sort} onSort={onSort} first={1} align="left" />
            <SortHeader label="Peso en lo no enviado" column="share" sort={sort} onSort={onSort} align="left" class="hidden @xl:block" />
            <SortHeader label="%" column="share" sort={sort} onSort={onSort} />
            <SortHeader label="Vs lo normal" column="diff" sort={sort} onSort={onSort} />
            <SortHeader label="Personas" column="count" sort={sort} onSort={onSort} class="hidden @xl:block" />
          </div>
          {rows.map((motive, index) => {
            const diff = motive.share - motive.normal;
            const blq = motive.origin === 'blq';
            return (
              <div key={motive.code} role="row" class={cx(MOTIVE_COLS, 'gap-y-1.5 border-b border-line py-2.5')}>
                <span role="cell" class="flex min-w-0 items-center gap-2 font-semibold" title={`${motive.code}${motive.description ? `: ${motive.description}` : ''}`}>
                  <Icon name={motiveIcon(motive.code, motive.origin)} size={19} class={cx('flex-none', blq ? 'text-blq' : 'text-asl')} /><span class="truncate">{motive.name}</span>
                </span>
                <span role="cell" class="relative order-last col-span-3 h-3 rounded-md bg-surface-muted @xl:order-none @xl:col-span-1">
                  <span class={cx('anim-grow-x absolute inset-y-0 left-0 rounded-md', blq ? 'bg-blq' : 'bg-asl')}
                    style={{ width: `${(motive.share / scale) * 100}%`, '--delay': `${120 + index * 35}ms` }} />
                  <span title="Lo normal" class="absolute -inset-y-[3px] w-0.5 rounded-sm bg-ink" style={{ left: `${(motive.normal / scale) * 100}%` }} />
                </span>
                <b role="cell" class="text-right">{fmtPct(motive.share)}</b>
                <span role="cell" class={cx('text-right text-xs font-semibold', Math.abs(diff) < 0.01 ? 'text-ink-muted' : diff > 0 ? 'text-danger' : 'text-success')}>{fmtPts(diff)}</span>
                <span role="cell" class="hidden text-right text-ink-muted @xl:block">{fmtInt(motive.count)}</span>
              </div>
            );
          })}
        </div>
      ) : <p class="text-[13px] text-ink-muted">Esta comunicación se envió a toda su base.</p>}
      <div class="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-muted">
        <span class="flex items-center gap-1.5"><span class="size-[9px] rounded-[3px] bg-asl" />Autosupresión</span>
        <span class="flex items-center gap-1.5"><span class="size-[9px] rounded-[3px] bg-blq" />Bloqueo preventivo</span>
        <span class="flex items-center gap-1.5"><span class="h-3 w-0.5 bg-ink" />Lo normal</span>
      </div>
    </Panel>
  );
}

function Row({ label, value, note, strong, swatch, noteClass = 'text-ink-muted' }) {
  return (
    <>
      <span class={cx('flex items-center gap-2', strong ? 'font-semibold' : 'text-ink-muted')}>{swatch && <span class={cx('size-[9px] rounded-[3px]', swatch)} />}{label}</span>
      <b class="text-right">{value}</b>
      <span class={cx('text-right', noteClass)}>{note}</span>
    </>
  );
}

/** Anillo de lo enviado: entregados y cada tipo de rebote, con el % que llegó al centro. */
function DeliveryRing({ record }) {
  const size = 150, stroke = 18, r = (size - stroke) / 2, length = 2 * Math.PI * r;
  const other = Math.max(0, record.bounces - record.hard - record.soft);
  const parts = [['deliv', record.deliv, 1, 'var(--color-ent)'], ['hard', record.hard, 1, 'var(--color-reb)'], ['soft', record.soft, 0.6, 'var(--color-reb)'], ['other', other, 0.3, 'var(--color-reb)']];
  const total = record.sends || 1;
  const arrived = fmtPct(record.sends ? record.deliv / record.sends : null);
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" class="flex-none" aria-label={`Llegó el ${arrived} de lo enviado`}>
      {/* Entrada: una máscara que se dibuja en sentido horario desde arriba (anim-draw) descubre los tramos en orden. */}
      <mask id="delivery-ring-mask">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="white" stroke-width={stroke + 2} pathLength="1"
          class="anim-draw" style={{ '--delay': '120ms' }} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </mask>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-muted)" stroke-width={stroke} />
      <g mask="url(#delivery-ring-mask)">
        {parts.map(([key, value, opacity, color]) => {
          const arc = (value / total) * length;
          const start = offset;
          offset += arc;
          return value > 0 && (
            <circle key={key} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} stroke-opacity={opacity} stroke-width={stroke}
              stroke-dasharray={`${Math.max(arc - 1.5, 0.8)} ${length}`} stroke-dashoffset={-start} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          );
        })}
      </g>
      <g class="anim-fade" style={{ '--delay': '380ms' }}>
        <text x={size / 2} y={size / 2 + 2} text-anchor="middle" font-size="25" font-weight="800" fill="var(--color-ink)">{arrived}</text>
        <text x={size / 2} y={size / 2 + 20} text-anchor="middle" font-size="12" fill="var(--color-ink-muted)">llegó</text>
      </g>
    </svg>
  );
}

/** Fila del árbol de Entrega: lo de la izquierda se achica con la sangría; cifra y nota tienen ancho fijo para quedar en
 *  columna en todos los niveles. */
const TreeRow = ({ label, value, note }) => (
  <div class="grid grid-cols-[minmax(0,1fr)_84px_136px] items-center gap-3">
    <span class="min-w-0">{label}</span>
    <b class="text-right">{value}</b>
    <span class="text-right text-ink-muted">{note}</span>
  </div>
);

function Delivery({ record, rates, class: className }) {
  const other = Math.max(0, record.bounces - record.hard - record.soft);
  const share = value => fmtPct(record.sends ? value / record.sends : null, 2);
  const legend = [['Entregados', fmtPct(rates.deliv), 'bg-ent'], ['Rebote hard', share(record.hard), 'bg-reb'], ['Rebote soft', share(record.soft), 'bg-reb opacity-60'], ['Otros rebotes', share(other), 'bg-reb opacity-30']];
  return (
    <Panel id="e" class={className} title="Entrega">
      {/* Anillo con su leyenda, la tabla y el detalle de los rebotes, uno bajo otro: llenan la altura de «De cada 100 personas». */}
      <div class="flex flex-wrap items-center gap-x-8 gap-y-4">
        <DeliveryRing record={record} />
        <div class="flex min-w-0 flex-[1_1_180px] flex-col gap-2 text-[13px]">
          {legend.map(([label, value, color]) => (
            <span key={label} class="flex items-center justify-between gap-3">
              <span class="flex items-center gap-2 text-ink-muted"><span class={cx('size-[9px] flex-none rounded-[3px]', color)} />{label}</span>
              <b>{value}</b>
            </span>
          ))}
        </div>
      </div>
      {/* Árbol: enviados se abre en entregados y rebotes, y los rebotes en sus tipos. Cada nivel cuelga del de arriba con
          sangría y una línea a la izquierda; las cifras y los % quedan en las mismas columnas en todos los niveles. */}
      <div class="flex flex-col gap-2 border-t border-line pt-3 text-[13px]">
        <TreeRow label={<b>Enviados</b>} value={fmtInt(record.sends)} note={`${fmtPct(record.base ? record.sends / record.base : null)} de la audiencia`} />
        <div class="ml-[3px] flex flex-col gap-2 border-l-2 border-line-strong pl-4">
          <TreeRow label={<span class="flex items-center gap-2 font-semibold"><span class="size-[9px] flex-none rounded-[3px] bg-ent" />Entregados</span>}
            value={fmtInt(record.deliv)} note={<b class="text-success">{fmtPct(rates.deliv)} de enviados</b>} />
          <TreeRow label={<span class="flex items-center gap-2 font-semibold"><span class="size-[9px] flex-none rounded-[3px] bg-reb" />Rebotes</span>}
            value={fmtInt(record.bounces)} note={`${fmtPct(rates.bounce, 2)} de enviados`} />
          <div class="ml-[3px] flex flex-col gap-2 border-l-2 border-reb/50 pl-4">
            {[['Hard', record.hard, ''], ['Soft', record.soft, 'opacity-60'], ['Otros', other, 'opacity-30']].map(([name, value, opacity]) => (
              <TreeRow key={name} value={fmtInt(value)} note={`${fmtPct(record.bounces ? value / record.bounces : null, 0)} de rebotes`}
                label={<span class="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2">
                  <span class="text-ink-muted">{name}</span>
                  <span class="h-2.5 rounded-md bg-surface-muted">
                    <span class={cx('anim-grow-x block h-full rounded-md bg-reb', opacity)} style={{ width: `${record.bounces ? (value / record.bounces) * 100 : 0}%` }} />
                  </span>
                </span>} />
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

// [clave de la tasa, nombre, color, mejor hacia, decimales]. Cada barra tiene su propia escala: la mayor entre la
// tasa y lo normal llega al 75 % del ancho (las tasas van de 20 % a 0.01 %, no caben en una sola).
const ENGAGEMENT = [['or', 'Apertura', 'bg-ent', 'up', 1], ['ctor', 'CTOR', 'bg-ent-2', 'up', 2], ['unsub', 'Bajas', 'bg-asl', 'down', 2], ['complaint', 'Quejas', 'bg-reb', 'down', 3]];

function Interaction({ record, rates, normal, class: className }) {
  return (
    <Panel id="i" class={className} title="Interacción" subtitle="Cada tasa contra lo normal (la raya): la mediana de los últimos 3 meses cerrados.">
      <div class="flex flex-col gap-3.5">
        {ENGAGEMENT.map(([key, label, color, better, digits]) => {
          const value = rates[key];
          const usual = normal[key];
          const top = Math.max(value || 0, usual || 0) / 0.75 || 1;
          const delta = value == null || usual == null ? null : value - usual;
          return (
            <div key={key} class="flex flex-col gap-1.5">
              <span class="flex items-baseline justify-between gap-3 text-[13px]">
                <b>{label}</b>
                <span class="flex items-baseline gap-2">
                  <b>{fmtPct(value, digits)}</b>
                  {delta != null && <span class={cx('text-xs font-semibold', deltaTone(delta, better, Math.abs(usual || 0) * 0.02))}>{fmtPts(delta, digits)}</span>}
                </span>
              </span>
              <span class="relative h-3 rounded-md bg-surface-muted">
                <span class={cx('anim-grow-x absolute inset-y-0 left-0 rounded-md', color)} style={{ width: `${((value || 0) / top) * 100}%` }} />
                {usual != null && <span title={`Lo normal: ${fmtPct(usual, digits)}`} class="absolute -inset-y-[3px] w-0.5 rounded-sm bg-ink" style={{ left: `${(usual / top) * 100}%` }} />}
              </span>
            </div>
          );
        })}
      </div>
      <p class="text-xs text-ink-muted">Verde, mejor que lo normal; rojo, peor.</p>
      <div class="grid max-w-[560px] grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-4 gap-y-2 border-t border-line pt-3 text-[13px]">
        <Row label="Aperturas únicas" value={fmtInt(record.opens)} note={`${fmtPct(rates.or)} de entregados`} />
        <Row label="Aperturas totales" value={fmtInt(record.opensCum)} note={record.opens ? `${(record.opensCum / record.opens).toFixed(1)} por persona` : '—'} />
        <Row label="Clics únicos" value={fmtInt(record.clicks)} note={`CTOR ${fmtPct(rates.ctor, 2)}`} />
        <Row label="Bajas en este envío" value={fmtInt(record.unsubs)} note={`${fmtPct(rates.unsub, 2)} de entregados`} />
        <Row label="Quejas (spam)" value={fmtInt(record.complaints)} note={record.deliv ? `${fmtPct(record.complaints / record.deliv, 3)} de entregados` : '—'} />
      </div>
    </Panel>
  );
}

// Columna de la derecha: a lo ancho, una línea a su izquierda la separa de la otra.
const SIDE = '@5xl:border-l @5xl:pl-8';

export function SummaryTab({ detail, onAllMotives }) {
  const record = detail.record;
  const rates = detail.rates;
  const normal = detail.normal.rates;
  const diff = key => (rates[key] == null || normal[key] == null ? null : rates[key] - normal[key]);
  return (
    <div class="@container flex flex-col gap-5">
      {/* 6, 3 o 2 por fila según el ancho del bloque: nunca uno solo en la última fila. */}
      <div class="grid grid-cols-2 gap-x-2.5 gap-y-4 @lg:grid-cols-3 @4xl:grid-cols-6">
        <Kpi order={0} metric="audience" label="Audiencia" value={fmtInt(record.base)} note="Base antes de exclusiones" />
        <Kpi order={1} metric="drop" label="No enviados" value={fmtPct(rates.drop)} delta={diff('drop')} better="down" />
        <Kpi order={2} metric="sends" label="Enviados" value={fmtInt(record.sends)} note={`${fmtPct(record.base ? record.sends / record.base : null)} de la audiencia`} />
        <Kpi order={3} metric="deliv" label="Entrega" value={fmtPct(rates.deliv)} delta={diff('deliv')} better="up" />
        <Kpi order={4} metric="or" label="Apertura" value={fmtPct(rates.or)} delta={diff('or')} better="up" />
        <Kpi order={5} metric="ctor" label="CTOR" value={fmtPct(rates.ctor)} delta={diff('ctor')} better="up" />
      </div>
      {/* Cuatro partes iguales (2×2): a lo ancho, una línea vertical separa las dos columnas y queda alineada en las dos
          filas; en pantallas angostas, todo apilado con su línea arriba. */}
      <div class="grid gap-y-5 @5xl:grid-cols-2">
        <Waffle detail={detail} class="@5xl:pr-8" />
        <Delivery record={record} rates={rates} class={SIDE} />
        <Motives detail={detail} onAll={onAllMotives} class="@5xl:pr-8" />
        <Interaction record={record} rates={rates} normal={normal} class={SIDE} />
      </div>
    </div>
  );
}
