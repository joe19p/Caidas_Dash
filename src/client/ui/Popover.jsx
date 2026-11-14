// Panel flotante bajo un botón (como en el cronograma): se cierra con Esc o con un clic fuera de `anchor` (el
// contenedor del botón). En pantallas angostas se corre para no salirse por ningún lado.
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import { cx } from '@/lib/format.mjs';

const SCREEN_MARGIN = 8;

/**
 * focusOnClose: a qué volver al cerrar con Esc (selector dentro de `anchor`; por defecto, su primer botón).
 * placement: 'bottom' (debajo del botón) o 'top' (encima, p. ej. en la barra de estado); align: 'left' o 'right'.
 */
export function Popover({ open, onClose, anchor, label, role = 'dialog', focusOnClose = 'button', placement = 'bottom', align = 'left', class: className, children }) {
  const panel = useRef(null);
  useLayoutEffect(() => {
    if (!open || !panel.current) return;
    // Se corre con left o right (no con translate): así la página no cuenta el lugar original y no se ensancha.
    panel.current.style.left = '';
    panel.current.style.right = '';
    const { left, right } = panel.current.getBoundingClientRect();
    // clientWidth y no innerWidth: este, si el panel ya ensanchó la página, lo incluye y la cuenta no corrige nada.
    const overflow = right - (document.documentElement.clientWidth - SCREEN_MARGIN);
    const shift = left < SCREEN_MARGIN ? SCREEN_MARGIN - left : overflow > 0 ? -overflow : 0;
    if (shift && align === 'right') panel.current.style.right = `${-shift}px`;
    else if (shift) panel.current.style.left = `${shift}px`;
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
      class={cx('absolute z-40 max-w-[calc(100vw-1rem)] rounded-xl border border-line bg-surface text-ink shadow-float',
        placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2', align === 'right' ? 'right-0' : 'left-0', className)}>
      {children}
    </div>
  );
}
