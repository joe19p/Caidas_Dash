// Huella del build: clasp solo publica un dist compilado para ese entorno con los fuentes actuales.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const STATE_DIR = '.vite-app';

function digestFiles(root, files) {
  const hash = crypto.createHash('sha256');
  for (const name of files.sort()) {
    hash.update(name.replace(/\\/g, '/'));
    hash.update(fs.readFileSync(path.join(root, name)));
  }
  return hash.digest('hex');
}

function sourceDigest(root) {
  const files = fs.readdirSync(path.join(root, 'src'), { recursive: true })
    .map(file => path.join('src', file)).filter(file => fs.statSync(path.join(root, file)).isFile());
  const extra = ['vite.config.mjs', 'scripts/build-server.mjs', 'scripts/build-state.js', 'package-lock.json']
    .filter(file => fs.existsSync(path.join(root, file)));
  return digestFiles(root, [...files, ...extra]);
}

function outputDigest(root) {
  return digestFiles(root, ['dist/Code.gs', 'dist/Index.html', 'dist/appsscript.json']);
}

function writeBuildState(root, environment, source) {
  fs.mkdirSync(path.join(root, STATE_DIR), { recursive: true });
  fs.writeFileSync(path.join(root, STATE_DIR, 'build-state.json'), JSON.stringify({ environment, source, output: outputDigest(root) }));
}

function assertBuildState(root, environment) {
  const file = path.join(root, STATE_DIR, 'build-state.json');
  if (!fs.existsSync(file)) throw new Error('Falta el build. Ejecuta npm run build o npm run build:dev.');
  const state = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (state.environment !== environment) throw new Error(`El build no corresponde al entorno ${environment}.`);
  if (state.source !== sourceDigest(root) || state.output !== outputDigest(root)) throw new Error('El build está desactualizado o fue editado. Vuelve a compilar.');
}

module.exports = { sourceDigest, writeBuildState, assertBuildState };
