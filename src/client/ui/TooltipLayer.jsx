// Tooltip propio para toda la app (en lugar del del navegador). Sin cambiar cada componente: al pasar el mouse o al
// enfocar algo con `title`, se pasa su texto a data-tip, se quita el title (así el navegador no muestra el suyo) y se
// muestra este, arriba o abajo según el espacio. Si el elemento no tenía nombre accesible, el texto queda como
// aria-label: los lectores de pantalla no pierden nada. En los gráficos (SVG) se usa data-tip directamente: un <title>
// mostraría el del navegador y quitarlo rompería el dibujo de Preact.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

const DELAY_MS = 350;
const GAP = 8;
const MARGIN = 8;

/** Pasa el texto del title a data-tip y devuelve el elemento con tooltip, o null. */
function adopt(start) {
  for (let node = start; node && node.nodeType === 1; node = node.parentElement) {
    if (node.closest?.('[role="tooltip"]')) return null;
    const text = node.getAttribute('title') || '';
    if (text.trim()) {
      node.setAttribute('data-tip', text.trim());
      node.removeAttribute('title');
      const named = node.getAttribute('aria-label') || node.getAttribute('aria-labelledby') || (node.textContent || '').trim();
      if (!named) node.setAttribute('aria-label', text.trim());
      return node;
    }
    if (node.hasAttribute('data-tip')) return node;
    if (node.tagName === 'BODY') return null;
  }
  return null;
}

export function TooltipLayer() {
  const [tip, setTip] = useState(null);
  const bubble = useRef(null);
  const timer = useRef(0);
  const current = useRef(null);

  useEffect(() => {
    const hide = () => {
      clearTimeout(timer.current);
      if (current.current) current.current.removeAttribute('aria-describedby');
      current.current = null;
      setTip(null);
    };
    const show = (event, immediate) => {
      const element = adopt(event.target);
      if (!element || element === current.current) return;
      hide();
      current.current = element;
      timer.current = setTimeout(() => {
        if (!element.isConnected) return;
        element.setAttribute('aria-describedby', 'app-tooltip');
        setTip({ text: element.getAttribute('data-tip'), rect: element.getBoundingClientRect() });
      }, immediate ? 0 : DELAY_MS);
    };
    const over = event => show(event, false);
    const out = event => { if (current.current && !current.current.contains(event.relatedTarget)) hide(); };
    // Con el teclado: solo cuando el foco se ve (no al hacer clic).
    const focus = event => { if (event.target.matches?.(':focus-visible')) show(event, true); };
    const key = event => { if (event.key === 'Escape') hide(); };
    document.addEventListener('pointerover', over);
    document.addEventListener('pointerout', out);
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', hide);
    document.addEventListener('pointerdown', hide);
    document.addEventListener('keydown', key);
    globalThis.addEventListener('scroll', hide, true);
    return () => {
      hide();
      document.removeEventListener('pointerover', over);
      document.removeEventListener('pointerout', out);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('pointerdown', hide);
      document.removeEventListener('keydown', key);
      globalThis.removeEventListener('scroll', hide, true);
    };
  }, []);

  // Arriba del elemento si hay lugar; si no, abajo. Siempre dentro de la pantalla.
  useLayoutEffect(() => {
    const node = bubble.current;
    if (!tip || !node) return;
    const { rect } = tip;
    const width = node.offsetWidth;
    const height = node.offsetHeight;
    const viewport = document.documentElement.clientWidth;
    const left = Math.min(Math.max(MARGIN, rect.left + rect.width / 2 - width / 2), viewport - width - MARGIN);
    const above = rect.top - height - GAP;
    node.style.left = `${Math.round(left)}px`;
    node.style.top = `${Math.round(above >= MARGIN ? above : rect.bottom + GAP)}px`;
    node.style.visibility = 'visible';
  }, [tip]);

  if (!tip) return null;
  return (
    <div ref={bubble} id="app-tooltip" role="tooltip" style={{ visibility: 'hidden' }}
      class="pointer-events-none fixed z-[60] max-w-xs rounded-lg bg-ink px-2.5 py-1.5 text-xs leading-snug font-medium text-surface shadow-float">
      {tip.text}
    </div>
  );
}
