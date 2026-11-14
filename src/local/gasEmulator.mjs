// Emulador mínimo de los servicios de Apps Script que usa el servidor: Spreadsheet en memoria, PropertiesService,
// CacheService, Utilities.formatDate, Session, ScriptApp (activadores) y HtmlService.
// Lo usan las pruebas (Node) y `npm run dev` (navegador), que ejecuta el Code.gs real sobre él.

/** Utilities.formatDate con los patrones de SimpleDateFormat que usa el servidor. */
function formatDate(date, timeZone, pattern) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(date).map(part => [part.type, part.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const offset = Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  const sign = offset < 0 ? '-' : '+';
  const xxx = offset === 0 ? 'Z' : `${sign}${String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')}:${String(Math.abs(offset) % 60).padStart(2, '0')}`;
  const tokens = { yyyy: parts.year, MM: parts.month, dd: parts.day, HH: parts.hour, mm: parts.minute, ss: parts.second,
    SSS: String(date.getMilliseconds()).padStart(3, '0'), XXX: xxx };
  return pattern.replace(/'([^']*)'|yyyy|MM|dd|HH|mm|ss|SSS|XXX/g, (match, literal) => literal !== undefined ? literal : tokens[match]);
}

function sheetApi(store, data) {
  const lastRow = () => {
    for (let index = data.rows.length - 1; index >= 0; index--) if ((data.rows[index] || []).some(value => value !== '' && value != null)) return index + 1;
    return 0;
  };
  const lastColumn = () => Math.max(0, ...data.rows.map(row => {
    for (let index = (row || []).length - 1; index >= 0; index--) if (row[index] !== '' && row[index] != null) return index + 1;
    return 0;
  }));
  const api = {
    getName: () => data.name,
    getLastRow: lastRow,
    getLastColumn: lastColumn,
    setFrozenRows(count) { data.frozenRows = count; },
    getRange(row, column, height = 1, width = 1) {
      if (row < 1 || column < 1) throw new Error('Rango fuera de la hoja');
      store.reads = (store.reads || 0) + 1;
      // Lecturas por pestaña: las pruebas verifican qué se vuelve a leer y qué sale de la caché.
      store.readsBy = store.readsBy || {};
      store.readsBy[data.name] = (store.readsBy[data.name] || 0) + 1;
      return {
        getValues: () => Array.from({ length: height }, (_, r) => Array.from({ length: width }, (_, c) => data.rows[row - 1 + r]?.[column - 1 + c] ?? '')),
        setValues(matrix) {
          if (matrix.length !== height || matrix.some(cells => cells.length !== width)) throw new Error('Dimensiones distintas al rango');
          matrix.forEach((cells, r) => cells.forEach((value, c) => {
            data.rows[row - 1 + r] ||= [];
            data.rows[row - 1 + r][column - 1 + c] = value;
          }));
        }
      };
    }
  };
  return api;
}

/** Spreadsheet en memoria. initial = { NOMBRE_HOJA: [[cabeceras], [fila], …] }. */
export function createFakeSpreadsheet(initial = {}) {
  const store = { sheets: new Map(), reads: 0 };
  const create = name => {
    const data = { name, rows: [], frozenRows: 0 };
    store.sheets.set(name, data);
    return data;
  };
  Object.entries(initial).forEach(([name, rows]) => { create(name).rows = rows.map(row => [...row]); });
  const spreadsheet = {
    getId: () => 'fake-spreadsheet',
    getUrl: () => 'https://docs.google.com/spreadsheets/d/fake-spreadsheet/edit',
    getSheetByName: name => (store.sheets.has(name) ? sheetApi(store, store.sheets.get(name)) : null),
    insertSheet(name) {
      if (store.sheets.has(name)) throw new Error(`Ya existe la hoja ${name}`);
      return sheetApi(store, create(name));
    },
    getSheets: () => [...store.sheets.values()].map(data => sheetApi(store, data))
  };
  const rows = name => (store.sheets.get(name)?.rows || []).map(row => [...row]);
  return { spreadsheet, store, rows };
}

/** Entorno global completo (para vm.createContext o new Function). */
export function createGasGlobals({ spreadsheet = createFakeSpreadsheet(), activeEmail = 'admin@example.com', bound = true, properties = {} } = {}) {
  const props = new Map(Object.entries(properties));
  const cache = new Map();
  const triggers = [];
  const globals = {
    console,
    PropertiesService: { getScriptProperties: () => ({
      getProperty: key => (props.has(key) ? props.get(key) : null),
      setProperty: (key, value) => { props.set(key, String(value)); },
      deleteProperty: key => { props.delete(key); }
    }) },
    CacheService: { getScriptCache: () => ({
      get: key => (cache.has(key) ? cache.get(key) : null),
      put: (key, value) => {
        if (value.length > 100000) throw new Error('Argumento demasiado grande');
        cache.set(key, value);
      },
      getAll: keys => Object.fromEntries(keys.filter(key => cache.has(key)).map(key => [key, cache.get(key)])),
      putAll: values => Object.entries(values).forEach(([key, value]) => {
        if (value.length > 100000) throw new Error('Argumento demasiado grande');
        cache.set(key, value);
      }),
      remove: key => { cache.delete(key); }
    }) },
    Utilities: { formatDate },
    Session: { getActiveUser: () => ({ getEmail: () => (typeof activeEmail === 'function' ? activeEmail() : activeEmail) }) },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => (bound ? spreadsheet.spreadsheet : null),
      openById: id => {
        if (id !== spreadsheet.spreadsheet.getId()) throw new Error('No existe el spreadsheet ' + id);
        return spreadsheet.spreadsheet;
      }
    },
    ScriptApp: {
      getProjectTriggers: () => triggers.map(trigger => ({ getHandlerFunction: () => trigger.handler })),
      newTrigger(handler) {
        const trigger = { handler, event: '' };
        const builder = {
          forSpreadsheet() { return builder; },
          onChange() { trigger.event = 'ON_CHANGE'; return builder; },
          create() { triggers.push(trigger); return {}; }
        };
        return builder;
      }
    },
    HtmlService: {
      createHtmlOutputFromFile: () => ({ getContent: () => '<html><head></head><body></body></html>' }),
      createHtmlOutput: content => {
        const output = { content, title: '', setTitle(title) { output.title = title; return output; }, addMetaTag() { return output; } };
        return output;
      }
    }
  };
  return { globals, props, cache, triggers, spreadsheet };
}
