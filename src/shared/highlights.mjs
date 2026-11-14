/**
 * «Lo que cambió en el periodo» (vista general): frases armadas con reglas fijas sobre lo que ya muestra la página, de
 * lo más a lo menos importante. Solo cliente (no entra en Code.gs). Funciones puras: las pruebas las usan directo.
 *
 * Cada frase sale solo si el cambio pasa su umbral, para no destacar ruido:
 *   1. El mes en curso con la mejor o la peor apertura de los 24 meses (si el periodo llega a él y hay 6 meses o más).
 *   2. El indicador que más se movió frente al periodo anterior (en múltiplos de su umbral, HIGHLIGHT_STEPS).
 *   3. Cuántas de cada 100 personas no reciben el correo, si cambió 0.3 o más.
 *   4. La regla de protección que más peso ganó o perdió (1 pt o más).
 *   5. La familia con la apertura más alejada de la mediana del periodo (3 pts o más).
 *   6. La familia que más se repite en «Comunicaciones a revisar» (2 o más), o la primera de la lista.
 *   7. El día de la semana con más comunicaciones en el calendario.
 * Las tasas se leen según cómo se promedia (com: mediana por comunicación; vol: ponderado). Las caídas por destino son
 * siempre ponderadas (shared/metrics.mjs → metricDrops).
 */

const HIGHLIGHT_LIMIT = 5;
/** Movimiento que ya vale la pena contar, por indicador (en tasa: 0.005 = 0.5 pts). */
const HIGHLIGHT_STEPS = Object.freeze({ or: 0.005, deliv: 0.003, ctor: 0.003, bounce: 0.001, unsub: 0.0003 });
const HIGHLIGHT_NAMES = Object.freeze({
  or: ['La apertura', 'subió', 'bajó', 'up'],
  deliv: ['La entrega', 'subió', 'bajó', 'up'],
  ctor: ['El clic sobre apertura', 'subió', 'bajó', 'up'],
  bounce: ['El rebote', 'subió', 'bajó', 'down'],
  unsub: ['Las bajas', 'subieron', 'bajaron', 'down']
});
const HIGHLIGHT_WEEKDAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'];

const pick = (summary, mode) => (summary ? (mode === 'vol' ? summary.vol : summary.com) : null);
/** Cifras como en la app: punto decimal. */
const pct = (value, digits = 1) => `${(value * 100).toFixed(digits)}%`;
const pts = (delta, digits = 1) => `${Math.abs(delta * 100).toFixed(digits)} pts`;
const digitsOf = key => (key === 'or' || key === 'deliv' ? 1 : 2);
/** Lunes = 0, como el calendario. */
const weekdayOf = ymd => { const [y, m, d] = ymd.split('-').map(Number); return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; };

function bestMonth({ period, history, mode }) {
  const last = history[history.length - 1];
  if (!last?.partial || period.to !== last.month) return null;
  const now = pick(last.metrics.or, mode);
  const closed = history.slice(0, -1).map(item => pick(item.metrics.or, mode)).filter(value => value != null);
  if (now == null || closed.length < 6) return null;
  const days = period.cut ? ` en sus primeros ${period.cut} días` : '';
  if (now > Math.max(...closed)) return { tone: 'good', icon: 'sparkle', text: `El mes en curso va con la mejor apertura de los últimos 24 meses: ${pct(now)}${days}.`, link: { section: 'timeline', label: 'Ver la línea de tiempo' } };
  if (now < Math.min(...closed)) return { tone: 'bad', icon: 'alert', text: `El mes en curso va con la apertura más baja de los últimos 24 meses: ${pct(now)}${days}.`, link: { section: 'timeline', label: 'Ver la línea de tiempo' } };
  return null;
}

function biggestMove({ period, mode }) {
  if (!period.prev.sends) return null;
  let best = null;
  Object.keys(HIGHLIGHT_STEPS).forEach(key => {
    const now = pick(period.kpis.metrics[key], mode);
    const before = pick(period.prev.metrics[key], mode);
    if (now == null || before == null) return;
    const score = Math.abs(now - before) / HIGHLIGHT_STEPS[key];
    if (score >= 1 && (!best || score > best.score)) best = { key, now, before, score };
  });
  if (!best) return null;
  const [name, rise, fall, better] = HIGHLIGHT_NAMES[best.key];
  const up = best.now > best.before;
  return {
    tone: up === (better === 'up') ? 'good' : 'bad', icon: up ? 'trendUp' : 'trendDown', metric: best.key,
    text: `${name} ${up ? rise : fall} ${pts(best.now - best.before, digitsOf(best.key))} frente al periodo anterior: de ${pct(best.before, digitsOf(best.key))} a ${pct(best.now, digitsOf(best.key))}.`,
    link: { section: 'timeline', label: 'Verla en la línea de tiempo', metric: best.key }
  };
}

function dropsMove({ period }) {
  if (!period.drops || !period.prevDrops) return null;
  const now = period.drops.total * 100;
  const diff = now - period.prevDrops.total * 100;
  if (Math.abs(diff) < 0.3) return null;
  return {
    tone: diff < 0 ? 'good' : 'bad', icon: diff < 0 ? 'trendDown' : 'trendUp',
    text: `No reciben el correo ${now.toFixed(1)} de cada 100 personas, ${Math.abs(diff).toFixed(1)} ${diff < 0 ? 'menos' : 'más'} que en el periodo anterior.`,
    link: { section: 'drops', label: 'Ver las caídas por mes' }
  };
}

function ruleMove({ period, mode }) {
  let best = null;
  (period.rules || []).forEach(rule => {
    if (!rule.code) return;
    const delta = rule.share[mode] - rule.prev[mode];
    if (Math.abs(delta) >= 0.01 && (!best || Math.abs(delta) > Math.abs(best.delta))) best = { rule, delta };
  });
  if (!best) return null;
  return {
    tone: 'info', icon: 'shield',
    text: `La regla «${best.rule.name}» pesa ${pts(best.delta)} ${best.delta > 0 ? 'más' : 'menos'} en lo que no se envió que en el periodo anterior.`,
    link: { section: 'rules', label: 'Ver las reglas' }
  };
}

function familyGap({ period, mode }) {
  const median = pick(period.kpis.metrics.or, mode);
  const families = (period.families || []).filter(family => pick(family.or, mode) != null);
  if (median == null || families.length < 2) return null;
  const far = families.reduce((a, b) => (Math.abs(pick(b.or, mode) - median) > Math.abs(pick(a.or, mode) - median) ? b : a));
  const gap = pick(far.or, mode) - median;
  if (Math.abs(gap) < 0.03) return null;
  return {
    tone: gap > 0 ? 'good' : 'bad', icon: gap > 0 ? 'trendUp' : 'trendDown',
    text: `${far.name} abre ${pct(pick(far.or, mode))}, ${pts(gap)} ${gap > 0 ? 'sobre' : 'bajo'} la apertura del periodo (${pct(median)}).`,
    link: { section: 'families', label: 'Ver las familias' }
  };
}

function reviewFamily({ period }) {
  const review = period.review || [];
  if (!review.length) return null;
  const counts = {};
  review.forEach(item => { counts[item.family] = (counts[item.family] || 0) + 1; });
  const family = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  if (counts[family] >= 2) {
    return { tone: 'info', icon: 'flag', text: `${counts[family]} de las ${review.length} comunicaciones a revisar son de ${family}.`, link: { section: 'review', label: 'Ver las comunicaciones a revisar' } };
  }
  const first = review[0];
  return { tone: 'info', icon: 'flag', text: `«${first.name}» es la que más se aleja de lo normal en su familia.`, link: { job: first.job, day: first.start.slice(0, 10), label: 'Ver la comunicación' } };
}

function busiestWeekday({ period }) {
  const days = period.calendar?.days || {};
  const sums = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  Object.keys(days).forEach(day => {
    sums[weekdayOf(day)] += days[day].comms;
    counts[weekdayOf(day)] += 1;
  });
  const averages = sums.map((sum, index) => (counts[index] ? sum / counts[index] : 0));
  const top = averages.indexOf(Math.max(...averages));
  if (!averages[top] || Object.keys(days).length < 10) return null;
  return {
    tone: 'info', icon: 'calendar',
    text: `Los ${HIGHLIGHT_WEEKDAYS[top]} salen más comunicaciones: ${averages[top].toFixed(1)} por día en promedio.`,
    link: { section: 'calendar', label: 'Ver el calendario' }
  };
}

const HIGHLIGHT_RULES = [bestMonth, biggestMove, dropsMove, ruleMove, familyGap, reviewFamily, busiestWeekday];

/** Frases del periodo: [{ tone: good|bad|info, icon, text, link: { section | job+day, label, metric? } }]. */
function buildHighlights(input) {
  return HIGHLIGHT_RULES.map(rule => rule(input)).filter(Boolean).slice(0, HIGHLIGHT_LIMIT);
}

export { HIGHLIGHT_STEPS, buildHighlights };
