import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const autoId = useId();
    const textareaId = id ?? autoId;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-ink-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${textareaId}-error` : undefined}
          className={[
            'min-h-[5.5rem] w-full resize-none rounded-[var(--radius-chip)] border bg-white px-3.5 py-2.5 text-[0.95rem] text-ink-900',
            'placeholder:text-ink-400 transition-colors duration-150',
            'focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 focus:outline-none',
            error ? 'border-brick-500' : 'border-ink-200',
            className,
          ].join(' ')}
          {...props}
        />
        {error && (
          <span id={`${textareaId}-error`} role="alert" className="text-sm text-brick-600">
            {error}
          </span>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
