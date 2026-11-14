// Buscador global (como el del cronograma) y comunicaciones elegidas para comparar. Las palabras se fijan como chips;
// O muestra las que tengan alguna y Y las que tengan todas. Busca en el mes de la barra o, a pedido, en todos los meses.
// Lo elegido queda aunque cambie la búsqueda, el día o el mes.
import { computed, effect, signal } from '@preact/signals';
import { metricSearchTerms } from '@shared/metrics.mjs';
import { readStored, writeStored } from '@/services/storage.mjs';

/** { terms: palabras fijadas, text: lo que se escribe, mode: 'O' | 'Y', scope: 'month' | 'all' }. */
export const search = signal({ terms: [], text: '', mode: readStored('search_mode', 'O') === 'Y' ? 'Y' : 'O', scope: 'month' });
export const searchOpen = signal(false);
/** Sube para pedir foco en el buscador (atajo «/», «Agregar más» en Comparar). */
export const searchFocus = signal(0);

/** Palabras fijadas y la que se escribe, en el formato del servidor («promo,cyber»). */
export const searchQuery = computed(() => search.value.terms.concat(search.value.text.trim() ? [search.value.text.trim()] : []).join(','));
export const searchTerms = computed(() => metricSearchTerms(searchQuery.value));

export function setSearch(partial) {
  search.value = { ...search.value, ...partial };
  if (partial.mode) writeStored('search_mode', partial.mode);
}

/** Fija como palabras lo escrito (separado por comas), sin repetir las que ya están. */
export function commitSearchText() {
  const seen = new Set(search.value.terms.map(term => metricSearchTerms(term)[0]));
  const added = search.value.text.split(',').map(term => term.trim()).filter(term => {
    const key = metricSearchTerms(term)[0];
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  setSearch({ terms: [...search.value.terms, ...added], text: '' });
}

export function removeSearchTerm(index) {
  setSearch({ terms: search.value.terms.filter((_, position) => position !== index) });
}

export function openSearch() {
  searchOpen.value = true;
  searchFocus.value += 1;
}

/** Máximo para comparar (como COMPARE_MAX en el servidor). */
export const SELECTION_MAX = 50;

/** Lo que se guarda de cada elegida: lo que muestran la bandeja y la lista (no la comparación entera). */
const SAVED_FIELDS = ['job', 'name', 'family', 'start', 'base', 'sends', 'deliv', 'bounces', 'asl', 'blq', 'top'];
const slim = item => Object.fromEntries(SAVED_FIELDS.filter(key => item[key] !== undefined).map(key => [key, item[key]]));
const stored = readStored('selected', []);

/**
 * Comunicaciones elegidas: resúmenes de la lista ({ job, name, start, … }), en el orden en que se eligieron. Se guardan
 * en el navegador: al recargar siguen elegidas.
 */
export const selected = signal(Array.isArray(stored) ? stored.filter(item => item && typeof item.job === 'string').slice(0, 50) : []);
effect(() => { writeStored('selected', selected.value.map(slim)); });

/** Completa el resumen de las elegidas que llegaron solo con su JobID (desde un enlace), con lo que trajo la comparación. */
export function fillSelected(items) {
  const byJob = new Map(items.map(item => [item.job, item]));
  if (!selected.value.some(item => !item.start && byJob.has(item.job))) return;
  selected.value = selected.value.map(item => (!item.start && byJob.has(item.job) ? slim(byJob.get(item.job)) : item));
}
export const selectedJobs = computed(() => new Set(selected.value.map(item => item.job)));

export function toggleSelected(item) {
  if (selectedJobs.value.has(item.job)) selected.value = selected.value.filter(entry => entry.job !== item.job);
  else if (selected.value.length < SELECTION_MAX) selected.value = [...selected.value, item];
}

/** Agrega varias (hasta el máximo), sin repetir. */
export function selectMany(items) {
  const known = new Set(selectedJobs.value);
  const added = items.filter(item => !known.has(item.job) && known.add(item.job));
  selected.value = [...selected.value, ...added].slice(0, SELECTION_MAX);
}

export function unselect(job) {
  selected.value = selected.value.filter(entry => entry.job !== job);
}

export function clearSelected() {
  selected.value = [];
}
