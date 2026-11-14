/** Constantes globales de la aplicación. */

// El build fija este valor para cada entorno (scripts/build-server.mjs).
const APP_BUILD_ENVIRONMENT = 'prod';

const APP = Object.freeze({
  TITLE: 'Caídas de email',
  TIMEZONE: 'America/Lima',
  PROPERTIES: Object.freeze({
    SPREADSHEET_ID: 'APP_SPREADSHEET_ID',
    // Sube con «Actualizar datos» y con cada cambio en la hoja (activador onChange): deja sin uso la caché anterior.
    DATA_VERSION: 'APP_DATA_VERSION'
  })
});

/** Fecha y hora actual en ISO con la zona de la app. */
function isoDateTime_(date) {
  return Utilities.formatDate(date || new Date(), APP.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/** Fecha AAAA-MM-DD en la zona de la app. */
function isoDate_(date) {
  return Utilities.formatDate(date || new Date(), APP.TIMEZONE, 'yyyy-MM-dd');
}

function normalizeEmail_(value) {
  return String(value || '').trim().toLowerCase();
}
