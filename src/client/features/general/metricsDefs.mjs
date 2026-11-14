// Indicadores de la vista general: nombre, qué mide y hacia dónde es mejor.
import { fmtInt, fmtPct } from '@/lib/format.mjs';

export const METRICS = {
  comms: { label: 'Comunicaciones', title: 'Comunicaciones distintas enviadas por mes', sub: 'Maquetas distintas con envío en cada mes.', better: 'none' },
  deliv: { label: 'Entrega', title: 'Tasa de entrega', sub: 'Entregados sobre enviados.', better: 'up' },
  or: { label: 'Apertura', title: 'Tasa de apertura', sub: 'Aperturas únicas sobre entregados.', better: 'up' },
  ctor: { label: 'Clic sobre apertura', title: 'Clic sobre apertura (CTOR)', sub: 'Clics únicos sobre aperturas únicas.', better: 'up' },
  bounce: { label: 'Rebote', title: 'Tasa de rebote', sub: 'Rebotes sobre enviados. Sobre 3 % pone en riesgo la reputación del dominio.', better: 'down' },
  unsub: { label: 'Bajas', title: 'Tasa de bajas', sub: 'Bajas únicas sobre entregados: señal de cansancio de la audiencia.', better: 'down' }
};

export const SECONDARY = ['deliv', 'ctor', 'bounce', 'unsub'];

/** Ícono (ui/Icon.jsx) y pastilla de cada indicador: el mismo en la vista general y en Resumen. */
export const METRIC_ICONS = {
  comms: ['mail', 'bg-brand-soft text-brand-text'],
  audience: ['users', 'bg-brand-soft text-brand-text'],
  drop: ['suppressed', 'bg-asl-soft text-asl-ink'],
  sends: ['send', 'bg-brand-soft text-brand-text'],
  deliv: ['inbox', 'bg-success-soft text-success'],
  or: ['mailOpen', 'bg-brand-soft text-brand-text'],
  ctor: ['click', 'bg-brand-soft text-brand-text'],
  bounce: ['bounce', 'bg-danger-soft text-danger-ink'],
  unsub: ['userMinus', 'bg-danger-soft text-danger-ink']
};

/** Valor de un resumen de tasa según cómo se promedia (com: mediana por comunicación; vol: ponderado). */
export const rateOf = (summary, mode) => (summary ? (mode === 'vol' ? summary.vol : summary.com) : null);

/** Valor de un indicador en un grupo de kpis ({ comms, sends, metrics }). */
export const valueOf = (kpis, key, mode) => (key === 'comms' ? kpis?.comms ?? null : rateOf(kpis?.metrics?.[key], mode));

/** Texto de un valor: comunicaciones como entero, tasas como porcentaje (2 decimales las chicas). */
export const formatValue = (key, value) => (key === 'comms' ? fmtInt(value) : fmtPct(value, key === 'deliv' || key === 'or' ? 1 : 2));
