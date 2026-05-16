'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, KeyRound, ShieldCheck, Sparkles } from 'lucide-react'
import { createApiClient } from '@salonzap/sdk'
import { useToast } from '@/components/providers/toast-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { API_URL } from '@/lib/env'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { pushToast } = useToast()
  const [token] = useState(() => {
    if (typeof window === 'undefined') {
      return ''
    }

    return new URLSearchParams(window.location.search).get('token') ?? ''
  })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)

  const mismatch = useMemo(() => {
    if (!confirmPassword.trim()) {
      return false
    }

    return password !== confirmPassword
  }, [confirmPassword, password])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token) {
      setError('Token de redefinicao ausente.')
      return
    }

    if (mismatch) {
      setError('As senhas nao conferem.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await createApiClient({ baseUrl: API_URL }).resetPassword({
        token,
        password,
      })
      setCompleted(true)
      pushToast({
        title: 'Senha atualizada',
        description: 'Voce ja pode entrar com a nova senha no SalonZap.',
        tone: 'success',
      })
      window.setTimeout(() => router.replace('/login'), 1200)
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Nao foi possivel redefinir a senha.'
      setError(message)
      pushToast({
        title: 'Falha ao redefinir',
        description: message,
        tone: 'danger',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6 md:px-8">
      <div className="grid w-full max-w-[1280px] gap-6 lg:grid-cols-[1.18fr_0.82fr]">
        <Card variant="spotlight" className="overflow-hidden rounded-[34px] p-8 md:p-10">
          <div className="hero-grid pointer-events-none absolute inset-0 opacity-25" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div>
              <Badge tone="accent">
                <Sparkles className="h-3.5 w-3.5" />
                Senha nova
              </Badge>
              <h1 className="mt-8 max-w-4xl text-4xl font-semibold leading-tight text-white md:text-6xl">
                Redefina o acesso e volte para a operacao.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
                Escolha uma senha forte para retomar o acesso ao painel, ao CRM e a extensao do WhatsApp Web.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card variant="muted" className="rounded-[26px] p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/8 bg-white/6 text-[var(--accent)]">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-white">Senha real</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  A nova senha substitui a credencial salva no banco de producao.
                </p>
              </Card>
              <Card variant="muted" className="rounded-[26px] p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/8 bg-white/6 text-emerald-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-white">Token unico</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  O link so funciona uma vez e expira automaticamente para reduzir risco operacional.
                </p>
              </Card>
            </div>
          </div>
        </Card>

        <Card className="rounded-[34px] p-8 md:p-10">
          <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Nova senha</p>
          <h2 className="mt-5 text-3xl font-semibold text-white">Atualizar credenciais</h2>
          <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">
            Defina uma nova senha para continuar usando o SalonZap com seu workspace real.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="reset-password" className="mb-2 block text-sm text-[var(--text-secondary)]">
                Nova senha
              </label>
              <Input
                id="reset-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimo de 8 caracteres"
                className="h-14 rounded-[18px]"
              />
            </div>

            <div>
              <label htmlFor="reset-password-confirm" className="mb-2 block text-sm text-[var(--text-secondary)]">
                Confirmar senha
              </label>
              <Input
                id="reset-password-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repita sua nova senha"
                className="h-14 rounded-[18px]"
              />
            </div>

            {completed ? (
              <div className="rounded-[22px] border border-emerald-400/16 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                Senha atualizada com sucesso. Redirecionando para o login.
              </div>
            ) : null}

            {error ? (
              <div className="rounded-[22px] border border-rose-400/16 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            {mismatch ? (
              <div className="rounded-[22px] border border-amber-400/18 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                As senhas digitadas precisam ser iguais.
              </div>
            ) : null}

            <Button
              type="submit"
              className="h-14 w-full rounded-[18px] text-base"
              disabled={submitting || !token || password.length < 8 || !confirmPassword.trim() || mismatch}
            >
              {submitting ? 'Atualizando senha...' : 'Salvar nova senha'}
            </Button>
          </form>

          <div className="mt-8">
            <Button asChild variant="surface" size="sm">
              <Link href="/login">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao login
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </main>
  )
}
