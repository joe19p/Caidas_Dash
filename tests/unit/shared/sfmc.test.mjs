import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sfmcCount, sfmcDateTime, sfmcFamily, sfmcRecord, sfmcMotiveHeaders, sfmcCatalog, sfmcMotiveInfo } from '../../../src/shared/sfmc.mjs';

test('sfmcCount acepta números, separadores de miles y vacíos', () => {
  assert.equal(sfmcCount(6), 6);
  assert.equal(sfmcCount('12,500'), 12500);
  assert.equal(sfmcCount('12.500'), 12500);
  assert.equal(sfmcCount('1,234,567'), 1234567);
  assert.equal(sfmcCount('7.6'), 8);
  assert.equal(sfmcCount(''), 0);
  assert.equal(sfmcCount('abc'), 0);
  assert.equal(sfmcCount(-3), 0);
});

test('sfmcDateTime lee el formato de SFMC (mes/día, AM/PM) y el de Sheets', () => {
  assert.equal(sfmcDateTime('9/1/2026 1:39:39 AM'), '2026-09-01T01:39:39');
  assert.equal(sfmcDateTime('9/1/2026 1:39:39 PM'), '2026-09-01T13:39:39');
  assert.equal(sfmcDateTime('12/31/2026 12:05:00 AM'), '2026-12-31T00:05:00');
  assert.equal(sfmcDateTime('12/31/2026 12:05:00 PM'), '2026-12-31T12:05:00');
  assert.equal(sfmcDateTime('2026-11-03 08:15:00'), '2026-11-03T08:15:00');
  assert.equal(sfmcDateTime('2026-11-03'), '2026-11-03T00:00:00');
  assert.equal(sfmcDateTime(''), '');
  assert.equal(sfmcDateTime('mañana'), '');
});

test('sfmcFamily reconoce la familia por el nombre de la maqueta', () => {
  assert.equal(sfmcFamily('20261112_CYBER_TC_OFERTA'), 'Cyber');
  assert.equal(sfmcFamily('20261110_ONBOARDING_CTA_D1'), 'Onboarding');
  assert.equal(sfmcFamily('20261105_ESTADO_CUENTA_TC'), 'Transaccional');
  assert.equal(sfmcFamily('20261105_promo_seguros'), 'Promociones');
  assert.equal(sfmcFamily('Report_Tracking_Code'), 'Otras');
});

test('sfmcRecord arma el envío, suma columnas repetidas y completa totales', () => {
  const headers = ['JobID', 'EmailName', 'SendStartTime', 'TotalBase', 'Sends', 'HardBounces', 'SoftBounces', 'UniqueOpens', 'OpenRate', 'Held', 'List Level Opt Out', 'List Level Opt Out#40'];
  const motives = sfmcMotiveHeaders(headers);
  assert.deepEqual(motives, ['Held', 'List Level Opt Out', 'List Level Opt Out#40']);
  const record = sfmcRecord({ JobID: 3425426, EmailName: 'X_CYBER', SendStartTime: '9/1/2026 1:39:39 AM', TotalBase: '', Sends: 100,
    HardBounces: 3, SoftBounces: 2, UniqueOpens: 20, OpenRate: '21.05%', Held: 5, 'List Level Opt Out': 1, 'List Level Opt Out#40': 2 }, motives);
  assert.equal(record.job, '3425426');
  assert.equal(record.notSent, 8);
  assert.equal(record.base, 108);
  assert.equal(record.bounces, 5);
  assert.equal(record.deliv, 95);
  assert.deepEqual(record.motives, { Held: 5, 'List Level Opt Out': 3 });
  assert.equal(record.family, 'Cyber');
  assert.equal(sfmcRecord({ JobID: '', SendStartTime: '9/1/2026' }, motives), null);
  assert.equal(sfmcRecord({ JobID: 1, SendStartTime: '' }, motives), null);
});

test('el catálogo da nombre y origen; sin catálogo se deduce por el código', () => {
  const catalog = sfmcCatalog(
    [{ ASL_Cod: 'ASL_NO_OPENERS', 'Descripción Corta': 'No abren', ASL_Description: 'CRM PE', ASL_AttributionPriority: '6' }],
    [{ NS_Cod: 'Held', NS_ShortName: 'Retenidos', NS_Description: 'SFMC' }]
  );
  assert.deepEqual(sfmcMotiveInfo('ASL_NO_OPENERS', catalog), { name: 'No abren', description: 'CRM PE', origin: 'asl', priority: 6 });
  assert.equal(sfmcMotiveInfo('Held', catalog).origin, 'blq');
  assert.equal(sfmcMotiveInfo('Unsubscribed Master', {}).origin, 'blq');
  assert.equal(sfmcMotiveInfo('Unsubscribed Master', {}).name, 'Baja global');
  assert.equal(sfmcMotiveInfo('ASL_NUEVA', {}).origin, 'asl');
  assert.equal(sfmcMotiveInfo('ASL_NUEVA', {}).name, 'ASL_NUEVA');
});
