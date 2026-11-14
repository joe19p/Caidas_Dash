/** Funciones públicas del dashboard (google.script.run). Solo validan y delegan en operations/Dashboard.js. */

function getOverview() {
  return runApi_(() => overviewData_());
}

function getMonth(month) {
  return runApi_(() => monthData_(month));
}

function getCommunication(job) {
  return runApi_(() => communicationData_(job));
}

/** «Actualizar datos»: deja la caché sin uso y devuelve la vista general recién calculada. */
function refreshData() {
  return runApi_(() => {
    bumpDataVersion_();
    return overviewData_();
  });
}
