// Pastilla con el ícono de un indicador (features/general/metricsDefs.mjs → METRIC_ICONS), junto a su nombre.
import { cx } from '@/lib/format.mjs';
import { METRIC_ICONS } from '@/features/general/metricsDefs.mjs';
import { Icon } from './Icon.jsx';

export function MetricIcon({ metric, size = 'size-[26px]', iconSize = 15 }) {
  const [name, tone] = METRIC_ICONS[metric] || ['info', 'bg-surface-muted text-ink-muted'];
  return <span class={cx('inline-flex flex-none items-center justify-center rounded-lg', size, tone)} aria-hidden="true"><Icon name={name} size={iconSize} /></span>;
}
