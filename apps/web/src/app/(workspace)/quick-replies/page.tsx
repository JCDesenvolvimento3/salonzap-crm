'use client'

/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useMemo, useState } from 'react'
import type { QuickReply } from '@salonzap/sdk'
import { ClipboardCopy, MessageSquareText, Trash2 } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

const emptyQuickReply = {
  title: '',
  shortcut: '',
  category: '',
  body: '',
}

export default function QuickRepliesPage() {
  const { api } = useAuth()
  const { pushToast } = useToast()
  const [items, setItems] = useState<QuickReply[]>([])
  const [form, setForm] = useState(emptyQuickReply)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadItems = async () => {
    const response = await api.quickReplies()
    setItems(response)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadItems()
      .catch((loadError) => {
        const message = loadError instanceof Error ? loadError.message : 'Falha ao carregar respostas rapidas.'
        setError(message)
        pushToast({
          title: 'Biblioteca indisponivel',
          description: message,
          tone: 'danger',
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      if (editingId) {
        await api.updateQuickReply(editingId, form)
      } else {
        await api.createQuickReply(form)
      }

      setForm(emptyQuickReply)
      setEditingId(null)
      await loadItems()
      pushToast({
        title: editingId ? 'Resposta atualizada' : 'Resposta criada',
        description: 'A biblioteca do time foi sincronizada com a extensao.',
        tone: 'success',
      })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Falha ao salvar resposta rapida.'
      setError(message)
      pushToast({
        title: 'Nao foi possivel salvar a resposta',
        description: message,
        tone: 'danger',
      })
    }
  }

  const copyShortcut = async (body: string) => {
    await navigator.clipboard.writeText(body)
    pushToast({
      title: 'Mensagem copiada',
      description: 'O script foi enviado para a area de transferencia.',
      tone: 'success',
    })
  }

  const startEdit = (item: QuickReply) => {
    setEditingId(item.id)
    setForm({
      title: item.title,
      shortcut: item.shortcut,
      category: item.category ?? '',
      body: item.body,
    })
  }

  const categories = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.category).filter((value): value is string => Boolean(value)))).slice(0, 5),
    [items],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Playbooks"
        title="Fast replies that feel polished, reusable, and team-ready"
        description="Keep WhatsApp scripts organized by shortcut and category so the team can move faster without sounding improvised."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Biblioteca" value={loading ? '...' : items.length} helper="respostas ativas na base" />
        <MetricCard label="Categorias" value={loading ? '...' : categories.length} helper="clusters para o time navegar melhor" />
        <MetricCard label="Atalhos" value={loading ? '...' : items.filter((item) => item.shortcut).length} helper="comandos prontos para colar" />
        <MetricCard label="Editor" value={editingId ? 'Edit' : 'New'} helper="com preview e feedback imediato" />
      </div>

      {error ? (
        <Card variant="muted" className="border-rose-400/16 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card variant="spotlight" className="p-6">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">{editingId ? 'Editar resposta' : 'Nova resposta'}</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Script composer</h2>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Titulo">
                <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
              </Field>
              <Field label="Atalho">
                <Input
                  value={form.shortcut}
                  onChange={(event) => setForm((current) => ({ ...current, shortcut: event.target.value }))}
                  placeholder="/oi"
                />
              </Field>
            </div>

            <Field label="Categoria">
              <Input
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                placeholder="Atendimento, agenda, fechamento..."
              />
            </Field>

            <Field label="Mensagem">
              <Textarea value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} />
            </Field>

            <Card variant="muted" className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">{form.shortcut || '/atalho'}</Badge>
                {form.category ? <Badge>{form.category}</Badge> : null}
              </div>
              <p className="mt-4 text-lg font-semibold text-white">{form.title || 'Resposta sem titulo'}</p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                {form.body || 'O preview do texto aparecera aqui para revisar o tom e a clareza da mensagem.'}
              </p>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button type="submit">{editingId ? 'Atualizar' : 'Salvar resposta'}</Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditingId(null)
                    setForm(emptyQuickReply)
                  }}
                >
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Shared library</p>
              <h2 className="text-2xl font-semibold text-white">Replies ready for the team</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge key={category}>{category}</Badge>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-56 w-full" />)
            ) : items.length ? (
              items.map((item) => (
                <Card key={item.id} variant="interactive" className="flex h-full flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="accent">{item.shortcut}</Badge>
                    {item.category ? <Badge>{item.category}</Badge> : null}
                  </div>
                  <h3 className="mt-4 line-clamp-2 text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 line-clamp-5 text-sm leading-7 text-[var(--text-secondary)]">{item.body}</p>

                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    <Button variant="secondary" size="sm" onClick={() => startEdit(item)}>
                      Editar
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => copyShortcut(item.body)}>
                      <ClipboardCopy className="h-4 w-4" />
                      Copiar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={async () => {
                        await api.deleteQuickReply(item.id)
                        await loadItems()
                        pushToast({
                          title: 'Resposta removida',
                          description: 'A biblioteca foi atualizada.',
                          tone: 'success',
                        })
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <div className="md:col-span-2">
                <EmptyState
                  title="Sem atalhos salvos"
                  description="Cadastre scripts para boas-vindas, confirmacao, recuperacao e fechamento."
                  icon={<MessageSquareText className="h-6 w-6" />}
                />
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
