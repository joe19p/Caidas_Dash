// Panel flotante bajo un botón (como en el cronograma): se cierra con Esc o con un clic fuera de `anchor` (el
// contenedor del botón). En pantallas angostas se corre para no salirse por ningún lado.
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import { cx } from '@/lib/format.mjs';

const SCREEN_MARGIN = 8;

/** focusOnClose: a qué volver al cerrar con Esc (selector dentro de `anchor`; por defecto, su primer botón). */
export function Popover({ open, onClose, anchor, label, role = 'dialog', focusOnClose = 'button', class: className, children }) {
  const panel = useRef(null);
  useLayoutEffect(() => {
    if (!open || !panel.current) return;
    // Se corre con left (no con translate): así la página tampoco cuenta el lugar original y no se ensancha.
    panel.current.style.left = '';
    const { left, right } = panel.current.getBoundingClientRect();
    // clientWidth y no innerWidth: este, si el panel ya ensanchó la página, lo incluye y la cuenta no corrige nada.
    const overflow = right - (document.documentElement.clientWidth - SCREEN_MARGIN);
    if (left < SCREEN_MARGIN) panel.current.style.left = `${SCREEN_MARGIN - left}px`;
    else if (overflow > 0) panel.current.style.left = `${-overflow}px`;
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const outside = event => { if (!anchor.current?.contains(event.target)) onClose(); };
    const escape = event => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
      anchor.current?.querySelector(focusOnClose)?.focus();
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape, true); };
  }, [open]);
  if (!open) return null;
  return (
    <div ref={panel} role={role} aria-label={label}
      class={cx('absolute top-full left-0 z-40 mt-2 max-w-[calc(100vw-1rem)] rounded-xl border border-line bg-surface text-ink shadow-float', className)}>
      {children}
    </div>
  );
}
