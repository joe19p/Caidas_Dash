import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metricSummary, metricShiftMonth, metricMonthRange, metricLastClosed, metricMotiveShares, metricDrops, buildOverview, buildPeriod, buildMonth, buildDetail, buildSearch, buildCompare, metricSearchTerms } from '../../../src/shared/metrics.mjs';
import { sfmcMotiveInfo } from '../../../src/shared/sfmc.mjs';

const info = code => sfmcMotiveInfo(code, {});
const rec = (job, start, values = {}) => ({
  job: String(job), name: values.name || `M${job}`, family: values.family || 'Promociones', start,
  base: 1000, sends: 400, notSent: 600, deliv: 390, bounces: 10, hard: 6, soft: 4, opens: 39, opensCum: 70, clicks: 4, unsubs: 1, complaints: 0,
  motives: { ASL_NO_OPENERS: 400, Held: 200 }, ...values
});

test('metricSummary: mediana, cuartiles y ponderado', () => {
  const records = [rec(1, '2026-10-01T09:00:00', { opens: 10, deliv: 100 }), rec(2, '2026-10-02T09:00:00', { opens: 20, deliv: 100 }),
    rec(3, '2026-10-03T09:00:00', { opens: 300, deliv: 1000 })];
  const or = metricSummary(records, 'or');
  const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} ≠ ${expected}`);
  near(or.com, 0.2);
  near(or.lo, 0.15);
  near(or.hi, 0.25);
  near(or.vol, 330 / 1200);
  assert.equal(or.n, 3);
  assert.equal(metricSummary([rec(4, '2026-10-01T09:00:00', { deliv: 0 })], 'or'), null);
});

test('meses: desplazar, rangos y último mes cerrado', () => {
  assert.equal(metricShiftMonth('2026-01', -1), '2025-12');
  assert.equal(metricShiftMonth('2026-11', 2), '2027-01');
  assert.deepEqual(metricMonthRange('2026-10', '2027-01'), ['2026-10', '2026-11', '2026-12', '2027-01']);
  assert.equal(metricLastClosed('2026-11-14'), '2026-10');
  assert.equal(metricLastClosed('2026-01-01'), '2025-12');
});

test('el peso de los motivos se calcula por comunicación y por volumen', () => {
  const shares = metricMotiveShares([
    rec(1, '2026-10-01T09:00:00', { notSent: 100, motives: { A: 100 } }),
    rec(2, '2026-10-02T09:00:00', { notSent: 900, motives: { A: 0, B: 900 } })
  ]);
  assert.equal(shares.A.com, 0.5);
  assert.equal(shares.A.vol, 0.1);
  assert.equal(shares.B.vol, 0.9);
});

test('metricDrops: quiénes no reciben, por destino y ponderado por volumen', () => {
  // Held es un bloqueo de Marketing Cloud; ASL_NO_OPENERS, autosupresión del CRM.
  const drops = metricDrops([
    rec(1, '2026-10-01T09:00:00'),
    rec(2, '2026-10-02T09:00:00', { base: 3000, notSent: 0, motives: {}, bounces: 30 })
  ], info);
  const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} ≠ ${expected}`);
  near(drops.asl, 400 / 4000);
  near(drops.blq, 200 / 4000);
  near(drops.reb, 40 / 4000);
  near(drops.total, 640 / 4000);
  assert.equal(metricDrops([], info), null);
});

test('buildOverview: periodos hasta el mes en curso, comparados con los mismos días, sin sumar personas', () => {
  const records = [
    rec(1, '2026-10-05T09:00:00', { name: 'A' }), rec(2, '2026-10-06T09:00:00', { name: 'A' }), rec(3, '2026-09-10T09:00:00', { name: 'B' }),
    rec(4, '2026-08-10T09:00:00', { name: 'C' }), rec(5, '2026-07-10T09:00:00', { name: 'D' }), rec(6, '2026-11-02T09:00:00', { name: 'E' }),
    rec(7, '2026-10-20T09:00:00', { name: 'F' })
  ];
  const overview = buildOverview(records, info, '2026-11-14');
  assert.equal(overview.current, '2026-11');
  assert.equal(overview.history.length, 25);
  assert.deepEqual([overview.history[24].month, overview.history[24].partial, overview.history[23].partial], ['2026-11', true, false]);
  const month = overview.periods[1];
  assert.deepEqual([month.from, month.to, month.prevFrom, month.prevTo, month.cut], ['2026-11', '2026-11', '2026-10', '2026-10', 14]);
  assert.equal(month.kpis.sends, 1);
  // Octubre solo hasta el 14: el envío del 20 no entra. Dos envíos de la misma maqueta son una comunicación.
  assert.equal(month.prev.sends, 2);
  assert.equal(month.prev.comms, 1);
  const quarter = overview.periods[3];
  assert.deepEqual([quarter.from, quarter.prevFrom, quarter.prevTo], ['2026-09', '2026-06', '2026-08']);
  assert.equal(quarter.kpis.sends, 5);
  assert.equal(quarter.prev.sends, 2);
  assert.equal(quarter.calendar.from, '2026-09');
  assert.deepEqual(Object.keys(quarter.calendar.days).sort(), ['2026-09-10', '2026-10-05', '2026-10-06', '2026-10-20', '2026-11-02']);
  assert.equal(quarter.rules[0].name, 'No abren correos');
  assert.equal(quarter.families[0].name, 'Promociones');
  assert.equal(quarter.families[0].sends, 5);
  assert.equal(quarter.families[0].drop.com, 0.6);
  assert.equal(quarter.drops.total, 0.61);
  assert.equal(quarter.prevDrops.total, 0.61);
  assert.equal(overview.history[24].drops.asl, 0.4);
  assert.equal(overview.history[0].drops, null, 'Un mes sin envíos no tiene caídas.');
  // El histórico no cuenta el mes en curso.
  assert.equal(overview.historic.sends, 6);
  assert.equal(overview.total, 7);
});

test('buildPeriod: meses cerrados sin corte, y rangos a elección', () => {
  const records = [rec(1, '2026-10-05T09:00:00'), rec(2, '2026-10-28T09:00:00'), rec(3, '2026-09-10T09:00:00'), rec(4, '2026-08-30T09:00:00'),
    rec(5, '2026-07-10T09:00:00')];
  const closed = buildPeriod(records, info, '2026-09', '2026-10', '2026-11-14');
  assert.deepEqual([closed.prevFrom, closed.prevTo, closed.cut], ['2026-07', '2026-08', null]);
  assert.equal(closed.kpis.sends, 3);
  assert.equal(closed.prev.sends, 2);
  assert.equal(closed.calendar.from, '2026-08');
  const single = buildPeriod(records, info, '2026-10', '2026-10', '2026-11-14');
  assert.equal(single.kpis.sends, 2, 'Un mes cerrado entra completo.');
});

test('buildPeriod señala la comunicación que se aleja de su familia', () => {
  const records = [1, 2, 3, 4, 5].map(job => rec(job, `2026-10-0${job}T09:00:00`, { name: `N${job}`, sends: 1000, deliv: 1000, opens: 200 }));
  records.push(rec(9, '2026-10-09T09:00:00', { name: 'BAJA', sends: 1000, deliv: 1000, opens: 20 }));
  const review = buildPeriod(records, info, '2026-10', '2026-10', '2026-11-14').review;
  assert.equal(review.length, 1);
  assert.equal(review[0].name, 'BAJA');
  assert.equal(review[0].metric, 'or');
});

test('buildMonth y buildDetail', () => {
  const records = [rec(1, '2026-10-05T09:00:00'), rec(2, '2026-10-05T11:00:00', { base: 5000, sends: 4400, deliv: 4390 }), rec(3, '2026-09-01T09:00:00')];
  const month = buildMonth(records, info, '2026-10');
  assert.equal(month.items.length, 2);
  assert.deepEqual(month.days, { '2026-10-05': 2 });
  assert.equal(month.items[0].asl, 400);
  assert.equal(month.items[0].blq, 200);
  const detail = buildDetail(records, info, '1', '2026-11-14');
  assert.equal(detail.record.name, 'M1');
  assert.equal(detail.record.motives, undefined);
  assert.equal(detail.motives[0].code, 'ASL_NO_OPENERS');
  assert.equal(detail.motives[0].share, 400 / 600);
  assert.equal(detail.asl, 400);
  assert.equal(detail.blq, 200);
  assert.equal(detail.rates.complaint, 0);
  assert.equal(detail.normal.rates.complaint, 0);
  const per100 = Object.values(detail.normal.per100).reduce((sum, value) => sum + value, 0);
  assert.ok(Math.abs(per100 - 100) < 1e-9);
  assert.equal(buildDetail(records, info, 'nope', '2026-11-14'), null);
});

test('búsqueda: palabras separadas por coma, sin tildes ni mayúsculas, con O o Y', () => {
  assert.deepEqual(metricSearchTerms(' promo, Cybér ,, '), ['PROMO', 'CYBER']);
  const records = [
    rec(1, '2026-10-05T09:00:00', { name: '20261005_PROMO_VIAJES', family: 'Promociones' }),
    rec(2, '2026-10-06T09:00:00', { name: '20261006_CYBER_TC_OFERTA', family: 'Cyber' }),
    rec(3, '2026-10-07T09:00:00', { name: '20261007_CYBER_PROMO_CUOTAS', family: 'Cyber' }),
    rec(55, '2026-09-01T09:00:00', { name: '20260901_NEWSLETTER', family: 'Newsletter' })
  ];
  const any = buildSearch(records, info, 'promo, cyber', 'O', 10);
  assert.deepEqual(any.items.map(item => item.job), ['3', '2', '1'], 'Más recientes primero.');
  assert.deepEqual(buildSearch(records, info, 'promo, cyber', 'Y', 10).items.map(item => item.job), ['3']);
  // El JobID exacto va primero aunque sea más antiguo; el resumen trae el motivo principal.
  const byJob = buildSearch(records, info, '55, promo', 'O', 10);
  assert.equal(byJob.items[0].job, '55');
  assert.equal(byJob.items[0].top.name, 'No abren correos');
  assert.equal(buildSearch(records, info, 'promo, cyber', 'O', 2).total, 3);
  assert.equal(buildSearch(records, info, ' , ', 'O', 10).total, 0);
});

test('buildCompare: cada comunicación por separado, con los motivos de más peso', () => {
  const records = [
    rec(1, '2026-10-05T09:00:00', { base: 1000, notSent: 600, motives: { ASL_NO_OPENERS: 400, Held: 200 } }),
    rec(2, '2026-10-06T09:00:00', { base: 2000, notSent: 500, motives: { ASL_NO_OPENERS: 100, ASL_SATURACION_MENSUAL: 400 } })
  ];
  const compare = buildCompare(records, info, ['2', '1', '999']);
  assert.deepEqual(compare.items.map(item => item.job), ['2', '1'], 'En el orden pedido.');
  assert.deepEqual(compare.missing, ['999']);
  assert.equal(compare.motives[0].code, 'ASL_NO_OPENERS');
  const first = compare.items[1];
  assert.equal(first.blq, 200);
  assert.equal(first.asl, 400);
  const held = compare.motives.findIndex(motive => motive.code === 'Held');
  assert.equal(first.shares[held], 0.2);
  assert.equal(compare.items[0].shares[held], 0);
});
