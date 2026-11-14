/**
 * Lectura del reporte de Marketing Cloud (SFMC) tal como llega a la hoja: números con separadores, tasas como
 * texto «83.33%» y fechas «9/1/2026 1:39:39 AM». Todo es puro: lo usa el servidor (entra en Code.gs) y las pruebas.
 *
 * Cada fila de EmailSummary_NotSent es un envío (JobID) con sus totales y, desde la columna de bajas en adelante,
 * una columna por motivo de no envío: listas de autosupresión del CRM o estados de SFMC (bloqueos preventivos).
 */

/** Columnas de métricas de la pestaña EmailSummary_NotSent (cabecera exacta → campo). */
const SFMC_FIELDS = Object.freeze({
  ClientID: 'clientId', ClientName: 'client', JobID: 'job', EmailName: 'name',
  SendStartTime: 'start', SendCompleteTime: 'end', TotalBase: 'base', Sends: 'sends', 'Total NotSent': 'notSent',
  ImplicitDeliveries: 'deliv', OverallBounces: 'bounces', HardBounces: 'hard', SoftBounces: 'soft', BlockBounces: 'block',
  TechnicalBounces: 'tech', UnknownBounces: 'unknown', UniqueOpens: 'opens', CumulativeOpens: 'opensCum',
  UniqueClicks: 'clicks', CumulativeClicks: 'clicksCum', UniqueComplaints: 'complaints', UniqueUnsubscribes: 'unsubs'
});

/** Cabeceras que no son motivos aunque estén en la pestaña (tasas y acumulados que la app no usa). */
const SFMC_IGNORED = Object.freeze(['ImplicitDeliveryRate', 'OverallBounceRate', 'HardBounceRate', 'SoftBounceRate', 'BlockBounceRate',
  'TechnicalBounceRate', 'UnknownBounceRate', 'OpenRate', 'ClickRate', 'CumulativeComplaints', 'ComplaintRate',
  'CumulativeUnsubscribes', 'UnsubscribeRate', 'ComplaintDeliveries', 'UniqueSurveyResponses', 'CumulativeSurveyResponses',
  'SurveyResponseRate', 'UniqueConversions', 'CumulativeConversions', 'ConversionRate', 'UniqueFTAFs', 'CumulativeFTAFs', 'FTAFRate',
  'UniqueFTAFRecipients', 'CumulativeFTAFRecipients', 'FTAFRecipientRate', 'UniqueFTAFSubscribers', 'CumulativeFTAFSubscribers',
  'FTAFSubscriberRate']);

/** Estados de SFMC que no envían (bloqueos preventivos), por si NotSent_Catalog está vacía. */
const SFMC_BLOCK_REASONS = Object.freeze(['Account Level Opt Out', 'Excluded by List Detective', 'Held', 'List Level Opt Out',
  'Unsubscribed', 'Unsubscribed List', 'Unsubscribed Master', 'Subscriber Deleted']);

/** Nombre corto en español de cada motivo conocido (se usa si el catálogo no trae «Descripción Corta»). */
const SFMC_MOTIVE_NAMES = Object.freeze({
  ASL_NO_OPENERS: 'No abren correos', Exclusion_HardBounces: 'Rebote hard previo', Exclusion_SoftBounces: 'Rebote soft previo',
  ASL_SATURACION_MENSUAL: 'Saturación mensual', ASL_SATURACION_SEMANAL: 'Saturación semanal', ASL_CONTROL_SATURACION: 'Saturación diaria',
  SATURACION_1D: 'Saturación de 1 día', 'Re-engage no contactables': 'En re-engage', AS_BASE_EXCLUSION_HOTMAIL: 'Hotmail sin apertura',
  ASL_EXCLUSION_LPDP_NOACEPTADO: 'Sin aceptación LPDP', Exclusion_NC: 'Marca No Cliente', ASL_CLIENTES_RECLAMO: 'Reclamos y moras',
  Exclusion_Complaints: 'Marcaron como spam', 'EXCLUSIÓN DEFINITIVA': 'Exclusión definitiva', ASL_INDESEADOS: 'Indeseados',
  AS_BASE_LISTA_NEGRA: 'Lista negra', ASL_Cobranzas: 'Cobranzas', ASL_ONBOARDING: 'En onboarding', ASL_NOCONTACTO: 'No contactar',
  Exclusion_DataCleaning: 'Limpieza de datos', Held: 'Retenidos (Held)', 'Unsubscribed Master': 'Baja global',
  'Account Level Opt Out': 'Baja de la cuenta', 'List Level Opt Out': 'Baja de la lista', Unsubscribed: 'Baja',
  'Unsubscribed List': 'Baja de la lista', 'Excluded by List Detective': 'Excluido por List Detective', 'Subscriber Deleted': 'Suscriptor eliminado'
});

/** Familias de comunicación: se reconocen por una palabra del nombre de la maqueta. La primera que coincide gana. */
const SFMC_FAMILIES = Object.freeze([
  ['Cyber', ['CYBER']],
  ['Onboarding', ['ONBOARDING', 'BIENVENIDA']],
  ['Transaccional', ['ESTADO_CUENTA', 'EECC', 'TRANSACCIONAL', 'TRX']],
  ['Promociones', ['PROMO', 'CAMPANA', 'CAMPAÑA', 'OFERTA']]
]);

/** Entero ≥ 0: acepta 12500, "12,500", "12.500" o "12500.0". Vacío o inválido → 0. */
function sfmcCount(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  const text = String(value == null ? '' : value).replace(/\s/g, '');
  if (!text) return 0;
  const digits = /^\d{1,3}([.,]\d{3})+$/.test(text) ? text.replace(/[.,]/g, '') : text.replace(',', '.');
  const number = Number(digits);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

/** Fecha y hora local «AAAA-MM-DDTHH:mm:ss» desde «9/1/2026 1:39:39 AM» (mes/día) o «2026-09-01 01:39:39». */
function sfmcDateTime(value) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return '';
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}T${String(iso[4] || 0).padStart(2, '0')}:${iso[5] || '00'}:${iso[6] || '00'}`;
  const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?)?$/);
  if (!us) return '';
  let hour = Number(us[4] || 0);
  const meridiem = (us[7] || '').toUpperCase();
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  const pad = number => String(number).padStart(2, '0');
  return `${us[3]}-${pad(us[1])}-${pad(us[2])}T${pad(hour)}:${us[5] || '00'}:${us[6] || '00'}`;
}

/** Familia de una maqueta por su nombre; ninguna coincide → «Otras». */
function sfmcFamily(name) {
  const upper = String(name || '').toUpperCase();
  const found = SFMC_FAMILIES.find(([, words]) => words.some(word => upper.includes(word)));
  return found ? found[0] : 'Otras';
}

/**
 * Catálogo de motivos a partir de las pestañas ASL_Catalog y NotSent_Catalog (filas como objetos por cabecera).
 * Devuelve { código: { name, description, origin: 'asl' | 'blq', priority } }.
 */
function sfmcCatalog(aslRows, notSentRows) {
  const catalog = {};
  (aslRows || []).forEach(row => {
    const code = String(row.ASL_Cod || '').trim();
    if (!code) return;
    catalog[code] = {
      name: String(row['Descripción Corta'] || row.ASL_Name || SFMC_MOTIVE_NAMES[code] || code).trim(),
      description: String(row.ASL_Description || '').trim(),
      origin: 'asl',
      priority: Number(row.ASL_AttributionPriority) || 0
    };
  });
  (notSentRows || []).forEach(row => {
    const code = String(row.NS_Cod || '').trim();
    if (!code) return;
    catalog[code] = {
      name: String(row.NS_ShortName || row.NS_Name || SFMC_MOTIVE_NAMES[code] || code).trim(),
      description: String(row.NS_Description || '').trim(),
      origin: 'blq',
      priority: 0
    };
  });
  return catalog;
}

/** Datos de un motivo: del catálogo y, si no está, por su nombre (los estados de SFMC son bloqueos). */
function sfmcMotiveInfo(code, catalog) {
  const known = catalog && catalog[code];
  if (known) return known;
  return { name: SFMC_MOTIVE_NAMES[code] || code, description: '', origin: SFMC_BLOCK_REASONS.includes(code) ? 'blq' : 'asl', priority: 0 };
}

/** Código de un motivo a partir de su columna (una cabecera repetida llega como «Nombre#columna»). */
function sfmcMotiveCode(header) {
  return String(header).replace(/#\d+$/, '');
}

/** Qué columnas de la pestaña son motivos: todas las que no son métricas, tasas ni vacías. */
function sfmcMotiveHeaders(headers) {
  return (headers || []).filter(header => {
    const code = sfmcMotiveCode(header || '');
    return code && !SFMC_FIELDS[code] && !SFMC_IGNORED.includes(code);
  });
}

/**
 * Un envío a partir de su fila (cabecera → valor). Los motivos con el mismo nombre de columna se suman (la pestaña trae
 * «List Level Opt Out» dos veces). Fila sin JobID o sin fecha de envío → null.
 */
function sfmcRecord(row, motiveHeaders) {
  const job = String(row.JobID == null ? '' : row.JobID).trim();
  const start = sfmcDateTime(row.SendStartTime);
  if (!job || !start) return null;
  const record = { job, name: String(row.EmailName || '').trim(), client: String(row.ClientName || '').trim(), start, end: sfmcDateTime(row.SendCompleteTime) };
  Object.keys(SFMC_FIELDS).forEach(header => {
    const key = SFMC_FIELDS[header];
    if (!(key in record)) record[key] = sfmcCount(row[header]);
  });
  const motives = {};
  (motiveHeaders || []).forEach(header => {
    const count = sfmcCount(row[header]);
    const code = sfmcMotiveCode(header);
    if (count) motives[code] = (motives[code] || 0) + count;
  });
  record.motives = motives;
  const motiveTotal = Object.keys(motives).reduce((sum, code) => sum + motives[code], 0);
  if (!record.notSent) record.notSent = motiveTotal || Math.max(0, record.base - record.sends);
  if (!record.base) record.base = record.sends + record.notSent;
  if (!record.bounces) record.bounces = record.hard + record.soft + record.block + record.tech + record.unknown;
  if (!record.deliv && record.sends) record.deliv = Math.max(0, record.sends - record.bounces);
  record.family = sfmcFamily(record.name);
  return record;
}

export {
  SFMC_FIELDS, SFMC_IGNORED, SFMC_BLOCK_REASONS, SFMC_MOTIVE_NAMES, SFMC_FAMILIES,
  sfmcCount, sfmcDateTime, sfmcFamily, sfmcCatalog, sfmcMotiveInfo, sfmcMotiveCode, sfmcMotiveHeaders, sfmcRecord
};
