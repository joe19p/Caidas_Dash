// Datos de ejemplo para `npm run dev` y las pruebas: envíos con la misma forma que el reporte de SFMC (textos «83.33%»,
// fechas «9/1/2026 1:39:39 AM») y los catálogos de motivos. Con semilla fija: siempre salen los mismos números.

// Motivos en el orden de la pestaña real, con su peso típico en lo no enviado (%) y su origen.
export const SAMPLE_MOTIVES = [
  ['SATURACION_1D', 0.3, 'asl'], ['EXCLUSIÓN DEFINITIVA', 0.18, 'asl'], ['ASL_INDESEADOS', 0.1, 'asl'], ['AS_BASE_LISTA_NEGRA', 0.05, 'asl'],
  ['AS_BASE_EXCLUSION_HOTMAIL', 2.9, 'asl'], ['ASL_NO_OPENERS', 40.45, 'asl'], ['ASL_Cobranzas', 0.08, 'asl'], ['ASL_SATURACION_MENSUAL', 8.69, 'asl'],
  ['ASL_EXCLUSION_LPDP_NOACEPTADO', 1.87, 'asl'], ['ASL_ONBOARDING', 0.05, 'asl'], ['ASL_SATURACION_SEMANAL', 0.4, 'asl'], ['ASL_NOCONTACTO', 0.05, 'asl'],
  ['ASL_CLIENTES_RECLAMO', 1.62, 'asl'], ['ASL_CONTROL_SATURACION', 2.61, 'asl'], ['Exclusion_NC', 1.67, 'asl'], ['Exclusion_HardBounces', 11.18, 'asl'],
  ['Exclusion_SoftBounces', 8.74, 'asl'], ['Exclusion_Complaints', 0.96, 'asl'], ['Exclusion_DataCleaning', 0.05, 'asl'], ['Re-engage no contactables', 4.75, 'asl'],
  ['Account Level Opt Out', 3.38, 'blq'], ['Excluded by List Detective', 0.04, 'blq'], ['Held', 5.65, 'blq'], ['List Level Opt Out', 0.04, 'blq'],
  ['Unsubscribed', 0.06, 'blq'], ['Unsubscribed List', 0.02, 'blq'], ['Unsubscribed Master', 5.03, 'blq'], ['List Level Opt Out', 0.02, 'blq'],
  ['Subscriber Deleted', 0.01, 'blq']
];

export const SAMPLE_HEADERS = ['ClientID', 'ClientName', 'JobID', 'EmailName', 'SendStartTime', 'SendCompleteTime', 'TotalBase', 'Sends',
  'Total NotSent', 'ImplicitDeliveries', 'ImplicitDeliveryRate', 'OverallBounces', 'OverallBounceRate', 'HardBounces', 'HardBounceRate',
  'SoftBounces', 'SoftBounceRate', 'BlockBounces', 'BlockBounceRate', 'TechnicalBounces', 'TechnicalBounceRate', 'UnknownBounces',
  'UnknownBounceRate', 'UniqueOpens', 'CumulativeOpens', 'OpenRate', 'UniqueClicks', 'CumulativeClicks', 'ClickRate', 'UniqueComplaints',
  'CumulativeComplaints', 'ComplaintRate', 'UniqueUnsubscribes', 'CumulativeUnsubscribes', 'UnsubscribeRate', ...SAMPLE_MOTIVES.map(motive => motive[0])];

export const SAMPLE_ASL_CATALOG = [
  ['ASL_Cod', 'ASL_Name', 'Descripción Corta', 'ASL_Description', 'ASL_AttributionPriority'],
  ['ASL_NO_OPENERS', 'ASL_NO_OPENERS', 'No abren correos', 'CRM PE · Personas que no abren las comunicaciones de email', 6],
  ['Exclusion_HardBounces', 'Exclusion_HardBounces', 'Rebote hard previo', 'CRM Holding · Personas que se excluyen por rebotes hard', 3],
  ['Exclusion_SoftBounces', 'Exclusion_SoftBounces', 'Rebote soft previo', 'CRM Holding · Personas que se excluyen por rebotes soft', 4],
  ['ASL_SATURACION_MENSUAL', 'ASL_SATURACION_MENSUAL', 'Saturación mensual', 'CRM PE · Personas que superaron la saturación mensual de email', 9],
  ['ASL_CONTROL_SATURACION', 'ASL_CONTROL_SATURACION', 'Saturación diaria', 'CRM PE · Personas que superaron la saturación diaria de email', 10],
  ['Re-engage no contactables', 'Re-engage no contactables', 'En re-engage', 'CRM Holding · Personas que se encuentran en el proceso de re-engage', 7],
  ['AS_BASE_EXCLUSION_HOTMAIL', 'AS_BASE_EXCLUSION_HOTMAIL', 'Hotmail sin apertura', 'CRM PE · Personas no clientes que tienen Hotmail sin apertura', 8],
  ['ASL_EXCLUSION_LPDP_NOACEPTADO', 'ASL_EXCLUSION_LPDP_NOACEPTADO', 'Sin aceptación LPDP', 'CRM PE · Personas que no cumplen con la aceptación LPDP', 2],
  ['Exclusion_NC', 'Exclusion_NC', 'Marca No Cliente', 'CRM PE · Personas con marca de NoCliente, para evitar envíos desde BU Clientes', 11],
  ['ASL_CLIENTES_RECLAMO', 'ASL_CLIENTES_RECLAMO', 'Reclamos y moras', 'CRM PE · Personas que presentan reclamos y moras', 5],
  ['Exclusion_Complaints', 'Exclusion_Complaints', 'Marcaron como spam', 'CRM Holding · Personas que han marcado como spam los correos enviados', 3],
  ['EXCLUSIÓN DEFINITIVA', 'EXCLUSIÓN DEFINITIVA', 'Exclusión definitiva', 'CRM PE · Personas que tienen FLG_FALLECIDO activo', 1]
];

export const SAMPLE_NOT_SENT_CATALOG = [
  ['NS_Cod', 'NS_Name', 'NS_ShortName', 'NS_Description'],
  ['Held', 'Held', 'Retenidos (Held)', 'El suscriptor está retenido (no entregable) en todas las listas por múltiples rebotes.'],
  ['Unsubscribed Master', 'Unsubscribed Master', 'Baja global', 'El suscriptor se dio de baja a nivel maestro: excluido de todas las comunicaciones de la cuenta.'],
  ['Account Level Opt Out', 'Account Level Opt Out', 'Baja de la cuenta', 'El suscriptor se dio de baja a nivel de cuenta, empresa o unidad de negocio.'],
  ['Unsubscribed', 'Unsubscribed', 'Baja', 'El suscriptor tiene un estado de baja en las listas de suscriptores.']
];

// [familia, prefijo, sufijos, % no enviado, apertura, CTOR, audiencia]
const FAMILIES = [
  ['CYBER', ['TC_OFERTA', 'PRESTAMO_PREAPROB', 'SEGURO_AUTO', 'CUOTAS_0'], [0.62, 0.84], [0.06, 0.13], [0.008, 0.02], [400000, 2400000]],
  ['PROMO', ['PLIN_CASHBACK', 'SEGUROS_VIDA', 'TC_DESCUENTOS', 'VIAJES', 'FONDOS'], [0.5, 0.78], [0.08, 0.18], [0.01, 0.025], [150000, 1400000]],
  ['ONBOARDING', ['BIENVENIDA_APP', 'CTA_D1', 'CTA_D7', 'ACTIVA_TC'], [0.1, 0.3], [0.24, 0.38], [0.03, 0.06], [5000, 110000]],
  ['ESTADO_CUENTA', ['TC', 'AHORROS', 'HIPOTECARIO', 'VEHICULAR'], [0.22, 0.4], [0.18, 0.3], [0.015, 0.03], [300000, 3100000]],
  ['NEWSLETTER', ['MENSUAL', 'EDUCACION_FINANCIERA'], [0.45, 0.7], [0.1, 0.16], [0.01, 0.02], [500000, 1800000]]
];

function random(seed) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

const pct = (part, total) => `${(total ? (part / total) * 100 : 0).toFixed(2)}%`;
const usDateTime = (date, minutes) => {
  const d = new Date(date.getTime() + minutes * 60000);
  const hour = d.getUTCHours();
  const h12 = hour % 12 || 12;
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()} ${h12}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
};

/** Filas de EmailSummary_NotSent desde el primer día de hace 25 meses hasta hoy (incluye el mes en curso). */
export function sampleRows(today = new Date()) {
  const rnd = random(20261114);
  const rows = [SAMPLE_HEADERS];
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 25, 1));
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  let job = 3100000;
  for (let day = start; day.getTime() <= end; day = new Date(day.getTime() + 864e5)) {
    const weekday = day.getUTCDay();
    const month = day.getUTCMonth();
    const cyberSeason = month === 6 || month === 10;
    const count = weekday === 0 ? Math.floor(rnd() * 2) : weekday === 6 ? 2 + Math.floor(rnd() * 3) : 6 + Math.floor(rnd() * 8) + (cyberSeason ? 3 : 0);
    const monthsAgo = (today.getUTCFullYear() - day.getUTCFullYear()) * 12 + today.getUTCMonth() - month;
    const drift = 1 - monthsAgo / 25;
    for (let index = 0; index < count; index++) {
      const family = FAMILIES[cyberSeason && rnd() < 0.35 ? 0 : 1 + Math.floor(rnd() * (FAMILIES.length - 1))];
      const suffix = family[1][Math.floor(rnd() * family[1].length)];
      const name = `${day.getUTCFullYear()}${String(month + 1).padStart(2, '0')}${String(day.getUTCDate()).padStart(2, '0')}_${family[0]}_${suffix}`;
      const between = ([low, high]) => low + rnd() * (high - low);
      const base = Math.round(between(family[5]));
      const notSent = Math.round(base * Math.min(0.95, between(family[2]) + drift * 0.03));
      const sends = base - notSent;
      // Reparto de lo no enviado entre motivos: peso típico con variación por envío.
      const weights = SAMPLE_MOTIVES.map(([, weight]) => weight * (0.4 + rnd() * 1.4));
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
      const motives = weights.map(weight => Math.floor((notSent * weight) / totalWeight));
      motives[5] += notSent - motives.reduce((sum, value) => sum + value, 0);
      const bounceRate = 0.01 + rnd() * 0.03 + drift * 0.004;
      const bounces = Math.round(sends * bounceRate);
      const hard = Math.round(bounces * 0.6);
      const soft = Math.round(bounces * 0.36);
      const block = Math.round(bounces * 0.005);
      const tech = Math.round(bounces * 0.01);
      const unknown = bounces - hard - soft - block - tech;
      const deliv = sends - bounces;
      const opens = Math.round(deliv * Math.max(0.02, between(family[3]) - drift * 0.015));
      const opensCum = Math.round(opens * (1.5 + rnd() * 0.7));
      const clicks = Math.round(opens * between(family[4]));
      const clicksCum = Math.round(clicks * (1.2 + rnd() * 0.4));
      const complaints = Math.round(deliv * rnd() * 0.0002);
      const unsubs = Math.round(deliv * (0.0003 + rnd() * 0.0008 + (family[0] === 'CYBER' ? 0.0004 : 0)));
      const startTime = new Date(day.getTime() + (7 + Math.floor(rnd() * 11)) * 3600000 + Math.floor(rnd() * 4) * 900000);
      job += 1 + Math.floor(rnd() * 3);
      rows.push([100002531, 'BBVA Clientes', job, name, usDateTime(startTime, 0), usDateTime(startTime, 10 + Math.floor(rnd() * 50)), base, sends,
        notSent, deliv, pct(deliv, sends), bounces, pct(bounces, sends), hard, pct(hard, sends), soft, pct(soft, sends), block, pct(block, sends),
        tech, pct(tech, sends), unknown, pct(unknown, sends), opens, opensCum, pct(opens, deliv), clicks, clicksCum, pct(clicks, deliv),
        complaints, complaints, pct(complaints, deliv), unsubs, unsubs, pct(unsubs, deliv), ...motives]);
    }
  }
  return rows;
}

/** Spreadsheet inicial completo para el emulador. */
export function sampleSpreadsheet(today) {
  return {
    EmailSummary_NotSent: sampleRows(today),
    ASL_Catalog: SAMPLE_ASL_CATALOG,
    NotSent_Catalog: SAMPLE_NOT_SENT_CATALOG
  };
}
