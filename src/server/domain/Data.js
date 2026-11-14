/**
 * Los envíos de la hoja como registros (shared/sfmc.mjs) y el catálogo de motivos.
 * Fuente principal: EmailSummary_NotSent. Los JobID que solo estén en EmailSummary se completan con NotSentData.
 */

/** Versión de los datos: entra en las claves de caché; sube al actualizar o al cambiar la hoja. */
function dataVersion_() {
  return PropertiesService.getScriptProperties().getProperty(APP.PROPERTIES.DATA_VERSION) || '1';
}

function bumpDataVersion_() {
  const next = String(Number(dataVersion_()) + 1);
  PropertiesService.getScriptProperties().setProperty(APP.PROPERTIES.DATA_VERSION, next);
  return next;
}

/**
 * Clave de los datos para la caché del navegador: versión y día, como las claves de la caché del servidor (los
 * periodos y «lo normal» cambian con la fecha). Si no coincide con la guardada, el navegador pide todo de nuevo.
 */
function clientCacheKey_() {
  return `v${dataVersion_()}:${isoDate_()}`;
}

/** Catálogo de motivos de ASL_Catalog y NotSent_Catalog. */
function motiveCatalog_() {
  return sfmcCatalog(readTable_(SHEETS.ASL_CATALOG, true).rows, readTable_(SHEETS.NOT_SENT_CATALOG, true).rows);
}

/** Función { name, origin, description } por código, para las métricas. */
function motiveInfoFn_(catalog) {
  return code => sfmcMotiveInfo(code, catalog);
}

/** Todos los envíos, ordenados por fecha de inicio. */
function loadRecords_() {
  const main = readTable_(SHEETS.SUMMARY_NOT_SENT, true);
  const motiveHeaders = sfmcMotiveHeaders(main.keys);
  const byJob = {};
  main.rows.forEach(row => {
    const record = sfmcRecord(row, motiveHeaders);
    if (record) byJob[record.job] = record;
  });
  // Envíos que solo están en EmailSummary: sus motivos salen de NotSentData (una fila por JobID y lista).
  const summary = readTable_(SHEETS.SUMMARY, true);
  const pending = summary.rows.filter(row => {
    const job = String(row.JobID == null ? '' : row.JobID).trim();
    return job && !byJob[job];
  });
  if (pending.length) {
    const suppressed = {};
    readTable_(SHEETS.NOT_SENT_DATA, true).rows.forEach(row => {
      const job = String(row.jobid == null ? '' : row.jobid).trim();
      const code = String(row.asl_cod || '').trim();
      const count = sfmcCount(row.suppressedcount);
      if (!job || !code || !count) return;
      const motives = (suppressed[job] = suppressed[job] || {});
      motives[code] = (motives[code] || 0) + count;
    });
    pending.forEach(row => {
      const job = String(row.JobID).trim();
      const record = sfmcRecord(Object.assign({}, row, suppressed[job] || {}), Object.keys(suppressed[job] || {}));
      if (record) byJob[record.job] = record;
    });
  }
  return Object.keys(byJob).map(job => byJob[job]).sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
}
