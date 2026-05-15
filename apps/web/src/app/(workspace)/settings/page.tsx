'use client'

/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from 'react'
import type { SettingsProfile, Tag } from '@salonzap/sdk'
import { Palette, Settings2, Tags, Trash2 } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useTheme } from '@/components/providers/theme-provider'
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
import { hexToRgba } from '@/lib/utils'

const emptyTag = {
  name: '',
  color: '#7fe8ff',
}

export default function SettingsPage() {
  const { api, refreshProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const { pushToast } = useToast()
  const [profile, setProfile] = useState<SettingsProfile | null>(null)
  const [tagForm, setTagForm] = useState(emptyTag)
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async () => {
    const response = await api.settings()
    setProfile(response)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfile()
      .catch((loadError) => {
        const message = loadError instanceof Error ? loadError.message : 'Falha ao carregar configuracoes.'
        setError(message)
        pushToast({
          title: 'Configuracoes indisponiveis',
          description: message,
          tone: 'danger',
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const updateProfileField = (field: keyof SettingsProfile['salon'] | 'userName', value: string) => {
    setProfile((current) => {
      if (!current) {
        return current
      }

      if (field === 'userName') {
        return {
          ...current,
          user: {
            ...current.user,
            name: value,
          },
        }
      }

      return {
        ...current,
        salon: {
          ...current.salon,
          [field]: value,
        },
      }
    })
  }

  const handleSaveProfile = async () => {
    if (!profile) {
      return
    }

    setError(null)
    try {
      const updated = await api.updateSettings({
        salonName: profile.salon.name,
        timezone: profile.salon.timezone,
        welcomeMessage: profile.salon.welcomeMessage ?? '',
        brandColor: profile.salon.brandColor,
        userName: profile.user.name,
      })
      setProfile(updated)
      await refreshProfile()
      pushToast({
        title: 'Configuracoes salvas',
        description: 'A identidade do salao foi atualizada.',
        tone: 'success',
      })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Falha ao salvar configuracoes.'
      setError(message)
      pushToast({
        title: 'Nao foi possivel salvar as configuracoes',
        description: message,
        tone: 'danger',
      })
    }
  }

  const startEditTag = (tag: Tag) => {
    setEditingTagId(tag.id)
    setTagForm({
      name: tag.name,
      color: tag.color,
    })
  }

  const handleSaveTag = async () => {
    try {
      if (editingTagId) {
        await api.updateTag(editingTagId, tagForm)
      } else {
        await api.createTag(tagForm)
      }

      setTagForm(emptyTag)
      setEditingTagId(null)
      await loadProfile()
      pushToast({
        title: editingTagId ? 'Tag atualizada' : 'Tag criada',
        description: 'A taxonomia do CRM foi sincronizada.',
        tone: 'success',
      })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Falha ao salvar tag.'
      pushToast({
        title: 'Nao foi possivel salvar a tag',
        description: message,
        tone: 'danger',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations setup"
        title="Brand, taxonomy, and theme controls in one calmer panel"
        description="Tune the salon identity, tag system, and workspace theme without touching the backend architecture or losing extension compatibility."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Theme" value={theme === 'obsidian' ? 'Obsidian' : 'Graphite'} helper="modo premium ativo no workspace" />
        <MetricCard label="Tags" value={loading ? '...' : profile?.tags.length ?? 0} helper="classificacoes disponiveis" />
        <MetricCard label="Stages" value={loading ? '...' : profile?.stages.length ?? 0} helper="etapas monitoradas no funil" />
        <MetricCard label="Brand color" value={loading ? '...' : profile?.salon.brandColor ?? '#'} helper="cor principal do salao" />
      </div>

      {error ? (
        <Card variant="muted" className="border-rose-400/16 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </Card>
      ) : null}

      {loading ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
          <Skeleton className="h-[540px] w-full" />
          <Skeleton className="h-[540px] w-full" />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
          <Card variant="spotlight" className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[var(--border-subtle)] bg-white/6 text-[var(--accent)]">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Profile setup</p>
                <h2 className="text-2xl font-semibold text-white">Salon identity</h2>
              </div>
            </div>

            {profile ? (
              <div className="mt-6 space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Nome do salao">
                    <Input value={profile.salon.name} onChange={(event) => updateProfileField('name', event.target.value)} />
                  </Field>
                  <Field label="Responsavel">
                    <Input value={profile.user.name} onChange={(event) => updateProfileField('userName', event.target.value)} />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-[1fr_160px]">
                  <Field label="Timezone">
                    <Input value={profile.salon.timezone} onChange={(event) => updateProfileField('timezone', event.target.value)} />
                  </Field>
                  <Field label="Cor da marca">
                    <input
                      type="color"
                      value={profile.salon.brandColor}
                      onChange={(event) => updateProfileField('brandColor', event.target.value)}
                      className="h-12 w-full rounded-[18px] border border-[var(--border-subtle)] bg-white/6 px-2"
                    />
                  </Field>
                </div>

                <Field label="Mensagem de boas-vindas">
                  <Textarea
                    value={profile.salon.welcomeMessage ?? ''}
                    onChange={(event) => updateProfileField('welcomeMessage', event.target.value)}
                    className="min-h-[120px]"
                  />
                </Field>

                <Card variant="muted" className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Theme system</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <ThemePreset
                      title="Obsidian"
                      description="Sharper blues, colder contrast, more executive feel."
                      active={theme === 'obsidian'}
                      onClick={() => setTheme('obsidian')}
                    />
                    <ThemePreset
                      title="Graphite"
                      description="Warmer neutrals and a softer green accent for longer sessions."
                      active={theme === 'graphite'}
                      onClick={() => setTheme('graphite')}
                    />
                  </div>
                </Card>

                <Card variant="muted" className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Stages atuais</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile.stages.map((stage) => (
                      <Badge
                        key={stage.id}
                        className="normal-case tracking-[0.08em]"
                        style={{ backgroundColor: hexToRgba(stage.color, 0.14) }}
                      >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                        {stage.name} • {stage.contactsCount}
                      </Badge>
                    ))}
                  </div>
                </Card>

                <Button onClick={handleSaveProfile}>Salvar configuracoes</Button>
              </div>
            ) : null}
          </Card>

          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[var(--border-subtle)] bg-white/6 text-[var(--accent)]">
                  <Tags className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Taxonomia</p>
                  <h2 className="text-2xl font-semibold text-white">Tags comerciais</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-[1fr_130px_auto]">
                <Field label="Nome">
                  <Input value={tagForm.name} onChange={(event) => setTagForm((current) => ({ ...current, name: event.target.value }))} />
                </Field>
                <Field label="Cor">
                  <input
                    type="color"
                    value={tagForm.color}
                    onChange={(event) => setTagForm((current) => ({ ...current, color: event.target.value }))}
                    className="h-12 w-full rounded-[18px] border border-[var(--border-subtle)] bg-white/6 px-2"
                  />
                </Field>
                <div className="flex items-end">
                  <Button onClick={handleSaveTag}>{editingTagId ? 'Atualizar tag' : 'Criar tag'}</Button>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {profile?.tags.length ? (
                  profile.tags.map((tag) => (
                    <div key={tag.id} className="flex flex-col gap-4 rounded-[24px] border border-[var(--border-subtle)] bg-white/[0.035] p-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                        <span className="font-medium text-white">{tag.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => startEditTag(tag)}>
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={async () => {
                            await api.deleteTag(tag.id)
                            await loadProfile()
                            pushToast({
                              title: 'Tag removida',
                              description: 'A taxonomia foi atualizada.',
                              tone: 'success',
                            })
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="Sem tags cadastradas"
                    description="Crie tags como VIP, reagendar, coloracao ou recorrente para classificar contatos."
                    icon={<Palette className="h-6 w-6" />}
                  />
                )}
              </div>
            </Card>

            <Card className="p-6">
              <p className="text-sm text-[var(--text-secondary)]">Extension readiness</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">Checklist da extensao</h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                <li>1. Entre com o mesmo usuario seed no painel e na sidebar do WhatsApp Web.</li>
                <li>2. Garanta a API em `http://localhost:3333` ou ajuste a variavel do build da extensao.</li>
                <li>3. Reaproveite as mesmas tags, respostas rapidas e stages ja sincronizados pelo backend.</li>
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

function ThemePreset({
  title,
  description,
  active,
  onClick,
}: {
  title: string
  description: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[24px] border p-4 text-left transition ${
        active
          ? 'border-[var(--accent)]/20 bg-[var(--accent-soft)]'
          : 'border-[var(--border-subtle)] bg-white/[0.035] hover:border-[var(--border-strong)]'
      }`}
    >
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
    </button>
  )
}
