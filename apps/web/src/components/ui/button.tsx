import { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'surface'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl border text-sm font-semibold whitespace-nowrap',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        size === 'sm' && 'h-10 px-3.5 text-[13px]',
        size === 'md' && 'h-11 px-4',
        size === 'lg' && 'h-12 px-5 text-[15px]',
        size === 'icon' && 'h-11 w-11 rounded-[18px] px-0',
        variant === 'primary' &&
          'border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-strong),var(--accent-warm))] text-slate-950 shadow-[var(--shadow-glow)] hover:-translate-y-0.5 hover:opacity-95',
        variant === 'secondary' &&
          'border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-tertiary)]',
        variant === 'ghost' && 'border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-white/6 hover:text-white',
        variant === 'danger' &&
          'border border-rose-400/16 bg-rose-400/10 text-rose-100 hover:border-rose-400/30 hover:bg-rose-400/16',
        variant === 'surface' &&
          'border-[var(--border-subtle)] bg-white/6 text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-white/10',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}
