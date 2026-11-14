// Estados de carga, vacío y error: nunca una pantalla en blanco.
import { Icon } from './Icon.jsx';

export function Skeleton({ class: className = 'h-24' }) {
  return <div class={`animate-pulse rounded-card bg-surface-muted ${className}`} aria-hidden="true" />;
}

/** icon: el de lo que falta (del catálogo); children: acción opcional (un botón) debajo del texto. */
export function EmptyState({ title, text, icon = 'info', children }) {
  return (
    <div class="panel flex flex-col items-center gap-2 p-10 text-center">
      <span class="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand-text"><Icon name={icon} size={22} /></span>
      <b class="text-[15px]">{title}</b>
      {text && <p class="max-w-md text-[13px] text-ink-muted">{text}</p>}
      {children && <div class="mt-2">{children}</div>}
    </div>
  );
}

export function ErrorState({ text, onRetry }) {
  return (
    <div role="alert" class="panel flex flex-col items-center gap-3 p-10 text-center">
      <Icon name="alert" size={22} class="text-danger" />
      <p class="max-w-md text-[13px]">{text}</p>
      {onRetry && <button type="button" class="btn" onClick={onRetry}><Icon name="refresh" size={16} />Reintentar</button>}
    </div>
  );
}
