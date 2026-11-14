/**
 * Simulador «¿y si esta comunicación no aplicara una lista?». Es una estimación con supuestos explícitos:
 *   - A quien deja de excluirse se le entrega con la tasa de entrega del envío, salvo rebote soft previo (70 %).
 *   - No estima aperturas: a quien se excluye nunca se le envió, así que no hay datos con qué validar cuánto abriría.
 *   - No cuenta a quienes caerían en otra lista activa (SFMC atribuye cada persona a un solo motivo).
 * Los bloqueos preventivos de SFMC y las listas legales o de reputación no se pueden quitar (LOCKED).
 * Los supuestos se validan con el historial antes de usarlos para decidir.
 */

const SIM_LOCKED = Object.freeze({
  Exclusion_HardBounces: 'Protege la reputación del dominio',
  Exclusion_Complaints: 'Protege la reputación del dominio',
  ASL_EXCLUSION_LPDP_NOACEPTADO: 'Obligación legal (LPDP)',
  'EXCLUSIÓN DEFINITIVA': 'Personas fallecidas',
  AS_BASE_LISTA_NEGRA: 'Lista negra',
  ASL_INDESEADOS: 'Pidieron no recibir correos'
});

const SIM_SOFT_DELIVERY = 0.7;

/** Listas que el simulador muestra: solo autosupresión, con su candado y su entrega esperada. */
function simLists(detail) {
  const deliveryRate = detail.rates.deliv == null ? 0.97 : detail.rates.deliv;
  return detail.motives.filter(motive => motive.origin === 'asl').map(motive => ({
    ...motive,
    lock: SIM_LOCKED[motive.code] || '',
    delivery: motive.code === 'Exclusion_SoftBounces' ? SIM_SOFT_DELIVERY : deliveryRate
  }));
}

/** Resultado con las listas apagadas (off: { código: true }); las que tienen candado se ignoran. */
function simulate(detail, off) {
  const record = detail.record;
  let added = 0;
  let delivered = 0;
  simLists(detail).forEach(list => {
    if (list.lock || !off[list.code]) return;
    added += list.count;
    delivered += list.count * list.delivery;
  });
  const bounces = record.bounces + (added - delivered);
  const sends = record.sends + added;
  return {
    added,
    sends,
    bounceRate: record.sends ? record.bounces / record.sends : 0,
    bounceRateSim: sends ? bounces / sends : 0
  };
}

/** Nivel de riesgo por la tasa de rebote simulada. */
function simRisk(bounceRate) {
  if (bounceRate > 0.05) return 'riesgo';
  if (bounceRate > 0.03) return 'vigilar';
  return 'sano';
}

export { SIM_LOCKED, SIM_SOFT_DELIVERY, simLists, simulate, simRisk };
