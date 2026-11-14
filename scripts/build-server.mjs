/**
 * Arma Code.gs: Apps Script ve todos los archivos en un único ámbito global, así que el orden
 * solo importa para el código que corre al cargar (constantes de nivel superior). Por eso:
 *   1. shared/*.mjs primero (funciones puras que usa el servidor), sin sus import/export;
 *   2. src/server/<capa>/ en el orden de SERVER_LAYERS y, dentro de cada capa, alfabético.
 * Una capa solo puede usar al cargar lo definido en capas anteriores; dentro de las funciones, todo.
 * Un mismo nombre de nivel superior en dos archivos se rechaza: Apps Script se quedaría con el último
 * sin avisar.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export const SERVER_LAYERS = ['core', 'auth', 'domain', 'operations', 'integrations', 'jobs', 'api'];
export const SHARED_FILES = ['messages.mjs', 'sfmc.mjs', 'metrics.mjs'];
const ENVIRONMENT_LINE = "const APP_BUILD_ENVIRONMENT = 'prod';";

/** Quita la sintaxis de módulo: Apps Script no tiene import/export. */
export function stripModuleSyntax(code) {
  return code
    .replace(/^import\s[^;]*;\s*$/gm, '')
    .replace(/^export\s*\{[^}]*\};?\s*$/gm, '')
    .replace(/^export\s+(?=(?:async\s+)?function\b|const\b|let\b|class\b)/gm, '');
}

/** Archivos fuente en el orden en que entran en Code.gs (rutas relativas a src/). */
export function serverSourceFiles(sourceDir) {
  const shared = SHARED_FILES.filter(file => fs.existsSync(path.join(sourceDir, 'shared', file))).map(file => `shared/${file}`);
  const server = SERVER_LAYERS.flatMap(layer => {
    const dir = path.join(sourceDir, 'server', layer);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(file => file.endsWith('.js')).sort().map(file => `server/${layer}/${file}`);
  });
  return [...shared, ...server];
}

/** Nombres de nivel superior repetidos entre archivos: [{ name, files }]. */
export function duplicateTopLevelNames(sections) {
  const owners = new Map();
  sections.forEach(({ file, code }) => {
    for (const match of code.matchAll(/^(?:async\s+)?(?:function\s*\*?\s*|const\s+|let\s+|var\s+|class\s+)([A-Za-z_$][\w$]*)/gm)) {
      const files = owners.get(match[1]) || new Set();
      files.add(file);
      owners.set(match[1], files);
    }
  });
  return [...owners].filter(([, files]) => files.size > 1).map(([name, files]) => ({ name, files: [...files] }));
}

/** Code.gs completo para el entorno indicado; lanza si hay nombres repetidos o errores de sintaxis. */
export function buildServerCode({ sourceDir, environment = 'prod' }) {
  if (!['dev', 'prod'].includes(environment)) throw new Error(`Entorno desconocido: ${environment}.`);
  const sections = serverSourceFiles(sourceDir).map(file => ({
    file,
    code: stripModuleSyntax(fs.readFileSync(path.join(sourceDir, file), 'utf8')).trim()
  }));
  const duplicates = duplicateTopLevelNames(sections);
  if (duplicates.length) {
    throw new Error('Nombres de nivel superior repetidos en el servidor: ' +
      duplicates.map(item => `${item.name} (${item.files.join(', ')})`).join('; '));
  }
  const config = sections.find(section => section.file === 'server/core/Config.js');
  if (!config || !config.code.includes(ENVIRONMENT_LINE)) throw new Error(`server/core/Config.js debe declarar ${ENVIRONMENT_LINE}`);
  const code = sections.map(section => `// ---- ${section.file} ----\n${section.code}`).join('\n\n')
    .replace(ENVIRONMENT_LINE, `const APP_BUILD_ENVIRONMENT = '${environment}';`) + '\n';
  new vm.Script(code, { filename: 'Code.gs' });
  return code;
}
