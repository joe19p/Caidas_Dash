// Formatos de la interfaz. Los números van con coma de miles y punto decimal (como el reporte de Marketing Cloud).

const INT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
export const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
export const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
export const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const WEEKDAYS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Clases condicionales: cx('a', cond && 'b'). */
export const cx = (...parts) => parts.filter(Boolean).join(' ');

export const fmtInt = value => (value == null || Number.isNaN(value) ? '—' : INT.format(Math.round(value)));

/** Tasa (0–1) como porcentaje; digits por defecto 1 (2 para tasas chicas). */
export function fmtPct(value, digits) {
  if (value == null || Number.isNaN(value)) return '—';
  const places = digits ?? (Math.abs(value) < 0.1 && value !== 0 ? 2 : 1);
  return `${(value * 100).toFixed(places)}%`;
}

/** Diferencia en puntos porcentuales con signo: +1.2 pts. */
export function fmtPts(delta, digits = 1) {
  if (delta == null || Number.isNaN(delta)) return '—';
  const value = delta * 100;
  return `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(digits)} pts`;
}

/** Personas abreviadas: 23.9 M, 82 mil, 640. */
export function fmtShort(value) {
  if (value == null) return '—';
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)} M`;
  if (value >= 1e4) return `${Math.round(value / 1e3)} mil`;
  return fmtInt(value);
}

const monthParts = month => month.split('-').map(Number);
/** «oct 26». */
export const monthShort = month => { const [y, m] = monthParts(month); return `${MONTHS[m - 1]} ${String(y).slice(2)}`; };
/** «octubre 2026». */
export const monthLong = month => { const [y, m] = monthParts(month); return `${MONTHS_LONG[m - 1]} ${y}`; };
/** Rango de meses: «octubre 2026» o «ago 26 – oct 26». */
export const monthRange = (from, to) => (from === to ? monthLong(from) : `${monthShort(from)} – ${monthShort(to)}`);

export function shiftMonth(month, delta) {
  const [y, m] = monthParts(month);
  const index = y * 12 + m - 1 + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

const dateOf = ymd => { const [y, m, d] = ymd.slice(0, 10).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
/** «martes 12 de nov». */
export const dayLong = ymd => { const d = dateOf(ymd); return `${WEEKDAYS_LONG[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`; };
/** «12 nov». */
export const dayShort = ymd => { const d = dateOf(ymd); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
/** «09:15». */
export const hourOf = iso => iso.slice(11, 16);
/** Día de la semana con lunes = 0. */
export const weekdayIndex = ymd => (dateOf(ymd).getUTCDay() + 6) % 7;
/** Fecha «AAAA-MM-DD» desplazada en días. */
export const addDays = (ymd, days) => new Date(dateOf(ymd).getTime() + days * 864e5).toISOString().slice(0, 10);

/** Partes que suman exactamente total (resto mayor): para «de cada 100». */
export function largestRemainder(values, total = 100) {
  const sum = values.reduce((acc, value) => acc + value, 0) || 1;
  const raw = values.map(value => (value / sum) * total);
  const floors = raw.map(Math.floor);
  let rest = total - floors.reduce((acc, value) => acc + value, 0);
  raw.map((value, index) => [value - floors[index], index]).sort((a, b) => b[0] - a[0]).forEach(([, index]) => {
    if (rest > 0) { floors[index] += 1; rest -= 1; }
  });
  return floors;
}
