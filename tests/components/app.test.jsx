// La app completa sobre el backend local (el Code.gs real con los datos de ejemplo): vista general, cambio de periodo
// y la vista por comunicación con sus tres pestañas.
import { test, expect } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/preact';
import { App } from '@/app/App.jsx';

const wait = { timeout: 20000 };

test('vista general y vista por comunicación', async () => {
  render(<App />);
  expect(await screen.findByText('Comunicaciones distintas enviadas', {}, wait)).toBeTruthy();
  expect(screen.getByText('Open rate del periodo')).toBeTruthy();
  expect(screen.getByText(/Calendario de envíos/)).toBeTruthy();
  // Barra de periodo: abre en el mes en curso; el largo se elige en el desplegable y las flechas pasan al periodo
  // anterior (que se pide al servidor con getPeriod).
  expect(screen.getByText(/El mes en curso va hasta hoy/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Mes' }));
  fireEvent.click(screen.getByRole('menuitemradio', { name: /12 meses/ }));
  expect(screen.getByRole('button', { name: '12 meses' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Periodo anterior (←)' }));
  await waitFor(() => expect(globalThis.document.querySelector('[aria-busy="true"]')).toBeNull(), wait);
  expect(screen.queryByText(/El mes en curso va hasta hoy/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Este mes' }));
  expect(screen.getByRole('button', { name: 'Mes' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Por volumen' }));
  expect(await screen.findByText(/ponderadas por volumen/)).toBeTruthy();

  fireEvent.click(within(screen.getByRole('navigation', { name: 'Vistas' })).getByRole('button', { name: 'Por comunicación' }));
  // Abre en la pestaña Funnel (el reporte original en pequeño) con su tabla de motivos.
  expect(await screen.findByText('Funnel de procesamiento de audiencia', {}, wait)).toBeTruthy();
  expect(screen.getByText('Mapeo de motivos de caída')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Volumen caído' }));
  fireEvent.click(screen.getByRole('button', { name: /^Resumen$/ }));
  expect(await screen.findByText('Por qué no se envió')).toBeTruthy();
  expect(screen.getByText(/De cada 100 personas de esta comunicación/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Motivos de no envío/ }));
  expect(await screen.findByText(/el 80 % de lo que no se envió/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Simulador/ }));
  expect(await screen.findByText('¿Qué pasaría si esta comunicación no aplicara una lista?')).toBeTruthy();
  const switches = screen.getAllByRole('switch');
  fireEvent.click(switches[0]);
  expect(switches[0].getAttribute('aria-checked')).toBe('false');

  // Buscador global: la palabra se fija como chip; se eligen dos resultados y se comparan.
  const searchBox = screen.getByRole('textbox', { name: 'Buscar comunicación' });
  fireEvent.focus(searchBox);
  fireEvent.input(searchBox, { target: { value: 'promo' } });
  fireEvent.keyDown(searchBox, { key: 'Enter' });
  expect(screen.getByRole('button', { name: 'Quitar promo' })).toBeTruthy();
  const results = await screen.findByRole('dialog', { name: 'Resultados de la búsqueda' }, wait);
  await waitFor(() => expect(within(results).getAllByRole('checkbox').length).toBeGreaterThan(1), wait);
  within(results).getAllByRole('checkbox').slice(0, 2).forEach(box => fireEvent.click(box));
  const tray = screen.getByRole('region', { name: 'Comunicaciones elegidas' });
  expect(within(tray).getByText('2 elegidas')).toBeTruthy();
  fireEvent.click(within(tray).getByRole('button', { name: /Comparar/ }));
  expect(await screen.findByText('Comparar 2 comunicaciones', {}, wait)).toBeTruthy();
  expect(screen.getByText('De cada 100 personas')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Matriz de motivos' }));
  expect(screen.getByText('Otros motivos')).toBeTruthy();
}, 60000);
