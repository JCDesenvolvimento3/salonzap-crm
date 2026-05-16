'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ActivityLogEntry, DashboardSummary } from '@/lib/sdk'
import {
  BellRing,
  Bot,
  Clock3,
  LayoutList,
  MessageSquareText,
  PanelsTopLeft,
  Users,
} from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { ExtensionInstallModal } from '@/components/extension-install-modal'
import { useToast } from '@/components/providers/toast-provider'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { MetricCard } from '@/components/ui/metric-card'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import {
  formatCompactNumber,
  formatDateTime,
  formatDueLabel,
  getStatusTone,
  humanizeToken,
} from '@/lib/utils'

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
        const message =
          requestError instanceof Error
            ? requestError.message
            : 'Falha ao carregar o dashboard.'
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

    return [...data.stageDistribution].sort(
      (left, right) => right.contactsCount - left.contactsCount,
    )[0]
  }, [data])

  const contactsTotal = data?.totals.contacts ?? 0

  return (
    <div className="space-y-6">
      <ExtensionInstallModal />

      <PageHeader
        eyebrow="Visao geral"
        title="Central de atendimento e recuperacao de clientes"
        description="Acompanhe a base de clientes, os follow-ups do dia, o funil comercial, as campanhas e o uso da IA com dados reais da operacao."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Clientes ativos"
          value={loading ? '...' : formatCompactNumber(data?.totals.activeContacts ?? 0)}
          helper="contatos cadastrados na operacao"
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          label="Novos clientes hoje"
          value={loading ? '...' : formatCompactNumber(data?.totals.contactsCreatedToday ?? 0)}
          helper="cadastros feitos no dia"
          icon={<LayoutList className="h-4 w-4" />}
        />
        <MetricCard
          label="Follow-ups para hoje"
          value={loading ? '...' : formatCompactNumber(data?.totals.remindersToday ?? 0)}
          helper="lembretes com vencimento hoje"
          icon={<Clock3 className="h-4 w-4" />}
          tone="warning"
        />
        <MetricCard
          label="Lembretes vencidos"
          value={loading ? '...' : formatCompactNumber(data?.totals.remindersOverdue ?? 0)}
          helper="itens atrasados que pedem acao"
          icon={<BellRing className="h-4 w-4" />}
          tone="warning"
        />
        <MetricCard
          label="Campanhas agendadas"
          value={loading ? '...' : formatCompactNumber(data?.totals.campaignsScheduled ?? 0)}
          helper="envios aguardando execucao"
          icon={<MessageSquareText className="h-4 w-4" />}
        />
        <MetricCard
          label="Taxa de conversao"
          value={loading ? '...' : `${data?.conversionRate ?? 0}%`}
          helper="clientes que chegaram na etapa final"
          icon={<PanelsTopLeft className="h-4 w-4" />}
          tone="success"
        />
        <MetricCard
          label="Uso da IA hoje"
          value={loading ? '...' : formatCompactNumber(data?.totals.aiUsageToday ?? 0)}
          helper="acoes executadas pela IA no dia"
          icon={<Bot className="h-4 w-4" />}
        />
        <MetricCard
          label="IA com fallback"
          value={loading ? '...' : formatCompactNumber(data?.totals.aiFallbackCount ?? 0)}
          helper="execucoes que usaram resposta segura"
          icon={<Bot className="h-4 w-4" />}
          tone="warning"
        />
      </div>

      {loading ? <DashboardSkeleton /> : null}

      {!loading && error ? (
        <EmptyState
          eyebrow="Conexao"
          title="Nao foi possivel carregar o dashboard"
          description={error}
          icon={<LayoutList className="h-6 w-6" />}
        />
      ) : null}

      {!loading && data && !contactsTotal ? (
        <Card className="p-6">
          <EmptyState
            eyebrow="Base vazia"
            title="Voce ainda nao possui contatos"
            description="Importe ou cadastre seu primeiro cliente para acompanhar o funil, campanhas, lembretes e uso da IA."
            icon={<Users className="h-6 w-6" />}
          />
        </Card>
      ) : null}

      {!loading && data ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
            <Card variant="spotlight" className="p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <Badge tone="accent">
                    <PanelsTopLeft className="h-3.5 w-3.5" />
                    Clientes por etapa
                  </Badge>
                  <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
                    Clientes por etapa do funil
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                    Veja onde a base esta concentrada para priorizar atendimento, reengajamento e fechamento.
                  </p>
                </div>
                {topStage ? (
                  <div className="rounded-[24px] border border-[var(--border-subtle)] bg-white/6 p-4 md:w-[240px]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                      Etapa com mais clientes
                    </p>
                    <p className="mt-3 text-lg font-semibold text-white">{topStage.name}</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {topStage.contactsCount} clientes nesta etapa.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-8 space-y-5">
                {data.stageDistribution.map((stage) => {
                  const width = contactsTotal
                    ? Math.max((stage.contactsCount / contactsTotal) * 100, stage.contactsCount ? 8 : 0)
                    : 0

                  return (
                    <div
                      key={stage.id}
                      className="rounded-[24px] border border-[var(--border-subtle)] bg-white/[0.035] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
                          <div>
                            <p className="font-medium text-white">{stage.name}</p>
                            <p className="text-sm text-[var(--text-secondary)]">
                              {stage.winProbability}% de chance de conversao
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="mono text-base font-semibold text-white">{stage.contactsCount}</p>
                          <p className="text-sm text-[var(--text-muted)]">clientes</p>
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
                  <Badge tone="success">Uso da IA</Badge>
                  <h2 className="mt-4 text-2xl font-semibold text-white">
                    Operacao da IA no dia
                  </h2>
                </div>
                <Bot className="h-5 w-5 text-[var(--accent)]" />
              </div>

              <div className="mt-6 grid gap-3">
                <SignalRow
                  label="Usos hoje"
                  value={`${data.totals.aiUsageToday}`}
                  helper="sugestoes, resumos, intencoes e campanhas"
                />
                <SignalRow
                  label="Total de logs"
                  value={`${data.totals.aiLogsTotal}`}
                  helper="historico completo em AiLog"
                />
                <SignalRow
                  label="IA com sucesso"
                  value={`${data.totals.aiSuccessCount}`}
                  helper="execucoes finalizadas sem fallback"
                />
                <SignalRow
                  label="Fallback seguro"
                  value={`${data.totals.aiFallbackCount}`}
                  helper="quando a resposta real nao ficou disponivel"
                />
                <SignalRow
                  label="Campanhas enviadas"
                  value={`${data.totals.campaignsSent}`}
                  helper="acoes comerciais concluidas"
                />
                <SignalRow
                  label="Novos clientes no mes"
                  value={`${data.contactsThisMonth}`}
                  helper="cadastros acumulados no mes"
                />
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[var(--border-subtle)] bg-white/6 text-[var(--accent)]">
                  <Clock3 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Agenda operacional</p>
                  <h2 className="text-2xl font-semibold text-white">Proximos lembretes</h2>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {data.upcomingReminders.length ? (
                  data.upcomingReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="rounded-[24px] border border-[var(--border-subtle)] bg-white/[0.035] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{reminder.title}</p>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">
                            {reminder.contact?.name ?? 'Lembrete interno'} - {formatDueLabel(reminder.dueAt)}
                          </p>
                        </div>
                        <Badge tone={getStatusTone(reminder.status)}>
                          {humanizeToken(reminder.status)}
                        </Badge>
                      </div>
                      {reminder.description ? (
                        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                          {reminder.description}
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="Sem lembretes programados"
                    description="Quando a equipe criar follow-ups, eles aparecerao aqui em ordem de vencimento."
                    icon={<BellRing className="h-5 w-5" />}
                  />
                )}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[var(--border-subtle)] bg-white/6 text-[var(--accent)]">
                  <LayoutList className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Atividade operacional</p>
                  <h2 className="text-2xl font-semibold text-white">Ultimas atividades</h2>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {data.recentActivities.length ? (
                  data.recentActivities.map((activity) => (
                    <ActivityRow key={activity.id} activity={activity} />
                  ))
                ) : (
                  <EmptyState
                    title="Sem atividades registradas"
                    description="As proximas criacoes, atualizacoes, movimentos de funil e usos da IA aparecerao nesta timeline."
                    icon={<LayoutList className="h-5 w-5" />}
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

function ActivityRow({ activity }: { activity: ActivityLogEntry }) {
  return (
    <div className="rounded-[24px] border border-[var(--border-subtle)] bg-white/[0.035] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-white">{activity.title}</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {activity.user?.name ?? 'Sistema'} - {formatDateTime(activity.createdAt)}
          </p>
        </div>
        <Badge tone={getActivityTone(activity.action)}>
          {humanizeToken(activity.action)}
        </Badge>
      </div>
      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
        {activity.description}
      </p>
    </div>
  )
}

function SignalRow({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper: string
}) {
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

function getActivityTone(action: string) {
  if (action.includes('deleted') || action.includes('fallback')) {
    return 'warning' as const
  }

  if (action.includes('completed') || action.includes('success')) {
    return 'success' as const
  }

  return 'accent' as const
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
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
          <div className="mt-8 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <Skeleton className="h-[320px] w-full" />
        <Skeleton className="h-[320px] w-full" />
      </div>
    </div>
  )
}
