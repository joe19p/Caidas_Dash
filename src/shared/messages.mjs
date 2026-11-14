/** Catálogo compartido: códigos estables, texto plano y parámetros nombrados ({nombre}). */
const MESSAGE_CATALOG = Object.freeze({
  "UNEXPECTED_ERROR": { "text": "Ocurrió un error inesperado. Vuelve a intentarlo.", "level": "error" },
  "APP_NOT_CONFIGURED": { "text": "La app aún no está instalada. En la hoja: Extensiones › Apps Script › Ejecutar setupApplication.", "level": "error" },
  "APP_NOT_BOUND": { "text": "setupApplication se ejecuta desde la hoja: ábrela y entra por Extensiones › Apps Script.", "level": "error" },
  "SETUP_OTHER_SHEET": { "text": "La app ya lee sus datos de otra hoja: {url}. Para usar esta, borra la propiedad del script APP_SPREADSHEET_ID y vuelve a ejecutar setupApplication.", "level": "error" },
  "USER_NOT_IDENTIFIED": { "text": "No se pudo identificar tu cuenta de Google.", "level": "error" },
  "SHEET_MISSING": { "text": "Falta la pestaña {name} en la hoja. Ejecuta setupApplication para crearla.", "level": "error" },
  "PERIOD_INVALID": { "text": "Ese periodo no está disponible. Elige meses hasta el mes en curso, de 36 como máximo.", "level": "error" },
  "MONTH_INVALID": { "text": "El mes no es válido.", "level": "error" },
  "COMPARE_INVALID": { "text": "Elige entre 2 y {max} comunicaciones para comparar.", "level": "error" },
  "COMMUNICATION_NOT_FOUND": { "text": "Esa comunicación ya no está en la hoja. Recarga la página.", "level": "error" },
  "DATA_REFRESHED": { "text": "Datos actualizados desde la hoja.", "level": "success" },
  "SCRIPT_RUN_UNAVAILABLE": { "text": "No hay conexión con el servidor de Apps Script.", "level": "error" },
  "SCREEN_FAILED": { "text": "No se pudieron cargar los datos. Toca «Reintentar»; si se repite, avisa a quien administra la app.", "level": "error" },
  "NO_DATA": { "text": "Todavía no hay envíos en la hoja. Pega el reporte de Marketing Cloud en EmailSummary_NotSent.", "level": "warning" }
});

/** Texto del código con sus parámetros; un código desconocido se muestra tal cual. */
function messageText(code, params = {}) {
  const entry = MESSAGE_CATALOG[code];
  if (!entry) return String(code);
  return entry.text.replace(/\{(\w+)\}/g, (match, key) => (params[key] === undefined ? match : String(params[key])));
}

/** Error con código y parámetros: el servidor lo lanza y runApi_ lo serializa para el cliente. */
function messageError(code, params = {}) {
  const error = new Error(messageText(code, params));
  error.code = code;
  error.params = params;
  return error;
}

/** Lo que viaja al cliente: { code, params, message }. Un error sin código queda como UNEXPECTED_ERROR. */
function messageFailure(error) {
  const code = error && error.code && MESSAGE_CATALOG[error.code] ? error.code : 'UNEXPECTED_ERROR';
  const params = (error && error.params) || {};
  return { code, params, message: messageText(code, params) };
}

/** Texto y nivel para mostrar un error recibido del servidor. */
function messageFromError(error) {
  const code = error && error.code && MESSAGE_CATALOG[error.code] ? error.code : null;
  if (!code) return { text: String((error && (error.text || error.message)) || messageText('UNEXPECTED_ERROR')), level: 'error' };
  return { text: messageText(code, error.params || {}), level: MESSAGE_CATALOG[code].level };
}

export { MESSAGE_CATALOG, messageText, messageError, messageFailure, messageFromError };
