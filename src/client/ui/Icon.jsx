// Íconos de trazo (24×24, línea 2): el catálogo de la app. Uno nuevo: agregar su path aquí. Motivos y familias eligen
// el suyo en lib/icons.mjs.
const PATHS = {
  // Catálogo (ver lib/icons.mjs para motivos y familias).
  dashboard: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  columns: 'M3 4h18v16H3zM12 4v16',
  calendar: 'M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2',
  sheet: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 6v6l4 2',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  users: 'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 20v-2a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8',
  mailOpen: 'M3 9l9-6 9 6v11H3zM3 9l9 6 9-6',
  click: 'M9 9l5 12 1.8-5.2L21 14zM7.2 2.2l.8 2.9M2.2 7.2l2.9.8M5.6 12.6 3.5 14.7M12.6 5.6l2.1-2.1',
  userMinus: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 11h-6',
  flag: 'M4 22V4M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1',
  trendUp: 'M22 7l-8.5 8.5-5-5L2 17M16 7h6v6',
  trendDown: 'M22 17l-8.5-8.5-5 5L2 7M16 17h6v-6',
  layers: 'M12 2 2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  // Familia del correo: sobre pequeño arriba a la izquierda y la señal grande abajo a la derecha (a 19 px una señal
  // chica no se distingue). Entregado, rebote, enviado, no abren, autosupresión, saturación y re-engage.
  mailCheck: 'M17 8V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2M2 5l7.5 5L17 5M10 17.5l3.5 3.5L22 12.5',
  mailBounce: 'M17 8V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2M2 5l7.5 5L17 5M21 11v4a3 3 0 0 1-3 3h-8M13.5 14.5 10 18l3.5 3.5',
  mailSend: 'M17 8V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2M2 5l7.5 5L17 5M10 18h12M18 14l4 4-4 4',
  // No enviados va con el sobre entero y la equis chica en la esquina (elegido así en la maqueta de íconos).
  mailX: 'M21 11V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8M3 6l9 6 9-6M16 15l5 5M21 15l-5 5',
  mailEyeOff: 'M17 8V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2M2 5l7.5 5L17 5M9 17.5c1.7-2.6 4.2-4 7-4s5.3 1.4 7 4c-1.7 2.6-4.2 4-7 4s-5.3-1.4-7-4M16 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M21 12l-10 11',
  mailFunnel: 'M17 8V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2M2 5l7.5 5L17 5M10 12h12l-4.5 5v4l-3 1.5V17z',
  mailStack: 'M17 8V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2M2 5l7.5 5L17 5M10 13h12M10 17.5h12M10 22h12',
  mailRefresh: 'M17 8V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2M2 5l7.5 5L17 5M22 16.5a5.5 5.5 0 1 1-1.6-3.9M22 11.5v3.5h-3.5',
  shieldX: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10M9.5 9.5l5 5M14.5 9.5l-5 5',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10M9 12l2 2 4-4',
  // Persona con el signo de prohibido: retenidos por Marketing Cloud (Held).
  userBlocked: 'M2 21v-1a5 5 0 0 1 5-5h3M9 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17.5 22a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9M14.3 14.3l6.4 6.4',
  userX: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 8l5 5M22 8l-5 5',
  tag: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8M7 7h.01',
  percent: 'M19 5 5 19M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  fileText: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8M8 9h2',
  newspaper: 'M4 22h16a2 2 0 0 0 2-2V4H8v16a2 2 0 0 1-4 0V9h4M12 8h6M12 12h6M12 16h6',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
  mail: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l9 6 9-6',
  refresh: 'M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  left: 'M15 6l-6 6 6 6',
  down: 'M6 9l6 6 6-6',
  check: 'M5 12l5 5 9-10',
  close: 'M6 6l12 12M18 6L6 18',
  compare: 'M4 6h16M4 12h10M4 18h6',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  keyboard: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 8v4l3 2',
  right: 'M9 6l6 6-6 6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  monitor: 'M3 4h18v12H3zM8 20h8M12 16v4',
  grid: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  funnel: 'M3 4h18l-7 8v6l-4 2v-8z',
  bars: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M14 4v4M8 10v4M16 16v4',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z'
};

export function Icon({ name, size = 18, class: className = '', label }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
      stroke-linejoin="round" class={className} aria-hidden={label ? undefined : 'true'} role={label ? 'img' : undefined} aria-label={label}>
      <path d={PATHS[name] || ''} />
    </svg>
  );
}
