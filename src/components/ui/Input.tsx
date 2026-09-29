import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, id, className = '', ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const messageId = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-ink-700">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <span aria-hidden="true" className="pointer-events-none absolute left-3 text-ink-400">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={messageId}
            className={[
              'h-11 w-full rounded-[var(--radius-chip)] border bg-white px-3.5 text-[0.95rem] text-ink-900',
              'placeholder:text-ink-400 transition-colors duration-150',
              'focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 focus:outline-none',
              icon ? 'pl-10' : '',
              error ? 'border-brick-500' : 'border-ink-200',
              className,
            ].join(' ')}
            {...props}
          />
        </div>
        {error ? (
          <span id={messageId} role="alert" className="text-sm text-brick-600">
            {error}
          </span>
        ) : hint ? (
          <span id={messageId} className="text-sm text-ink-400">
            {hint}
          </span>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';
