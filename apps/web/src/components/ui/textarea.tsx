import { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-[120px] w-full rounded-[18px] border border-[var(--border-subtle)] bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-[var(--text-muted)]',
        'focus:border-[var(--accent)]/55 focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(127,232,255,0.08)]',
        className,
      )}
      {...props}
    />
  )
}
