// Caché del navegador: solo devuelve lo guardado con la clave vigente, borra lo de otras claves y, si el almacén
// falla, se comporta como si no hubiera caché.
import { test, expect } from 'vitest';
import { createLocalCache, createMemoryStore, openIndexedDbStore } from '@/services/localCache.mjs';

test('sin clave no lee ni guarda; con clave guarda y devuelve', async () => {
  const store = createMemoryStore();
  const cache = createLocalCache(() => store);
  await cache.put('month:2026-10', { items: [1] });
  expect(store.size()).toBe(0);
  expect(await cache.get('month:2026-10')).toBeNull();
  await cache.setDataKey('v1:2026-11-14');
  await cache.put('month:2026-10', { items: [1] });
  expect(await cache.get('month:2026-10')).toEqual({ items: [1] });
  expect(await cache.get('month:2026-09')).toBeNull();
});

test('una clave nueva borra lo guardado con la anterior; peek lo muestra mientras tanto', async () => {
  const store = createMemoryStore();
  const first = createLocalCache(() => store);
  await first.setDataKey('v1:2026-11-14');
  await first.put('overview', { total: 3 });
  await first.put('job:101', { record: {} });

  // Otra visita: todavía no sabe la clave, pero puede mostrar lo guardado.
  const second = createLocalCache(() => store);
  expect(await second.peek('overview')).toEqual({ dataKey: 'v1:2026-11-14', data: { total: 3 } });
  expect(await second.get('overview')).toBeNull();
  await second.setDataKey('v2:2026-11-14');
  expect(store.size()).toBe(0);
  expect(await second.peek('overview')).toBeNull();
});

test('si el almacén no abre o falla, no guarda nada y no rompe', async () => {
  const broken = createLocalCache(() => { throw new Error('bloqueado'); });
  await broken.setDataKey('v1:2026-11-14');
  await broken.put('overview', { total: 3 });
  expect(await broken.get('overview')).toBeNull();
  expect(await broken.peek('overview')).toBeNull();

  const failing = createLocalCache(() => ({ get: () => Promise.reject(new Error('x')), put: () => Promise.reject(new Error('x')), prune: () => Promise.reject(new Error('x')) }));
  await failing.setDataKey('v1:2026-11-14');
  await failing.put('overview', { total: 3 });
  expect(await failing.get('overview')).toBeNull();
});

test('sin IndexedDB el almacén no abre', async () => {
  await expect(openIndexedDbStore(undefined)).rejects.toThrow();
});
