// Variación con el ícono de sube o baja (ui/Icon.jsx) delante del texto; sin cambio, solo el texto.
import { cx } from '@/lib/format.mjs';
import { Icon } from './Icon.jsx';

export function Trend({ delta, children, class: className = '' }) {
  const up = delta > 0;
  const moved = delta != null && delta !== 0;
  return (
    <span class={cx('inline-flex items-center gap-1', className)}>
      {moved && <Icon name={up ? 'trendUp' : 'trendDown'} size={13} class="flex-none" />}
      {moved && <span class="sr-only">{up ? 'Sube' : 'Baja'}</span>}
      <span>{children}</span>
    </span>
  );
}
