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

A todo el ancho, en una grilla de 12 columnas (en pantallas angostas los bloques se apilan):

- **Barra del periodo:** qué periodo se ve, contra cuál se compara y cómo se promedia (con «Promediar»).
- Protagonistas: **comunicaciones distintas enviadas** (con envíos y promedio por mes) y **open rate del periodo**
  frente a su promedio histórico (24 meses cerrados), junto a los indicadores **entrega, CTOR, rebote y bajas** (2×2),
  con su tendencia y la variación contra el periodo anterior. El mes en curso se ve rayado (barras) o hueco (línea).
- **Línea de tiempo de 24 meses y el mes en curso** (punteado: va a medias) del indicador elegido, en los botones de
  arriba o tocando su tarjeta.
- **Lo que cambió en el periodo** (`src/shared/highlights.mjs`): hasta 5 frases armadas con reglas fijas, cada una con
  su enlace: el mes en curso con la mejor o peor apertura de los 24 meses, el indicador que más se movió, cuántas de
  cada 100 personas no reciben el correo, la regla que más peso ganó, la familia más alejada en apertura, la familia que
  más se repite entre las comunicaciones a revisar y el día de la semana con más envíos. Solo salen si pasan su umbral.
- **Cuántas de cada 100 personas no reciben el correo:** por mes, apilado en autosupresión del CRM, bloqueos de
  Marketing Cloud y rebotes, siempre ponderado por volumen (las medianas de cada destino no suman la del total).
- **Reglas de protección aplicadas** (peso de cada regla en lo no enviado, tendencia, sin juicio de bueno o malo).
- **Calendario** de los 3 meses que terminan en el periodo, lado a lado: comunicaciones por día o apertura, el día
  elegido con el enlace a sus comunicaciones y el promedio por día de la semana.
- **Comunicaciones a revisar:** hasta 5, las que más se alejan de su familia (apertura o CTOR bajos, rebote o bajas
  altos).
- **Por familia de comunicación:** comunicaciones, envíos, entrega, apertura, CTOR, rebote, bajas y «no reciben», con
  la apertura de 24 meses; se ordena tocando el encabezado y se descarga para Excel.
- **Apertura y clic por familia:** cada familia como un círculo (tamaño según sus comunicaciones), con las tasas del
  periodo como referencia.

## Por comunicación

1. Día de envío: calendario del mes elegido en la barra de arriba (punto = día con envíos).
2. Comunicación: filtro y lista del día ordenada por audiencia, con una mini barra del destino de la audiencia y una
   casilla para elegirla y compararla.

Pestañas:

- **Funnel** (la que abre la primera vez; después, la última usada): el «Funnel de procesamiento de audiencia» del reporte original, en pequeño.
  Cuatro niveles (origen, procesamiento, cuatro pilares, engagement y desgloses) unidos por flechas del color del
  destino; en pantallas angostas se apilan. Debajo, la tabla «Mapeo de motivos de caída» (volumen, % sobre caídas,
  % de la audiencia y descripción), ordenable.
- **Resumen:** audiencia, no enviados, enviados, entrega, apertura y CTOR contra lo normal. Debajo, en dos filas:
  «de cada 100 personas» (cuadrícula y tabla con lo normal) junto a la entrega (anillo de lo enviado y un árbol:
  enviados, que se abre en entregados y rebotes, y los rebotes en hard, soft y otros), y por qué no se envió (8 motivos, uno por línea con su peso normal y las personas) junto a la
  interacción (apertura, CTOR, bajas y quejas contra lo normal, y su tabla). Las columnas se separan con una línea; las
  tablas de destino y de motivos se ordenan tocando el encabezado.
- **Motivos de no envío:** Pareto con el acumulado, cuántos motivos explican el 80 % y el peso normal de cada uno. Al
  pasar el mouse nada cambia de tamaño: se aclaran las otras barras, sale su detalle y se marca su fila. Debajo, la tabla
  de todos los motivos (personas, % de lo no enviado, acumulado, lo normal y la diferencia), ordenable y para Excel.
- **Simulador:** apagar listas de autosupresión y ver personas que recibirían y tasa de rebote. No estima aperturas: a
  quien se excluye nunca se le envió, así que no hay datos para saber cuánto abriría.
  Supuestos en `src/shared/simulator.mjs`; las listas legales o de reputación y los bloqueos de SFMC no se pueden quitar.

## Rapidez y datos guardados

- **En el servidor:** la hoja se lee **una vez por versión de los datos**: los registros quedan en caché comprimidos
  (CacheService, 6 horas) y cada cálculo (otro día, otro periodo, otro mes) sale de esa copia. La versión sube con
  «Actualizar datos» y cada vez que alguien cambia la hoja. Lo calculado también queda en caché, con la clave según lo
  que de verdad lo cambia: la vista general por versión y día; un periodo cerrado y el detalle por versión y mes; un
  mes, una búsqueda y una comparación solo por versión.
- **En el navegador:** lo mismo en IndexedDB (`src/client/services/localCache.mjs`), con la clave del servidor
  (`getCacheKey`): al día siguiente, si la hoja no cambió, solo se pide la vista general; meses, comunicaciones,
  búsquedas y periodos cerrados salen de lo guardado. Si la hoja cambió, se borra lo de la versión anterior. Si el
  navegador bloquea IndexedDB, todo funciona igual pidiéndolo al servidor.
- **Avisos al cargar:** sin nada guardado, «Cargando los datos de la hoja…» y luego «Datos listos.»; si la hoja cambió
  desde la última visita, «Información nueva disponible: envíos hasta el …»; si lo guardado sigue vigente, ninguno.
  Cada 2 minutos se revisa si la hoja cambió (la barra de estado y la campana avisan).
- **Precarga:** con la vista general lista, el mes más reciente se pide en segundo plano para «Por comunicación».
- **localStorage** solo guarda preferencias: el tema, la última pestaña de la comunicación, el nivel del Funnel, el
  calendario contraído y las comunicaciones elegidas para comparar (siguen elegidas al recargar).
- **Precálculo diario:** a las 00:10 (hora de Lima) `warmCache` deja calculados la vista general del día y el mes más
  reciente, para que la primera persona no espere. Lo instala `setupApplication`.

## Enlaces, descargas y avisos de la hoja

- **Estado en el enlace** (`state/route.mjs`): la dirección guarda la vista, el periodo, la comunicación abierta (mes,
  día, envío y pestaña) o las comunicaciones que se comparan (`#v=compare&envios=1,2`). Un enlace se puede compartir y
  el botón Atrás vuelve a lo anterior. Un enlace con valores inválidos abre la vista general.
- **Descargar para Excel** (`lib/csv.mjs`): Comparar, las familias de la vista general, la tabla de motivos (Funnel y Motivos) y la del
  Simulador bajan un CSV en UTF-8 con las cifras como número (las tasas en 0.1234) y la tabla tal como se ve (búsqueda y
  orden).
- **Columnas de la hoja:** una columna conocida escrita de otra forma («Open Rate», «open_rate») se lee como la
  esperada; si falta una, la barra de estado dice «Faltan columnas en la hoja» y la actividad nombra cuáles (esas
  cifras se leen como cero).
- **Registro del servidor:** cada función pública queda con su nombre; las que tardan 4 s o más y los errores
  inesperados quedan en el registro de ejecuciones de Apps Script.
- **Tooltips propios** (`ui/TooltipLayer.jsx`): reemplazan a los del navegador en toda la app; toman el `title` de
  cada elemento (en los gráficos, `data-tip`), salen al pasar el mouse o con el teclado y respetan claro y oscuro.
