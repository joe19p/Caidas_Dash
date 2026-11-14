/** Funciones públicas del dashboard (google.script.run). Solo validan y delegan en operations/Dashboard.js. */

function getOverview() {
  return runApi_(() => overviewData_());
}

function getPeriod(from, to) {
  return runApi_(() => periodData_(from, to));
}

function searchCommunications(query, mode) {
  return runApi_(() => searchData_(query, mode));
}

function getCompare(jobs) {
  return runApi_(() => compareData_(jobs));
}

function getMonth(month) {
  return runApi_(() => monthData_(month));
}

function getCommunication(job) {
  return runApi_(() => communicationData_(job));
}

/** Clave de los datos (versión y día): el navegador la compara con la suya antes de usar lo guardado. */
function getCacheKey() {
  return runApi_(() => clientCacheKey_());
}

/** «Actualizar datos»: deja la caché sin uso y devuelve la vista general recién calculada. */
function refreshData() {
  return runApi_(() => {
    bumpDataVersion_();
    return overviewData_();
  });
}
