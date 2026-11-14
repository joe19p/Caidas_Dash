// Pestaña Simulador: qué pasaría si esta comunicación no aplicara una lista de autosupresión. Estimación con los
// supuestos de shared/simulator.mjs, a la vista del usuario.
import { useState } from 'preact/hooks';
import { cx, fmtInt, fmtPct, fmtPts } from '@/lib/format.mjs';
import { Icon } from '@/ui/Icon.jsx';
import { simLists, simulate, simRisk } from '@shared/simulator.mjs';

function Switch({ checked, label, onToggle }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onToggle}
      class={cx('relative h-6 w-10 flex-none rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-text', checked ? 'bg-asl' : 'bg-track')}>
      <span class={cx('absolute top-[3px] size-[18px] rounded-full bg-white shadow-sm transition-[left]', checked ? 'left-[19px]' : 'left-[3px]')} />
    </button>
  );
}

function Compare({ label, now, sim, max, delta, deltaClass, danger }) {
  return (
    <div class="flex flex-col gap-2 rounded-xl border border-line px-4 py-3.5">
      <div class="flex items-baseline justify-between gap-2">
        <span class="text-[13px] font-bold">{label}</span>
        <b class={cx('text-lg', deltaClass)}>{delta}</b>
      </div>
      <div class="grid grid-cols-[70px_minmax(0,1fr)_96px] items-center gap-x-2.5 gap-y-1.5 text-[12.5px]">
        <span class="text-ink-muted">Hoy</span>
        <span class="h-2.5 rounded-full bg-surface-muted"><span class="block h-full rounded-full bg-line-strong" style={{ width: `${max ? (now.value / max) * 100 : 0}%` }} /></span>
        <span class="text-right">{now.text}</span>
        <span class="font-bold">Simulado</span>
        <span class="h-2.5 rounded-full bg-surface-muted"><span class={cx('block h-full rounded-full', danger ? 'bg-danger' : 'bg-ent')} style={{ width: `${max ? (Math.min(sim.value, max) / max) * 100 : 0}%` }} /></span>
        <b class="text-right">{sim.text}</b>
      </div>
    </div>
  );
}

const RISK = {
  sano: ['bg-surface-muted text-success', 'Entregabilidad sana', 'La tasa de rebote se mantiene bajo el 3 %.'],
  vigilar: ['bg-warning-soft text-warning-ink', 'Vigilar la entregabilidad', 'La tasa de rebote supera el 3 %: conviene probar con un grupo pequeño primero.'],
  riesgo: ['bg-danger-soft text-danger-ink', 'Riesgo para la reputación', 'Con más de 5 % de rebote los proveedores de correo pueden bloquear el dominio.']
};

export function SimulatorTab({ detail }) {
  const [off, setOff] = useState({});
  const lists = simLists(detail);
  const result = simulate(detail, off);
  const record = detail.record;
  const risk = RISK[simRisk(result.bounceRateSim)];
  const bounceDelta = result.bounceRateSim - result.bounceRate;
  return (
    <section aria-labelledby="si-t" class="panel flex flex-col gap-3.5 p-5">
      <div>
        <span class="eyebrow">Simulador · estimación</span>
        <h2 id="si-t" class="mt-0.5 text-xl font-extrabold">¿Qué pasaría si esta comunicación no aplicara una lista?</h2>
      </div>
      {!lists.length ? <p class="text-[13px] text-ink-muted">Esta comunicación no tiene listas de autosupresión aplicadas.</p> : (
        <div class="flex flex-wrap items-start gap-7">
          <div class="flex min-w-0 flex-[1_1_520px] flex-col gap-0.5">
            <div class="grid grid-cols-[52px_minmax(0,1fr)_100px_92px] gap-2.5 px-2 pb-1.5 text-xs font-semibold text-ink-muted">
              <span>Aplicar</span><span>Lista de autosupresión</span><span class="text-right">Excluye</span><span class="text-right">Apertura esp.</span>
            </div>
            {lists.map(list => {
              const isOff = !list.lock && Boolean(off[list.code]);
              return (
                <div key={list.code} class={cx('grid grid-cols-[52px_minmax(0,1fr)_100px_92px] items-center gap-2.5 rounded-[10px] px-2 py-1.5', isOff && 'bg-brand-soft', list.lock && 'opacity-70')}>
                  {list.lock
                    ? <span title={list.lock} class="inline-flex w-10 justify-center text-ink-muted"><Icon name="lock" size={16} label="No se puede quitar" /></span>
                    : <Switch checked={!isOff} label={`${isOff ? 'Aplicar' : 'Dejar de aplicar'} ${list.name}`} onToggle={() => setOff({ ...off, [list.code]: !off[list.code] })} />}
                  <span class="flex min-w-0 flex-col">
                    <span class="truncate text-[13px] font-semibold" title={list.code}>{list.name}</span>
                    <span class="truncate text-[11.5px] text-ink-muted">{list.lock || `Excluye el ${fmtPct(list.share)} de lo no enviado`}</span>
                  </span>
                  <span class="text-right text-[13px] font-semibold">{fmtInt(list.count)}</span>
                  <span class="text-right text-[12.5px] text-ink-muted">{list.lock ? '—' : fmtPct(list.expectedOpen)}</span>
                </div>
              );
            })}
          </div>
          <div class="flex min-w-0 flex-[1_1_340px] flex-col gap-3">
            <Compare label="Personas que reciben el envío" max={Math.max(record.sends, result.sends)}
              now={{ value: record.sends, text: fmtInt(record.sends) }} sim={{ value: result.sends, text: fmtInt(result.sends) }}
              delta={`${result.added > 0 ? '+' : ''}${fmtInt(result.added)}`} deltaClass={result.added > 0 ? 'text-success' : 'text-ink-muted'} />
            <Compare label="Aperturas estimadas" max={Math.max(record.opens, result.opens)}
              now={{ value: record.opens, text: fmtInt(record.opens) }} sim={{ value: result.opens, text: fmtInt(result.opens) }}
              delta={`${result.addedOpens > 0 ? '+' : ''}${fmtInt(result.addedOpens)} (${record.opens ? ((result.addedOpens / record.opens) * 100).toFixed(1) : '0.0'}%)`}
              deltaClass={result.addedOpens > 0 ? 'text-success' : 'text-ink-muted'} />
            <Compare label="Tasa de rebote" max={0.1}
              now={{ value: result.bounceRate, text: fmtPct(result.bounceRate, 2) }} sim={{ value: result.bounceRateSim, text: fmtPct(result.bounceRateSim, 2) }}
              delta={fmtPts(bounceDelta, 2)} deltaClass={bounceDelta > 0.0005 ? 'text-danger' : 'text-ink-muted'} danger={result.bounceRateSim > 0.03} />
            <div class={cx('flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px]', risk[0])}>
              <Icon name="alert" size={18} class="flex-none" />
              <span class="flex flex-col gap-0.5"><b>{risk[1]}</b><span class="text-[12.5px]">{risk[2]}</span></span>
            </div>
            <p class="text-[11.5px] leading-snug text-ink-muted">
              Supuestos por validar: entrega igual a la de este envío (70 % si tuvo rebote soft) y la apertura esperada de cada lista como fracción de la de este envío.
              No cuenta a quienes caerían en otra lista activa. Los bloqueos de Marketing Cloud no se pueden quitar, y las listas con candado tampoco (ley, reputación o fallecidos).
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
