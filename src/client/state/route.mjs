// Estado en el enlace: la dirección guarda la vista, el periodo, la comunicación abierta (mes, día, envío y pestaña) o
// las comunicaciones que se comparan. Así un enlace se puede compartir y el botón Atrás del navegador vuelve a lo
// anterior. En Apps Script la página va dentro de un marco: se usa google.script.history y google.script.url.
import { effect } from '@preact/signals';
import { pick, view } from './app.mjs';
import { period } from './period.mjs';
import { SELECTION_MAX, selected } from './search.mjs';

const VIEWS = ['general', 'comm', 'compare'];
const LENS = ['1', '3', '6', '12', 'range'];
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const JOB = /^[\w.-]{1,60}$/;
const TAB = /^[a-z]{1,20}$/;

/** Texto del enlace (sin «#») para lo que se ve ahora. Lo que se escribe en los buscadores no va. */
export function routeOf({ view: current, period: range, pick: picked, jobs }) {
  const params = new URLSearchParams();
  if (current !== 'general') params.set('v', current);
  if (current === 'general') {
    if (range.len !== 1) params.set('p', String(range.len));
    if (range.len === 'range' && range.from) params.set('desde', range.from);
    if (range.to) params.set('hasta', range.to);
  } else if (current === 'comm') {
    if (picked.month) params.set('mes', picked.month);
    if (picked.day) params.set('dia', picked.day);
    if (picked.job) params.set('envio', picked.job);
    if (picked.tab) params.set('pestana', picked.tab);
  } else if (jobs.length) {
    params.set('envios', jobs.join(','));
  }
  // Comas legibles en la lista de envíos («envios=1,2» y no «1%2C2»).
  return params.toString().replace(/%2C/gi, ',');
}

/** Lee un enlace y devuelve lo que pide, solo con valores válidos (un enlace mal copiado abre la vista general). */
export function parseRoute(hash) {
  const params = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const valid = (key, pattern) => (pattern.test(params.get(key) || '') ? params.get(key) : '');
  const current = VIEWS.includes(params.get('v')) ? params.get('v') : 'general';
  const len = LENS.includes(params.get('p')) ? params.get('p') : '1';
  const from = valid('desde', MONTH);
  const to = valid('hasta', MONTH);
  const range = len === 'range'
    ? (from && to ? { len: 'range', from: from <= to ? from : to, to: from <= to ? to : from } : { len: 1, from: '', to: '' })
    : { len: Number(len), from: '', to };
  const day = valid('dia', DAY);
  const month = valid('mes', MONTH) || day.slice(0, 7);
  const picked = { month, day: day && day.slice(0, 7) === month ? day : '', job: valid('envio', JOB), tab: valid('pestana', TAB) };
  const jobs = [...new Set(String(params.get('envios') || '').split(',').filter(job => JOB.test(job)))].slice(0, SELECTION_MAX);
  return { view: current, period: range, pick: picked, jobs };
}

const gas = () => globalThis.google?.script;

function readHash(callback) {
  const script = gas();
  if (script?.url?.getLocation) script.url.getLocation(location => callback(location?.hash || ''));
  else callback(globalThis.location?.hash || '');
}

function writeHash(hash, replace) {
  const script = gas();
  if (script?.history) {
    script.history[replace ? 'replace' : 'push'](null, {}, hash);
    return;
  }
  const url = hash ? `#${hash}` : `${globalThis.location.pathname}${globalThis.location.search}`;
  globalThis.history?.[replace ? 'replaceState' : 'pushState'](null, '', url);
}

let applying = false;
let last = null;

/** Lleva a la app lo que pide un enlace. */
function applyRoute(hash) {
  const route = parseRoute(hash);
  applying = true;
  try {
    if (route.view === 'general') period.value = route.period;
    if (route.view === 'comm') {
      const tab = route.pick.tab || pick.value.tab;
      pick.value = { ...pick.value, ...route.pick, q: '', tab };
      if (route.pick.month) period.value = { len: 1, from: '', to: route.pick.month };
    }
    if (route.view === 'compare') {
      // Las que ya estaban elegidas conservan su resumen; las nuevas lo reciben al cargar la comparación.
      const known = new Map(selected.value.map(item => [item.job, item]));
      if (route.jobs.length) selected.value = route.jobs.map(job => known.get(job) || { job, name: job, start: '' });
    }
    view.value = route.view;
    last = hash.replace(/^#/, '');
  } finally {
    applying = false;
  }
}

let started = false;
/** Al abrir: aplica el enlace y, desde ahí, cada cambio de lo que se ve queda en el historial del navegador. */
export function startRoute() {
  if (started) return;
  started = true;
  readHash(hash => {
    if (hash) applyRoute(hash);
    effect(() => {
      const hash = routeOf({ view: view.value, period: period.value, pick: pick.value, jobs: selected.value.map(item => item.job) });
      if (applying || hash === last) return;
      // La primera vez (o al abrir sin enlace) reemplaza: no deja una entrada vacía en el historial.
      const replace = last === null;
      last = hash;
      writeHash(hash, replace);
    });
    const script = gas();
    if (script?.history?.setChangeHandler) script.history.setChangeHandler(event => applyRoute(event?.location?.hash || ''));
    else globalThis.addEventListener?.('popstate', () => applyRoute(globalThis.location.hash));
  });
}
