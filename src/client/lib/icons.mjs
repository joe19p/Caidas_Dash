// Qué ícono del catálogo (ui/Icon.jsx) le toca a cada motivo de caída y a cada familia. Los motivos van por tipo de
// regla (hay decenas de listas): se reconocen por palabras del código; uno desconocido toma el de su origen.

// [ícono, palabras del código (sin distinguir mayúsculas)]. Gana la primera que coincide.
const MOTIVE_RULES = [
  ['mailEyeOff', ['NO_OPENERS', 'SIN_APERTURA', 'HOTMAIL']],
  ['mailStack', ['SATURACION', 'SATURACIÓN']],
  ['mailBounce', ['BOUNCE']],
  ['shield', ['LPDP', 'DEFINITIVA']],
  ['flag', ['COMPLAINT', 'SPAM', 'RECLAMO', 'LISTA_NEGRA', 'INDESEADO']],
  ['userBlocked', ['HELD']],
  ['userX', ['UNSUBSCRIBED', 'OPT OUT', 'DELETED', 'NOCONTACTO']],
  ['mailRefresh', ['RE-ENGAGE', 'REENGAGE']]
];

/** Ícono de un motivo: por tipo de regla; si no se reconoce, el de su origen (autosupresión o bloqueo). */
export function motiveIcon(code, origin) {
  const upper = String(code || '').toUpperCase();
  const found = MOTIVE_RULES.find(([, words]) => words.some(word => upper.includes(word)));
  return found ? found[0] : origin === 'blq' ? 'shieldX' : 'mailFunnel';
}

const FAMILY_ICONS = { Cyber: 'tag', Promociones: 'percent', Onboarding: 'sparkle', Transaccional: 'fileText', Newsletter: 'newspaper' };

/** Ícono de una familia de comunicación (shared/sfmc.mjs → SFMC_FAMILIES); «Otras» y las nuevas, el correo. */
export const familyIcon = name => FAMILY_ICONS[name] || 'mail';

/** Destino de la audiencia: el mismo ícono en Funnel, Resumen, Comparar y leyendas. */
export const DESTINATION_ICONS = { ent: 'mailCheck', reb: 'mailBounce', blq: 'shieldX', asl: 'mailFunnel' };
