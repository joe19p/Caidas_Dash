import { test, expect } from 'vitest';
import { fmtInt, fmtPct, fmtPts, fmtShort, monthRange, largestRemainder, weekdayIndex, addDays, dayLong } from '@/lib/format.mjs';

test('formatos de números y fechas', () => {
  expect(fmtInt(96313123)).toBe('96,313,123');
  expect(fmtPct(0.1378)).toBe('13.8%');
  expect(fmtPct(0.0172)).toBe('1.72%');
  expect(fmtPct(null)).toBe('—');
  expect(fmtPts(-0.008)).toBe('−0.8 pts');
  expect(fmtShort(23933514)).toBe('23.9 M');
  expect(monthRange('2026-08', '2026-10')).toBe('ago 26 – oct 26');
  expect(monthRange('2026-10', '2026-10')).toBe('octubre 2026');
  expect(weekdayIndex('2026-11-02')).toBe(0);
  expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  expect(dayLong('2026-11-12')).toBe('jueves 12 de nov');
});

test('largestRemainder reparte exactamente 100', () => {
  const parts = largestRemainder([4979088, 31153670, 1014450, 8429579, 50735425]);
  expect(parts.reduce((sum, value) => sum + value, 0)).toBe(100);
  expect(parts).toEqual([5, 32, 1, 9, 53]);
});
