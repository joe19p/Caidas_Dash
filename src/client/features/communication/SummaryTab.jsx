// Pestaña Resumen de una comunicación: indicadores contra lo normal, «de cada 100 personas», por qué no se envió,
// entrega e interacción.
import { useState } from 'preact/hooks';
import { cx, fmtInt, fmtPct, fmtPts, largestRemainder } from '@/lib/format.mjs';
import { Panel } from '@/ui/Panel.jsx';
import { deltaTone } from '@/ui/Delta.jsx';

const GROUPS = [
  ['abr', 'Abren', 'bg-ent'],
  ['ent', 'Reciben y no abren', 'bg-ent-2'],
  ['reb', 'Rebotan', 'bg-reb'],
  ['blq', 'Bloqueo preventivo', 'bg-blq'],
  ['asl', 'Autosupresión', 'bg-asl']
];

function Kpi({ label, value, delta, better, note }) {
  const tone = delta == null ? 'text-ink-muted' : deltaTone(delta, better);
  const text = delta == null ? note : Math.abs(delta) < 0.0005 ? 'Igual a lo normal' : `${delta > 0 ? '▲' : '▼'} ${fmtPts(Math.abs(delta)).replace('+', '')} vs lo normal`;
  return (
    <div class="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface px-3.5 py-3">
      <span class="text-[12.5px] font-semibold text-ink-muted">{label}</span>
      <b class="text-[22px] leading-none font-bold">{value}</b>
      <span class={cx('text-xs font-semibold', tone)}>{text}</span>
    </div>
  );
}

function Waffle({ detail }) {
  const [focus, setFocus] = useState(null);
  const record = detail.record;
  const people = { abr: record.opens, ent: Math.max(0, record.deliv - record.opens), reb: record.bounces, blq: detail.blq, asl: detail.asl };
  const counts = largestRemainder(GROUPS.map(([key]) => people[key]));
  const normal = largestRemainder(GROUPS.map(([key]) => detail.normal.per100[key]));
  const cells = GROUPS.flatMap(([key, , color], index) => Array.from({ length: counts[index] }, () => [key, color]));
  return (
    <Panel id="w" title={`De cada 100 personas de esta comunicación, ${counts[0] === 1 ? '1 abre' : `${counts[0]} abren`}`}>
      <div class="flex flex-wrap items-start gap-7">
        <div role="img" aria-label={GROUPS.map(([, label], index) => `${counts[index]} ${label.toLowerCase()}`).join(', ')}
          class="grid flex-none grid-cols-[repeat(10,24px)] gap-1.5">
          {cells.map(([key, color], index) => (
            <span key={index} onMouseEnter={() => setFocus(key)} onMouseLeave={() => setFocus(null)}
              class={cx('size-6 rounded-md transition-opacity', color, focus && focus !== key && 'opacity-20')} />
          ))}
        </div>
        <div role="table" aria-label="Destino de la audiencia de esta comunicación" class="flex min-w-0 flex-[1_1_420px] flex-col text-[13px]">
          <div role="row" class="grid grid-cols-[minmax(0,1fr)_80px_90px_110px] gap-3 border-b border-line px-2.5 pb-2 text-xs font-semibold text-ink-muted">
            <span role="columnheader">Destino</span>
            <span role="columnheader" class="text-right">De cada 100</span>
            <span role="columnheader" class="text-right">Lo normal</span>
            <span role="columnheader" class="text-right">Personas</span>
          </div>
          {GROUPS.map(([key, label, color], index) => (
            <div key={key} role="row" onMouseEnter={() => setFocus(key)} onMouseLeave={() => setFocus(null)}
              class={cx('grid grid-cols-[minmax(0,1fr)_80px_90px_110px] items-center gap-3 border-b border-line p-2.5 transition-opacity',
                focus === key && 'bg-surface-muted', focus && focus !== key && 'opacity-45')}>
              <span role="cell" class="flex min-w-0 items-center gap-2.5 font-semibold"><span class={cx('size-2.5 flex-none rounded-[3px]', color)} /><span class="truncate">{label}</span></span>
              <b role="cell" class="text-right">{counts[index]}</b>
              <span role="cell" class="text-right text-ink-muted">{normal[index]}</span>
              <span role="cell" class="text-right text-ink-muted">{fmtInt(people[key])}</span>
            </div>
          ))}
          <p class="mt-3 px-2.5 text-xs text-ink-muted">
            Cada cuadro es 1 % de la audiencia de esta comunicación ({fmtInt(record.base / 100)} personas). «Lo normal» es el promedio de los últimos 3 meses cerrados.
          </p>
        </div>
      </div>
    </Panel>
  );
}

function Motives({ detail, onAll }) {
  const top = detail.motives.slice(0, 8);
  const scale = Math.max(0.6, Math.ceil(Math.max(...top.map(motive => Math.max(motive.share, motive.normal)), 0) * 10) / 10);
  return (
    <Panel id="m" title="Por qué no se envió"
      actions={detail.motives.length > 8 && <button type="button" onClick={onAll} class="text-[13px] font-semibold text-brand-text hover:underline">Ver los {detail.motives.length} motivos →</button>}>
      {top.length ? (
        <div class="flex flex-col gap-2.5">
          {top.map(motive => {
            const diff = motive.share - motive.normal;
            return (
              <div key={motive.code} class="grid grid-cols-[minmax(0,1fr)_56px_76px] items-center gap-x-2.5 gap-y-1">
                <span class="truncate text-[13px] font-semibold" title={`${motive.code}${motive.description ? ` · ${motive.description}` : ''}`}>{motive.name}</span>
                <b class="text-right text-[13px]">{fmtPct(motive.share)}</b>
                <span class={cx('text-right text-xs font-semibold', Math.abs(diff) < 0.01 ? 'text-ink-muted' : diff > 0 ? 'text-danger' : 'text-success')}>{fmtPts(diff)}</span>
                <span class="relative h-2 rounded bg-surface-muted">
                  <span class={cx('absolute inset-y-0 left-0 rounded', motive.origin === 'blq' ? 'bg-blq' : 'bg-asl')} style={{ width: `${(motive.share / scale) * 100}%` }} />
                  <span title="Lo normal" class="absolute -inset-y-[3px] w-0.5 rounded-sm bg-ink" style={{ left: `${(motive.normal / scale) * 100}%` }} />
                </span>
                <span class="col-span-2 text-right text-xs text-ink-muted">{fmtInt(motive.count)}</span>
              </div>
            );
          })}
        </div>
      ) : <p class="text-[13px] text-ink-muted">Esta comunicación se envió a toda su base.</p>}
      <div class="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-2.5 text-xs text-ink-muted">
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

export function SummaryTab({ detail, onAllMotives }) {
  const record = detail.record;
  const rates = detail.rates;
  const normal = detail.normal.rates;
  const diff = key => (rates[key] == null || normal[key] == null ? null : rates[key] - normal[key]);
  const bounceParts = [['Hard', record.hard], ['Soft', record.soft], ['Otros', Math.max(0, record.bounces - record.hard - record.soft)]];
  return (
    <div class="flex flex-col gap-4">
      <div class="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
        <Kpi label="Audiencia" value={fmtInt(record.base)} note="Base antes de exclusiones" />
        <Kpi label="No enviados" value={fmtPct(rates.drop)} delta={diff('drop')} better="down" />
        <Kpi label="Enviados" value={fmtInt(record.sends)} note={`${fmtPct(record.base ? record.sends / record.base : null)} de la audiencia`} />
        <Kpi label="Entrega" value={fmtPct(rates.deliv)} delta={diff('deliv')} better="up" />
        <Kpi label="Apertura" value={fmtPct(rates.or)} delta={diff('or')} better="up" />
        <Kpi label="CTOR" value={fmtPct(rates.ctor)} delta={diff('ctor')} better="up" />
      </div>
      <Waffle detail={detail} />
      <div class="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] items-start gap-4">
        <Motives detail={detail} onAll={onAllMotives} />
        <div class="flex flex-col gap-4">
          <Panel id="e" title="Entrega">
            <div class="grid grid-cols-[minmax(0,1fr)_auto_140px] items-baseline gap-x-4 gap-y-2 text-[13px]">
              <Row label="Enviados" value={fmtInt(record.sends)} note={`${fmtPct(record.base ? record.sends / record.base : null)} de la audiencia`} />
              <Row label="Entregados" strong swatch="bg-ent" value={fmtInt(record.deliv)} note={`${fmtPct(rates.deliv)} de enviados`} noteClass="font-bold text-success" />
              <Row label="Rebotes" strong swatch="bg-reb" value={fmtInt(record.bounces)} note={`${fmtPct(rates.bounce, 2)} de enviados`} />
            </div>
            <span class="border-t border-line pt-1.5 text-xs font-semibold text-ink-muted">Tipo de rebote</span>
            <div class="flex h-3 gap-0.5" aria-hidden="true">
              {bounceParts.map(([name, value], index) => (
                <span key={name} class={cx('bg-reb', index === 0 ? 'rounded-l' : '', index === 2 ? 'flex-1 rounded-r opacity-30' : index === 1 ? 'opacity-60' : '')}
                  style={index < 2 ? { width: `${record.bounces ? (value / record.bounces) * 100 : 0}%` } : undefined} />
              ))}
            </div>
            <div class="flex flex-wrap gap-x-4.5 gap-y-1 text-[12.5px] text-ink-muted">
              {bounceParts.map(([name, value]) => <span key={name}>{name} <b class="text-ink">{fmtInt(value)}</b></span>)}
            </div>
          </Panel>
          <Panel id="i" title="Interacción">
            <div class="grid grid-cols-[minmax(0,1fr)_auto_140px] items-baseline gap-x-4 gap-y-2 text-[13px]">
              <Row label="Aperturas únicas" value={fmtInt(record.opens)} note={`${fmtPct(rates.or)} de entregados`} />
              <Row label="Aperturas totales" value={fmtInt(record.opensCum)} note={record.opens ? `${(record.opensCum / record.opens).toFixed(1)} por persona` : '—'} />
              <Row label="Clics únicos" value={fmtInt(record.clicks)} note={`CTOR ${fmtPct(rates.ctor, 2)}`} />
              <Row label="Bajas en este envío" value={fmtInt(record.unsubs)} note={`${fmtPct(rates.unsub, 2)} de entregados`} />
              <Row label="Quejas (spam)" value={fmtInt(record.complaints)} note={record.deliv ? `${fmtPct(record.complaints / record.deliv, 3)} de entregados` : '—'} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
