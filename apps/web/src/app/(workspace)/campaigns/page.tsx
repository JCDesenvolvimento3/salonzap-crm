'use client'

/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useMemo, useState } from 'react'
import type { AiCampaignResult, Campaign } from '@salonzap/sdk'
import { Boxes, Megaphone, Sparkles, Trash2 } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/providers/toast-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { MetricCard } from '@/components/ui/metric-card'
import { PageHeader } from '@/components/ui/page-header'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableFrame, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime, getStatusTone, humanizeToken } from '@/lib/utils'

const emptyCampaign = {
  title: '',
  audience: '',
  status: 'DRAFT' as Campaign['status'],
  scheduledFor: '',
  message: '',
}

export default function CampaignsPage() {
  const { api } = useAuth()
  const { pushToast } = useToast()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [form, setForm] = useState(emptyCampaign)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiResult, setAiResult] = useState<AiCampaignResult | null>(null)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const loadCampaigns = async () => {
    const response = await api.campaigns()
    setCampaigns(response)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCampaigns()
      .catch((loadError) => {
        const message = loadError instanceof Error ? loadError.message : 'Falha ao carregar campanhas.'
        setError(message)
        pushToast({
          title: 'Campanhas indisponiveis',
          description: message,
          tone: 'danger',
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (editingId) {
        await api.updateCampaign(editingId, {
          ...form,
          scheduledFor: form.scheduledFor || null,
        })
      } else {
        await api.createCampaign({
          ...form,
          scheduledFor: form.scheduledFor || null,
        })
      }

      setForm(emptyCampaign)
      setEditingId(null)
      await loadCampaigns()
      pushToast({
        title: editingId ? 'Campanha atualizada' : 'Campanha criada',
        description: 'A fila de envios foi sincronizada.',
        tone: 'success',
      })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Falha ao salvar campanha.'
      setError(message)
      pushToast({
        title: 'Nao foi possivel salvar a campanha',
        description: message,
        tone: 'danger',
      })
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (campaign: Campaign) => {
    setEditingId(campaign.id)
    setForm({
      title: campaign.title,
      audience: campaign.audience,
      status: campaign.status,
      scheduledFor: campaign.scheduledFor ? toDatetimeLocal(campaign.scheduledFor) : '',
      message: campaign.message,
    })
  }

  const handleDelete = async (campaignId: string) => {
    if (!window.confirm('Excluir esta campanha?')) {
      return
    }

    await api.deleteCampaign(campaignId)
    await loadCampaigns()
    pushToast({
      title: 'Campanha removida',
      description: 'A lista de campanhas foi atualizada.',
      tone: 'success',
    })
  }

  const handleGenerateCampaign = async () => {
    const effectivePrompt =
      aiPrompt.trim() ||
      [form.title, form.audience, form.message].filter(Boolean).join('. ').trim()

    if (!effectivePrompt) {
      setAiError('Descreva o objetivo da campanha antes de acionar a IA.')
      return
    }

    setAiGenerating(true)
    setAiError(null)

    try {
      const response = await api.aiGenerateCampaign({
        prompt: effectivePrompt,
        objective: editingId ? 'Refinar uma campanha existente no WhatsApp' : 'Gerar uma nova campanha de WhatsApp',
        audienceHint: form.audience || undefined,
      })

      setAiResult(response)
      setForm((current) => ({
        ...current,
        title: response.title,
        audience: response.audience,
        message: response.message,
      }))

      pushToast({
        title: response.fallbackUsed ? 'Campanha gerada via fallback seguro' : 'Campanha gerada com IA',
        description: response.fallbackUsed
          ? 'A IA falhou, mas o backend devolveu uma versao segura para continuar o fluxo.'
          : 'O composer foi preenchido com o resultado do OpenRouter.',
        tone: response.fallbackUsed ? 'warning' : 'success',
      })
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Falha ao gerar campanha com IA.'
      setAiError(message)
      pushToast({
        title: 'Nao foi possivel gerar a campanha',
        description: message,
        tone: 'danger',
      })
    } finally {
      setAiGenerating(false)
    }
  }

  const metrics = useMemo(() => {
    return {
      draft: campaigns.filter((campaign) => campaign.status === 'DRAFT').length,
      scheduled: campaigns.filter((campaign) => campaign.status === 'SCHEDULED').length,
      sent: campaigns.filter((campaign) => campaign.status === 'SENT').length,
    }
  }, [campaigns])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Campanhas"
        title="Campanhas de relacionamento e recuperacao"
        description="Crie campanhas reais para ativacao, reengajamento e confirmacao de agenda, com status e mensagem ligados a operacao."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Rascunhos" value={loading ? '...' : metrics.draft} helper="campanhas ainda em preparo" />
        <MetricCard label="Agendadas" value={loading ? '...' : metrics.scheduled} helper="entrando na fila de envio" />
        <MetricCard label="Enviadas" value={loading ? '...' : metrics.sent} helper="campanhas ja concluidas" />
        <MetricCard label="Edicao" value={editingId ? 'Editando' : 'Nova'} helper="campanha ativa no formulario" />
      </div>

      {error ? (
        <Card variant="muted" className="border-rose-400/16 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </Card>
      ) : null}

      <div className="grid gap-6 2xl:grid-cols-[0.92fr_1.08fr]">
        <Card variant="spotlight" className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[var(--border-subtle)] bg-white/6 text-[var(--accent)]">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">{editingId ? 'Editar campanha' : 'Nova campanha'}</p>
              <h2 className="text-2xl font-semibold text-white">Formulario da campanha</h2>
            </div>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <Card variant="muted" className="p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">AI assist</p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    Descreva o foco da campanha e deixe a IA montar titulo, audiencia e mensagem com fallback seguro.
                  </p>
                </div>
                <Badge tone="accent">OpenRouter</Badge>
              </div>

              <div className="mt-4">
                <Field label="Brief da campanha">
                  <Textarea
                    value={aiPrompt}
                    onChange={(event) => setAiPrompt(event.target.value)}
                    className="min-h-[110px]"
                    placeholder="Ex.: reativar clientes sem compra ha 45 dias com oferta de coloracao e urgencia suave."
                  />
                </Field>
              </div>

              {aiError ? (
                <div className="mt-4 rounded-[22px] border border-rose-400/16 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {aiError}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={handleGenerateCampaign} disabled={aiGenerating}>
                  <Sparkles className="h-4 w-4" />
                  {aiGenerating ? 'Gerando com IA...' : 'Gerar campanha com IA'}
                </Button>
              </div>

              {aiGenerating ? (
                <div className="mt-4">
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : aiResult ? (
                <Card variant="default" className="mt-4 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Saida da IA</p>
                      <p className="mt-2 text-lg font-semibold text-white">{aiResult.title}</p>
                    </div>
                    <Badge tone={aiResult.fallbackUsed ? 'warning' : 'success'}>
                      {aiResult.fallbackUsed ? 'Fallback' : 'IA real'}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">{aiResult.audience}</p>
                  <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{aiResult.message}</p>
                </Card>
              ) : null}
            </Card>

            <Field label="Titulo">
              <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </Field>

            <Field label="Audiencia">
              <Input
                value={form.audience}
                onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value }))}
                placeholder="Clientes inativos ha 45 dias"
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Status">
                <Select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Campaign['status'] }))}
                >
                  <option value="DRAFT">Rascunho</option>
                  <option value="SCHEDULED">Agendada</option>
                  <option value="SENT">Enviada</option>
                  <option value="PAUSED">Pausada</option>
                </Select>
              </Field>
              <Field label="Agendar para">
                <Input
                  type="datetime-local"
                  value={form.scheduledFor}
                  onChange={(event) => setForm((current) => ({ ...current, scheduledFor: event.target.value }))}
                />
              </Field>
            </div>

            <Field label="Mensagem">
              <Textarea value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} />
            </Field>

            <Card variant="muted" className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Preview</p>
              <p className="mt-3 text-lg font-semibold text-white">{form.title || 'Campanha sem titulo'}</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{form.audience || 'Defina a audiencia alvo.'}</p>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                {form.message || 'A mensagem principal aparecera aqui para uma leitura rapida antes do envio.'}
              </p>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : editingId ? 'Atualizar campanha' : 'Criar campanha'}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditingId(null)
                    setForm(emptyCampaign)
                  }}
                >
                  Cancelar edicao
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Lista de campanhas</p>
              <h2 className="text-2xl font-semibold text-white">Campanhas recentes</h2>
            </div>
            <Badge tone="accent">{campaigns.length} itens</Badge>
          </div>

          <div className="mt-6 md:hidden">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-40 w-full" />
                ))}
              </div>
            ) : campaigns.length ? (
              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} variant="muted" className="flex h-full flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{campaign.title}</p>
                        <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">{campaign.audience}</p>
                      </div>
                      <Badge tone={getStatusTone(campaign.status)} className="shrink-0">
                        {humanizeToken(campaign.status)}
                      </Badge>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-7 text-[var(--text-secondary)]">{campaign.message}</p>
                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                      <Button variant="secondary" size="sm" onClick={() => startEdit(campaign)}>
                        Editar
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(campaign.id)}>
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nenhuma campanha criada"
                description="Monte a primeira campanha de ativacao, confirmacao ou reengajamento."
                icon={<Boxes className="h-6 w-6" />}
              />
            )}
          </div>

          <div className="mt-6 hidden md:block">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-[4.5rem] w-full" />
                ))}
              </div>
            ) : campaigns.length ? (
              <TableFrame>
                <div className="overflow-x-auto">
                  <Table className="table-fixed">
                    <TableHead>
                      <tr>
                        <TableHeaderCell className="w-[44%]">Campanha</TableHeaderCell>
                        <TableHeaderCell className="w-[14%]">Status</TableHeaderCell>
                        <TableHeaderCell className="w-[20%]">Agenda</TableHeaderCell>
                        <TableHeaderCell className="w-[22%]">Acoes</TableHeaderCell>
                      </tr>
                    </TableHead>
                    <TableBody>
                      {campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell>
                            <p className="break-words font-semibold text-white">{campaign.title}</p>
                            <p className="mt-1 break-words text-sm text-[var(--text-secondary)]">{campaign.audience}</p>
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">{campaign.message}</p>
                          </TableCell>
                          <TableCell>
                            <Badge tone={getStatusTone(campaign.status)}>{humanizeToken(campaign.status)}</Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-white">{campaign.scheduledFor ? formatDateTime(campaign.scheduledFor) : 'Sem agendamento'}</p>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">Criada em {formatDateTime(campaign.createdAt)}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="secondary" size="sm" onClick={() => startEdit(campaign)}>
                                Editar
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => handleDelete(campaign.id)}>
                                <Trash2 className="h-4 w-4" />
                                Excluir
                              </Button>
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
                title="Nenhuma campanha criada"
                description="Monte a primeira campanha de ativacao, confirmacao ou reengajamento."
                icon={<Boxes className="h-6 w-6" />}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

function toDatetimeLocal(value: string) {
  return new Date(value).toISOString().slice(0, 16)
}
