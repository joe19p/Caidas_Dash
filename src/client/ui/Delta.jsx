// Variación con flecha y color según si mejora o empeora. better: 'up' | 'down' | 'none' (gris siempre).
import { cx, fmtPts } from '@/lib/format.mjs';
import { Trend } from './Trend.jsx';

export function deltaTone(delta, better, tolerance = 0.0005) {
  if (delta == null || better === 'none' || Math.abs(delta) < tolerance) return 'text-ink-muted';
  return (better === 'up' ? delta > 0 : delta < 0) ? 'text-success' : 'text-danger';
}

export function Delta({ delta, better = 'up', suffix = '', digits = 1, text, class: className = '' }) {
  if (delta == null && !text) return <span class={cx('text-xs text-ink-muted', className)}>{text || 'Sin dato anterior'}</span>;
  return (
    <Trend delta={text ? null : delta} class={cx('text-xs font-semibold', deltaTone(delta, better), className)}>
      {text || `${fmtPts(Math.abs(delta), digits).replace('+', '')}${suffix}`}
    </Trend>
  );
}
