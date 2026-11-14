// Módulo virtual `virtual:gas-server`: el Code.gs compilado como texto, para que `npm run dev` y las
// pruebas del cliente ejecuten el servidor real en el navegador (src/local/backend.mjs).
// En el build de Apps Script queda vacío: el backend local nunca se publica.
import path from 'node:path';
import { buildServerCode, serverSourceFiles } from './build-server.mjs';

const VIRTUAL_ID = 'virtual:gas-server';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

export function gasServerModule(sourceDir) {
  let serving = false;
  return {
    name: 'gas-server-module',
    configResolved(config) {
      serving = config.command === 'serve' || config.mode === 'test';
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      if (!serving) return 'export default "";';
      serverSourceFiles(sourceDir).forEach(file => this.addWatchFile(path.join(sourceDir, file)));
      return `export default ${JSON.stringify(buildServerCode({ sourceDir, environment: 'dev' }))};`;
    }
  };
}
