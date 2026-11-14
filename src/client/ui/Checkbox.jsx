// Casilla propia (role="checkbox"): reemplaza a la nativa, con el mismo aspecto en claro y oscuro.
import { cx } from '@/lib/format.mjs';
import { Icon } from './Icon.jsx';

export function Checkbox({ checked, onChange, label, disabled = false, class: className }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} title={label} disabled={disabled}
      onClick={event => { event.stopPropagation(); onChange(!checked); }}
      class={cx('inline-flex size-[18px] flex-none items-center justify-center rounded-[5px] border-[1.5px] transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-text disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface hover:border-brand-text', className)}>
      {checked && <Icon name="check" size={13} />}
    </button>
  );
}
