/**
 * Lectura de la hoja: cada pestaña es una tabla con cabecera en la fila 1. Las filas se leen como objetos
 * { cabecera: valor }. Las fechas que Sheets entrega como Date pasan a texto local «AAAA-MM-DD HH:mm:ss».
 */

let spreadsheetMemo_ = null;
let tableMemo_ = {};

/** Olvida lo leído en esta llamada. */
function forgetTables_() {
  tableMemo_ = {};
}

/** La hoja registrada por setupApplication. Sin instalar, avisa que falta ese paso. */
function getSpreadsheet_() {
  if (spreadsheetMemo_) return spreadsheetMemo_;
  const id = PropertiesService.getScriptProperties().getProperty(APP.PROPERTIES.SPREADSHEET_ID);
  if (!id) throw messageError('APP_NOT_CONFIGURED');
  spreadsheetMemo_ = SpreadsheetApp.openById(id);
  return spreadsheetMemo_;
}

function resetSpreadsheetMemo_() {
  spreadsheetMemo_ = null;
}

function cellText_(value) {
  // Sin instanceof: un Date de otro contexto (pruebas) también cuenta.
  if (Object.prototype.toString.call(value) === '[object Date]') return Utilities.formatDate(value, APP.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
  return value == null ? '' : value;
}

/** { headers, keys, rows } de una pestaña (keys: el nombre de cada columna en las filas); si no existe y optional, vacía. */
function readTable_(name, optional) {
  if (tableMemo_[name]) return tableMemo_[name];
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) {
    assert_(optional, 'SHEET_MISSING', { name });
    return (tableMemo_[name] = { headers: [], keys: [], rows: [] });
  }
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 1 || lastColumn < 1) return (tableMemo_[name] = { headers: [], keys: [], rows: [] });
  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  const headers = values[0].map(header => String(header || '').trim());
  // Una cabecera repetida (List Level Opt Out viene dos veces) queda como «Nombre#columna»; los motivos la suman.
  const seen = {};
  const keys = headers.map((header, column) => {
    if (!header) return '';
    const key = seen[header] ? `${header}#${column}` : header;
    seen[header] = true;
    return key;
  });
  const rows = [];
  for (let index = 1; index < values.length; index++) {
    const cells = values[index];
    if (!cells.some(cell => cell !== '' && cell != null)) continue;
    const row = {};
    keys.forEach((key, column) => {
      if (key) row[key] = cellText_(cells[column]);
    });
    rows.push(row);
  }
  return (tableMemo_[name] = { headers, keys, rows });
}
