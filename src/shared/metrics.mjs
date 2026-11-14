/**
 * Métricas del dashboard a partir de los envíos (registros de shared/sfmc.mjs). Funciones puras: el servidor arma con
 * ellas lo que pide el cliente y las pruebas las usan directo.
 *
 * Regla principal: nunca se suman personas entre comunicaciones (una misma persona está en muchas). Lo general se
 * cuenta en comunicaciones y se mide en tasas, de dos formas:
 *   - com: mediana por comunicación (cada envío pesa igual); con su mitad central (del 25 % al 75 %).
 *   - vol: ponderada por volumen (suma de numeradores sobre suma de denominadores).
 * El mes en curso entra hasta el día de hoy y se compara con los mismos días del periodo anterior (metricPeriod).
 */

/** Numerador y denominador de cada tasa. */
const METRIC_PARTS = Object.freeze({
  deliv: ['deliv', 'sends'],
  or: ['opens', 'deliv'],
  ctor: ['clicks', 'opens'],
  bounce: ['bounces', 'sends'],
  unsub: ['unsubs', 'deliv'],
  drop: ['notSent', 'base']
});
const METRIC_KEYS = Object.freeze(['deliv', 'or', 'ctor', 'bounce', 'unsub']);
const METRIC_PERIODS = Object.freeze([1, 3, 6, 12]);
const METRIC_HISTORY = 24;
const METRIC_TOP_RULES = 6;

/** Tasa de un envío (null si no hay denominador). */
function metricRate(record, key) {
  const [num, den] = METRIC_PARTS[key];
  return record[den] ? record[num] / record[den] : null;
}

/** Valor en la posición q (0–1) de una lista ordenada, con interpolación lineal. */
function metricQuantile(sorted, q) {
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * q;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

/** Resumen de una tasa en un grupo de envíos: { com, lo, hi, vol, n } (null si ninguno la tiene). */
function metricSummary(records, key) {
  const [num, den] = METRIC_PARTS[key];
  const values = [];
  let sumNum = 0;
  let sumDen = 0;
  records.forEach(record => {
    if (!record[den]) return;
    values.push(record[num] / record[den]);
    sumNum += record[num];
    sumDen += record[den];
  });
  if (!values.length) return null;
  values.sort((a, b) => a - b);
  return { com: metricQuantile(values, 0.5), lo: metricQuantile(values, 0.25), hi: metricQuantile(values, 0.75), vol: sumNum / sumDen, n: values.length };
}

/** Mes «AAAA-MM» desplazado en delta meses. */
function metricShiftMonth(month, delta) {
  const [year, monthNumber] = month.split('-').map(Number);
  const index = year * 12 + (monthNumber - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** Lista de meses de from a to (incluidos). */
function metricMonthRange(from, to) {
  const months = [];
  for (let month = from; month <= to; month = metricShiftMonth(month, 1)) months.push(month);
  return months;
}

/** Último mes cerrado para la fecha de hoy («AAAA-MM-DD»). */
function metricLastClosed(today) {
  return metricShiftMonth(String(today).slice(0, 7), -1);
}

function metricInMonths(records, from, to) {
  return records.filter(record => {
    const month = record.start.slice(0, 7);
    return month >= from && month <= to;
  });
}

/** Comunicaciones distintas (por nombre de maqueta) de un grupo de envíos. */
function metricDistinct(records) {
  const names = {};
  records.forEach(record => { names[record.name || record.job] = true; });
  return Object.keys(names).length;
}

/** Suma de los motivos de un origen ('asl' o 'blq') en un envío. */
function metricOriginTotal(record, origin, info) {
  return Object.keys(record.motives).reduce((sum, code) => sum + (info(code).origin === origin ? record.motives[code] : 0), 0);
}

/** Peso de cada motivo en lo no enviado: { código: { com, vol } }. com = promedio por envío; vol = suma sobre suma. */
function metricMotiveShares(records) {
  const totals = {};
  const means = {};
  let notSent = 0;
  let counted = 0;
  records.forEach(record => {
    if (!record.notSent) return;
    notSent += record.notSent;
    counted += 1;
    Object.keys(record.motives).forEach(code => {
      totals[code] = (totals[code] || 0) + record.motives[code];
      means[code] = (means[code] || 0) + record.motives[code] / record.notSent;
    });
  });
  const shares = {};
  Object.keys(totals).forEach(code => { shares[code] = { vol: notSent ? totals[code] / notSent : 0, com: counted ? means[code] / counted : 0 }; });
  return shares;
}

/**
 * Cuántas personas de la audiencia no reciben el correo, por destino: autosupresión del CRM, bloqueos de Marketing
 * Cloud y rebotes, cada uno sobre la audiencia. Siempre ponderado por volumen (suma sobre suma): las medianas de cada
 * destino no suman la mediana del total. null si no hay audiencia.
 */
function metricDrops(records, info) {
  let base = 0;
  let asl = 0;
  let blq = 0;
  let reb = 0;
  records.forEach(record => {
    if (!record.base) return;
    const blocked = metricOriginTotal(record, 'blq', info);
    base += record.base;
    blq += blocked;
    asl += Math.max(0, record.notSent - blocked);
    reb += record.bounces;
  });
  return base ? { asl: asl / base, blq: blq / base, reb: reb / base, total: (asl + blq + reb) / base } : null;
}

/** Indicadores de un grupo de envíos: comunicaciones, envíos y cada tasa. */
function metricKpis(records) {
  const metrics = {};
  METRIC_KEYS.forEach(key => { metrics[key] = metricSummary(records, key); });
  return { comms: metricDistinct(records), sends: records.length, metrics };
}

/** Reglas (motivos) del periodo: las de más peso y el resto junto, con su peso mes a mes. */
function metricRules(current, previous, history, byMonth, info) {
  const now = metricMotiveShares(current);
  const before = metricMotiveShares(previous);
  const top = Object.keys(now).sort((a, b) => now[b].vol - now[a].vol).slice(0, METRIC_TOP_RULES);
  const monthly = history.map(month => metricMotiveShares(byMonth[month] || []));
  const sumOthers = (shares, mode) => Object.keys(shares).filter(code => !top.includes(code)).reduce((sum, code) => sum + shares[code][mode], 0);
  const rules = top.map(code => ({
    code, name: info(code).name, origin: info(code).origin,
    share: now[code], prev: before[code] || { com: 0, vol: 0 },
    series: monthly.map(shares => (shares[code] ? shares[code].vol : 0))
  }));
  if (Object.keys(now).length > top.length) {
    rules.push({
      code: '', name: 'Otros motivos', origin: 'asl',
      share: { com: sumOthers(now, 'com'), vol: sumOthers(now, 'vol') },
      prev: { com: sumOthers(before, 'com'), vol: sumOthers(before, 'vol') },
      series: monthly.map(shares => sumOthers(shares, 'vol'))
    });
  }
  return rules;
}

/** Familias del periodo: comunicaciones, envíos, cada tasa, lo que no se envía y su apertura mes a mes. */
function metricFamilies(current, history, byMonth) {
  const names = {};
  current.forEach(record => { (names[record.family] = names[record.family] || []).push(record); });
  return Object.keys(names).map(family => ({
    name: family,
    comms: metricDistinct(names[family]),
    sends: names[family].length,
    deliv: metricSummary(names[family], 'deliv'),
    or: metricSummary(names[family], 'or'),
    ctor: metricSummary(names[family], 'ctor'),
    bounce: metricSummary(names[family], 'bounce'),
    unsub: metricSummary(names[family], 'unsub'),
    drop: metricSummary(names[family], 'drop'),
    orSeries: history.map(month => {
      const summary = metricSummary((byMonth[month] || []).filter(record => record.family === family), 'or');
      return summary ? summary.com : null;
    })
  })).sort((a, b) => b.comms - a.comms);
}

/**
 * Comunicaciones a revisar: las que más se alejan de la mediana de su familia en el periodo (apertura o CTOR bajos,
 * rebote o bajas altos). Solo envíos de al menos 500 personas y desvíos sobre el umbral de cada tasa (REVIEW_LIMITS:
 * las bajas son pocas y varían mucho, así que exigen el doble). Máximo 5, sin repetir maqueta.
 */
const REVIEW_LIMITS = Object.freeze({ or: 0.35, ctor: 0.5, bounce: 0.5, unsub: 1 });
function metricReview(current) {
  const byFamily = {};
  current.forEach(record => { (byFamily[record.family] = byFamily[record.family] || []).push(record); });
  const medians = {};
  Object.keys(byFamily).forEach(family => {
    const group = byFamily[family].length >= 3 ? byFamily[family] : current;
    medians[family] = {};
    ['or', 'ctor', 'bounce', 'unsub'].forEach(key => {
      const summary = metricSummary(group, key);
      medians[family][key] = summary ? summary.com : null;
    });
  });
  const candidates = [];
  current.forEach(record => {
    if (record.sends < 500) return;
    const normal = medians[record.family];
    let best = null;
    [['or', -1], ['ctor', -1], ['bounce', 1], ['unsub', 1]].forEach(([key, worseWhen]) => {
      const value = metricRate(record, key);
      const reference = normal[key];
      if (value == null || !reference) return;
      const score = (worseWhen * (value - reference) / reference) / REVIEW_LIMITS[key];
      if (score >= 1 && (!best || score > best.score)) best = { key, value, reference, score };
    });
    if (best) candidates.push({ job: record.job, name: record.name, family: record.family, start: record.start, metric: best.key, value: best.value, familyValue: best.reference, score: best.score });
  });
  const seen = {};
  return candidates.sort((a, b) => b.score - a.score).filter(item => {
    if (seen[item.name]) return false;
    seen[item.name] = true;
    return true;
  }).slice(0, 5);
}

/** Calendario de los 3 meses que terminan en `to`: por día, comunicaciones, envíos y apertura mediana. */
function metricCalendar(records, to) {
  const from = metricShiftMonth(to, -2);
  const byDay = {};
  metricInMonths(records, from, to).forEach(record => {
    const day = record.start.slice(0, 10);
    (byDay[day] = byDay[day] || []).push(record);
  });
  const days = {};
  Object.keys(byDay).forEach(day => {
    const or = metricSummary(byDay[day], 'or');
    days[day] = { comms: metricDistinct(byDay[day]), sends: byDay[day].length, or: or ? or.com : null };
  });
  return { from, to, days };
}

/** Envíos de los meses from–to; con cutDay («DD»), el último mes solo hasta ese día. */
function metricInPeriod(records, from, to, cutDay) {
  return records.filter(record => {
    const month = record.start.slice(0, 7);
    if (month < from || month > to) return false;
    return !cutDay || month !== to || record.start.slice(8, 10) <= cutDay;
  });
}

/** Lo que comparten los periodos: mes en curso, historial (24 meses cerrados y el en curso) y envíos por mes. */
function metricContext(records, today) {
  const day = String(today).slice(0, 10);
  const current = day.slice(0, 7);
  const lastClosed = metricShiftMonth(current, -1);
  const history = metricMonthRange(metricShiftMonth(lastClosed, -(METRIC_HISTORY - 1)), current);
  const byMonth = {};
  records.forEach(record => {
    const month = record.start.slice(0, 7);
    (byMonth[month] = byMonth[month] || []).push(record);
  });
  return { day, current, lastClosed, history, byMonth };
}

/**
 * Un periodo de meses (from–to) comparado con el anterior del mismo largo. Si llega al mes en curso, se corta en el
 * día de hoy y el anterior también corta en ese día: un mes a medias se compara con los mismos días de antes.
 */
function metricPeriod(records, info, from, to, context) {
  const cutDay = to === context.current ? context.day.slice(8, 10) : '';
  const size = metricMonthRange(from, to).length;
  const prevTo = metricShiftMonth(from, -1);
  const prevFrom = metricShiftMonth(prevTo, -(size - 1));
  const current = metricInPeriod(records, from, to, cutDay);
  const previous = metricInPeriod(records, prevFrom, prevTo, cutDay);
  return {
    from, to, prevFrom, prevTo,
    cut: cutDay ? Number(cutDay) : null,
    kpis: metricKpis(current),
    prev: metricKpis(previous),
    drops: metricDrops(current, info),
    prevDrops: metricDrops(previous, info),
    rules: metricRules(current, previous, context.history, context.byMonth, info),
    families: metricFamilies(current, context.history, context.byMonth),
    review: metricReview(current),
    calendar: metricCalendar(records, to)
  };
}

/** Un periodo cualquiera (para getPeriod). from y to son «AAAA-MM»; to no pasa del mes en curso. */
function buildPeriod(records, info, from, to, today) {
  return metricPeriod(records, info, from, to, metricContext(records, today));
}

/**
 * Todo lo de la vista general: el historial y los periodos que terminan en el mes en curso (1, 3, 6 y 12 meses), así
 * abre sin otra llamada. Otros periodos se piden con buildPeriod. info(código) da { name, origin } de cada motivo.
 */
function buildOverview(records, info, today) {
  const context = metricContext(records, today);
  const periods = {};
  METRIC_PERIODS.forEach(months => {
    periods[months] = metricPeriod(records, info, metricShiftMonth(context.current, -(months - 1)), context.current, context);
  });
  return {
    current: context.current,
    today: context.day,
    // El último mes del historial es el en curso (partial): va a medias, así que el histórico no lo cuenta.
    history: context.history.map(month => ({
      month, partial: month === context.current, ...metricKpis(context.byMonth[month] || []), drops: metricDrops(context.byMonth[month] || [], info)
    })),
    historic: metricKpis(metricInMonths(records, context.history[0], context.lastClosed)),
    periods,
    total: records.length
  };
}

/** El motivo que más personas dejó sin envío: { code, name, origin, count } o null. */
function metricTopMotive(record, info) {
  let best = '';
  Object.keys(record.motives).forEach(code => { if (!best || record.motives[code] > record.motives[best]) best = code; });
  if (!best || !record.motives[best]) return null;
  return { code: best, name: info(best).name, origin: info(best).origin, count: record.motives[best] };
}

/** Resumen corto de un envío para la lista del día y los resultados de búsqueda. */
function metricListItem(record, info) {
  return {
    job: record.job, name: record.name, family: record.family, start: record.start,
    base: record.base, sends: record.sends, deliv: record.deliv, bounces: record.bounces,
    asl: metricOriginTotal(record, 'asl', info), blq: metricOriginTotal(record, 'blq', info),
    top: metricTopMotive(record, info)
  };
}

/** Texto sin tildes y en mayúsculas, para buscar sin distinguirlas. */
function metricFold(text) {
  return String(text == null ? '' : text).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

/** Palabras de una búsqueda, separadas por coma (como en el cronograma): «promo, Cyber ,» → ['PROMO', 'CYBER']. */
function metricSearchTerms(query) {
  return String(query == null ? '' : query).split(',').map(term => metricFold(term).trim()).filter(Boolean);
}

/** Si un envío coincide con las palabras (ya pasadas por metricSearchTerms): Y, todas; O, alguna. Nombre, JobID y familia. */
function metricMatches(item, terms, mode) {
  if (!terms.length) return true;
  const haystack = metricFold(`${item.name}\n${item.job}\n${item.family}`);
  const found = term => haystack.indexOf(term) !== -1;
  return mode === 'Y' ? terms.every(found) : terms.some(found);
}

/**
 * Búsqueda en todos los envíos: los más recientes primero y el JobID exacto antes que todo. Devuelve hasta `limit`
 * resúmenes y cuántos coinciden en total.
 */
function buildSearch(records, info, query, mode, limit) {
  const terms = metricSearchTerms(query);
  const matching = terms.length ? records.filter(record => metricMatches(record, terms, mode)) : [];
  const exact = record => terms.indexOf(metricFold(record.job)) !== -1;
  matching.sort((a, b) => (exact(b) - exact(a)) || (a.start < b.start ? 1 : a.start > b.start ? -1 : 0));
  return { terms, mode, total: matching.length, items: matching.slice(0, limit).map(record => metricListItem(record, info)) };
}

/** Motivos que se muestran en la comparación (los de más peso en la selección); el resto va junto en «Otros». */
const METRIC_COMPARE_MOTIVES = 8;

/**
 * Varias comunicaciones lado a lado, cada una por separado (no se suman personas entre ellas): destino de la
 * audiencia, tasas, motivo principal y, para la matriz, qué parte de su audiencia cayó por cada motivo.
 */
function buildCompare(records, info, jobs) {
  const byJob = {};
  records.forEach(record => { byJob[record.job] = record; });
  const wanted = jobs.map(String);
  const found = wanted.map(job => byJob[job]).filter(Boolean);
  const weight = {};
  found.forEach(record => Object.keys(record.motives).forEach(code => {
    weight[code] = (weight[code] || 0) + (record.base ? record.motives[code] / record.base : 0);
  }));
  const codes = Object.keys(weight).filter(code => weight[code] > 0).sort((a, b) => weight[b] - weight[a]).slice(0, METRIC_COMPARE_MOTIVES);
  const items = found.map(record => {
    const blq = metricOriginTotal(record, 'blq', info);
    const shareOf = count => (record.base ? count / record.base : 0);
    const rates = {};
    METRIC_KEYS.concat(['drop']).forEach(key => { rates[key] = metricRate(record, key); });
    return {
      ...metricListItem(record, info),
      notSent: record.notSent, opens: record.opens, clicks: record.clicks, rates,
      asl: Math.max(0, record.notSent - blq), blq,
      shares: codes.map(code => shareOf(record.motives[code] || 0)),
      others: shareOf(Object.keys(record.motives).filter(code => codes.indexOf(code) === -1).reduce((sum, code) => sum + record.motives[code], 0))
    };
  });
  return {
    items,
    motives: codes.map(code => ({ code, name: info(code).name, origin: info(code).origin })),
    missing: wanted.filter(job => !byJob[job])
  };
}

/** Envíos de un mes («AAAA-MM») para elegir día y comunicación: { month, days: { fecha: n }, items }. */
function buildMonth(records, info, month) {
  const items = records.filter(record => record.start.slice(0, 7) === month).map(record => metricListItem(record, info))
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : b.base - a.base));
  const days = {};
  items.forEach(item => { const day = item.start.slice(0, 10); days[day] = (days[day] || 0) + 1; });
  return { month, days, items };
}

/** Meses con envíos (del más reciente al más antiguo) y el último día con envíos. */
function metricAvailable(records) {
  const months = {};
  let lastDay = '';
  records.forEach(record => {
    months[record.start.slice(0, 7)] = true;
    if (record.start.slice(0, 10) > lastDay) lastDay = record.start.slice(0, 10);
  });
  return { months: Object.keys(months).sort().reverse(), lastDay };
}

/**
 * Detalle de un envío, con «lo normal» para comparar: medianas de los últimos 3 meses cerrados (o de todo si no hay)
 * y el peso de cada motivo en ese mismo tramo.
 */
function buildDetail(records, info, job, today) {
  const record = records.find(item => item.job === String(job));
  if (!record) return null;
  const lastClosed = metricLastClosed(today);
  let window = metricInMonths(records, metricShiftMonth(lastClosed, -2), lastClosed);
  if (!window.length) window = records;
  const rates = {};
  const normalRates = {};
  METRIC_KEYS.concat(['drop']).forEach(key => {
    rates[key] = metricRate(record, key);
    const summary = metricSummary(window, key);
    normalRates[key] = summary ? summary.com : null;
  });
  const fractions = item => {
    if (!item.base) return null;
    const blq = metricOriginTotal(item, 'blq', info);
    return { abr: item.opens / item.base, ent: Math.max(0, item.deliv - item.opens) / item.base, reb: item.bounces / item.base, blq: blq / item.base, asl: Math.max(0, item.notSent - blq) / item.base };
  };
  const per100 = { abr: 0, ent: 0, reb: 0, blq: 0, asl: 0 };
  let counted = 0;
  window.forEach(item => {
    const parts = fractions(item);
    if (!parts) return;
    counted += 1;
    Object.keys(per100).forEach(key => { per100[key] += parts[key]; });
  });
  Object.keys(per100).forEach(key => { per100[key] = counted ? per100[key] / counted * 100 : 0; });
  const normalShares = metricMotiveShares(window);
  const motives = Object.keys(record.motives).map(code => ({
    code, name: info(code).name, description: info(code).description || '', origin: info(code).origin,
    count: record.motives[code], share: record.notSent ? record.motives[code] / record.notSent : 0,
    normal: normalShares[code] ? normalShares[code].vol : 0
  })).sort((a, b) => b.count - a.count);
  const blq = metricOriginTotal(record, 'blq', info);
  return {
    record: { ...record, motives: undefined },
    asl: Math.max(0, record.notSent - blq),
    blq,
    rates,
    motives,
    normal: { rates: normalRates, per100, from: window === records ? '' : metricShiftMonth(lastClosed, -2), to: window === records ? '' : lastClosed }
  };
}

export {
  METRIC_PARTS, METRIC_KEYS, METRIC_PERIODS, METRIC_HISTORY,
  metricRate, metricQuantile, metricSummary, metricShiftMonth, metricMonthRange, metricLastClosed, metricDistinct,
  metricMotiveShares, metricDrops, metricReview, metricAvailable, metricFold, metricSearchTerms, metricMatches,
  buildOverview, buildPeriod, buildMonth, buildDetail, buildSearch, buildCompare
};
