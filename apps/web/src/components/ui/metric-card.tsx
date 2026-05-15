import { ArrowUpRight, TrendingUp } from 'lucide-react'
import { ReactNode } from 'react'
import { Card } from './card'
import { cn } from '@/lib/utils'

export function MetricCard({
  label,
  value,
  helper,
  icon,
  change,
  tone = 'accent',
}: {
  label: string
  value: string | number
  helper: string
  icon?: ReactNode
  change?: string
  tone?: 'accent' | 'success' | 'warning'
}) {
  return (
    <Card variant="interactive" className="page-enter p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">{label}</p>
          <p className="mono mt-4 text-3xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-[18px] border',
            tone === 'accent' && 'border-[var(--accent)]/14 bg-[var(--accent-soft)] text-[var(--accent)]',
            tone === 'success' && 'border-emerald-300/14 bg-emerald-300/10 text-emerald-100',
            tone === 'warning' && 'border-amber-300/14 bg-amber-300/10 text-amber-50',
          )}
        >
          {icon ?? <ArrowUpRight className="h-4 w-4" />}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-sm leading-6 text-[var(--text-secondary)]">{helper}</p>
        {change ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/6 px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
            <TrendingUp className="h-3.5 w-3.5 text-[var(--accent)]" />
            {change}
          </span>
        ) : null}
      </div>
    </Card>
  )
}
