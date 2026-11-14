/**
 * Lo que pide el cliente, calculado con shared/metrics.mjs y guardado en caché por versión de datos: leer la hoja
 * completa toma segundos, así que solo se relee cuando cambió (o tras «Actualizar datos»).
 */

/** Vista general (los cuatro periodos), con los meses disponibles para la vista por comunicación. */
function overviewData_() {
  return cachedJson_(`overview:v${dataVersion_()}:${isoDate_()}`, () => {
    const records = loadRecords_();
    const overview = buildOverview(records, motiveInfoFn_(motiveCatalog_()), isoDate_());
    overview.available = metricAvailable(records);
    overview.cacheKey = clientCacheKey_();
    // Cuándo se leyó la hoja (lo calculado queda en caché): la barra de estado lo muestra.
    overview.readAt = isoDateTime_();
    return overview;
  });
}

const PERIOD_MAX_MONTHS = 36;

/** Un periodo a elección (meses «AAAA-MM» from–to, hasta el mes en curso), comparado con el anterior del mismo largo. */
function periodData_(from, to) {
  const month = /^\d{4}-\d{2}$/;
  const current = isoDate_().slice(0, 7);
  const valid = month.test(String(from || '')) && month.test(String(to || '')) && from <= to && to <= current
    && metricMonthRange(from, to).length <= PERIOD_MAX_MONTHS;
  assert_(valid, 'PERIOD_INVALID');
  // Un periodo cerrado depende del mes en curso (historial y series), no del día: así sirve todo el mes. Si llega al
  // mes en curso, también del día (se corta hoy).
  const scope = to === current ? isoDate_() : current;
  return cachedJson_(`period:v${dataVersion_()}:${scope}:${from}:${to}`, () =>
    buildPeriod(loadRecords_(), motiveInfoFn_(motiveCatalog_()), from, to, isoDate_()));
}

const SEARCH_LIMIT = 200;
const COMPARE_MAX = 50;

/** Búsqueda en todos los envíos (palabras separadas por coma; mode 'Y' todas, 'O' alguna). */
function searchData_(query, mode) {
  const terms = metricSearchTerms(query);
  const joined = mode === 'Y' ? 'Y' : 'O';
  if (!terms.length) return { terms: [], mode: joined, total: 0, items: [] };
  return cachedJson_(`search:v${dataVersion_()}:${joined}:${terms.join(',')}`, () =>
    buildSearch(loadRecords_(), motiveInfoFn_(motiveCatalog_()), terms.join(','), joined, SEARCH_LIMIT));
}

/** Varias comunicaciones lado a lado (de 2 a COMPARE_MAX JobID, sin repetir). */
function compareData_(jobs) {
  const list = (Array.isArray(jobs) ? jobs : []).map(job => String(job == null ? '' : job).trim()).filter(Boolean);
  const unique = list.filter((job, index) => list.indexOf(job) === index);
  assert_(unique.length >= 2 && unique.length <= COMPARE_MAX, 'COMPARE_INVALID', { max: COMPARE_MAX });
  return cachedJson_(`compare:v${dataVersion_()}:${unique.join(',')}`, () =>
    buildCompare(loadRecords_(), motiveInfoFn_(motiveCatalog_()), unique));
}

/** Envíos de un mes para elegir día y comunicación. */
function monthData_(month) {
  assert_(/^\d{4}-\d{2}$/.test(String(month || '')), 'MONTH_INVALID');
  return cachedJson_(`month:v${dataVersion_()}:${month}`, () => buildMonth(loadRecords_(), motiveInfoFn_(motiveCatalog_()), month));
}

/** Detalle de un envío. */
function communicationData_(job) {
  const id = String(job || '').trim();
  const detail = cachedJson_(`detail:v${dataVersion_()}:${isoDate_().slice(0, 7)}:${id}`, () =>
    buildDetail(loadRecords_(), motiveInfoFn_(motiveCatalog_()), id, isoDate_()));
  assert_(detail, 'COMMUNICATION_NOT_FOUND');
  return detail;
}
