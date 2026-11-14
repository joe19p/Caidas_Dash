# Funcionalidades

## Reglas de cálculo

- **No se suman personas entre comunicaciones.** En la vista general se cuentan comunicaciones (maquetas distintas) y
  envíos (JobID), y todo lo demás son tasas.
- **Promediar** (vista general): *por comunicación* = mediana de las tasas de cada envío (cada uno pesa igual), con la
  mitad central (25 %–75 %); *por volumen* = suma de numeradores sobre suma de denominadores.
- **Tasas:** entrega = entregados / enviados; apertura = aperturas únicas / entregados; CTOR = clics únicos / aperturas
  únicas; rebote = rebotes / enviados; bajas = bajas únicas / entregados; no enviado = Total NotSent / TotalBase.
- **Periodos:** un mes, 3, 6 o 12 meses que terminan en el mes elegido, o un rango a elección (hasta 36 meses). Se
  comparan con el periodo anterior de la misma duración. Si el periodo llega al mes en curso, ese mes cuenta hasta hoy y
  el periodo anterior también corta en el mismo día (1–14 nov contra 1–14 oct): un mes a medias no parece una caída.
- **Lo normal** (vista por comunicación): medianas y pesos de los últimos 3 meses cerrados.

## Barra de periodo

Como la navegación del cronograma, en la barra azul: **[Este mes] [Largo ▾] [Periodo ▾] [‹] [›]**.

- Abre en el **mes en curso**. «Este mes» vuelve a él.
- El desplegable elige el largo: Mes, 3 meses, 6 meses, 12 meses o «Rango a elección…».
- La etiqueta abre un calendario de meses (un año por vista; los meses sin envíos no se eligen; el punto marca el mes en
  curso). Con 3, 6 o 12 meses se elige el último mes; con rango, el inicio y luego el final.
- Las flechas pasan al periodo anterior o siguiente completo.
- Teclado: H (mes en curso), ← y → (periodo), y en la vista general M, 3, 6, 1 (12 meses) y R (rango).
- En «Por comunicación» la barra solo elige el mes (sin largo). Las dos vistas comparten el mes: «Por comunicación»
  abre en el último mes del periodo y, si allí se cambia de mes, la vista general queda en ese mes.
- Los periodos que terminan en el mes en curso vienen con la vista general; los demás se piden al servidor
  (`getPeriod`) y quedan en caché. Mientras llega uno nuevo, se ve el anterior atenuado.

## Buscador

Como el del cronograma, en la barra azul (atajo «/»):

- Cada palabra queda como chip con Enter o coma; Retroceso quita la última. **O** muestra las comunicaciones con alguna
  palabra y **Y** las que tienen todas. Busca en el nombre, el JobID y la familia, sin distinguir mayúsculas ni tildes.
- Busca en el mes de la barra (lo ya cargado) y, con «Buscar en todos los meses», en todo (`searchCommunications`,
  con caché). El JobID exacto va primero; se muestran hasta 200, las más recientes.
- Cada resultado, agrupado por día: nombre con las palabras resaltadas, hora, JobID y un resumen de la caída
  (personas, % enviado y el motivo con más caída) con la mini barra del destino. El nombre abre la comunicación; la
  casilla la elige para comparar. «Elegir las N» marca todas las del resultado.

## Comparar

- Se eligen hasta 50 comunicaciones desde el buscador o con la casilla de la lista del día. Quedan elegidas aunque
  cambie la búsqueda, el día o el mes; la bandeja de abajo muestra cuántas son, sus JobID, «Quitar todas» y «Comparar».
- La vista **Comparar** (pestaña de la barra, con el número de elegidas) las muestra lado a lado, cada una por
  separado (no se suman personas entre ellas), con `getCompare`:
  - **De cada 100 personas:** una barra por comunicación (entregados, rebotes, bloqueos y autosupresión) y cuánto cae.
  - **Tabla:** audiencia, enviado, no enviado, autosupresión, bloqueos, rebote, apertura, CTOR y motivo principal;
    se ordena tocando el encabezado y cada nombre abre la comunicación.
  - **Matriz de motivos:** los 8 motivos de más peso en la selección (y «Otros motivos»); cada celda es la parte de la
    audiencia que cayó por ese motivo, en la escala de 5 pasos.

## Vista general

- Protagonistas: **comunicaciones distintas enviadas** (con envíos y promedio por mes) y **open rate del periodo**
  frente a su promedio histórico (24 meses cerrados). El mes en curso se ve rayado (barras) o hueco (línea).
- Indicadores: entrega, CTOR, rebote y bajas, con su tendencia y la variación contra el periodo anterior. Al elegir uno
  (o un protagonista) se ve su **línea de tiempo de 24 meses y el mes en curso** (punteado: va a medias).
- **Calendario** de los 3 meses que terminan en el periodo elegido: comunicaciones por día o apertura, promedio por día de la semana y
  enlace a las comunicaciones del día elegido.
- **Por familia de comunicación** y **reglas de protección aplicadas** (peso de cada regla, tendencia, sin juicio de
  bueno o malo).
- **Comunicaciones a revisar:** las que más se alejan de su familia (apertura o CTOR bajos, rebote o bajas altos).

## Por comunicación

1. Día de envío: calendario del mes elegido en la barra de arriba (punto = día con envíos).
2. Comunicación: filtro y lista del día ordenada por audiencia, con una mini barra del destino de la audiencia y una
   casilla para elegirla y compararla.

Pestañas:

- **Funnel** (la que abre la primera vez; después, la última usada): el «Funnel de procesamiento de audiencia» del reporte original, en pequeño.
  Cuatro niveles (origen, procesamiento, cuatro pilares, engagement y desgloses) unidos por flechas del color del
  destino; en pantallas angostas se apilan. Debajo, la tabla «Mapeo de motivos de caída» (volumen, % sobre caídas,
  % de la audiencia y descripción), ordenable.
- **Resumen:** audiencia, no enviados, enviados, entrega, apertura y CTOR contra lo normal; «de cada 100 personas»
  (cuadrícula y tabla con lo normal); por qué no se envió (8 motivos con su peso normal); entrega y tipo de rebote;
  interacción.
- **Motivos de no envío:** Pareto con el acumulado, cuántos motivos explican el 80 % y el peso normal de cada uno.
- **Simulador:** apagar listas de autosupresión y ver personas que recibirían, aperturas estimadas y tasa de rebote.
  Supuestos en `src/shared/simulator.mjs`; las listas legales o de reputación y los bloqueos de SFMC no se pueden quitar.

## Rapidez y datos guardados

- **En el servidor:** lo calculado queda en caché (CacheService, 6 horas) con la versión de los datos y el día en la
  clave. La versión sube con «Actualizar datos» y cada vez que alguien cambia la hoja.
- **En el navegador:** la vista general, los meses y cada comunicación abierta quedan en IndexedDB
  (`src/client/services/localCache.mjs`) con la misma clave (`getCacheKey`). Volver a abrir la app, a un mes o a una
  comunicación no espera al servidor mientras la clave no cambie; si cambia, lo anterior se borra. Si el navegador
  bloquea IndexedDB, todo funciona igual pidiéndolo al servidor.
- **Precarga:** con la vista general lista, el mes más reciente se pide en segundo plano para «Por comunicación».
- **localStorage** solo guarda preferencias: el tema y la última pestaña de la comunicación.
