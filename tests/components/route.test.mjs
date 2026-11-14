// Estado en el enlace y descarga para Excel: funciones puras (sin navegador).
import { test, expect } from 'vitest';
import { parseRoute, routeOf } from '@/state/route.mjs';
import { csvCell, csvName, toCsv } from '@/lib/csv.mjs';

const base = { view: 'general', period: { len: 1, from: '', to: '' }, pick: { month: '', day: '', job: '', tab: '' }, jobs: [] };

test('la vista general en el mes en curso no deja nada en el enlace', () => {
  expect(routeOf(base)).toBe('');
  expect(parseRoute('').view).toBe('general');
});

test('ida y vuelta: periodo, comunicación abierta y comparación', () => {
  const range = routeOf({ ...base, period: { len: 'range', from: '2026-03', to: '2026-08' } });
  expect(parseRoute(range).period).toEqual({ len: 'range', from: '2026-03', to: '2026-08' });
  const six = parseRoute(routeOf({ ...base, period: { len: 6, from: '', to: '2026-09' } }));
  expect(six.period).toEqual({ len: 6, from: '', to: '2026-09' });
  const comm = parseRoute(`#${routeOf({ ...base, view: 'comm', pick: { month: '2026-11', day: '2026-11-14', job: '12345', tab: 'pareto' } })}`);
  expect(comm.view).toBe('comm');
  expect(comm.pick).toEqual({ month: '2026-11', day: '2026-11-14', job: '12345', tab: 'pareto' });
  const compare = parseRoute(routeOf({ ...base, view: 'compare', jobs: ['1', '2', '3'] }));
  expect(compare.jobs).toEqual(['1', '2', '3']);
});

test('un enlace mal copiado no rompe nada: se descarta lo inválido', () => {
  const route = parseRoute('v=otra&p=7&hasta=2026-13&mes=2026-11&dia=2026-10-02&envio=<script>&envios=1,1,a b,2');
  expect(route.view).toBe('general');
  expect(route.period).toEqual({ len: 1, from: '', to: '' });
  // El día no es del mes: se descarta.
  expect(route.pick.day).toBe('');
  expect(route.pick.job).toBe('');
  expect(route.jobs).toEqual(['1', '2']);
});

test('CSV para Excel: BOM, comillas, números y sin fórmulas', () => {
  expect(csvCell('a,b')).toBe('"a,b"');
  expect(csvCell('dijo "hola"')).toBe('"dijo ""hola"""');
  expect(csvCell('=SUMA(A1)')).toBe("'=SUMA(A1)");
  expect(csvCell(0.125)).toBe('0.125');
  expect(csvCell(null)).toBe('');
  const text = toCsv([{ label: 'Nombre', value: row => row.name }, { label: 'Tasa', value: row => row.rate }], [{ name: 'Promoción', rate: 0.5 }]);
  expect(text.charCodeAt(0)).toBe(0xfeff);
  expect(text.slice(1)).toBe('Nombre,Tasa\r\nPromoción,0.5\r\n');
  expect(csvName('Motivos', 'PROMO/VIAJES', '2026-11-14')).toBe('Motivos PROMO-VIAJES 2026-11-14.csv');
});
