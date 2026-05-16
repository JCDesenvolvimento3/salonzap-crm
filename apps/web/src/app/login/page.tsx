'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BarChart3,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MessageCircleMore,
  MoonStar,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useTheme } from '@/components/providers/theme-provider'
import { useToast } from '@/components/providers/toast-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LOGOUT_REASON_STORAGE_KEY, GOOGLE_CLIENT_ID, SUPPORT_EMAIL } from '@/lib/env'
import { requestGoogleAuthCode } from '@/lib/google-auth'

const highlights = [
  {
    icon: MessageCircleMore,
    title: 'Respostas rapidas',
    text: 'Crie atalhos e responda clientes com agilidade.',
    tone: 'text-sky-400',
  },
  {
    icon: UsersRound,
    title: 'Funil de clientes',
    text: 'Acompanhe cada etapa e nao perca nenhuma oportunidade.',
    tone: 'text-emerald-400',
  },
  {
    icon: Zap,
    title: 'Recuperacao automatica',
    text: 'Reative clientes inativos com campanhas inteligentes.',
    tone: 'text-violet-400',
  },
  {
    icon: BarChart3,
    title: 'Relatorios inteligentes',
    text: 'Veja o que importa e tome decisoes com base em dados reais.',
    tone: 'text-amber-400',
  },
] as const

export default function LoginPage() {
  const router = useRouter()
  const { login, googleLogin, session, loading } = useAuth()
  const { toggleTheme } = useTheme()
  const { pushToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionNotice] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }

    const reason = window.sessionStorage.getItem(LOGOUT_REASON_STORAGE_KEY)
    if (reason === 'expired') {
      window.sessionStorage.removeItem(LOGOUT_REASON_STORAGE_KEY)
      return 'Sua sessao expirou. Entre novamente para continuar.'
    }

    return null
  })

  useEffect(() => {
    if (!loading && session) {
      router.replace('/dashboard')
    }
  }, [loading, router, session])

  const normalizeErrorMessage = (value: unknown) => {
    const message = value instanceof Error ? value.message : 'Nao foi possivel autenticar.'

    if (message === 'BadRequest' || message === 'Bad Request') {
      return 'Nao foi possivel concluir o acesso no navegador. Atualize a pagina e tente novamente.'
    }

    return message
  }

  const goToDashboard = () => {
    window.location.assign('/dashboard')
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await login(email, password, rememberMe)
      goToDashboard()
    } catch (submitError) {
      const message = normalizeErrorMessage(submitError)
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

  const handleGoogleLogin = async () => {
    if (!GOOGLE_CLIENT_ID) {
      pushToast({
        title: 'Google nao configurado',
        description: 'Adicione as credenciais Google na configuracao de producao para liberar este acesso.',
        tone: 'warning',
      })
      return
    }

    setGoogleLoading(true)
    setError(null)

    try {
      const redirectUri = `${window.location.origin}/login`
      const code = await requestGoogleAuthCode({
        clientId: GOOGLE_CLIENT_ID,
        redirectUri,
      })

      await googleLogin({
        code,
        redirectUri,
      })
      goToDashboard()
    } catch (submitError) {
      const message = normalizeErrorMessage(submitError)
      setError(message)
      pushToast({
        title: 'Falha no Google',
        description: message,
        tone: 'danger',
      })
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col px-4 py-6 md:px-8">
      <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col">
        <div className="grid flex-1 gap-6 xl:grid-cols-[1.62fr_1fr]">
          <Card variant="spotlight" className="overflow-hidden rounded-[34px] p-7 md:p-10">
            <div className="hero-grid pointer-events-none absolute inset-0 opacity-25" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(31,192,255,0.12),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(105,97,255,0.12),transparent_22%),linear-gradient(180deg,rgba(4,8,15,0.36),transparent_45%)]" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <Badge tone="accent" className="px-4 py-2 text-[12px] tracking-[0.16em]">
                    <Sparkles className="h-3.5 w-3.5" />
                    SalonZap CRM
                  </Badge>
                  <Button variant="surface" size="icon" onClick={toggleTheme} aria-label="Alternar tema">
                    <MoonStar className="h-4 w-4" />
                  </Button>
                </div>

                <h1 className="mt-10 max-w-5xl text-4xl font-semibold leading-[1.02] text-white sm:text-5xl lg:text-[4.65rem]">
                  Atendimento,
                  <br />
                  relacionamento e operacao
                  <br />
                  do salao em uma{' '}
                  <span className="bg-[linear-gradient(135deg,#33D4FF_0%,#2B89FF_52%,#8F63FF_100%)] bg-clip-text text-transparent">
                    unica plataforma.
                  </span>
                </h1>

                <p className="mt-7 max-w-3xl text-lg leading-9 text-[var(--text-secondary)]">
                  Organize conversas do WhatsApp, gerencie clientes, automatize follow-ups e recupere vendas com
                  inteligencia. Tudo isso em um CRM feito para saloes como o seu.
                </p>
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                {highlights.map((item) => {
                  const Icon = item.icon

                  return (
                    <Card key={item.title} variant="muted" className="rounded-[26px] border-white/8 bg-[rgba(9,12,20,0.62)] p-5">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/8 bg-[rgba(255,255,255,0.025)] ${item.tone}`}
                      >
                        <Icon className="h-7 w-7" />
                      </div>
                      <h2 className="mt-5 text-[1.55rem] font-semibold leading-9 text-white">{item.title}</h2>
                      <p className="mt-3 text-base leading-8 text-[var(--text-secondary)]">{item.text}</p>
                    </Card>
                  )
                })}
              </div>

              <Card
                variant="muted"
                className="mt-5 rounded-[26px] border-emerald-400/10 bg-[rgba(11,16,24,0.7)] px-5 py-5"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-emerald-400/12 bg-emerald-400/10 text-emerald-300">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-white">Seguro e confiavel</p>
                    <p className="mt-2 text-base leading-8 text-[var(--text-secondary)]">
                      Seus dados protegidos com criptografia e as melhores praticas de seguranca.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </Card>

          <Card className="rounded-[34px] p-8 md:p-11">
            <div className="flex h-full flex-col">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                  Acesso seguro
                </p>
                <h2 className="mt-5 text-4xl font-semibold text-white md:text-[3.15rem]">Entrar no SalonZap</h2>
                <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--text-secondary)]">
                  Use sua conta de producao para acessar o painel. O acesso demo foi removido da interface para maior
                  seguranca.
                </p>
              </div>

              <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
                {sessionNotice ? (
                  <div className="rounded-[22px] border border-amber-400/18 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                    {sessionNotice}
                  </div>
                ) : null}

                <Field label="E-mail" icon={<Mail className="h-5 w-5" />}>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="seu@email.com"
                    className="h-14 rounded-[18px] border-white/10 bg-transparent pl-12 pr-4 text-base"
                  />
                </Field>

                <Field label="Senha" icon={<Lock className="h-5 w-5" />}>
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Sua senha de acesso"
                    className="h-14 rounded-[18px] border-white/10 bg-transparent pl-12 pr-14 text-base"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute inset-y-0 right-4 flex items-center text-[var(--text-muted)] hover:text-white"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </Field>

                <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                  <label className="inline-flex cursor-pointer items-center gap-3 text-[var(--text-secondary)]">
                    <button
                      type="button"
                      aria-pressed={rememberMe}
                      className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        rememberMe
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'border-white/14 bg-transparent text-transparent'
                      }`}
                      onClick={() => setRememberMe((current) => !current)}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    Lembrar de mim
                  </label>

                  <a
                    className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                    href="/forgot-password"
                  >
                    Esqueci minha senha
                  </a>
                </div>

                {error ? (
                  <div className="rounded-[22px] border border-rose-400/16 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                    {error}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  className="h-14 w-full rounded-[18px] text-lg"
                  disabled={submitting || !email.trim() || !password.trim()}
                >
                  {submitting ? 'Acessando painel...' : 'Acessar painel'}
                </Button>
              </form>

              <div className="my-7 flex items-center gap-4 text-sm text-[var(--text-muted)]">
                <div className="h-px flex-1 bg-white/8" />
                <span>ou</span>
                <div className="h-px flex-1 bg-white/8" />
              </div>

              <button
                type="button"
                disabled={googleLoading}
                className={`inline-flex h-14 w-full items-center justify-center gap-3 rounded-[18px] border border-white/10 bg-transparent px-4 text-base font-semibold ${
                  GOOGLE_CLIENT_ID
                    ? 'text-[var(--text-primary)] hover:border-white/16 hover:bg-white/4'
                    : 'text-[var(--text-secondary)] opacity-70'
                }`}
                title={GOOGLE_CLIENT_ID ? 'Entrar com Google' : 'OAuth Google ainda nao configurado'}
                onClick={() => void handleGoogleLogin()}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#ea4335]">
                  G
                </span>
                {googleLoading ? 'Conectando com Google...' : 'Entrar com Google'}
              </button>

              <Card variant="muted" className="mt-7 rounded-[26px] border-white/8 bg-[rgba(11,16,24,0.7)] p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[var(--accent)]/18 bg-[var(--accent-soft)] text-[var(--accent)]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">Acesso operacional</p>
                    <p className="mt-2 text-base leading-8 text-[var(--text-secondary)]">
                      Se sua conta ainda nao foi provisionada, solicite o acesso operacional pelo e-mail:
                    </p>
                    <a
                      className="mt-2 inline-flex text-lg font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
                      href={`mailto:${SUPPORT_EMAIL}`}
                    >
                      {SUPPORT_EMAIL}
                    </a>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button asChild variant="secondary" size="sm">
                        <Link href="/signup">Criar conta</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="mt-auto pt-8 text-center text-sm text-[var(--text-muted)]">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link className="hover:text-white" href="/privacy">
                    Politica de Privacidade
                  </Link>
                  <span>•</span>
                  <Link className="hover:text-white" href="/terms">
                    Termos de Uso
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <p className="pb-2 pt-7 text-center text-sm text-[var(--text-muted)]">
          © 2024 SalonZap CRM. Todos os direitos reservados.
        </p>
      </div>
    </main>
  )
}

function Field({
  label,
  icon,
  children,
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-2.5 block text-sm font-medium text-white">{label}</label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[var(--text-muted)]">
          {icon}
        </div>
        {children}
      </div>
    </div>
  )
}
