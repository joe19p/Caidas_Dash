import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simLists, simulate, simRisk } from '../../../src/shared/simulator.mjs';

const detail = {
  record: { sends: 1000, opens: 100, bounces: 20, deliv: 980 },
  rates: { deliv: 0.98, or: 0.1 },
  motives: [
    { code: 'ASL_NO_OPENERS', name: 'No abren', origin: 'asl', count: 1000, share: 0.5 },
    { code: 'Exclusion_SoftBounces', name: 'Soft', origin: 'asl', count: 100, share: 0.05 },
    { code: 'Exclusion_HardBounces', name: 'Hard', origin: 'asl', count: 500, share: 0.25 },
    { code: 'Held', name: 'Retenidos', origin: 'blq', count: 400, share: 0.2 }
  ]
};

test('el simulador muestra solo autosupresión, con candados', () => {
  const lists = simLists(detail);
  assert.deepEqual(lists.map(list => list.code), ['ASL_NO_OPENERS', 'Exclusion_SoftBounces', 'Exclusion_HardBounces']);
  assert.equal(lists[2].lock, 'Protege la reputación del dominio');
  assert.equal(lists[1].delivery, 0.7);
});

test('apagar listas suma envíos, aperturas y rebotes; los candados se ignoran', () => {
  const none = simulate(detail, {});
  assert.equal(none.added, 0);
  assert.equal(none.sends, 1000);
  const result = simulate(detail, { ASL_NO_OPENERS: true, Exclusion_SoftBounces: true, Exclusion_HardBounces: true });
  assert.equal(result.added, 1100);
  assert.equal(result.sends, 2100);
  // No abren: 1000 × 0.98 × (0.1 × 0.07); soft: 100 × 0.7 × (0.1 × 0.45).
  assert.ok(Math.abs(result.addedOpens - (1000 * 0.98 * 0.007 + 100 * 0.7 * 0.045)) < 1e-9);
  assert.ok(Math.abs(result.bounceRateSim - (20 + 20 + 30) / 2100) < 1e-9);
  assert.equal(simRisk(0.02), 'sano');
  assert.equal(simRisk(0.04), 'vigilar');
  assert.equal(simRisk(0.06), 'riesgo');
});
