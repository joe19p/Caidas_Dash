import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGas } from '../../helpers/loadGas.mjs';
import { send, SAMPLE_HEADERS } from '../../helpers/rows.mjs';
import { createFakeSpreadsheet } from '../../../src/local/gasEmulator.mjs';

const failure = error => JSON.parse(error.message.slice(error.message.indexOf('{')));
const sheet = rows => createFakeSpreadsheet({ EmailSummary_NotSent: [SAMPLE_HEADERS, ...rows] });

test('setupApplication registra la hoja, crea las pestañas que faltan y no duplica el activador', () => {
  const { context, spreadsheet, props, triggers } = loadGas({ spreadsheet: sheet([]), setup: false });
  const result = context.setupApplication();
  assert.equal(props.get('APP_SPREADSHEET_ID'), 'fake-spreadsheet');
  assert.deepEqual([...result.created], ['EmailSummary', 'NotSentData', 'ASL_Catalog', 'NotSent_Catalog']);
  assert.deepEqual([...spreadsheet.rows('NotSentData')[0]], ['Fecha', 'jobid', 'asl_cod', 'suppressedcount']);
  context.setupApplication();
  assert.equal(triggers.filter(trigger => trigger.handler === 'onDataChange').length, 1);
});

test('sin instalar, las funciones avisan que falta setupApplication', () => {
  const { context } = loadGas({ spreadsheet: sheet([]), setup: false });
  assert.throws(() => context.getOverview(), error => failure(error).code === 'APP_NOT_CONFIGURED');
});

test('getOverview, getMonth y getCommunication leen la hoja', () => {
  const { context } = loadGas({ spreadsheet: sheet([
    send({ job: 101, start: '10/5/2026 9:00:00 AM' }),
    send({ job: 102, start: '10/5/2026 11:30:00 AM', motives: { ASL_NO_OPENERS: 300, Held: 300 } }),
    send({ job: 103, start: '9/20/2026 9:00:00 AM' })
  ]) });
  const overview = context.getOverview();
  assert.ok(overview.total === 3 && overview.available.months.includes('2026-10'));
  const month = context.getMonth('2026-10');
  assert.equal(month.items.length, 2);
  assert.equal(month.items[0].start, '2026-10-05T09:00:00');
  const detail = context.getCommunication('102');
  assert.equal(detail.blq, 300);
  assert.equal(detail.motives.find(motive => motive.code === 'Held').origin, 'blq');
  assert.throws(() => context.getMonth('octubre'), error => failure(error).code === 'MONTH_INVALID');
  assert.throws(() => context.getCommunication('999'), error => failure(error).code === 'COMMUNICATION_NOT_FOUND');
});

test('los envíos que solo están en EmailSummary toman sus motivos de NotSentData', () => {
  const fake = createFakeSpreadsheet({
    EmailSummary_NotSent: [SAMPLE_HEADERS],
    EmailSummary: [['JobID', 'EmailName', 'SendStartTime', 'Sends', 'ImplicitDeliveries', 'UniqueOpens'], [555, 'Report_Tracking_Code', '9/1/2026 1:39:39 AM', 6, 6, 5]],
    NotSentData: [['Fecha', 'jobid', 'asl_cod', 'suppressedcount'], ['9/1/2026', 555, 'ASL_NO_OPENERS', 4], ['9/1/2026', 555, 'Held', 2]]
  });
  const { context } = loadGas({ spreadsheet: fake });
  const detail = context.getCommunication('555');
  assert.equal(detail.record.base, 12);
  assert.equal(detail.record.notSent, 6);
  assert.equal(detail.blq, 2);
});

test('las fechas que Sheets entrega como Date se leen en hora de Lima', () => {
  const values = send({ job: 7 });
  values[SAMPLE_HEADERS.indexOf('SendStartTime')] = new Date('2026-10-05T14:30:00Z');
  const { context } = loadGas({ spreadsheet: sheet([values]) });
  assert.equal(context.getMonth('2026-10').items[0].start, '2026-10-05T09:30:00');
});

test('refreshData y onDataChange dejan la caché sin uso', () => {
  const fake = sheet([send({ job: 1, start: '10/5/2026 9:00:00 AM' })]);
  const { context, props } = loadGas({ spreadsheet: fake });
  assert.equal(context.getOverview().total, 1);
  fake.store.sheets.get('EmailSummary_NotSent').rows.push(send({ job: 2, start: '10/6/2026 9:00:00 AM' }));
  assert.equal(context.getOverview().total, 1, 'Sin cambio de versión, sale de la caché.');
  const before = props.get('APP_DATA_VERSION');
  assert.equal(context.refreshData().total, 2);
  assert.notEqual(props.get('APP_DATA_VERSION'), before);
  context.onDataChange();
  assert.equal(Number(props.get('APP_DATA_VERSION')), Number(before) + 2);
});

test('doGet incluye la vista general en la página', () => {
  const { context } = loadGas({ spreadsheet: sheet([send({ job: 1 })]) });
  const output = context.doGet();
  assert.equal(output.title, 'Caídas de email');
  const boot = JSON.parse(output.content.match(/APP_BOOT=(.*?);<\/script>/)[1]);
  assert.equal(boot.overview.total, 1);
  assert.equal(boot.email, 'admin@example.com');
});
