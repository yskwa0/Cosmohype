import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, style, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium" style={{ color: 'var(--label-text)' }}>
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'w-full px-4 py-3 rounded-xl border transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30',
            error ? 'border-red-400 focus:ring-red-200 focus:border-red-400' : '',
            className
          )}
          style={{
            background: 'var(--input-bg)',
            color: 'var(--input-text)',
            borderColor: error ? undefined : 'var(--input-border)',
            ...style,
          }}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs" style={{ color: 'var(--hint-text)' }}>{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
