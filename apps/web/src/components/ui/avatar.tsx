import { HTMLAttributes } from 'react'
import { cn, initials } from '@/lib/utils'

type AvatarProps = HTMLAttributes<HTMLDivElement> & {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showStatus?: boolean
}

const sizeClasses = {
  sm: 'h-10 w-10 rounded-[14px] text-xs',
  md: 'h-12 w-12 rounded-[16px] text-sm',
  lg: 'h-16 w-16 rounded-[22px] text-lg',
  xl: 'h-20 w-20 rounded-[28px] text-xl',
} as const

export function Avatar({
  className,
  name,
  src,
  size = 'md',
  showStatus = false,
  ...props
}: AvatarProps) {
  return (
    <div className="relative inline-flex">
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden border border-white/8 bg-[linear-gradient(135deg,rgba(127,232,255,0.18),rgba(255,255,255,0.08))] font-semibold text-white shadow-[var(--shadow-glow)]',
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span>{initials(name)}</span>
        )}
      </div>

      {showStatus ? (
        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--background)] bg-[var(--success)]" />
      ) : null}
    </div>
  )
}
