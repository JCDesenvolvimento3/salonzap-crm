import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Check,
  LayoutDashboard,
  MessageSquareText,
  PanelsTopLeft,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { LeadCaptureForm } from '@/components/marketing/lead-capture-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SALES_EMAIL, SUPPORT_EMAIL } from '@/lib/env'

const benefits = [
  {
    icon: MessageSquareText,
    title: 'WhatsApp com contexto comercial',
    description: 'Sidebar da extensao, respostas rapidas, notas e IA no mesmo fluxo operacional do salao.',
  },
  {
    icon: PanelsTopLeft,
    title: 'Recuperacao de clientes e follow-up',
    description: 'CRM, kanban, campanhas e lembretes conectados para reativacao e conversao.',
  },
  {
    icon: LayoutDashboard,
    title: 'Visao geral da operacao',
    description: 'Dashboard, listas e funil para acompanhar clientes, follow-ups e campanhas em tempo real.',
  },
]

const plans = [
  {
    name: 'Piloto assistido',
    description: 'Para colocar 1 a 3 saloes em uso real com onboarding enxuto e feedback rapido.',
    bullets: ['Implantacao guiada', 'CRM + IA + extensao', 'Operacao comercial focada em retencao'],
  },
  {
    name: 'Operacao de estudio',
    description: 'Para saloes que ja operam o dia a dia no WhatsApp e querem padronizar atendimento e campanhas.',
    bullets: ['Base de contatos viva', 'Respostas rapidas e IA', 'Kanban e follow-up recorrente'],
  },
  {
    name: 'Multiunidade',
    description: 'Para operacoes com mais de uma unidade ou squads comerciais acompanhando crescimento.',
    bullets: ['Padronizacao por equipe', 'Governanca de atendimento', 'Camada de observabilidade e rollout'],
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(127,232,255,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(91,160,255,0.14),transparent_22%),var(--background-app)]">
      <div className="mx-auto max-w-[1280px] px-5 py-6 md:px-8">
        <header className="flex flex-col gap-4 rounded-[30px] border border-[var(--border-subtle)] bg-[rgba(10,12,16,0.72)] p-5 backdrop-blur-2xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">SalonZap CRM</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">CRM, automacao WhatsApp e IA para saloes em operacao real</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href="/signup">Criar conta</Link>
            </Button>
            <Button asChild variant="surface">
              <Link href="/terms">Termos</Link>
            </Button>
            <Button asChild variant="surface">
              <Link href="/privacy">Privacidade</Link>
            </Button>
            <Button asChild>
              <Link href="/login">
                Entrar na plataforma
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-6 py-10 lg:grid-cols-[1.08fr_0.92fr] lg:py-14">
          <Card variant="spotlight" className="overflow-hidden p-8 md:p-10">
            <div className="hero-grid pointer-events-none absolute inset-0 opacity-35" />
            <div className="relative">
              <Badge tone="accent">
                <Sparkles className="h-3.5 w-3.5" />
                Produto pronto para piloto comercial
              </Badge>
              <h2 className="mt-7 max-w-4xl text-4xl font-semibold leading-tight text-white md:text-6xl">
                Pare de perder cliente no WhatsApp e transforme conversa em recorrencia.
              </h2>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
                O SalonZap junta CRM, campanhas, funil, lembretes, extensao Chrome e IA em uma operacao
                pensada para saloes que precisam recuperar clientes, organizar follow-up e ganhar previsibilidade.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/signup">
                    Criar conta
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="surface" size="lg">
                  <Link href="/login">Entrar no workspace</Link>
                </Button>
                <Button asChild variant="surface" size="lg">
                  <a href={`mailto:${SALES_EMAIL}`}>Solicitar piloto</a>
                </Button>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {benefits.map((benefit) => {
                  const Icon = benefit.icon

                  return (
                    <Card key={benefit.title} variant="muted" className="p-5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[var(--border-subtle)] bg-white/6 text-[var(--accent)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-white">{benefit.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{benefit.description}</p>
                    </Card>
                  )
                })}
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[var(--border-subtle)] bg-white/6 text-[var(--accent)]">
                  <BadgeCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Pronto para operar</p>
                  <h3 className="text-2xl font-semibold text-white">O que entra no piloto</h3>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  'Dashboard com CRM, kanban, campanhas, respostas rapidas e lembretes.',
                  'Extensao para WhatsApp Web com sync de contato, tags, nota e IA de resposta.',
                  'OpenRouter real com fallback seguro, log em AiLog e monitoramento operacional.',
                  'Deploy cloud em Vercel + banco remoto em Supabase para operar sem mock local.',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-[22px] border border-[var(--border-subtle)] bg-white/[0.035] px-4 py-3">
                    <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-sm leading-7 text-[var(--text-secondary)]">{item}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <p className="text-sm text-[var(--text-secondary)]">Camadas comerciais e de confianca</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <FeaturePill icon={<ShieldCheck className="h-4 w-4" />} label="Termos e privacidade publicados" />
                <FeaturePill icon={<BellRing className="h-4 w-4" />} label="Monitoramento e logs de producao" />
                <FeaturePill icon={<Sparkles className="h-4 w-4" />} label="IA com OpenRouter real" />
                <FeaturePill icon={<LayoutDashboard className="h-4 w-4" />} label="Onboarding e operacao assistida" />
              </div>
              <p className="mt-5 text-sm leading-7 text-[var(--text-secondary)]">
                Contato operacional atual:{' '}
                <a className="text-[var(--accent)] underline-offset-4 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
              </p>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.96fr_1.04fr]">
          <Card className="p-6 md:p-8">
            <Badge tone="accent">Beneficios imediatos</Badge>
            <h2 className="mt-5 text-3xl font-semibold text-white">Onde o produto muda a rotina do salao</h2>
            <div className="mt-6 grid gap-4">
              {[
                {
                  title: 'Recuperacao automatizada de clientes',
                  text: 'Quando a base esfria, campanhas e IA ajudam a montar mensagens de reativacao sem depender de memoria do time.',
                },
                {
                  title: 'Atendimento mais consistente no WhatsApp',
                  text: 'Respostas rapidas, historico e tags deixam o atendimento menos improvisado e mais vendavel.',
                },
                {
                  title: 'Follow-up com dono claro',
                  text: 'Lembretes, notas e funil reduzem o risco de lead sumir porque ninguem puxou o proximo passo.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-[24px] border border-[var(--border-subtle)] bg-white/[0.035] p-5">
                  <p className="text-lg font-semibold text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{item.text}</p>
                </div>
              ))}
            </div>
          </Card>

          <LeadCaptureForm />
        </section>

        <section className="py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge tone="accent">Planos</Badge>
              <h2 className="mt-4 text-3xl font-semibold text-white">Modelos de implantacao comercial</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
                Sem inventar preco publico nesta fase. Os planos abaixo organizam escopo e maturidade para proposta real.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.name} className="p-6">
                <p className="text-lg font-semibold text-white">{plan.name}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{plan.description}</p>
                <div className="mt-5 space-y-3">
                  {plan.bullets.map((bullet) => (
                    <div key={bullet} className="flex items-start gap-3">
                      <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                        <Check className="h-3 w-3" />
                      </span>
                      <p className="text-sm leading-7 text-[var(--text-secondary)]">{bullet}</p>
                    </div>
                  ))}
                </div>
                <Button asChild variant="secondary" className="mt-6 w-full">
                  <a href={`mailto:${SALES_EMAIL}`}>Pedir proposta</a>
                </Button>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-[var(--border-subtle)] bg-white/[0.035] px-4 py-3 text-sm text-[var(--text-secondary)]">
      <span className="text-[var(--accent)]">{icon}</span>
      <span>{label}</span>
    </div>
  )
}
