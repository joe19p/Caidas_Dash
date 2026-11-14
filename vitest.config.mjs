// Pruebas del cliente (componentes y módulos) con happy-dom. Las del servidor corren con node:test.
import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gasServerModule } from './scripts/vite-gas-server.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [gasServerModule(path.join(root, 'src'))],
  resolve: { alias: { '@': path.join(root, 'src/client'), '@shared': path.join(root, 'src/shared'), '@local': path.join(root, 'src/local') } },
  esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
  define: { __APP_ENVIRONMENT__: JSON.stringify('dev') },
  test: {
    environment: 'happy-dom',
    include: ['tests/components/**/*.test.{js,jsx,mjs}'],
    passWithNoTests: true
  }
});
