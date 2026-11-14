// Diálogo propio (no el nativo del navegador): fondo oscurecido, se cierra con Esc, con el botón o tocando fuera, y
// devuelve el foco a lo que lo abrió.
import { useEffect, useRef } from 'preact/hooks';
import { Icon } from './Icon.jsx';

export function Dialog({ open, onClose, title, children }) {
  const panel = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const before = document.activeElement;
    panel.current?.querySelector('button')?.focus();
    const escape = event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('keydown', escape, true); before?.focus?.(); };
  }, [open]);
  if (!open) return null;
  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title}
        class="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-card border border-line bg-surface text-ink shadow-float">
        <div class="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 class="text-base font-bold">{title}</h2>
          <button type="button" class="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink" aria-label="Cerrar" onClick={onClose}><Icon name="close" size={16} /></button>
        </div>
        <div class="overflow-y-auto px-5 py-4 text-sm">{children}</div>
      </div>
    </div>
  );
}
