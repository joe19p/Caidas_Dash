// Menú desplegable (como el de «Vista» del cronograma): se abre con clic o teclado, se recorre con flechas y se cierra
// con Esc o con un clic fuera. items: [{ label, hint?, active?, onSelect } | 'separator'].
import { useEffect, useRef, useState } from 'preact/hooks';
import { cx } from '@/lib/format.mjs';
import { Popover } from './Popover.jsx';

export function Dropdown({ label, renderTrigger, items }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  useEffect(() => {
    if (open) (root.current?.querySelector('[role="menuitemradio"][aria-checked="true"]') || root.current?.querySelector('[role="menuitemradio"]'))?.focus();
  }, [open]);
  const onKey = event => {
    if (!open) return;
    const entries = [...(root.current?.querySelectorAll('[role="menuitemradio"]') || [])];
    const index = entries.indexOf(document.activeElement);
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (step) { event.preventDefault(); entries[(index + step + entries.length) % entries.length]?.focus(); }
  };
  return (
    <div ref={root} class="relative" onKeyDown={onKey}>
      {renderTrigger({ 'aria-haspopup': 'menu', 'aria-expanded': open, title: label, onClick: () => setOpen(!open) }, open)}
      <Popover open={open} onClose={() => setOpen(false)} anchor={root} role="menu" label={label} class="mt-1 w-max min-w-56 rounded-lg py-1">
        {items.map((item, index) => (item === 'separator'
          ? <div key={`s${index}`} role="separator" class="my-1 border-t border-line" />
          : (
            <button key={item.label} type="button" role="menuitemradio" aria-checked={Boolean(item.active)}
              onClick={() => { setOpen(false); item.onSelect(); root.current?.querySelector('[aria-haspopup]')?.focus(); }}
              class={cx('flex w-full items-center justify-between gap-6 px-3 py-2 text-left text-sm hover:bg-surface-muted focus:bg-surface-muted focus:outline-none',
                item.active && 'font-semibold text-brand-text')}>
              <span>{item.label}</span>
              {item.hint && <kbd class="rounded border border-line px-1.5 font-sans text-xs text-ink-muted">{item.hint}</kbd>}
            </button>
          )))}
      </Popover>
    </div>
  );
}
