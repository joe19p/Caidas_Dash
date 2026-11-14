/**
 * Lint del servidor ya concatenado (el Code.gs que verá Apps Script). Archivo por archivo no se puede revisar si un
 * nombre existe, porque todos comparten un ámbito global; sobre el archivo completo sí: un nombre mal escrito
 * (una función que no existe) sale aquí y no recién al ejecutarse.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import globals from 'globals';
import { buildServerCode } from './build-server.mjs';

// Servicios de Apps Script que usa el servidor (uno nuevo se agrega aquí).
const GAS_GLOBALS = ['SpreadsheetApp', 'PropertiesService', 'CacheService', 'LockService', 'HtmlService', 'Session', 'Utilities',
  'MailApp', 'DriveApp', 'DocumentApp', 'ScriptApp', 'UrlFetchApp', 'MimeType', 'console'];

const sourceDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const code = buildServerCode({ sourceDir, environment: 'prod' });

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [{
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.es2020, ...Object.fromEntries(GAS_GLOBALS.map(name => [name, 'readonly'])) }
    },
    rules: { 'no-undef': 'error', 'no-dupe-keys': 'error', 'no-unreachable': 'error', 'no-const-assign': 'error' }
  }]
});

const [result] = await eslint.lintText(code, { filePath: 'Code.gs.js' });
// Cada aviso con el archivo fuente al que pertenece la línea (las cabeceras «// ---- archivo ----» del build).
const lines = code.split('\n');
const sourceOf = line => {
  for (let index = line - 1; index >= 0; index--) {
    const match = /^\/\/ ---- (.+) ----$/.exec(lines[index]);
    if (match) return `src/${match[1]}:${line - index - 1}`;
  }
  return `Code.gs:${line}`;
};
result.messages.forEach(message => console.error(`${sourceOf(message.line)}  ${message.message} (${message.ruleId || 'sintaxis'})`));
if (result.messages.length) {
  console.error(`\nLint del servidor: ${result.messages.length} problema(s).`);
  process.exit(1);
}
