'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, MessageSquareMore, MoonStar, PanelsTopLeft, Sparkles } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useTheme } from '@/components/providers/theme-provider'
import { useToast } from '@/components/providers/toast-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const router = useRouter()
  const { login, session, loading } = useAuth()
  const { toggleTheme } = useTheme()
  const { pushToast } = useToast()
  const [email, setEmail] = useState('admin@salonzap.local')
  const [password, setPassword] = useState('123456')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && session) {
      router.replace('/dashboard')
    }
  }, [loading, router, session])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await login(email, password)
      router.replace('/dashboard')
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Nao foi possivel autenticar.'
      setError(message)
      pushToast({
        title: 'Falha ao autenticar',
        description: message,
        tone: 'danger',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8">
      <div className="grid w-full max-w-7xl gap-6 lg:grid-cols-[1.18fr_0.82fr]">
        <Card variant="spotlight" className="overflow-hidden p-8 md:p-10">
          <div className="hero-grid pointer-events-none absolute inset-0 opacity-35" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge tone="accent">
                  <Sparkles className="h-3.5 w-3.5" />
                  Premium salon CRM
                </Badge>
                <Button variant="surface" size="icon" onClick={toggleTheme}>
                  <MoonStar className="h-4 w-4" />
                </Button>
              </div>

              <h1 className="mt-8 max-w-4xl text-4xl font-semibold leading-tight text-white md:text-6xl">
                Salon operations, WhatsApp context, and CRM execution in one calmer interface.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
                The architecture stays intact. The experience now feels closer to a premium SaaS product: cleaner hierarchy,
                sharper spacing, and faster comprehension for daily work.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: MessageSquareMore,
                  title: 'Reply library',
                  text: 'Scripts and shortcuts ready for the web app and the WhatsApp extension sidebar.',
                },
                {
                  icon: PanelsTopLeft,
                  title: 'Pipeline movement',
                  text: 'Drag leads between stages with real backend persistence and calmer scanning.',
                },
                {
                  icon: ArrowRight,
                  title: 'Follow-up discipline',
                  text: 'Campaigns, reminders, and notes aligned in one operational layer.',
                },
              ].map((feature) => {
                const Icon = feature.icon

                return (
                  <Card key={feature.title} variant="muted" className="p-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[var(--border-subtle)] bg-white/6 text-[var(--accent)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-white">{feature.title}</h2>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{feature.text}</p>
                  </Card>
                )
              })}
            </div>
          </div>
        </Card>

        <Card className="p-8 md:p-10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Acesso seguro</p>
            <h2 className="mt-4 text-3xl font-semibold text-white">Entrar no workspace</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              Use o usuario seed para testar o cockpit, as tabelas premium e a nova experiencia da extensao.
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="login-email" className="mb-2 block text-sm text-[var(--text-secondary)]">E-mail</label>
              <Input id="login-email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div>
              <label htmlFor="login-password" className="mb-2 block text-sm text-[var(--text-secondary)]">Senha</label>
              <Input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>

            {error ? (
              <div className="rounded-[22px] border border-rose-400/16 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? 'Entrando...' : 'Entrar no SalonZap'}
            </Button>
          </form>

          <Card variant="muted" className="mt-8 p-5">
            <p className="text-sm font-semibold text-white">Credenciais seed</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">admin@salonzap.local</p>
            <p className="text-sm text-[var(--text-secondary)]">123456</p>
          </Card>
        </Card>
      </div>
    </main>
  )
}
