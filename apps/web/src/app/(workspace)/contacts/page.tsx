'use client'

/* eslint-disable react-hooks/exhaustive-deps */

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import type {
  AiConversationSummaryResult,
  AiIntentResult,
  AiSuggestedReplyResult,
  Contact,
  ContactDetail,
  KanbanBoard,
  Note,
  Tag,
} from '@salonzap/sdk'
import { Brain, ClipboardCopy, FileText, LayoutList, MessageSquareText, Plus, Search, Sparkles, Trash2, Users } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/providers/toast-provider'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { MetricCard } from '@/components/ui/metric-card'
import { Modal } from '@/components/ui/modal'
import { PageHeader } from '@/components/ui/page-header'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableFrame, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { cn, formatDateTime, formatDueLabel, getStatusTone, hexToRgba, humanizeToken } from '@/lib/utils'

type ContactFormState = {
  name: string
  phone: string
  email: string
  city: string
  source: string
  statusText: string
  whatsappName: string
  stageId: string
  tagIds: string[]
}

const emptyContactForm: ContactFormState = {
  name: '',
  phone: '',
  email: '',
  city: '',
  source: 'Manual',
  statusText: '',
  whatsappName: '',
  stageId: '',
  tagIds: [],
}

const emptyNoteForm = {
  body: '',
  pinned: false,
}

export default function ContactsPage() {
  const { api } = useAuth()
  const { pushToast } = useToast()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [stages, setStages] = useState<KanbanBoard['stages']>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<ContactDetail | null>(null)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [stageFilter, setStageFilter] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [contactForm, setContactForm] = useState<ContactFormState>(emptyContactForm)
  const [noteForm, setNoteForm] = useState(emptyNoteForm)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [aiTargetId, setAiTargetId] = useState<string | null>(null)
  const [aiContext, setAiContext] = useState('')
  const [aiReply, setAiReply] = useState<AiSuggestedReplyResult | null>(null)
  const [aiSummary, setAiSummary] = useState<AiConversationSummaryResult | null>(null)
  const [aiIntent, setAiIntent] = useState<AiIntentResult | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiLoadingAction, setAiLoadingAction] = useState<'reply' | 'summary' | 'intent' | null>(null)
  const activeAiTargetId = selectedDetail?.id ?? null
  const seededAiContext = selectedDetail ? buildContactAiContext(selectedDetail) : ''
  const visibleAiContext = aiTargetId === activeAiTargetId ? aiContext : seededAiContext
  const visibleAiReply = aiTargetId === activeAiTargetId ? aiReply : null
  const visibleAiSummary = aiTargetId === activeAiTargetId ? aiSummary : null
  const visibleAiIntent = aiTargetId === activeAiTargetId ? aiIntent : null
  const visibleAiError = aiTargetId === activeAiTargetId ? aiError : null
  const visibleAiLoadingAction = aiTargetId === activeAiTargetId ? aiLoadingAction : null

  const loadMetadata = async () => {
    const [tagsResponse, boardResponse] = await Promise.all([api.tags(), api.kanban()])
    setTags(tagsResponse)
    setStages(boardResponse.stages)
  }

  const loadContacts = async () => {
    const response = await api.contacts({
      query: deferredQuery || undefined,
      stageId: stageFilter || undefined,
    })
    setContacts(response)
  }

  const loadSelectedDetail = async (contactId: string) => {
    setDetailLoading(true)

    try {
      const response = await api.contact(contactId)
      setSelectedDetail(response)
    } finally {
      setDetailLoading(false)
    }
  }

  const syncSelection = () => {
    if (!contacts.length) {
      setSelectedId(null)
      setSelectedDetail(null)
      return
    }

    const stillExists = contacts.some((contact) => contact.id === selectedId)
    const nextId = stillExists ? selectedId : contacts[0]?.id

    if (nextId && nextId !== selectedId) {
      setSelectedId(nextId)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void Promise.all([loadMetadata(), loadContacts()])
      .catch((loadError) => {
        const message = loadError instanceof Error ? loadError.message : 'Falha ao carregar contatos.'
        setError(message)
        pushToast({
          title: 'Nao foi possivel abrir contatos',
          description: message,
          tone: 'danger',
        })
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadContacts().catch((loadError) => {
      const message = loadError instanceof Error ? loadError.message : 'Falha ao filtrar contatos.'
      setError(message)
      pushToast({
        title: 'Filtro indisponivel',
        description: message,
        tone: 'warning',
      })
    })
  }, [deferredQuery, stageFilter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    syncSelection()
  }, [contacts, selectedId])

  useEffect(() => {
    if (!selectedId) {
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSelectedDetail(selectedId).catch((loadError) => {
      const message = loadError instanceof Error ? loadError.message : 'Falha ao carregar detalhe do contato.'
      setError(message)
      pushToast({
        title: 'Perfil indisponivel',
        description: message,
        tone: 'danger',
      })
    })
  }, [selectedId])

  const openCreate = () => {
    setEditingId(null)
    setContactForm({
      ...emptyContactForm,
      stageId: stages[0]?.id ?? '',
    })
    setEditorOpen(true)
  }

  const openEdit = () => {
    if (!selectedDetail) {
      return
    }

    setEditingId(selectedDetail.id)
    setContactForm({
      name: selectedDetail.name,
      phone: selectedDetail.phone ?? '',
      email: selectedDetail.email ?? '',
      city: selectedDetail.city ?? '',
      source: selectedDetail.source,
      statusText: selectedDetail.statusText ?? '',
      whatsappName: selectedDetail.whatsappName ?? '',
      stageId: selectedDetail.stage.id,
      tagIds: selectedDetail.tags.map((tag) => tag.id),
    })
    setEditorOpen(true)
  }

  const saveContact = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      if (editingId) {
        await api.updateContact(editingId, contactForm)
      } else {
        const created = await api.createContact(contactForm)
        setSelectedId(created.id)
      }

      await Promise.all([loadContacts(), loadMetadata()])
      if (editingId) {
        await loadSelectedDetail(editingId)
      }
      setEditorOpen(false)
      pushToast({
        title: editingId ? 'Contato atualizado' : 'Contato criado',
        description: 'A base do CRM foi sincronizada com sucesso.',
        tone: 'success',
      })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Falha ao salvar contato.'
      setError(message)
      pushToast({
        title: 'Nao foi possivel salvar o contato',
        description: message,
        tone: 'danger',
      })
    }
  }

  const saveNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedId) {
      return
    }

    try {
      if (editingNoteId) {
        await api.updateNote(editingNoteId, noteForm)
      } else {
        await api.createNote({
          contactId: selectedId,
          ...noteForm,
        })
      }

      setEditingNoteId(null)
      setNoteForm(emptyNoteForm)
      await Promise.all([loadContacts(), loadSelectedDetail(selectedId)])
      pushToast({
        title: editingNoteId ? 'Nota atualizada' : 'Nota adicionada',
        description: 'O contexto comercial ficou registrado no perfil do contato.',
        tone: 'success',
      })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Falha ao salvar nota.'
      pushToast({
        title: 'Nao foi possivel salvar a nota',
        description: message,
        tone: 'danger',
      })
    }
  }

  const startEditNote = (note: Note) => {
    setEditingNoteId(note.id)
    setNoteForm({
      body: note.body,
      pinned: note.pinned,
    })
  }

  const toggleTag = (tagId: string) => {
    setContactForm((current) => ({
      ...current,
      tagIds: current.tagIds.includes(tagId)
        ? current.tagIds.filter((value) => value !== tagId)
        : [...current.tagIds, tagId],
    }))
  }

  const copyAiText = async (value: string) => {
    await navigator.clipboard.writeText(value)
    pushToast({
      title: 'Conteudo copiado',
      description: 'O resultado da IA foi enviado para a area de transferencia.',
      tone: 'success',
    })
  }

  const runAiAction = async (action: 'reply' | 'summary' | 'intent') => {
    if (!selectedDetail) {
      return
    }

    const context = visibleAiContext.trim()

    if (!context) {
      setAiTargetId(selectedDetail.id)
      setAiError('Adicione contexto suficiente da conversa antes de acionar a IA.')
      return
    }

    setAiTargetId(selectedDetail.id)
    setAiError(null)
    setAiLoadingAction(action)

    try {
      if (action === 'reply') {
        const response = await api.aiSuggestReply({
          contactId: selectedDetail.id,
          customerName: selectedDetail.whatsappName || selectedDetail.name,
          conversation: context,
          goal: 'Responder o cliente com foco em clareza e proximo passo comercial',
        })
        setAiReply(response)

        if (response.fallbackUsed) {
          pushToast({
            title: 'IA em fallback seguro',
            description: 'A sugestao foi entregue, mas sem resposta direta do modelo.',
            tone: 'warning',
          })
        }
      }

      if (action === 'summary') {
        const response = await api.aiSummarizeConversation({
          contactId: selectedDetail.id,
          conversation: context,
        })
        setAiSummary(response)

        if (response.fallbackUsed) {
          pushToast({
            title: 'Resumo em fallback seguro',
            description: 'A API da IA falhou e um resumo amigavel foi retornado.',
            tone: 'warning',
          })
        }
      }

      if (action === 'intent') {
        const response = await api.aiIdentifyIntent({
          contactId: selectedDetail.id,
          conversation: context,
        })
        setAiIntent(response)

        if (response.fallbackUsed) {
          pushToast({
            title: 'Intencao em fallback seguro',
            description: 'A classificacao veio do fallback local do backend.',
            tone: 'warning',
          })
        }
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Falha ao acionar a IA.'
      setAiError(message)
      pushToast({
        title: 'Nao foi possivel acionar a IA',
        description: message,
        tone: 'danger',
      })
    } finally {
      setAiLoadingAction(null)
    }
  }

  const contactMetrics = useMemo(() => {
    const withTags = contacts.filter((contact) => contact.tags.length).length
    const withNotes = contacts.filter((contact) => (contact.notesCount ?? 0) > 0).length
    const withReminders = contacts.filter((contact) => (contact.remindersCount ?? 0) > 0).length

    return {
      total: contacts.length,
      withTags,
      withNotes,
      withReminders,
    }
  }, [contacts])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Base de clientes"
        title="Clientes, contexto comercial e historico da relacao"
        description="Consulte o perfil do cliente, acompanhe o funil, registre notas, gere respostas com IA e revise o historico operacional."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo contato
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total" value={loading ? '...' : contactMetrics.total} helper="contatos visiveis na lista atual" />
        <MetricCard
          label="Com tags"
          value={loading ? '...' : contactMetrics.withTags}
          helper="segmentados para campanhas e atendimento"
        />
        <MetricCard
          label="Com notas"
          value={loading ? '...' : contactMetrics.withNotes}
          helper="com memoria comercial registrada"
        />
        <MetricCard
          label="Com follow-up"
          value={loading ? '...' : contactMetrics.withReminders}
          helper="com lembretes ou proximos passos ativos"
        />
      </div>

      {error ? (
        <Card variant="muted" className="border-rose-400/16 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </Card>
      ) : null}

      <div className="grid gap-6 2xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="p-6">
          <div className="grid gap-4 md:grid-cols-[1fr_240px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-[var(--text-muted)]" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nome, telefone ou e-mail"
                className="pl-11"
              />
            </div>
            <Select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
              <option value="">Todos os stages</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {stages.slice(0, 4).map((stage) => (
              <Badge key={stage.id} className="normal-case tracking-[0.08em]" style={{ backgroundColor: hexToRgba(stage.color, 0.12) }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                {stage.name}
              </Badge>
            ))}
          </div>

          <div className="mt-6 md:hidden">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-32 w-full" />
                ))}
              </div>
            ) : contacts.length ? (
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => setSelectedId(contact.id)}
                    className={cn(
                      'w-full rounded-[24px] border p-4 text-left transition',
                      selectedId === contact.id
                        ? 'border-[var(--accent)]/16 bg-[var(--accent-soft)]'
                        : 'border-[var(--border-subtle)] bg-white/[0.035]',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={contact.name} src={contact.avatarUrl} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">{contact.name}</p>
                            <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">
                              {contact.phone || contact.email || 'Sem contato principal'}
                            </p>
                          </div>
                          <Badge tone="accent" className="shrink-0 normal-case tracking-[0.08em]">
                            {contact.stage.name}
                          </Badge>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                          {contact.statusText || 'Sem observacao comercial registrada.'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nenhum contato encontrado"
                description="Cadastre o primeiro lead ou ajuste os filtros para revisar resultados."
                icon={<Users className="h-6 w-6" />}
              />
            )}
          </div>

          <div className="mt-6 hidden md:block">
            {loading ? (
              <ContactsTableSkeleton />
            ) : contacts.length ? (
              <TableFrame>
                <div className="overflow-x-auto">
                  <Table className="table-fixed">
                    <TableHead>
                      <tr>
                        <TableHeaderCell className="w-[42%]">Contato</TableHeaderCell>
                        <TableHeaderCell className="w-[16%]">Stage</TableHeaderCell>
                        <TableHeaderCell className="w-[20%]">Tags</TableHeaderCell>
                        <TableHeaderCell className="w-[22%]">Atividade</TableHeaderCell>
                      </tr>
                    </TableHead>
                    <TableBody>
                      {contacts.map((contact) => (
                        <TableRow
                          key={contact.id}
                          className={cn(
                            'cursor-pointer',
                            selectedId === contact.id && 'bg-[var(--accent-soft)]',
                          )}
                          onClick={() => setSelectedId(contact.id)}
                        >
                          <TableCell>
                            <div className="flex items-start gap-3">
                              <Avatar name={contact.name} src={contact.avatarUrl} />
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-white">{contact.name}</p>
                                <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">
                                  {contact.phone || contact.email || 'Sem contato principal'}
                                </p>
                                <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">
                                  {contact.statusText || 'Sem observacao comercial registrada.'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge tone="accent" className="normal-case tracking-[0.08em]">
                              {contact.stage.name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {contact.tags.length ? (
                                contact.tags.slice(0, 2).map((tag) => (
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
                                <span className="text-sm text-[var(--text-muted)]">Sem tags</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm text-white">{contact.notesCount ?? 0} notas</p>
                              <p className="text-sm text-[var(--text-secondary)]">{contact.remindersCount ?? 0} lembretes</p>
                              <p className="text-sm text-[var(--text-muted)]">{formatDateTime(contact.updatedAt)}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TableFrame>
            ) : (
              <EmptyState
                title="Nenhum contato encontrado"
                description="Cadastre o primeiro lead ou ajuste os filtros para revisar resultados."
                icon={<Users className="h-6 w-6" />}
              />
            )}
          </div>
        </Card>

        <Card className="p-6">
          {selectedDetail ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar name={selectedDetail.name} src={selectedDetail.avatarUrl} size="xl" />
                  <div className="min-w-0">
                    <Badge tone="accent" className="normal-case tracking-[0.08em]">
                      {selectedDetail.stage.name}
                    </Badge>
                    <h2 className="mt-3 break-words text-3xl font-semibold text-white">{selectedDetail.name}</h2>
                    <p className="mt-2 break-all text-sm text-[var(--text-secondary)]">
                      {selectedDetail.phone || selectedDetail.email || 'Sem contato principal'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={openEdit}>
                    Editar
                  </Button>
                  <Button
                    variant="danger"
                    onClick={async () => {
                      if (!window.confirm('Excluir este contato?')) {
                        return
                      }
                      await api.deleteContact(selectedDetail.id)
                      await loadContacts()
                      pushToast({
                        title: 'Contato removido',
                        description: 'A lista foi atualizada com sucesso.',
                        tone: 'success',
                      })
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <InfoTile label="Origem" value={selectedDetail.source} />
                <InfoTile label="Cidade" value={selectedDetail.city || 'Nao informada'} />
                <InfoTile label="Ultima interacao" value={formatDateTime(selectedDetail.updatedAt)} />
              </div>

              <div className="rounded-[28px] border border-[var(--border-subtle)] bg-white/[0.035] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Status comercial</p>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  {selectedDetail.statusText || 'Sem observacao registrada para este lead.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedDetail.tags.length ? (
                    selectedDetail.tags.map((tag) => (
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
              </div>

              <div className="rounded-[28px] border border-[var(--border-subtle)] bg-white/[0.035] p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[var(--border-subtle)] bg-white/6 text-[var(--accent)]">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm text-[var(--text-secondary)]">AI copilot</p>
                        <h3 className="text-xl font-semibold text-white">Resposta, resumo e intencao</h3>
                      </div>
                    </div>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
                      Edite o contexto antes de enviar. O backend usa OpenRouter com fallback seguro e log por salao.
                    </p>
                  </div>
                  <Badge tone="accent">OpenRouter live</Badge>
                </div>

                <div className="mt-5">
                  <Field label="Contexto para IA">
                    <Textarea
                      value={visibleAiContext}
                      onChange={(event) => {
                        setAiTargetId(activeAiTargetId)
                        setAiContext(event.target.value)
                      }}
                      className="min-h-[180px]"
                    />
                  </Field>
                </div>

                {visibleAiError ? (
                  <Card variant="muted" className="mt-4 border-rose-400/16 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                    {visibleAiError}
                  </Card>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={visibleAiLoadingAction === 'reply' ? 'primary' : 'secondary'}
                    disabled={Boolean(visibleAiLoadingAction)}
                    onClick={() => runAiAction('reply')}
                  >
                    <MessageSquareText className="h-4 w-4" />
                    {visibleAiLoadingAction === 'reply' ? 'Gerando resposta...' : 'Sugerir resposta'}
                  </Button>
                  <Button
                    type="button"
                    variant={visibleAiLoadingAction === 'summary' ? 'primary' : 'secondary'}
                    disabled={Boolean(visibleAiLoadingAction)}
                    onClick={() => runAiAction('summary')}
                  >
                    <FileText className="h-4 w-4" />
                    {visibleAiLoadingAction === 'summary' ? 'Resumindo...' : 'Resumir conversa'}
                  </Button>
                  <Button
                    type="button"
                    variant={visibleAiLoadingAction === 'intent' ? 'primary' : 'secondary'}
                    disabled={Boolean(visibleAiLoadingAction)}
                    onClick={() => runAiAction('intent')}
                  >
                    <Brain className="h-4 w-4" />
                    {visibleAiLoadingAction === 'intent' ? 'Lendo intencao...' : 'Identificar intencao'}
                  </Button>
                </div>

                {visibleAiLoadingAction ? (
                  <div className="mt-5 grid gap-4 xl:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-48 w-full" />
                    ))}
                  </div>
                ) : visibleAiReply || visibleAiSummary || visibleAiIntent ? (
                  <div className="mt-5 grid gap-4 xl:grid-cols-3">
                    {visibleAiReply ? (
                      <Card variant="muted" className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                              Resposta sugerida
                            </p>
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">{humanizeToken(visibleAiReply.tone)}</p>
                          </div>
                          <Badge tone={visibleAiReply.fallbackUsed ? 'warning' : 'success'}>
                            {visibleAiReply.fallbackUsed ? 'Fallback' : 'IA real'}
                          </Badge>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{visibleAiReply.reply}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button type="button" variant="secondary" size="sm" onClick={() => copyAiText(visibleAiReply.reply)}>
                            <ClipboardCopy className="h-4 w-4" />
                            Copiar
                          </Button>
                        </div>
                      </Card>
                    ) : null}

                    {visibleAiSummary ? (
                      <Card variant="muted" className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                            Resumo comercial
                          </p>
                          <Badge tone={visibleAiSummary.fallbackUsed ? 'warning' : 'accent'}>
                            {humanizeToken(visibleAiSummary.sentiment)}
                          </Badge>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{visibleAiSummary.summary}</p>
                        <p className="mt-4 text-sm font-medium text-white">Proximo passo</p>
                        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{visibleAiSummary.nextStep}</p>
                      </Card>
                    ) : null}

                    {visibleAiIntent ? (
                      <Card variant="muted" className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                            Intencao detectada
                          </p>
                          <Badge tone={visibleAiIntent.fallbackUsed ? 'warning' : 'accent'}>
                            {humanizeToken(visibleAiIntent.confidence)}
                          </Badge>
                        </div>
                        <p className="mt-4 text-base font-semibold text-white">{humanizeToken(visibleAiIntent.intent)}</p>
                        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{visibleAiIntent.rationale}</p>
                      </Card>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-5">
                    <EmptyState
                      title="Nenhuma analise gerada ainda"
                      description="Acione a IA para sugerir uma resposta, resumir a conversa ou identificar a intencao principal do lead."
                      icon={<Sparkles className="h-5 w-5" />}
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MessageSquareText className="h-5 w-5 text-[var(--accent)]" />
                    <h3 className="text-xl font-semibold text-white">Notas</h3>
                  </div>
                  <form className="space-y-3 rounded-[28px] border border-[var(--border-subtle)] bg-white/[0.035] p-4" onSubmit={saveNote}>
                    <Field label={editingNoteId ? 'Atualizar nota' : 'Registrar nota'}>
                      <Textarea
                        value={noteForm.body}
                        onChange={(event) => setNoteForm((current) => ({ ...current, body: event.target.value }))}
                        className="min-h-[120px]"
                      />
                    </Field>
                    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={noteForm.pinned}
                        onChange={(event) => setNoteForm((current) => ({ ...current, pinned: event.target.checked }))}
                      />
                      Fixar no topo
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit">{editingNoteId ? 'Atualizar nota' : 'Adicionar nota'}</Button>
                      {editingNoteId ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setEditingNoteId(null)
                            setNoteForm(emptyNoteForm)
                          }}
                        >
                          Cancelar
                        </Button>
                      ) : null}
                    </div>
                  </form>

                  {selectedDetail.notes.length ? (
                    selectedDetail.notes.map((note) => (
                      <div key={note.id} className="rounded-[24px] border border-[var(--border-subtle)] bg-white/[0.035] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">{note.author.name}</p>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">{formatDateTime(note.createdAt)}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {note.pinned ? <Badge tone="accent">Fixada</Badge> : null}
                            <Button variant="ghost" size="sm" onClick={() => startEditNote(note)}>
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-200 hover:bg-rose-400/12"
                              onClick={async () => {
                                await api.deleteNote(note.id)
                                await Promise.all([loadContacts(), loadSelectedDetail(selectedDetail.id)])
                                pushToast({
                                  title: 'Nota removida',
                                  description: 'O historico do contato foi atualizado.',
                                  tone: 'success',
                                })
                              }}
                            >
                              Excluir
                            </Button>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{note.body}</p>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="Sem notas ainda"
                      description="Registre contexto, objecoes e proximo passo para este lead."
                      icon={<MessageSquareText className="h-5 w-5" />}
                    />
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-[var(--accent)]" />
                    <h3 className="text-xl font-semibold text-white">Lembretes vinculados</h3>
                  </div>

                  {selectedDetail.reminders.length ? (
                    selectedDetail.reminders.map((reminder) => (
                      <div key={reminder.id} className="rounded-[24px] border border-[var(--border-subtle)] bg-white/[0.035] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">{reminder.title}</p>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">{formatDueLabel(reminder.dueAt)}</p>
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
                      title="Sem lembretes vinculados"
                      description="Use a pagina de lembretes para programar follow-ups para este contato."
                      icon={<Users className="h-5 w-5" />}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-4 rounded-[28px] border border-[var(--border-subtle)] bg-white/[0.035] p-5">
                <div className="flex items-center gap-3">
                  <LayoutList className="h-5 w-5 text-[var(--accent)]" />
                  <h3 className="text-xl font-semibold text-white">Historico do contato</h3>
                </div>

                {selectedDetail.activities.length ? (
                  selectedDetail.activities.map((activity) => (
                    <div key={activity.id} className="rounded-[24px] border border-[var(--border-subtle)] bg-white/[0.035] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{activity.title}</p>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">
                            {activity.user?.name ?? 'Sistema'} - {formatDateTime(activity.createdAt)}
                          </p>
                        </div>
                        <Badge tone={activity.action.includes('deleted') ? 'warning' : 'accent'}>
                          {humanizeToken(activity.action)}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{activity.description}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="Sem historico operacional"
                    description="As criacoes, atualizacoes, movimentacoes e usos da IA deste contato aparecerao aqui."
                    icon={<LayoutList className="h-5 w-5" />}
                  />
                )}
              </div>
            </div>
          ) : detailLoading ? (
            <ContactDetailSkeleton />
          ) : (
            <EmptyState
              title="Selecione um contato"
              description="Escolha um lead na tabela para abrir o perfil completo, revisar notas e acompanhar proximos passos."
              icon={<Users className="h-6 w-6" />}
            />
          )}
        </Card>
      </div>

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingId ? 'Editar contato' : 'Novo contato'}
        subtitle="Os dados continuam persistidos na API sem alterar a arquitetura do CRM."
        footer={
          <div className="flex flex-wrap gap-3">
            <Button type="submit" form="contact-form">
              {editingId ? 'Atualizar contato' : 'Salvar contato'}
            </Button>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>
              Fechar
            </Button>
          </div>
        }
      >
        <form id="contact-form" className="space-y-5" onSubmit={saveContact}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome">
              <Input value={contactForm.name} onChange={(event) => setContactForm((current) => ({ ...current, name: event.target.value }))} />
            </Field>
            <Field label="Nome no WhatsApp">
              <Input
                value={contactForm.whatsappName}
                onChange={(event) => setContactForm((current) => ({ ...current, whatsappName: event.target.value }))}
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Telefone">
              <Input value={contactForm.phone} onChange={(event) => setContactForm((current) => ({ ...current, phone: event.target.value }))} />
            </Field>
            <Field label="E-mail">
              <Input value={contactForm.email} onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value }))} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Cidade">
              <Input value={contactForm.city} onChange={(event) => setContactForm((current) => ({ ...current, city: event.target.value }))} />
            </Field>
            <Field label="Origem">
              <Input value={contactForm.source} onChange={(event) => setContactForm((current) => ({ ...current, source: event.target.value }))} />
            </Field>
            <Field label="Stage">
              <Select value={contactForm.stageId} onChange={(event) => setContactForm((current) => ({ ...current, stageId: event.target.value }))}>
                <option value="">Selecione</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Status comercial">
            <Textarea
              value={contactForm.statusText}
              onChange={(event) => setContactForm((current) => ({ ...current, statusText: event.target.value }))}
              className="min-h-[90px]"
            />
          </Field>

          <Field label="Tags">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const active = contactForm.tagIds.includes(tag.id)

                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      'rounded-full border px-3 py-2 text-sm transition',
                      active
                        ? 'border-transparent text-slate-950'
                        : 'border-[var(--border-subtle)] bg-white/6 text-[var(--text-secondary)]',
                    )}
                    style={active ? { backgroundColor: tag.color } : undefined}
                  >
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </Field>
        </form>
      </Modal>
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border-subtle)] bg-white/[0.035] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

function ContactsTableSkeleton() {
  return (
    <TableFrame>
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    </TableFrame>
  )
}

function ContactDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-56 w-full" />
    </div>
  )
}

function buildContactAiContext(contact: ContactDetail) {
  const lines = [
    `Contato: ${contact.name}`,
    `Origem: ${contact.source}`,
    `Stage: ${contact.stage.name}`,
    contact.statusText ? `Status comercial: ${contact.statusText}` : null,
    contact.tags.length ? `Tags: ${contact.tags.map((tag) => tag.name).join(', ')}` : null,
    ...contact.notes.slice(0, 3).map((note, index) => `Nota ${index + 1}: ${note.body}`),
    ...contact.reminders.slice(0, 2).map((reminder, index) =>
      `Lembrete ${index + 1}: ${reminder.title}${reminder.description ? ` - ${reminder.description}` : ''}`,
    ),
  ]

  return lines.filter(Boolean).join('\n')
}
