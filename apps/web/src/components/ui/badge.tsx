import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]',
        tone === 'neutral' && 'border-[var(--border-subtle)] bg-white/6 text-[var(--text-secondary)]',
        tone === 'accent' && 'border-[var(--accent)]/18 bg-[var(--accent-soft)] text-[var(--accent)]',
        tone === 'success' && 'border-emerald-300/15 bg-emerald-300/10 text-emerald-100',
        tone === 'warning' && 'border-amber-200/18 bg-amber-200/12 text-amber-50',
        tone === 'danger' && 'border-rose-300/18 bg-rose-300/12 text-rose-100',
        className,
      )}
      {...props}
    />
  )
}
