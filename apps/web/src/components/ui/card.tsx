import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'muted' | 'interactive' | 'spotlight'
}

export function Card({ className, variant = 'default', ...props }: CardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] shadow-[var(--shadow-card)] backdrop-blur-2xl',
        variant === 'muted' && 'bg-[var(--surface-secondary)] shadow-none',
        variant === 'interactive' &&
          'transition duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[0_36px_92px_rgba(0,0,0,0.38)]',
        variant === 'spotlight' &&
          'bg-[radial-gradient(circle_at_top_right,rgba(127,232,255,0.14),transparent_34%),var(--surface-primary)]',
        className,
      )}
      {...props}
    />
  )
}
