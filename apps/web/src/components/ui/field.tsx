import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type FieldProps = {
  label: string
  description?: string
  action?: ReactNode
  htmlFor?: string
  className?: string
  children: ReactNode
}

export function Field({ label, description, action, htmlFor, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-[var(--text-primary)]">
          {label}
        </label>
        {action}
      </div>
      {description ? <p className="text-xs leading-5 text-[var(--text-muted)]">{description}</p> : null}
      {children}
    </div>
  )
}
