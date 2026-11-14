# Funcionalidades

## Reglas de cálculo

- **No se suman personas entre comunicaciones.** En la vista general se cuentan comunicaciones (maquetas distintas) y
  envíos (JobID), y todo lo demás son tasas.
- **Promediar** (vista general): *por comunicación* = mediana de las tasas de cada envío (cada uno pesa igual), con la
  mitad central (25 %–75 %); *por volumen* = suma de numeradores sobre suma de denominadores.
- **Tasas:** entrega = entregados / enviados; apertura = aperturas únicas / entregados; CTOR = clics únicos / aperturas
  únicas; rebote = rebotes / enviados; bajas = bajas únicas / entregados; no enviado = Total NotSent / TotalBase.
- **Periodos de mes cerrado:** el último mes cerrado es el anterior al actual; U3M, U6M y U12M terminan en él y se
  comparan con el periodo anterior de la misma duración. El mes en curso entra cuando cierra.
- **Lo normal** (vista por comunicación): medianas y pesos de los últimos 3 meses cerrados.

## Vista general

- Protagonistas: **comunicaciones distintas enviadas** (con envíos y promedio por mes) y **open rate del periodo**
  frente a su promedio histórico (24 meses).
- Indicadores: entrega, CTOR, rebote y bajas, con su tendencia y la variación contra el periodo anterior. Al elegir uno
  (o un protagonista) se ve su **línea de tiempo de 24 meses**.
- **Calendario** de los últimos 3 meses cerrados: comunicaciones por día o apertura, promedio por día de la semana y
  enlace a las comunicaciones del día elegido.
- **Por familia de comunicación** y **reglas de protección aplicadas** (peso de cada regla, tendencia, sin juicio de
  bueno o malo).
- **Comunicaciones a revisar:** las que más se alejan de su familia (apertura o CTOR bajos, rebote o bajas altos).

## Por comunicación

1. Día de envío: calendario del mes (punto = día con envíos), con meses anteriores.
2. Comunicación: buscador y lista del día ordenada por audiencia, con una mini barra del destino de la audiencia.

Pestañas:

- **Funnel** (la que abre por defecto): el «Funnel de procesamiento de audiencia» del reporte original, en pequeño.
  Cuatro niveles (origen, procesamiento, cuatro pilares, engagement y desgloses) unidos por flechas del color del
  destino; en pantallas angostas se apilan. Debajo, la tabla «Mapeo de motivos de caída» (volumen, % sobre caídas,
  % de la audiencia y descripción), ordenable.
- **Resumen:** audiencia, no enviados, enviados, entrega, apertura y CTOR contra lo normal; «de cada 100 personas»
  (cuadrícula y tabla con lo normal); por qué no se envió (8 motivos con su peso normal); entrega y tipo de rebote;
  interacción.
- **Motivos de no envío:** Pareto con el acumulado, cuántos motivos explican el 80 % y el peso normal de cada uno.
- **Simulador:** apagar listas de autosupresión y ver personas que recibirían, aperturas estimadas y tasa de rebote.
  Supuestos en `src/shared/simulator.mjs`; las listas legales o de reputación y los bloqueos de SFMC no se pueden quitar.
