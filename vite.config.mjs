// Build de la app: cliente (Preact + Tailwind) en un solo Index.html y servidor concatenado en Code.gs.
// `vite build` → producción; `vite build --mode development` → dev; `vite` → servidor local con el simulador.
import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { buildServerCode, serverSourceFiles } from './scripts/build-server.mjs';
import { gasServerModule } from './scripts/vite-gas-server.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const source = path.join(root, 'src');
const dist = path.join(root, 'dist');

/**
 * Minifica el marcado sin cambiar cómo se ve: quita comentarios HTML y reduce cada tramo de
 * espacios a uno. No toca script, style, pre ni textarea, donde los espacios sí importan.
 */
function minifyHtml(html) {
  const kept = [];
  const masked = html.replace(/<(script|style|pre|textarea)\b[\s\S]*?<\/\1>/gi, block => `__APP_KEEP_${kept.push(block) - 1}__`);
  return masked
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/__APP_KEEP_(\d+)__/g, (_, index) => kept[Number(index)])
    .trim();
}

/** Emite Code.gs y appsscript.json junto al cliente y deja Index.html con el nombre que espera HtmlService. */
function appsScript(environment) {
  const buildState = require('./scripts/build-state.js');
  let sourceDigest;
  return {
    name: 'apps-script',
    apply: 'build',
    buildStart() {
      sourceDigest = buildState.sourceDigest(root);
      serverSourceFiles(source).forEach(file => this.addWatchFile(path.join(source, file)));
      this.addWatchFile(path.join(source, 'appsscript.json'));
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'Code.gs', source: buildServerCode({ sourceDir: source, environment }) });
      this.emitFile({ type: 'asset', fileName: 'appsscript.json', source: fs.readFileSync(path.join(source, 'appsscript.json'), 'utf8') });
    },
    writeBundle() {
      const html = path.join(dist, 'index.html');
      if (environment === 'prod') fs.writeFileSync(html, minifyHtml(fs.readFileSync(html, 'utf8')));
      fs.renameSync(html, path.join(dist, 'Index.html'));
      buildState.writeBuildState(root, environment, sourceDigest);
    }
  };
}

export default defineConfig(({ mode }) => {
  const environment = mode === 'development' ? 'dev' : 'prod';
  return {
    root: path.join(source, 'client'),
    base: './',
    publicDir: false,
    resolve: { alias: { '@': path.join(source, 'client'), '@shared': path.join(source, 'shared'), '@local': path.join(source, 'local') } },
    define: { __APP_ENVIRONMENT__: JSON.stringify(environment) },
    plugins: [preact({ prerender: { enabled: false } }), tailwindcss(), gasServerModule(source), appsScript(environment), viteSingleFile()],
    build: {
      outDir: dist,
      emptyOutDir: true,
      minify: environment === 'prod' ? 'esbuild' : false,
      cssMinify: environment === 'prod' ? 'lightningcss' : false,
      target: 'es2020',
      modulePreload: false
    },
    // Sin comentarios de licencia ni debugger en el JS publicado.
    esbuild: environment === 'prod' ? { legalComments: 'none', drop: ['debugger'] } : {}
  };
});
