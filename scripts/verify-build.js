#!/usr/bin/env node
// Verifica dist antes de publicar: cliente integrado en un solo HTML, servidor que compila y responde a doGet.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Linter } = require('eslint');

const dist = path.join(__dirname, '..', 'dist');
assert.deepEqual(fs.readdirSync(dist).sort(), ['Code.gs', 'Index.html', 'appsscript.json']);

const html = fs.readFileSync(path.join(dist, 'Index.html'), 'utf8');
assert.ok(!/<\?[!=]/.test(html), 'No deben quedar plantillas de Apps Script sin resolver.');
// Apps Script trata "<" + "?…?" + ">" del JavaScript servido como comentario HTML.
assert.ok(!html.includes('<' + '?'), 'El HTML no debe contener "<" + "?": Apps Script lo trataría como comentario.');
assert.ok(!/<script\b[^>]*\bsrc\s*=/i.test(html), 'Todo el JavaScript debe estar integrado.');
// Solo la fuente puede venir de afuera (Google Fonts); el resto del CSS va integrado.
const externalCss = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)].filter(match => !/href=["']https:\/\/fonts\.googleapis\.com\//.test(match[0]));
assert.equal(externalCss.length, 0, 'Todo el CSS debe estar integrado (salvo Google Fonts).');
assert.ok(/<style\b/i.test(html), 'El CSS debe estar integrado.');
assert.ok(!html.includes('app_local_backend_cd1'), 'El simulador no debe publicarse en Apps Script.');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
assert.equal(scripts.length, 1, 'Se espera un único script compilado.');
new vm.Script(scripts[0][1].replace(/^\s*import\s.*$/gm, ''), { filename: 'Index.html' });

const serverCode = fs.readFileSync(path.join(dist, 'Code.gs'), 'utf8');
const fatal = new Linter().verify(serverCode, [{ languageOptions: { ecmaVersion: 2020, sourceType: 'script' } }]).filter(message => message.fatal);
assert.equal(fatal.length, 0, 'Code.gs debe usar sintaxis compatible con Apps Script: ' + fatal.map(message => `línea ${message.line}: ${message.message}`).join('; '));

let servedHtml;
const output = { setTitle() { return this; }, addMetaTag() { return this; } };
const context = vm.createContext({
  // Aquí no hay hoja: doGet avisa que no incluye la vista general, y es lo esperado.
  console: { ...console, warn() {} },
  HtmlService: {
    createHtmlOutputFromFile(name) { assert.equal(name, 'Index'); return { getContent: () => html }; },
    createHtmlOutput(content) { servedHtml = content; return output; }
  }
});
vm.runInContext(serverCode, context);
assert.equal(context.doGet(), output);
assert.ok(servedHtml.includes('globalThis.APP_BOOT='), 'doGet debe inyectar los datos de arranque.');
['getServerInfo', 'getOverview', 'getMonth', 'getCommunication', 'refreshData', 'setupApplication', 'onDataChange'].forEach(name => {
  assert.equal(typeof context[name], 'function', `Falta la función pública ${name}.`);
});

const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'appsscript.json'), 'utf8'));
assert.equal(manifest.runtimeVersion, 'V8');
assert.equal(manifest.timeZone, 'America/Lima');
// Cada servicio que usa el servidor necesita su permiso en el manifiesto; si falta, Apps Script falla al ejecutarlo
// (por ejemplo, ScriptApp.getProjectTriggers en setupApplication sin script.scriptapp).
const SCOPE = 'https://www.googleapis.com/auth/';
const NEEDED = [
  [/SpreadsheetApp\./, 'spreadsheets'],
  [/DocumentApp\./, 'documents'],
  [/DriveApp\./, 'drive'],
  [/UrlFetchApp\./, 'script.external_request'],
  [/MailApp\./, 'script.send_mail'],
  [/ScriptApp\.(getProjectTriggers|newTrigger|deleteTrigger)/, 'script.scriptapp'],
  [/Session\.get(Active|Effective)User/, 'userinfo.email']
];
const scopes = manifest.oauthScopes || [];
NEEDED.forEach(([pattern, scope]) => {
  if (pattern.test(serverCode)) assert.ok(scopes.includes(SCOPE + scope), `Falta el permiso ${scope} en appsscript.json: el servidor lo necesita.`);
});
console.log('Build verificado: Code.gs, Index.html y appsscript.json.');
