'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, LifeBuoy, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { createApiClient } from '@salonzap/sdk'
import { useToast } from '@/components/providers/toast-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { API_URL, SUPPORT_EMAIL } from '@/lib/env'

export default function ForgotPasswordPage() {
  const { pushToast } = useToast()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await createApiClient({ baseUrl: API_URL }).forgotPassword({ email })
      setSubmitted(true)
      pushToast({
        title: 'Pedido enviado',
        description: 'Se o e-mail existir, a mensagem de redefinicao foi disparada.',
        tone: 'success',
      })
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Nao foi possivel iniciar a recuperacao de senha.'
      setError(message)
      pushToast({
        title: 'Falha ao enviar e-mail',
        description: message,
        tone: 'danger',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6 md:px-8">
      <div className="grid w-full max-w-[1320px] gap-6 lg:grid-cols-[1.28fr_0.92fr]">
        <Card variant="spotlight" className="overflow-hidden rounded-[34px] p-8 md:p-10">
          <div className="hero-grid pointer-events-none absolute inset-0 opacity-25" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div>
              <Badge tone="accent">
                <Sparkles className="h-3.5 w-3.5" />
                Recuperacao segura
              </Badge>
              <h1 className="mt-8 max-w-4xl text-4xl font-semibold leading-tight text-white md:text-6xl">
                Redefina sua senha sem sair do fluxo operacional.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
                Quando configurado com envio transacional, o SalonZap dispara um link real de redefinicao para o e-mail
                da sua conta.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card variant="muted" className="rounded-[26px] p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/8 bg-white/6 text-[var(--accent)]">
                  <Mail className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-white">Link por e-mail</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  O token de redefinicao expira em 60 minutos e invalida links anteriores.
                </p>
              </Card>
              <Card variant="muted" className="rounded-[26px] p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/8 bg-white/6 text-emerald-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-white">Token unico</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  A redefinicao troca a senha real do usuario owner no banco de producao.
                </p>
              </Card>
            </div>
          </div>
        </Card>

        <Card className="rounded-[34px] p-8 md:p-10">
          <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
            Recuperar acesso
          </p>
          <h2 className="mt-5 text-3xl font-semibold text-white">Esqueci minha senha</h2>
          <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">
            Informe o e-mail da sua conta. Se existir um usuario ativo, enviaremos um link para redefinir a senha.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="forgot-email" className="mb-2 block text-sm text-[var(--text-secondary)]">
                E-mail
              </label>
              <Input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@empresa.com"
                className="h-14 rounded-[18px]"
              />
            </div>

            {submitted ? (
              <div className="rounded-[22px] border border-emerald-400/16 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                Se o e-mail existir, voce recebera um link de redefinicao em instantes.
              </div>
            ) : null}

            {error ? (
              <div className="rounded-[22px] border border-rose-400/16 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="h-14 w-full rounded-[18px] text-base" disabled={submitting || !email.trim()}>
              {submitting ? 'Enviando link...' : 'Enviar link de redefinicao'}
            </Button>
          </form>

          <Card variant="muted" className="mt-7 rounded-[26px] p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/8 bg-white/6 text-[var(--accent)]">
                <LifeBuoy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">Precisa de ajuda?</p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  Se sua operacao ainda nao tem o provedor de e-mail transacional configurado, fale com{' '}
                  <a className="text-[var(--accent)] underline-offset-4 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
                    {SUPPORT_EMAIL}
                  </a>
                  .
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button asChild variant="surface" size="sm">
                    <Link href="/login">
                      <ArrowLeft className="h-4 w-4" />
                      Voltar ao login
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </Card>
      </div>
    </main>
  )
}
