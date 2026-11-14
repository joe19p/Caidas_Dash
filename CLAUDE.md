# Caídas de email

App de Google Apps Script (servidor en `src/server`) con cliente Preact + @preact/signals y Tailwind v4 (`src/client`).
Código compartido en `src/shared`. Emulador y datos de ejemplo para `npm run dev` en `src/local`.
Funcionalidades en `docs/FUNCIONALIDADES.md`.

## Reglas que no se discuten

- **Responder siempre en español** (nombres de archivos, comandos y código quedan tal cual).
- **No publicar nada.** Nunca `npm run push`, `push:dev`, `deploy` ni `clasp`. Tampoco `setupApplication`: se le recuerda
  al usuario al final si hace falta.
- **Commit solo con aprobación.** Tras cada funcionalidad, preguntar «¿Hago el commit?».
- **Plan antes de cambiar** cuando el pedido abarca varias cosas: plan por fases y esperar aprobación.
- **Maqueta antes de rediseñar** una pantalla o componente visible (artifact privado), luego implementar.
- **No sumar personas entre comunicaciones** en la vista general: una misma persona está en muchas. Lo general se
  cuenta en comunicaciones y se mide en tasas (mediana por comunicación o ponderado por volumen), por meses cerrados.

## Convenciones del código

- Textos de la interfaz en español (es-PE), claros y sin jerga técnica. Cifras con coma de miles y punto decimal.
- **Servidor por capas** (`core → auth → domain → operations → integrations → jobs → api`): se concatena en `Code.gs`
  en ese orden (`scripts/build-server.mjs`), después de `shared/messages.mjs`, `sfmc.mjs` y `metrics.mjs`. Un nombre de
  nivel superior no puede repetirse entre archivos. `api/` solo valida y delega; cada función pública va en `runApi_`.
- **Cálculos en `src/shared`** (funciones puras con pruebas): `sfmc.mjs` lee el reporte de SFMC, `metrics.mjs` arma la
  vista general, el mes y el detalle, `simulator.mjs` el simulador (solo cliente; sus supuestos están documentados).
- **Colores:** solo tokens de `src/client/styles/app.css` (`@theme`). Nada de hex ni rgba en JSX; en SVG,
  `var(--color-…)`. Color nuevo: token en `@theme` y su valor en `:root[data-theme="dark"]`. Clases literales.
  Los cuatro colores de destino (entregados, rebotes, bloqueos, autosupresión) están validados para daltonismo.
- **Modo oscuro:** todo componente nuevo debe verse bien en oscuro.
- **Letra:** Schibsted Grotesk en todo. Cifras sin `tabular-nums` (en esta fuente parecen de máquina de escribir).
  Monoespaciada solo para el JobID.
- **Tarjetas solo para lo que se elige o se toca** (`panel`: controles, protagonistas, lista de comunicaciones, detalle
  elegido). Las demás secciones van sobre el fondo con `section-rule` (línea arriba) o `ui/Panel.jsx`.
- **Sin muletillas de plantilla:** nada de rótulos en mayúsculas sobre los títulos, ni textos unidos con «·», ni «→»
  al final de enlaces o botones. Se escribe en frases: «ago 26 – oct 26, comparado con…», «Ver las reglas».
- **Mensajes:** errores y avisos con códigos de `src/shared/messages.mjs`.
- **Controles propios, nunca nativos:** `ui/Segmented.jsx`, interruptores con `role="switch"`, calendario propio.
- Comentarios en español, con la densidad del archivo vecino. Alias: `@/` = `src/client`, `@shared/` = `src/shared`,
  `@local/` = `src/local`.

## Verificar antes de dar algo por terminado

1. `npm run check` (lint + pruebas del servidor y lo compartido con node:test + pruebas de la interfaz con vitest).
2. `npm run build` (compila y corre `scripts/verify-build.js`).
3. Probar con el servidor de desarrollo (`.claude/launch.json`, nombre `dev`, puerto 5173). Revisar consola, claro y oscuro.
