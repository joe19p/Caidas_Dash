// Lint por zona: servidor (script global de Apps Script), cliente (módulos de navegador), scripts y pruebas (Node).
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', '.vite-app/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  {
    // Todo el servidor comparte un ámbito global: lo que define un archivo lo usa otro.
    files: ['src/server/**/*.js'],
    languageOptions: { ecmaVersion: 2020, sourceType: 'script', globals: { ...globals.es2020 } },
    rules: { 'no-undef': 'off', 'no-unused-vars': 'off', 'no-redeclare': 'off' }
  },
  {
    files: ['src/shared/**/*.mjs'],
    languageOptions: { ecmaVersion: 2020, sourceType: 'module', globals: { ...globals.es2020 } },
    // Las funciones con "_" final se usan en el servidor una vez concatenadas.
    rules: { 'no-unused-vars': ['error', { varsIgnorePattern: '_$', argsIgnorePattern: '^_' }] }
  },
  {
    files: ['src/client/**/*.{js,mjs,jsx}', 'src/local/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, google: 'readonly', __APP_ENVIRONMENT__: 'readonly' }
    },
    rules: { 'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z]', argsIgnorePattern: '^_' }] }
  },
  {
    files: ['scripts/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: { ...globals.node } }
  },
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.{mjs,js,jsx}', '*.config.mjs', 'eslint.config.mjs'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } }, globals: { ...globals.node } }
  }
];
