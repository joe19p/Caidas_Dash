// Periodo elegido en la barra de la cabecera (como la navegación del cronograma). En la vista general: un mes, 3, 6 o
// 12 meses que terminan en el mes elegido, o un rango a elección. En «Por comunicación», solo el mes. Las dos vistas
// comparten el mes: la general abre en el mes en curso y «Por comunicación» en el último mes del periodo.
import { computed, signal } from '@preact/signals';
import { shiftMonth, monthCount } from '@/lib/format.mjs';
import { overview, pick, view } from './app.mjs';

export const LENGTHS = [
  { id: 1, label: 'Mes', key: 'M' },
  { id: 3, label: '3 meses', key: '3' },
  { id: 6, label: '6 meses', key: '6' },
  { id: 12, label: '12 meses', key: '1' }
];

/** { len: 1 | 3 | 6 | 12 | 'range', from, to }. to vacío: el mes en curso (se conoce al llegar la vista general). */
export const period = signal({ len: 1, from: '', to: '' });

/** Mes en curso y meses con envíos (del más antiguo al más reciente), de la vista general. */
export const bounds = computed(() => {
  const data = overview.value.data;
  if (!data?.current) return null;
  const withSends = [...(data.available?.months || [])].reverse();
  return { current: data.current, first: withSends[0] || data.current, months: new Set(withSends) };
});

/** El periodo en meses: { len, from, to, size }. */
export const periodRange = computed(() => {
  const limits = bounds.value;
  if (!limits) return null;
  const { len, from, to } = period.value;
  const end = to || limits.current;
  const start = len === 'range' ? from || end : shiftMonth(end, -(len - 1));
  return { len, from: start, to: end, size: monthCount(start, end) };
});

/** Mes de «Por comunicación»: el elegido si tiene envíos; si no, el más reciente con envíos. */
export const commMonth = computed(() => {
  const months = overview.value.data?.available?.months || [];
  return pick.value.month && months.includes(pick.value.month) ? pick.value.month : months[0] || '';
});

/** Cambia el largo; el periodo sigue terminando en el mismo mes. Rango arranca con los meses que se veían. */
export function setLength(len) {
  const range = periodRange.value;
  if (!range) return;
  period.value = len === 'range' ? { len, from: range.from, to: range.to } : { len, from: '', to: range.to };
}

/** «Este mes»: el mes en curso, en las dos vistas. */
export function goCurrent() {
  const limits = bounds.value;
  if (!limits) return;
  period.value = { len: 1, from: '', to: '' };
  if (view.value === 'comm') setCommMonth(limits.current);
}

/** Último mes para un largo fijo (3, 6, 12 o mes) elegido en el calendario. */
export function pickEnd(month) {
  period.value = { ...period.value, len: period.value.len === 'range' ? 1 : period.value.len, from: '', to: month };
}

/** Rango a elección (en cualquier orden). */
export function pickRange(a, b) {
  const [from, to] = a <= b ? [a, b] : [b, a];
  period.value = { len: 'range', from, to };
}

/** Si se puede ir al periodo anterior (-1) o siguiente (1) sin salir de los meses con datos. */
export function canShift(direction) {
  const limits = bounds.value;
  if (!limits) return false;
  if (view.value === 'comm') {
    const target = shiftMonth(commMonth.value, direction);
    return target >= limits.first && target <= limits.current;
  }
  const range = periodRange.value;
  const step = range.len === 'range' ? range.size : range.len;
  return direction < 0 ? shiftMonth(range.to, -step) >= limits.first : shiftMonth(range.to, step) <= limits.current;
}

/** Periodo anterior o siguiente completo (en «Por comunicación», el mes anterior o siguiente). */
export function shiftPeriod(direction) {
  if (!canShift(direction)) return;
  if (view.value === 'comm') {
    setCommMonth(shiftMonth(commMonth.value, direction));
    return;
  }
  const range = periodRange.value;
  const step = (range.len === 'range' ? range.size : range.len) * direction;
  period.value = range.len === 'range'
    ? { len: 'range', from: shiftMonth(range.from, step), to: shiftMonth(range.to, step) }
    : { len: range.len, from: '', to: shiftMonth(range.to, step) };
}

/** Mes de «Por comunicación»: se elige día y comunicación de nuevo, y la vista general queda en ese mes. */
export function setCommMonth(month) {
  if (pick.value.month !== month) pick.value = { ...pick.value, month, day: '', job: '', q: '' };
  const limits = bounds.value;
  period.value = { len: 1, from: '', to: limits && month === limits.current ? '' : month };
}

/** Cambia de vista. «Por comunicación» abre en el último mes del periodo de la vista general. */
export function openView(id) {
  if (id === 'comm' && view.value !== 'comm') {
    const month = periodRange.value?.to;
    if (month && pick.value.month !== month) pick.value = { ...pick.value, month, day: '', job: '', q: '' };
  }
  view.value = id;
}
