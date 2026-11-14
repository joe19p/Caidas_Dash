import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metricSummary, metricShiftMonth, metricMonthRange, metricLastClosed, metricMotiveShares, buildOverview, buildMonth, buildDetail } from '../../../src/shared/metrics.mjs';
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

test('buildOverview: periodos cerrados, comparación y sin sumar personas', () => {
  const records = [
    rec(1, '2026-10-05T09:00:00', { name: 'A' }), rec(2, '2026-10-06T09:00:00', { name: 'A' }), rec(3, '2026-09-10T09:00:00', { name: 'B' }),
    rec(4, '2026-08-10T09:00:00', { name: 'C' }), rec(5, '2026-07-10T09:00:00', { name: 'D' }), rec(6, '2026-11-02T09:00:00', { name: 'E' })
  ];
  const overview = buildOverview(records, info, '2026-11-14');
  assert.equal(overview.lastClosed, '2026-10');
  assert.equal(overview.history.length, 24);
  assert.equal(overview.history[23].month, '2026-10');
  const month = overview.periods[1];
  assert.deepEqual([month.from, month.to, month.prevFrom, month.prevTo], ['2026-10', '2026-10', '2026-09', '2026-09']);
  // Dos envíos de la misma maqueta: una comunicación distinta y dos envíos. Noviembre (en curso) no entra.
  assert.equal(month.kpis.comms, 1);
  assert.equal(month.kpis.sends, 2);
  assert.equal(month.prev.comms, 1);
  assert.equal(overview.periods[3].kpis.sends, 4);
  assert.equal(overview.periods[3].prev.sends, 1);
  assert.equal(overview.calendar.from, '2026-08');
  assert.deepEqual(Object.keys(overview.calendar.days).sort(), ['2026-08-10', '2026-09-10', '2026-10-05', '2026-10-06']);
  assert.equal(overview.periods[3].rules[0].name, 'No abren correos');
  assert.equal(overview.periods[3].families[0].name, 'Promociones');
  assert.equal(overview.total, 6);
});

test('buildOverview señala la comunicación que se aleja de su familia', () => {
  const records = [1, 2, 3, 4, 5].map(job => rec(job, `2026-10-0${job}T09:00:00`, { name: `N${job}`, sends: 1000, deliv: 1000, opens: 200 }));
  records.push(rec(9, '2026-10-09T09:00:00', { name: 'BAJA', sends: 1000, deliv: 1000, opens: 20 }));
  const review = buildOverview(records, info, '2026-11-14').periods[1].review;
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
  const per100 = Object.values(detail.normal.per100).reduce((sum, value) => sum + value, 0);
  assert.ok(Math.abs(per100 - 100) < 1e-9);
  assert.equal(buildDetail(records, info, 'nope', '2026-11-14'), null);
});
