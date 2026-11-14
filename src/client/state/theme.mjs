// Tema de la app (en este navegador): Claro, Oscuro o Sistema (sigue al equipo). Se aplica con data-theme en <html>,
// que en styles/app.css cambia los valores de los tokens; nada más en la app sabe de colores oscuros.
import { signal } from '@preact/signals';
import { readStored, writeStored } from '@/services/storage.mjs';

export const THEMES = [['light', 'Claro'], ['dark', 'Oscuro'], ['system', 'Sistema']];
const stored = readStored('theme', 'light');
export const theme = signal(THEMES.some(([id]) => id === stored) ? stored : 'light');

const media = () => globalThis.matchMedia?.('(prefers-color-scheme: dark)');

/** El tema que se ve: Sistema se resuelve con la preferencia del equipo. */
export const resolveTheme = (choice, systemDark) => (choice === 'system' ? (systemDark ? 'dark' : 'light') : choice);

function apply() {
  document.documentElement.dataset.theme = resolveTheme(theme.value, Boolean(media()?.matches));
}

export function setTheme(next) {
  theme.value = next;
  writeStored('theme', next);
  apply();
}

/** Al arrancar (antes de pintar): aplica el tema y escucha los cambios del equipo para «Sistema». */
export function initTheme() {
  apply();
  media()?.addEventListener?.('change', () => { if (theme.value === 'system') apply(); });
}
