'use client'

/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useMemo, useState } from 'react'
import type { Contact, Reminder } from '@salonzap/sdk'
import { BellRing, CheckCircle2, Clock3, Trash2 } from 'lucide-react'
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
import { formatDueLabel, getStatusTone, humanizeToken } from '@/lib/utils'

const emptyReminder = {
  title: '',
  description: '',
  dueAt: '',
  status: 'PENDING' as Reminder['status'],
  contactId: '',
}

export default function RemindersPage() {
  const { api } = useAuth()
  const { pushToast } = useToast()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [form, setForm] = useState(emptyReminder)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'ALL' | Reminder['status']>('ALL')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadPage = async () => {
    const [remindersResponse, contactsResponse] = await Promise.all([api.reminders(), api.contacts()])
    setReminders(remindersResponse)
    setContacts(contactsResponse)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPage()
      .catch((loadError) => {
        const message = loadError instanceof Error ? loadError.message : 'Falha ao carregar lembretes.'
        setError(message)
        pushToast({
          title: 'Lembretes indisponiveis',
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
      const payload = {
        ...form,
        contactId: form.contactId || undefined,
      }

      if (editingId) {
        await api.updateReminder(editingId, payload)
      } else {
        await api.createReminder(payload)
      }

      setForm(emptyReminder)
      setEditingId(null)
      await loadPage()
      pushToast({
        title: editingId ? 'Lembrete atualizado' : 'Lembrete criado',
        description: 'A agenda comercial foi sincronizada.',
        tone: 'success',
      })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Falha ao salvar lembrete.'
      setError(message)
      pushToast({
        title: 'Nao foi possivel salvar o lembrete',
        description: message,
        tone: 'danger',
      })
    }
  }

  const startEdit = (reminder: Reminder) => {
    setEditingId(reminder.id)
    setForm({
      title: reminder.title,
      description: reminder.description ?? '',
      dueAt: reminder.dueAt ? toDatetimeLocal(reminder.dueAt) : '',
      status: reminder.status,
      contactId: reminder.contactId ?? '',
    })
  }

  const filteredReminders = useMemo(
    () => reminders.filter((reminder) => (statusFilter === 'ALL' ? true : reminder.status === statusFilter)),
    [reminders, statusFilter],
  )

  const metrics = useMemo(() => {
    return {
      pending: reminders.filter((reminder) => reminder.status === 'PENDING').length,
      done: reminders.filter((reminder) => reminder.status === 'DONE').length,
      linked: reminders.filter((reminder) => reminder.contactId).length,
    }
  }, [reminders])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Follow-up stack"
        title="A reminder view built for calm daily execution"
        description="Plan next actions, keep deadlines visible, and separate pending work from completed follow-up without touching the backend model."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pendentes" value={loading ? '...' : metrics.pending} helper="acoes ainda abertas" />
        <MetricCard label="Concluidos" value={loading ? '...' : metrics.done} helper="follow-ups finalizados" />
        <MetricCard label="Vinculados" value={loading ? '...' : metrics.linked} helper="ligados diretamente a contatos" />
        <MetricCard label="Filtro" value={statusFilter} helper="priorizacao visual da agenda" />
      </div>

      {error ? (
        <Card variant="muted" className="border-rose-400/16 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </Card>
      ) : null}

      <div className="grid gap-6 2xl:grid-cols-[0.9fr_1.1fr]">
        <Card variant="spotlight" className="p-6">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">{editingId ? 'Editar lembrete' : 'Novo lembrete'}</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Agenda composer</h2>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <Field label="Titulo">
              <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </Field>

            <Field label="Descricao">
              <Textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="min-h-[100px]"
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Prazo">
                <Input type="datetime-local" value={form.dueAt} onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))} />
              </Field>
              <Field label="Status">
                <Select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Reminder['status'] }))}
                >
                  <option value="PENDING">Pendente</option>
                  <option value="DONE">Concluido</option>
                </Select>
              </Field>
            </div>

            <Field label="Contato">
              <Select value={form.contactId} onChange={(event) => setForm((current) => ({ ...current, contactId: event.target.value }))}>
                <option value="">Sem vinculo</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Card variant="muted" className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Preview</p>
              <div className="mt-3 flex items-center gap-2">
                <Badge tone={getStatusTone(form.status)}>{humanizeToken(form.status)}</Badge>
                {form.contactId ? <Badge>Vinculado</Badge> : <Badge>Interno</Badge>}
              </div>
              <p className="mt-4 text-lg font-semibold text-white">{form.title || 'Lembrete sem titulo'}</p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                {form.description || 'O detalhe do follow-up aparecera aqui para leitura rapida da equipe.'}
              </p>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button type="submit">{editingId ? 'Atualizar lembrete' : 'Salvar lembrete'}</Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditingId(null)
                    setForm(emptyReminder)
                  }}
                >
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Reminder queue</p>
              <h2 className="text-2xl font-semibold text-white">Daily follow-up board</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['ALL', 'PENDING', 'DONE'] as const).map((value) => (
                <Button
                  key={value}
                  variant={statusFilter === value ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setStatusFilter(value)}
                >
                  {value === 'ALL' ? 'Todos' : humanizeToken(value)}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-6 md:hidden">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-40 w-full" />
                ))}
              </div>
            ) : filteredReminders.length ? (
              <div className="space-y-3">
                {filteredReminders.map((reminder) => (
                  <Card key={reminder.id} variant="muted" className="flex h-full flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-white">{reminder.title}</p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {reminder.contact?.name ?? 'Lembrete interno'} • {formatDueLabel(reminder.dueAt)}
                        </p>
                      </div>
                      <Badge tone={getStatusTone(reminder.status)} className="shrink-0">
                        {humanizeToken(reminder.status)}
                      </Badge>
                    </div>
                    {reminder.description ? (
                      <p className="mt-3 line-clamp-3 text-sm leading-7 text-[var(--text-secondary)]">{reminder.description}</p>
                    ) : null}
                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                      {reminder.status === 'PENDING' ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={async () => {
                            await api.updateReminder(reminder.id, { status: 'DONE' })
                            await loadPage()
                            pushToast({
                              title: 'Lembrete concluido',
                              description: 'A fila foi atualizada.',
                              tone: 'success',
                            })
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Concluir
                        </Button>
                      ) : null}
                      <Button variant="secondary" size="sm" onClick={() => startEdit(reminder)}>
                        <Clock3 className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={async () => {
                          await api.deleteReminder(reminder.id)
                          await loadPage()
                          pushToast({
                            title: 'Lembrete removido',
                            description: 'A agenda foi atualizada.',
                            tone: 'success',
                          })
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nenhum lembrete cadastrado"
                description="Crie follow-ups ligados a contatos para nao perder proximos passos."
                icon={<BellRing className="h-6 w-6" />}
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
            ) : filteredReminders.length ? (
              <TableFrame>
                <div className="overflow-x-auto">
                  <Table className="table-fixed">
                    <TableHead>
                      <tr>
                        <TableHeaderCell className="w-[42%]">Lembrete</TableHeaderCell>
                        <TableHeaderCell className="w-[16%]">Status</TableHeaderCell>
                        <TableHeaderCell className="w-[18%]">Contato</TableHeaderCell>
                        <TableHeaderCell className="w-[24%]">Acoes</TableHeaderCell>
                      </tr>
                    </TableHead>
                    <TableBody>
                      {filteredReminders.map((reminder) => (
                        <TableRow key={reminder.id}>
                          <TableCell>
                            <p className="font-semibold text-white">{reminder.title}</p>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">{formatDueLabel(reminder.dueAt)}</p>
                            {reminder.description ? (
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">{reminder.description}</p>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Badge tone={getStatusTone(reminder.status)}>{humanizeToken(reminder.status)}</Badge>
                          </TableCell>
                          <TableCell className="break-words">{reminder.contact?.name ?? 'Lembrete interno'}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {reminder.status === 'PENDING' ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={async () => {
                                    await api.updateReminder(reminder.id, { status: 'DONE' })
                                    await loadPage()
                                    pushToast({
                                      title: 'Lembrete concluido',
                                      description: 'A fila foi atualizada.',
                                      tone: 'success',
                                    })
                                  }}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Concluir
                                </Button>
                              ) : null}
                              <Button variant="secondary" size="sm" onClick={() => startEdit(reminder)}>
                                <Clock3 className="h-4 w-4" />
                                Editar
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={async () => {
                                  await api.deleteReminder(reminder.id)
                                  await loadPage()
                                  pushToast({
                                    title: 'Lembrete removido',
                                    description: 'A agenda foi atualizada.',
                                    tone: 'success',
                                  })
                                }}
                              >
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
                title="Nenhum lembrete cadastrado"
                description="Crie follow-ups ligados a contatos para nao perder proximos passos."
                icon={<BellRing className="h-6 w-6" />}
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
