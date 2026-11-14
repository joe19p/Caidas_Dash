// Carga el servidor como lo ve Apps Script: el mismo Code.gs que genera el build, en un contexto
// aislado con los dobles del emulador. Devuelve el contexto (funciones globales) y los dobles.
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { buildServerCode } from '../../scripts/build-server.mjs';
import { createGasGlobals } from '../../src/local/gasEmulator.mjs';

const sourceDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');
let compiled = null;

export function serverCode() {
  compiled ||= buildServerCode({ sourceDir, environment: 'dev' });
  return compiled;
}

export function loadGas(options = {}) {
  const gas = createGasGlobals(options);
  const context = vm.createContext({ ...gas.globals });
  vm.runInContext(serverCode(), context, { filename: 'Code.gs' });
  // Como tras instalar: setupApplication registra la hoja vinculada. setup: false prueba la app sin instalar.
  if (options.setup !== false && !gas.props.get('APP_SPREADSHEET_ID')) context.setupApplication();
  return { context, ...gas };
}
