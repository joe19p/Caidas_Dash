/**
 * Instalación (se ejecuta desde la hoja: Extensiones › Apps Script › setupApplication). Registra la hoja vinculada,
 * crea las pestañas que falten con su cabecera (nunca borra ni reordena) e instala el activador que deja la caché sin
 * uso cuando alguien cambia la hoja. Se puede volver a correr tras una actualización.
 */

function setupApplication() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  assert_(active, 'APP_NOT_BOUND');
  const props = PropertiesService.getScriptProperties();
  const registered = props.getProperty(APP.PROPERTIES.SPREADSHEET_ID);
  if (registered && registered !== active.getId()) throw messageError('SETUP_OTHER_SHEET', { url: SpreadsheetApp.openById(registered).getUrl() });
  props.setProperty(APP.PROPERTIES.SPREADSHEET_ID, active.getId());
  resetSpreadsheetMemo_();
  const created = [];
  Object.keys(SHEET_HEADERS).forEach(name => {
    if (active.getSheetByName(name)) return;
    const sheet = active.insertSheet(name);
    const headers = SHEET_HEADERS[name];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    created.push(name);
  });
  installChangeTrigger_(active);
  installDailyTrigger_();
  bumpDataVersion_();
  // Columnas: las reconocidas con otro nombre se leen bien; las que faltan se leen como cero.
  const headers = sheetHeaderIssues_();
  headers.forEach(issue => {
    issue.renamed.forEach(item => console.log(`${issue.sheet}: «${item.found}» se lee como ${item.expected}.`));
    if (issue.missing.length) console.warn(`${issue.sheet}: faltan las columnas ${issue.missing.join(', ')}. Esas cifras se leerán como cero.`);
  });
  if (!headers.length) console.log('Las columnas de todas las pestañas están completas.');
  console.log(`Hoja registrada: ${active.getUrl()}`);
  console.log(created.length ? `Pestañas creadas: ${created.join(', ')}.` : 'Todas las pestañas ya existían.');
  return { spreadsheetUrl: active.getUrl(), created, headers };
}

/** Un solo activador diario a las 00:10 (hora de Lima) que precalcula la caché del día (warmCache). */
function installDailyTrigger_() {
  const exists = ScriptApp.getProjectTriggers().some(trigger => trigger.getHandlerFunction() === 'warmCache');
  if (!exists) ScriptApp.newTrigger('warmCache').timeBased().everyDays(1).atHour(0).nearMinute(10).inTimezone(APP.TIMEZONE).create();
}

/** Un solo activador onChange sobre la hoja (si ya está, no se duplica). */
function installChangeTrigger_(spreadsheet) {
  const exists = ScriptApp.getProjectTriggers().some(trigger => trigger.getHandlerFunction() === 'onDataChange');
  if (!exists) ScriptApp.newTrigger('onDataChange').forSpreadsheet(spreadsheet).onChange().create();
}

/** Activador: alguien cambió la hoja (pegó el reporte, editó un catálogo). La próxima lectura recalcula. */
function onDataChange() {
  bumpDataVersion_();
}
