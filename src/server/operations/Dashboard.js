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
    return overview;
  });
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
