'use client'

import { useEffect, useMemo, useState } from 'react'
import type { DashboardSummary } from '@salonzap/sdk'
import {
  Activity,
  BellRing,
  ChartSpline,
  Clock3,
  MessageSquareText,
  PanelsTopLeft,
  Sparkles,
  Users,
} from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/providers/toast-provider'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { MetricCard } from '@/components/ui/metric-card'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCompactNumber, formatDateTime, formatDueLabel, getStatusTone, humanizeToken } from '@/lib/utils'

export default function DashboardPage() {
  const { api } = useAuth()
  const { pushToast } = useToast()
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .dashboard()
      .then((response) => {
        setData(response)
        setError(null)
      })
      .catch((requestError) => {
        const message = requestError instanceof Error ? requestError.message : 'Falha ao carregar dashboard.'
        setError(message)
        pushToast({
          title: 'Dashboard indisponivel',
          description: message,
          tone: 'danger',
        })
      })
      .finally(() => setLoading(false))
  }, [api, pushToast])

  const topStage = useMemo(() => {
    if (!data?.stageDistribution.length) {
      return null
    }

    return [...data.stageDistribution].sort((left, right) => right.contactsCount - left.contactsCount)[0]
  }, [data])

  const completionDegrees = Math.min(Math.max((data?.conversionRate ?? 0) * 3.6, 0), 360)
  const contactsTotal = data?.totals.contacts ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Premium command center"
        title="Commercial visibility with the calm of a polished SaaS"
        description="Track salon pipeline pressure, campaign load, and follow-up urgency with refined hierarchy, faster scan paths, and live CRM data."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Contatos ativos"
          value={loading ? '...' : formatCompactNumber(data?.totals.contacts ?? 0)}
          helper="Base comercial viva sincronizada entre CRM e operacao."
          icon={<Users className="h-4 w-4" />}
          change={loading ? undefined : `${data?.contactsThisMonth ?? 0} novos no mes`}
        />
        <MetricCard
          label="Follow-ups hoje"
          value={loading ? '...' : formatCompactNumber(data?.totals.remindersDue ?? 0)}
          helper="Acoes que pedem resposta ainda hoje."
          icon={<BellRing className="h-4 w-4" />}
          tone="warning"
        />
        <MetricCard
          label="Campanhas na fila"
          value={loading ? '...' : formatCompactNumber(data?.totals.campaignsScheduled ?? 0)}
          helper="Envios preparados aguardando execucao."
          icon={<ChartSpline className="h-4 w-4" />}
        />
        <MetricCard
          label="Conversao"
          value={loading ? '...' : `${data?.conversionRate ?? 0}%`}
          helper="Percentual acumulado chegando a cliente."
          icon={<Sparkles className="h-4 w-4" />}
          tone="success"
        />
      </div>

      {loading ? <DashboardSkeleton /> : null}

      {!loading && error ? (
        <EmptyState
          eyebrow="Read issue"
          title="Nao foi possivel carregar a visao executiva"
          description={error}
          icon={<Activity className="h-6 w-6" />}
        />
      ) : null}

      {!loading && data ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.28fr_0.72fr]">
            <Card variant="spotlight" className="p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <Badge tone="accent">
                    <PanelsTopLeft className="h-3.5 w-3.5" />
                    Pipeline flow
                  </Badge>
                  <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">Funnel pressure by stage</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                    The team can spot concentration, stagnation, and progression without reading raw tables first.
                  </p>
                </div>
                {topStage ? (
                  <div className="rounded-[24px] border border-[var(--border-subtle)] bg-white/6 p-4 md:w-[220px]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                      Stage leader
                    </p>
                    <p className="mt-3 text-lg font-semibold text-white">{topStage.name}</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {topStage.contactsCount} contatos concentrados nesta etapa.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-8 space-y-5">
                {data.stageDistribution.map((stage) => {
                  const width = contactsTotal ? Math.max((stage.contactsCount / contactsTotal) * 100, stage.contactsCount ? 8 : 0) : 0

                  return (
                    <div key={stage.id} className="rounded-[24px] border border-[var(--border-subtle)] bg-white/[0.035] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
                          <div>
                            <p className="font-medium text-white">{stage.name}</p>
                            <p className="text-sm text-[var(--text-secondary)]">{stage.winProbability}% win probability</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="mono text-base font-semibold text-white">{stage.contactsCount}</p>
                          <p className="text-sm text-[var(--text-muted)]">contatos</p>
                        </div>
                      </div>
                      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/6">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${width}%`,
                            background: `linear-gradient(90deg, ${stage.color}, rgba(255,255,255,0.85))`,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Badge tone="success">Conversion signal</Badge>
                  <h2 className="mt-4 text-2xl font-semibold text-white">Performance pulse</h2>
                </div>
                <Sparkles className="h-5 w-5 text-[var(--accent)]" />
              </div>

              <div className="mt-8 flex justify-center">
                <div
                  className="relative flex h-48 w-48 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(var(--accent) ${completionDegrees}deg, rgba(255,255,255,0.08) ${completionDegrees}deg 360deg)`,
                  }}
                >
                  <div className="absolute inset-3 rounded-full border border-[var(--border-subtle)] bg-[var(--background-raised)]" />
                  <div className="relative text-center">
                    <p className="mono text-4xl font-semibold text-white">{data.conversionRate}%</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">closing efficiency</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-3">
                <SignalRow
                  label="Novos contatos"
                  value={`${data.contactsThisMonth}`}
                  helper="entradas no mes"
                />
                <SignalRow
                  label="Respostas prontas"
                  value={`${data.totals.quickReplies}`}
                  helper="playbooks ativos"
                />
                <SignalRow
                  label="Campanhas prontas"
                  value={`${data.totals.campaignsScheduled}`}
                  helper="envios agendados"
                />
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[var(--border-subtle)] bg-white/6 text-[var(--accent)]">
                  <Clock3 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Priority queue</p>
                  <h2 className="text-2xl font-semibold text-white">Next reminders</h2>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {data.upcomingReminders.length ? (
                  data.upcomingReminders.map((reminder) => (
                    <div key={reminder.id} className="rounded-[24px] border border-[var(--border-subtle)] bg-white/[0.035] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{reminder.title}</p>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">
                            {reminder.contact?.name ?? 'Lembrete interno'} • {formatDueLabel(reminder.dueAt)}
                          </p>
                        </div>
                        <Badge tone={getStatusTone(reminder.status)}>{humanizeToken(reminder.status)}</Badge>
                      </div>
                      {reminder.description ? (
                        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{reminder.description}</p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="Sem lembretes urgentes"
                    description="Quando a equipe agendar proximos passos, eles aparecerao aqui com maior prioridade."
                    icon={<BellRing className="h-5 w-5" />}
                  />
                )}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[var(--border-subtle)] bg-white/6 text-[var(--accent)]">
                  <MessageSquareText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Context feed</p>
                  <h2 className="text-2xl font-semibold text-white">Latest notes</h2>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {data.recentNotes.length ? (
                  data.recentNotes.map((note) => (
                    <div key={note.id} className="rounded-[24px] border border-[var(--border-subtle)] bg-white/[0.035] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{note.author.name}</p>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">{formatDateTime(note.createdAt)}</p>
                        </div>
                        {note.pinned ? <Badge tone="accent">Fixada</Badge> : null}
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{note.body}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="Sem notas recentes"
                    description="Assim que o time registrar contexto comercial, o feed mostrara o que precisa de memoria compartilhada."
                    icon={<MessageSquareText className="h-5 w-5" />}
                  />
                )}
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}

function SignalRow({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[22px] border border-[var(--border-subtle)] bg-white/[0.035] px-4 py-3">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-sm text-[var(--text-secondary)]">{helper}</p>
      </div>
      <span className="mono text-lg font-semibold text-white">{value}</span>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[1.28fr_0.72fr]">
        <Card className="p-6">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="mt-4 h-10 w-72" />
          <div className="mt-8 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <Skeleton className="h-6 w-32" />
          <div className="mt-8 flex justify-center">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>
          <div className="mt-8 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Skeleton className="h-[320px] w-full" />
        <Skeleton className="h-[320px] w-full" />
      </div>
    </div>
  )
}
