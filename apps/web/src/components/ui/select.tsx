import { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-12 w-full appearance-none rounded-[18px] border border-[var(--border-subtle)] bg-white/6 px-4 text-sm text-white outline-none',
        'focus:border-[var(--accent)]/55 focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(127,232,255,0.08)]',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
