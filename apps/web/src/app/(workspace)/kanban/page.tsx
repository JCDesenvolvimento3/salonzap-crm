'use client'

/* eslint-disable react-hooks/exhaustive-deps */

import { startTransition, useEffect, useMemo, useState } from 'react'
import type { Contact, KanbanBoard } from '@salonzap/sdk'
import { GripVertical, PanelsTopLeft, Sparkles } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/providers/toast-provider'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { MetricCard } from '@/components/ui/metric-card'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, hexToRgba } from '@/lib/utils'

export default function KanbanPage() {
  const { api } = useAuth()
  const { pushToast } = useToast()
  const [board, setBoard] = useState<KanbanBoard | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [targetStageId, setTargetStageId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadBoard = async () => {
    const response = await api.kanban()
    setBoard(response)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBoard()
      .catch((loadError) => {
        const message = loadError instanceof Error ? loadError.message : 'Falha ao carregar kanban.'
        setError(message)
        pushToast({
          title: 'Kanban indisponivel',
          description: message,
          tone: 'danger',
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const moveCard = async (targetId: string) => {
    if (!draggedId || !board) {
      return
    }

    const currentStage = board.stages.find((stage) => stage.contacts.some((contact) => contact.id === draggedId))
    if (!currentStage || currentStage.id === targetId) {
      return
    }

    const contact = currentStage.contacts.find((item) => item.id === draggedId)
    if (!contact) {
      return
    }

    startTransition(() => {
      setBoard((current) => {
        if (!current) {
          return current
        }

        return {
          stages: current.stages.map((stage) => {
            if (stage.id === currentStage.id) {
              return {
                ...stage,
                contacts: stage.contacts.filter((item) => item.id !== draggedId),
              }
            }

            if (stage.id === targetId) {
              return {
                ...stage,
                contacts: [
                  {
                    ...contact,
                    stage: {
                      id: stage.id,
                      name: stage.name,
                      slug: stage.slug,
                      color: stage.color,
                      order: stage.order,
                      winProbability: stage.winProbability,
                    },
                  },
                  ...stage.contacts,
                ],
              }
            }

            return stage
          }),
        }
      })
    })

    try {
      await api.moveContact({
        contactId: draggedId,
        targetStageId: targetId,
      })

      pushToast({
        title: 'Contato movido',
        description: 'O pipeline foi sincronizado com o backend.',
        tone: 'success',
      })
    } catch (moveError) {
      const message = moveError instanceof Error ? moveError.message : 'Falha ao mover contato.'
      setError(message)
      pushToast({
        title: 'Movimento nao concluido',
        description: message,
        tone: 'danger',
      })
      await loadBoard()
    } finally {
      setDraggedId(null)
      setTargetStageId(null)
    }
  }

  const boardMetrics = useMemo(() => {
    const contactsCount = board?.stages.reduce((count, stage) => count + stage.contacts.length, 0) ?? 0
    const strongestStage = board?.stages.length
      ? board.stages.reduce((best, stage) => (stage.winProbability > best.winProbability ? stage : best), board.stages[0])
      : null

    return {
      stages: board?.stages.length ?? 0,
      contactsCount,
      strongestStage,
    }
  }, [board])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline flow"
        title="A more fluid kanban for a salon team that lives on movement"
        description="Scroll across stages, drag high-intent leads, and keep the sales board readable on desktop and mobile without changing the existing backend contracts."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Stages" value={loading ? '...' : boardMetrics.stages} helper="colunas ativas no pipeline" />
        <MetricCard label="Contatos" value={loading ? '...' : boardMetrics.contactsCount} helper="itens distribuidos no board" />
        <MetricCard
          label="Win leader"
          value={loading ? '...' : `${boardMetrics.strongestStage?.winProbability ?? 0}%`}
          helper={boardMetrics.strongestStage?.name ?? 'sem lideranca'}
        />
        <MetricCard label="Drag state" value={draggedId ? 'Live' : 'Idle'} helper="persistencia otimista com rollback seguro" />
      </div>

      {error ? (
        <Card variant="muted" className="border-rose-400/16 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </Card>
      ) : null}

      {loading ? (
        <KanbanSkeleton />
      ) : board?.stages.length ? (
        <div className="overflow-x-auto pb-2 scroll-smooth">
          <div className="flex min-w-max snap-x snap-mandatory gap-4 pb-1">
            {board.stages.map((stage) => (
              <Card
                key={stage.id}
                variant="interactive"
                className="flex min-h-[560px] w-[280px] shrink-0 snap-start flex-col p-4 sm:w-[300px] xl:min-h-[620px] xl:w-[320px]"
                onDragOver={(event) => {
                  event.preventDefault()
                  setTargetStageId(stage.id)
                }}
                onDragLeave={() => setTargetStageId((current) => (current === stage.id ? null : current))}
                onDrop={async () => {
                  await moveCard(stage.id)
                }}
              >
                <div
                  className="rounded-[24px] border px-4 py-4"
                  style={{
                    borderColor: targetStageId === stage.id ? hexToRgba(stage.color, 0.45) : undefined,
                    background:
                      targetStageId === stage.id
                        ? `linear-gradient(180deg, ${hexToRgba(stage.color, 0.18)}, rgba(255,255,255,0.04))`
                        : undefined,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
                        <h2 className="text-lg font-semibold text-white">{stage.name}</h2>
                      </div>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">{stage.contacts.length} contatos no stage</p>
                    </div>
                    <Badge tone="accent" className="normal-case tracking-[0.08em]">
                      {stage.winProbability}% win
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 flex flex-1 flex-col gap-3">
                  {stage.contacts.length ? (
                    stage.contacts.map((contact) => (
                      <KanbanContactCard
                        key={contact.id}
                        contact={contact}
                        active={draggedId === contact.id}
                        onDragStart={() => setDraggedId(contact.id)}
                        onDragEnd={() => {
                          setDraggedId(null)
                          setTargetStageId(null)
                        }}
                      />
                    ))
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-[28px] border border-dashed border-[var(--border-subtle)] bg-white/[0.03] p-6 text-center">
                      <Sparkles className="h-5 w-5 text-[var(--accent)]" />
                      <p className="mt-3 text-sm font-medium text-white">Drop zone pronta</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        Arraste um contato para este stage e o backend sera sincronizado automaticamente.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title="Kanban vazio"
          description="Assim que houver stages e contatos, o funil arrastavel aparecera aqui."
          icon={<PanelsTopLeft className="h-6 w-6" />}
        />
      )}
    </div>
  )
}

function KanbanContactCard({
  contact,
  active,
  onDragStart,
  onDragEnd,
}: {
  contact: Contact
  active: boolean
  onDragStart: () => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="cursor-grab rounded-[24px] border border-[var(--border-subtle)] bg-white/[0.035] p-4 transition active:cursor-grabbing"
      style={{
        transform: active ? 'rotate(1deg) scale(0.99)' : undefined,
        opacity: active ? 0.72 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Avatar name={contact.name} src={contact.avatarUrl} />
          <div className="min-w-0">
            <p className="font-semibold text-white">{contact.name}</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {contact.phone || contact.email || 'Sem contato principal'}
            </p>
          </div>
        </div>
        <GripVertical className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
      </div>

      <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
        {contact.statusText || 'Sem resumo comercial registrado para este lead.'}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {contact.tags.length ? (
          contact.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag.id}
              className="normal-case tracking-[0.08em]"
              style={{ backgroundColor: hexToRgba(tag.color, 0.14) }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
              {tag.name}
            </Badge>
          ))
        ) : (
          <Badge>Sem tags</Badge>
        )}
      </div>

      <p className="mt-4 text-xs text-[var(--text-muted)]">Atualizado em {formatDateTime(contact.updatedAt)}</p>
    </div>
  )
}

function KanbanSkeleton() {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="w-[280px] shrink-0 p-4 sm:w-[300px] xl:w-[320px]">
            <Skeleton className="h-20 w-full" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, childIndex) => (
                <Skeleton key={childIndex} className="h-40 w-full" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
