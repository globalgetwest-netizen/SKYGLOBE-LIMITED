import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-caption font-semibold text-text">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-pill border border-border bg-white px-5 py-3 text-body text-text placeholder:text-gray-400 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-200',
            className
          )}
          {...props}
        />
        {error && <span className="text-caption text-red-500">{error}</span>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
