// Carga con estado para lo que se pide al servidor: { status: 'loading' | 'ready' | 'error', data, error } y reintento.
import { useEffect, useState } from 'preact/hooks';

/**
 * key identifica lo pedido como «claveDeDatos|qué» (p. ej. «v3:2026-11-14|2026-10»); vacía, no carga. Mientras carga
 * se conserva lo anterior del mismo «qué» (tras «Actualizar datos» no queda en blanco) o, con keepPrevious, lo
 * anterior de cualquier «qué» (cambiar de periodo no parpadea).
 */
export function useLoad(key, load, { keepPrevious = false } = {}) {
  const [state, setState] = useState({ status: key ? 'loading' : 'ready', data: null, error: '', key: '' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!key) return undefined;
    let alive = true;
    const same = previous => keepPrevious || (Boolean(previous) && previous.split('|')[1] === key.split('|')[1]);
    setState(previous => ({ status: 'loading', data: same(previous.key) ? previous.data : null, error: '', key }));
    load().then(data => { if (alive) setState({ status: 'ready', data, error: '', key }); })
      .catch(error => { if (alive) setState({ status: 'error', data: null, error: error.text || error.message, key }); });
    return () => { alive = false; };
  }, [key, attempt]);
  return [state, () => setAttempt(value => value + 1)];
}
