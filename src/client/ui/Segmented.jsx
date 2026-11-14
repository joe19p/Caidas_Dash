// Control segmentado (botones con aria-pressed): reemplaza a los radios nativos.
import { cx } from '@/lib/format.mjs';

export function Segmented({ label, options, value, onChange, size = 'md' }) {
  return (
    <div role="group" aria-label={label} class="inline-flex rounded-[10px] border border-line bg-surface-muted p-[3px]">
      {options.map(option => {
        const on = option.value === value;
        return (
          <button key={option.value} type="button" aria-pressed={on} title={option.help} onClick={() => onChange(option.value)}
            class={cx('rounded-lg px-3 font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-brand-text',
              size === 'sm' ? 'h-7 text-xs' : 'h-[30px] text-[13px]',
              on ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink')}>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
