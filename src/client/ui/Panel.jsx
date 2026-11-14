// Tarjeta con título, subtítulo opcional y acciones a la derecha.
import { cx } from '@/lib/format.mjs';

export function Panel({ title, subtitle, actions, children, class: className = '', id }) {
  const titleId = id ? `${id}-t` : undefined;
  return (
    <section aria-labelledby={titleId} class={cx('panel flex flex-col gap-3 p-5', className)}>
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
