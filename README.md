# Caídas de email

Web App en Google Apps Script para seguir los envíos de email de Marketing Cloud (SFMC): cuántas comunicaciones se
envían, cómo se entregan y abren, y qué reglas dejan personas sin envío. Cliente Preact + Tailwind v4 compilado con
Vite en tres archivos: `dist/Code.gs`, `dist/Index.html` (JS y CSS integrados) y `dist/appsscript.json`.

## Qué hace

- **Vista general** (para gerencia): comunicaciones distintas enviadas y open rate frente a su histórico; entrega, CTOR,
  rebote y bajas; línea de tiempo de 24 meses con la mitad central de las comunicaciones; calendario de los últimos 3
  meses; familias de comunicación; reglas de protección aplicadas y comunicaciones a revisar. Periodos de mes cerrado:
  **Mes cerrado, U3M, U6M y U12M**, comparados con el periodo anterior. Nunca suma personas entre comunicaciones.
- **Por comunicación**: se elige el día, se busca la comunicación y se ve solo lo de ella, en tres pestañas:
  **Resumen** (de cada 100 personas, por qué no se envió, entrega, interacción, todo contra lo normal), **Motivos de no
  envío** (Pareto) y **Simulador** (qué pasaría si no se aplicara una lista; estimación con supuestos a la vista).

Detalle en [docs/FUNCIONALIDADES.md](docs/FUNCIONALIDADES.md).

## La hoja

El script va vinculado a la hoja de datos. Pestañas (setupApplication crea las que falten, nunca borra):

| Pestaña | Uso |
|---|---|
| `EmailSummary_NotSent` | **Fuente principal.** Un envío (JobID) por fila, con sus métricas y una columna por motivo de no envío. |
| `EmailSummary` + `NotSentData` | Envíos que no estén en la anterior: métricas de la primera, motivos (`jobid`, `asl_cod`, `suppressedcount`) de la segunda. |
| `ASL_Catalog` | Listas de autosupresión: nombre corto (`Descripción Corta`) y descripción. |
| `NotSent_Catalog` | Estados de SFMC (bloqueos preventivos): nombre corto (`NS_ShortName`) y descripción. |

Las tasas «83.33%» y las fechas «9/1/2026 1:39:39 AM» del reporte se leen tal cual. La familia de cada comunicación
sale de su nombre (`_CYBER_`, `_PROMO_`, `_ONBOARDING_`, `_ESTADO_CUENTA_`…; ver `SFMC_FAMILIES` en `src/shared/sfmc.mjs`).
Un motivo que no esté en los catálogos se muestra con su código; los estados de SFMC conocidos cuentan como bloqueo.

## Primeros pasos

```bash
npm install
npm run dev        # http://localhost:5173 con datos de ejemplo (sin Apps Script)
npm run check      # lint + pruebas
npm run build      # dist/ para producción
```

## Publicar

1. En la hoja: Extensiones › Apps Script. Copia el `scriptId` (Configuración del proyecto) en `.clasp.json`
   (desde `.clasp.json.example`) y, si usas un proyecto de pruebas, en `.clasp.dev.json`.
2. `npx clasp login` una vez.
3. `npm run push` sube un build verificado. Luego, desde el editor de Apps Script, ejecuta **`setupApplication`**:
   registra la hoja, crea las pestañas que falten e instala el activador que recalcula al cambiar la hoja.
4. Implementa como aplicación web (ejecutar como quien implementa, acceso del dominio) y guarda el `deploymentId`
   en `environments.json`: desde entonces `npm run deploy` actualiza la misma URL.

La app guarda lo calculado en caché; se recalcula cuando la hoja cambia o con **Actualizar datos**.
