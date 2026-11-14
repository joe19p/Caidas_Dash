// La app completa sobre el backend local (el Code.gs real con los datos de ejemplo): vista general, cambio de periodo
// y la vista por comunicación con sus tres pestañas.
import { test, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/preact';
import { App } from '@/app/App.jsx';

const wait = { timeout: 20000 };

test('vista general y vista por comunicación', async () => {
  render(<App />);
  expect(await screen.findByText('Comunicaciones distintas enviadas', {}, wait)).toBeTruthy();
  expect(screen.getByText('Open rate del periodo')).toBeTruthy();
  expect(screen.getByText(/Calendario de envíos/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'U12M' }));
  expect(screen.getByRole('button', { name: 'U12M' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Por volumen' }));
  expect(await screen.findByText(/ponderadas por volumen/)).toBeTruthy();

  fireEvent.click(within(screen.getByRole('navigation', { name: 'Vistas' })).getByRole('button', { name: 'Por comunicación' }));
  expect(await screen.findByText('Por qué no se envió', {}, wait)).toBeTruthy();
  expect(screen.getByText(/De cada 100 personas de esta comunicación/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Motivos de no envío/ }));
  expect(await screen.findByText(/el 80 % de lo que no se envió/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Simulador/ }));
  expect(await screen.findByText('¿Qué pasaría si esta comunicación no aplicara una lista?')).toBeTruthy();
  const switches = screen.getAllByRole('switch');
  fireEvent.click(switches[0]);
  expect(switches[0].getAttribute('aria-checked')).toBe('false');
}, 60000);
