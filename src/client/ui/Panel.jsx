// Sección con título, subtítulo opcional y acciones a la derecha. boxed: en su propio bloque (cada sección de la vista
// general y de Comparar); sin boxed, separada por una línea dentro de un bloque (el detalle de una comunicación).
// id: el de la sección (para llegar a ella desde un enlace); el título usa «id-t».
import { cx } from '@/lib/format.mjs';

export function Panel({ title, subtitle, actions, children, class: className = '', id, boxed = false }) {
  const titleId = id ? `${id}-t` : undefined;
  return (
    <section id={id} aria-labelledby={titleId} class={cx(boxed ? 'panel flex flex-col gap-3 p-4' : 'section-rule', className)}>
      {(title || actions) && (
        <div class="flex flex-wrap items-start justify-between gap-2.5">
          <div class="min-w-0">
            {title && <h2 id={titleId} class="text-[15px] font-bold">{title}</h2>}
            {subtitle && <p class="mt-0.5 text-[12.5px] text-ink-muted">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
