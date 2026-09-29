import { useId } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** texto visível ao lado do switch */
  label?: string;
  /** nome acessível quando não há texto visível */
  ariaLabel?: string;
  disabled?: boolean;
  id?: string;
}

export function Switch({ checked, onChange, label, ariaLabel, disabled = false, id }: SwitchProps) {
  const autoId = useId();
  const switchId = id ?? autoId;

  return (
    <div className="inline-flex items-center gap-2.5">
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label ? undefined : ariaLabel}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors',
          "before:absolute before:-inset-x-1 before:-inset-y-2 before:content-['']",
          'disabled:cursor-wait disabled:opacity-60',
          checked ? 'bg-emerald-600' : 'bg-ink-200',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block size-5 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[25px]' : 'translate-x-[3px]',
          ].join(' ')}
        />
      </button>
      {label && (
        <label htmlFor={switchId} className="cursor-pointer text-sm font-medium text-ink-700">
          {label}
        </label>
      )}
    </div>
  );
}
