// Filas de prueba con las cabeceras reales de EmailSummary_NotSent (las de los datos de ejemplo).
import { SAMPLE_HEADERS } from '../../src/local/sampleData.mjs';

/** Una fila: valores por cabecera; lo que falta queda vacío. */
export function row(values) {
  return SAMPLE_HEADERS.map(header => (header in values ? values[header] : ''));
}

/** Envío simple: base, enviados, entregados, aperturas y motivos { cabecera: cantidad }. */
export function send({ job, name = `20261005_PROMO_${job}`, start = '10/5/2026 9:00:00 AM', base = 1000, sends = 400, deliv = 390, opens = 39, clicks = 4, unsubs = 0, motives = {} }) {
  const notSent = base - sends;
  return row({
    ClientName: 'BBVA Clientes', JobID: job, EmailName: name, SendStartTime: start, SendCompleteTime: start, TotalBase: base, Sends: sends,
    'Total NotSent': notSent, ImplicitDeliveries: deliv, OverallBounces: sends - deliv, HardBounces: sends - deliv, UniqueOpens: opens,
    CumulativeOpens: opens * 2, UniqueClicks: clicks, UniqueUnsubscribes: unsubs, OpenRate: `${((opens / deliv) * 100).toFixed(2)}%`,
    ...(Object.keys(motives).length ? motives : { ASL_NO_OPENERS: notSent })
  });
}

export { SAMPLE_HEADERS };
