/** Funciones públicas del dashboard (google.script.run). Solo validan y delegan en operations/Dashboard.js. */

function getOverview() {
  return runApi_(() => overviewData_(), 'getOverview');
}

function getPeriod(from, to) {
  return runApi_(() => periodData_(from, to), 'getPeriod');
}

function searchCommunications(query, mode) {
  return runApi_(() => searchData_(query, mode), 'searchCommunications');
}

function getCompare(jobs) {
  return runApi_(() => compareData_(jobs), 'getCompare');
}

function getMonth(month) {
  return runApi_(() => monthData_(month), 'getMonth');
}

function getCommunication(job) {
  return runApi_(() => communicationData_(job), 'getCommunication');
}

/** Clave de los datos (versión y día): el navegador la compara con la suya antes de usar lo guardado. */
function getCacheKey() {
  return runApi_(() => clientCacheKey_(), 'getCacheKey');
}

/** «Actualizar datos»: deja la caché sin uso y devuelve la vista general recién calculada. */
function refreshData() {
  return runApi_(() => {
    bumpDataVersion_();
    return overviewData_();
  }, 'refreshData');
}

/** Activador diario (lo instala setupApplication): deja calculada la vista general del día y el mes en curso, para que la primera persona no espere. */
function warmCache() {
  return runApi_(() => {
    const overview = overviewData_();
    const month = overview.available && overview.available.months && overview.available.months[0];
    if (month) monthData_(month);
    console.info(`Caché lista para el ${isoDate_()}`);
    return true;
  }, 'warmCache');
}
