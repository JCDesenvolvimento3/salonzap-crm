export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description: string
  actions?: React.ReactNode
}) {
  return (
    <div className="page-enter relative overflow-hidden rounded-[36px] border border-[var(--border-subtle)] bg-[radial-gradient(circle_at_top_right,rgba(127,232,255,0.14),transparent_34%),var(--surface-primary)] p-6 shadow-[var(--shadow-card)] md:p-8">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">{eyebrow}</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] md:text-[15px]">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-3 md:justify-end">{actions}</div> : null}
      </div>
    </div>
  )
}
