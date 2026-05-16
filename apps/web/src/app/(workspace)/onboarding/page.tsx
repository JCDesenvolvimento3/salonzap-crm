'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { DashboardSummary, SettingsProfile } from '@salonzap/sdk'
import { Check, Chrome, ClipboardCheck, Download, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { EXTENSION_DOWNLOAD_PATH, WHATSAPP_WEB_URL } from '@/lib/env'

type OnboardingData = {
  settings: SettingsProfile
  dashboard: DashboardSummary
}

export default function OnboardingPage() {
  const { api } = useAuth()
  const [data, setData] = useState<OnboardingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const startExtensionSetup = () => {
    const link = document.createElement('a')
    link.href = EXTENSION_DOWNLOAD_PATH
    link.download = 'salonzap-extension.zip'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.open(WHATSAPP_WEB_URL, '_blank', 'noopener,noreferrer')
  }

  useEffect(() => {
    Promise.all([api.settings(), api.dashboard()])
      .then(([settings, dashboard]) => {
        setData({ settings, dashboard })
        setError(null)
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : 'Falha ao montar onboarding.')
      })
      .finally(() => setLoading(false))
  }, [api])

  const steps = useMemo(() => {
    if (!data) {
      return []
    }

    return [
      {
        title: 'Fechar identidade da operacao',
        description: 'Nome do salao, mensagem institucional e cor principal prontos para uso comercial.',
        done: Boolean(data.settings.salon.name && data.settings.salon.welcomeMessage && data.settings.salon.brandColor),
        href: '/settings',
        action: 'Abrir configuracoes',
      },
      {
        title: 'Colocar contatos reais no CRM',
        description: 'A base precisa sair do zero para o funil, notas e follow-up virarem rotina.',
        done: data.dashboard.totals.contacts > 0,
        href: '/contacts',
        action: 'Abrir contatos',
      },
      {
        title: 'Padronizar respostas e scripts',
        description: 'Respostas rapidas reduzem improviso e ajudam a equipe a responder melhor no WhatsApp.',
        done: data.dashboard.totals.quickReplies > 0,
        href: '/quick-replies',
        action: 'Abrir respostas',
      },
      {
        title: 'Ativar reengajamento comercial',
        description: 'Campanhas e lembretes mostram se a operacao ja esta puxando clientes de volta.',
        done: data.dashboard.totals.campaignsScheduled > 0 || data.dashboard.totals.remindersDue > 0,
        href: '/campaigns',
        action: 'Abrir campanhas',
      },
      {
        title: 'Validar a extensao no WhatsApp Web',
        description: 'Etapa manual para autenticar a sidebar, sincronizar contato e testar o botao de IA no navegador real.',
        done: false,
        href: '/settings',
        action: 'Ver checklist',
      },
    ]
  }, [data])

  const completedSteps = steps.filter((step) => step.done).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Checklist inicial"
        title="Onboarding operacional para colocar saloes em uso real"
        description="Passos objetivos para configurar a operacao, alimentar o CRM e validar a rotina real do salao."
      />

      <Card variant="spotlight" className="p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <Badge tone="accent">
              <Chrome className="h-3.5 w-3.5" />
              WhatsApp Web
            </Badge>
            <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
              Instale a extensao e opere direto na conversa
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              O fluxo pronto para o usuario final e este: baixar a extensao, carregar no Chrome, abrir o WhatsApp Web
              e entrar na sidebar com a mesma conta do painel.
            </p>
            <ol className="mt-5 space-y-2 text-sm leading-7 text-[var(--text-secondary)]">
              <li>1. Baixe o pacote oficial da extensao SalonZap.</li>
              <li>2. No Chrome, abra Extensoes e use o modo &quot;Carregar sem compactacao&quot; depois de descompactar o zip.</li>
              <li>3. Abra o WhatsApp Web e autentique a sidebar com a mesma conta do CRM.</li>
            </ol>
          </div>

          <div className="grid gap-3 md:grid-cols-3 xl:w-[540px] xl:grid-cols-1">
            <Button onClick={startExtensionSetup}>
              Instalar e abrir WhatsApp
              <Chrome className="h-4 w-4" />
            </Button>
            <Button asChild>
              <a href={EXTENSION_DOWNLOAD_PATH} download>
                Baixar extensao
                <Download className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="secondary">
              <a href={WHATSAPP_WEB_URL} target="_blank" rel="noreferrer">
                Abrir WhatsApp Web
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="surface">
              <Link href="/settings">
                Ver checklist tecnico
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Skeleton className="h-[280px] w-full" />
          <Skeleton className="h-[520px] w-full" />
        </div>
      ) : null}

      {!loading && error ? (
        <Card variant="muted" className="border-rose-400/16 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </Card>
      ) : null}

      {!loading && data ? (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card variant="spotlight" className="p-6">
            <Badge tone="accent">
              <Sparkles className="h-3.5 w-3.5" />
              Semana 1
            </Badge>
            <h2 className="mt-5 text-3xl font-semibold text-white">Meta: operar com 1 a 3 saloes sem depender de demo</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              Progresso atual: {completedSteps} de {steps.length} passos concluidos. O objetivo desta tela e encurtar o
              caminho entre deploy e operacao comercial real.
            </p>

            <div className="mt-6 rounded-[26px] border border-[var(--border-subtle)] bg-white/[0.035] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Checklist comercial</p>
              <div className="mt-4 space-y-3">
                {[
                  `${data.dashboard.totals.contacts} contatos ativos hoje`,
                  `${data.dashboard.totals.quickReplies} respostas rapidas publicadas`,
                  `${data.dashboard.totals.campaignsScheduled} campanhas agendadas`,
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-[18px] border border-[var(--border-subtle)] bg-white/[0.035] px-4 py-3">
                    <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
                    <span className="text-sm text-[var(--text-secondary)]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <Card key={step.title} className="p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-4">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-[18px] border ${
                        step.done
                          ? 'border-emerald-400/20 bg-emerald-400/12 text-emerald-200'
                          : 'border-[var(--border-subtle)] bg-white/6 text-[var(--accent)]'
                      }`}
                    >
                      {step.done ? <Check className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Passo {index + 1}</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{step.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{step.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <Badge tone={step.done ? 'success' : 'accent'}>{step.done ? 'Concluido' : 'Pendente'}</Badge>
                    <Button asChild variant={step.done ? 'surface' : 'secondary'}>
                      <Link href={step.href}>
                        {step.action}
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
