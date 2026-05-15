import { ReactNode } from 'react'
import { Card } from './card'

export function EmptyState({
  eyebrow,
  title,
  description,
  action,
  icon,
}: {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <Card variant="spotlight" className="flex flex-col items-center justify-center gap-5 p-10 text-center">
      {icon ? (
        <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[28px] border border-[var(--border-subtle)] bg-white/6 text-[var(--accent)] shadow-[var(--shadow-glow)]">
          {icon}
        </div>
      ) : null}
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--accent)]">{eyebrow}</p>
        ) : null}
        <h3 className="mt-3 text-xl font-semibold text-white">{title}</h3>
        <p className="mt-3 max-w-md text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
      </div>
      {action}
    </Card>
  )
}
