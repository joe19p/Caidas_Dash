#!/usr/bin/env node
/**
 * clasp por entorno. Uso:  node scripts/clasp.js <dev|prod> <preflight|push [--build]|deploy|release|open|status|logs>
 *
 * Cada entorno de environments.json apunta a su archivo de proyecto de clasp (su scriptId, es decir,
 * su propio Spreadsheet) y al deploymentId de su web app. `deploy` actualiza esa implementación,
 * así la URL no cambia. `push` solo sube un build verificado y compilado para ese entorno.
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readEnvironment } = require('./clasp-config');
const { assertBuildState } = require('./build-state');

const ROOT = path.join(__dirname, '..');
const [envName, command, ...rest] = process.argv.slice(2);

function fail(message) {
  console.error(message);
  process.exit(1);
}

let env;
try {
  env = readEnvironment(ROOT, envName, { deploy: ['deploy', 'release'].includes(command), newDeployment: rest.includes('--new') });
} catch (error) { fail(error.message); }

function packageBin(packageName, binName) {
  const packageDir = path.join(ROOT, 'node_modules', ...packageName.split('/'));
  const packageFile = path.join(packageDir, 'package.json');
  if (!fs.existsSync(packageFile)) fail(`Falta ${packageName}. Ejecuta npm install.`);
  const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  return path.join(packageDir, typeof pkg.bin === 'string' ? pkg.bin : pkg.bin[binName]);
}

function clasp(...args) {
  const result = spawnSync(process.execPath, [packageBin('@google/clasp', 'clasp'), '-P', env.project, ...args], { cwd: ROOT, stdio: 'inherit' });
  process.exit(result.status === null ? 1 : result.status);
}

function runNode(args, label) {
  const result = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
  if (result.status !== 0) fail(`Falló ${label}. No se publica.`);
}

/**
 * Paso silencioso: imprime una línea («✓ Lint») y guarda la salida; solo si falla la muestra completa.
 * summary(output) puede añadir un detalle a la línea (p. ej. cuántas pruebas pasaron).
 */
function step(label, args, summary = () => '') {
  const result = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (result.status !== 0) {
    console.error(output.trim());
    fail(`✗ ${label}: falló. No se publica.`);
  }
  const detail = summary(output);
  console.log(`✓ ${label}${detail ? ` (${detail})` : ''}`);
}

/** Compila y, debajo de «✓ Build», muestra el peso y el gzip de cada archivo que reporta Vite. */
function build() {
  let sizes = [];
  step(`Build ${envName}`, [packageBin('vite', 'vite'), 'build', '--mode', envName === 'dev' ? 'development' : 'production'], output => {
    // eslint-disable-next-line no-control-regex
    sizes = output.replace(/\u001b\[[0-9;]*m/g, '').split(/\r?\n/).filter(line => /\d kB/.test(line)).map(line => line.trim().replace(/^(\.\.\/)*dist\//, ''));
    return '';
  });
  sizes.forEach(line => console.log(`    ${line}`));
}

function checkedPush() {
  try { assertBuildState(ROOT, envName); } catch (error) { fail(error.message); }
  step('Lint', [packageBin('eslint', 'eslint'), '.']);
  step('Pruebas del servidor', ['--test', 'tests/unit/**/*.test.mjs'], output => {
    const passed = output.match(/^# pass (\d+)/m);
    return passed ? `${passed[1]} pasan` : '';
  });
  step('Build verificado', [path.join(ROOT, 'scripts/verify-build.js')]);
  // Los fuentes pueden cambiar mientras corren las pruebas.
  try { assertBuildState(ROOT, envName); } catch (error) { fail(error.message); }
}

// --build: compila antes de subir (lo usa `npm run push`); no se pasa a clasp.
const withBuild = rest.includes('--build');
const claspArgs = rest.filter(arg => arg !== '--build');

switch (command) {
  case 'preflight':
    console.log(`Entorno ${envName} válido: ${env.project}.`);
    break;

  case 'push':
    if (withBuild) build();
    checkedPush();
    // clasp queda interactivo: pide confirmar si cambia appsscript.json.
    clasp('push', ...claspArgs);
    break;

  case 'release':
    build();
    runNode([path.join(ROOT, 'scripts/clasp.js'), envName, 'deploy', ...rest], 'el despliegue');
    break;

  case 'deploy': {
    runNode([path.join(ROOT, 'scripts/clasp.js'), envName, 'push'], 'el push');
    const description = rest.filter(arg => arg !== '--new').join(' ') || `${envName} ${new Date().toISOString()}`;
    if (env.deploymentId) clasp('deploy', '-i', env.deploymentId, '-d', description);
    else if (rest.includes('--new')) clasp('deploy', '-d', description);
    else fail(`"${envName}" no tiene deploymentId en environments.json. Búscalo con \`npx clasp -P ${env.project} deployments\` y añádelo, o usa --new.`);
    break;
  }

  case 'open':
    clasp('open-web-app', ...(env.deploymentId ? [env.deploymentId] : []));
    break;

  case 'status':
    clasp('show-file-status');
    break;

  case 'logs':
    clasp('tail-logs', ...rest);
    break;

  default:
    fail('Comando no soportado. Usa: preflight, push, deploy, release, open, status o logs.');
}
