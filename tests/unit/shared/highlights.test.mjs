import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHighlights } from '../../../src/shared/highlights.mjs';

const rate = value => ({ com: value, vol: value, lo: value, hi: value, n: 1 });
const kpis = (or, extra = {}) => ({ comms: 10, sends: 12, metrics: { or: rate(or), deliv: rate(0.97), ctor: rate(0.11), bounce: rate(0.014), unsub: rate(0.002), ...extra } });
const history = or => or.map((value, index) => ({ month: `2026-${String(index + 1).padStart(2, '0')}`, partial: index === or.length - 1, ...kpis(value) }));

function period(values = {}) {
  return {
    from: '2026-09', to: '2026-11', cut: 14,
    kpis: kpis(0.2), prev: kpis(0.2),
    drops: { total: 0.15 }, prevDrops: { total: 0.15 },
    rules: [], families: [], review: [], calendar: { days: {} },
    ...values
  };
}

test('sin cambios que pasen su umbral no hay frases', () => {
  const months = history([0.2, 0.21, 0.19, 0.2, 0.2, 0.21, 0.2, 0.2, 0.205, 0.2, 0.2]);
  assert.deepEqual(buildHighlights({ period: period(), history: months, mode: 'com' }), []);
});

test('el mes en curso con la mejor apertura de los 24 meses va primero', () => {
  const months = history([0.2, 0.21, 0.19, 0.2, 0.2, 0.21, 0.2, 0.2, 0.205, 0.2, 0.226]);
  const [first] = buildHighlights({ period: period({ to: '2026-11' }), history: months, mode: 'com' });
  assert.equal(first.tone, 'good');
  assert.equal(first.text, 'El mes en curso va con la mejor apertura de los últimos 24 meses: 22.6% en sus primeros 14 días.');
});

test('el indicador que más se movió, con su tono según hacia dónde es mejor', () => {
  const months = history([0.2, 0.2]);
  const [move] = buildHighlights({ period: period({ kpis: kpis(0.2, { ctor: rate(0.1104) }), prev: kpis(0.2, { ctor: rate(0.1142) }) }), history: months, mode: 'com' });
  assert.equal(move.metric, 'ctor');
  assert.equal(move.tone, 'bad');
  assert.equal(move.text, 'El clic sobre apertura bajó 0.38 pts frente al periodo anterior: de 11.42% a 11.04%.');
  const [bounce] = buildHighlights({ period: period({ kpis: kpis(0.2, { bounce: rate(0.012) }), prev: kpis(0.2, { bounce: rate(0.0136) }) }), history: months, mode: 'com' });
  assert.equal(bounce.tone, 'good', 'Que baje el rebote es bueno.');
});

test('caídas, reglas, familias, comunicaciones a revisar y día de la semana', () => {
  const days = {};
  for (let day = 1; day <= 28; day++) days[`2026-09-${String(day).padStart(2, '0')}`] = { comms: day % 7 === 1 ? 9 : 3 };
  const items = buildHighlights({
    history: history([0.2, 0.2]), mode: 'vol',
    period: period({
      drops: { total: 0.152 }, prevDrops: { total: 0.16 },
      rules: [{ code: 'FREQ', name: 'Frecuencia', share: { com: 0.3, vol: 0.314 }, prev: { com: 0.3, vol: 0.302 } }],
      families: [{ name: 'Promociones', or: rate(0.2) }, { name: 'Reactivación', or: rate(0.11) }],
      review: [{ family: 'Promociones', name: 'A', job: '1', start: '2026-11-10T09:00:00' }, { family: 'Promociones', name: 'B', job: '2', start: '2026-11-10T10:00:00' }],
      calendar: { days }
    })
  });
  assert.equal(items.length, 5);
  assert.equal(items[0].text, 'No reciben el correo 15.2 de cada 100 personas, 0.8 menos que en el periodo anterior.');
  assert.equal(items[1].text, 'La regla «Frecuencia» pesa 1.2 pts más en lo que no se envió que en el periodo anterior.');
  assert.equal(items[2].text, 'Reactivación abre 11.0%, 9.0 pts bajo la apertura del periodo (20.0%).');
  assert.equal(items[3].text, '2 de las 2 comunicaciones a revisar son de Promociones.');
  // 1 de setiembre de 2026 es martes.
  assert.equal(items[4].text, 'Los martes salen más comunicaciones: 9.0 por día en promedio.');
});
